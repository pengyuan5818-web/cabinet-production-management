path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'async function verifyReports' in line:
        start_line = i
    if start_line is not None and 'async function main' in line:
        end_line = i
        break

print(f"verifyReports: {start_line+1} to {end_line}")

new_fn = '''async function verifyReports() {
    console.log("\\n========== 15. 数据验证 ==========");
    try {
        var att = await db.query("SELECT e.employee_name, " +
            "COUNT(*) FILTER (WHERE a.status = 'normal') as normal_days, " +
            "COUNT(*) FILTER (WHERE a.status = 'absent') as absent_days, " +
            "COUNT(*) FILTER (WHERE a.status = 'late') as late_days " +
            "FROM attendance_record a JOIN employee e ON a.employee_id = e.id " +
            "GROUP BY e.employee_name");
        console.log("\\n[考勤异常统计]");
        if (att.rows.length) console.table(att.rows);
        else console.log("(无数据)");

        var inv = await db.query("SELECT m.material_name, w.warehouse_name, " +
            "CAST(i.quantity AS int) as quantity " +
            "FROM stock_inventory i " +
            "JOIN material m ON i.material_id = m.id " +
            "JOIN warehouse w ON i.warehouse_id = w.id " +
            "WHERE CAST(i.quantity AS int) < CAST(m.safe_stock AS int) OR CAST(i.quantity AS int) > 90000");
        console.log("\\n[库存异常]");
        if (inv.rows.length) console.table(inv.rows);
        else console.log("(无异常库存)");

        var rec = await db.query("SELECT order_id, CAST(amount AS text) as amount, " +
            "CAST(paid_amount AS text) as paid_amount, status, remark " +
            "FROM receivable WHERE status IN ('overdue', 'bad_debt')");
        console.log("\\n[应收/应付异常]");
        if (rec.rows.length) console.table(rec.rows);
        else console.log("(无异常应收)");

        var log = await db.query("SELECT logistics_no, logistics_company, status, remark " +
            "FROM logistics_record WHERE status IN ('rejected', 'returned') " +
            "OR CAST(remark AS text) LIKE '%超期%'");
        console.log("\\n[物流异常]");
        if (log.rows.length) console.table(log.rows);
        else console.log("(无异常物流)");

        var inst = await db.query("SELECT task_no, status, accept_status, visit_status " +
            "FROM installation_task WHERE status IN ('rework', 'failed') OR visit_status = 'visited'");
        console.log("\\n[安装异常]");
        if (inst.rows.length) console.table(inst.rows);
        else console.log("(无异常安装)");

        var pkg = await db.query("SELECT pr.package_no, CAST(pr.total_packages AS int) as total_packages, " +
            "(SELECT COUNT(*) FROM package_item pi WHERE pi.package_id = pr.id) as item_count " +
            "FROM package_record pr");
        console.log("\\n[包装记录]");
        if (pkg.rows.length) console.table(pkg.rows);
        else console.log("(无包装记录)");

        var payments = await db.query("SELECT payment_no, CAST(amount AS text) as amount, " +
            "payment_method, status, remark " +
            "FROM payment_in ORDER BY created_at DESC LIMIT 20");
        console.log("\\n[付款记录(最新)]");
        if (payments.rows.length) console.table(payments.rows);
        else console.log("(无付款记录)");

        console.log("\\n=== 全部测试完成 ===");
    } catch (err) { console.log("WARN: " + err.message.split("\\n")[0]); }
}
'''

new_lines = lines[:start_line] + [new_fn] + lines[end_line:]
new_content = '\n'.join(new_lines)
open(path, 'w', encoding='utf-8').write(new_content)
print("Done. Total lines:", new_content.count('\n'))
