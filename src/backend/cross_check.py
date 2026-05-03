import subprocess, json

# 所有数据库表
all_tables = """account_period accounts_receivable alpha_download_log alpha_import_log approval_center attendance_record
cabinet_board coating_batch coating_bom coating_equipment coating_plan coating_recipe coating_record
collection_record cost_allocation_pool cost_allocation_rule cost_record countertop_bom countertop_production
countertop_production_detail countertop_quality customer customer_follow dealer dealer_api dealer_application
dealer_commission dealer_commission_settlement dealer_customer dealer_customer_follow dealer_design_file
dealer_order dealer_payment dealer_permission dealer_receivable dealer_role_permission dealer_user
department design_attachment design_drawing design_record device device_maintenance dictionary
door_panel_production door_panel_production_detail door_panel_quality employee equipment equipment_maintenance
exchange_rates expense file_records fund_flow installation_accept installation_progress installation_task
installation_visit installer_allocation inventory_alert inventory_transaction invoice invoice_detail
leave_application logistics_record logistics_track material material_bom material_consumption
monthly_cost_pool notification operation_log order_bom order_cost_summary order_detail order_installation
order_master order_tracking overtime_record package package_item package_log package_material
package_record package_type_rule packaging_material packaging_plan painting_defect painting_task
payable payment_in payment_out payment_record position process_card process_defect process_output
process_route process_station production_calendar production_schedule production_stage production_warning
production_worker project purchase_item purchase_order purchase_suggestion quality_inspect
quality_inspection quality_record quality_standard quote quote_detail quote_item receivable
salary_record shipment shipment_item sort_rule sort_task sort_task_item stock_in stock_in_detail
stock_inventory stock_out stock_out_detail stock_record stock_taking stock_taking_detail
stock_transfer supplier supplier_evaluation supplier_payment supplier_reconciliation sys_user
system_config unit warehouse warehouse_area warehouse_location webhook webhook_log work_hours_record""".strip().split()

# 检查关键后端路由文件的表引用
import os, re

route_dir = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes'
missing = {}
table_files = {}

for fname in os.listdir(route_dir):
    if not fname.endswith('.js'): continue
    fpath = os.path.join(route_dir, fname)
    content = open(fpath, encoding='utf-8').read()
    # 找所有表名引用（FROM / INSERT INTO / UPDATE / INTO 后的单词）
    tables_in_file = set(re.findall(r'(?:FROM|INTO|UPDATE|JOIN\s+)\s+(\w+)', content, re.IGNORECASE))
    # 清理
    tables_in_file = {t.lower() for t in tables_in_file if t}
    for tbl in tables_in_file:
        if tbl not in all_tables:
            missing.setdefault(fname, []).append(tbl)

if missing:
    for f, tables in sorted(missing.items()):
        print(f"[MISSING TABLES in {f}]:")
        for t in tables:
            print(f"  - {t}")
else:
    print("All table references valid!")
