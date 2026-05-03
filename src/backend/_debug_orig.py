path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

# Show the 6 broken lines in detail
broken_lines = [573, 621, 680, 732, 779, 874]
for ln in broken_lines:
    i = ln - 1
    print(f'--- Line {ln} ---')
    print(repr(lines[i]))
