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

// Test exactly what the inventory route does
const sql = `
  SELECT m.id, m.material_code, m.material_name, m.category, m.specification,
         u.unit_name, m.unit_price,
         COALESCE(si.quantity, 0) as quantity,
         COALESCE(si.locked_quantity, 0) as locked_quantity,
         (COALESCE(si.quantity, 0) - COALESCE(si.locked_quantity, 0)) as available_quantity,
         m.safe_stock, m.min_stock,
         COALESCE(si.quantity, 0) * m.unit_price as inventory_value,
         w.warehouse_name
  FROM material m
  LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id
  LEFT JOIN unit u ON m.unit = u.id
  LEFT JOIN warehouse w ON si.warehouse_id = w.id
  WHERE m.status = 'active'
  ORDER BY m.category, m.material_name
  LIMIT 5
`;

p.query(sql).then(function(r) {
  console.log('SUCCESS! Rows:', r.rows.length);
  if (r.rows.length > 0) console.log('Sample:', JSON.stringify(r.rows[0]));
  p.end();
}).catch(function(e) {
  console.log('ERROR:', e.message);
  // Try alternative
  console.log('\nTrying without cast:');
  const sql2 = sql.replace('m.id::uuid', 'm.id');
  return p.query(sql2);
}).then(function(r) {
  console.log('Without cast - Rows:', r.rows.length);
  p.end();
}).catch(function(e) {
  console.log('Without cast ERROR:', e.message);
  p.end();
});
