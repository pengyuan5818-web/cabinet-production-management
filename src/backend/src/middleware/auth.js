/**
 * 认证中间件
 */
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production'); return 'cabinet-factory-dev-key-2026'; })();

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

    req.user = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      role: user.role,
      type: decoded.type,
      dealerId: user.dealer_id
    };

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
