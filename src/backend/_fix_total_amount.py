path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Fix: receivable INSERT missing total_amount column
# Fix: add total_amount after amount (both use same $6 value, $7 becomes status, $8 becomes remark)

# Fix overdue receivable
content = content.replace(
    'VALUES($1,null,$2,$3,$4,$5,$6,0,$7,$8,NOW())"',
    'VALUES($1,null,$2,$3,$4,$5,$6,$6,0,$7,$8,NOW())"'
)

open(path, 'w', encoding='utf-8').write(content)
print('Done')
print('Replacements:', content.count('VALUES($1,null,$2,$3,$4,$5,$6,$6,0,$7,$8,NOW())"'))
