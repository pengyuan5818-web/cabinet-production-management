path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Find all lines with INTERVAL in them
print("=== All INTERVAL lines ===")
for i, line in enumerate(lines, 1):
    if 'INTERVAL' in line:
        print(f"Line {i}: {repr(line[:200])}")
