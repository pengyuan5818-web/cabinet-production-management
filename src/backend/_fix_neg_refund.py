path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Fix: replace -$4 (negating a param) with pre-negated value in JS
old = '"VALUES($1,$2,$3,-$4,null,$5,$6,$7,$8,$9,NOW())",\n' + \
      '                [refId, "PAY" + ts().slice(-8) + "RF", "order", refAmt, "正常客户", "bank_transfer", "refunded", orders[1].id, "边界-部分退款"]'

new = '"VALUES($1,$2,$3,$4,null,$5,$6,$7,$8,$9,NOW())",\n' + \
      '                [refId, "PAY" + ts().slice(-8) + "RF", "order", -refAmt, "正常客户", "bank_transfer", "refunded", orders[1].id, "边界-部分退款"]'

if old in content:
    content = content.replace(old, new)
    print("Fixed: -$4 -> -refAmt in array")
else:
    print("WARNING: pattern not found")

open(path, 'w', encoding='utf-8').write(content)
print("Done")
