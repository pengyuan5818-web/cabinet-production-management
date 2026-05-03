path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

old = '''await client.query(
                "INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) " +
                "VALUES($1,$2,$3,-$4,null,$5,$6,$7,$8,$9,NOW())",
                [refId, "PAY" + ts().slice(-8) + "RF", "order", refAmt, "正常客户", "bank_transfer", "refunded", orders[1].id, "边界-部分退款"]
            );'''

new = '''var refundNegAmt = -refAmt;
            await client.query(
                "INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) " +
                "VALUES($1,$2,$3,$4,null,$5,$6,$7,$8,$9,NOW())",
                [refId, "PAY" + ts().slice(-8) + "RF", "order", refundNegAmt, "正常客户", "bank_transfer", "refunded", orders[1].id, "边界-部分退款"]
            );'''

if old in content:
    content = content.replace(old, new)
    print("Fixed partial refund INSERT")
else:
    print("WARNING: pattern not found")
    # Try to find partial refund related content
    idx = content.find('partial refund') or content.find('部分退款') or content.find('refundNegAmt')
    print("Context:", repr(content[idx-50:idx+200]) if idx >= 0 else "not found")

open(path, 'w', encoding='utf-8').write(content)
print("Done. Lines:", content.count('\n'))
