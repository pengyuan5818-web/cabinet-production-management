const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(path, 'http://localhost:3000');
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, d: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, d }); } });
    });
    r.on('error', e => resolve({ s: 0, d: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // Login
  const login = await req('POST', '/api/auth/login', { username: 'testuser', password: 'test123' });
  const token = login.d?.data?.token;
  console.log('login:', login.s, token ? 'token ok' : 'no token');
  
  if (!token) { console.log('no token, exit'); return; }

  // Test customer list
  const cust = await req('GET', '/api/customers/list', null, token);
  console.log('customer list:', cust.s, JSON.stringify(cust.d || '').substring(0, 200));

  // Test quality list
  const qual = await req('GET', '/api/quality/list', null, token);
  console.log('quality list:', qual.s, JSON.stringify(qual.d || '').substring(0, 200));
}

main().catch(console.error);
