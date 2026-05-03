const http = require('http');
let token = '';
function req(path, method, body) {
  return new Promise((res) => {
    const h = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    const r = http.request({ hostname: 'localhost', port: 3000, path, method, headers: h }, r2 => { let d = ''; r2.on('data', c => d += c); r2.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } }); });
    r.on('error', e => res({ error: e.message })); if (body) r.write(JSON.stringify(body)); r.end();
  });
}
async function main() {
  const login = await req('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  token = login.data.token;

  // 测试新建订单（带客户名自动创建）
  const c = await req('/api/orders', 'POST', {
    order_no: 'TEST-NEW-' + Date.now(),
    customer_name: '前端测试客户',
    customer_phone: '13800138000',
    city: '深圳',
    district: '南山',
    address: '测试地址123号',
    cabinet_size: 'W2400*D600*H2200',
    door_color: '哑白',
    door_material: '实木多层',
    countertop_material: '石英石',
    total_price: 35800,
    deposit_paid: 10000
  });
  console.log('创建订单:', c.success ? '✅' : '❌', c.message || '', c.data ? 'id=' + c.data.id?.slice(0,8) : 'no-data');

  // 测试详情
  if (c.success && c.data?.id) {
    const d = await req(`/api/orders/${c.data.id}`, 'GET');
    console.log('订单详情:', d.success ? '✅' : '❌', d.message || '');
  }
}
main().catch(console.error);
