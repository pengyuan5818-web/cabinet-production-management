import subprocess, socket

def port_listening(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    except: return False

def check_port(port):
    listening = port_listening(port)
    print(f"  Port {port}: {'LISTENING' if listening else 'DOWN'}")

print("=== Port Status ===")
for p in [3000, 5173, 5174]:
    check_port(p)

print("\n=== Node Processes ===")
try:
    result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV', '/NH'], 
                          capture_output=True, text=True, timeout=5)
    print(result.stdout or result.stderr)
except Exception as e:
    print(f"Error: {e}")

print("\n=== Cpolar Processes ===")
try:
    result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq cpolar*', '/FO', 'CSV', '/NH'], 
                          capture_output=True, text=True, timeout=5)
    print(result.stdout or result.stderr)
except:
    pass
