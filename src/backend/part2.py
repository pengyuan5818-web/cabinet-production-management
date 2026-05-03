import os

p = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'

# Read existing file to check where it ends
with open(p, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Current file: {len(content)} bytes, {len(content.splitlines())} lines')
print('Last 100 chars:', repr(content[-100:]))
