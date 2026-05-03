import http.client
import json

conn = http.client.HTTPConnection('localhost', 3000)
body = json.dumps({'username': 'admin', 'password': 'admin123'})
headers = {'Content-Type': 'application/json', 'Content-Length': len(body)}
conn.request('POST', '/api/auth/login', body, headers)
resp = conn.getresponse()
print('Status:', resp.status)
print('Headers:', dict(resp.getheaders()))
data = resp.read().decode('utf-8')
print('Body:', data[:500])
conn.close()
