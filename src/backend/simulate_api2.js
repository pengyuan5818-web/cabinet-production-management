// 先获取一个有效token，再测试API
process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const http = require('http');

const BASE = 'http://localhost:3000';

// Step 1: 登录获取token
function post(path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const body = JSON.stringify(data);
    const req = http.request({ method: 'POST', hostname: url.hostname, port: url.port, path: url.pathname,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        const token = res.headers['authorization'];
        try { resolve({ status: res.statusCode, body: JSON.parse(d), token }); }
        catch { resolve({ status: res.statusCode, body: d.slice(0,200), token }); }
      });
    });
    req.on('error', e => reject(e));
    req.write(body); req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = {};
    if (token) headers['Authorization'] = token;
    const req = http.request({ method: 'GET', hostname: url.hostname, port: url.port, path: url.pathname, headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d.slice(0, 200) }); }
      });
    });
    req.on('error', e => reject(e));
    req.end();
  });
}

async function main() {
  // Step 1: 登录（尝试几个常见的测试账号）
  console.log('=== 尝试登录 ===');
  const users = [
    { username: 'admin', password: 'admin' },
    { username: 'admin', password: '123456' },
    { username: 'system', password: 'system' },
  ];

  let token = null;
  for (const u of users) {
    try {
      const r = await post('/api/auth/login', u);
      console.log(`[${r.status}] POST /auth/login (${u.username}) =>`, JSON.stringify(r.body).slice(0,200));
      if (r.token && r.status === 200) { token = r.token; console.log('✅ 获取到token:', token.slice(0,50)); break; }
    } catch(e) { console.log(`ERR /auth/login: ${e.message}`); }
  }

  if (!token) {
    // 尝试不认证访问公开接口
    console.log('\n⚠️ 无法登录，测试公开接口...');
    const r = await get('/api/health');
    console.log(`[${r.status}] GET /api/health =>`, JSON.stringify(r.body).slice(0, 200));
    const r2 = await get('/api/system/config');
    console.log(`[${r2.status}] GET /api/system/config =>`, JSON.stringify(r2.body).slice(0, 200));
    process.exit(0);
  }

  // Step 2: 用token测试各API
  console.log('\n=== 测试认证API ===');
  const apis = [
    '/api/health',
    '/api/orders',
    '/api/dealers',
    '/api/production/stages',
    '/api/finance/customer-arrears',
    '/api/finance/dealer-arrears',
    '/api/finance/supplier-arrears',
    '/api/cost/report/detail',
    '/api/reports/production/scheduling',
  ];

  for (const path of apis) {
    try {
      const r = await get(path, token);
      const preview = typeof r.body === 'string' ? r.body : JSON.stringify(r.body).slice(0, 150);
      console.log(`[${r.status}] GET ${path} => ${preview}`);
    } catch(e) { console.log(`[ERR] GET ${path} => ${e.message}`); }
  }

  // Step 3: 创建订单
  console.log('\n=== 测试创建订单 ===');
  const r = await post('/api/orders', {
    customer_name: '测试客户_Bug诊断',
    customer_phone: '13900000001',
    address: '上海市静安区测试路1号',
    order_amount: 50000,
    priority: 'normal',
    expected_delivery: '2026-05-01'
  });
  console.log(`[${r.status}] POST /orders =>`, JSON.stringify(r.body).slice(0, 300));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
