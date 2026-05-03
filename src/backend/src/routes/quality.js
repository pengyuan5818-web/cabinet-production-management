/**
 * 质检管理路由
 * IQC 来料质检 / OQC 出货质检 / PQC 过程质检
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

function generateInspectNo(type) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${type.toUpperCase()}${dateStr}${random}`;
}

/**
 * GET /api/quality/list
 * 质检记录列表
 */
router.get('/list', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, inspect_type, status, supplier_id, keyword, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let c = 0;

    if (inspect_type) { where.push(`qi.inspect_type = $${++c}`); params.push(inspect_type); }
    if (status) { where.push(`qi.result = $${++c}`); params.push(status); }
    if (supplier_id) { where.push(`qi.supplier_id = $${++c}`); params.push(supplier_id); }
    if (keyword) { where.push(`(om.order_no LIKE $${++c} OR c.customer_name LIKE $${++c})`); params.push(`%${keyword}%`); c++; }
    if (start_date) { where.push(`qi.inspect_date >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`qi.inspect_date <= $${++c}`); params.push(end_date); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT qi.*,
              s.supplier_name,
              m.material_name, m.material_code,
              om.order_no, c.customer_name
       FROM quality_inspect qi
       LEFT JOIN supplier s ON qi.supplier_id = s.id
       LEFT JOIN material m ON qi.material_id = m.id
       LEFT JOIN order_master om ON qi.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       ${whereStr}
       ORDER BY qi.created_at DESC
       LIMIT $${c + 1} OFFSET $${c + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM quality_inspect qi ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) } });
  } catch (err) { next(err); }
});

/**
 * POST /api/quality
 * 新增质检记录
 */
router.post('/', async (req, res, next) => {
  try {
    const { inspect_type, inspect_no, supplier_id, material_id, order_id, inspect_date, quantity, sample_size, defect_count, result, remark, inspector, operator_id, operator_name } = req.body;

    if (!inspect_no) {
      return res.status(400).json({ success: false, message: '缺少质检单号' });
    }

    const r = await db.query(
      `INSERT INTO quality_inspect
        (inspect_type, inspect_no, supplier_id, material_id, order_id, inspect_date, quantity, sample_size, defect_count, result, remark, inspector, operator_id, operator_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [inspect_type, inspect_no, supplier_id || null, material_id || null, order_id || null, inspect_date, quantity || 1, sample_size || 1, defect_count || 0, result || 'pending', remark || '', inspector || operator_name || '', operator_id || null, operator_name || '']
    );

    // 如果是不合格，更新对应来源状态（预留钩子）
    if (result === 'fail' && supplier_id) {
      // 触发采购退货流程（预留）
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * PUT /api/quality/:id
 * 更新质检记录
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的质检记录ID格式' });
    }
    const { inspect_date, quantity, sample_size, defect_count, result, remark, inspector } = req.body;
    const r = await db.query(
      `UPDATE quality_inspect SET inspect_date=$1, quantity=$2, sample_size=$3, defect_count=$4, result=$5, remark=$6, inspector=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [inspect_date, quantity, sample_size, defect_count, result, remark, inspector, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '记录不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /api/quality/standards
 * 质检标准列表
 */
router.get('/standards', async (req, res, next) => {
  try {
    const { keyword, inspect_type } = req.query;
    let where = ['1=1'];
    const params = [];
    let c = 0;
    if (keyword) { where.push(`(standard_name LIKE $${++c} OR standard_code LIKE $${++c})`); params.push(`%${keyword}%`); c++; }
    if (inspect_type) { where.push(`inspect_type = $${++c}`); params.push(inspect_type); }
    const r = await db.query(
      `SELECT * FROM quality_standard WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/quality/standard
 * 新增质检标准
 */
router.post('/standard', async (req, res, next) => {
  try {
    const { standard_code, standard_name, inspect_type, check_items, aql, sample_plan, update_user } = req.body;
    if (!standard_code || !standard_name) {
      return res.status(400).json({ success: false, message: '缺少标准编号或名称' });
    }
    const r = await db.query(
      `INSERT INTO quality_standard (standard_code, standard_name, inspect_type, check_items, aql, sample_plan, update_user)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [standard_code, standard_name, inspect_type, check_items || '', aql || '', sample_plan || '', update_user || '']
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * PUT /api/quality/standard/:id
 * 更新质检标准
 */
router.put('/standard/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的质检标准ID格式' });
    }
    const { standard_name, inspect_type, check_items, aql, sample_plan, update_user } = req.body;
    const r = await db.query(
      `UPDATE quality_standard SET standard_name=$1, inspect_type=$2, check_items=$3, aql=$4, sample_plan=$5, update_user=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [standard_name, inspect_type, check_items, aql, sample_plan, update_user, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '标准不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/quality/standard/:id
 * 删除质检标准
 */
router.delete('/standard/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quality_standard WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
