import subprocess, time, socket

def port_listening(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_backend():
    subprocess.Popen(
        ['node', 'index.js'],
        cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src',
        stdout=open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\backend_out.log','w'),
        stderr=subprocess.STDOUT
    )

def start_frontend():
    subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web',
        stdout=open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\frontend_out.log','w'),
        stderr=subprocess.STDOUT
    )

# Start backend
print("Starting backend...")
start_backend()
time.sleep(6)
print(f"Backend 3000: {'UP' if port_listening(3000) else 'DOWN'}")

# Start frontend
print("Starting frontend...")
start_frontend()
time.sleep(8)
print(f"Frontend 5174: {'UP' if port_listening(5174) else 'DOWN'}")
