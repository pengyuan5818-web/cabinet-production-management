/**
 * 报价管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

function generateQuoteNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const pad = (n, len) => String(n).padStart(len, '0');
  return `Q${dateStr}${pad(Date.now() % 1000000, 6)}${pad(Math.floor(Math.random() * 1000), 3)}`;
}

/**
 * GET /api/quote
 * 报价单列表（根路径）
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, keyword, status, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let c = 0;

    if (keyword) { where.push(`(q.quote_no LIKE $${++c} OR q.customer_name LIKE $${++c})`); params.push(`%${keyword}%`); }
    if (status) { where.push(`q.status = $${++c}`); params.push(status); }
    if (start_date) { where.push(`q.created_at >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`q.created_at <= $${++c}`); params.push(end_date + ' 23:59:59'); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT q.* FROM quote q ${whereStr} ORDER BY q.created_at DESC LIMIT $${c+1} OFFSET $${c+2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM quote q ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(countResult.rows[0].count) } });
  } catch (err) { next(err); }
});

/**
 * GET /api/quote/list
 * 报价单列表（别名，兼容前端）
 */
router.get('/list', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, keyword, status, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let c = 0;

    if (keyword) { where.push(`(q.quote_no LIKE $${++c} OR q.customer_name LIKE $${++c})`); params.push(`%${keyword}%`); }
    if (status) { where.push(`q.status = $${++c}`); params.push(status); }
    if (start_date) { where.push(`q.created_at >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`q.created_at <= $${++c}`); params.push(end_date + ' 23:59:59'); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT q.* FROM quote q ${whereStr} ORDER BY q.created_at DESC LIMIT $${c+1} OFFSET $${c+2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM quote q ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(countResult.rows[0].count) } });
  } catch (err) { next(err); }
});

/**
 * GET /api/quote/:id
 * 报价单详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的报价单ID格式' });
    }
    const qResult = await db.query('SELECT * FROM quote WHERE id = $1', [id]);
    if (qResult.rows.length === 0) return res.status(404).json({ success: false, message: '报价单不存在' });

    const iResult = await db.query(
      'SELECT * FROM quote_item WHERE quote_id = $1 ORDER BY id',
      [id]
    );

    res.json({ success: true, data: { ...qResult.rows[0], items: iResult.rows } });
  } catch (err) { next(err); }
});

/**
 * POST /api/quote
 * 新建报价单
 */
router.post('/', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { customer_name, contact, contact_phone, validity_date, sales_name, remark, discount_amount, items } = req.body;
    if (!customer_name) return res.status(400).json({ success: false, message: '缺少客户名称' });

    const total_amount = (items || []).reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0), 0);
    const final_amount = total_amount - (discount_amount || 0);

    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO quote (quote_no, customer_name, contact, contact_phone, valid_until, sales_name, remark, discount_amount, total_amount, final_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft') RETURNING *`,
      [generateQuoteNo(), customer_name, contact || '', contact_phone || '', validity_date || null, sales_name || '', remark || '', discount_amount || 0, total_amount, final_amount]
    );
    const quoteId = r.rows[0].id;

    for (const item of (items || [])) {
      await client.query(
        `INSERT INTO quote_item (quote_id, item_name, specification, unit, quantity, unit_price, amount, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [quoteId, item.item_name || '', item.specification || '', item.unit || '', item.quantity || 0, item.unit_price || 0, (item.quantity || 0) * (item.unit_price || 0), item.remark || '']
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
 * PUT /api/quote/:id
 * 更新报价单
 */
router.put('/:id', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的报价单ID格式' });
    }
    const { customer_name, contact, contact_phone, validity_date, sales_name, remark, discount_amount, status, items } = req.body;

    const total_amount = (items || []).reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0), 0);
    const final_amount = total_amount - (discount_amount || 0);

    await client.query('BEGIN');
    await client.query(
      `UPDATE quote SET customer_name=$1, contact=$2, contact_phone=$3, valid_until=$4, sales_name=$5, remark=$6, discount_amount=$7, status=$8, total_amount=$9, final_amount=$10, updated_at=NOW()
       WHERE id=$11`,
      [customer_name, contact || '', contact_phone || '', validity_date || null, sales_name || '', remark || '', discount_amount || 0, status || 'draft', total_amount, final_amount, id]
    );

    if (items) {
      await client.query('DELETE FROM quote_item WHERE quote_id = $1', [id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO quote_item (quote_id, item_name, specification, unit, quantity, unit_price, amount, remark) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [id, item.item_name || '', item.specification || '', item.unit || '', item.quantity || 0, item.unit_price || 0, (item.quantity || 0) * (item.unit_price || 0), item.remark || '']
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /api/quote/:id/send
 * 发送报价单
 */
router.post('/:id/send', async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await db.query(`UPDATE quote SET status='sent', updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '报价单不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /api/quote/:id/confirm
 * 确认报价单（确认报价）
 */
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await db.query(`UPDATE quote SET status='confirmed', updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '报价单不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /api/quote/:id/win
 * 报价成交
 */
router.post('/:id/win', async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await db.query(`UPDATE quote SET status='won', updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '报价单不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /api/quote/:id/lose
 * 报价失效/丢单
 */
router.post('/:id/lose', async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await db.query(`UPDATE quote SET status='lost', updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: '报价单不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
