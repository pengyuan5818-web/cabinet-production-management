import subprocess, time, socket, os

def port_listening(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

# Use cmd /c to run the npm script
subprocess.Popen(
    ['cmd', '/c', 'npm', 'run', 'dev'],
    cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web',
    stdout=open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\frontend_out.log','w'),
    stderr=subprocess.STDOUT,
    env={**os.environ, 'CHOKIDAR_USEPOLLING': '1'}
)
print("Frontend starting via npm run dev...")
time.sleep(10)
print(f"Frontend 5174: {'UP' if port_listening(5174) else 'DOWN'}")
