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

// Check actual column types
p.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name IN ('material','stock_inventory') ORDER BY table_name, ordinal_position").then(function(r) {
  console.log('=== COLUMN TYPES ===');
  r.rows.forEach(function(row){ console.log(row.table, row.column_name, row.data_type, row.udt_name); });
  
  // Try the actual JOIN both ways
  return p.query("SELECT m.id, si.material_id FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id LIMIT 1");
}).then(function(r) {
  console.log('\n=== JOIN test (no cast) ===');
  console.log('Result rows:', r.rows.length);
  if(r.rows.length > 0) console.log('Sample:', JSON.stringify(r.rows[0]));
  return p.query("SELECT m.id, si.material_id FROM material m LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id LIMIT 1");
}).then(function(r) {
  console.log('\n=== JOIN test (m.id::uuid) ===');
  console.log('Result rows:', r.rows.length);
  if(r.rows.length > 0) console.log('Sample:', JSON.stringify(r.rows[0]));
  return p.query("SELECT m.id, si.material_id FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id::uuid LIMIT 1");
}).then(function(r) {
  console.log('\n=== JOIN test (si.material_id::uuid) ===');
  console.log('Result rows:', r.rows.length);
  if(r.rows.length > 0) console.log('Sample:', JSON.stringify(r.rows[0]));
  p.end();
}).catch(function(e){ 
  console.log('\n=== ERROR ===');
  console.log(e.message); 
  p.end(); 
});
