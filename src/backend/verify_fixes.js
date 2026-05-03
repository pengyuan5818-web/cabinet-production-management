process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const http = require('http');
const u = new URL('http://localhost:3000');
const fs = require('fs');
let TOKEN = null;

function req(method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = http.request({ method, hostname: u.hostname, port: u.port, path, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d.slice(0,300) }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const login = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  TOKEN = login.body.data && login.body.data.token ? login.body.data.token : login.body.token;
  console.log('Login:', TOKEN ? 'OK' : 'FAIL');

  // Bug#8 修复验证：batch 路由
  const r1 = await req('POST', '/api/cost/calculate/batch', { order_ids: [] });
  const tag1 = r1.status === 400 ? 'FIXED(400)' : r1.status === 500 ? 'STILL 500' : r1.status;
  console.log('Bug#8 /cost/calculate/batch:', tag1, JSON.stringify(r1.body).slice(0,100));

  // Bug#9 修复验证：EVENT_TYPES
  const ws = fs.readFileSync('src/services/webhookService.js', 'utf8');
  console.log('Bug#9 commission.created in EVENT_TYPES:', ws.includes("'commission.created'") ? 'YES' : 'NO');

  // Bug#9 验证：commissionService 触发 commission.created
  const cs = fs.readFileSync('src/services/commissionService.js', 'utf8');
  console.log('Bug#9 autoGenerate triggers commission.created:', cs.includes("'commission.created'") ? 'YES' : 'NO');
  console.log('Bug#9 settle triggers commission.settled:', cs.includes("'commission.settled'") ? 'YES' : 'NO');

  process.exit(0);
}
main().catch(function(e) { console.error(e.message); process.exit(1); });
