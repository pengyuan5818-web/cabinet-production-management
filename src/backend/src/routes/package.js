/**
 * 包装管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

function generatePackageNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `PK${dateStr}${random}`;
}

/**
 * GET /api/package
 * 包装清单列表（根路径）
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, keyword, status, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let c = 0;
    if (keyword) { where.push(`(pk.package_no LIKE $${++c} OR om.order_no LIKE $${++c})`); params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status) { where.push(`pk.status = $${++c}`); params.push(status); }
    if (start_date) { where.push(`pk.created_at >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`pk.created_at <= $${++c}`); params.push(end_date + ' 23:59:59'); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT pk.*, om.order_no
       FROM "package" pk
       LEFT JOIN order_master om ON pk.order_id = om.id
       ${whereStr}
       ORDER BY pk.created_at DESC
       LIMIT $${c+1} OFFSET $${c+2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM "package" pk LEFT JOIN order_master om ON pk.order_id = om.id ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(countResult.rows[0].count) } });
  } catch (err) { next(err); }
});

/**
 * GET /api/package/list
 * 包装清单列表
 */
router.get('/list', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, keyword, status, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let c = 0;
    if (keyword) { where.push(`(pk.package_no LIKE $${++c} OR om.order_no LIKE $${++c})`); params.push(`%${keyword}%`, `%${keyword}%`); }
    if (status) { where.push(`pk.status = $${++c}`); params.push(status); }
    if (start_date) { where.push(`pk.created_at >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`pk.created_at <= $${++c}`); params.push(end_date + ' 23:59:59'); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT pk.*, om.order_no
       FROM "package" pk
       LEFT JOIN order_master om ON pk.order_id = om.id
       ${whereStr}
       ORDER BY pk.created_at DESC
       LIMIT $${c+1} OFFSET $${c+2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM "package" pk LEFT JOIN order_master om ON pk.order_id = om.id ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(countResult.rows[0].count) } });
  } catch (err) { next(err); }
});

/**
 * GET /api/package/materials
 * 包材库存列表
 */
router.get('/materials', async (req, res, next) => {
  try {
    const { keyword } = req.query;
    let where = ['1=1'];
    const params = [];
    let c = 0;
    if (keyword) { where.push(`(material_name LIKE $${++c} OR material_code LIKE $${++c})`); params.push(`%${keyword}%`, `%${keyword}%`); }
    const r = await db.query(
      `SELECT * FROM package_material WHERE ${where.join(' AND ')} ORDER BY material_name`,
      params
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/package/material
 * 新增包材
 */
router.post('/material', async (req, res, next) => {
  try {
    const { material_code, material_name, specification, unit, stock_quantity, min_stock, unit_cost, warehouse_location } = req.body;
    if (!material_code || !material_name) return res.status(400).json({ success: false, message: '缺少编码或名称' });
    const r = await db.query(
      `INSERT INTO package_material (material_code, material_name, specification, unit, stock_quantity, min_stock, unit_cost, warehouse_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [material_code, material_name, specification || '', unit || '', stock_quantity || 0, min_stock || 0, unit_cost || 0, warehouse_location || '']
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * PUT /api/package/material/:id
 * 更新包材
 */
router.put('/material/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { material_name, specification, unit, stock_quantity, min_stock, unit_cost, warehouse_location } = req.body;
    const r = await db.query(
      `UPDATE package_material SET material_name=$1, specification=$2, unit=$3, stock_quantity=$4, min_stock=$5, unit_cost=$6, warehouse_location=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [material_name, specification, unit, stock_quantity, min_stock, unit_cost, warehouse_location, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '材料不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /api/package/material/:id/stock-in
 * 包材入库
 */
router.post('/material/:id/stock-in', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, remark } = req.body;
    const r = await db.query(
      `UPDATE package_material SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [quantity || 1, id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /api/package/logs
 * 包装记录
 */
router.get('/logs', async (req, res, next) => {
  try {
    const { keyword, start_date, end_date } = req.query;
    let where = ['1=1'];
    const params = [];
    let c = 0;
    if (keyword) { where.push(`pk.package_no LIKE $${++c}`); params.push(`%${keyword}%`); }
    if (start_date) { where.push(`pl.created_at >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`pl.created_at <= $${++c}`); params.push(end_date + ' 23:59:59'); }
    const r = await db.query(
      `SELECT pl.*, pk.package_no, om.order_no
       FROM package_log pl
       JOIN package pk ON pl.package_id = pk.id
       LEFT JOIN order_master om ON pk.order_id = om.id
       WHERE ${where.join(' AND ')}
       ORDER BY pl.created_at DESC LIMIT 100`,
      params
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

/**
 * GET /api/package/:id
 * 包装清单详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pResult = await db.query(
      `SELECT pr.*, om.order_no, c.customer_name
       FROM package_record pr
       LEFT JOIN order_master om ON pr.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE pr.id = $1`,
      [id]
    );
    if (pResult.rows.length === 0) return res.status(404).json({ success: false, message: '清单不存在' });

    const iResult = await db.query(
      'SELECT * FROM package_item WHERE package_id = $1 ORDER BY id',
      [id]
    );
    res.json({ success: true, data: { ...pResult.rows[0], items: iResult.rows } });
  } catch (err) { next(err); }
});

/**
 * POST /api/package
 * 新建包装清单
 */
router.post('/', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { order_id, packer_name, items } = req.body;
    if (!order_id) return res.status(400).json({ success: false, message: '缺少order_id' });

    await client.query('BEGIN');

    let total_volume = 0;
    let total_weight = 0;
    for (const item of (items || [])) {
      const vol = parseFloat(item.length || 0) * parseFloat(item.width || 0) * parseFloat(item.height || 0) / 1000000;
      total_volume += vol;
      total_weight += parseFloat(item.weight || 0);
    }

    const longestLength = (items || []).reduce((max, item) => {
      const l = parseInt(item.length || 0);
      return l > max ? l : max;
    }, 0);
    const totalQty = (items || []).reduce((sum, item) => sum + (parseInt(item.quantity || 1)), 0);

    const r = await client.query(
      `INSERT INTO package_record (package_no, order_id, total_packages, total_quantity, total_weight, longest_length, total_volume, status, scan_operator_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8) RETURNING *`,
      [generatePackageNo(), order_id, (items || []).length, totalQty, total_weight, longestLength, total_volume, packer_name || '']
    );
    const pkgId = r.rows[0].id;

    for (const item of (items || [])) {
      await client.query(
        `INSERT INTO package_item (package_id, product_name, product_type, quantity, weight, length, width, height, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [pkgId, item.product_name || item.box_type || '', item.product_type || item.box_type || '',
         item.quantity || 1, parseFloat(item.weight || 0),
         item.length || 0, item.width || 0, item.height || 0, item.remark || item.description || '']
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * PUT /api/package/:id/status
 * 更新包装状态
 */
router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, scan_operator_name } = req.body;
    const scan_time = status === 'pending' ? null : new Date().toISOString();
    const r = await db.query(
      `UPDATE package_record SET status=$1, scan_operator_name=$2, scan_time=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [status, scan_operator_name || '', scan_time, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '清单不存在' });

    // 记录日志
    await db.query(
      `INSERT INTO package_log (package_id, action, operator_name) VALUES ($1,$2,$3)`,
      [id, status === 'packing' ? 'start' : 'complete', scan_operator_name || '']
    );

    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
