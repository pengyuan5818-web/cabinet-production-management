/**
 * 客户管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/customers
 * 获取客户列表
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status, keyword, dealer_id } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    // 经销商只能看自己的客户
    if (req.user.type === 'dealer') {
      whereClause.push(`dealer_id = $${++paramCount}`);
      params.push(req.user.dealerId);
    } else if (dealer_id) {
      whereClause.push(`dealer_id = $${++paramCount}`);
      params.push(dealer_id);
    }

    if (status) {
      whereClause.push(`c.status = $${++paramCount}`);
      params.push(status);
    }
    if (keyword) {
      whereClause.push(`(customer_name LIKE $${++paramCount} OR phone LIKE $${paramCount} OR customer_no LIKE $${paramCount})`);
      params.push(`%${keyword}%`);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    // page_size 和 offset 单独追加，不参与 paramCount 编号
    const limitOffsetParams = [page_size, offset];

    const result = await db.query(
      `SELECT c.*, d.dealer_name, u.real_name as designer_name
       FROM customer c
       LEFT JOIN dealer d ON c.dealer_id = d.id
       LEFT JOIN sys_user u ON c.designer_id = u.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, ...limitOffsetParams]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM customer c ${where}`,
      params
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
 * GET /api/customers/:id
 * 获取客户详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的客户ID格式' });
    }

    const result = await db.query(
      `SELECT c.*, d.dealer_name
       FROM customer c
       LEFT JOIN dealer d ON c.dealer_id = d.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    // 获取跟进记录
    const followResult = await db.query(
      `SELECT cf.*, u.real_name as creator_name
       FROM customer_follow cf
       LEFT JOIN sys_user u ON cf.created_by = u.id
       WHERE cf.customer_id = $1
       ORDER BY cf.created_at DESC`,
      [id]
    );

    // 获取关联订单
    const orderResult = await db.query(
      `SELECT id, order_no, order_status, total_amount, created_at
       FROM order_master WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        follows: followResult.rows,
        orders: orderResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers
 * 创建客户
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      customer_name, phone, province, city, district, address,
      source, dealer_id, designer_id, salesperson_id
    } = req.body;

    // 生成客户编号
    const customerNo = `C${Date.now()}`;

    // customer 表字段顺序: id, customer_no, customer_name, phone, province, city, district, address,
    //                    status, dealer_id, source, designer_id, salesperson_id, reminder_date, last_follow_date, created_at, updated_at
    // 其中 status='new', created_at=NOW() 硬编码，其余用参数
    const result = await db.query(
      `INSERT INTO customer (
        customer_no, customer_name, phone, province, city, district, address,
        status, dealer_id, source, designer_id, salesperson_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $9, $10, $11, NOW())
      RETURNING *`,
      [customerNo, customer_name, phone, province, city, district, address,
       dealer_id || null, source || null, designer_id || null, salesperson_id || null]
    );

    logger.info(`创建客户: ${customer_name}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '客户创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/customers/:id
 * 更新客户
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的客户ID格式' });
    }
    const fields = req.body;

    const allowedFields = [
      'customer_name', 'phone', 'province', 'city', 'district', 'address',
      'source', 'designer_id', 'salesperson_id', 'status', 'reminder_date'
    ];

    const updates = [];
    const values = [];
    let paramCount = 0;

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
      `UPDATE customer SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '客户更新成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/:id/follow
 * 添加跟进记录
 */
router.post('/:id/follow', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { follow_type, follow_content, next_plan, next_follow_date } = req.body;

    const result = await db.query(
      `INSERT INTO customer_follow (
        customer_id, follow_type, follow_content, next_plan, next_follow_date, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [id, follow_type, follow_content, next_plan, next_follow_date, req.user.id]
    );

    // 更新客户最后跟进时间
    await db.query(
      `UPDATE customer SET last_follow_date = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: '跟进记录已添加'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id/follows
 * 获取跟进记录
 */
router.get('/:id/follows', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的客户ID格式' });
    }

    const result = await db.query(
      `SELECT cf.*, u.real_name as creator_name
       FROM customer_follow cf
       LEFT JOIN sys_user u ON cf.created_by = u.id
       WHERE cf.customer_id = $1
       ORDER BY cf.created_at DESC`,
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
 * DELETE /api/customers/:id
 * 删除客户
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的客户ID格式' });
    }

    // 检查是否有订单
    const orderCheck = await db.query(
      'SELECT COUNT(*) FROM order_master WHERE customer_id = $1',
      [id]
    );

    if (parseInt(orderCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: '该客户有订单，无法删除'
      });
    }

    await db.query('DELETE FROM customer_follow WHERE customer_id = $1', [id]);
    await db.query('DELETE FROM customer WHERE id = $1', [id]);

    res.json({ success: true, message: '客户已删除' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
