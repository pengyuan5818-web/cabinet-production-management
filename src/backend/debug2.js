const http = require('http');

async function req(path, method, body) {
  return new Promise((res, rej) => {
    const r = http.request({ hostname: 'localhost', port: 3000, path, method, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } }, r2 => {
      let d = ''; r2.on('data', c => d += c); r2.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    });
    r.on('error', rej); if (body) r.write(JSON.stringify(body)); r.end();
  });
}

async function main() {
  const login = await req('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  token = login.data.token;

  // Employee create
  console.log('=== Employee POST ===');
  const emp = await req('/api/employees', 'POST', { name: '测试员工X', id_card: '110101199001011234', phone: '13600136000', dept_name: '生产部', position: '操作工', salary_base: 5000 });
  console.log(JSON.stringify(emp, null, 2).slice(0, 600));

  // Order stage update - try POST with stages
  console.log('\n=== Order stage (POST /stages) ===');
  const orders = await req('/api/orders?page=1&page_size=1', 'GET');
  if (orders.data?.list?.length > 0) {
    const oid = orders.data.list[0].id;
    console.log('Order ID:', oid);
    const stage = await req(`/api/orders/${oid}/stages`, 'POST', { stage: 'design', remark: '测试推进' });
    console.log(JSON.stringify(stage, null, 2).slice(0, 400));
  }

  // Stock in
  console.log('\n=== Stock In ===');
  const mats = await req('/api/warehouse/materials?page=1&page_size=1', 'GET');
  if (mats.data?.list?.length > 0) {
    const mid = mats.data.list[0].id;
    console.log('Material ID:', mid);
    const in1 = await req('/api/warehouse/stock-in', 'POST', { material_id: mid, warehouse_name: '主仓库', quantity: 50, operator: 'admin', remark: '测试' });
    console.log(JSON.stringify(in1, null, 2).slice(0, 400));
  }

  // Supplier payments
  console.log('\n=== Supplier Payments ===');
  const sups = await req('/api/suppliers?page=1&page_size=1', 'GET');
  if (sups.data?.list?.length > 0) {
    const sid = sups.data.list[0].id;
    console.log('Supplier ID:', sid);
    const payList = await req(`/api/suppliers/${sid}/payments`, 'GET');
    console.log(JSON.stringify(payList, null, 2).slice(0, 400));
  }
}

let token = '';
main().catch(console.error);
