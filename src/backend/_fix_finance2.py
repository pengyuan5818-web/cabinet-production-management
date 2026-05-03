path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Find the createFinance function boundaries
start_line = None
end_line = None
for i, line in enumerate(lines, 1):
    if 'async function createFinance' in line:
        start_line = i - 1
    if start_line and 'async function' in line and 'createFinance' not in line:
        end_line = i - 1
        break

print(f"createFinance: lines {start_line} to {end_line}")

# New createFinance function
new_finance = '''async function createFinance(orders) {
    console.log("\\n========== 14. 财务（正常+异常） ==========");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Normal payments via order_id (customer_id is nullable, use null to avoid FK)
        for (var fi = 0; fi < Math.min(3, orders.length); fi++) {
            var order = orders[fi];
            var payId = uuid();
            var amount = order.total > 0 ? order.total * 0.3 : rf(1000, 5000);
            await client.query("INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) VALUES($1,$2,$3,$4,null,$5,$6,$7,$8,$9,NOW())", [payId, "PAY" + ts().slice(-8) + fi, "order", amount, "客户", "bank_transfer", "confirmed", order.id, "正常收款"]);
            console.log("OK 收款: ¥" + amount.toFixed(2) + " [confirmed]");
        }
        // Overdue receivable (dealer_id is nullable, use null)
        var overId = uuid();
        var overOrder = orders.find(function(o) { return o.total > 0; }) || orders[0];
        if (overOrder) {
            var overDueDate = new Date();
            overDueDate.setDate(overDueDate.getDate() - 20);
            var overBillDate = new Date();
            overBillDate.setDate(overBillDate.getDate() - 35);
            await client.query("INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,paid_amount,status,remark,created_at) VALUES($1,null,$2,$3,$4,$5,$6,0,$7,$8,NOW())", [overId, overOrder.id, "BILL" + ts().slice(-8), overBillDate, overDueDate, rf(10000, 30000), "overdue", "边界-逾期20天"]);
            console.log("OK 边界财务: 逾期应收账款 [overdue, 逾期20天]");
        }
        // Bad debt
        var badId = uuid();
        var badOrder = orders.find(function(o) { return o.total > 0; });
        if (badOrder) {
            var badDueDate = new Date();
            badDueDate.setDate(badDueDate.getDate() - 90);
            var badBillDate = new Date();
            badBillDate.setDate(badBillDate.getDate() - 105);
            await client.query("INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,paid_amount,status,remark,created_at) VALUES($1,null,$2,$3,$4,$5,$6,0,$7,$8,NOW())", [badId, badOrder.id, "BILL" + ts().slice(-8) + "BD", badBillDate, badDueDate, rf(20000, 50000), "bad_debt", "边界-坏账(客户破产)"]);
            console.log("OK 边界财务: 坏账 [bad_debt]");
        }
        // Partial refund (payment_in with negative amount, no FK on amount)
        if (orders.length > 1 && orders[1].total > 0) {
            var refId = uuid();
            var refAmount = orders[1].total * 0.2;
            await client.query("INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) VALUES($1,$2,$3,-$4,null,$5,$6,$7,$8,$9,NOW())", [refId, "PAY" + ts().slice(-8) + "RF", "order", refAmount, "客户", "bank_transfer", "refunded", orders[1].id, "边界-部分退款(产品质量问题)"]);
            console.log("OK 边界财务: 部分退款 ¥" + refAmount.toFixed(2));
        }
        await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}
'''

# Replace lines start_line to end_line
new_lines = lines[:start_line] + [new_finance] + lines[end_line:]
new_content = '\n'.join(new_lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')
print('Total lines:', new_content.count('\n'))
