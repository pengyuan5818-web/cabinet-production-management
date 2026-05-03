path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
content = open(path, encoding='utf-8').read()

sigs = [
    "router.post('/finished-locations'",
    'router.post("/finished-locations"',
    "router.delete('/finished-locations'",
    'router.delete("/finished-locations"',
]

for sig in s

igs:
    idx = content.find(sig)
    print(repr(sig), '->', idx)
