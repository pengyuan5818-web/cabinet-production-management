// 验证脚本 - 用 fetch
async function run() {
  const base = 'http://localhost:65001';
  
  const loginResp = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  }).catch(e => { console.error('登录失败:', e.message); return null; });
  
  if (!loginResp) return;
  const login = await loginResp.json();
  const token = login?.data?.token || login?.token;
  console.log('登录:', loginResp.status, token ? '✓ token获取成功' : '✗ token失败: ' + JSON.stringify(login));

  if (!token) return;

  const headers = { 'Authorization': 'Bearer ' + token };

  // 订单列表
  const ordersResp = await fetch(base + '/api/orders', { headers });
  const ordersData = await ordersResp.json();
  const list = ordersData?.data?.list || [];
  console.log('\n=== 订单验证 ===');
  list.forEach(o => console.log(' ', o.order_no, '¥' + o.total_amount, o.order_status, '| dealer:', o.dealer_name, '| customer:', o.customer_name));

  // N1状态机
  console.log('\n=== N1 状态机测试 ===');
  const draft = list.find(o => o.order_status === 'draft');
  if (draft) {
    const r = await fetch(base + '/api/orders/' + draft.id + '/status', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'producing' }) });
    const d = await r.json();
    console.log('draft→producing:', r.status, JSON.stringify(d).slice(0,100));
  } else {
    console.log('无draft订单（已被N1改成producing）');
  }

  // N5板件
  console.log('\n=== N5 板件路由 ===');
  const r2 = await fetch(base + '/api/production/boards', { headers });
  const d2 = await r2.json();
  console.log('/boards:', r2.status, 'total:', d2?.data?.total, '| first:', JSON.stringify(d2?.data?.list?.[0])?.slice(0,80));

  // 成本
  console.log('\n=== 成本明细 ===');
  const cost = await fetch(base + '/api/cost/report/detail?month=2026-04', { headers });
  const costData = await cost.json();
  console.log('成本明细:', cost.status, JSON.stringify(costData).slice(0,120));

  // 佣金
  console.log('\n=== 佣金列表 ===');
  const comm = await fetch(base + '/api/dealers/commissions', { headers });
  const commData = await comm.json();
  console.log('佣金:', comm.status, JSON.stringify(commData).slice(0,120));

  // 客户欠款
  console.log('\n=== 客户欠款 ===');
  const ar = await fetch(base + '/api/finance/customer-arrears', { headers });
  const arData = await ar.json();
  const first = arData?.data?.list?.[0];
  console.log('customer-arrears:', ar.status, '| customer_name:', first?.customer_name, '| balance:', first?.balance_amount);

  // 应收款汇总
  console.log('\n=== 应收款汇总 ===');
  const summary = arData?.data?.summary;
  console.log('汇总:', JSON.stringify(summary));
}

run().catch(e => console.error('ERROR:', e.message));
