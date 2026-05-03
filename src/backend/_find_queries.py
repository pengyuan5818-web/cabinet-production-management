path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()
print(f"Total lines: {len(lines)}")
# Print lines 340-375
for i in range(339, min(len(lines), 375)):
    print(f"{i+1}: {repr(lines[i][:120])}")
