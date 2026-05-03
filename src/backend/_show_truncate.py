path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()
# Print lines 18-22 completely
for i in range(17, 23):
    print(f"--- Line {i+1} ---")
    print(lines[i])
    print()
