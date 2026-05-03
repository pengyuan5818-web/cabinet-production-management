path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Find pool configuration lines
print("=== Pool config ===")
for i, line in enumerate(lines, 1):
    if 'Pool' in line or 'host' in line.lower() or 'password' in line.lower() or 'database' in line.lower():
        print(f"Line {i}: {line.strip()[:120]}")
