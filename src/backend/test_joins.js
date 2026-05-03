process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const {Pool} = require('pg');
require('dotenv').config();
const p = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cabinet_factory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function test(name, sql) {
  try {
    const r = await p.query(sql);
    console.log(name + ': SUCCESS, rows=' + r.rows.length);
  } catch(e) {
    console.log(name + ': ERROR - ' + e.message);
  }
}

async function main() {
  // Test 1: JOIN stock_inventory with ::uuid cast
  await test('JOIN si (m.id::uuid=si.material_id)',
    'SELECT m.id, si.material_id FROM material m LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id LIMIT 2');
  
  // Test 2: JOIN unit
  await test('JOIN unit (m.unit=u.id)',
    'SELECT m.id, m.unit, u.unit_name FROM material m LEFT JOIN unit u ON m.unit = u.id LIMIT 2');
  
  // Test 3: Both JOINs
  await test('Both JOINs',
    'SELECT m.id FROM material m LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id LEFT JOIN unit u ON m.unit = u.id LIMIT 2');
  
  // Test 4: warehouse JOIN
  await test('JOIN warehouse (si.warehouse_id=w.id)',
    'SELECT si.warehouse_id, w.warehouse_name FROM stock_inventory si LEFT JOIN warehouse w ON si.warehouse_id = w.id LIMIT 2');
  
  // Test 5: Full query
  await test('Full query (no cast)',
    'SELECT m.id FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id LEFT JOIN unit u ON m.unit = u.id LEFT JOIN warehouse w ON si.warehouse_id = w.id WHERE m.status = \'active\' LIMIT 2');
  
  // Test 6: Full query with cast
  await test('Full query (with cast)',
    'SELECT m.id FROM material m LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id LEFT JOIN unit u ON m.unit = u.id LEFT JOIN warehouse w ON si.warehouse_id = w.id WHERE m.status = \'active\' LIMIT 2');
  
  p.end();
}
main();
