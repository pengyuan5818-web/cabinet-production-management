path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

for i in [198, 199, 200]:
    print(f'--- Line {i+1} ---')
    print(lines[i])
    print()
