/**
 * 经销商 Open API 认证中间件
 * 设计文档要求：API Key + Secret Key + HMAC-SHA256 签名验证
 */
const crypto = require('crypto');
const db = require('../db');
const logger = require('../utils/logger');

/**
 * 验证 API Key 和 HMAC 签名
 * 
 * 请求头必须包含：
 *   X-Api-Key:       经销商 API Key
 *   X-Timestamp:    时间戳（毫秒）
 *   X-Signature:    HMAC-SHA256 签名
 * 
 * 签名算法：
 *   sign = HMAC-SHA256(sortedParams + method + path + body, secretKey)
 */
async function dealerApiAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const timestamp = req.headers['x-timestamp'];
  const signature = req.headers['x-signature'];

  // 1. 参数校验
  if (!apiKey || !timestamp || !signature) {
    return res.status(401).json({
      success: false,
      code: 'MISSING_AUTH_HEADERS',
      message: '缺少认证头：X-Api-Key、X-Timestamp、X-Signature'
    });
  }

  // 2. 时间戳防重放（5分钟窗口）
  const now = Date.now();
  const diff = Math.abs(now - parseInt(timestamp));
  if (diff > 5 * 60 * 1000) {
    return res.status(401).json({
      success: false,
      code: 'TIMESTAMP_EXPIRED',
      message: '请求已过期，请重新同步时间'
    });
  }

  // 3. 查找 API Key 对应的经销商和密钥
  let dealer;
  try {
    const result = await db.query(
      `SELECT d.id, d.dealer_name, d.status, d.dealer_type,
              da.api_key, da.secret_key, da.is_active, da.expired_at
       FROM dealer d
       JOIN dealer_api da ON da.dealer_id = d.id
       WHERE da.api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_API_KEY',
        message: 'API Key 无效'
      });
    }

    dealer = result.rows[0];

    // 状态检查
    if (dealer.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'DEALER_INACTIVE',
        message: `经销商状态异常：${dealer.status}`
      });
    }

    if (!dealer.is_active) {
      return res.status(403).json({
        success: false,
        code: 'API_KEY_DISABLED',
        message: 'API Key 已被禁用'
      });
    }

    if (dealer.expired_at && new Date(dealer.expired_at) < new Date()) {
      return res.status(403).json({
        success: false,
        code: 'API_KEY_EXPIRED',
        message: 'API Key 已过期'
      });
    }

  } catch (err) {
    logger.error('API Key 验证失败：', err);
    return res.status(500).json({
      success: false,
      code: 'AUTH_ERROR',
      message: '认证服务异常'
    });
  }

  // 4. 验证 HMAC 签名
  const { secret_key } = dealer;
  const method = req.method.toUpperCase();
  const path = req.originalUrl.split('?')[0];
  // req.rawBody 已经是 string（来自 index.js 的 verify 回调 buf.toString()）
  // req.body 是解析后的 object；用原始字符串确保签名一致
  const body = req.rawBody || (req.body ? JSON.stringify(req.body) : '');

  // 构造签名原文：timestamp + method + path + body
  const signPlain = `${timestamp}${method}${path}${body}`;
  const expectedSig = crypto
    .createHmac('sha256', secret_key)
    .update(signPlain)
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_SIGNATURE',
      message: '签名验证失败'
    });
  }

  // 5. 认证通过，写入 dealer 上下文
  req.dealer = {
    id: dealer.id,
    name: dealer.dealer_name,
    type: dealer.dealer_type
  };

  next();
}

/**
 * 生成 API Key 和 Secret Key（供管理员调用）
 */
async function generateApiKeyPair() {
  const apiKey = 'dk_' + crypto.randomBytes(16).toString('hex');
  const secretKey = crypto.randomBytes(32).toString('hex');
  return { apiKey, secretKey };
}

/**
 * Webhook 签名（供经销商回调验证）
 */
function signWebhook(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

module.exports = { dealerApiAuth, generateApiKeyPair, signWebhook };
