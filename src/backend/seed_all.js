/**
 * 完整数据重建脚本
 * 用法: node seed_all.js
 * 
 * 会清空所有业务表，重新注入真实关联数据
 */
const { Client } = require('pg');

const DB_CONFIG = {
  host: '192.168.3.108',
  port: 5432,
  database: 'cabinet',
  user: 'postgres',
  password: 'BOSSli'
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('=== 完整数据重建 ===\n');
  
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log('✓ 数据库连接成功');
  } catch(e) {
    console.error('✗ 数据库连接失败:', e.message);
    console.log('\n请确认: 1) pgAdmin执行迁移SQL 2) 电脑能连通 192.168.3.108');
    return;
  }

  // ============================================================
  // 第1步：清空所有业务表（保持表结构）
  // ============================================================
  console.log('\n--- 第1步：清空数据 ---');
  
  const tables = [
    'work_hours_record',
    'production_schedule',
    'order_bom',
    'cabinet_board',
    'dealer_commission',
    'dealer_commission_settlement',
    'accounts_receivable',
    'accounts_payable',
    'cost_record',
    'order_cost_summary',
    'monthly_cost_pool',
    'production_calendar',
    'order_installation',
    'order_delivery',
    'order_tracking',
    'order_detail',
    'webhook_log',
    'webhook',
    'invoice',
    'fund_flow',
    'operation_log',
    'salary_record',
    'attendance_record',
    'order_master',
    'customer',
    'dealer',
    'material',
    'supplier',
    'production_stage',
    'dealer_api',
    'cost_allocation_pool',
    'cost_allocation_rule',
    'device',
  ];
  
  // 禁用外键检查
  await client.query('SET session_replication_role = REPLICA');
  
  for (const t of tables) {
    try {
      await client.query(`TRUNCATE TABLE ${t} CASCADE`);
      console.log('  ✓ 清空', t);
    } catch(e) {
      // 表不存在就跳过
    }
  }
  
  await client.query('SET session_replication_role = DEFAULT');
  console.log('✓ 外键检查恢复');

  // ============================================================
  // 第2步：注入经销商（2个）
  // ============================================================
  console.log('\n--- 第2步：注入经销商 ---');
  
  const dealer1 = (await client.query(`
    INSERT INTO dealer (id, dealer_code, dealer_name, dealer_type, contact_person, phone, province, city, district, address, commission_rate, status, entry_date)
    VALUES ('d1000001-0001-0001-0001-000000000001', 'D20260101', '上海恒达橱柜有限公司', 'authorized', '李经理', '13800138001', '上海', '上海市', '浦东新区', '浦东新区金科路888号', 0.05, 'active', '2026-01-01')
    RETURNING id
  `)).rows[0];

  const dealer2 = (await client.query(`
    INSERT INTO dealer (id, dealer_code, dealer_name, dealer_type, contact_person, phone, province, city, district, address, commission_rate, status, entry_date)
    VALUES ('d2000002-0002-0002-0002-000000000002', 'D20260102', '杭州德凡建材商行', 'authorized', '王总', '13900139002', '浙江', '杭州市', '西湖区', '杭州文三路388号', 0.06, 'active', '2026-01-15')
    RETURNING id
  `)).rows[0];

  console.log('  ✓ 经销商1:', dealer1.dealer_code, '佣金率5%');
  console.log('  ✓ 经销商2:', dealer2.dealer_code, '佣金率6%');

  // ============================================================
  // 第3步：注入客户（3个）
  // ============================================================
  console.log('\n--- 第3步：注入客户 ---');
  
  const cust1 = (await client.query(`
    INSERT INTO customer (id, customer_no, customer_name, phone, province, city, district, address, status)
    VALUES ('c1000001-0001-0001-0001-000000000001', 'C20260401', '张伟', '18900189001', '上海', '上海市', '浦东新区', '浦东新区张江镇科技路123号', 'ordered')
    RETURNING id
  `)).rows[0];

  const cust2 = (await client.query(`
    INSERT INTO customer (id, customer_no, customer_name, phone, province, city, district, address, status)
    VALUES ('c2000002-0002-0002-0002-000000000002', 'C20260402', '刘洋', '18900189002', '浙江', '杭州市', '西湖区', '杭州西湖区文一路456号', 'ordered')
    RETURNING id
  `)).rows[0];

  const cust3 = (await client.query(`
    INSERT INTO customer (id, customer_no, customer_name, phone, province, city, district, address, status)
    VALUES ('c3000003-0003-0003-0003-000000000003', 'C20260403', '陈明', '18900189003', '江苏', '南京市', '鼓楼区', '南京中山北路789号', 'ordered')
    RETURNING id
  `)).rows[0];

  console.log('  ✓ 客户1:', cust1.customer_name);
  console.log('  ✓ 客户2:', cust2.customer_name);
  console.log('  ✓ 客户3:', cust3.customer_name);

  // ============================================================
  // 第4步：注入供应商（2个）
  // ============================================================
  console.log('\n--- 第4步：注入供应商 ---');
  
  const supp1 = (await client.query(`
    INSERT INTO supplier (id, supplier_code, supplier_name, contact_person, phone, province, city, status)
    VALUES ('s1000001-0001-0001-0001-000000000001', 'SUP202601', '上海建材供应链公司', '周经理', '15000150001', '上海', '上海市', 'active')
    RETURNING id
  `)).rows[0];

  const supp2 = (await client.query(`
    INSERT INTO supplier (id, supplier_code, supplier_name, contact_person, phone, province, city, status)
    VALUES ('s2000002-0002-0002-0002-000000000002', 'SUP202602', '浙江五金批发中心', '吴总', '15000150002', '浙江', '杭州市', 'active')
    RETURNING id
  `)).rows[0];

  console.log('  ✓ 供应商1:', supp1.supplier_name);
  console.log('  ✓ 供应商2:', supp2.supplier_name);

  // ============================================================
  // 第5步：注入物料（5个）
  // ============================================================
  console.log('\n--- 第5步：注入物料 ---');
  
  const mat1 = (await client.query(`
    INSERT INTO material (id, material_code, material_name, category, unit, unit_price, stock_quantity, low_stock_threshold, supplier_id, status)
    VALUES ('m1000001-0001-0001-0001-000000000001', 'MAT001', '16mm不锈钢橱柜板 1220x2440', 'panel', '张', 680.00, 150, 20, '${supp1.id}', 'active')
    RETURNING id
  `)).rows[0];

  const mat2 = (await client.query(`
    INSERT INTO material (id, material_code, material_name, category, unit, unit_price, stock_quantity, low_stock_threshold, supplier_id, status)
    VALUES ('m2000002-0002-0002-0002-000000000002', 'MAT002', '18mm防水板 1220x2440', 'panel', '张', 820.00, 80, 15, '${supp1.id}', 'active')
    RETURNING id
  `)).rows[0];

  const mat3 = (await client.query(`
    INSERT INTO material (id, material_code, material_name, category, unit, unit_price, stock_quantity, low_stock_threshold, supplier_id, status)
    VALUES ('m3000003-0003-0003-0003-000000000003', 'MAT003', '304不锈钢台面 600mm宽', 'countertop', '米', 380.00, 200, 30, '${supp2.id}', 'active')
    RETURNING id
  `)).rows[0];

  const mat4 = (await client.query(`
    INSERT INTO material (id, material_code, material_name, category, unit, unit_price, stock_quantity, low_stock_threshold, supplier_id, status)
    VALUES ('m4000004-0004-0004-0004-000000000004', 'MAT004', 'BLUM铰链 HETTICH', 'hardware', '个', 28.00, 500, 50, '${supp2.id}', 'active')
    RETURNING id
  `)).rows[0];

  const mat5 = (await client.query(`
    INSERT INTO material (id, material_code, material_name, category, unit, unit_price, stock_quantity, low_stock_threshold, supplier_id, status)
    VALUES ('m5000005-0005-0005-0005-000000000005', 'MAT005', 'LED灯带 12V 5米/卷', 'electrical', '卷', 95.00, 60, 10, '${supp2.id}', 'active')
    RETURNING id
  `)).rows[0];

  console.log('  ✓ 物料: 16mm不锈钢板/18mm防水板/台面/铰链/灯带');

  // ============================================================
  // 第6步：注入生产阶段
  // ============================================================
  console.log('\n--- 第6步：注入生产阶段 ---');
  
  await client.query(`
    INSERT INTO production_stage (stage, stage_name, stage_order, next_stage, prev_stage, default_status, estimated_hours, daily_capacity)
    VALUES 
    ('order_confirmed', '订单确认', 1, 'design_confirmed', NULL, 'pending', 1.0, 100),
    ('design_confirmed', '设计确认', 2, 'material_prepared', 'order_confirmed', 'pending', 4.0, 50),
    ('material_prepared', '材料准备', 3, 'cutting', 'design_confirmed', 'pending', 2.0, 80),
    ('cutting', '切割加工', 4, 'assembly', 'material_prepared', 'pending', 6.0, 30),
    ('assembly', '组装焊接', 5, 'polishing', 'cutting', 'pending', 8.0, 20),
    ('polishing', '抛光打磨', 6, 'quality_check', 'assembly', 'pending', 3.0, 40),
    ('quality_check', '质量检验', 7, 'packaging', 'polishing', 'pending', 1.0, 100),
    ('packaging', '包装入库', 8, 'shipped', 'quality_check', 'pending', 1.5, 60),
    ('shipped', '已发货', 9, 'installed', 'packaging', 'pending', 0, 0),
    ('installed', '已安装', 10, 'completed', 'shipped', 'pending', 0, 0),
    ('completed', '已完成', 11, NULL, 'installed', 'pending', 0, 0)
    ON CONFLICT (stage) DO UPDATE SET estimated_hours = EXCLUDED.estimated_hours, daily_capacity = EXCLUDED.daily_capacity
  `);
  console.log('  ✓ 11个生产阶段（含estimated_hours/daily_capacity）');

  // ============================================================
  // 第7步：注入费用池
  // ============================================================
  console.log('\n--- 第7步：注入费用池 ---');
  
  const poolData = [
    ['MFG001', '生产工人工资', 'manufacturing'],
    ['MFG002', '生产水电费', 'manufacturing'],
    ['MFG003', '设备折旧费', 'manufacturing'],
    ['MFG004', '生产房租', 'manufacturing'],
    ['MFG005', '工具损耗', 'manufacturing'],
    ['MFG006', '包装材料', 'manufacturing'],
    ['MFG007', '运输费', 'manufacturing'],
    ['MGT001', '管理费用', 'management'],
    ['SALES001', '销售费用', 'sales'],
  ];
  
  for (const [code, name, cat] of poolData) {
    await client.query(`
      INSERT INTO cost_allocation_pool (id, pool_code, pool_name, pool_category, status)
      VALUES (gen_random_uuid(), $1, $2, $3, 'active')
      ON CONFLICT (pool_code) DO NOTHING
    `, [code, name, cat]);
  }
  console.log('  ✓ 9个费用项目');

  // ============================================================
  // 第8步：注入订单（4个，各状态）
  // ============================================================
  console.log('\n--- 第8步：注入订单 ---');
  
  const orders = [
    {
      id: 'o1000001-0001-0001-0001-000000000001',
      no: 'F20260420001',
      dealer: dealer1.id,
      customer: cust1.id,
      status: 'producing',
      amount: 25000.00,
      deposit: 10000.00,
      source: 'dealer',
      city: '上海市',
      district: '浦东新区',
      address: '浦东新区张江镇科技路123号',
      contact: '张伟',
      phone: '18900189001',
      stage: 'cutting',
      delivery: '2026-05-15',
    },
    {
      id: 'o2000002-0002-0002-0002-000000000002',
      no: 'F20260420002',
      dealer: dealer2.id,
      customer: cust2.id,
      status: 'producing',
      amount: 38000.00,
      deposit: 15000.00,
      source: 'dealer',
      city: '杭州市',
      district: '西湖区',
      address: '杭州西湖区文一路456号',
      contact: '刘洋',
      phone: '18900189002',
      stage: 'assembly',
      delivery: '2026-05-20',
    },
    {
      id: 'o3000003-0003-0003-0003-000000000003',
      no: 'F20260420003',
      dealer: dealer1.id,
      customer: cust3.id,
      status: 'shipped',
      amount: 18500.00,
      deposit: 8000.00,
      source: 'dealer',
      city: '南京市',
      district: '鼓楼区',
      address: '南京中山北路789号',
      contact: '陈明',
      phone: '18900189003',
      stage: 'shipped',
      delivery: '2026-05-10',
    },
    {
      id: 'o4000004-0004-0004-0004-000000000004',
      no: 'F20260420004',
      dealer: null,
      customer: cust1.id,
      status: 'draft',
      amount: 12000.00,
      deposit: 0.00,
      source: 'factory',
      city: '上海市',
      district: '浦东新区',
      address: '浦东新区张江镇科技路123号',
      contact: '张伟',
      phone: '18900189001',
      stage: 'order_confirmed',
      delivery: '2026-06-01',
    },
  ];

  for (const o of orders) {
    await client.query(`
      INSERT INTO order_master (id, order_no, qr_code, source_type, dealer_id, customer_id, order_status,
        total_amount, deposit_amount, balance_amount, expected_delivery, delivery_address, delivery_contact,
        delivery_phone, installation_required, priority, schedule_status, estimated_hours, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, 'normal', 'scheduled', 28.0, NOW())
    `, [o.id, o.no, 'ORDER:' + o.no, o.source, o.dealer, o.customer, o.status,
        o.amount, o.deposit, o.amount - o.deposit, o.delivery, o.address, o.contact, o.phone]);
    console.log(`  ✓ 订单 ${o.no} | 金额 ¥${o.amount} | 状态 ${o.status}`);
  }

  // ============================================================
  // 第9步：注入板件数据（每个生产中订单3块板）
  // ============================================================
  console.log('\n--- 第9步：注入板件 ---');
  
  const boards = [
    { id: 'b1000001-0001-0001-0001-000000000001', order: orders[0].id, no: 'B-F20260420001-01', name: '左侧板 550x720', status: 'scanned', location: '切割车间' },
    { id: 'b1000002-0002-0002-0002-000000000002', order: orders[0].id, no: 'B-F20260420001-02', name: '右侧板 550x720', status: 'pending', location: '切割车间' },
    { id: 'b1000003-0003-0003-0003-000000000003', order: orders[0].id, no: 'B-F20260420001-03', name: '顶板 600x720', status: 'pending', location: '切割车间' },
    { id: 'b2000001-0001-0001-0001-000000000001', order: orders[1].id, no: 'B-F20260420002-01', name: '底板 600x820', status: 'scanned', location: '组装车间' },
    { id: 'b2000002-0002-0002-0002-000000000002', order: orders[1].id, no: 'B-F20260420002-02', name: '背板 580x800', status: 'scanned', location: '组装车间' },
    { id: 'b2000003-0003-0003-0003-000000000003', order: orders[1].id, no: 'B-F20260420002-03', name: '门板 600x600', status: 'pending', location: '组装车间' },
    { id: 'b3000001-0001-0001-0001-000000000001', order: orders[2].id, no: 'B-F20260420003-01', name: '主箱体板', status: 'scanned', location: '已发货' },
    { id: 'b3000002-0002-0002-0002-000000000002', order: orders[2].id, no: 'B-F20260420003-02', name: '台面板', status: 'scanned', location: '已发货' },
  ];

  for (const b of boards) {
    await client.query(`
      INSERT INTO cabinet_board (id, order_id, barcode, board_no, board_name, status, current_location, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [b.id, b.order, b.id.slice(0,8), b.no, b.name, b.status, b.location]);
  }
  console.log(`  ✓ ${boards.length}块板件（含已扫描/待加工）`);

  // ============================================================
  // 第10步：注入BOM（每个订单的材料清单）
  // ============================================================
  console.log('\n--- 第10步：注入BOM材料清单 ---');
  
  const bomItems = [
    [orders[0].id, mat1.id, 'MAT001', '16mm不锈钢板', 8, 680],
    [orders[0].id, mat2.id, 'MAT002', '18mm防水板', 4, 820],
    [orders[0].id, mat4.id, 'MAT003', 'BLUM铰链', 24, 28],
    [orders[1].id, mat1.id, 'MAT001', '16mm不锈钢板', 12, 680],
    [orders[1].id, mat3.id, 'MAT003', '304台面', 6, 380],
    [orders[1].id, mat4.id, 'MAT003', 'BLUM铰链', 32, 28],
    [orders[2].id, mat2.id, 'MAT002', '18mm防水板', 6, 820],
    [orders[2].id, mat5.id, 'MAT003', 'LED灯带', 3, 95],
    [orders[3].id, mat1.id, 'MAT001', '16mm不锈钢板', 5, 680],
    [orders[3].id, mat4.id, 'MAT003', 'BLUM铰链', 16, 28],
  ];

  for (const [oid, mid, mcode, mname, qty, price] of bomItems) {
    await client.query(`
      INSERT INTO order_bom (id, order_id, material_id, material_code, material_name, quantity, unit_price, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
    `, [oid, mid, mcode, mname, qty, price]);
  }
  console.log(`  ✓ ${bomItems.length}条BOM记录`);

  // ============================================================
  // 第11步：注入排程数据
  // ============================================================
  console.log('\n--- 第11步：注入排程 ---');
  
  await client.query(`
    INSERT INTO production_schedule (id, schedule_no, order_id, stage, schedule_date, estimated_hours, status)
    VALUES 
    (gen_random_uuid(), 'SCH20260420001', '${orders[0].id}', 'cutting', '2026-04-21', 6.0, 'scheduled'),
    (gen_random_uuid(), 'SCH20260420002', '${orders[0].id}', 'assembly', '2026-04-22', 8.0, 'scheduled'),
    (gen_random_uuid(), 'SCH20260420003', '${orders[1].id}', 'assembly', '2026-04-21', 8.0, 'scheduled'),
    (gen_random_uuid(), 'SCH20260420004', '${orders[1].id}', 'polishing', '2026-04-23', 3.0, 'scheduled'),
    (gen_random_uuid(), 'SCH20260420005', '${orders[2].id}', 'shipped', '2026-05-08', 0, 'completed')
  `);
  console.log('  ✓ 5条排程记录');

  // ============================================================
  // 第12步：注入应收款
  // ============================================================
  console.log('\n--- 第12步：注入应收款 ---');
  
  await client.query(`
    INSERT INTO accounts_receivable (id, order_id, dealer_id, customer_id, amount, paid_amount, balance_amount, due_date, payment_status, created_at)
    VALUES 
    (gen_random_uuid(), '${orders[0].id}', '${dealer1.id}', '${cust1.id}', 25000.00, 10000.00, 15000.00, '2026-06-20', 'partially_paid', NOW()),
    (gen_random_uuid(), '${orders[1].id}', '${dealer2.id}', '${cust2.id}', 38000.00, 15000.00, 23000.00, '2026-06-25', 'partially_paid', NOW()),
    (gen_random_uuid(), '${orders[2].id}', '${dealer1.id}', '${cust3.id}', 18500.00, 8000.00, 10500.00, '2026-06-15', 'partially_paid', NOW())
  `);
  console.log('  ✓ 3条应收款记录');

  // ============================================================
  // 第13步：注入成本记录
  // ============================================================
  console.log('\n--- 第13步：注入成本记录 ---');
  
  // 订单1的成本
  const order1Material = 8 * 680 + 4 * 820 + 24 * 28; // 8640
  const order1Labor = 28.0 * 35; // 工时 * 时薪35
  const order1Overhead = order1Labor * 0.3;
  await client.query(`
    INSERT INTO order_cost_summary (id, order_id, order_no, cost_period, material_cost, labor_cost, manufacturing_overhead, total_cost, order_amount, gross_profit, gross_margin, calculated_at)
    VALUES (gen_random_uuid(), '${orders[0].id}', '${orders[0].no}', '2026-04', ${order1Material}.00, ${order1Labor}.00, ${order1Overhead}.00, ${order1Material + order1Labor + order1Overhead}.00, 25000.00, ${25000 - order1Material - order1Labor - order1Overhead}.00, 0.33, NOW())
  `);

  // 订单2的成本
  const order2Material = 12 * 680 + 6 * 380 + 32 * 28; // 12296
  const order2Labor = 28.0 * 35;
  const order2Overhead = order2Labor * 0.3;
  await client.query(`
    INSERT INTO order_cost_summary (id, order_id, order_no, cost_period, material_cost, labor_cost, manufacturing_overhead, total_cost, order_amount, gross_profit, gross_margin, calculated_at)
    VALUES (gen_random_uuid(), '${orders[1].id}', '${orders[1].no}', '2026-04', ${order2Material}.00, ${order2Labor}.00, ${order2Overhead}.00, ${order2Material + order2Labor + order2Overhead}.00, 38000.00, ${38000 - order2Material - order2Labor - order2Overhead}.00, 0.41, NOW())
  `);
  console.log('  ✓ 2条成本汇总（含材料/人工/费用）');

  // ============================================================
  // 第14步：注入佣金记录
  // ============================================================
  console.log('\n--- 第14步：注入佣金 ---');
  
  // 订单1佣金
  await client.query(`
    INSERT INTO dealer_commission (id, order_id, dealer_id, commission_rate, order_amount, commission_amount, status, created_at)
    VALUES (gen_random_uuid(), '${orders[0].id}', '${dealer1.id}', 0.05, 25000.00, 1250.00, 'pending', NOW())
  `);
  // 订单2佣金
  await client.query(`
    INSERT INTO dealer_commission (id, order_id, dealer_id, commission_rate, order_amount, commission_amount, status, created_at)
    VALUES (gen_random_uuid(), '${orders[1].id}', '${dealer2.id}', 0.06, 38000.00, 2280.00, 'pending', NOW())
  `);
  // 已结算佣金
  await client.query(`
    INSERT INTO dealer_commission (id, order_id, dealer_id, commission_rate, order_amount, commission_amount, status, settled_at, created_at)
    VALUES (gen_random_uuid(), '${orders[2].id}', '${dealer1.id}', 0.05, 18500.00, 925.00, 'settled', NOW(), '2026-04-28')
  `);
  console.log('  ✓ 3条佣金记录（2条pending + 1条settled）');

  // ============================================================
  // 第15步：生产日历
  // ============================================================
  console.log('\n--- 第15步：初始化生产日历 ---');
  
  // 未来30天工作日历
  const today = new Date('2026-04-20');
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // 跳过周末
    await client.query(`
      INSERT INTO production_calendar (id, calendar_date, is_workday, capacity_hours, note)
      VALUES (gen_random_uuid(), $1, true, 8.0, '正常工作日')
      ON CONFLICT (calendar_date) DO NOTHING
    `, [d.toISOString().split('T')[0]]);
  }
  console.log('  ✓ 未来30个工作日日历');

  // ============================================================
  // 第16步：工时记录（员工产出）
  // ============================================================
  console.log('\n--- 第16步：注入工时记录 ---');
  
  // 查询员工ID
  let empId;
  try {
    const emp = await client.query(`SELECT id FROM employee LIMIT 1`);
    empId = emp.rows[0]?.id;
  } catch(e) {}
  
  if (empId) {
    await client.query(`
      INSERT INTO work_hours_record (id, employee_id, order_id, stage, work_date, hours, efficiency, created_at)
      VALUES 
      (gen_random_uuid(), '${empId}', '${orders[0].id}', 'cutting', '2026-04-21', 6.0, 1.0, NOW()),
      (gen_random_uuid(), '${empId}', '${orders[0].id}', 'assembly', '2026-04-22', 7.5, 1.1, NOW()),
      (gen_random_uuid(), '${empId}', '${orders[1].id}', 'assembly', '2026-04-21', 8.0, 1.0, NOW())
    `);
    console.log('  ✓ 3条工时记录');
  } else {
    console.log('  ⚠ 无employee表，跳过工时记录');
  }

  console.log('\n=== 数据重建完成 ===');
  console.log('\n数据关联验证:');
  console.log(`  订单 → 经销商: ${orders.filter(o=>o.dealer).length}/4 有关联`);
  console.log(`  订单 → 客户: ${orders.filter(o=>o.customer).length}/4 有关联`);
  console.log(`  板件 → 订单: ${boards.length}条`);
  console.log(`  BOM → 订单+物料: ${bomItems.length}条`);
  console.log(`  成本有金额: order_cost_summary 2条（毛利33%/41%）`);
  console.log(`  佣金有金额: dealer_commission 3条（pending+settled）`);
  
  await client.end();
}

run().catch(e => {
  console.error('ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
