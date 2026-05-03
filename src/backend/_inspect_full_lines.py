path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

print("=== Lines 154, 156, 161, 162 ===")
for ln in [154, 156, 161, 162]:
    print(f"\n--- Line {ln} ---")
    print(lines[ln-1])
