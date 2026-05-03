path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Find createLogistics function
for i, line in enumerate(lines, 1):
    if 'createLogistics' in line or 'createInstallation' in line or 'createAttendance' in line or 'createFinance' in line:
        print(f"Line {i}: {line[:100]}")

print("\n=== createLogistics full ===")
in_fn = False
for i, line in enumerate(lines, 1):
    if 'async function createLogistics' in line:
        in_fn = True
    if in_fn:
        print(f"{i}: {line[:120]}")
        if 'async function create' in line and 'createLogistics' not in line:
            break
