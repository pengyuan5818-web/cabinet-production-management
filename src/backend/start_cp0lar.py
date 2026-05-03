import subprocess, time, os

auth = 'YjVjYjJmNTQtNzNhYS00MDQxLTk0MmMtYmE0Nzg1ZWJjOWQ3'
config = r'C:\Users\Administrator\.cpolar\cpolar.yml'

env = os.environ.copy()

# Start backend tunnel (port 3000) on reserved TCP address
be_proc = subprocess.Popen(
    [r'C:\Program Files\cpolar\cpolar.exe', 'tcp',
     '--config', config,
     '--region', 'cn',
     '--remote-addr', '17.tcp.vip.cpolar.cn:11873',
     '3000'],
    cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend',
    stdout=open('cpolar_backend.log', 'w'),
    stderr=subprocess.STDOUT,
    env=env
)
print(f'Backend cpolar PID={be_proc.pid} on 17.tcp.vip.cpolar.cn:11873 -> localhost:3000')

time.sleep(2)

# Start frontend tunnel (port 5173) on reserved TCP address
fe_proc = subprocess.Popen(
    [r'C:\Program Files\cpolar\cpolar.exe', 'tcp',
     '--config', config,
     '--region', 'cn',
     '--remote-addr', '22.tcp.vip.cpolar.cn:14357',
     '5173'],
    cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend',
    stdout=open('cpolar_frontend.log', 'w'),
    stderr=subprocess.STDOUT,
    env=env
)
print(f'Frontend cpolar PID={fe_proc.pid} on 22.tcp.vip.cpolar.cn:14357 -> localhost:5173')

time.sleep(8)

# Check if they're still running
print(f'\nBackend cpolar alive: {be_proc.poll() is None}')
print(f'Frontend cpolar alive: {fe_proc.poll() is None}')

# Show logs
for name, proc in [('Backend', be_proc), ('Frontend', fe_proc)]:
    print(f'\n=== {name} cpolar log ===')
    logfile = f'cpolar_{name.lower()}.log'
    try:
        with open(logfile) as f:
            content = f.read()
            print(content[:800] or '(empty)')
    except:
        print(f'(no log file)')
