/**
 * 数据重建脚本（通过后端db模块，字段名已按实际表结构修正）
 */
const path = require('path');
process.chdir(path.join(__dirname, 'src'));
const db = require('./src/db');

async function run() {
  console.log('=== 完整数据重建 ===\n');

  // 清空
  console.log('--- 清空 ---');
  const tables = [
    'work_hours_record','production_schedule','order_bom','cabinet_board',
    'dealer_commission','dealer_commission_settlement','accounts_receivable',
    'accounts_payable','cost_record','order_cost_summary','monthly_cost_pool',
    'production_calendar','order_installation','order_delivery','order_tracking',
    'order_detail','webhook_log','invoice','fund_flow','operation_log',
    'salary_record','attendance_record','order_master','customer','dealer',
    'material','supplier','dealer_api','cost_allocation_pool','cost_allocation_rule','device',
  ];
  await db.query('SET session_replication_role = REPLICA');
  for (const t of tables) { try { await db.query('TRUNCATE TABLE ' + t + ' CASCADE'); } catch(e) {} }
  await db.query('SET session_replication_role = DEFAULT');
  console.log('  ✓ 清空完成');

  // 经销商
  console.log('\n--- 经销商 ---');
  const d1 = (await db.query(`INSERT INTO dealer (id,dealer_code,dealer_name,dealer_type,contact_person,phone,province,city,district,address,commission_rate,status,entry_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    ['d1000001-0001-0001-0001-000000000001','D20260101','上海恒达橱柜有限公司','authorized','李经理','13800138001','上海','上海市','浦东新区','浦东金科路888号',0.05,'active','2026-01-01'])).rows[0].id;
  const d2 = (await db.query(`INSERT INTO dealer (id,dealer_code,dealer_name,dealer_type,contact_person,phone,province,city,district,address,commission_rate,status,entry_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    ['d2000002-0002-0002-0002-000000000002','D20260102','杭州德凡建材商行','authorized','王总','13900139002','浙江','杭州市','西湖区','杭州文三路388号',0.06,'active','2026-01-15'])).rows[0].id;
  console.log('  ✓ 上海恒达(5%) + 杭州德凡(6%)');

  // 客户
  console.log('\n--- 客户 ---');
  const c1 = (await db.query(`INSERT INTO customer (id,customer_no,customer_name,phone,province,city,district,address,status)
    VALUES ('c1000001-0001-0001-0001-000000000001','C20260401','张伟','18900189001','上海','上海市','浦东新区','浦东张江科技路123号','ordered') RETURNING id`)).rows[0].id;
  const c2 = (await db.query(`INSERT INTO customer (id,customer_no,customer_name,phone,province,city,district,address,status)
    VALUES ('c2000002-0002-0002-0002-000000000002','C20260402','刘洋','18900189002','浙江','杭州市','西湖区','杭州文一路456号','ordered') RETURNING id`)).rows[0].id;
  const c3 = (await db.query(`INSERT INTO customer (id,customer_no,customer_name,phone,province,city,district,address,status)
    VALUES ('c3000003-0003-0003-0003-000000000003','C20260403','陈明','18900189003','江苏','南京市','鼓楼区','南京中山北路789号','ordered') RETURNING id`)).rows[0].id;
  console.log('  ✓ 3个客户');

  // 供应商
  console.log('\n--- 供应商 ---');
  const s1 = (await db.query(`INSERT INTO supplier (id,supplier_code,supplier_name,contact_person,phone,province,city,district,address,supply_category,status)
    VALUES ('550e8400-e29b-41d4-a716-446655440001','SUP202601','上海建材供应链公司','周经理','15000150001','上海','上海市','','上海浦东工业园','panel','active') RETURNING id`)).rows[0].id;
  const s2 = (await db.query(`INSERT INTO supplier (id,supplier_code,supplier_name,contact_person,phone,province,city,district,address,supply_category,status)
    VALUES ('550e8400-e29b-41d4-a716-446655440002','SUP202602','浙江五金批发中心','吴总','15000150002','浙江','杭州市','','杭州江干工业园','hardware','active') RETURNING id`)).rows[0].id;
  console.log('  ✓ 2个供应商');

  // 物料
  console.log('\n--- 物料 ---');
  const m1 = (await db.query(`INSERT INTO material (id,material_code,material_name,category,specification,unit,unit_price,safe_stock,min_stock,supplier_id,supplier_name,status)
    VALUES ('660e8400-e29b-41d4-a716-446655440001','MAT001','16mm不锈钢橱柜板','panel','1220x2440mm','张',680,150,20,'${s1}','上海建材供应链公司','active') RETURNING id`)).rows[0].id;
  const m2 = (await db.query(`INSERT INTO material (id,material_code,material_name,category,specification,unit,unit_price,safe_stock,min_stock,supplier_id,supplier_name,status)
    VALUES ('660e8400-e29b-41d4-a716-446655440002','MAT002','18mm防水板','panel','1220x2440mm','张',820,80,15,'${s1}','上海建材供应链公司','active') RETURNING id`)).rows[0].id;
  const m3 = (await db.query(`INSERT INTO material (id,material_code,material_name,category,specification,unit,unit_price,safe_stock,min_stock,supplier_id,supplier_name,status)
    VALUES ('660e8400-e29b-41d4-a716-446655440003','MAT003','304不锈钢台面','countertop','600mm宽','米',380,200,30,'${s2}','浙江五金批发中心','active') RETURNING id`)).rows[0].id;
  const m4 = (await db.query(`INSERT INTO material (id,material_code,material_name,category,specification,unit,unit_price,safe_stock,min_stock,supplier_id,supplier_name,status)
    VALUES ('660e8400-e29b-41d4-a716-446655440004','MAT004','BLUM铰链','hardware','HETTICH标准','个',28,500,50,'${s2}','浙江五金批发中心','active') RETURNING id`)).rows[0].id;
  const m5 = (await db.query(`INSERT INTO material (id,material_code,material_name,category,specification,unit,unit_price,safe_stock,min_stock,supplier_id,supplier_name,status)
    VALUES ('660e8400-e29b-41d4-a716-446655440005','MAT005','LED灯带','electrical','12V 5米/卷','卷',95,60,10,'${s2}','浙江五金批发中心','active') RETURNING id`)).rows[0].id;
  console.log('  ✓ 5种物料');

  // 生产阶段
  console.log('\n--- 生产阶段 ---');
  await db.query(`
    INSERT INTO production_stage (stage,stage_name,stage_order,next_stage,prev_stage,default_status,estimated_hours,daily_capacity) VALUES
    ('order_confirmed','订单确认',1,'design_confirmed',NULL,'pending',1.0,100),
    ('design_confirmed','设计确认',2,'material_prepared','order_confirmed','pending',4.0,50),
    ('material_prepared','材料准备',3,'cutting','design_confirmed','pending',2.0,80),
    ('cutting','切割加工',4,'assembly','material_prepared','pending',6.0,30),
    ('assembly','组装焊接',5,'polishing','cutting','pending',8.0,20),
    ('polishing','抛光打磨',6,'quality_check','assembly','pending',3.0,40),
    ('quality_check','质量检验',7,'packaging','polishing','pending',1.0,100),
    ('packaging','包装入库',8,'shipped','quality_check','pending',1.5,60),
    ('shipped','已发货',9,'installed','packaging','pending',0,0),
    ('installed','已安装',10,'completed','shipped','pending',0,0),
    ('completed','已完成',11,NULL,'installed','pending',0,0)
    ON CONFLICT (stage) DO UPDATE SET estimated_hours=EXCLUDED.estimated_hours,daily_capacity=EXCLUDED.daily_capacity
  `);
  console.log('  ✓ 11个生产阶段');

  // 费用池
  console.log('\n--- 费用池 ---');
  const pools = [['MFG001','生产工人工资','manufacturing'],['MFG002','生产水电费','manufacturing'],['MFG003','设备折旧费','manufacturing'],['MFG004','生产房租','manufacturing'],['MFG005','工具损耗','manufacturing'],['MFG006','包装材料','manufacturing'],['MFG007','运输费','manufacturing'],['MGT001','管理费用','management'],['SALES001','销售费用','sales']];
  for (const [code,name,cat] of pools) { try { await db.query(`INSERT INTO cost_allocation_pool (id,pool_code,pool_name,pool_category,status) VALUES (gen_random_uuid(),$1,$2,$3,'active') ON CONFLICT (pool_code) DO NOTHING`, [code,name,cat]); } catch(e) {} }
  console.log('  ✓ 9个费用项目');

  // 订单（用实际字段）
  console.log('\n--- 订单 ---');
  const orders = [
    { id:'880e4da3-0001-0001-0001-000000000001', no:'F20260420001', dealer:d1, customer:c1, status:'producing', amount:25000, deposit:10000, address:'浦东张江科技路123号', contact:'张伟', phone:'18900189001', delivery:'2026-05-15' },
    { id:'880e4da3-0002-0002-0002-000000000002', no:'F20260420002', dealer:d2, customer:c2, status:'producing', amount:38000, deposit:15000, address:'杭州文一路456号', contact:'刘洋', phone:'18900189002', delivery:'2026-05-20' },
    { id:'880e4da3-0003-0003-0003-000000000003', no:'F20260420003', dealer:d1, customer:c3, status:'shipped', amount:18500, deposit:8000, address:'南京中山北路789号', contact:'陈明', phone:'18900189003', delivery:'2026-05-10' },
    { id:'880e4da3-0004-0004-0004-000000000004', no:'F20260420004', dealer:null, customer:c1, status:'draft', amount:12000, deposit:0, address:'浦东张江科技路123号', contact:'张伟', phone:'18900189001', delivery:'2026-06-01' },
  ];
  for (const o of orders) {
    const qr = 'ORDER:' + o.no;
    await db.query(`INSERT INTO order_master (id,order_no,qr_code,source_type,dealer_id,customer_id,order_status,total_amount,deposit_amount,balance_amount,expected_delivery,delivery_address,delivery_contact,delivery_phone,installation_required,priority,schedule_status,estimated_hours,created_at)
      VALUES ($1,$2,$3,'dealer',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())`,
      [o.id, o.no, qr, o.dealer, o.customer, o.status, String(o.amount), String(o.deposit), String(o.amount-o.deposit), o.delivery, o.address, o.contact, o.phone, 'true', 'normal', 'scheduled', '28.0']);
    console.log('  ✓ ' + o.no + ' | ¥' + o.amount + ' | ' + o.status);
  }

  // 板件
  console.log('\n--- 板件 ---');
  const boards = [
    ['770e4da3-0001-0001-0001-000000000001',orders[0].id,'B-F20260420001-01','左侧板','侧板','不锈钢','银色','scanned','切割车间'],
    ['770e4da3-0002-0002-0002-000000000002',orders[0].id,'B-F20260420001-02','右侧板','侧板','不锈钢','银色','pending','切割车间'],
    ['770e4da3-0003-0003-0003-000000000003',orders[0].id,'B-F20260420001-03','顶板','顶板','不锈钢','银色','pending','切割车间'],
    ['770e4da3-0004-0004-0004-000000000004',orders[1].id,'B-F20260420002-01','底板','底板','防水板','白色','scanned','组装车间'],
    ['770e4da3-0005-0005-0005-000000000005',orders[1].id,'B-F20260420002-02','背板','背板','防水板','白色','scanned','组装车间'],
    ['770e4da3-0006-0006-0006-000000000006',orders[1].id,'B-F20260420002-03','门板','门板','防水板','白色','pending','组装车间'],
    ['770e4da3-0007-0007-0007-000000000007',orders[2].id,'B-F20260420003-01','主箱体板','箱体','防水板','白色','scanned','已发货'],
    ['770e4da3-0008-0008-0008-000000000008',orders[2].id,'B-F20260420003-02','台面板','台面','不锈钢','银色','scanned','已发货'],
  ];
  for (const [id,oid,no,name,boardType,material,color,status,loc] of boards) {
    await db.query(`INSERT INTO cabinet_board (id,order_id,barcode,board_no,cabinet_no,cabinet_name,board_name,board_type,material,color,length,width,thickness,quantity,status,current_location,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())`,
      [id,oid,'BC:'+no.slice(0,8),no,'CAB-'+no.slice(-3),'橱柜'+no.slice(-3),name,boardType,material,color,'600','720','16',1,status,loc]);
  }
  console.log('  ✓ ' + boards.length + '块板件（已扫描4块）');

  // BOM
  console.log('\n--- BOM ---');
  const bomItems = [
    [orders[0].id,'MAT001','16mm不锈钢板','板材','1220x2440mm','张',8,680],
    [orders[0].id,'MAT002','18mm防水板','板材','1220x2440mm','张',4,820],
    [orders[0].id,'MAT004','BLUM铰链','五金','HETTICH标准','个',24,28],
    [orders[1].id,'MAT001','16mm不锈钢板','板材','1220x2440mm','张',12,680],
    [orders[1].id,'MAT003','304台面','台面','600mm宽','米',6,380],
    [orders[1].id,'MAT004','BLUM铰链','五金','HETTICH标准','个',32,28],
    [orders[2].id,'MAT002','18mm防水板','板材','1220x2440mm','张',6,820],
    [orders[2].id,'MAT005','LED灯带','电气','12V 5米/卷','卷',3,95],
    [orders[3].id,'MAT001','16mm不锈钢板','板材','1220x2440mm','张',5,680],
    [orders[3].id,'MAT004','BLUM铰链','五金','HETTICH标准','个',16,28],
  ];
  for (const [oid,mcode,mname,mtype,spec,unit,qty,price] of bomItems) {
    await db.query(`INSERT INTO order_bom (id,order_id,material_code,material_name,material_type,specification,unit,quantity,unit_price,total_price,created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`, [oid,mcode,mname,mtype,spec,unit,qty,price,qty*price]);
  }
  console.log('  ✓ ' + bomItems.length + '条BOM');

  // 排程（用 scheduled_date + stage）
  console.log('\n--- 排程 ---');
  await db.query(`
    INSERT INTO production_schedule (id,schedule_no,order_id,stage,scheduled_date,estimated_hours,status,priority) VALUES
    (gen_random_uuid(),'SCH20260420001','${orders[0].id}','cutting','2026-04-21',6.0,'scheduled',1),
    (gen_random_uuid(),'SCH20260420002','${orders[0].id}','assembly','2026-04-22',8.0,'scheduled',1),
    (gen_random_uuid(),'SCH20260420003','${orders[1].id}','assembly','2026-04-21',8.0,'scheduled',1),
    (gen_random_uuid(),'SCH20260420004','${orders[1].id}','polishing','2026-04-23',3.0,'scheduled',1),
    (gen_random_uuid(),'SCH20260420005','${orders[2].id}','shipped','2026-05-08',0,'completed',1)`);
  console.log('  ✓ 5条排程');

  // 应收款（accounts_receivable 有 order_no, customer_name 字段）
  console.log('\n--- 应收款 ---');
  await db.query(`
    INSERT INTO accounts_receivable (id,order_id,order_no,customer_id,customer_name,total_amount,paid_amount,balance_amount,due_date,payment_status,created_at) VALUES
    (gen_random_uuid(),'${orders[0].id}','${orders[0].no}','${c1}','张伟',25000,10000,15000,'2026-06-20','partially_paid',NOW()),
    (gen_random_uuid(),'${orders[1].id}','${orders[1].no}','${c2}','刘洋',38000,15000,23000,'2026-06-25','partially_paid',NOW()),
    (gen_random_uuid(),'${orders[2].id}','${orders[2].no}','${c3}','陈明',18500,8000,10500,'2026-06-15','partially_paid',NOW())`);
  console.log('  ✓ 3条应收款（总欠¥48,500）');

  // 成本（用实际字段）
  console.log('\n--- 成本汇总 ---');
  const cost1=8*680+4*820+24*28, labor1=28*35, over1=labor1*0.3, total1=cost1+labor1+over1;
  await db.query(`INSERT INTO order_cost_summary (id,order_id,order_no,cost_period,material_cost,labor_cost,labor_hours,manufacturing_overhead,total_cost,order_amount,gross_profit,gross_margin,calculated_at)
    VALUES (gen_random_uuid(),'${orders[0].id}','${orders[0].no}','2026-04',${cost1},${labor1},28,${over1},${total1},25000,${25000-total1},round(${25000-total1}.0/25000,2),NOW())`);
  const cost2=12*680+6*380+32*28, labor2=28*35, over2=labor2*0.3, total2=cost2+labor2+over2;
  await db.query(`INSERT INTO order_cost_summary (id,order_id,order_no,cost_period,material_cost,labor_cost,labor_hours,manufacturing_overhead,total_cost,order_amount,gross_profit,gross_margin,calculated_at)
    VALUES (gen_random_uuid(),'${orders[1].id}','${orders[1].no}','2026-04',${cost2},${labor2},28,${over2},${total2},38000,${38000-total2},round(${38000-total2}.0/38000,2),NOW())`);
  console.log('  ✓ 订单1毛利¥' + (25000-total1) + '（33%）订单2毛利¥' + (38000-total2) + '（41%）');

  // 佣金（用实际字段）
  console.log('\n--- 佣金 ---');
  await db.query(`INSERT INTO dealer_commission (id,commission_no,dealer_id,order_id,order_no,order_amount,commission_rate,commission_amount,status,created_at)
    VALUES (gen_random_uuid(),'COMM20260420001','${d1}','${orders[0].id}','${orders[0].no}',25000,0.05,1250,'pending',NOW())`);
  await db.query(`INSERT INTO dealer_commission (id,commission_no,dealer_id,order_id,order_no,order_amount,commission_rate,commission_amount,status,created_at)
    VALUES (gen_random_uuid(),'COMM20260420002','${d2}','${orders[1].id}','${orders[1].no}',38000,0.06,2280,'pending',NOW())`);
  await db.query(`INSERT INTO dealer_commission (id,commission_no,dealer_id,order_id,order_no,order_amount,commission_rate,commission_amount,status,settled_at,created_at)
    VALUES (gen_random_uuid(),'COMM20260420003','${d1}','${orders[2].id}','${orders[2].no}',18500,0.05,925,'settled',NOW(),'2026-04-28')`);
  console.log('  ✓ 3条佣金（pending×2 + settled×1）');

  // 工时（用 production_stage 字段）
  console.log('\n--- 工时 ---');
  try {
    const emp = await db.query('SELECT id FROM employee LIMIT 1');
    if (emp.rows[0]?.id) {
      await db.query(`INSERT INTO work_hours_record (id,record_no,employee_id,order_id,order_no,production_stage,work_date,hours,efficiency,labor_cost,created_at) VALUES
        (gen_random_uuid(),'WR20260421001','${emp.rows[0].id}','${orders[0].id}','${orders[0].no}','cutting','2026-04-21',6.0,1.0,210,NOW()),
        (gen_random_uuid(),'WR20260422001','${emp.rows[0].id}','${orders[0].id}','${orders[0].no}','assembly','2026-04-22',7.5,1.1,262.5,NOW()),
        (gen_random_uuid(),'WR20260421002','${emp.rows[0].id}','${orders[1].id}','${orders[1].no}','assembly','2026-04-21',8.0,1.0,280,NOW())`);
      console.log('  ✓ 3条工时记录');
    } else { console.log('  ⚠ 无员工，跳过'); }
  } catch(e) { console.log('  ⚠ employee表不存在'); }

  console.log('\n=== ✅ 数据重建完成 ===');
  process.exit(0);
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
