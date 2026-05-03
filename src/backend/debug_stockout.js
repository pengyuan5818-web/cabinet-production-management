const http = require('http');
const BASE = { hostname: 'localhost', port: 3000 };
let token = '';

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

  const mats = await req('/api/warehouse/materials?page=1&page_size=1', 'GET');
  const matId = mats.data?.list?.[0]?.id;
  const matName = mats.data?.list?.[0]?.material_name;
  console.log('物料ID:', matId, matName);

  // 先入库
  const in1 = await req('/api/warehouse/stock-in', 'POST', { material_id: matId, quantity: 50, unit_price: 100, remark: '测试入库' });
  console.log('入库:', JSON.stringify(in1));

  // 立即出库
  const out1 = await req('/api/warehouse/stock-out', 'POST', { material_id: matId, quantity: 10, remark: '测试出库' });
  console.log('出库:', JSON.stringify(out1));
}

main().catch(console.error);
