import subprocess

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
print(r.stderr.split('\n')[0] if r.stderr else 'OK')
print(r.returncode)
