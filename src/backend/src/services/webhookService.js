/**
 * Webhook 推送服务
 * 负责从数据库监听事件并主动推送 HTTP 请求到经销商注册的 Webhook URL
 *
 * 触发场景：
 * - 订单状态变更（submitted → quoted → confirmed → producing → shipped → installed）
 * - 生产阶段推进（material_cut / welding / polishing / assembly / packaging / shipping）
 * - 收款确认（payment confirmed）
 * - 佣金结算（commission settled）
 * - 发货通知（shipped）
 */
const db = require('../db');
const logger = require('../utils/logger');
const crypto = require('crypto');
const https = require('https');

// 事件类型 → 描述
const EVENT_TYPES = {
  'order.status_changed': '订单状态变更',
  'order.production_stage': '生产阶段更新',
  'order.shipped': '订单已发货',
  'payment.confirmed': '收款已确认',
  'payment.rejected': '收款被驳回',
  'commission.created': '佣金已生成',
  'commission.settled': '佣金已结算',
  'invoice.created': '发票已开立',
  'invoice.issued': '发票已寄出',
};

class WebhookService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelayMs = [1000, 3000, 10000]; // 重试间隔
  }

  /**
   * HMAC 签名
   */
  sign(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret || '');
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * 投递 Webhook（带重试）
   */
  async deliver(webhook, payload) {
    const logId = await db.query(
      `INSERT INTO webhook_log (webhook_id, event_type, payload, success)
       VALUES ($1, $2, $3, false) RETURNING id`,
      [webhook.id, payload.event, JSON.stringify(payload)]
    );

    let lastError = '';
    let lastStatus = 0;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const bodyStr = JSON.stringify(payload);
        const urlObj = new URL(webhook.url);
        const isHttps = urlObj.protocol === 'https:';
        const httpMod = isHttps ? https : require('http');

        const opts = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': this.sign(payload, webhook.secret || ''),
            'X-Webhook-Event': payload.event,
            'X-Webhook-Delivery-Id': logId.rows[0].id,
            'Content-Length': Buffer.byteLength(bodyStr),
          },
          timeout: 15000,
        };

        const ok = await new Promise((resolve) => {
          const req = httpMod.request(opts, (res) => {
            lastStatus = res.statusCode;
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
              resolve({ ok: res.statusCode < 400, body: data });
            });
          });
          req.on('error', (e) => { lastError = e.message; resolve({ ok: false, body: '' }); });
          req.on('timeout', () => { lastError = 'timeout'; req.destroy(); resolve({ ok: false, body: '' }); });
          req.write(bodyStr);
          req.end();
        });

        await db.query(
          `UPDATE webhook_log SET http_status=$1, success=$2, attempt=$3 WHERE id=$4`,
          [lastStatus, ok.ok, attempt, logId.rows[0].id]
        );

        if (ok.ok) {
          await db.query(
            `UPDATE webhook SET last_triggered=NOW(), last_success=NOW(), retry_count=0 WHERE id=$1`,
            [webhook.id]
          );
          logger.info(`Webhook 投递成功 [${webhook.id}] ${payload.event} → ${webhook.url}`);
          return;
        }

        lastError = `HTTP ${lastStatus}`;
      } catch (err) {
        lastError = err.message;
        logger.warn(`Webhook 投递失败 [${webhook.id}] 第${attempt}次: ${err.message}`);
      }

      if (attempt < this.maxRetries) {
        await this.sleep(this.retryDelayMs[attempt - 1]);
      }
    }

    // 全部重试失败
    await db.query(
      `UPDATE webhook_log SET error_message=$1, attempt=$2 WHERE id=$3`,
      [lastError, this.maxRetries, logId.rows[0].id]
    );
    await db.query(
      `UPDATE webhook SET last_triggered=NOW(), last_error=$1, retry_count=retry_count+1 WHERE id=$2`,
      [lastError, webhook.id]
    );
    logger.error(`Webhook 投递最终失败 [${webhook.id}] ${payload.event}: ${lastError}`);
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * 触发事件（供业务逻辑调用）
   * @param {string} dealerId - 经销商ID
   * @param {string} event - 事件类型
   * @param {object} data - 事件数据
   */
  async trigger(dealerId, event, data) {
    if (!EVENT_TYPES[event]) {
      logger.warn(`未知 Webhook 事件类型: ${event}`);
      return;
    }

    try {
      const hooks = await db.query(
        `SELECT * FROM webhook WHERE dealer_id=$1 AND event_type=$2 AND is_active=TRUE`,
        [dealerId, event]
      );

      if (!hooks.rows.length) return; // 该经销商未订阅此事件

      const payload = {
        event,
        timestamp: new Date().toISOString(),
        dealer_id: dealerId,
        data,
      };

      for (const hook of hooks.rows) {
        this.deliver(hook, payload).catch(err =>
          logger.error(`Webhook deliver error: ${err.message}`)
        );
      }
    } catch (err) {
      logger.error(`Webhook trigger error [${event}]: ${err.message}`);
    }
  }

  /**
   * 批量触发同一事件给多个经销商
   */
  async triggerBatch(dealerIds, event, data) {
    for (const dealerId of dealerIds) {
      this.trigger(dealerId, event, data).catch(err =>
        logger.error(`Webhook batch trigger error: ${err.message}`)
      );
    }
  }
}

module.exports = new WebhookService();
