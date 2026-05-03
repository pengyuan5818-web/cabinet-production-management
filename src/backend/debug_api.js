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
  console.log('Token:', token.slice(0, 30) + '...');

  console.log('\n=== Supplier POST ===');
  const sup = await req('/api/suppliers', 'POST', { supplier_name: '测试供应商X', contact_person: '张三', phone: '13800138000', supply_category: '板材' });
  console.log(JSON.stringify(sup, null, 2).slice(0, 600));

  console.log('\n=== Employee POST ===');
  const emp = await req('/api/employees', 'POST', { name: '测试员工X', id_card: '110101199001011234', phone: '13600136000', dept_name: '生产部', position: '操作工', salary_base: 5000 });
  console.log(JSON.stringify(emp, null, 2).slice(0, 600));

  console.log('\n=== Material POST ===');
  const mat = await req('/api/warehouse/materials', 'POST', { material_name: '测试物料X', spec: '1220*2440*18mm', unit: '张', category: '板材', quantity: 100 });
  console.log(JSON.stringify(mat, null, 2).slice(0, 600));

  console.log('\n=== Order stage update ===');
  const orders = await req('/api/orders?page=1&page_size=1', 'GET');
  if (orders.data?.list?.length > 0) {
    const oid = orders.data.list[0].id;
    console.log('Order ID:', oid);
    const stage = await req(`/api/orders/${oid}/stage`, 'PUT', { stage: 'design' });
    console.log(JSON.stringify(stage, null, 2).slice(0, 400));
  }

  console.log('\n=== Fund Flow ===');
  const fund = await req('/api/finance/fund-flow?page=1&page_size=5', 'GET');
  console.log(JSON.stringify(fund, null, 2).slice(0, 400));
}

let token = '';
main().catch(console.error);
