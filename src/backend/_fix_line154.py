path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Fix line 154:
# Original: ...CURRENT_TIMESTAMP - ($1::text)::interval /* interval:3 days */,CURRENT_TIMESTAMP,$13,NOW())', [doorId, order.id, ..., 'completed', '仓库A']);
# Fix: Change $1->$13, remove comment, add '3 days' to params

# Line 154: Change ($1::text) to ($13::text) and add '3 days' to params
old154 = lines[153]
# Replace $1::text with $13::text (the first occurrence of $1::text in this line)
new154 = old154.replace('($1::text)::interval /* interval:3 days */', '($13::text)::interval', 1)
# Also need to add '3 days' to the params array at the end
# The params end with '仓库A']);  we add , '3 days' before the ]
new154 = new154.replace("'仓库A']);", "'仓库A', '3 days']);")
lines[153] = new154

# Line 156: Change ($2::text) to $11::text (existing 10 params, add '2 days' as 11)
old156 = lines[155]
new156 = old156.replace('($2::text)::interval /* interval:2 days */', '($11::text)::interval', 1)
new156 = new156.replace("'仓库B']);", "'仓库B', '2 days']);")
lines[155] = new156

# Line 161 (index 160): double-quoted SQL, two intervals
# Current: $3::text and $4::text for intervals, existing params up to ? 
# Let's check the params count
# SQL: doorId2=$1, orders[0].id=$2, D string=$3, ..., status=$12, rejected=$13, quality_remark=$14
# That's 14 params. Need intervals as $15 and $16.
old161 = lines[160]
new161 = old161
new161 = new161.replace("($3::text)::interval /* interval:5 days */", '($15::text)::interval', 1)
new161 = new161.replace("($4::text)::interval /* interval:1 day */", '($16::text)::interval', 1)
# Remove the /* interval:X */ comments
new161 = new161.replace(' /* interval:5 days */', '')
new161 = new161.replace(' /* interval:1 day */', '')
# Add interval values to params: the params end with ["Ϳ�����ݳ��꣬�ѷ���2��", "��������"]
# We need to add '5 days' and '1 day' to the end
new161 = new161.replace('"��������"]);', '"��������", "5 days", "1 day"]);')
lines[160] = new161

# Line 162 (index 161): similar for countertop
# Params: ctId2=$1, orders[1].id=$2, CT string=$3, ..., scrapped=$11, quality_remark=$12
# That's 12 params. Need intervals as $13 and $14.
old162 = lines[161]
new162 = old162
new162 = new162.replace("($5::text)::interval /* interval:4 days */", '($13::text)::interval', 1)
new162 = new162.replace("($6::text)::interval /* interval:1 day */", '($14::text)::interval', 1)
new162 = new162.replace(' /* interval:4 days */', '')
new162 = new162.replace(' /* interval:1 day */', '')
new162 = new162.replace('"质量问题"]);', '"质量问题", "4 days", "1 day"]);')
lines[161] = new162

new_content = '\n'.join(lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')

# Verify
print('\nLine 154 (truncated):')
print(lines[153][300:500])
print('\nLine 156 (truncated):')
print(lines[155][300:500])
