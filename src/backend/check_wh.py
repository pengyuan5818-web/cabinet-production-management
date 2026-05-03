f = open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js', 'rb')
data = f.read()
f.close()
print('Size:', len(data))
# Find the WHERE m that was the problem
idx = data.rfind(b'WHERE m')
print('Last WHERE m at:', idx, '->', repr(data[idx:idx+30]))
# Find 'status' occurrences
idx2 = data.find("status = 'active'".encode())
print("First status='active' at:", idx2, '->', repr(data[idx2-20:idx2+30]))
idx3 = data.rfind("status = 'active'".encode())
print("Last status='active' at:", idx3, '->', repr(data[idx3-20:idx3+30]))
# Look for router.get('/summary
idx4 = data.find(b"router.get('/summary'")
print("router summary at:", idx4, '->', repr(data[idx4:idx4+50]))
