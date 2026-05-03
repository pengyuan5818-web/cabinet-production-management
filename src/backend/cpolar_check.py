import subprocess

def runcmd(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, shell=True)
    return result.stdout + result.stderr

# Check cpolar tunnels
print("=== cpolar processes ===")
print(runcmd('tasklist /FI "IMAGENAME eq cpolar.exe" /FO CSV /NH'))

print("\n=== TCP connections on tunnels ===")
out = runcmd('netstat -ano')
lines = [l for l in out.split('\n') if 'LISTENING' in l and ('11873' in l or '14357' in l)]
for l in lines[:10]:
    print(l)

print("\n=== All listening ports ===")
out = runcmd('netstat -ano')
lines = [l for l in out.split('\n') if 'LISTENING' in l]
for l in lines:
    if any(str(p) in l for p in [3000,5173,5174,5175,8080,8000,80,443]):
        print(l)
