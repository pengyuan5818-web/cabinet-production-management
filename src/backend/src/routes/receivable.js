/**
 * 应收款管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

// 生成收款单号
function genCollectionNo() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `CR${y}${m}${d}${rand}`;
}

// 账期计算到期日
function calcDueDate(paymentTerm, baseDate = new Date()) {
  const base = new Date(baseDate);
  switch (paymentTerm) {
    case 'month_30': base.setDate(base.getDate() + 30); break;
    case 'month_60': base.setDate(base.getDate() + 60); break;
    case 'month_90': base.setDate(base.getDate() + 90); break;
    case 'month_120': base.setDate(base.getDate() + 120); break;
    default: base.setDate(base.getDate() + 30);
  }
  return base.toISOString().split('T')[0];
}

// 应收账款列表（根路径兼容）
router.get('/', async (req, res) => {
  try {
    const { page = 1, page_size = 50, dealer_name, status } = req.query;
    const offset = (page - 1) * page_size;
    let where = ['1=1'];
    let params = [];
    let idx = 1;
    if (dealer_name) { where.push(`d.dealer_name ILIKE $${idx++}`); params.push(`%${dealer_name}%`); }
    if (status) { where.push(`r.status = $${idx++}`); params.push(status); }
    const whereSql = where.join(' AND ');
    const count = await db.query(`SELECT COUNT(*) FROM receivable r LEFT JOIN dealer d ON r.dealer_id = d.id WHERE ${whereSql}`, params);
    const rows = await db.query(
      `SELECT r.*, d.dealer_name FROM receivable r LEFT JOIN dealer d ON r.dealer_id = d.id WHERE ${whereSql} ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(page_size), offset]
    );
    res.json({ success: true, data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 应收账款列表
router.get('/list', async (req, res) => {
  try {
    const { page = 1, page_size = 20, status, customer_id } = req.query;
    const offset = (page - 1) * page_size;
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`ar.payment_status = $${paramIdx++}`);
      params.push(status);
    }
    if (customer_id) {
      conditions.push(`ar.customer_id = $${paramIdx++}`);
      params.push(customer_id);
    }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await db.query(
      `SELECT COUNT(*) total FROM accounts_receivable ar ${whereSQL}`,
      params
    );

    const listResult = await db.query(
      `SELECT ar.*, c.customer_name
       FROM accounts_receivable ar
       LEFT JOIN customer c ON c.id = ar.customer_id
       ${whereSQL}
       ORDER BY ar.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, parseInt(page_size), offset]
    );

    // 计算是否超期
    const today = new Date().toISOString().split('T')[0];
    const rows = listResult.rows.map(row => ({
      ...row,
      is_overdue: row.due_date && row.due_date < today && row.payment_status !== 'paid'
    }));

    res.json({
      list: rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      page_size: parseInt(page_size)
    });
  } catch (err) {
    console.error('获取应收款列表失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 应收款概览
router.get('/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 基础汇总
    const sumResult = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_receivable,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(balance_amount), 0) as total_unpaid
      FROM accounts_receivable
    `);

    // 超期金额（已过期但未付款）
    const overdueResult = await db.query(`
      SELECT COALESCE(SUM(balance_amount), 0) as overdue_amount
      FROM accounts_receivable
      WHERE due_date < $1 AND payment_status != 'paid'
    `, [today]);

    // 未付款数量
    const unpaidCount = await db.query(`
      SELECT COUNT(*) cnt FROM accounts_receivable WHERE payment_status = 'unpaid'
    `);

    // 部分付款数量
    const partialCount = await db.query(`
      SELECT COUNT(*) cnt FROM accounts_receivable WHERE payment_status = 'partial'
    `);

    // 超期数量
    const overdueCount = await db.query(`
      SELECT COUNT(*) cnt FROM accounts_receivable
      WHERE due_date < $1 AND payment_status != 'paid'
    `, [today]);

    res.json({
      total_receivable: parseFloat(sumResult.rows[0].total_receivable) || 0,
      total_paid: parseFloat(sumResult.rows[0].total_paid) || 0,
      total_unpaid: parseFloat(sumResult.rows[0].total_unpaid) || 0,
      overdue_amount: parseFloat(overdueResult.rows[0].overdue_amount) || 0,
      unpaid_count: parseInt(unpaidCount.rows[0].cnt) || 0,
      partial_count: parseInt(partialCount.rows[0].cnt) || 0,
      overdue_count: parseInt(overdueCount.rows[0].cnt) || 0
    });
  } catch (err) {
    console.error('获取应收款概览失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 账龄分析
router.get('/aging', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN balance_amount ELSE 0 END), 0) as within_30,
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' AND due_date < CURRENT_DATE - INTERVAL '30 days' THEN balance_amount ELSE 0 END), 0) as days_30_60,
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' AND due_date < CURRENT_DATE - INTERVAL '60 days' THEN balance_amount ELSE 0 END), 0) as days_60_90,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '90 days' THEN balance_amount ELSE 0 END), 0) as over_90
      FROM accounts_receivable
      WHERE payment_status != 'paid'
    `);

    const row = result.rows[0];
    res.json({
      within_30: parseFloat(row.within_30) || 0,
      days_30_60: parseFloat(row.days_30_60) || 0,
      days_60_90: parseFloat(row.days_60_90) || 0,
      over_90: parseFloat(row.over_90) || 0
    });
  } catch (err) {
    console.error('获取账龄分析失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 应收款详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的账单ID格式' });
    }

    const arResult = await db.query(
      `SELECT ar.*, c.customer_name
       FROM accounts_receivable ar
       LEFT JOIN customer c ON c.id = ar.customer_id
       WHERE ar.id = $1`,
      [id]
    );

    if (!arResult.rows.length) {
      return res.status(404).json({ error: '应收款记录不存在' });
    }

    const recordResult = await db.query(
      `SELECT cr.*, e.name as operator_name
       FROM collection_record cr
       LEFT JOIN employee e ON e.id = cr.operator_id
       WHERE cr.receivable_id = $1
       ORDER BY cr.collection_date DESC, cr.created_at DESC`,
      [id]
    );

    const today = new Date().toISOString().split('T')[0];
    const ar = arResult.rows[0];

    res.json({
      ...ar,
      is_overdue: ar.due_date && ar.due_date < today && ar.payment_status !== 'paid',
      records: recordResult.rows
    });
  } catch (err) {
    console.error('获取应收款详情失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 收款核销
router.post('/:id/collect', async (req, res) => {
  try {
    const { id } = req.params;
    const { collection_amount, collection_date, collection_method, operator_id, operator_name, remark, account_bank } = req.body;

    if (!collection_amount || parseFloat(collection_amount) <= 0) {
      return res.status(400).json({ error: '收款金额必须大于0' });
    }
    if (!collection_date) {
      return res.status(400).json({ error: '收款日期不能为空' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 锁定并获取应收款记录
      const arResult = await client.query(
        `SELECT * FROM accounts_receivable WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!arResult.rows.length) {
        throw new Error('应收款记录不存在');
      }

      const ar = arResult.rows[0];
      const newPaid = parseFloat(ar.paid_amount) + parseFloat(collection_amount);
      const newBalance = parseFloat(ar.total_amount) - newPaid;
      let newStatus = 'partial';
      if (newBalance <= 0) {
        newStatus = 'paid';
      }

      // 更新应收款
      await client.query(
        `UPDATE accounts_receivable
         SET paid_amount = $1, balance_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newPaid, Math.max(0, newBalance), newStatus, id]
      );

      // 创建收款记录
      const collectionNo = genCollectionNo();
      const recordResult = await client.query(
        `INSERT INTO collection_record
         (receivable_id, order_id, collection_no, collection_amount, collection_date,
          collection_method, account_bank, operator_id, operator_name, remark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [id, ar.order_id, collectionNo, collection_amount, collection_date,
         collection_method || null, account_bank || null, operator_id || null, operator_name || null, remark || null]
      );

      await client.query('COMMIT');

      // 尾款收完 + 订单已安装完成（或无需安装）→ 订单状态改为 completed
      if (newStatus === 'paid') {
        const orderCheck = await db.query(
          `SELECT order_status, installation_required FROM order_master WHERE id = $1`,
          [ar.order_id]
        );
        if (orderCheck.rows.length > 0) {
          const ord = orderCheck.rows[0];
          // 只有安装已完成（installed）或无需安装（installation_required=false）的订单才能完成
          if (ord.installation_required === false || ord.order_status === 'installed') {
            await db.query(
              `UPDATE order_master SET order_status = 'completed', updated_at = NOW() WHERE id = $1`,
              [ar.order_id]
            );
          }
        }
      }

      res.json({
        message: '收款核销成功',
        payment_status: newStatus,
        record: recordResult.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('收款核销失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 手动创建应收款
router.post('/', async (req, res) => {
  try {
    const { order_id, order_no, customer_id, customer_name, total_amount, due_date, payment_term, invoice_no } = req.body;

    if (!order_id || !order_no) {
      return res.status(400).json({ error: '订单ID和订单号不能为空' });
    }

    // 检查是否已存在
    const existResult = await db.query(
      `SELECT id FROM accounts_receivable WHERE order_id = $1`,
      [order_id]
    );
    if (existResult.rows.length) {
      return res.status(400).json({ error: '该订单已存在应收款记录' });
    }

    const finalDueDate = due_date || calcDueDate(payment_term);

    const result = await db.query(
      `INSERT INTO accounts_receivable
       (order_id, order_no, customer_id, customer_name, total_amount, balance_amount, due_date, payment_term, invoice_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [order_id, order_no, customer_id, customer_name, total_amount || 0, total_amount || 0, finalDueDate, payment_term, invoice_no || null]
    );

    res.json({ message: '创建成功', data: result.rows[0] });
  } catch (err) {
    console.error('创建应收款失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 根据订单自动生成应收款
router.post('/auto', async (req, res) => {
  try {
    const { order_id, payment_term } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: '订单ID不能为空' });
    }

    // 获取订单信息
    const orderResult = await db.query(
      `SELECT o.*, c.customer_name
       FROM order_master o
       LEFT JOIN customer c ON c.id = o.customer_id
       WHERE o.id = $1`,
      [order_id]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // 检查是否已存在
    const existResult = await db.query(
      `SELECT id FROM accounts_receivable WHERE order_id = $1`,
      [order_id]
    );
    if (existResult.rows.length) {
      return res.json({ message: '该订单已存在应收款记录', data: existResult.rows[0] });
    }

    // 计算到期日
    const finalPaymentTerm = payment_term || order.payment_term || 'month_30';
    const dueDate = calcDueDate(finalPaymentTerm, new Date(order.delivered_at || order.created_at));

    // 创建应收款
    const result = await db.query(
      `INSERT INTO accounts_receivable
       (order_id, order_no, customer_id, customer_name, total_amount, balance_amount, due_date, payment_term)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [order_id, order.order_no, order.customer_id, order.customer_name,
       order.total_amount || 0, order.total_amount || 0, dueDate, finalPaymentTerm]
    );

    res.json({ message: '自动生成应收款成功', data: result.rows[0] });
  } catch (err) {
    console.error('自动生成应收款失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
