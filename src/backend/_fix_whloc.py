path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
content = open(path, encoding='utf-8').read()

# Fix: VALUES has 4 params but 7 columns - add $5 and $6 for zone and status
old = "VALUES ($1, $2, $3, $4, 'A区', 'empty', NOW()) RETURNING *`,\n      [uuidv4(), finishedWhId, String(nextCode), location_name]"

new = "VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,\n      [uuidv4(), finishedWhId, String(nextCode), location_name, 'A区', 'empty']"

if old in content:
    content = content.replace(old, new)
    open(path, 'w', encoding='utf-8').write(content)
    print('Fixed: warehouse_location INSERT params')
else:
    print('WARNING: pattern not found')
    idx = content.find("VALUES ($1, $2, $3, $4, 'A")
    if idx >= 0:
        print('Found at idx', idx, ':', repr(content[idx:idx+200]))
