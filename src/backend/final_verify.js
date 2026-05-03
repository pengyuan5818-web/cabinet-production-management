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
        catch { resolve({ status: res.statusCode, body: d.slice(0,200) }); }
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

  const tests = [
    ['POST', '/api/production/schedule/generate', null, 'Bug#1 排程生成'],
    ['GET',  '/api/cost/report/detail', null, 'Bug#2 成本明细'],
    ['GET',  '/api/cost/allocation/pool', null, 'Bug#4 费用池路径'],
    ['GET',  '/api/reports/production/scheduling', null, 'Bug#5 排程报表路径'],
    ['GET',  '/api/dealers/commissions', null, 'Bug#6 佣金列表路径'],
    ['POST', '/api/cost/calculate/batch', {order_ids:[]}, 'Bug#8 批量计算'],
    ['GET',  '/api/orders', null, '健康检查'],
  ];

  console.log('=== 最终验证 ===');
  for (const [method, path, data, label] of tests) {
    const r = await req(method, path, data);
    const icon = r.status >= 200 && r.status < 300 ? 'PASS' : r.status === 404 ? '404' : 'FAIL';
    const msg = typeof r.body === 'object' ? (r.body.message || r.body.error || 'OK') : r.body;
    console.log(icon + ' [' + r.status + '] ' + label + ': ' + path);
    if (r.status >= 400) console.log('     ERR: ' + msg);
  }
  process.exit(0);
}
main().catch(function(e) { console.error(e.message); process.exit(1); });
