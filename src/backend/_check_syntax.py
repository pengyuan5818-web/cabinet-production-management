import subprocess, sys, os

js_path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(js_path, encoding='utf-8').read()
lines = content.splitlines()
opens = content.count('{')
closes = content.count('}')
print(f'Lines: {len(lines)}')
print(f'Brace: open={opens} close={closes} diff={opens-closes}')

# Show last 5 lines
print('Last 5 lines:')
for l in lines[-5:]:
    print(repr(l))

result = subprocess.run(['node','--check', js_path], capture_output=True, text=True)
print('Syntax check result:')
print(result.stdout)
print(result.stderr[:500] if result.stderr else 'OK')
print('Return code:', result.returncode)
