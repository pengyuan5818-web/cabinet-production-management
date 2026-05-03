const http = require('http');

const BASE = 'http://localhost:3000/api';
const results = [];

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testModule(name, tests) {
  console.log(`\n=== ${name} ===`);
  for (const [label, method, path, body, check] of tests) {
    try {
      const res = await request(method, path, body);
      const ok = check ? check(res) : (res.status >= 200 && res.status < 300);
      const mark = ok ? '✅' : '❌';
      console.log(`${mark} [${res.status}] ${label}`);
      if (!ok) {
        console.log(`   详情:`, JSON.stringify(res.data).substring(0, 200));
      }
      results.push({ module: name, test: label, ok, status: res.status, detail: res.data });
    } catch (e) {
      console.log(`❌ [ERROR] ${label}: ${e.message}`);
      results.push({ module: name, test: label, ok: false, error: e.message });
    }
    // 间隔一下避免雪崩
    await new Promise(r => setTimeout(r, 100));
  }
}

async function getToken() {
  // 尝试登录获取 token
  try {
    const res = await request('POST', '/auth/login', { username: 'admin', password: 'admin' });
    if (res.status === 200 && res.data.token) return res.data.token;
  } catch {}
  return '';
}

async function main() {
  const token = await getToken();
  console.log(`Token: ${token ? '获取成功' : '无'}`);

  // 1. 客户管理
  await testModule('客户管理', [
    ['客户创建', 'POST', '/customer/', { customer_no: 'C001', customer_name: '测试客户', province: '广东', city: '佛山' }],
    ['客户列表', 'GET', '/customer/list'],
    ['客户详情', 'GET', '/customer/1'],
  ]);

  // 2. 供应商
  await testModule('供应商', [
    ['供应商创建', 'POST', '/supplier/', { supplier_code: 'S001', supplier_name: '测试供应商', province: '广东' }],
    ['供应商列表', 'GET', '/supplier/list'],
  ]);

  // 3. 订单
  await testModule('订单', [
    ['订单创建', 'POST', '/order/', { order_no: 'ORD001', customer_id: '1', dealer_id: '1', total_amount: 10000 }],
    ['订单列表', 'GET', '/order/list'],
    ['订单详情', 'GET', '/order/1'],
  ]);

  // 4. 报价单
  await testModule('报价单', [
    ['报价单创建', 'POST', '/quote/', { quote_no: 'Q001', customer_id: '1', total_amount: 5000 }],
    ['报价单列表', 'GET', '/quote/list'],
  ]);

  // 5. 应收款
  await testModule('应收款', [
    ['应收款创建', 'POST', '/receivable/', { order_id: '1', dealer_id: '1', amount: 5000, currency: 'CNY' }],
    ['应收款列表', 'GET', '/receivable/list'],
  ]);

  // 6. 采购
  await testModule('采购', [
    ['采购单创建', 'POST', '/purchase/', { supplier_id: '1', total_amount: 2000 }],
    ['采购单列表', 'GET', '/purchase/list'],
  ]);

  // 7. 物料
  await testModule('物料', [
    ['物料创建', 'POST', '/material/', { material_code: 'M001', material_name: '测试物料', unit: 'pcs' }],
    ['物料列表', 'GET', '/material/list'],
  ]);

  // 8. 仓库
  await testModule('仓库', [
    ['仓库创建', 'POST', '/warehouse/', { warehouse_code: 'WH001', warehouse_name: '测试仓库' }],
    ['仓库列表', 'GET', '/warehouse/list'],
  ]);

  // 9. 库存
  await testModule('库存', [
    ['库存创建', 'POST', '/warehouse/stock', { material_id: '1', warehouse_id: '1', quantity: 100 }],
    ['库存列表', 'GET', '/warehouse/stock/list'],
  ]);

  // 10. 资金流水
  await testModule('资金流水', [
    ['资金流水创建', 'POST', '/finance/flow', { flow_type: 'income', amount: 1000, currency: 'CNY' }],
    ['资金流水列表', 'GET', '/finance/flow/list'],
  ]);

  // 11. 员工
  await testModule('员工', [
    ['员工创建', 'POST', '/employee/', { employee_code: 'E001', employee_name: '测试员工', gender: '男', phone: '13800000000' }],
    ['员工列表', 'GET', '/employee/list'],
  ]);

  // 12. 经销商
  await testModule('经销商', [
    ['经销商创建', 'POST', '/dealer/', { dealer_code: 'D001', dealer_name: '测试经销商', province: '广东' }],
    ['经销商列表', 'GET', '/dealer/list'],
  ]);

  // 13. 质检(quality)
  await testModule('质检管理', [
    ['质检创建', 'POST', '/quality/', { order_id: '1', inspect_type: 'online', result: 'pass', inspect_date: new Date().toISOString() }],
    ['质检列表', 'GET', '/quality/list'],
    ['质检标准', 'GET', '/quality/standards'],
  ]);

  // 14. 设计
  await testModule('设计管理', [
    ['设计创建', 'POST', '/design/', { order_id: '1', designer: '测试设计师' }],
    ['设计列表', 'GET', '/design/list'],
  ]);

  // 15. 安装
  await testModule('安装管理', [
    ['安装任务创建', 'POST', '/installation/', { order_id: '1' }],
    ['安装列表', 'GET', '/installation/list'],
  ]);

  // 16. 生产流程
  await testModule('生产流程', [
    ['生产进度创建', 'POST', '/production/', { order_id: '1', stage: 'cutting' }],
    ['生产列表', 'GET', '/production/list'],
    ['生产进度', 'GET', '/production/schedule/1'],
  ]);

  // 17. 包装
  await testModule('包装管理', [
    ['包装创建', 'POST', '/package/', { order_id: '1', package_type: 'standard' }],
    ['包装列表', 'GET', '/package/list'],
  ]);

  // 18. 发货
  await testModule('发货管理', [
    ['发货创建', 'POST', '/shipment/', { order_id: '1' }],
    ['发货列表', 'GET', '/shipment/list'],
  ]);

  // 19. 供应商付款
  await testModule('供应商付款', [
    ['付款创建', 'POST', '/payables/', { supplier_id: '1', amount: 1000, currency: 'CNY' }],
    ['付款列表', 'GET', '/payables/list'],
  ]);

  // 20. 硬件(hardware)
  await testModule('硬件管理', [
    ['硬件创建', 'POST', '/hardware/', { hardware_code: 'HW001', hardware_name: '测试硬件' }],
    ['硬件列表', 'GET', '/hardware/list'],
  ]);

  // 21. 硬件驱动(hardware-driver)
  await testModule('硬件驱动', [
    ['驱动创建', 'POST', '/hardware-driver/', { driver_name: '测试驱动', version: '1.0' }],
    ['驱动列表', 'GET', '/hardware-driver/list'],
  ]);

  // 22. 汇率
  await testModule('汇率管理', [
    ['汇率列表', 'GET', '/exchange-rates/'],
    ['汇率换算', 'POST', '/exchange-rates/convert', { amount: 100, from: 'USD', to: 'CNY' }],
  ]);

  // 23. alpha
  await testModule('Alpha对接', [
    ['同步状态', 'GET', '/alpha/status'],
    ['下载日志', 'GET', '/alpha/download-log'],
  ]);

  // 24. 成本(cost)
  await testModule('成本管理', [
    ['成本汇总', 'GET', '/cost/summary/1'],
    ['成本规则', 'GET', '/cost/rules'],
  ]);

  // 25. 系统
  await testModule('系统配置', [
    ['配置列表', 'GET', '/system/config/list'],
  ]);

  // 26. 上传
  await testModule('文件上传', [
    ['上传测试', 'POST', '/upload/', { filename: 'test.txt', content: 'dGVzdA==' }],
  ]);

  // 汇总
  console.log('\n\n=== 测试汇总 ===');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`通过: ${passed}  失败: ${failed}`);
  
  if (failed > 0) {
    console.log('\n失败详情:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`❌ ${r.module} - ${r.test}:`, JSON.stringify(r.detail || r.error || '').substring(0, 150));
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
