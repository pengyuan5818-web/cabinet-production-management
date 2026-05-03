path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()
for i in range(298, 315):
    print(f"{i+1}: {repr(lines[i])}")
