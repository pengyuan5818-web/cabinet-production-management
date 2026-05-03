const http = require('http');

const BASE = 'http://localhost:3000';
let token = '';

function request(method, path, body, tok) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(tok ? { 'Authorization': `Bearer ${tok}` } : {})
      }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, method, fullPath, body, check) {
  try {
    const res = await request(method, fullPath, body, token);
    const ok = check ? check(res) : (res.status >= 200 && res.status < 300);
    const mark = ok ? '✅' : '❌';
    console.log(`${mark} [${res.status}] ${name}`);
    if (!ok) {
      const preview = typeof res.data === 'string' ? res.data : JSON.stringify(res.data || '').substring(0, 250);
      console.log(`   详情: ${preview}`);
    }
    return { name, ok, status: res.status, data: res.data };
  } catch (e) {
    console.log(`❌ [ERROR] ${name}: ${e.message}`);
    return { name, ok: false, error: e.message };
  }
}

async function main() {
  // 登录获取token
  const loginRes = await request('POST', '/api/auth/login', { username: 'testuser', password: 'test123' });
  if (loginRes.status === 200 && loginRes.data.token) {
    token = loginRes.data.token;
    console.log('✅ 登录成功, Token获取');
  } else {
    console.log('❌ 登录失败:', JSON.stringify(loginRes.data));
  }
  console.log('');

  const results = [];

  // === auth ===
  results.push(await test('登录测试', 'POST', '/api/auth/login', { username: 'testuser', password: 'test123' }, r => r.status === 200));

  // === customer ===
  console.log('\n--- 客户管理 ---');
  results.push(await test('客户列表', 'GET', '/api/customers/list', null, r => r.status === 200));
  results.push(await test('客户创建', 'POST', '/api/customers/', { customer_no: 'CTEST001', customer_name: '测试客户', province: '广东', city: '佛山' }, r => r.status === 200 || r.status === 201 || r.status === 400));
  results.push(await test('客户更新', 'PUT', '/api/customers/CTEST001', { customer_name: '测试客户v2' }, r => r.status === 200 || r.status === 404));

  // === supplier ===
  console.log('\n--- 供应商 ---');
  results.push(await test('供应商列表', 'GET', '/api/suppliers/list', null, r => r.status === 200));
  results.push(await test('供应商创建', 'POST', '/api/suppliers/', { supplier_code: 'STEST001', supplier_name: '测试供应商', province: '广东' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === order ===
  console.log('\n--- 订单 ---');
  results.push(await test('订单列表', 'GET', '/api/orders/list', null, r => r.status === 200));
  results.push(await test('订单创建', 'POST', '/api/orders/', { order_no: 'ORDTEST01', customer_id: '1', dealer_id: '1', total_amount: 10000 }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === quote ===
  console.log('\n--- 报价单 ---');
  results.push(await test('报价单列表', 'GET', '/api/quote/list', null, r => r.status === 200));
  results.push(await test('报价单创建', 'POST', '/api/quote/', { quote_no: 'QTEST01', customer_id: '1', total_amount: 5000 }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === receivable ===
  console.log('\n--- 应收款 ---');
  results.push(await test('应收款列表', 'GET', '/api/receivable/list', null, r => r.status === 200));

  // === purchase ===
  console.log('\n--- 采购 ---');
  results.push(await test('采购列表', 'GET', '/api/purchase/list', null, r => r.status === 200));
  results.push(await test('采购创建', 'POST', '/api/purchase/', { supplier_id: '1', total_amount: 2000 }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === warehouse ===
  console.log('\n--- 仓库 ---');
  results.push(await test('仓库列表', 'GET', '/api/warehouse/list', null, r => r.status === 200));
  results.push(await test('库存列表', 'GET', '/api/warehouse/stock/list', null, r => r.status === 200));

  // === finance ===
  console.log('\n--- 资金流水 ---');
  results.push(await test('资金流水列表', 'GET', '/api/finance/flow/list', null, r => r.status === 200));

  // === employee ===
  console.log('\n--- 员工 ---');
  results.push(await test('员工列表', 'GET', '/api/employees/list', null, r => r.status === 200));

  // === dealer ===
  console.log('\n--- 经销商 ---');
  results.push(await test('经销商列表', 'GET', '/api/dealers/list', null, r => r.status === 200));

  // === quality ===
  console.log('\n--- 质检管理 ---');
  results.push(await test('质检列表', 'GET', '/api/quality/list', null, r => r.status === 200));
  results.push(await test('质检标准', 'GET', '/api/quality/standards', null, r => r.status === 200));
  results.push(await test('质检创建', 'POST', '/api/quality/', { order_id: '1', inspect_type: 'online', result: 'pass', inspect_date: new Date().toISOString() }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === design ===
  console.log('\n--- 设计管理 ---');
  results.push(await test('设计列表', 'GET', '/api/design/list', null, r => r.status === 200));
  results.push(await test('设计创建', 'POST', '/api/design/', { order_id: '1', designer: '测试设计师' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === installation ===
  console.log('\n--- 安装管理 ---');
  results.push(await test('安装列表', 'GET', '/api/installation/list', null, r => r.status === 200));
  results.push(await test('安装创建', 'POST', '/api/installation/', { order_id: '1' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === production ===
  console.log('\n--- 生产流程 ---');
  results.push(await test('生产列表', 'GET', '/api/production/list', null, r => r.status === 200));
  results.push(await test('生产进度', 'GET', '/api/production/schedule/1', null, r => r.status === 200));
  results.push(await test('生产创建', 'POST', '/api/production/', { order_id: '1', stage: 'cutting' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === package ===
  console.log('\n--- 包装管理 ---');
  results.push(await test('包装列表', 'GET', '/api/package/list', null, r => r.status === 200));
  results.push(await test('包装创建', 'POST', '/api/package/', { order_id: '1', package_type: 'standard' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === shipment ===
  console.log('\n--- 发货管理 ---');
  results.push(await test('发货列表', 'GET', '/api/shipment/list', null, r => r.status === 200));
  results.push(await test('发货创建', 'POST', '/api/shipment/', { order_id: '1' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === payables ===
  console.log('\n--- 供应商付款 ---');
  results.push(await test('付款列表', 'GET', '/api/payables/list', null, r => r.status === 200));

  // === hardware ===
  console.log('\n--- 硬件管理 ---');
  results.push(await test('硬件列表', 'GET', '/api/hardware/list', null, r => r.status === 200));
  results.push(await test('硬件创建', 'POST', '/api/hardware/', { hardware_code: 'HWTEST01', hardware_name: '测试硬件' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === hardware driver ===
  console.log('\n--- 硬件驱动 ---');
  results.push(await test('驱动列表', 'GET', '/api/hardware/driver/list', null, r => r.status === 200));
  results.push(await test('驱动创建', 'POST', '/api/hardware/driver/', { driver_name: '测试驱动', version: '1.0' }, r => r.status === 200 || r.status === 201 || r.status === 400));

  // === exchange rate ===
  console.log('\n--- 汇率管理 ---');
  results.push(await test('汇率列表', 'GET', '/api/exchange-rates/', null, r => r.status === 200));
  results.push(await test('汇率换算', 'POST', '/api/exchange-rates/convert', { amount: 100, from: 'USD', to: 'CNY' }, r => r.status === 200));

  // === alpha ===
  console.log('\n--- Alpha对接 ---');
  results.push(await test('同步状态', 'GET', '/api/alpha/status', null, r => r.status === 200));
  results.push(await test('下载日志', 'GET', '/api/alpha/download-log', null, r => r.status === 200));

  // === cost ===
  console.log('\n--- 成本管理 ---');
  results.push(await test('成本汇总', 'GET', '/api/cost/summary/1', null, r => r.status === 200));
  results.push(await test('成本规则', 'GET', '/api/cost/rules', null, r => r.status === 200));

  // === system ===
  console.log('\n--- 系统配置 ---');
  results.push(await test('配置列表', 'GET', '/api/system/config/list', null, r => r.status === 200));

  // === upload ===
  console.log('\n--- 文件上传 ---');
  results.push(await test('上传测试', 'POST', '/api/upload/', { filename: 'test.txt', content: Buffer.from('test').toString('base64') }, r => r.status === 200 || r.status === 201));

  // === dashboard ===
  console.log('\n--- 仪表盘 ---');
  results.push(await test('仪表盘数据', 'GET', '/api/dashboard/stats', null, r => r.status === 200));

  // === report ===
  console.log('\n--- 报表 ---');
  results.push(await test('报表列表', 'GET', '/api/reports/list', null, r => r.status === 200));

  // === sort ===
  console.log('\n--- 分拣 ---');
  results.push(await test('分拣任务列表', 'GET', '/api/sort/tasks', null, r => r.status === 200));

  // 汇总
  console.log('\n\n=== 测试汇总 ===');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`通过: ${passed}  失败: ${failed}`);

  if (failed > 0) {
    console.log('\n失败项:');
    results.filter(r => !r.ok).forEach(r => {
      const detail = r.data ? (typeof r.data === 'string' ? r.data : JSON.stringify(r.data || '').substring(0, 200)) : r.error;
      console.log(`  ❌ ${r.name}: ${detail}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
