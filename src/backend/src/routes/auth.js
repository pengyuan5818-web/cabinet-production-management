/**
 * 认证路由
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'cabinet-factory-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    // 查询用户（系统用户 + 经销商用户）
    let user, userType;
    
    const systemResult = await db.query(
      'SELECT * FROM sys_user WHERE username = $1',
      [username]
    );
    
    if (systemResult.rows.length > 0) {
      user = systemResult.rows[0];
      userType = 'system';
    } else {
      const dealerResult = await db.query(
        'SELECT * FROM dealer_user WHERE username = $1',
        [username]
      );
      
      if (dealerResult.rows.length > 0) {
        user = dealerResult.rows[0];
        userType = 'dealer';
      }
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        message: '账号已被禁用' 
      });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }

    // 生成Token
    const token = jwt.sign({
      userId: user.id,
      username: user.username,
      type: userType
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 更新最后登录
    const table = userType === 'system' ? 'sys_user' : 'dealer_user';
    await db.query(
      `UPDATE ${table} SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          realName: user.real_name,
          role: user.role,
          type: userType,
          dealerId: user.dealer_id
        }
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/register
 * 用户注册（仅管理员可用）
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, realName, phone, email, role, dealerId } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO sys_user (username, password_hash, real_name, phone, email, role, dealer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, real_name, role`,
      [username, passwordHash, realName, phone, email, role || 'staff', dealerId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }
    next(err);
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const table = decoded.type === 'system' ? 'sys_user' : 'dealer_user';
    const result = await db.query(
      `SELECT id, username, real_name, phone, email, role, dept_name FROM ${table} WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        deptName: user.dept_name,
        type: decoded.type
      }
    });

  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token无效或已过期'
      });
    }
    next(err);
  }
});

/**
 * POST /api/auth/change-password
 * 修改密码
 */
router.post('/change-password', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '旧密码和新密码不能为空'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const table = decoded.type === 'system' ? 'sys_user' : 'dealer_user';
    const result = await db.query(
      `SELECT password_hash FROM ${table} WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    const isValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '旧密码错误'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE ${table} SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newPasswordHash, decoded.userId]
    );

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * 退出登录
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: '退出成功'
  });
});

module.exports = router;
