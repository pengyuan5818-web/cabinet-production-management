/**
 * 阿尔法家对接路由 - 最高优先级
 * 功能: 导入阿尔法家拆单Excel/JSON文件，生成板件数据、BOM清单
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../utils/logger');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.env.UPLOAD_DIR || './uploads', 'alpha'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

/**
 * POST /api/alpha/import
 * 导入阿尔法家文件
 */
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const { order_id, source_type = 'factory', source_id } = req.body;
    const file = req.file;

    // 解析文件
    const parseResult = await parseAlphaFile(file.path, file.originalname);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: '文件解析失败', 
        errors: parseResult.errors 
      });
    }

    // 创建导入记录
    const importNo = `IMP${Date.now()}`;
    const importResult = await db.query(
      `INSERT INTO alpha_import_log 
       (import_no, file_name, file_path, file_size, source_type, source_id, total_records, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', NOW())
       RETURNING id`,
      [importNo, file.originalname, file.path, file.size, source_type, source_id, parseResult.data.length]
    );
    const importId = importResult.rows[0].id;

    // 开启事务处理数据
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const item of parseResult.data) {
        try {
          // 验证必填字段
          if (!item.cabinet_no || !item.board_name) {
            throw new Error('柜体编号和板件名称不能为空');
          }

          // 生成板件条码
          const barcode = `B${Date.now()}${uuidv4().slice(0, 8).toUpperCase()}`;

          // 插入板件数据
          await client.query(
            `INSERT INTO cabinet_board (
              order_id, board_no, cabinet_no, cabinet_name, board_name, board_type,
              material, color, length, width, thickness, quantity,
              edge_left, edge_right, edge_top, edge_bottom,
              hole_count, slot_count, weight, barcode, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending', NOW())`,
            [
              order_id, item.board_no, item.cabinet_no, item.cabinet_name, item.board_name, item.board_type,
              item.material, item.color, item.length, item.width, item.thickness, item.quantity || 1,
              item.edge_left || 0, item.edge_right || 0, item.edge_top || 0, item.edge_bottom || 0,
              item.hole_count || 0, item.slot_count || 0, item.weight, barcode, 'pending'
            ]
          );

          // 更新订单明细的板件标识
          if (order_id) {
            await client.query(
              `UPDATE order_detail SET has_boards = TRUE, board_count = board_count + $1 WHERE order_id = $2`,
              [item.quantity || 1, order_id]
            );
          }

          successCount++;
        } catch (err) {
          failCount++;
          errors.push({ row: item, error: err.message });
        }
      }

      // 生成BOM清单
      const bomData = generateBomFromBoards(parseResult.data);
      for (const bom of bomData) {
        await client.query(
          `INSERT INTO order_bom (
            order_id, material_code, material_name, material_type,
            specification, unit, quantity, unit_price, total_price, bom_type, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'main', NOW())
          ON CONFLICT (order_id, material_code, bom_type) DO UPDATE
          SET quantity = order_bom.quantity + EXCLUDED.quantity`,
          [order_id, bom.material_code, bom.material_name, bom.material_type,
           bom.specification, bom.unit, bom.quantity, bom.unit_price, bom.total_price]
        );
      }

      // 更新导入记录
      await client.query(
        `UPDATE alpha_import_log 
         SET success_count = $1, fail_count = $2, error_log = $3, status = 'completed', imported_at = NOW()
         WHERE id = $4`,
        [successCount, failCount, JSON.stringify(errors), importId]
      );

      await client.query('COMMIT');

      logger.info(`阿尔法家导入完成: ${importNo}, 成功: ${successCount}, 失败: ${failCount}`);

      res.json({
        success: true,
        message: `导入完成`,
        data: {
          import_id: importId,
          import_no: importNo,
          total: parseResult.data.length,
          success: successCount,
          failed: failCount,
          bom_count: bomData.length,
          errors: errors.slice(0, 10) // 最多返回10条错误
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alpha/validate
 * 验证阿尔法家文件（不导入）
 */
router.post('/validate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const parseResult = await parseAlphaFile(req.file.path, req.file.originalname);

    res.json({
      success: true,
      data: {
        file_name: req.file.originalname,
        total_records: parseResult.data.length,
        valid_records: parseResult.data.length - (parseResult.errors?.length || 0),
        errors: parseResult.errors || [],
        preview: parseResult.data.slice(0, 5) // 返回前5条预览
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alpha/imports
 * 获取导入记录列表
 */
router.get('/imports', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = '';
    const params = [];
    if (status) {
      whereClause = 'WHERE status = $1';
      params.push(status);
    }

    const result = await db.query(
      `SELECT * FROM alpha_import_log ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, page_size, offset]
    );

    const countResult = await db.query(`SELECT COUNT(*) FROM alpha_import_log ${whereClause}`, params);

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alpha/boards/:orderId
 * 获取订单的板件列表
 */
router.get('/boards/:orderId', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT cb.*, 
              CASE WHEN cb.status = 'scanned' THEN ps.stage_name ELSE NULL END as current_stage
       FROM cabinet_board cb
       LEFT JOIN order_tracking ot ON ot.order_id = cb.order_id
       LEFT JOIN production_stage ps ON ps.stage = ot.current_stage
       WHERE cb.order_id = $1
       ORDER BY cb.cabinet_no, cb.board_name`,
      [req.params.orderId]
    );

    res.json({ success: true, data: result.rows });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alpha/boards/scan
 * 扫码更新板件状态
 */
router.post('/boards/scan', async (req, res, next) => {
  try {
    const { barcode, location, operator_id, operator_name } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: '条码不能为空' });
    }

    const result = await db.query(
      `UPDATE cabinet_board 
       SET status = 'scanned', current_location = $1, updated_at = NOW()
       WHERE barcode = $2
       RETURNING *`,
      [location, barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '板件不存在' });
    }

    logger.info(`板件扫码: ${barcode}, 位置: ${location}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '扫码成功'
    });

  } catch (err) {
    next(err);
  }
});

/**
 * 解析阿尔法家文件
 */
async function parseAlphaFile(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  try {
    if (ext === '.xlsx' || ext === '.xls') {
      return await parseExcel(filePath);
    } else if (ext === '.json') {
      return await parseJson(filePath);
    } else if (ext === '.csv') {
      return await parseCsv(filePath);
    } else {
      return { success: false, errors: [{ error: '不支持的文件格式' }] };
    }
  } catch (err) {
    return { success: false, errors: [{ error: err.message }] };
  }
}

/**
 * 解析Excel文件
 */
async function parseExcel(filePath) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
  return validateAndNormalize(data);
}

/**
 * 解析JSON文件
 */
async function parseJson(filePath) {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  let data = JSON.parse(content);
  
  // 如果是 {boards: [...]} 格式
  if (data.boards) data = data.boards;
  if (Array.isArray(data)) {
    return validateAndNormalize(data);
  }
  
  return { success: false, errors: [{ error: 'JSON格式不正确，应为数组或包含boards字段' }] };
}

/**
 * 解析CSV文件
 */
async function parseCsv(filePath) {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) {
    return { success: false, errors: [{ error: 'CSV文件为空或格式不正确' }] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    data.push(row);
  }
  
  return validateAndNormalize(data);
}

/**
 * 验证和标准化数据
 */
function validateAndNormalize(data) {
  const errors = [];
  const normalized = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // 标准化字段名（支持多种命名）
    const item = {
      board_no: row.board_no || row.板件编号 || row.boardId || `B${i + 1}`,
      cabinet_no: row.cabinet_no || row.柜体编号 || row.cabinetId || row.cabinet || '',
      cabinet_name: row.cabinet_name || row.柜体名称 || row.cabinetName || '',
      board_name: row.board_name || row.板件名称 || row.boardName || '',
      board_type: row.board_type || row.板件类型 || row.boardType || 'base',
      material: row.material || row.材质 || '',
      color: row.color || row.颜色 || '',
      length: parseInt(row.length || row.长度 || 0),
      width: parseInt(row.width || row.宽度 || 0),
      thickness: parseInt(row.thickness || row.厚度 || 18),
      quantity: parseInt(row.quantity || row.数量 || 1),
      edge_left: parseFloat(row.edge_left || row.封边左 || 0),
      edge_right: parseFloat(row.edge_right || row.封边右 || 0),
      edge_top: parseFloat(row.edge_top || row.封边上 || 0),
      edge_bottom: parseFloat(row.edge_bottom || row.封边下 || 0),
      hole_count: parseInt(row.hole_count || row.孔数 || 0),
      slot_count: parseInt(row.slot_count || row.槽数 || 0),
      weight: parseFloat(row.weight || row.重量 || 0)
    };

    // 验证必填字段
    if (!item.cabinet_no) {
      errors.push({ row: i + 1, error: '柜体编号不能为空' });
      continue;
    }
    if (!item.board_name) {
      errors.push({ row: i + 1, error: '板件名称不能为空' });
      continue;
    }

    normalized.push(item);
  }

  return {
    success: errors.length === 0,
    data: normalized,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * 从板件数据生成BOM
 */
function generateBomFromBoards(boards) {
  const bomMap = new Map();

  for (const board of boards) {
    const key = `${board.material || 'unknown'}_${board.thickness}`;
    
    if (!bomMap.has(key)) {
      bomMap.set(key, {
        material_code: `M${Date.now()}`.slice(0, 12),
        material_name: `${board.material || '板材'}${board.thickness}mm`,
        material_type: 'board',
        specification: `${board.thickness}mm`,
        unit: '张',
        quantity: 0,
        unit_price: 0,
        total_price: 0
      });
    }

    const bom = bomMap.get(key);
    // 粗略估算：张数 = 板件面积 / 1220*2440 / 利用率0.8
    const area = (board.length * board.width * board.quantity) / (1220 * 2440 * 0.8);
    bom.quantity += Math.ceil(area * 100) / 100;
  }

  return Array.from(bomMap.values());
}

module.exports = router;
