const db = require('./src/db');

const designedTables = [
  'dealer', 'dealer_user', 'dealer_permission',
  'customer', 'customer_follow',
  'design_record', 'design_attachment',
  'order_master', 'order_detail', 'order_tracking', 'cabinet_board', 'order_bom',
  'alpha_import_log', 'countertop_production',
  'sys_user', 'operation_log', 'approval_center',
  'warehouse', 'unit', 'material', 'stock_inventory',
  'stock_in', 'stock_in_detail', 'stock_out', 'stock_out_detail',
  'stock_transfer', 'stock_record',
  'department', 'employee', 'attendance_record', 'salary_record',
  'receivable', 'collection_record', 'payable', 'payment_record', 'invoice', 'fund_flow',
  'supplier', 'supplier_evaluation',
  'system_config', 'dictionary', 'file_records'
];

const enumTypes = ['customer_status', 'order_status', 'dealer_status', 'production_stage', 'approval_status'];

async function main() {
  const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  const enums = await db.query("SELECT typname FROM pg_type WHERE typtype = 'e'");
  const dbTables = tables.rows.map(r => r.table_name);
  
  console.log('=== 数据库已有表 (42) ===');
  dbTables.forEach(t => console.log('  ' + t));
  
  console.log('\n=== 设计中但数据库缺失的表 ===');
  const missing = designedTables.filter(t => !dbTables.includes(t));
  if (missing.length === 0) {
    console.log('  (无，所有设计表都已创建)');
  } else {
    missing.forEach(t => console.log('  ✗ ' + t));
  }
  
  console.log('\n=== 数据库中未在设计列表中的表 ===');
  const extra = dbTables.filter(t => !designedTables.includes(t));
  extra.forEach(t => console.log('  + ' + t));
  
  console.log('\n=== ENUM 类型对比 ===');
  const dbEnums = enums.rows.map(r => r.typname);
  console.log('数据库已有:', dbEnums.join(', '));
  const missingEnum = enumTypes.filter(e => !dbEnums.includes(e));
  if (missingEnum.length > 0) {
    console.log('缺失的ENUM:', missingEnum.join(', '));
  }
  
  await db.pool.end();
}

main();
