// 模拟API调用测试
process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const http = require('http');

const BASE = 'http://localhost:3000/api';

function api(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname };
    let body = null;
    if (data) { body = JSON.stringify(data); opts.headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }; }
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d.slice(0, 300) }); }
      });
    });
    req.on('error', e => reject({ error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const tests = [
    ['GET', '/system/config'],
    ['GET', '/orders'],
    ['GET', '/dealers'],
    ['GET', '/production/stages'],
    ['GET', '/finance/customer-arrears'],
    ['GET', '/finance/dealer-arrears'],
    ['GET', '/finance/supplier-arrears'],
    ['GET', '/cost/report/detail'],
  ];

  for (const [method, path] of tests) {
    try {
      const r = await api(method, path);
      const preview = typeof r.body === 'string' ? r.body : JSON.stringify(r.body).slice(0, 150);
      console.log(`[${r.status}] ${method} ${path} => ${preview}`);
    } catch(e) {
      console.log(`[ERR] ${method} ${path} => ${JSON.stringify(e)}`);
    }
  }

  // 测试创建订单
  console.log('\n--- 创建测试订单 ---');
  try {
    const r = await api('POST', '/orders', {
      customer_name: '测试客户_Bug诊断',
      customer_phone: '13900000001',
      address: '上海市静安区测试路1号',
      order_amount: 50000,
      priority: 'normal',
      expected_delivery: '2026-05-01'
    });
    console.log(`[${r.status}] POST /orders =>`, JSON.stringify(r.body).slice(0, 300));
  } catch(e) { console.log('[ERR] POST /orders =>', e); }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
