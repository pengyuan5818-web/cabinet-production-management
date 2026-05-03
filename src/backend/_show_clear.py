path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()
for i, line in enumerate(lines):
    if 'clearAll' in line and ('TRUNCATE' in line or 'DELETE' in line or 'function clearAll' in line):
        print(f"{i+1}: {repr(line[:150])}")
