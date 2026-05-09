/**
 * 经销商路由
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const logger = require('../utils/logger');
const webhookService = require('../services/webhookService');

/**
 * GET /api/dealers
 * 获取经销商列表
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status, keyword } = req.query;
    const offset = (page - 1) * page_size;
    
    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (status) {
      whereClause.push(`status = $${++paramCount}`);
      params.push(status);
    }
    if (keyword) {
      whereClause.push(`(dealer_name LIKE $${paramCount + 1} OR dealer_code LIKE $${paramCount + 1} OR contact_person LIKE $${paramCount + 1})`);
      params.push(`%${keyword}%`);
      paramCount++;
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM dealer ${where} ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM dealer ${where}`,
      params.slice(0, -2)
    );

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
 * GET /api/dealers/commissions
 * 佣金列表（全部经销商，无需指定ID）
 */
router.get('/commissions', async (req, res, next) => {
  try {
    const { status, page = 1, page_size = 20, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    let where = ['1=1'];
    let params = [];
    let p = 0;
    if (status) { where.push(`dc.status = $${++p}`); params.push(status); }
    if (start_date) { where.push(`dc.created_at >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`dc.created_at <= $${++p}`); params.push(end_date); }
    const w = where.join(' AND ');
    const count = await db.query(`SELECT COUNT(*) FROM dealer_commission dc WHERE ${w}`, params);
    params.push(parseInt(page_size), offset);
    const rows = await db.query(`
      SELECT dc.*, d.dealer_name, om.order_no
      FROM dealer_commission dc
      JOIN dealer d ON d.id = dc.dealer_id
      LEFT JOIN order_master om ON om.id = dc.order_id
      WHERE ${w}
      ORDER BY dc.created_at DESC
      LIMIT $${p+1} OFFSET $${p+2}
    `, params);
    res.json({ success: true, data: { list: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) } });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/openapi/keys
 * 全部经销商的 API Key 列表（管理员用）
 */
router.get('/openapi/keys', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT da.id, da.dealer_id, da.api_key, da.is_active, da.last_used_at, da.created_at, d.dealer_name
      FROM dealer_api da
      JOIN dealer d ON d.id = da.dealer_id
      ORDER BY da.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: rows.rows });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/:id
 * 获取经销商详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // UUID格式校验，防止 /commissions 等被误匹配到 /:id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的经销商ID格式' });
    }

    const result = await db.query('SELECT * FROM dealer WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '经销商不存在' });
    }

    // 获取用户数
    const userCount = await db.query(
      'SELECT COUNT(*) FROM dealer_user WHERE dealer_id = $1',
      [id]
    );

    // 获取订单数
    const orderCount = await db.query(
      'SELECT COUNT(*) FROM order_master WHERE dealer_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        user_count: parseInt(userCount.rows[0].count),
        order_count: parseInt(orderCount.rows[0].count)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dealers
 * 创建经销商
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      dealer_code, dealer_name, dealer_type, contact_person, phone, email,
      province, city, district, address, business_license, bank_name, bank_account, bank_account_name
    } = req.body;

    // 生成经销商编号
    const code = dealer_code || `D${Date.now()}`;

    const result = await db.query(
      `INSERT INTO dealer (
        dealer_code, dealer_name, dealer_type, contact_person, phone, email,
        province, city, district, address, business_license,
        bank_name, bank_account, bank_account_name, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', NOW())
      RETURNING *`,
      [code, dealer_name, dealer_type, contact_person, phone, email,
       province, city, district, address, business_license,
       bank_name, bank_account, bank_account_name]
    );

    logger.info(`创建经销商: ${dealer_name}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '经销商创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/dealers/:id
 * 更新经销商
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    // 构建更新语句
    const updates = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'dealer_name', 'dealer_type', 'contact_person', 'phone', 'email',
      'province', 'city', 'district', 'address', 'business_license',
      'bank_name', 'bank_account', 'bank_account_name', 'status'
    ];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${++paramCount}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有有效字段更新' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE dealer SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '经销商不存在' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '经销商更新成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dealers/:id/users
 * 获取经销商用户列表
 */
router.get('/:id/users', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, username, real_name, phone, email, role, status, last_login, created_at
       FROM dealer_user WHERE dealer_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dealers/:id/users
 * 添加经销商用户
 */
router.post('/:id/users', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, real_name, phone, email, role = 'staff' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 检查用户名是否存在
    const exist = await db.query(
      'SELECT id FROM dealer_user WHERE username = $1',
      [username]
    );

    if (exist.rows.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO dealer_user (dealer_id, username, password_hash, real_name, phone, email, role, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
       RETURNING id, username, real_name, phone, email, role`,
      [id, username, password_hash, real_name, phone, email, role]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: '用户创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/dealers/:id/users/:userId
 * 删除经销商用户
 */
router.delete('/:id/users/:userId', async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    await db.query(
      'DELETE FROM dealer_user WHERE id = $1 AND dealer_id = $2',
      [userId, id]
    );

    res.json({ success: true, message: '用户已删除' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dealers/:id/permissions
 * 获取经销商权限
 */
router.get('/:id/permissions', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM dealer_permission WHERE dealer_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/dealers/:id/permissions
 * 更新经销商权限
 */
router.put('/:id/permissions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 删除现有权限
      await client.query('DELETE FROM dealer_permission WHERE dealer_id = $1', [id]);

      // 添加新权限
      for (const perm of permissions) {
        await client.query(
          `INSERT INTO dealer_permission (dealer_id, permission_key, permission_name, resource_type, resource_id, is_granted, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [id, perm.key, perm.name, perm.resource_type, perm.resource_id, perm.is_granted !== false]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '权限更新成功'
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
 * POST /api/dealers/:id/api-key
 * 为经销商生成 API Key 和 Secret Key（工厂管理员操作）
 */
router.post('/:id/api-key', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days } = req.body; // 有效期天数，不填则永久

    const apiKey = 'dk_' + crypto.randomBytes(16).toString('hex');
    const secretKey = crypto.randomBytes(32).toString('hex');
    const expiredAt = days ? new Date(Date.now() + days * 86400000) : null;

    const r = await db.query(
      `INSERT INTO dealer_api (dealer_id, api_key, secret_key, expired_at, created_by)
       VALUES ($1,$2,$3,$4,
         (SELECT admin_user_id FROM dealer WHERE id=$1 LIMIT 1))
       RETURNING id, dealer_id, api_key, secret_key, is_active, expired_at, created_at`,
      [id, apiKey, secretKey, expiredAt]
    );

    logger.info(`为经销商 ${id} 生成 API Key`);
    res.json({ success: true, data: r.rows[0], message: 'API Key 生成成功，请妥善保管 Secret Key' });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/:id/api-key
 * 查询经销商当前的 API Key 状态
 */
router.get('/:id/api-key', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, dealer_id, api_key, is_active, last_used_at, expired_at, created_at
       FROM dealer_api WHERE dealer_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/dealers/:id/api-key
 * 吊销经销商的 API Key
 */
router.delete('/:id/api-key', async (req, res, next) => {
  try {
    await db.query('UPDATE dealer_api SET is_active=FALSE WHERE dealer_id=$1', [req.params.id]);
    res.json({ success: true, message: 'API Key 已吊销' });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/dealers/:id/webhooks/:webhookId
 * 删除 Webhook
 */
router.delete('/:id/webhooks/:webhookId', async (req, res, next) => {
  try {
    await db.query('DELETE FROM webhook WHERE id=$1 AND dealer_id=$2', [req.params.webhookId, req.params.id]);
    res.json({ success: true, message: 'Webhook 已删除' });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/:id/commissions
 * 查询经销商佣金列表
 */
router.get('/:id/commissions', async (req, res, next) => {
  try {
    const { status, page = 1, page_size = 20, start_date, end_date } = req.query;
    const { list, total, page: curPage, pageSize } = await require('../services/commissionService').list({
      dealerId: req.params.id,
      status,
      startDate: start_date,
      endDate: end_date,
      page: parseInt(page),
      pageSize: parseInt(page_size)
    });
    res.json({ success: true, data: { list, total, page: curPage, page_size: pageSize } });
  } catch (err) { next(err); }
});

/**
 * POST /api/dealers/:id/commissions/settle
 * 结算佣金（工厂管理员操作）
 */
router.post('/:id/commissions/settle', async (req, res, next) => {
  try {
    const { commission_ids, payment_method, remark } = req.body;
    if (!commission_ids?.length) {
      return res.status(400).json({ success: false, message: '请选择要结算的佣金记录' });
    }
    if (!['cash', 'deduct'].includes(payment_method)) {
      return res.status(400).json({ success: false, message: '支付方式必须是 cash（现金）或 deduct（抵扣货款）' });
    }

    // 校验：所有 commission_ids 必须属于该经销商，防止越权结算
    const dealerId = req.params.id;
    const validCheck = await db.query(
      `SELECT COUNT(*) FROM dealer_commission
       WHERE commission_id = ANY($1) AND dealer_id = $2`,
      [commission_ids, dealerId]
    );
    if (parseInt(validCheck.rows[0].count) !== commission_ids.length) {
      return res.status(403).json({ success: false, message: '存在不属于该经销商的佣金记录，结算被拒绝' });
    }

    const result = await require('../services/commissionService').settle({
      commissionIds: commission_ids,
      paymentMethod: payment_method,
      operatorId: req.user?.id,
      operatorName: req.user?.realName || 'system',
      remark
    });
    res.json({ success: true, message: '佣金结算成功', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/dealers/:id/commission-rate
 * 设置经销商佣金比例
 */
router.put('/:id/commission-rate', async (req, res, next) => {
  try {
    const { commission_rate, settlement_cycle } = req.body;
    if (commission_rate !== undefined && (commission_rate < 0 || commission_rate > 1)) {
      return res.status(400).json({ success: false, message: '佣金比例必须在 0~1 之间' });
    }
    const fields = [];
    const vals = [];
    let p = 0;
    if (commission_rate !== undefined) { fields.push(`commission_rate = $${++p}`); vals.push(commission_rate); }
    if (settlement_cycle) { fields.push(`commission_settlement_cycle = $${++p}`); vals.push(settlement_cycle); }
    if (!fields.length) return res.status(400).json({ success: false, message: '没有要更新的字段' });

    vals.push(req.params.id);
    await db.query(
      `UPDATE dealer SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${++p}`,
      vals
    );
    res.json({ success: true, message: '佣金比例已更新' });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/commissions/summary
 * 佣金汇总（全部经销商）
 */
router.get('/commissions/summary', async (req, res, next) => {
  try {
    const { status, start_date, end_date } = req.query;
    let where = ['1=1'];
    let params = [];
    let p = 0;
    if (status) { where.push(`dc.status = $${++p}`); params.push(status); }
    if (start_date) { where.push(`dc.created_at >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`dc.created_at <= $${++p}`); params.push(end_date); }

    const result = await db.query(
      `SELECT dc.status, d.dealer_name, d.dealer_code,
              COUNT(*) as count, SUM(dc.commission_amount) as total
       FROM dealer_commission dc
       JOIN dealer d ON dc.dealer_id = d.id
       WHERE ${where.join(' AND ')}
       GROUP BY dc.status, d.dealer_name, d.dealer_code
       ORDER BY d.dealer_code`, params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/dealers/portal-login
 * 经销商 Portal 登录（工厂端验证 API Key + Secret）
 */
router.post('/portal-login', async (req, res, next) => {
  try {
    const { dealerCode, apiKey, apiSecret } = req.body;
    if (!dealerCode || !apiKey || !apiSecret) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // 查找经销商 + 验证 API Key
    const result = await db.query(
      `SELECT d.id, d.dealer_code, d.dealer_name, d.commission_rate,
              da.api_key, da.secret_key, da.is_active
       FROM dealer d
       JOIN dealer_api da ON da.dealer_id = d.id
       WHERE d.dealer_code = $1 AND da.api_key = $2 AND da.is_active = TRUE`,
      [dealerCode, apiKey]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: '经销商代码或 API Key 无效' });
    }

    const dealer = result.rows[0];
    // 验证 Secret（HMAC 兼容：secret_key 直接比较）
    if (dealer.secret_key !== apiSecret) {
      return res.status(401).json({ success: false, message: 'Secret Key 不匹配' });
    }

    // 生成 Portal Token（简化版：直接用 API Key 作为 token 验证）
    const token = require('crypto').randomBytes(32).toString('hex');

    // 记录登录
    await db.query(
      `UPDATE dealer_api SET last_used_at = NOW() WHERE id = $1`,
      [dealer.id]
    );

    res.json({
      success: true,
      data: {
        token,
        dealer: {
          id: dealer.id,
          dealer_code: dealer.dealer_code,
          dealer_name: dealer.dealer_name,
          commission_rate: dealer.commission_rate
        }
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/:id/api-keys
 * 查询经销商所有 API Key（工厂管理员用）
 */
router.get('/:id/api-keys', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, api_key, secret_key, role, is_active, created_at, last_used_at
       FROM dealer_api WHERE dealer_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/dealers/:id/api-keys
 * 为经销商生成新的 API Key
 */
router.post('/:id/api-keys', async (req, res, next) => {
  try {
    const { role = 'dealer_sales' } = req.body;
    const apiKey = 'dk_' + require('crypto').randomBytes(16).toString('hex');
    const secretKey = require('crypto').randomBytes(24).toString('hex');

    const result = await db.query(
      `INSERT INTO dealer_api (dealer_id, api_key, secret_key, role)
       VALUES ($1, $2, $3, $4) RETURNING id, api_key, secret_key, role, is_active, created_at`,
      [req.params.id, apiKey, secretKey, role]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/dealers/:id/api-keys/:keyId
 * 吊销 API Key
 */
router.delete('/:id/api-keys/:keyId', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE dealer_api SET is_active = FALSE WHERE id = $1 AND dealer_id = $2`,
      [req.params.keyId, req.params.id]
    );
    res.json({ success: true, message: 'API Key 已吊销' });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/:id/webhooks
 * 查询经销商 Webhook 配置
 */
router.get('/:id/webhooks', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, target_url, event_type, secret, is_active, created_at
       FROM webhook WHERE dealer_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/dealers/:id/webhooks
 * 添加 Webhook
 */
router.post('/:id/webhooks', async (req, res, next) => {
  try {
    const { target_url, event_type, secret } = req.body;
    if (!target_url || !event_type) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    const secretKey = secret || require('crypto').randomBytes(16).toString('hex');
    const result = await db.query(
      `INSERT INTO webhook (dealer_id, target_url, event_type, secret)
       VALUES ($1, $2, $3, $4) RETURNING id, target_url, event_type, secret, is_active, created_at`,
      [req.params.id, target_url, event_type, secretKey]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

/**
 * PUT /api/dealers/:id/webhooks/:hookId
 * 更新 Webhook 状态
 */
router.put('/:id/webhooks/:hookId', async (req, res, next) => {
  try {
    const { is_active } = req.body;
    await db.query(
      `UPDATE webhook SET is_active = $1 WHERE id = $2 AND dealer_id = $3`,
      [is_active, req.params.hookId, req.params.id]
    );
    res.json({ success: true, message: 'Webhook 已更新' });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/dealers/:id/webhooks/:hookId
 * 删除 Webhook
 */
router.delete('/:id/webhooks/:hookId', async (req, res, next) => {
  try {
    await db.query(
      `DELETE FROM webhook WHERE id = $1 AND dealer_id = $2`,
      [req.params.hookId, req.params.id]
    );
    res.json({ success: true, message: 'Webhook 已删除' });
  } catch (err) { next(err); }
});

/**
 * GET /api/dealers/:id/webhook-logs
 * Webhook 投递日志
 */
router.get('/:id/webhook-logs', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    const result = await db.query(
      `SELECT wl.* FROM webhook_log wl
       JOIN webhook wh ON wl.webhook_id = wh.id
       WHERE wh.dealer_id = $1
       ORDER BY wl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, parseInt(page_size), offset]
    );
    res.json({ success: true, data: { list: result.rows } });
  } catch (err) { next(err); }
});

module.exports = router;
