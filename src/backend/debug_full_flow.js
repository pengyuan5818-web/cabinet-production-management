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

  // 模拟 full_test 的 9.1-9.5 流程
  console.log('=== 查询物料列表 ===');
  const mats = await req('/api/warehouse/materials?page=1&page_size=1', 'GET');
  const matId = mats.data?.list?.[0]?.id;
  const matName = mats.data?.list?.[0]?.material_name;
  console.log('物料:', matId, matName);

  console.log('\n=== 入库 (创建物料后入库) ===');
  const newMat = await req('/api/warehouse/materials', 'POST', {
    material_code: 'TEST' + Date.now(), material_name: '测试物料-完整流程',
    specification: '100*50', unit: '张', unit_price: 80
  });
  console.log('创建物料:', newMat.success ? newMat.data?.id : newMat.message);
  const newMatId = newMat.data?.id;

  const in1 = await req('/api/warehouse/stock-in', 'POST', { material_id: newMatId, quantity: 50, unit_price: 80, remark: '完整流程测试' });
  console.log('入库:', in1.success ? '✅' : '❌', in1.message);

  console.log('\n=== 出库 ===');
  const out1 = await req('/api/warehouse/stock-out', 'POST', { material_id: newMatId, quantity: 10, remark: '完整流程测试' });
  console.log('出库:', out1.success ? '✅' : '❌', out1.message);
}

main().catch(console.error);
