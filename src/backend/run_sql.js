const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cabinet_factory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

const sql = [
  `CREATE TABLE IF NOT EXISTS supplier_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    bill_no VARCHAR(32) UNIQUE NOT NULL,
    payable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    bill_date DATE,
    due_date DATE,
    remark TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sr_supplier ON supplier_reconciliation(supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sr_status ON supplier_reconciliation(status)`,
  `CREATE TABLE IF NOT EXISTS supplier_payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    reconciliation_id UUID REFERENCES supplier_reconciliation(id) ON DELETE SET NULL,
    amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) DEFAULT '',
    payer VARCHAR(100) DEFAULT '',
    remark TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sp_supplier ON supplier_payment(supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sp_reconciliation ON supplier_payment(reconciliation_id)`
].join('; ');

async function main() {
  const client = await pool.connect();
  try {
    console.log('执行SQL...');
    await client.query(sql);
    console.log('✓ 表创建成功');
    
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('supplier_reconciliation', 'supplier_payment')
      ORDER BY table_name
    `);
    console.log('已创建的表:', tables.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('✗ SQL执行失败:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
