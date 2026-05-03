/**
 * 全流程测试脚本
 * 流程：登录 → 建客户 → 建订单 → 提交 → 阶段推进 → 完工 → 安排安装 → 确认安装
 */
const http = require('http');
const fs = require('fs');

let token = '';
const BASE = 'http://localhost:3000';

function httpReq(method, path, bodyObj) {
  return new Promise((resolve, reject) => {
    const fullPath = '/api' + path;
    const urlObj = new URL(fullPath, BASE);
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', (e) => reject(new Error(e.message)));
    if (bodyObj) req.write(JSON.stringify(bodyObj));
    req.end();
  });
}

async function run() {
  console.log('=== 全流程测试开始 ===\n');

  // 1. 登录
  process.stdout.write('[1/10 登录]... ');
  const login = await httpReq('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  if (login.status !== 200 || !login.data.success) {
    console.error('FAIL -', login.status, JSON.stringify(login.data).substring(0, 200));
    process.exit(1);
  }
  token = login.data.data.token;
  console.log('OK - token:', token.substring(0, 20) + '...');

  // 2. 创建客户
  process.stdout.write('[2/10 创建客户]... ');
  const cust = await httpReq('POST', '/customers', {
    customer_name: '测试客户_全流程',
    customer_type: 'individual',
    phone: '13800138000',
    address: '上海市浦东新区测试路1号'
  });
  if (cust.status !== 200 || !cust.data.success) {
    console.error('FAIL -', cust.status, JSON.stringify(cust.data).substring(0, 200));
    process.exit(1);
  }
  const customerId = cust.data.data?.id;
  console.log('OK - customerId:', customerId);

  // 3. 创建订单
  process.stdout.write('[3/10 创建订单]... ');
  const ord = await httpReq('POST', '/orders', {
    source_type: 'direct',
    customer_id: customerId,
    installation_required: true,
    expected_delivery: '2026-05-01',
    delivery_address: '上海市浦东新区测试路1号',
    delivery_contact: '测试客户',
    delivery_phone: '13800138000',
    total_amount: 50000,
    deposit_amount: 10000,
    remark: '全流程测试'
  });
  if (ord.status !== 200 || !ord.data.success) {
    console.error('FAIL -', ord.status, JSON.stringify(ord.data).substring(0, 300));
    process.exit(1);
  }
  const orderId = ord.data.data?.id;
  console.log('OK - orderId:', orderId);

  // 4. 提交订单
  process.stdout.write('[4/10 提交订单]... ');
  const submit = await httpReq('POST', `/orders/${orderId}/submit`);
  console.log(submit.status === 200 || submit.status === 201 ? 'OK' : 'FAIL -', submit.status, JSON.stringify(submit.data).substring(0, 200));

  // 5. 查询生产阶段
  process.stdout.write('[5/10 查询阶段]... ');
  const stageRes = await httpReq('GET', '/production/stages');
  const stages = stageRes.data.data || [];
  console.log('OK -', stages.length, '个阶段:', stages.map(s => s.stage).join(', '));

  // 6. 逐阶段推进
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    process.stdout.write(`[6.${i+1}/${stages.length} 推进阶段:${s.stage}]... `);
    const r = await httpReq('POST', '/production/stage', {
      order_id: orderId,
      stage: s.stage,
      stage_status: 'completed',
      operator_name: '测试工人',
      remark: '全流程测试'
    });
    if (r.status !== 200 && r.status !== 201) {
      console.error('FAIL -', r.status, JSON.stringify(r.data).substring(0, 200));
      // 不退出，继续
    } else {
      console.log('OK');
    }
  }

  // 7. 查询订单状态
  process.stdout.write('[7/10 查询状态]... ');
  const orderInfo = await httpReq('GET', `/orders/${orderId}`);
  const orderData = orderInfo.data.data || {};
  console.log('OK - 状态:', orderData.order_status, '| 库位:', orderData.warehouse_location_name || '无');

  // 8. 成品库位检查
  process.stdout.write('[8/10 检查库位]... ');
  const locRes = await httpReq('GET', '/warehouse/finished-locations');
  const locList = locRes.data.data || [];
  const occ = locList.filter(l => l.status === 'occupied');
  console.log('OK - 总库位:', locList.length, '| 已占用:', occ.length);
  if (occ.length > 0) {
    occ.forEach(l => console.log('  占用:', l.location_name, l.order_no || '-'));
  }

  // 9. 安排安装
  process.stdout.write('[9/10 安排安装]... ');
  const instRes = await httpReq('POST', `/orders/${orderId}/installation`, {
    scheduled_date: '2026-04-25',
    installer_name: '测试安装工',
    address: orderData.delivery_address || '上海市浦东新区测试路1号',
    contact_phone: '13800138000',
    remark: '全流程测试'
  });
  console.log(instRes.status === 200 || instRes.status === 201 ? 'OK' : 'FAIL -', instRes.status, JSON.stringify(instRes.data).substring(0, 200));

  // 10. 确认安装完成
  process.stdout.write('[10/10 确认安装]... ');
  const confRes = await httpReq('PUT', `/orders/${orderId}/installation/confirm`, {
    installation_result: 'completed',
    remark: '全流程测试完成'
  });
  console.log(confRes.status === 200 ? 'OK' : 'FAIL -', confRes.status, JSON.stringify(confRes.data).substring(0, 200));

  // 最终状态
  const final = await httpReq('GET', `/orders/${orderId}`);
  const finalData = final.data.data || {};
  console.log('\n=== 测试完成 ===');
  console.log('订单:', orderId);
  console.log('最终状态:', finalData.order_status);
  console.log('安装状态:', finalData.installation_status);
  console.log('库位:', finalData.warehouse_location_name || '无');

  // 写报告
  const report = `全流程测试报告 - ${new Date().toLocaleString('zh-CN')}
=====================================
订单ID: ${orderId}
客户ID: ${customerId}
阶段数: ${stages.length}
最终状态: ${finalData.order_status || '?'}
安装状态: ${finalData.installation_status || '?'}
库位: ${finalData.warehouse_location_name || '无'}
库位占用: ${occ.length} / ${locList.length}
`;
  fs.writeFileSync('test_flow_report.txt', report, 'utf8');
  console.log('\n报告已保存到 test_flow_report.txt');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
