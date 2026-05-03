path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')
line154 = lines[153]

# Show the actual chars around the problematic area
print('Length:', len(line154))
# Find E'INTERVAL
eidx = line154.find("E'INTERVAL")
print('E INTERVAL at:', eidx)
print('Around that area:', repr(line154[eidx:eidx+30]))
# Find the end
print('Last 50 chars:', repr(line154[-50:]))
