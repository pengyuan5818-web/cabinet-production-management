path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Replace the specific problematic lines
# The two overdue/bad_debt INSERTs use ($6*0.13) which fails in PostgreSQL
# Fix: compute tax_amount in JS and pass as separate param

# For the overdue receivable INSERT:
old_piece = '''await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,0.13,($6*0.13),$6,0,$7,$8,NOW())",
                [overId, overOrder.id, "BILL" + ts().slice(-8), bd, d, overAmt, "overdue", "边界-逾期20天"]
            );'''

new_piece = '''var overTax = parseFloat((overAmt * 0.13).toFixed(2));
            var overTotal = parseFloat((overAmt + overTax).toFixed(2));
            await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,NOW())",
                [overId, overOrder.id, "BILL" + ts().slice(-8), bd, d, overAmt, 0.13, overTax, overTotal, "overdue", "边界-逾期20天"]
            );'''

if old_piece in content:
    content = content.replace(old_piece, new_piece)
    print("Replaced overdue receivable INSERT")
else:
    print("WARNING: overdue pattern not found")

# For the bad_debt INSERT:
old_piece2 = '''await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,0.13,($6*0.13),$6,0,$7,$8,NOW())",
                [badId, badOrder.id, "BILL" + ts().slice(-8) + "BD", bd2, d2, badAmt, "bad_debt", "边界-坏账"]
            );'''

new_piece2 = '''var badTax = parseFloat((badAmt * 0.13).toFixed(2));
            var badTotal = parseFloat((badAmt + badTax).toFixed(2));
            await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,NOW())",
                [badId, badOrder.id, "BILL" + ts().slice(-8) + "BD", bd2, d2, badAmt, 0.13, badTax, badTotal, "bad_debt", "边界-坏账"]
            );'''

if old_piece2 in content:
    content = content.replace(old_piece2, new_piece2)
    print("Replaced bad_debt receivable INSERT")
else:
    print("WARNING: bad_debt pattern not found")

open(path, 'w', encoding='utf-8').write(content)
print("Done. Total lines:", content.count('\n'))
