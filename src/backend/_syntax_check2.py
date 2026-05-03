import subprocess, sys

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
r = subprocess.run(['node', '--check', path], capture_output=True)
stdout = r.stdout.decode('utf-8', errors='replace')
stderr = r.stderr.decode('utf-8', errors='replace')
print('STDOUT:', stdout[:200])
print('STDERR:', stderr[:500])
print('Return code:', r.returncode)
