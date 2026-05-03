path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

old_truncate = "await client.query('TRUNCATE TABLE payment_in, receivable, attendance_record, installation_progress, installer_allocation, installation_task, " + \
    "logistics_record, package_item, package_record, door_panel_production, countertop_production, production_schedule, stock_in, stock_out, stock_inventory, " + \
    "order_tracking, order_bom, order_detail, order_master, material, warehouse, supplier, customer, employee, department CASCADE');"

new_truncate = "await client.query('TRUNCATE TABLE payment_in, receivable, attendance_record, installation_progress, installer_allocation, installation_task, " + \
    "logistics_record, package_item, package_record, door_panel_production, countertop_production, production_schedule, stock_in, stock_out, stock_inventory, " + \
    "order_tracking, order_bom, order_detail, order_master, material, warehouse, supplier, customer, employee, department RESTART IDENTITY CASCADE');"

if old_truncate in content:
    content = content.replace(old_truncate, new_truncate)
    print("Fixed: RESTART IDENTITY added")
else:
    print("WARNING: old_truncate not found, trying with existing content")
    # Show what we have around the TRUNCATE
    idx = content.find("TRUNCATE TABLE")
    if idx >= 0:
        print("Found TRUNCATE at idx", idx)
        print("Context:", repr(content[idx:idx+200]))

open(path, 'w', encoding='utf-8').write(content)
print("Done")
