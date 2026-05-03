path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

print("=== createProduction function (lines 140-175) ===")
for i in range(139, min(175, len(lines))):
    print(f"{i+1}: {lines[i]}")
