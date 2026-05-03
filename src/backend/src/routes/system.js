/**
 * 系统设置路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/system/settings
 * 获取系统设置
 */
router.get('/settings', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM system_config ORDER BY config_key'
    );

    const settings = {};
    for (const row of result.rows) {
      settings[row.config_key] = row.config_value;
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/system/settings
 * 更新系统设置
 */
router.put('/settings', async (req, res, next) => {
  try {
    const { settings } = req.body;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO system_config (config_key, config_value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (config_key) 
           DO UPDATE SET config_value = $2, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }

      await client.query('COMMIT');

      logger.info('系统设置已更新');

      res.json({
        success: true,
        message: '设置更新成功'
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
 * GET /api/system/dictionaries
 * 获取数据字典
 */
router.get('/dictionaries', async (req, res, next) => {
  try {
    const { type } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (type) {
      whereClause = 'dict_type = $1';
      params.push(type);
    }

    const result = await db.query(
      `SELECT * FROM dictionary ${whereClause ? 'WHERE ' + whereClause : ''} ORDER BY dict_type, sort_order`,
      params
    );

    // 按类型分组
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.dict_type]) {
        grouped[row.dict_type] = [];
      }
      grouped[row.dict_type].push({
        code: row.dict_code,
        name: row.dict_name,
        sort: row.sort_order
      });
    }

    res.json({
      success: true,
      data: grouped
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/system/logs
 * 操作日志
 */
router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, module, action, operator, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (module) {
      whereClause.push(`module = $${++paramCount}`);
      params.push(module);
    }
    if (action) {
      whereClause.push(`action = $${++paramCount}`);
      params.push(action);
    }
    if (operator) {
      whereClause.push(`operator_name LIKE $${++paramCount}`);
      params.push(`%${operator}%`);
    }
    if (start_date) {
      whereClause.push(`created_at >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      whereClause.push(`created_at <= $${++paramCount}`);
      params.push(end_date);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM operation_log ${where} ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM operation_log ${where}`,
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
 * GET /api/system/users
 * 系统用户列表
 */
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, role, status, keyword } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (role) {
      whereClause.push(`role = $${++paramCount}`);
      params.push(role);
    }
    if (status) {
      whereClause.push(`status = $${++paramCount}`);
      params.push(status);
    }
    if (keyword) {
      whereClause.push(`(username LIKE $${paramCount + 1} OR real_name LIKE $${paramCount + 1})`);
      params.push(`%${keyword}%`);
      paramCount++;
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT id, username, real_name, phone, email, role, dept_name, status, last_login, created_at
       FROM sys_user ${where}
       ORDER BY created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM sys_user ${where}`,
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
 * POST /api/system/users
 * 创建系统用户
 */
router.post('/users', async (req, res, next) => {
  try {
    const { username, password, real_name, phone, email, role, dept_name } = req.body;

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO sys_user (
        username, password_hash, real_name, phone, email, role, dept_name, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
      RETURNING id, username, real_name, phone, email, role`,
      [username, password_hash, real_name, phone, email, role, dept_name]
    );

    logger.info(`创建系统用户: ${username}`);

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
 * PUT /api/system/users/:id
 * 更新系统用户
 */
router.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的用户ID格式' });
    }
    const { real_name, phone, email, role, dept_name, status } = req.body;

    const result = await db.query(
      `UPDATE sys_user SET 
       real_name = COALESCE($1, real_name),
       phone = COALESCE($2, phone),
       email = COALESCE($3, email),
       role = COALESCE($4, role),
       dept_name = COALESCE($5, dept_name),
       status = COALESCE($6, status),
       updated_at = NOW()
       WHERE id = $7
       RETURNING id, username, real_name, phone, email, role, status`,
      [real_name, phone, email, role, dept_name, status, id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: '用户更新成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/system/users/:id
 * 删除系统用户
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的用户ID格式' });
    }

    await db.query('DELETE FROM sys_user WHERE id = $1', [id]);

    res.json({ success: true, message: '用户已删除' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/system/config
 * 获取系统配置（/settings 别名）
 */
router.get('/config', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM system_config ORDER BY config_key');
    const settings = {};
    for (const row of result.rows) { settings[row.config_key] = row.config_value; }
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

/**
 * GET /api/system/stats
 * 系统统计概览
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [orders, employees, suppliers, customers] = await Promise.all([
      db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE order_status=\'completed\') as completed FROM order_master'),
      db.query('SELECT COUNT(*) as total FROM employee WHERE status != \'deleted\''),
      db.query('SELECT COUNT(*) as total FROM supplier WHERE status != \'deleted\''),
      db.query('SELECT COUNT(*) as total FROM customer')
    ]);
    res.json({
      success: true,
      data: {
        total_orders: parseInt(orders.rows[0].total || 0),
        completed_orders: parseInt(orders.rows[0].completed || 0),
        total_employees: parseInt(employees.rows[0].total || 0),
        total_suppliers: parseInt(suppliers.rows[0].total || 0),
        total_customers: parseInt(customers.rows[0].total || 0)
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
