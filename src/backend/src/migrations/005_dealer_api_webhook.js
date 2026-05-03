/**
 * 迁移：005_dealer_api_webhook
 * 说明：经销商 Open API 支持 + Webhook 推送服务
 * 
 * 执行方式：node src/migrations/005_dealer_api_webhook.js
 */
const db = require('../db');
const crypto = require('crypto');

async function up() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // ── 1. dealer_api 表（API Key 管理）───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS dealer_api (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dealer_id     UUID NOT NULL REFERENCES dealer(id) ON DELETE CASCADE,
        api_key       VARCHAR(64) NOT NULL UNIQUE,
        secret_key    VARCHAR(64) NOT NULL,
        is_active     BOOLEAN DEFAULT TRUE,
        expired_at    TIMESTAMP,
        last_used_at  TIMESTAMP,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by    UUID
      );
      CREATE INDEX IF NOT EXISTS idx_dealer_api_key ON dealer_api(api_key);
    `);
    console.log('✓ dealer_api');

    // ── 2. dealer_role_permission 表（角色权限）────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS dealer_role_permission (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_code        VARCHAR(50) NOT NULL,
        permission_code  VARCHAR(100) NOT NULL,
        granted_by       UUID,
        granted_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_code, permission_code)
      );
    `);
    console.log('✓ dealer_role_permission');

    // ── 3. webhook 表（Webhook 配置 + 事件日志）───────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dealer_id      UUID REFERENCES dealer(id) ON DELETE CASCADE,
        event_type     VARCHAR(100) NOT NULL,
        url            VARCHAR(500) NOT NULL,
        secret         VARCHAR(64),
        is_active      BOOLEAN DEFAULT TRUE,
        retry_count    INT DEFAULT 0,
        max_retries    INT DEFAULT 3,
        last_triggered TIMESTAMP,
        last_success   TIMESTAMP,
        last_error     TEXT,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by     UUID,
        UNIQUE(dealer_id, event_type)
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_event ON webhook(event_type, is_active);
    `);
    console.log('✓ webhook');

    // ── 4. webhook_log 表（事件投递日志）───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_log (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id    UUID REFERENCES webhook(id) ON DELETE CASCADE,
        event_type    VARCHAR(100) NOT NULL,
        payload       JSONB,
        http_status   INT,
        response_body TEXT,
        attempt       INT DEFAULT 1,
        success       BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_log_webhook ON webhook_log(webhook_id);
    `);
    console.log('✓ webhook_log');

    // ── 5. 插入默认角色权限数据 ──────────────────────────────────────
    // dealer_admin 权限
    const adminPerms = [
      'customer.create','customer.read','customer.update','customer.delete',
      'order.create','order.read','order.update','order.cancel',
      'design.upload','design.download',
      'finance.receivable.read','finance.payment.read','finance.receive','finance.pay','finance.invoice'
    ];
    for (const p of adminPerms) {
      await client.query(
        `INSERT INTO dealer_role_permission (role_code, permission_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        ['dealer_admin', p]
      );
    }
    // dealer_finance 权限
    const finPerms = [
      'customer.read','order.read',
      'finance.receivable.read','finance.payment.read',
      'finance.receive','finance.pay','finance.invoice'
    ];
    for (const p of finPerms) {
      await client.query(
        `INSERT INTO dealer_role_permission (role_code, permission_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        ['dealer_finance', p]
      );
    }
    // dealer_sales 权限
    const salesPerms = ['customer.create','customer.read','customer.update','order.create','order.read','design.upload'];
    for (const p of salesPerms) {
      await client.query(
        `INSERT INTO dealer_role_permission (role_code, permission_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        ['dealer_sales', p]
      );
    }
    console.log('✓ 默认角色权限数据');

    await client.query('COMMIT');
    console.log('\n✅ 迁移 005 完成');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS webhook_log CASCADE');
    await client.query('DROP TABLE IF EXISTS webhook CASCADE');
    await client.query('DROP TABLE IF EXISTS dealer_role_permission CASCADE');
    await client.query('DROP TABLE IF EXISTS dealer_api CASCADE');
    await client.query('COMMIT');
    console.log('✅ 回滚 005 完成');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
