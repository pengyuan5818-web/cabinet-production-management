const http = require('http');
const BASE = { hostname: 'localhost', port: 3000 };
let token = '';
let empId = '', orderId = '', matId = '', whId = '';

function req(path, method, body) {
  return new Promise((res, rej) => {
    const h = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    const r = http.request({ ...BASE, path, method, headers: h }, r2 => {
      let d = ''; r2.on('data', c => d += c); r2.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    });
    r.on('error', rej); if (body) r.write(JSON.stringify(body)); r.end();
  });
}

async function main() {
  const login = await req('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  token = login.data.token;

  // Get IDs
  const emps = await req('/api/employees?page=1&page_size=1', 'GET');
  empId = emps.data?.list?.[0]?.id;
  console.log('empId:', empId);

  const orders = await req('/api/orders?page=1&page_size=1', 'GET');
  orderId = orders.data?.list?.[0]?.id;
  console.log('orderId:', orderId);

  const mats = await req('/api/warehouse/materials?page=1&page_size=1', 'GET');
  matId = mats.data?.list?.[0]?.id;
  console.log('matId:', matId);

  const whs = await req('/api/warehouse/warehouses?page=1&page_size=1', 'GET');
  whId = whs.data?.list?.[0]?.id;
  console.log('whId:', whId);

  console.log('\n=== 逐项诊断 ===');

  // 1. Sign in
  console.log('\n1. 员工签到:');
  const sign = await req('/api/employees/' + empId + '/sign-in', 'POST', {});
  console.log('  result:', JSON.stringify(sign));

  // 2. Order stage
  console.log('\n2. 订单阶段:');
  const stage = await req('/api/orders/' + orderId + '/stages', 'POST', { stage: 'design_confirmed', remark: '测试' });
  console.log('  result:', JSON.stringify(stage));

  // 3. Stock in
  console.log('\n3. 入库:');
  const in1 = await req('/api/warehouse/stock-in', 'POST', { material_id: matId, warehouse_id: whId, quantity: 10, unit_price: 100, remark: '测试' });
  console.log('  result:', JSON.stringify(in1));

  // 4. Stock out
  console.log('\n4. 出库:');
  const out1 = await req('/api/warehouse/stock-out', 'POST', { material_id: matId, warehouse_id: whId, quantity: 2, remark: '测试' });
  console.log('  result:', JSON.stringify(out1));

  // 5. COM ports
  console.log('\n5. COM端口:');
  const ports = await req('/api/hardware/driver/ports', 'GET');
  console.log('  result:', JSON.stringify(ports));
}

main().catch(console.error);
