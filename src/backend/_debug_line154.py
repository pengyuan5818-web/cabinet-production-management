path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')
line154 = lines[153]
idx = line154.find('CURRENT_TIMESTAMP')
print('CURRENT_TIMESTAMP at index:', idx)
print('Context:', repr(line154[idx-5:idx+50]))
print('Single quotes:', line154.count("'"))
print('Backslashes:', line154.count('\\'))
# Also show the full line without repr to see what's around position 580
print('Chars 570-600:', repr(line154[570:600]))
