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
  const list = await req('/api/orders?page=1&page_size=1', 'GET');
  const id = list.data?.list?.[0]?.id;
  console.log('订单ID:', id);
  if (id) {
    const d = await req(`/api/orders/${id}`, 'GET');
    console.log('订单详情 success:', d.success, 'message:', d.message);
    console.log('订单详情 data keys:', d.data ? Object.keys(d.data) : 'null');
    const t = await req(`/api/orders/${id}/tracking`, 'GET');
    console.log('订单追踪 success:', t.success, 'message:', t.message);
    // 测试创建订单
    const c = await req('/api/orders', 'POST', {
      order_no: 'TEST-' + Date.now(), customer_name: '测试客户', city: '深圳', district: '南山',
      address: '测试地址', cabinet_size: 'W2000*D600*H2200', door_color: '哑白', door_material: '实木多层',
      countertop_material: '石英石', total_price: 30000, deposit_paid: 10000
    });
    console.log('创建订单:', c.success ? '✅' : '❌', c.message || '', c.data ? Object.keys(c.data) : 'null');
  }
}
main().catch(console.error);
