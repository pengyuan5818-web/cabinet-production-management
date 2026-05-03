path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

for i in range(525, 535):
    if i < len(lines):
        print(f'{i+1}: {repr(lines[i])}')
