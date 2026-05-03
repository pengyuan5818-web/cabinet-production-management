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

function pretty(name, r) {
  const tag = r.status === 200 ? 'PASS' : r.status === 404 ? '404  ' : r.status === 500 ? 'FAIL ' : 'ERR  ';
  const preview = typeof r.body === 'object' ? JSON.stringify(r.body).slice(0,120) : String(r.body).slice(0,120);
  console.log(tag, name, r.status, preview);
  return r;
}

async function run() {
  const login = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  const token = login.body?.data?.token;
  console.log('LOGIN:', login.status, token ? 'OK' : 'FAIL');
  if (!token) return;

  // === 1. orders list - 查数据结构 + 关联字段 ===
  const orders = await req('GET', '/api/orders', null, token);
  pretty('GET /api/orders', orders);
  const orderList = orders.body?.data?.list || orders.body?.data?.rows || orders.body?.data || [];
  console.log('  → 数据条数:', orderList.length);
  if (orderList.length > 0) {
    console.log('  → 字段:', Object.keys(orderList[0]).join(', '));
  }

  // 翻到第2页，看有没有更多数据
  const orders2 = await req('GET', '/api/orders?page=2&page_size=5', null, token);
  const page2List = orders2.body?.data?.list || orders2.body?.data?.rows || orders2.body?.data || [];
  console.log('  → 第2页条数:', page2List.length);

  // === 2. order/:id 详情 - 查是否包含 boards/items/stages/bom ===
  if (orderList.length > 0) {
    const oid = orderList[0].id;
    const detail = await req('GET', '/api/orders/' + oid, null, token);
    pretty('GET /api/orders/:id 详情', detail);
    const d = detail.body?.data || {};
    console.log('  → 字段:', Object.keys(d).join(', '));
    const boards = d.boards || d.board_list || d.cabinet_boards || [];
    const items = d.items || d.order_items || [];
    const stages = d.stages || d.production_stages || d.stage_list || [];
    const bom = d.bom || d.bill_of_materials || [];
    console.log('  → boards:', boards.length, 'items:', items.length, 'stages:', stages.length, 'bom:', bom.length);
    
    // === 3. 查单个板件详情 ===
    if (boards.length > 0) {
      const boardDetail = await req('GET', '/api/production/board/' + boards[0].id, null, token);
      pretty('GET /api/production/board/:id', boardDetail);
      console.log('  → 板件字段:', Object.keys(boardDetail.body?.data || {}).join(', '));
    }
    
    // === 4. 查生产阶段列表 ===
    if (stages.length > 0) {
      console.log('\n=== 生产阶段详情 ===');
      console.log('阶段示例:', JSON.stringify(stages[0]).slice(0,200));
    }
  }

  // === 5. 成本明细 - 查数据结构 ===
  const costDetail = await req('GET', '/api/cost/report/detail', null, token);
  pretty('GET /api/cost/report/detail', costDetail);
  const costList = costDetail.body?.data?.list || costDetail.body?.data?.rows || costDetail.body?.data || [];
  console.log('  → 成本记录数:', costList.length);
  if (costList.length > 0) {
    console.log('  → 字段:', Object.keys(costList[0]).join(', '));
    const c = costList[0];
    console.log('  → 有material_cost:', 'material_cost' in c);
    console.log('  → 有labor_cost:', 'labor_cost' in c);
    console.log('  → 有manufacturing_overhead:', 'manufacturing_overhead' in c);
    console.log('  → 有gross_profit:', 'gross_profit' in c);
    console.log('  → 有gross_margin:', 'gross_margin' in c);
    console.log('  → 示例:', JSON.stringify(c).slice(0,200));
  }

  // === 6. 佣金列表 - 查数据结构 ===
  const comms = await req('GET', '/api/dealers/commissions', null, token);
  pretty('GET /api/dealers/commissions', comms);
  const commList = comms.body?.data?.list || comms.body?.data || [];
  console.log('  → 佣金记录:', commList.length);
  if (commList.length > 0) {
    console.log('  → 字段:', Object.keys(commList[0]).join(', '));
    console.log('  → 示例:', JSON.stringify(commList[0]).slice(0,200));
  }

  // === 7. 排程日历 - 查是否有数据 ===
  const cal = await req('GET', '/api/production/schedule/calendar', null, token);
  pretty('GET /api/production/schedule/calendar', cal);
  console.log('  → 日历数据:', JSON.stringify(cal.body).slice(0,200));

  // === 8. 排程统计 ===
  const sched = await req('GET', '/api/production/schedule/stats', null, token);
  pretty('GET /api/production/schedule/stats', sched);
  console.log('  → 排程统计:', JSON.stringify(sched.body).slice(0,200));

  // === 9. 费用池 ===
  const pool = await req('GET', '/api/cost/allocation/pool', null, token);
  pretty('GET /api/cost/allocation/pool', pool);
  const poolList = pool.body?.data?.list || pool.body?.data || [];
  console.log('  → 费用池:', poolList.length, '条');
  if (poolList.length > 0) console.log('  → 示例:', JSON.stringify(poolList[0]).slice(0,150));

  // === 10. 分配规则 ===
  const rules = await req('GET', '/api/cost/allocation-rules', null, token);
  pretty('GET /api/cost/allocation-rules', rules);
  console.log('  → 规则:', JSON.stringify(rules.body).slice(0,200));

  // === 11. 员工绩效 ===
  const perf = await req('GET', '/api/reports/employee/performance', null, token);
  pretty('GET /api/reports/employee/performance', perf);
  console.log('  → 绩效:', JSON.stringify(perf.body).slice(0,200));

  // === 12. 员工产出 ===
  const empProd = await req('GET', '/api/reports/employee/production', null, token);
  pretty('GET /api/reports/employee/production', empProd);
  console.log('  → 产出:', JSON.stringify(empProd.body).slice(0,200));

  // === 13. 发票列表 ===
  const invoices = await req('GET', '/api/finance/invoices', null, token);
  pretty('GET /api/finance/invoices', invoices);
  console.log('  → 发票:', JSON.stringify(invoices.body).slice(0,200));

  // === 14. 发货记录 ===
  const shipments = await req('GET', '/api/shipment', null, token);
  pretty('GET /api/shipment', shipments);
  const shipList = shipments.body?.data?.list || shipments.body?.data || [];
  console.log('  → 发货记录:', shipList.length);

  // === 15. 仓库物料 ===
  const materials = await req('GET', '/api/warehouse/materials', null, token);
  pretty('GET /api/warehouse/materials', materials);
  const matList = materials.body?.data?.list || materials.body?.data || [];
  console.log('  → 物料:', matList.length);

  // === 16. system/config ===
  const sysConfig = await req('GET', '/api/system/config', null, token);
  pretty('GET /api/system/config', sysConfig);
  console.log('  → 配置:', JSON.stringify(sysConfig.body).slice(0,200));

  // === 17. 客户应收款汇总 ===
  const custArr = await req('GET', '/api/finance/customer-arrears', null, token);
  pretty('GET /api/finance/customer-arrears', custArr);
  console.log('  → 客户应收:', JSON.stringify(custArr.body).slice(0,200));

  // === 18. 代理商账务 ===
  const dealArr = await req('GET', '/api/finance/dealer-arrears', null, token);
  pretty('GET /api/finance/dealer-arrears', dealArr);
  console.log('  → 代理账务:', JSON.stringify(dealArr.body).slice(0,200));

  // === 19. 供应商应付款 ===
  const suppArr = await req('GET', '/api/finance/supplier-arrears', null, token);
  pretty('GET /api/finance/supplier-arrears', suppArr);
  console.log('  → 供应商应付:', JSON.stringify(suppArr.body).slice(0,200));

  // === 20. 经销商列表 ===
  const dealers = await req('GET', '/api/dealers', null, token);
  pretty('GET /api/dealers', dealers);
  const dealList = dealers.body?.data?.list || dealers.body?.data?.rows || dealers.body?.data || [];
  console.log('  → 经销商:', dealList.length);
  if (dealList.length > 0) {
    console.log('  → 字段:', Object.keys(dealList[0]).join(', '));
    console.log('  → 示例:', JSON.stringify(dealList[0]).slice(0,200));
  }

  // === 21. 批量计算 - 测逻辑 ===
  const batchCalc = await req('POST', '/api/cost/calculate/batch', { order_ids: [] }, token);
  pretty('POST /api/cost/calculate/batch (空)', batchCalc);
  if (orderList.length > 0) {
    const batchCalc2 = await req('POST', '/api/cost/calculate/batch', { order_ids: [orderList[0].id] }, token);
    pretty('POST /api/cost/calculate/batch (1订单)', batchCalc2);
  }

  // === 22. 排程生成 ===
  const genSched = await req('POST', '/api/production/schedule/generate', {}, token);
  pretty('POST /api/production/schedule/generate', genSched);

  console.log('\n=== 检查完成 ===');
}
run().catch(e => console.error('ERROR:', e.message));
