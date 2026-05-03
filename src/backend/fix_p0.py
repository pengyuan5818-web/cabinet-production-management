const { Client } = require('pg');
async function main() {
  const db = new Client({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
  await db.connect();
  
  const errors = [];
  
  // P0-1: cabinet_board length/width -> DECIMAL(10,2)
  console.log('P0-1: Altering cabinet_board length/width...');
  try {
    await db.query("BEGIN");
    await db.query("ALTER TABLE cabinet_board ALTER COLUMN length TYPE DECIMAL(10,2)");
    await db.query("ALTER TABLE cabinet_board ALTER COLUMN width TYPE DECIMAL(10,2)");
    await db.query("COMMIT");
    console.log('  OK: cabinet_board length/width -> DECIMAL(10,2)');
  } catch(e) {
    await db.query("ROLLBACK");
    console.log('  ERROR:', e.message);
    errors.push('cabinet_board: ' + e.message);
  }
  
  // P0-2: fund_flow.order_id FK (先检查是否已有约束)
  console.log('\nP0-2: Adding fund_flow.order_id FK...');
  try {
    const existing = await db.query("SELECT conname FROM pg_constraint WHERE conrelid = 'fund_flow'::regclass AND conkey::text = '(order_id)' AND contype = 'f'");
    if (existing.rows.length > 0) {
      console.log('  Already has FK:', existing.rows[0].conname);
    } else {
      await db.query("BEGIN");
      await db.query("ALTER TABLE fund_flow ADD CONSTRAINT fund_flow_order_id_fkey FOREIGN KEY (order_id) REFERENCES order_master(id) ON DELETE SET NULL");
      await db.query("COMMIT");
      console.log('  OK: fund_flow.order_id FK added');
    }
  } catch(e) {
    await db.query("ROLLBACK");
    console.log('  ERROR:', e.message);
    errors.push('fund_flow FK: ' + e.message);
  }
  
  // P0-3: 创建缺失的表
  console.log('\nP0-3: Creating missing tables...');
  
  // salary_month (employee.js references it)
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS salary_month (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employee(id) ON DELETE CASCADE,
        year_month VARCHAR(7) NOT NULL,
        base_salary DECIMAL(12,2) DEFAULT 0,
        overtime_pay DECIMAL(12,2) DEFAULT 0,
        deduction DECIMAL(12,2) DEFAULT 0,
        net_salary DECIMAL(12,2),
        pay_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        remark TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  OK: salary_month created');
  } catch(e) { console.log('  ERROR salary_month:', e.message); errors.push('salary_month: '+e.message); }
  
  // order_item (dealer-openapi.js references it)
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES dealer_order(id) ON DELETE CASCADE,
        product_name VARCHAR(200),
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(12,2) DEFAULT 0,
        total_price DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  OK: order_item created');
  } catch(e) { console.log('  ERROR order_item:', e.message); errors.push('order_item: '+e.message); }
  
  // production_stage_log (dealer-openapi.js references it)
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS production_stage_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        production_id UUID,
        stage VARCHAR(100),
        status VARCHAR(50),
        operator_id UUID,
        operated_at TIMESTAMP DEFAULT NOW(),
        remark TEXT
      )
    `);
    console.log('  OK: production_stage_log created');
  } catch(e) { console.log('  ERROR production_stage_log:', e.message); errors.push('production_stage_log: '+e.message); }
  
  // order_delivery (order.js references it)
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_delivery (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES order_master(id) ON DELETE CASCADE,
        delivery_no VARCHAR(50),
        logistics_company VARCHAR(100),
        tracking_no VARCHAR(100),
        delivery_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        remark TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  OK: order_delivery created');
  } catch(e) { console.log('  ERROR order_delivery:', e.message); errors.push('order_delivery: '+e.message); }
  
  // Verify cabinet_board
  console.log('\n=== Verification ===');
  const r1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='cabinet_board' AND column_name IN ('length','width')");
  r1.rows.forEach(r => console.log(`  cabinet_board.${r.column_name}: ${r.data_type}`));
  
  const r2 = await db.query("SELECT conname FROM pg_constraint WHERE conrelid = 'fund_flow'::regclass AND conkey::text = '(order_id)' AND contype = 'f'");
  console.log(`  fund_flow.order_id FK: ${r2.rows.length ? r2.rows[0].conname : 'NONE'}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:', errors);
  } else {
    console.log('\nAll P0 fixes applied successfully!');
  }
  
  await db.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
