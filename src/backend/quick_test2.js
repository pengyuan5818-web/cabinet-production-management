const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'cabinet-factory-dev-key-2026';
const BASE = 'http://localhost:3000';

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
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

async function test(name, method, path, body, check) {
  const res = await req(method, path, body, global.token);
  const ok = check ? check(res) : (res.s >= 200 && res.s < 300);
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} [${res.s}] ${name}`);
  if (!ok) {
    const preview = typeof res.d === 'string' ? res.d : JSON.stringify(res.d || '').substring(0, 250);
    console.log(`   详情: ${preview}`);
  }
  return { name, ok, s: res.s, d: res.d };
}

async function main() {
  // Generate token for admin
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/cabinet_factory' });
  const users = await pool.query(`SELECT id, username, role FROM sys_user WHERE username='admin' LIMIT 1`);
  const user = users.rows[0];
  global.token = jwt.sign({ userId: user.id, username: user.username, type: 'system' }, JWT_SECRET, { expiresIn: '30d' });
  console.log('Token ready');
  await pool.end();

  const results = [];

  // === auth ===
  results.push(await test('登录', 'POST', '/api/auth/login', { username: 'admin', password: 'admin' }, r => r.s === 200));

  // === customer (正确路径: /)
  console.log('\n--- 客户管理 ---');
  results.push(await test('客户列表(GET /)', 'GET', '/api/customers/', null, r => r.s === 200));
  results.push(await test('客户创建(POST /)', 'POST', '/api/customers/', { customer_no: 'CT001', customer_name: '测试客户', province: '广东' }, r => r.s === 200 || r.s === 201));

  // === supplier ===
  console.log('\n--- 供应商 ---');
  results.push(await test('供应商列表', 'GET', '/api/suppliers/', null, r => r.s === 200));

  // === order ===
  console.log('\n--- 订单 ---');
  results.push(await test('订单列表', 'GET', '/api/orders/', null, r => r.s === 200));

  // === quote ===
  console.log('\n--- 报价单 ---');
  results.push(await test('报价单列表', 'GET', '/api/quote/', null, r => r.s === 200));

  // === receivable ===
  console.log('\n--- 应收款 ---');
  results.push(await test('应收款列表', 'GET', '/api/receivable/', null, r => r.s === 200));

  // === purchase ===
  console.log('\n--- 采购 ---');
  results.push(await test('采购列表', 'GET', '/api/purchase/', null, r => r.s === 200));

  // === warehouse ===
  console.log('\n--- 仓库 ---');
  results.push(await test('仓库列表', 'GET', '/api/warehouse/', null, r => r.s === 200));

  // === finance ===
  console.log('\n--- 资金流水 ---');
  results.push(await test('资金流水列表', 'GET', '/api/finance/flow/', null, r => r.s === 200));

  // === employee ===
  console.log('\n--- 员工 ---');
  results.push(await test('员工列表', 'GET', '/api/employees/', null, r => r.s === 200));

  // === dealer ===
  console.log('\n--- 经销商 ---');
  results.push(await test('经销商列表', 'GET', '/api/dealers/', null, r => r.s === 200));

  // === quality ===
  console.log('\n--- 质检管理 ---');
  results.push(await test('质检列表', 'GET', '/api/quality/', null, r => r.s === 200));
  results.push(await test('质检标准', 'GET', '/api/quality/standards', null, r => r.s === 200));

  // === design ===
  console.log('\n--- 设计管理 ---');
  results.push(await test('设计列表', 'GET', '/api/design/', null, r => r.s === 200));

  // === installation ===
  console.log('\n--- 安装管理 ---');
  results.push(await test('安装列表', 'GET', '/api/installation/', null, r => r.s === 200));

  // === production ===
  console.log('\n--- 生产流程 ---');
  results.push(await test('生产列表', 'GET', '/api/production/', null, r => r.s === 200));

  // === package ===
  console.log('\n--- 包装管理 ---');
  results.push(await test('包装列表', 'GET', '/api/package/', null, r => r.s === 200));

  // === shipment ===
  console.log('\n--- 发货管理 ---');
  results.push(await test('发货列表', 'GET', '/api/shipment/', null, r => r.s === 200));

  // === payables ===
  console.log('\n--- 供应商付款 ---');
  results.push(await test('付款列表', 'GET', '/api/payables/', null, r => r.s === 200));

  // === hardware ===
  console.log('\n--- 硬件管理 ---');
  results.push(await test('硬件列表', 'GET', '/api/hardware/', null, r => r.s === 200));

  // === hardware driver ===
  console.log('\n--- 硬件驱动 ---');
  results.push(await test('驱动列表', 'GET', '/api/hardware/driver/', null, r => r.s === 200));

  // === exchange rate ===
  console.log('\n--- 汇率管理 ---');
  results.push(await test('汇率列表', 'GET', '/api/exchange-rates/', null, r => r.s === 200));

  // === alpha ===
  console.log('\n--- Alpha对接 ---');
  results.push(await test('同步状态', 'GET', '/api/alpha/status', null, r => r.s === 200));

  // === cost ===
  console.log('\n--- 成本管理 ---');
  results.push(await test('成本规则', 'GET', '/api/cost/rules', null, r => r.s === 200));

  // === system ===
  console.log('\n--- 系统配置 ---');
  results.push(await test('配置列表', 'GET', '/api/system/config/', null, r => r.s === 200));

  // === dashboard ===
  console.log('\n--- 仪表盘 ---');
  results.push(await test('仪表盘', 'GET', '/api/dashboard/stats', null, r => r.s === 200));

  // === report ===
  console.log('\n--- 报表 ---');
  results.push(await test('报表列表', 'GET', '/api/reports/', null, r => r.s === 200));

  // === sort ===
  console.log('\n--- 分拣 ---');
  results.push(await test('分拣任务', 'GET', '/api/sort/tasks', null, r => r.s === 200));

  // 汇总
  console.log('\n\n=== 汇总 ===');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`通过: ${passed}  失败: ${failed}`);
  if (failed > 0) {
    console.log('\n失败项:');
    results.filter(r => !r.ok).forEach(r => {
      const detail = typeof r.d === 'string' ? r.d : JSON.stringify(r.d || '').substring(0, 200);
      console.log(`  ❌ ${r.name} [${r.s}]: ${detail}`);
    });
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
