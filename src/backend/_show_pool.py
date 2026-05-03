path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

print("=== Lines 1-10 ===")
for i in range(1, 11):
    print(f"Line {i}: {lines[i-1]}")
