const db = require('./src/db');

const DESIGNED_62 = [
  'dealer','dealer_user','dealer_permission','dealer_application',
  'customer','customer_follow','dealer_customer','dealer_customer_follow',
  'design_record','design_attachment','dealer_design_file',
  'quote','quote_detail',
  'approval_center',
  'order_master','order_detail','order_tracking','dealer_order',
  'cabinet_board','order_bom','alpha_import_log','alpha_download_log',
  'countertop_production','countertop_bom',
  'door_panel_production','coating_recipe','coating_equipment','coating_bom',
  'warehouse','warehouse_location','material','inventory','inventory_alert','inventory_transaction',
  'supplier',
  'logistics_record','logistics_track','installation_task','installer_allocation','installation_progress','installation_accept','installation_visit',
  'package_record','sort_rule','package_type_rule','package_item',
  'payment_in','payment_out','invoice','receivable','payable','dealer_receivable','dealer_payment','dealer_commission',
  'employee','attendance','leave_application','expense','overtime_record',
  'department','position','operation_log'
];

async function main() {
  const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  const dbTables = tables.rows.map(r => r.table_name);

  // Conflict: in design but different name in DB
  const renamed = {
    'attendance': 'attendance_record',
    'inventory': 'stock_inventory'
  };

  const missing = DESIGNED_62.filter(t => !dbTables.includes(t) && !renamed[t]);

  console.log('=== 缺失的20张表 ===');
  missing.forEach((t, i) => console.log((i+1) + '. ' + t));

  console.log('\n=== DB有但设计无的表 ===');
  const extra = dbTables.filter(t => !DESIGNED_62.includes(t) && !Object.values(renamed).includes(t));
  extra.forEach(t => console.log('  + ' + t));

  console.log('\n=== 名称差异（设计vs实际）===');
  for (const [design, actual] of Object.entries(renamed)) {
    if (dbTables.includes(actual)) {
      console.log('  设计: ' + design + ' → 实际: ' + actual);
    }
  }

  console.log('\n缺失表数量:', missing.length);
  await db.pool.end();
}

main();
