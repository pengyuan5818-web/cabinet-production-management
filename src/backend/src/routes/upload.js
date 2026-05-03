/**
 * 文件上传路由
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../utils/logger');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

/**
 * POST /api/upload/file
 * 上传文件
 */
router.post('/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }

    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    const { biz_type, biz_id, category } = req.body;

    // 保存文件记录
    const fileNo = `FILE${Date.now()}`;
    const result = await db.query(
      `INSERT INTO file_records (
        file_no, file_name, file_path, file_type, file_size,
        biz_type, biz_id, category, uploaded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [fileNo, originalname, filePath, mimetype, size, biz_type, biz_id, category, req.user?.id]
    );

    logger.info(`文件上传: ${originalname}, 大小: ${size}`);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        url: `/uploads/${filename}`
      },
      message: '上传成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/upload/files
 * 多文件上传
 */
router.post('/files', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }

    const { biz_type, biz_id, category } = req.body;
    const records = [];

    for (const file of req.files) {
      const fileNo = `FILE${Date.now()}`;
      const result = await db.query(
        `INSERT INTO file_records (
          file_no, file_name, file_path, file_type, file_size,
          biz_type, biz_id, category, uploaded_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`,
        [fileNo, file.originalname, file.path, file.mimetype, file.size,
         biz_type, biz_id, category, req.user?.id]
      );
      records.push({
        ...result.rows[0],
        url: `/uploads/${file.filename}`
      });
    }

    res.json({
      success: true,
      data: records,
      message: `${records.length} 个文件上传成功`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/upload/files
 * 获取文件列表
 */
router.get('/files', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, biz_type, biz_id, category } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (biz_type) {
      whereClause.push(`biz_type = $${++paramCount}`);
      params.push(biz_type);
    }
    if (biz_id) {
      whereClause.push(`biz_id = $${++paramCount}`);
      params.push(biz_id);
    }
    if (category) {
      whereClause.push(`category = $${++paramCount}`);
      params.push(category);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM file_records ${where} ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      success: true,
      data: {
        list: result.rows.map(r => ({
          ...r,
          url: `/uploads/${path.basename(r.file_path)}`
        })),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/upload/files/:id
 * 下载文件
 */
router.get('/files/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的文件ID格式' });
    }

    const result = await db.query(
      'SELECT * FROM file_records WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    const file = result.rows[0];
    const filePath = file.file_path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '文件已丢失' });
    }

    res.download(filePath, file.file_name);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/upload/files/:id
 * 删除文件
 */
router.delete('/files/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的文件ID格式' });
    }

    const result = await db.query(
      'SELECT * FROM file_records WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    const file = result.rows[0];

    // 删除物理文件
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    // 删除数据库记录
    await db.query('DELETE FROM file_records WHERE id = $1', [id]);

    res.json({ success: true, message: '文件已删除' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
