/**
 * 扫码枪设备管理路由
 * 支持多把扫码枪，每把对应不同工序和库位
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/scanner
 * 获取扫码枪设备列表
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, process_type } = req.query;

    let where = ['1=1'];
    const params = [];
    let p = 0;

    if (status) { where.push(`status = $${++p}`); params.push(status); }
    if (process_type) { where.push(`process_type = $${++p}`); params.push(process_type); }

    const result = await db.query(`
      SELECT * FROM scanner_device
      WHERE ${where.join(' AND ')}
      ORDER BY code
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/scanner
 * 添加扫码枪设备
 */
router.post('/', async (req, res, next) => {
  try {
    const { code, name, process_type, process_name, com_port, baud_rate, terminator, remark } = req.body;

    if (!code || !name || !process_type) {
      return res.status(400).json({ success: false, message: '编号、名称、工序类型不能为空' });
    }

    // 检查编号是否重复
    const exist = await db.query(`SELECT id FROM scanner_device WHERE code = $1`, [code]);
    if (exist.rows.length > 0) {
      return res.status(400).json({ success: false, message: `编号 ${code} 已存在` });
    }

    const r = await db.query(`
      INSERT INTO scanner_device (code, name, process_type, process_name, com_port, baud_rate, terminator, remark)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [code, name, process_type, process_name || '', com_port || '', baud_rate || 9600, terminator || '\r\n', remark || '']);

    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * PUT /api/scanner/:id
 * 更新扫码枪设备
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, process_type, process_name, com_port, baud_rate, terminator, remark, status } = req.body;

    const r = await db.query(`
      UPDATE scanner_device
      SET name = COALESCE($1, name),
          process_type = COALESCE($2, process_type),
          process_name = COALESCE($3, process_name),
          com_port = COALESCE($4, com_port),
          baud_rate = COALESCE($5, baud_rate),
          terminator = COALESCE($6, terminator),
          remark = COALESCE($7, remark),
          status = COALESCE($8, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 RETURNING *
    `, [name, process_type, process_name, com_port, baud_rate, terminator, remark, status, id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: '设备不存在' });
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/scanner/:id
 * 删除扫码枪设备
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await db.query(`DELETE FROM scanner_device WHERE id = $1 RETURNING id`, [id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: '设备不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

/**
 * POST /api/scanner/:id/heartbeat
 * 扫码枪心跳（硬件端定期调用，标记在线状态）
 */
router.post('/:id/heartbeat', async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await db.query(`
      UPDATE scanner_device
      SET is_online = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING id, code, name, process_type
    `, [id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: '设备不存在' });
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /api/scanner/scan
 * 处理扫码（硬件端调用，带位置信息）
 */
router.post('/scan', async (req, res, next) => {
  try {
    const { scanner_id, scanner_code, process_type, barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: '条码不能为空' });
    }

    // 查找扫码枪设备
    let scanner = null;
    if (scanner_id) {
      const r = await db.query(`SELECT * FROM scanner_device WHERE id = $1`, [scanner_id]);
      scanner = r.rows[0];
    } else if (scanner_code) {
      const r = await db.query(`SELECT * FROM scanner_device WHERE code = $1`, [scanner_code]);
      scanner = r.rows[0];
    }

    // 解析条码
    let barcodeType = 'unknown';
    let orderId = null;
    let boardId = null;

    if (barcode.startsWith('ORDER:') || barcode.startsWith('ORD')) {
      barcodeType = 'order';
      const orderNo = barcode.replace('ORDER:', '').replace('ORD', '');
      const order = await db.query(
        `SELECT id FROM order_master WHERE order_no = $1 OR qr_code = $1`,
        [orderNo]
      );
      if (order.rows.length > 0) orderId = order.rows[0].id;
    } else {
      barcodeType = 'board';
      const board = await db.query(`SELECT id, order_id FROM cabinet_board WHERE barcode = $1`, [barcode]);
      if (board.rows.length > 0) {
        boardId = board.rows[0].id;
        orderId = board.rows[0].order_id;
      }
    }

    // 记录扫码
    const record = await db.query(`
      INSERT INTO scan_record (scanner_id, scanner_code, process_type, barcode, barcode_type, order_id, board_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [scanner?.id || null, scanner?.code || scanner_code || '', process_type || scanner?.process_type || '', barcode, barcodeType, orderId, boardId]);

    // 更新扫码枪最后扫码时间
    if (scanner) {
      await db.query(`
        UPDATE scanner_device
        SET last_scan_time = CURRENT_TIMESTAMP, last_scan_barcode = $1, is_online = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [barcode, scanner.id]);
    }

    res.json({
      success: true,
      data: {
        record: record.rows[0],
        scanner: scanner ? { code: scanner.code, name: scanner.name, process_type: scanner.process_type } : null
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/scanner/:id/records
 * 获取扫码枪扫码记录
 */
router.get('/:id/records', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, page_size = 50, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);

    let where = ['scanner_id = $1'];
    const params = [id];
    let p = 1;

    if (start_date) { where.push(`scan_time >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`scan_time <= $${++p}`); params.push(end_date); }

    params.push(parseInt(page_size), offset);

    const result = await db.query(`
      SELECT sr.*, om.order_no
      FROM scan_record sr
      LEFT JOIN order_master om ON sr.order_id = om.id
      WHERE ${where.join(' AND ')}
      ORDER BY sr.scan_time DESC
      LIMIT $${++p} OFFSET $${++p}
    `, params);

    const count = await db.query(`SELECT COUNT(*) FROM scan_record WHERE ${where.join(' AND ')}`, params.slice(0, p - 1));

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(count.rows[0].count),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/scanner/process-types
 * 获取工序类型枚举
 */
router.get('/process-types', (req, res) => {
  const processTypes = [
    { value: 'cutting', label: '开料' },
    { value: 'punching', label: '冲孔' },
    { value: 'welding', label: '焊接' },
    { value: 'assembly', label: '组装' },
    { value: 'polishing', label: '打磨/抛光' },
    { value: 'quality', label: '质检' },
    { value: 'packing', label: '包装' },
    { value: 'warehouse', label: '仓库/入库' },
    { value: 'shipping', label: '出货' },
    { value: 'installation', label: '安装' },
    { value: 'return', label: '退料/返工' }
  ];
  res.json({ success: true, data: processTypes });
});

module.exports = router;
