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

# New verifyReports - each query captured to variable first, then logged
# avoids console.table serialization issues
new_fn = '''async function verifyReports() {
    console.log("\\n========== 15. 数据验证 ==========");
    async function runQuery(label, sql) {
        try {
            var r = await db.query(sql);
            console.log("\\n[" + label + "] rows=" + r.rows.length);
            r.rows.forEach(function(row, i) {
                console.log("  " + (i+1) + ". " + JSON.stringify(row));
            });
            if (!r.rows.length) console.log("  (无数据)");
        } catch(e) {
            console.log("ERR [" + label + "]: " + e.message.split("\\n")[0]);
        }
    }
    await runQuery("考勤统计", "SELECT e.employee_name, " +
        "COUNT(*) FILTER (WHERE a.status = 'normal') as normal_days, " +
        "COUNT(*) FILTER (WHERE a.status = 'absent') as absent_days, " +
        "COUNT(*) FILTER (WHERE a.status = 'late') as late_days " +
        "FROM attendance_record a JOIN employee e ON a.employee_id = e.id " +
        "GROUP BY e.employee_name");
    await runQuery("库存记录", "SELECT m.material_name, w.warehouse_name, " +
        "CAST(i.quantity AS int) as quantity " +
        "FROM stock_inventory i " +
        "JOIN material m ON i.material_id = m.id " +
        "JOIN warehouse w ON i.warehouse_id = w.id");
    await runQuery("应收异常", "SELECT order_id, CAST(amount AS text), " +
        "CAST(paid_amount AS text), status, remark " +
        "FROM receivable WHERE status IN ('overdue', 'bad_debt')");
    await runQuery("物流异常", "SELECT logistics_no, logistics_company, status, remark " +
        "FROM logistics_record WHERE status IN ('rejected', 'returned')");
    await runQuery("安装异常", "SELECT task_no, status, accept_status, visit_status " +
        "FROM installation_task WHERE status IN ('rework', 'failed') OR visit_status = 'visited'");
    await runQuery("包装记录", "SELECT pr.package_no, CAST(pr.total_packages AS int), " +
        "(SELECT COUNT(*) FROM package_item pi WHERE pi.package_id = pr.id) as item_count " +
        "FROM package_record pr");
    await runQuery("付款记录", "SELECT payment_no, CAST(amount AS text), payment_method, status, remark " +
        "FROM payment_in ORDER BY created_at DESC LIMIT 20");
    console.log("\\n=== 全部测试完成 ===");
}
'''

new_lines = lines[:start_line] + [new_fn] + lines[end_line:]
new_content = '\n'.join(new_lines)
open(path, 'w', encoding='utf-8').write(new_content)
print("Done. Total lines:", new_content.count('\n'))
