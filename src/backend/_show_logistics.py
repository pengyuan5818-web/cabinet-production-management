path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()
# Show full lines 199-201
for i in range(198, 202):
    print(f"--- Line {i+1} (len={len(lines[i])}) ---")
    print(lines[i])
    print()
