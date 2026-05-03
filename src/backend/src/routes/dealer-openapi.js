/**
 * 经销商 Open API v1
 * 基础路径: /dealer/v1
 * 认证: API Key + HMAC-SHA256 签名
 *
 * 设计文档: docs/09_经销商管理模块设计.md 第6节
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dealerApiAuth } = require('../middleware/dealer-api-auth');
const { signWebhook } = require('../middleware/dealer-api-auth');
const db = require('../db');
const logger = require('../utils/logger');
const crypto = require('crypto');

// 所有路由需先通过 API Key 认证
router.use(dealerApiAuth);

// ─────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────

/** 生成订单号 */
function genOrderNo(dealerCode) {
  const dd = String(new Date().getDate()).padStart(2, '0');
  const seq = String(Date.now() % 10000).padStart(4, '0');
  return `${dealerCode}${dd}${seq}`;
}

/** 生成客户编号 */
function genCustomerNo(dealerCode) {
  const yyyymm = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Date.now() % 10000).padStart(4, '0');
  return `${dealerCode}${yyyymm}${seq}`;
}

/** 触发 Webhook */
async function triggerWebhook(dealerId, event, data) {
  try {
    const hooks = await db.query(
      `SELECT * FROM webhook WHERE dealer_id=$1 AND event_type=$2 AND is_active=TRUE`,
      [dealerId, event]
    );
    for (const hook of hooks.rows) {
      const payload = { event, timestamp: new Date().toISOString(), dealer_id: dealerId, data };
      const signature = signWebhook(payload, hook.secret || '');
      await db.query(
        `INSERT INTO webhook_log (webhook_id, event_type, payload, success) VALUES ($1,$2,$3,FALSE)`,
        [hook.id, event, JSON.stringify({ ...payload, signature })]
      );
      // 异步 HTTP 推送（不阻塞主流程）
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
        body: JSON.stringify(payload)
      }).then(async res => {
        const ok = res.ok;
        await db.query(
          `UPDATE webhook_log SET success=$1, http_status=$2 WHERE webhook_id=$3 ORDER BY created_at DESC LIMIT 1`,
          [ok, res.status, hook.id]
        );
        await db.query(`UPDATE webhook SET last_triggered=NOW(), last_success=NOW() WHERE id=$1`, [hook.id]);
      }).catch(async err => {
        await db.query(
          `UPDATE webhook_log SET error_message=$1 WHERE webhook_id=$2 ORDER BY created_at DESC LIMIT 1`,
          [err.message, hook.id]
        );
        await db.query(
          `UPDATE webhook SET last_error=$1, retry_count=retry_count+1 WHERE id=$2`,
          [err.message, hook.id]
        );
      });
    }
  } catch (err) {
    logger.error('Webhook 触发失败：', err);
  }
}

// ─────────────────────────────────────────────────────────────
// 客户接口
// ─────────────────────────────────────────────────────────────

/**
 * GET /dealer/v1/customers
 * 获取客户列表（仅返回当前经销商的客户）
 */
