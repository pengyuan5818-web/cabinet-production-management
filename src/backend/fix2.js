const http = require('http');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

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
    const preview = typeof res.d === 'string' ? res.d : JSON.stringify(res.d || '').substring(0, 300);
    console.log(`   详情: ${preview}`);
  }
  return { name, ok, s: res.s, d: res.d };
}

async function main() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/cabinet_factory' });

  // Get real order UUID
  const orders = await pool.query(`SELECT id, order_no FROM order_master LIMIT 1`);
  const realOrderId = orders.rows[0]?.id || null;
  console.log('真实订单ID:', orders.rows[0]?.order_no, realOrderId);
  await pool.end();

  // Generate token
  const pool2 = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/cabinet_factory' });
  const users = await pool2.query(`SELECT id, username, role FROM sys_user WHERE username='admin' LIMIT 1`);
  global.token = jwt.sign({ userId: users.rows[0].id, username: 'admin', type: 'system' }, JWT_SECRET, { expiresIn: '30d' });
  await pool2.end();

  const results = [];
  const passedAll = [];

  // === 基础模块 ===
  console.log('\n========== 基础模块 ==========');

  console.log('\n--- 客户管理 ---');
  results.push(await test('客户列表', 'GET', '/api/customers/', null));
  results.push(await test('客户创建', 'POST', '/api/customers/', { customer_no: 'CT001', customer_name: '测试客户', province: '广东', city: '佛山' }));

  console.log('\n--- 供应商 ---');
  results.push(await test('供应商列表', 'GET', '/api/suppliers/', null));
  results.push(await test('供应商创建', 'POST', '/api/suppliers/', { supplier_code: 'ST001', supplier_name: '测试供应商' }));

  console.log('\n--- 订单 ---');
  results.push(await test('订单列表', 'GET', '/api/orders/', null));
  results.push(await test('订单创建', 'POST', '/api/orders/', { order_no: 'ORDTEST01', total_amount: 10000 }));

  console.log('\n--- 报价单 ---');
  results.push(await test('报价单列表', 'GET', '/api/quote/', null));
  results.push(await test('报价单创建', 'POST', '/api/quote/', { quote_no: 'QTEST01', total_amount: 5000 }));

  console.log('\n--- 应收款 ---');
  results.push(await test('应收款列表', 'GET', '/api/receivable/', null));

  console.log('\n--- 采购 ---');
  results.push(await test('采购订单列表', 'GET', '/api/purchase/orders', null));
  results.push(await test('采购建议', 'GET', '/api/purchase/suggestions', null));
  results.push(await test('生成采购建议', 'POST', '/api/purchase/suggestions/generate', {}));

  console.log('\n--- 仓库 ---');
  results.push(await test('仓库列表', 'GET', '/api/warehouse/warehouses', null));
  results.push(await test('库位列表', 'GET', '/api/warehouse/locations', null));
  results.push(await test('库存汇总', 'GET', '/api/warehouse/inventory', null));
  results.push(await test('库存记录', 'GET', '/api/warehouse/stock-records', null));

  console.log('\n--- 资金流水 ---');
  results.push(await test('资金流水', 'GET', '/api/finance/fund-flow', null));
  results.push(await test('应收应付汇总', 'GET', '/api/finance/summary', null));

  console.log('\n--- 员工 ---');
  results.push(await test('员工列表', 'GET', '/api/employees/', null));

  console.log('\n--- 经销商 ---');
  results.push(await test('经销商列表', 'GET', '/api/dealers/', null));

  // === 生产流程 ===
  console.log('\n========== 生产流程 ==========');
  results.push(await test('生产阶段列表', 'GET', '/api/production/stages', null));
  results.push(await test('生产看板', 'GET', '/api/production/board', null));
  results.push(await test('生产看板(BOARD)', 'GET', '/api/production/boards', null));
  if (realOrderId) {
    results.push(await test('生产跟踪(真实订单)', 'GET', `/api/production/track/${realOrderId}`, null));
    results.push(await test('生产排期(真实订单)', 'GET', `/api/production/schedule/${realOrderId}`, null));
  } else {
    results.push(await test('生产跟踪', 'GET', '/api/production/pending', null));
    results.push(await test('生产排期日历', 'GET', '/api/production/schedule/calendar', null));
    results.push(await test('生产统计', 'GET', '/api/production/schedule/stats', null));
  }

  // === 设计管理 ===
  console.log('\n========== 设计管理 ==========');
  results.push(await test('设计图纸列表', 'GET', '/api/design/drawings', null));
  results.push(await test('待审核设计', 'GET', '/api/design/pending', null));
  if (realOrderId) {
    results.push(await test('设计BOM(真实订单)', 'GET', `/api/design/bom/${realOrderId}`, null));
  }

  // === 安装管理 ===
  console.log('\n========== 安装管理 ==========');
  results.push(await test('安装列表', 'GET', '/api/installation/', null));

  // === 质检管理 ===
  console.log('\n========== 质检管理 ==========');
  results.push(await test('质检列表', 'GET', '/api/quality/list', null));
  results.push(await test('质检标准', 'GET', '/api/quality/standards', null));

  // === 包装/发货 ===
  console.log('\n========== 包装/发货 ==========');
  results.push(await test('包装列表', 'GET', '/api/package/', null));
  results.push(await test('发货列表', 'GET', '/api/shipment/', null));

  // === 供应商付款 ===
  console.log('\n========== 供应商付款 ==========');
  results.push(await test('付款列表', 'GET', '/api/payables/', null));

  // === 硬件管理 ===
  console.log('\n========== 硬件管理 ==========');
  results.push(await test('硬件状态', 'GET', '/api/hardware/status', null));
  results.push(await test('硬件端口', 'GET', '/api/hardware/ports', null));
  results.push(await test('硬件扫描', 'POST', '/api/hardware/scan', { barcode: 'TEST001' }));
  results.push(await test('硬件语音', 'POST', '/api/hardware/voice', { text: '测试语音' }));
  results.push(await test('打印标签', 'POST', '/api/hardware/print/board', { board_no: 'B001' }));

  // === 硬件驱动 ===
  console.log('\n========== 硬件驱动 ==========');
  results.push(await test('驱动端口', 'GET', '/api/hardware/driver/ports', null));
  results.push(await test('驱动扫描开始', 'POST', '/api/hardware/driver/scan/start', {}));
  results.push(await(test('驱动扫描停止', 'POST', '/api/hardware/driver/scan/stop', {})));
  results.push(await test('驱动扫描状态', 'GET', '/api/hardware/driver/scan/status', null));
  results.push(await test('语音列表', 'GET', '/api/hardware/driver/voice/voices', null));
  results.push(await test('语音测试', 'POST', '/api/hardware/driver/voice/test', { text: '测试' }));

  // === 汇率管理 ===
  console.log('\n========== 汇率管理 ==========');
  results.push(await test('汇率列表', 'GET', '/api/exchange-rates/', null));

  // === Alpha对接 ===
  console.log('\n========== Alpha对接 ==========');
  results.push(await test('导入列表', 'GET', '/api/alpha/imports', null));
  if (realOrderId) {
    results.push(await test('板件列表(真实订单)', 'GET', `/api/alpha/boards/${realOrderId}`, null));
  }

  // === 成本管理 ===
  console.log('\n========== 成本管理 ==========');
  results.push(await test('成本明细', 'GET', '/api/cost/report/detail', null));
  results.push(await test('月汇总', 'GET', '/api/cost/report/monthly-summary', null));
  results.push(await test('成本规则', 'GET', '/api/cost/allocation-rules', null));
  results.push(await test('工时列表', 'GET', '/api/cost/work-hours', null));

  // === 仪表盘 ===
  console.log('\n========== 仪表盘 ==========');
  results.push(await test('仪表盘概要', 'GET', '/api/dashboard/summary', null));
  results.push(await test('生产进度', 'GET', '/api/dashboard/production-progress', null));
  results.push(await test('订单趋势', 'GET', '/api/dashboard/order-trend', null));

  // === 报表 ===
  console.log('\n========== 报表 ==========');
  results.push(await test('生产日报', 'GET', '/api/reports/production/daily', null));
  results.push(await test('生产汇总', 'GET', '/api/reports/production/summary', null));
  results.push(await test('销售汇总', 'GET', '/api/reports/sales/summary', null));
  results.push(await test('库存报表', 'GET', '/api/reports/inventory/current', null));
  results.push(await test('财务报表', 'GET', '/api/reports/finance/summary', null));

  // === 系统配置 ===
  console.log('\n========== 系统配置 ==========');
  results.push(await test('配置列表', 'GET', '/api/system/config/', null));

  // === 分拣 ===
  console.log('\n========== 分拣 ==========');
  results.push(await test('分拣任务', 'GET', '/api/sort/tasks', null));

  // 汇总
  console.log('\n\n========================================');
  console.log('              测试汇总');
  console.log('========================================');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`通过: ${passed}  失败: ${failed}  总计: ${results.length}`);

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
