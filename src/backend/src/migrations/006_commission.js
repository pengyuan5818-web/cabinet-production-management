/**
 * 迁移：006_commission
 * 说明：佣金结算流程支持
 * - dealer 表增加 commission_rate 字段
 * - dealer_commission 表增加 payment_method / settle_batch 等字段
 * - 新增 dealer_commission_settlement 结算记录表
 *
 * 执行方式：node src/migrations/006_commission.js
 */
const db = require('../db');

async function up() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // ── 1. dealer 表：增加佣金比例字段 ───────────────────────────────
    await client.query(`
      ALTER TABLE dealer
        ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.05,
        ADD COLUMN IF NOT EXISTS commission_settlement_cycle VARCHAR(20) DEFAULT 'monthly';
    `);
    console.log('✓ dealer.commission_rate');

    // ── 2. dealer_commission 表：增加结算相关字段 ─────────────────────
    await client.query(`
      ALTER TABLE dealer_commission
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
        ADD COLUMN IF NOT EXISTS settled_type   VARCHAR(20),
        ADD COLUMN IF NOT EXISTS settled_order  VARCHAR(50),
        ADD COLUMN IF NOT EXISTS settled_batch  VARCHAR(50),
        ADD COLUMN IF NOT EXISTS settled_remark TEXT,
        ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP;
    `);
    console.log('✓ dealer_commission.payment_method + settled fields');

    // ── 3. dealer_commission_settlement 表（结算批次表）───────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS dealer_commission_settlement (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settle_batch    VARCHAR(50) NOT NULL UNIQUE,
        settle_date     DATE NOT NULL,
        total_amount    NUMERIC(14,2) DEFAULT 0,
        total_count     INT DEFAULT 0,
        deduct_amount   NUMERIC(14,2) DEFAULT 0,
        deduct_count    INT DEFAULT 0,
        cash_amount     NUMERIC(14,2) DEFAULT 0,
        cash_count      INT DEFAULT 0,
        payment_voucher VARCHAR(200),
        operator_id     UUID,
        operator_name   VARCHAR(100),
        status          VARCHAR(20) DEFAULT 'confirmed',
        remark          TEXT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_commission_settlement_batch ON dealer_commission_settlement(settle_batch);
    `);
    console.log('✓ dealer_commission_settlement');

    await client.query('COMMIT');
    console.log('\n✅ 迁移 006 完成');
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
    await client.query('DROP TABLE IF EXISTS dealer_commission_settlement CASCADE');
    await client.query(`
      ALTER TABLE dealer_commission
        DROP COLUMN IF EXISTS payment_method,
        DROP COLUMN IF EXISTS settled_type,
        DROP COLUMN IF EXISTS settled_order,
        DROP COLUMN IF EXISTS settled_batch,
        DROP COLUMN IF EXISTS settled_remark,
        DROP COLUMN IF EXISTS updated_at;
    `);
    await client.query(`
      ALTER TABLE dealer
        DROP COLUMN IF EXISTS commission_rate,
        DROP COLUMN IF EXISTS commission_settlement_cycle;
    `);
    await client.query('COMMIT');
    console.log('✅ 回滚 006 完成');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
