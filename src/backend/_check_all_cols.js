const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
const tables = ['department', 'employee', 'customer', 'supplier', 'warehouse', 'material', 'material_bom', 'order_master', 'order_detail', 'order_tracking', 'order_bom', 'stock_in', 'stock_out', 'stock_inventory', 'package_record', 'package_item', 'logistics_record', 'installation_task', 'installer_allocation', 'installation_progress', 'attendance_record', 'payment_in', 'receivable', 'door_panel_production', 'countertop_production', 'production_schedule'];
let idx = 0;
function next() {
    if (idx >= tables.length) { pool.end(); return; }
    const t = tables[idx++];
    pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t], function(err, res) {
        if (err) { console.log(t + ': ERROR ' + err.message); next(); return; }
        console.log(t + ': ' + res.rows.map(r => r.column_name).join(', '));
        next();
    });
}
next();
