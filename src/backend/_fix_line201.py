path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Fix line 201 (index 200): remove estimate_arrive column and its param
# Problem: 16 column names but 15 $N placeholders + NOW()
# Fix: remove estimate_arrive from INSERT, and remove ovDate string from params
old = lines[200]
new = old
# Remove estimate_arrive from column list
new = new.replace('receive_contact,receive_phone,estimate_arrive,remark,created_at',
                  'receive_contact,receive_phone,remark,created_at')
# Remove ovDate.toISOString().split("T")[0] from the params (it's the 15th param in the array)
# Find and remove it: after '13800000001', ovDate.toISOString().split("T")[0],
new = new.replace(", ovDate.toISOString().split(\"T\")[0]", "")
# Also remove the ovDate declaration since it's no longer used
new = new.replace("var ovDate = new Date(); ovDate.setDate(ovDate.getDate() - 3); ", "")

lines[200] = new
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
print('Done')

# Verify
print('Line 201 check (columns):')
col_end = new.find('created_at) VALUES')
print(new[col_end-200:col_end])
print()
print('Line 201 check (params):')
arr_start = new.find('[lateId')
print(new[arr_start:arr_start+300])
