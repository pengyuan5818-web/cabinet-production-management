import os

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_direct_v6.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 0-466 (before createFinance), replace the rest
tail = """// ==========================================
// 14. 财务
// ==========================================
async function createFinance(orders) {
    console.log("\\n========== 14. 财务 ==========");
    const c = await db.getClient();
    try {
        await c.query("BEGIN");
        for (const order of orders) {
            const amt = rf(5000, 15000);
            await c.query(
                "INSERT INTO payment_in (id,payment_no,source_type,source_id,amount,payment_method,status,created_at) VALUES ($1,$2,'order',$3,$4,'transfer','confirmed',NOW()-INTERVAL'20 days')",
                [uuid(), "PAY"+Date.now()+ri(1000,9999), order.id, amt]
            );
            console.log("OK 收款: "+amt.toFixed(2));
        }
        for (const order of orders) {
            const total = rf(10000, 30000);
            const paid = rf(3000, 8000);
            await c.query(
                "INSERT INTO receivable (id,order_id,bill_no,bill_date,due_date,amount,total_amount,paid_amount,status,created_at) VALUES ($1,$2,$3,CURRENT_DATE-15,CURRENT_DATE+15,$4,$4,$5,'partial',NOW())",
                [uuid(), order.id, "BILL"+Date.now()+ri(1000,9999), total, paid]
            );
        }
        await c.query("COMMIT");
        console.log("OK: 财务完成");
    } catch (err) { await c.query("ROLLBACK"); console.log("FAIL 财务:", err.message); }
    finally { c.release(); }
}

// ==========================================
// 15. 报表验证
// ==========================================
async function verifyReports() {
    console.log("\\n========== 15. 报表验证 ==========");
    try {
        const att = await db.query("SELECT e.employee_name,d.dept_name,COUNT(*) FILTER(WHERE a.status='normal')::text as normal_days,COUNT(*) FILTER(WHERE a.status='late')::text as late_days,ROUND(SUM(a.working_hours)::numeric,1)::text as total_hours FROM attendance_record a JOIN employee e ON a.employee_id=e.id LEFT JOIN department d ON e.dept_id=d.id WHERE a.record_date>=CURRENT_DATE-INTERVAL'30 days' GROUP BY e.id,e.employee_name,d.dept_name ORDER BY e.employee_name");
        console.log("\\n考勤统计:");
        if(att.rows.length) console.table(att.rows); else console.log("(无)");

        const ord = await db.query("SELECT order_status,COUNT(*)::text as count,COALESCE(SUM(total_amount),0)::text as total FROM order_master WHERE order_no LIKE 'O%' GROUP BY order_status");
        console.log("\\n订单统计:");
        if(ord.rows.length) console.table(ord.rows); else console.log("(无)");

        const pay = await db.query("SELECT source_type,COUNT(*)::text as count,COALESCE(SUM(amount),0)::text as total FROM payment_in WHERE source_type='order' GROUP BY source_type");
        console.log("\\n收款统计:");
        if(pay.rows.length) console.table(pay.rows); else console.log("(无)");

        const prod = await db.query("SELECT status,COUNT(*)::text as count FROM door_panel_production GROUP BY status");
        console.log("\\n门板生产:");
        if(prod.rows.length) console.table(prod.rows); else console.log("(无)");

        const ct = await db.query("SELECT status,COUNT(*)::text as count FROM countertop_production GROUP BY status");
        console.log("\\n台面生产:");
        if(ct.rows.length) console.table(ct.rows); else console.log("(无)");

        const pkg = await db.query("SELECT status,COUNT(*)::text as count,COALESCE(SUM(total_packages),0)::text as pkgs FROM package_record GROUP BY status");
        console.log("\\n包装统计:");
        if(pkg.rows.length) console.table(pkg.rows); else console.log("(无)");

        const log = await db.query("SELECT status,COUNT(*)::text as count FROM logistics_record GROUP BY status");
        console.log("\\n物流统计:");
        if(log.rows.length) console.table(log.rows); else console.log("(无)");

        const ins = await db.query("SELECT status,COUNT(*)::text as count FROM installation_task GROUP BY status");
        console.log("\\n安装统计:");
        if(ins.rows.length) console.table(ins.rows); else console.log("(无)");

        console.log("\\n[OK] 报表验证完成");
    } catch (err) { console.log("FAIL 报表:", err.message); }
}

// ==========================================
// 主函数
// ==========================================
async function main() {
    console.log("========================================");
    console.log("  [V6] 橱柜工厂 - 完整端到端测试");
    console.log("========================================");
    try {
        await clearAllData();
        await sl(300);
        const { empIds } = await createBasic();
        await sl(200);
        const custIds = await createCustomers();
        await sl(200);
        const supIds = await createSuppliers();
        await sl(200);
        const whIds = await createWarehouses();
        await sl(200);
        const matIds = await createMaterials(supIds);
        await sl(200);
        const orderIds = await createOrders(custIds);
        await sl(200);
        await createStockIn(matIds, whIds, supIds);
        await sl(200);
        await createProduction(orderIds);
        await sl(200);
        const pkgs = await createPackages(orderIds);
        await sl(200);
        await createLogistics(pkgs);
        await sl(200);
        await createInstallation(orderIds);
        await sl(200);
        await createAttendance(empIds);
        await sl(200);
        await createFinance(orderIds);
        await sl(200);
        await verifyReports();
        console.log("\\n========================================");
        console.log("  [OK] 全流程完成！");
        console.log("========================================");
    } catch (err) { console.error("FAIL:", err); }
    finally { process.exit(); }
}
main();
"""

new_content = ''.join(lines[:467]) + tail
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('done, size=', os.path.getsize(path))
