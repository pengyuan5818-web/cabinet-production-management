/**
 * 认证中间件
 */
const jwt = require('jsonwebtoken');
const db = require('../db');

// 生产环境必须设置 JWT_SECRET，禁止硬编码兜底
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is not set in production');
}

// 内存缓存：userId+type -> { user, expiresAt }，60秒过期
const userCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // type 合法性校验，防止非法 type 导致 user 为 undefined
    if (!['system', 'dealer'].includes(decoded.type)) {
      return res.status(401).json({
        success: false,
        message: '无效的认证类型'
      });
    }

    const cacheKey = `${decoded.userId}:${decoded.type}`;
    const cached = userCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      return next();
    }

    let user;
    if (decoded.type === 'system') {
      const result = await db.query('SELECT * FROM sys_user WHERE id = $1', [decoded.userId]);
      user = result.rows[0];
    } else if (decoded.type === 'dealer') {
      const result = await db.query('SELECT * FROM dealer_user WHERE id = $1', [decoded.userId]);
      user = result.rows[0];
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '账号已被禁用'
      });
    }

    const reqUser = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      role: user.role,
      type: decoded.type,
      dealerId: user.dealer_id
    };

    userCache.set(cacheKey, { user: reqUser, expiresAt: Date.now() + CACHE_TTL_MS });

    req.user = reqUser;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '登录已过期，请重新登录'
      });
    }
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }
}

module.exports = authMiddleware;
