/**
 * 应付账款路由
 * 功能: 供应商付款、应付账单管理
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/payables
 * 应付账单列表（供前端兼容调用）
 */
router.get('/', async (req, res, next) => {
  try {
    const { supplier_id, status, page = 1, page_size = 50 } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    let params = [];
    let idx = 1;

    if (supplier_id) { where.push(`supplier_id = $${idx++}`); params.push(supplier_id); }
    if (status) { where.push(`status = $${idx++}`); params.push(status); }

    const whereSql = where.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*) FROM payable WHERE ${whereSql}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const rows = await db.query(
      `SELECT p.*, s.supplier_name
       FROM payable p
       LEFT JOIN supplier s ON p.supplier_id = s.id
       WHERE ${whereSql}
       ORDER BY p.due_date ASC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(page_size), offset]
    );

    res.json({
      success: true,
      data: rows.rows,
      total,
      page: parseInt(page),
      page_size: parseInt(page_size)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payables/:id
 * 应付账单详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的账单ID格式' });
    }
    const row = await db.query(
      `SELECT p.*, s.supplier_name
       FROM payable p
       LEFT JOIN supplier s ON p.supplier_id = s.id
       WHERE p.id = $1`,
      [id]
    );
    if (!row.rows[0]) return res.status(404).json({ success: false, message: '账单不存在' });
    res.json({ success: true, data: row.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payables
 * 创建应付账单
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      supplier_id, bill_no, bill_date, due_date,
      amount, tax_rate, description
    } = req.body;

    if (!supplier_id || !amount) {
      return res.status(400).json({ success: false, message: 'supplier_id和amount必填' });
    }

    // 自动处理 tax_rate 溢出
    let safeTaxRate = tax_rate;
    if (tax_rate > 1) safeTaxRate = tax_rate / 100;

    const billDateVal = bill_date || new Date().toISOString().split('T')[0];
    const dueDateVal = due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO payable (supplier_id, bill_no, bill_date, due_date, amount, tax_rate, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'unpaid', NOW())
       RETURNING *`,
      [supplier_id, bill_no || `BILL${Date.now()}`, billDateVal, dueDateVal, amount, safeTaxRate, description || '']
    );

    logger.info(`创建应付账单: ${result.rows[0].bill_no}`);
    res.json({ success: true, data: result.rows[0], message: '账单创建成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/payables/:id
 * 更新账单状态
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, amount, description } = req.body;

    let sql = 'UPDATE payable SET ';
    let setClauses = [];
    let params = [];
    let idx = 1;

    if (status) { setClauses.push(`status = $${idx++}`); params.push(status); }
    if (amount !== undefined) { setClauses.push(`amount = $${idx++}`); params.push(amount); }
    if (description !== undefined) { setClauses.push(`description = $${idx++}`); params.push(description); }
    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query(
      `${sql}${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ success: false, message: '账单不存在' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
