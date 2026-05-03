import glob, os

backend = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes'
for f in os.listdir(backend):
    if not f.endswith('.js'):
        continue
    fp = open(os.path.join(backend, f), 'r', encoding='utf-8', errors='ignore')
    content = fp.read()
    fp.close()
    for line in content.split('\n'):
        s = line.strip()
        if 'dashboard/orders' in s or 'dashboard/production' in s or "'production/board'" in s or '"production/board"' in s:
            print(f, ':', s[:80])
