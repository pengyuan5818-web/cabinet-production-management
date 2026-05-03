path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8', errors='replace').read()

# Fix 1: change host from 10.60.209.202 to localhost
content = content.replace("host: process.env.DB_HOST || '10.60.209.202',", "host: process.env.DB_HOST || 'localhost',")

# Fix 2: change password from 87030785 to postgres
content = content.replace("password: process.env.DB_PASS || '87030785',", "password: process.env.DB_PASSWORD || 'postgres',")

open(path, 'w', encoding='utf-8').write(content)
print('Done')

import subprocess
r = subprocess.run(['node', '--check', path], capture_output=True)
print('Syntax:', r.stderr.decode('utf-8', errors='replace')[:200] if r.stderr else 'OK')
print('Code:', r.returncode)

# Show the pool config
for i, line in enumerate(content.split('\n')[3:15]):
    print(f'{i+3}: {line}')
