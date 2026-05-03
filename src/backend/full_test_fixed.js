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
  console.log('✅ 登录:', login.success);

  // Employee - correct field names
  console.log('\n--- 员工 ---');
  const emp = await req('/api/employees', 'POST', {
    employee_name: '测试员工-全面', id_card_no: '110101199001011234', phone: '13600136000',
    position: '操作工', salary_base: 5000
  });
  console.log('创建员工:', emp.success ? '✅' : '❌', emp.message || '', emp.data?.employee_no || '');

  // Stock In - need warehouse UUID, not warehouse_name
  console.log('\n--- 仓库入库 ---');
  const mats = await req('/api/warehouse/materials?page=1&page_size=1', 'GET');
  if (mats.data?.list?.length > 0) {
    const mid = mats.data.list[0].id;
    const whs = await req('/api/warehouse/warehouses?page=1&page_size=1', 'GET');
    if (whs.data?.list?.length > 0) {
      const wid = whs.data.list[0].id;
      console.log('仓库ID:', wid, '物料ID:', mid);
      const in1 = await req('/api/warehouse/stock-in', 'POST', { material_id: mid, warehouse_id: wid, quantity: 50, remark: '测试入库' });
      console.log('入库:', in1.success ? '✅' : '❌', in1.message || '');
    } else {
      console.log('仓库列表为空，尝试不传warehouse_id...');
      const in1 = await req('/api/warehouse/stock-in', 'POST', { material_id: mid, quantity: 50, remark: '测试入库' });
      console.log('入库(无仓库):', in1.success ? '✅' : '❌', in1.message || '');
    }
  }

  // Stock Out
  const mats2 = await req('/api/warehouse/materials?page=1&page_size=1', 'GET');
  if (mats2.data?.list?.length > 0) {
    const mid = mats2.data.list[0].id;
    const whs = await req('/api/warehouse/warehouses?page=1&page_size=1', 'GET');
    if (whs.data?.list?.length > 0) {
      const wid = whs.data.list[0].id;
      const out1 = await req('/api/warehouse/stock-out', 'POST', { material_id: mid, warehouse_id: wid, quantity: 5, remark: '测试出库' });
      console.log('出库:', out1.success ? '✅' : '❌', out1.message || '');
    }
  }

  // Scan
  if (mats.data?.list?.length > 0) {
    const mid = mats.data.list[0].id;
    const scan = await req('/api/warehouse/scan/' + mid, 'GET');
    console.log('扫码查询:', scan.success ? '✅' : '❌', scan.message || '');
  }

  // Supplier payments list
  const sups = await req('/api/suppliers?page=1&page_size=1', 'GET');
  if (sups.data?.list?.length > 0) {
    const sid = sups.data.list[0].id;
    const p = await req('/api/suppliers/' + sid + '/payments', 'GET');
    console.log('\n付款列表:', p.success ? '✅' : '❌', p.data?.list?.length + '条记录');
  }

  // COM ports
  const ports = await req('/api/hardware/driver/ports', 'GET');
  console.log('\nCOM端口:', ports.success ? '✅' : '❌', JSON.stringify(ports.data || {}));

  console.log('\n=== 修复项测试完成 ===');
}

main().catch(console.error);
