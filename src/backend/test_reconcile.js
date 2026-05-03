const http = require('http');
function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
(async () => {
  const login = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login',
    method: 'POST', headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });
  const token = login.data.data?.token;
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('1. 登录:', login.data.success ? '✅' : '❌');

  // 取第一个供应商
  const supList = await request({ hostname: 'localhost', port: 3000, path: '/api/suppliers?page_size=5', method: 'GET', headers: h });
  const sup = supList.data.data?.list?.[0];
  if (!sup) { console.log('无可用供应商'); process.exit(1); }
  console.log('2. 供应商:', sup.supplier_name);

  // Bug1验证: tax_rate传整数不应该溢出, bill_date不传应有默认值
  const payable = await request({
    hostname: 'localhost', port: 3000, path: '/api/finance/payables', method: 'POST', headers: h
  }, { supplier_id: sup.id, bill_no: 'BUGFIX' + Date.now(), amount: 5000, tax_rate: 13, total_amount: 5650, remark: 'Bug1测试' });
  console.log('3. Bug1修复(tax_rate=13整数):', payable.data.success ? '✅' : '❌', payable.data.message || '');

  // Bug2验证: GET /api/suppliers/:id/payables 端点
  const pkList = await request({ hostname: 'localhost', port: 3000, path: `/api/suppliers/${sup.id}/payables?page_size=5`, method: 'GET', headers: h });
  console.log('4. Bug2修复(payables列表):', pkList.data.success ? '✅' : '❌', pkList.data.data?.total !== undefined ? `总数:${pkList.data.data.total}` : pkList.data.message || '');

  // 正常付款测试
  const recon = await request({ hostname: 'localhost', port: 3000, path: `/api/suppliers/${sup.id}/reconciliations`, method: 'POST', headers: h },
    { payable_amount: 5650, paid_amount: 0, remark: 'BugFix验证' });
  console.log('5. 对账单创建:', recon.data.success ? '✅' : '❌', recon.data.data?.bill_no || '');
  const reconId = recon.data.data?.id;
  if (!reconId) { process.exit(1); }

  const pay = await request({ hostname: 'localhost', port: 3000, path: `/api/suppliers/${sup.id}/payments`, method: 'POST', headers: h },
    { amount: 2000, payment_method: '银行转账', reconciliation_id: reconId, remark: '核销测试' });
  console.log('6. 付款核销:', pay.data.success ? '✅' : '❌', pay.data.message || '');
  if (pay.data.data?.reconciled?.length > 0) {
    const r = pay.data.data.reconciled[0];
    console.log('   账单:', r.bill_no, '| 核销:', r.settled, '| 剩余:', r.remaining);
  }

  process.exit(0);
})();