router.get('/customers', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status, keyword } = req.query;
    const offset = (page - 1) * page_size;
    const dealerId = req.dealer.id;

    let where = ['dealer_id = $1'];
    const params = [dealerId];
    let p = 1;

    if (status) {
      where.push(`status = $${++p}`);
      params.push(status);
    }
    if (keyword) {
      where.push(`(name LIKE $${++p} OR phone LIKE $${p} OR customer_no LIKE $${p})`);
      params.push(`%${keyword}%`);
    }
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM dealer_customer WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${++p} OFFSET $${++p}`,
      params
    );
    const count = await db.query(
      `SELECT COUNT(*) FROM dealer_customer WHERE ${where.slice(0, -1 * (keyword ? 2 : 0) + (status ? 1 : 0)).join(' AND ')}`,
      params.slice(0, -2)
    );

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
 * POST /dealer/v1/customers
 * 新建客户
 */
router.post('/customers', async (req, res, next) => {
  try {
    const { name, phone, alt_phone, province, city, district, address, source } = req.body;
    const dealerId = req.dealer.id;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: '客户姓名和电话不能为空' });
    }

    const dealer = await db.query('SELECT dealer_code FROM dealer WHERE id=$1', [dealerId]);
    const customerNo = genCustomerNo(dealer.rows[0]?.dealer_code || 'C');

    const result = await db.query(
      `INSERT INTO dealer_customer (customer_no, dealer_id, name, phone, alt_phone, province, city, district, address, source, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'new') RETURNING *`,
      [customerNo, dealerId, name, alt_phone, province, city, district, address, source]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/customers/:id
 * 获取客户详情
 */
router.get('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的客户ID格式' });
    }
    const result = await db.query(
      `SELECT * FROM dealer_customer WHERE id=$1 AND dealer_id=$2`,
      [req.params.id, req.dealer.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: '客户不存在' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

/**
 * PUT /dealer/v1/customers/:id
 * 更新客户
 */
router.put('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的客户ID格式' });
    }
    const { name, phone, alt_phone, province, city, district, address, source, status } = req.body;
    const r = await db.query(
      `UPDATE dealer_customer SET name=COALESCE($1,name), phone=COALESCE($2,phone), alt_phone=COALESCE($3,alt_phone),
       province=COALESCE($4,province), city=COALESCE($5,city), district=COALESCE($6,district),
       address=COALESCE($7,address), source=COALESCE($8,source), status=COALESCE($9,status),
       updated_at=NOW() WHERE id=$10 AND dealer_id=$11 RETURNING *`,
      [name, phone, alt_phone, province, city, district, address, source, status, req.params.id, req.dealer.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: '客户不存在' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /dealer/v1/customers/:id/follow
 * 添加跟进记录
 */
router.post('/customers/:id/follow', async (req, res, next) => {
  try {
    const { follow_type, follow_content, next_plan, next_follow_date } = req.body;
    const r = await db.query(
      `INSERT INTO dealer_customer_follow (customer_id, follow_type, follow_content, next_plan, next_follow_date, created_by)
       VALUES ($1,$2,$3,$4,$5,
         (SELECT id FROM dealer_user WHERE dealer_id=$6 LIMIT 1))
       RETURNING *`,
      [req.params.id, follow_type, follow_content, next_plan, next_follow_date, req.dealer.id]
    );
    await db.query(
      `UPDATE dealer_customer SET last_follow_date=NOW(), next_follow_date=$1 WHERE id=$2`,
      [next_follow_date, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/customers/:id/follow
 * 获取跟进记录
 */
router.get('/customers/:id/follow', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的客户ID格式' });
    }
    const result = await db.query(
      `SELECT * FROM dealer_customer_follow WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// 订单接口
// ─────────────────────────────────────────────────────────────

/**
 * GET /dealer/v1/orders
 * 获取订单列表
 */
router.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status } = req.query;
    const offset = (page - 1) * page_size;
    const dealerId = req.dealer.id;

    let where = ['dealer_id = $1'];
    const params = [dealerId];
    if (status) { where.push('status = $2'); params.push(status); }
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM dealer_order WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const count = await db.query(
      `SELECT COUNT(*) FROM dealer_order WHERE ${where.join(' AND ')}`, params.slice(0, status ? 2 : 1)
    );

    res.json({
      success: true,
      data: { list: result.rows, total: parseInt(count.rows[0].count), page: +page, page_size: +page_size }
    });
  } catch (err) { next(err); }
});

/**
 * POST /dealer/v1/orders
 * 新建订单（草稿）
 */
