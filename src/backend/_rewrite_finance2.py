path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Find the boundaries precisely
start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'async function createFinance' in line:
        start_line = i
    if start_line is not None and ('async function verifyReports' in line):
        end_line = i
        break

print(f"createFinance: {start_line+1} to {end_line} (0-indexed: {start_line} to {end_line-1})")
print(f"Lines to replace: {end_line - start_line}")

# New function
new_fn = '''async function createFinance(orders) {
    console.log("\\n========== 14. 财务（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (var fi = 0; fi < Math.min(3, orders.length); fi++) {
            var order = orders[fi];
            var payId = uuid();
            var amount = order.total > 0 ? order.total * 0.3 : rf(1000, 5000);
            await client.query(
                "INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) " +
                "VALUES($1,$2,$3,$4,null,$5,$6,$7,$8,$9,NOW())",
                [payId, "PAY" + ts().slice(-8) + fi, "order", amount, "正常客户", "bank_transfer", "confirmed", order.id, "正常收款"]
            );
            console.log("OK 收款: " + amount.toFixed(2) + " [confirmed]");
        }
        var overId = uuid();
        var overOrder = orders.find(function(o) { return o.total > 0; }) || orders[0];
        if (overOrder) {
            var d = new Date();
            d.setDate(d.getDate() - 20);
            var bd = new Date();
            bd.setDate(bd.getDate() - 35);
            var overAmt = rf(10000, 30000);
            await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,0.13,($6*0.13),$6,0,$7,$8,NOW())",
                [overId, overOrder.id, "BILL" + ts().slice(-8), bd, d, overAmt, "overdue", "边界-逾期20天"]
            );
            console.log("OK 边界财务: 逾期应收账款 [overdue, 逾期20天]");
        }
        var badId = uuid();
        var badOrder = orders.find(function(o) { return o.total > 0; });
        if (badOrder) {
            var d2 = new Date();
            d2.setDate(d2.getDate() - 90);
            var bd2 = new Date();
            bd2.setDate(bd2.getDate() - 105);
            var badAmt = rf(20000, 50000);
            await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,0.13,($6*0.13),$6,0,$7,$8,NOW())",
                [badId, badOrder.id, "BILL" + ts().slice(-8) + "BD", bd2, d2, badAmt, "bad_debt", "边界-坏账"]
            );
            console.log("OK 边界财务: 坏账 [bad_debt]");
        }
        if (orders.length > 1 && orders[1].total > 0) {
            var refId = uuid();
            var refAmt = orders[1].total * 0.2;
            await client.query(
                "INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) " +
                "VALUES($1,$2,$3,-$4,null,$5,$6,$7,$8,$9,NOW())",
                [refId, "PAY" + ts().slice(-8) + "RF", "order", refAmt, "正常客户", "bank_transfer", "refunded", orders[1].id, "边界-部分退款"]
            );
            console.log("OK 边界财务: 部分退款 " + refAmt.toFixed(2));
        }
        await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}
'''

# Replace lines[start_line:end_line] with new_fn
new_lines = lines[:start_line] + [new_fn] + lines[end_line:]
new_content = '\n'.join(new_lines)
open(path, 'w', encoding='utf-8').write(new_content)
print("Done. Total lines:", new_content.count('\n'))
