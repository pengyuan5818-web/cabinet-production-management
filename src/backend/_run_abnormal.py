import subprocess, sys

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
print('Running abnormal test...')
r = subprocess.run(['node', path], capture_output=True, timeout=120)
stdout = r.stdout.decode('utf-8', errors='replace')
stderr = r.stderr.decode('utf-8', errors='replace')
print('=== STDOUT ===')
for line in stdout.split('\n'):
    print(line)
if stderr:
    print('\n=== STDERR ===')
    for line in stderr.split('\n')[:15]:
        print(line)
print('\nReturn code:', r.returncode)
