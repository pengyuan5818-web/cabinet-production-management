/**
 * 设计图纸管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

function generateDrawingNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `D${dateStr}${random}`;
}

/**
 * GET /api/design/drawings
 * 图纸列表
 */
router.get('/drawings', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, keyword, order_id, drawing_type, status } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let c = 0;

    if (keyword) {
      where.push(`(dd.drawing_name LIKE $${++c} OR dd.drawing_no LIKE $${++c})`);
      params.push(`%${keyword}%`); c++;
    }
    if (order_id) { where.push(`dd.order_id = $${++c}`); params.push(order_id); }
    if (drawing_type) { where.push(`dd.drawing_type = $${++c}`); params.push(drawing_type); }
    if (status) { where.push(`dd.status = $${++c}`); params.push(status); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT dd.*,
              om.order_no,
              c.customer_name
       FROM design_drawing dd
       LEFT JOIN order_master om ON dd.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       ${whereStr}
       ORDER BY dd.created_at DESC
       LIMIT $${c + 1} OFFSET $${c + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM design_drawing dd ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(countResult.rows[0].count) } });
  } catch (err) { next(err); }
});

/**
 * GET /api/design/pending
 * 待审核图纸
 */
router.get('/pending', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT dd.*, om.order_no, c.customer_name
       FROM design_drawing dd
       LEFT JOIN order_master om ON dd.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE dd.status = 'pending'
       ORDER BY dd.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/design/drawing
 * 上传图纸
 */
router.post('/drawing', async (req, res, next) => {
  try {
    const { drawing_no, drawing_name, drawing_type, order_id, designer, file_url, file_size, remark } = req.body;
    if (!drawing_name) return res.status(400).json({ success: false, message: '缺少图纸名称' });

    const no = drawing_no || generateDrawingNo();
    const r = await db.query(
      `INSERT INTO design_drawing (drawing_no, drawing_name, drawing_type, order_id, designer, file_url, file_size, remark, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [no, drawing_name, drawing_type || '效果图', order_id || null, designer || '', file_url || '', file_size || null, remark || '']
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * PUT /api/design/drawing/:id/audit
 * 审核图纸
 */
router.put('/drawing/:id/audit', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的图纸ID格式' });
    }
    const { status, remark } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的审核状态' });
    }
    const r = await db.query(
      `UPDATE design_drawing SET status=$1, remark=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, remark || '', id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '图纸不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /api/design/bom/:orderId
 * 获取订单BOM
 */
router.get('/bom/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    // Try as UUID first; if fails, try as integer (for orders with numeric IDs)
    let result;
    try {
      result = await db.query(
        `SELECT ob.*
         FROM order_bom ob
         WHERE ob.order_id = $1::uuid`,
        [orderId]
      );
    } catch (e) {
      result = await db.query(
        `SELECT ob.*
         FROM order_bom ob
         WHERE CAST(ob.order_id AS VARCHAR) = $1`,
        [String(orderId)]
      );
    }
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/design/bom/:orderId
 * 保存订单BOM
 */
router.post('/bom/:orderId', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { orderId } = req.params;
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: '缺少items' });
    }

    await client.query('BEGIN');
    // 删除旧BOM
    await client.query('DELETE FROM order_bom WHERE order_id = $1', [orderId]);
    // 插入新BOM
    for (const item of items) {
      await client.query(
        `INSERT INTO order_bom (order_id, material_id, material_name, material_code, quantity, unit, unit_price, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderId, item.material_id || null, item.material_name || '', item.material_code || '', item.quantity || 0, item.unit || '', item.unit_price || 0, item.remark || '']
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'BOM保存成功' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/design
 * 设计管理概览
 */
router.get('/', async (req, res, next) => {
  try {
    const [drawings, pendingCount, bomCount] = await Promise.all([
      db.query(`SELECT COUNT(*) as total FROM design_drawing`),
      db.query(`SELECT COUNT(*) as count FROM design_drawing WHERE status = 'pending'`),
      db.query(`SELECT COUNT(*) as count FROM order_bom`),
    ]);
    res.json({
      success: true,
      data: {
        total_drawings: parseInt(drawings.rows[0].total),
        pending_review: parseInt(pendingCount.rows[0].count),
        total_bom: parseInt(bomCount.rows[0].count),
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
