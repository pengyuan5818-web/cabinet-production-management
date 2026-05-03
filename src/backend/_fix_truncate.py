path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8', errors='replace').read()

# Find clearAll function and replace the DELETE loop with TRUNCATE CASCADE
old_clear = """        var tables = [
            'payment_in', 'receivable',
            'attendance_record',
            'installation_progress', 'installer_allocation', 'installation_task',
            'logistics_track', 'logistics_record',
            'package_item', 'package_record',
            'door_panel_production', 'countertop_production', 'production_schedule',
            'production_worker', 'production_stage',
            'stock_in', 'stock_out', 'stock_inventory',
            'order_tracking', 'order_bom', 'order_detail', 'order_master',
            'material_bom', 'material', 'warehouse', 'supplier',
            'customer', 'employee', 'department',
        ];
        for (var ti = 0; ti < tables.length; ti++) {
            await client.query('DELETE FROM ' + tables[ti]);
        }
        console.log('OK: 清空完成');"""

new_clear = """        // Disable FK triggers, truncate, re-enable
        await client.query("SET session_replication_role = 'replica';");
        await client.query("TRUNCATE TABLE payment_in, receivable, attendance_record, installation_progress, installer_allocation, installation_task, logistics_track, logistics_record, package_item, package_record, door_panel_production, countertop_production, production_schedule, production_worker, production_stage, stock_in, stock_out, stock_inventory, order_tracking, order_bom, order_detail, order_master, material_bom, material, warehouse, supplier, customer, employee, department CASCADE;");
        await client.query("SET session_replication_role = 'origin';");
        console.log('OK: 清空完成 (TRUNCATE CASCADE)');"""

if old_clear in content:
    content = content.replace(old_clear, new_clear)
    print('Replaced clearAll')
else:
    print('Pattern not found')

open(path, 'w', encoding='utf-8').write(content)

import subprocess
r = subprocess.run(['node', '--check', path], capture_output=True)
print('Syntax:', r.stderr.decode('utf-8', errors='replace')[:200] if r.stderr else 'OK')
print('Code:', r.returncode)
