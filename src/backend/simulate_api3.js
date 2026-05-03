process.chdir('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend');
const http = require('http');

const BASE = 'http://localhost:3000';
let TOKEN = null;

function req(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = token;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const u = new URL(BASE);
    const req = http.request({ method, hostname: u.hostname, port: u.port, path, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d.slice(0,300) }); }
      });
    });
    req.on('error', e => reject(e));
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: 登录
  const login = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  console.log('[LOGIN]', login.status, JSON.stringify(login.body).slice(0,200));
  const token = login.body.data?.token || login.body.token;
  if (token) {
    TOKEN = token;
    console.log('✅ Token:', TOKEN.slice(0, 50));
  } else { console.log('❌ 登录失败'); process.exit(1); }

  // Step 2: 测试各API
  const tests = [
    ['GET', '/api/health'],
    ['GET', '/api/orders'],
    ['GET', '/api/orders?page=1&pageSize=5'],
    ['GET', '/api/dealers'],
    ['GET', '/api/production/stages'],
    ['GET', '/api/finance/customer-arrears'],
    ['GET', '/api/finance/dealer-arrears'],
    ['GET', '/api/finance/supplier-arrears'],
    ['GET', '/api/cost/report/detail'],
    ['GET', '/api/cost/allocation/pool'],
    ['GET', '/api/reports/production/scheduling'],
    ['GET', '/api/system/config'],
    ['GET', '/api/dealers/commissions'],
    ['GET', '/api/dealers/openapi/keys'],
    ['GET', '/api/warehouse/materials'],
  ];

  console.log('\n=== API测试结果 ===');
  for (const [method, path] of tests) {
    try {
      const r = await req(method, path, null, TOKEN);
      const preview = typeof r.body === 'object' ? JSON.stringify(r.body).slice(0,120) : r.body;
      const ok = r.status >= 200 && r.status < 300 ? '✅' : r.status === 401 ? '🔒' : '⚠️';
      console.log(`${ok} [${r.status}] ${method} ${path}`);
      if (r.status >= 400 && r.status !== 401) console.log('   响应:', preview);
    } catch(e) { console.log(`❌ [ERR] ${method} ${path}: ${e.message}`); }
  }

  // Step 3: 创建订单测试
  console.log('\n=== 创建订单 ===');
  const r = await req('POST', '/api/orders', {
    customer_name: '测试客户_Bug',
    customer_phone: '13900000001',
    address: '上海市静安区测试路1号',
    order_amount: 50000,
    priority: 'normal',
    expected_delivery: '2026-05-01'
  }, TOKEN);
  console.log(`[${r.status}] POST /api/orders =>`, typeof r.body === 'object' ? JSON.stringify(r.body).slice(0,300) : r.body);

  // Step 4: 检查数据库关键数据
  console.log('\n=== 数据库状态 ===');
  const db = require('./src/db');
  const checks = [
    ['订单数', 'SELECT COUNT(*) as cnt FROM order_master'],
    ['生产阶段', 'SELECT COUNT(*) as cnt FROM production_stage'],
    ['dealer_commission', 'SELECT COUNT(*) as cnt FROM dealer_commission'],
    ['production_schedule', 'SELECT COUNT(*) as cnt FROM production_schedule'],
    ['cost_record', 'SELECT COUNT(*) as cnt FROM cost_record'],
    ['webhook', 'SELECT id, dealer_id, url, events FROM webhook LIMIT 3'],
  ];
  for (const [name, sql] of checks) {
    try {
      const res = await db.query(sql);
      console.log(`  ${name}:`, JSON.stringify(res.rows));
    } catch(e) { console.log(`  ❌ ${name}: ${e.message}`); }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
