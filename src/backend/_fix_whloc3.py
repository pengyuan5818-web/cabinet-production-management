path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
content = open(path, encoding='utf-8').read()

# Find the function start and end indices
fn_start = content.find("router.post('/finished-locations'")
fn_end = content.find("router.delete('/finished-locations'")

if fn_start < 0 or fn_end < 0:
    print(f'ERROR: start={fn_start}, end={fn_end}')
else:
    old_fn = content[fn_start:fn_end]
    print(f'Found function, length={len(old_fn)}')
    print('First 200 chars:', repr(old_fn[:200]))
