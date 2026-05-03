path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Find the two problematic receivable INSERTs and fix them
# Replace: "VALUES($1,null,$2,$3,$4,$5,$6,0.13,($6*0.13),$6,0,$7,$8,NOW())"
# With:    "VALUES($1,null,$2,$3,$4,$5,$6,$7,$8,($6+$7),0,$9,$10,NOW())"
# And update params accordingly

# The fix: use explicit tax_rate=0.13 and tax_amount computed in JS
old1 = '"INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +\n                "VALUES($1,null,$2,$3,$4,$5,$6,0.13,($6*0.13),$6,0,$7,$8,NOW())"'
new1 = '"INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +\n                "VALUES($1,null,$2,$3,$4,$5,$6,$7,$8,($6+$8),0,$9,$10,NOW())"'

# We need to find the specific lines and update both the SQL and the params array
# Let me search and replace carefully
for i, line in enumerate(lines):
    if 'tax_rate,tax_amount,total_amount' in line and '$6,0.13,($6*0.13),$6,0' in line:
        print(f"Found at line {i+1}: {line[:100]}")
    if 'tax_rate,tax_amount,total_amount' in line and '$6,$7,$8,($6+$8)' in line:
        print(f"Already fixed at line {i+1}")

print("Search complete")
