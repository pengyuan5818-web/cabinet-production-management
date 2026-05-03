path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()
print(f"Total lines: {len(lines)}")
for i in range(max(0, len(lines)-10), len(lines)):
    print(f"{i+1}: {repr(lines[i][:150])}")