router.post('/orders', async (req, res, next) => {
  try {
    const { customer_id, order_type = 'new', dealer_amount, items } = req.body;
    const dealerId = req.dealer.id;
    const dealer = await db.query('SELECT dealer_code, commission_rate FROM dealer WHERE id=$1', [dealerId]);
    const orderNo = genOrderNo(dealer.rows[0]?.dealer_code || 'O');

    const result = await db.query(
      `INSERT INTO dealer_order (dealer_order_no, dealer_id, customer_id, order_type, dealer_amount, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'draft',NOW()) RETURNING *`,
      [orderNo, dealerId, customer_id, order_type, dealer_amount]
    );

    // 如果有订单明细，同步插入 order_item
    if (items && items.length) {
      for (const item of items) {
        await db.query(
          `INSERT INTO order_item (order_id, product_name, spec, unit, qty, unit_price, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [result.rows[0].id, item.product_name, item.spec, item.unit, item.qty, item.unit_price, item.subtotal]
        );
      }
    }

    // 触发 Webhook
    await triggerWebhook(dealerId, 'dealer_order.created', { order: result.rows[0] });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/orders/:id
 * 获取订单详情
 */
router.get('/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const order = await db.query(
      `SELECT do.*, dc.name as customer_name, dc.phone as customer_phone
       FROM dealer_order do
       LEFT JOIN dealer_customer dc ON dc.id=do.customer_id
       WHERE do.id=$1 AND do.dealer_id=$2`,
      [id, req.dealer.id]
    );
    if (!order.rows.length) return res.status(404).json({ success: false, message: '订单不存在' });

    // 获取订单明细
    const items = await db.query('SELECT * FROM order_item WHERE order_id=$1', [id]);

    res.json({ success: true, data: { ...order.rows[0], items: items.rows } });
  } catch (err) { next(err); }
});

/**
 * PUT /dealer/v1/orders/:id
 * 更新订单
 */
router.put('/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const { dealer_amount, items } = req.body;
    const r = await db.query(
      `UPDATE dealer_order SET dealer_amount=COALESCE($1,dealer_amount), updated_at=NOW()
       WHERE id=$2 AND dealer_id=$3 RETURNING *`,
      [dealer_amount, id, req.dealer.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: '订单不存在' });

    if (items && items.length) {
      await db.query('DELETE FROM order_item WHERE order_id=$1', [id]);
      for (const item of items) {
        await db.query(
          `INSERT INTO order_item (order_id, product_name, spec, unit, qty, unit_price, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, item.product_name, item.spec, item.unit, item.qty, item.unit_price, item.subtotal]
        );
      }
    }

    await triggerWebhook(req.dealer.id, 'dealer_order.updated', { order: r.rows[0] });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /dealer/v1/orders/:id/submit
 * 提交订单给工厂确认
 */
router.post('/orders/:id/submit', async (req, res, next) => {
  try {
    const r = await db.query(
      `UPDATE dealer_order SET status='submitted', submitted_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND dealer_id=$2 AND status='draft' RETURNING *`,
      [req.params.id, req.dealer.id]
    );
    if (!r.rows.length) return res.status(400).json({ success: false, message: '订单状态不允许提交' });

    await triggerWebhook(req.dealer.id, 'dealer_order.submitted', { order: r.rows[0] });
    res.json({ success: true, data: r.rows[0], message: '订单已提交，等待工厂确认' });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/orders/:id/track
 * 获取生产进度
 */
router.get('/orders/:id/track', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const order = await db.query(
      `SELECT factory_order_no, factory_status FROM dealer_order WHERE id=$1 AND dealer_id=$2`,
      [id, req.dealer.id]
    );
    if (!order.rows.length) return res.status(404).json({ success: false, message: '订单不存在' });

    // 从工厂订单获取实际生产进度
    let stages = [];
    if (order.rows[0].factory_order_no) {
      const prod = await db.query(
        `SELECT stage, started_at, finished_at, operator_name, remark
         FROM production_stage_log WHERE order_no=$1 ORDER BY started_at ASC`,
        [order.rows[0].factory_order_no]
      );
      stages = prod.rows;
    }

    res.json({ success: true, data: { factory_order_no: order.rows[0].factory_order_no, stages } });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/orders/:id/qrcode
 * 获取订单二维码
 */
router.get('/orders/:id/qrcode', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const order = await db.query(
      `SELECT dealer_order_no, factory_order_no FROM dealer_order WHERE id=$1 AND dealer_id=$2`,
      [id, req.dealer.id]
    );
    if (!order.rows.length) return res.status(404).json({ success: false, message: '订单不存在' });

    // 生成订单查询二维码 URL（指向工厂系统的订单查询页）
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://feniercabinets.cpolar.cn';
    const qrUrl = `${baseUrl}/query?order=${order.rows[0].factory_order_no || order.rows[0].dealer_order_no}`;

    res.json({ success: true, data: { qr_url: qrUrl, order_no: order.rows[0].factory_order_no || order.rows[0].dealer_order_no } });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// 财务接口
// ─────────────────────────────────────────────────────────────

/**
 * GET /dealer/v1/receivables
 * 获取应收款列表（经销商视角：工厂对经销商的应收）
 */
router.get('/receivables', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status } = req.query;
    const offset = (page - 1) * page_size;
    const dealerId = req.dealer.id;

    let where = ['dealer_id = $1'];
    const params = [dealerId];
    if (status) { where.push('status = $2'); params.push(status); }
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM dealer_receivable WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const count = await db.query(
      `SELECT COUNT(*) FROM dealer_receivable WHERE ${where.join(' AND ')}`, params.slice(0, status ? 2 : 1)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(count.rows[0].count), page: +page, page_size: +page_size } });
  } catch (err) { next(err); }
});

/**
 * POST /dealer/v1/payments
 * 提交付款记录
 */
router.post('/payments', async (req, res, next) => {
  try {
    const { payment_type, source_id, source_no, amount, payment_method, bank_name, bank_account, bank_water, voucher_file, receivable_id, remark } = req.body;
    const dealerId = req.dealer.id;
    const paymentNo = `DP${Date.now()}`;

    const r = await db.query(
      `INSERT INTO dealer_payment (payment_no, dealer_id, payment_type, source_id, source_no, amount, payment_method, bank_name, bank_account, bank_water, voucher_file, receivable_id, remark, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',
         (SELECT id FROM dealer_user WHERE dealer_id=$2 LIMIT 1))
       RETURNING *`,
      [paymentNo, dealerId, payment_type, source_id, source_no, amount, payment_method, bank_name, bank_account, bank_water, voucher_file, receivable_id, remark]
    );

    await triggerWebhook(dealerId, 'dealer_payment.submitted', { payment: r.rows[0] });
    res.json({ success: true, data: r.rows[0], message: '付款记录已提交，等待确认' });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/payments
 * 获取付款记录列表
 */
router.get('/payments', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status } = req.query;
    const offset = (page - 1) * page_size;
    const dealerId = req.dealer.id;

    let where = ['dealer_id = $1'];
    const params = [dealerId];
    if (status) { where.push('status = $2'); params.push(status); }
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM dealer_payment WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const count = await db.query(
      `SELECT COUNT(*) FROM dealer_payment WHERE ${where.join(' AND ')}`, params.slice(0, status ? 2 : 1)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(count.rows[0].count), page: +page, page_size: +page_size } });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/commissions
 * 获取佣金/返利记录
 */
router.get('/commissions', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status } = req.query;
    const offset = (page - 1) * page_size;
    const dealerId = req.dealer.id;

    let where = ['dealer_id = $1'];
    const params = [dealerId];
    if (status) { where.push('status = $2'); params.push(status); }
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM dealer_commission WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const count = await db.query(
      `SELECT COUNT(*) FROM dealer_commission WHERE ${where.join(' AND ')}`, params.slice(0, status ? 2 : 1)
    );

    res.json({ success: true, data: { list: result.rows, total: parseInt(count.rows[0].count), page: +page, page_size: +page_size } });
  } catch (err) { next(err); }
});

/**
 * GET /dealer/v1/statements
 * 获取月结对账单
 */
router.get('/statements', async (req, res, next) => {
  try {
    const { month } = req.query; // 格式：YYYY-MM
    const dealerId = req.dealer.id;

    // 查当月订单汇总
    const orders = await db.query(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_amount
       FROM dealer_order WHERE dealer_id=$1 AND TO_CHAR(created_at,'YYYY-MM')=$2`,
      [dealerId, month || new Date().toISOString().slice(0, 7)]
    );
    // 查当月付款汇总
    const payments = await db.query(
      `SELECT COUNT(*) as payment_count, COALESCE(SUM(amount),0) as total_paid
       FROM dealer_payment WHERE dealer_id=$1 AND TO_CHAR(created_at,'YYYY-MM')=$2 AND status='confirmed'`,
      [dealerId, month || new Date().toISOString().slice(0, 7)]
    );
    // 查当月佣金
    const commissions = await db.query(
      `SELECT COUNT(*) as commission_count, COALESCE(SUM(commission_amount),0) as total_commission
       FROM dealer_commission WHERE dealer_id=$1 AND TO_CHAR(created_at,'YYYY-MM')=$2`,
      [dealerId, month || new Date().toISOString().slice(0, 7)]
    );

    res.json({
      success: true,
      data: {
        month: month || new Date().toISOString().slice(0, 7),
        orders: orders.rows[0],
        payments: payments.rows[0],
        commissions: commissions.rows[0]
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
