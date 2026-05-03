const http = require('http');
const BASE = 'http://localhost:3000';

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: {} };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) { opts.headers['Content-Type'] = 'application/json'; }
    const r = http.request(opts, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d.slice(0,500) }); } });
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body)); r.end();
  });
}

async function run() {
  const { body: { data: { token } } } = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  console.log('TOKEN OK');

  // 获取第一个订单ID
  const orders = await req('GET', '/api/orders', null, token);
  const order = (orders.body?.data?.list || [])[0];
  const oid = order?.id;
  console.log('订单ID:', oid, 'order_no:', order?.order_no);

  // Bug#1: orders/:id 的 boards=undefined - 深入查
  const detail = await req('GET', '/api/orders/' + oid, null, token);
  const d = detail.body?.data || {};
  console.log('\n=== Bug#1: boards=undefined ===');
  console.log('detail直接keys:', Object.keys(d).join(', '));
  console.log('d.boards:', d.boards);
  console.log('d.board_list:', d.board_list);
  console.log('d.cabinet_boards:', d.cabinet_boards);
  console.log('d.details:', d.details ? (Array.isArray(d.details) ? d.details.length+'条' : typeof d.details) : '无');
  console.log('d.boards存在?', 'boards' in d);

  // 尝试直接查 cabinet_board 表（通过production路由）
  const boardsAll = await req('GET', '/api/production/boards', null, token);
  console.log('\n=== production/boards ===');
  console.log('status:', boardsAll.status, 'data:', JSON.stringify(boardsAll.body).slice(0,200));
  
  // production/board/:id
  if (d.boards && d.boards.length > 0) {
    const bd = await req('GET', '/api/production/board/' + d.boards[0].id, null, token);
    console.log('board/:id:', bd.status, JSON.stringify(bd.body).slice(0,200));
  } else {
    // 尝试直接用 order_id 查 boards
    const boardsByOrder = await req('GET', '/api/production/boards?order_id=' + oid, null, token);
    console.log('boards?order_id=', oid, '→', boardsByOrder.status, JSON.stringify(boardsByOrder.body).slice(0,200));
  }

  // Bug#2: customer-arrears 有数据但 customer_name=null
  console.log('\n=== Bug#2: customer_name=null ===');
  const custArr = await req('GET', '/api/finance/customer-arrears', null, token);
  const cust = (custArr.body?.data?.list || [])[0];
  if (cust) {
    console.log('customer_arrears示例:', JSON.stringify(cust));
    console.log('customer_id:', cust.customer_id, 'customer_name:', cust.customer_name);
    // 查对应订单
    if (cust.order_id) {
      const relatedOrder = await req('GET', '/api/orders/' + cust.order_id, null, token);
      console.log('关联订单详情:', JSON.stringify(relatedOrder.body?.data || {}).slice(0,300));
    }
  }

  // Bug#3: dealers 缺少 commission_rate
  console.log('\n=== Bug#3: dealer缺commission_rate ===');
  const dealers = await req('GET', '/api/dealers', null, token);
  const dealer = (dealers.body?.data?.list || [])[0];
  if (dealer) {
    console.log('dealer字段:', Object.keys(dealer).join(', '));
    console.log('有commission_rate?', 'commission_rate' in dealer);
    console.log('有commission_rate字段?', dealer.commission_rate !== undefined);
  }

  // Bug#4: 排程生成说"没有需要排程的订单"
  console.log('\n=== Bug#4: 排程无法生成 ===');
  // 查订单中哪些有 schedule_status
  const ordersWithSched = await req('GET', '/api/orders?order_status=confirmed', null, token);
  console.log('confirmed订单:', (ordersWithSched.body?.data?.list || []).length, '条');
  
  const ordersPending = await req('GET', '/api/orders?order_status=pending', null, token);
  console.log('pending订单:', (ordersPending.body?.data?.list || []).length, '条');
  
  // 手动造一个confirmed订单试试
  if (order) {
    console.log('\n当前订单状态:', order.order_status, 'schedule_status:', order.schedule_status);
    // 调用状态更新
    const upd = await req('PUT', '/api/orders/' + oid + '/status', { status: 'confirmed' }, token);
    console.log('更新状态→confirmed:', upd.status, JSON.stringify(upd.body).slice(0,100));
    
    // 重新生成排程
    const gen2 = await req('POST', '/api/production/schedule/generate', {}, token);
    console.log('再次排程:', gen2.status, JSON.stringify(gen2.body).slice(0,100));
  }

  // Bug#5: production_stage 产能数据
  console.log('\n=== Bug#5: production_stage 产能 ===');
  const stages = await req('GET', '/api/production/stages', null, token);
  console.log('stages:', JSON.stringify(stages.body).slice(0,300));

  // Bug#6: employee/production 空数据
  console.log('\n=== Bug#6: employee/production空 ===');
  const empProd = await req('GET', '/api/reports/employee/production?start_date=2026-04-01&end_date=2026-04-20', null, token);
  console.log('employee/production:', empProd.status, JSON.stringify(empProd.body).slice(0,300));

  // Bug#7: 批量计算成本 - 检查计算结果关联
  console.log('\n=== Bug#7: 批量计算结果 ===');
  const calc = await req('POST', '/api/cost/calculate/batch', { order_ids: [oid] }, token);
  console.log('cost/batch:', calc.status, JSON.stringify(calc.body).slice(0,300));
  const calcResult = (calc.body?.data || [])[0] || {};
  console.log('结果字段:', Object.keys(calcResult).join(', '));

  // Bug#8: 检查 dealer_commission 是否能通过 commissionService 生成
  console.log('\n=== Bug#8: 佣金生成测试 ===');
  // 找已完成订单
  const completedOrders = await req('GET', '/api/orders?order_status=completed', null, token);
  console.log('completed订单:', (completedOrders.body?.data?.list || []).length);
  
  // 找有经销商的订单
  const orderWithDealer = (orders.body?.data?.list || []).find(o => o.dealer_id);
  if (orderWithDealer) {
    console.log('有dealer订单:', orderWithDealer.order_no, 'dealer_id:', orderWithDealer.dealer_id, 'total:', orderWithDealer.total_amount);
    // 查dealer的commission_rate
    const dealDetail = await req('GET', '/api/dealers/' + orderWithDealer.dealer_id, null, token);
    console.log('dealer详情:', JSON.stringify(dealDetail.body?.data || {}).slice(0,200));
  }

  console.log('\n=== 深度检查完成 ===');
}
run().catch(e => console.error('ERROR:', e.message));
