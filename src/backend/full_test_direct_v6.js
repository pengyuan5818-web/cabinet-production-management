/**
 * 橱柜工厂管理系统 - 完整端到端测试脚本 V6
 * 覆盖：部门→员工→客户→供应商→仓库→材料→订单→入库→库存→生产→包装→物流→安装→考勤→财务→报表
 */
const db = require('./src/db');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function ri(m, M) { return Math.floor(Math.random() * (M - m + 1)) + m; }
function rf(m, M) { return Number((Math.random() * (M - m) + m).toFixed(2)); }

async function sl(ms) { return new Promise(r => setTimeout(r, ms)); }

// ==========================================
// 1. 清空所有数据
// ==========================================
async function clearAllData() {
    console.log('\n========== 1. 清空所有数据 ==========');
    const tables = [
        'logistics_track', 'installer_allocation', 'installation_progress',
        'package_item', 'package_record', 'logistics_record',
        'installation_task', 'countertop_production', 'door_panel_production',
        'order_bom', 'order_tracking', 'order_detail', 'order_master',
        'stock_out', 'stock_in', 'stock_inventory', 'material_bom',
        'production_schedule', 'production_worker',
        'material', 'supplier', 'warehouse',
        'customer_follow', 'design_record', 'quote', 'quote_detail',
        'receivable', 'payment_in', 'payable', 'payment_out',
        'attendance_record', 'leave_application', 'overtime_record',
        'invoice', 'fund_flow', 'inventory_transaction'
    ];
    const c = await db.getClient();
    try {
        await c.query('BEGIN');
        for (const t of tables) { try { await c.query('DELETE FROM ' + t); } catch (e) {} }
        try { await c.query("DELETE FROM employee WHERE employee_name NOT IN ('admin')"); } catch (e) {}
        try { await c.query("DELETE FROM department WHERE dept_code LIKE '%T%'"); } catch (e) {}
        try { await c.query('DELETE FROM customer'); } catch (e) {}
        try { await c.query("DELETE FROM supplier WHERE supplier_code LIKE '%T%'"); } catch (e) {}
        try { await c.query("DELETE FROM warehouse WHERE warehouse_code LIKE '%T%'"); } catch (e) {}
        await c.query('COMMIT');
        console.log('OK: 清空完成');
    } catch (e) { await c.query('ROLLBACK'); } finally { c.release(); }
}

// ==========================================
// 2. 部门+员工
// ==========================================
async function createBasic() {
    console.log('\n========== 2. 部门+员工 ==========');
    const ts = Date.now().toString().slice(-4);
    const deptIds = {};
    const c = await db.getClient();
    const empIds = [];
    try {
        await c.query('BEGIN');
        const depts = [
            { name: '销售部T', code: 'SA' + ts, type: 'sales' },
            { name: '设计部T', code: 'DE' + ts, type: 'design' },
            { name: '生产部T', code: 'PR' + ts, type: 'production' },
            { name: '仓储部T', code: 'WA' + ts, type: 'warehouse' },
            { name: '物流部T', code: 'LO' + ts, type: 'logistics' },
            { name: '安装部T', code: 'IN' + ts, type: 'installation' },
            { name: '财务部T', code: 'FI' + ts, type: 'admin' },
            { name: '人事部T', code: 'HR' + ts, type: 'admin' }
        ];
        for (const d of depts) {
            const id = uuid();
            await c.query(
                `INSERT INTO department (id,dept_name,dept_code,dept_type,status,created_at) VALUES ($1,$2,$3,$4,'active',NOW())`,
                [id, d.name, d.code, d.type]
            );
            deptIds[d.code] = id;
        }
        const emps = [
            { n: '张三', p: '13800003001', d: 'SA' + ts, pos: '销售经理' },
            { n: '李四', p: '13800003002', d: 'SA' + ts, pos: '销售员' },
            { n: '王五', p: '13800003003', d: 'DE' + ts, pos: '设计师' },
            { n: '赵六', p: '13800003004', d: 'DE' + ts, pos: '设计经理' },
            { n: '钱七', p: '13800003005', d: 'PR' + ts, pos: '生产主管' },
            { n: '孙八', p: '13800003006', d: 'PR' + ts, pos: '生产工人' },
            { n: '周九', p: '13800003007', d: 'WA' + ts, pos: '仓库管理员' },
            { n: '吴十', p: '13800003008', d: 'LO' + ts, pos: '物流司机' },
            { n: '郑一', p: '13800003009', d: 'IN' + ts, pos: '安装工' },
            { n: '王二', p: '13800003010', d: 'IN' + ts, pos: '安装队长' },
            { n: '冯三', p: '13800003011', d: 'FI' + ts, pos: '会计' },
            { n: '陈五', p: '13800003012', d: 'HR' + ts, pos: '人事专员' }
        ];
        for (const e of emps) {
            const id = uuid();
            await c.query(
                `INSERT INTO employee (id,employee_no,employee_name,phone,dept_id,position,employee_type,hire_date,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,'full_time',CURRENT_DATE,'active',NOW())`,
                [id, 'EP' + Date.now() + ri(100, 999), e.n, e.p, deptIds[e.d], e.pos]
            );
            empIds.push({ id, name: e.n });
        }
        await c.query('COMMIT');
        console.log('OK: 部门' + depts.length + '个, 员工' + empIds.length + '人');
        return { deptIds, empIds };
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 基础数据:', err.message); return { deptIds: {}, empIds: [] }; }
    finally { c.release(); }
}

// ==========================================
// 3. 客户
// ==========================================
async function createCustomers() {
    console.log('\n========== 3. 客户 ==========');
    const c = await db.getClient();
    const ids = [];
    try {
        await c.query('BEGIN');
        const custs = [
            { n: '张先生', p: '13700003001', a: '广州市天河区珠江新城' },
            { n: '李女士', p: '13700003002', a: '深圳市南山区科技园' },
            { n: '王先生', p: '13700003003', a: '佛山市顺德区大良镇' },
            { n: '赵先生', p: '13700003004', a: '东莞市南城区鸿福路' },
            { n: '刘女士', p: '13700003005', a: '惠州市惠城区江北' }
        ];
        for (const cust of custs) {
            const id = uuid();
            await c.query(
                `INSERT INTO customer (id,customer_no,customer_name,phone,address,status,source,created_at) VALUES ($1,$2,$3,$4,$5,'following','测试',NOW())`,
                [id, 'C' + Date.now() + ri(100, 999), cust.n, cust.p, cust.a]
            );
            ids.push(id);
        }
        await c.query('COMMIT');
        console.log('OK: 客户' + ids.length + '个');
        return ids;
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 客户:', err.message); return []; }
    finally { c.release(); }
}

// ==========================================
// 4. 供应商
// ==========================================
async function createSuppliers() {
    console.log('\n========== 4. 供应商 ==========');
    const c = await db.getClient();
    const ids = [];
    try {
        await c.query('BEGIN');
        const sups = [
            { n: '宝钢不锈钢T', c: '陈经理', p: '13900001001', cat: '不锈钢板' },
            { n: '海德威配件T', c: '林经理', p: '13900001002', cat: '五金配件' },
            { n: '华润板材T', c: '周经理', p: '13900001003', cat: '板材' }
        ];
        for (const s of sups) {
            const id = uuid();
            await c.query(
                `INSERT INTO supplier (id,supplier_code,supplier_name,contact_person,phone,status,supply_category,created_at) VALUES ($1,$2,$3,$4,$5,'active',$6,NOW())`,
                [id, 'SUP' + Date.now() + ri(100, 999), s.n, s.c, s.p, s.cat]
            );
            ids.push({ id, name: s.n });
        }
        await c.query('COMMIT');
        console.log('OK: 供应商' + ids.length + '个');
        return ids;
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 供应商:', err.message); return []; }
    finally { c.release(); }
}

// ==========================================
// 5. 仓库
// ==========================================
async function createWarehouses() {
    console.log('\n========== 5. 仓库 ==========');
    const c = await db.getClient();
    const ids = [];
    try {
        await c.query('BEGIN');
        const ts2 = Date.now().toString().slice(-4);
        const ws = [{ n: '广州总仓T', code: 'WH001T' + ts2 }, { n: '佛山分仓T', code: 'WH002T' + ts2 }];
        for (const w of ws) {
            const id = uuid();
            await c.query(
                `INSERT INTO warehouse (id,warehouse_code,warehouse_name,warehouse_type,province,city,district,address,status,created_at) VALUES ($1,$2,$3,'main','广东省','广州市','白云区','广州市白云区钟落潭','active',NOW())`,
                [id, w.code, w.n]
            );
            ids.push(id);
        }
        await c.query('COMMIT');
        console.log('OK: 仓库' + ids.length + '个');
        return ids;
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 仓库:', err.message); return []; }
    finally { c.release(); }
}

// ==========================================
// 6. 材料
// ==========================================
async function createMaterials(supIds) {
    console.log('\n========== 6. 材料 ==========');
    const c = await db.getClient();
    const ids = [];
    try {
        await c.query('BEGIN');
        const mats = [
            { code: 'MAT-SS-001T', n: '不锈钢板304 1.5mm', cat: '不锈钢板', spec: '1.5mm*1220*2440', u: '张', price: 380 },
            { code: 'MAT-SS-002T', n: '不锈钢板304 2.0mm', cat: '不锈钢板', spec: '2.0mm*1220*2440', u: '张', price: 520 },
            { code: 'MAT-AC-001T', n: '铝合金门框料', cat: '铝合金', spec: '6063-T5', u: '米', price: 45 },
            { code: 'MAT-GL-001T', n: '钢化玻璃8mm', cat: '玻璃', spec: '8mm*2000*1000', u: '平方米', price: 180 },
            { code: 'MAT-HW-001T', n: '不锈钢铰链', cat: '五金', spec: '304#', u: '个', price: 12 },
            { code: 'MAT-HW-002T', n: '门锁套装', cat: '五金', spec: '银色', u: '套', price: 85 }
        ];
        for (const m of mats) {
            const id = uuid();
            const sup = supIds[ri(0, supIds.length - 1)];
            await c.query(
                `INSERT INTO material (id,material_code,material_name,category,specification,unit,unit_price,safe_stock,min_stock,supplier_id,supplier_name,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,100,20,$8,$9,'active',NOW())`,
                [id, m.code, m.n, m.cat, m.spec, m.u, m.price, sup ? sup.id : uuid(), m.n.split(' ')[0]]
            );
            ids.push({ id, code: m.code, name: m.n, price: m.price });
        }
        await c.query('COMMIT');
        console.log('OK: 材料' + ids.length + '种');
        return ids;
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 材料:', err.message); return []; }
    finally { c.release(); }
}

// ==========================================
// 7. 订单（含明细+追踪）
// ==========================================
async function createOrders(custIds) {
    console.log('\n========== 7. 订单 ==========');
    const c = await db.getClient();
    const ids = [];
    try {
        await c.query('BEGIN');
        for (let i = 0; i < custIds.length; i++) {
            const orderId = uuid();
            const totalAmount = rf(15000, 45000);
            const deposit = Number((totalAmount * 0.3).toFixed(2));
            const bal = Number((totalAmount - deposit).toFixed(2));
            const orderNo = 'O' + Date.now() + i;
            await c.query(
                `INSERT INTO order_master (id,order_no,customer_id,order_status,total_amount,deposit_amount,balance_amount,expected_delivery,created_at) VALUES ($1,$2,$3,'producing',$4,$5,$6,CURRENT_DATE+15,NOW())`,
                [orderId, orderNo, custIds[i], totalAmount, deposit, bal]
            );
            const cabCount = ri(2, 4);
            for (let j = 0; j < cabCount; j++) {
                const unitPrice = rf(2000, 5000);
                const qty = ri(1, 3);
                const amount = Number((unitPrice * qty).toFixed(2));
                await c.query(
                    `INSERT INTO order_detail (id,order_id,product_name,product_type,cabinet_count,material,color,length,width,height,unit_price,quantity,amount) VALUES ($1,$2,$3,'橱柜',1,'不锈钢','银色',1000,600,2000,$4,$5,$6)`,
                    [uuid(), orderId, '橱柜' + (j + 1), unitPrice, qty, amount]
                );
            }
            const stages = ['订单确认', '设计拆单', '材料准备', '开料切割', '封边处理', '钻孔加工', '组装检验', '包装入库'];
            for (let s = 0; s < stages.length; s++) {
                const stageName = stages[s];
                const statusVal = s < 7 ? 'completed' : 'in_progress';
                const startDays = (8 - s).toString();
                const compDays = (7 - s).toString();
                await c.query(
                    `INSERT INTO order_tracking (id,order_id,current_stage,stage_name,stage_status,started_at,completed_at) VALUES ($1,$2,$3::text,$3::text,$4::text,CURRENT_TIMESTAMP-($5||' days')::interval,CASE WHEN $4='completed' THEN CURRENT_TIMESTAMP-($6||' days')::interval ELSE NULL END)`,
                    [uuid(), orderId, stageName, statusVal, startDays, compDays]
                );
            }
            ids.push({ id: orderId, no: orderNo });
            console.log('OK 订单: ' + orderNo + ' (' + cabCount + '柜, ¥' + totalAmount.toFixed(2) + ')');
        }
        await c.query('COMMIT');
        console.log('OK: 订单' + ids.length + '个');
        return ids;
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 订单:', err.message); return []; }
    finally { c.release(); }
}

// ==========================================
// 8. 入库+库存
// ==========================================
async function createStockIn(matIds, whIds, supIds) {
    console.log('\n========== 8. 入库+库存 ==========');
    const c = await db.getClient();
    try {
        await c.query('BEGIN');
        for (const mat of matIds) {
            const qty = ri(50, 200);
            const amount = Number((qty * mat.price).toFixed(2));
            const sup = supIds[0] || supIds;
            await c.query(
                `INSERT INTO stock_in (id,stock_in_no,warehouse_id,supplier_id,batch_no,total_amount,created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()-INTERVAL'1 days')`,
                [uuid(), 'IN' + Date.now() + ri(100, 999), whIds[0], sup.id || supIds[0], 'BATCH' + Date.now(), amount]
            );
            await c.query(
                `INSERT INTO stock_inventory (id,warehouse_id,material_id,quantity,locked_quantity,last_in_date,created_at,updated_at) VALUES ($1,$2,$3,$4,0,CURRENT_DATE,NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=stock_inventory.quantity+$4,last_in_date=CURRENT_DATE,updated_at=NOW()`,
                [uuid(), whIds[0], mat.id, qty]
            );
            console.log('OK 入库: ' + mat.name + ' x' + qty);
        }
        await c.query('COMMIT');
        console.log('OK: 入库+库存完成');
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 入库:', err.message); }
    finally { c.release(); }
}

// ==========================================
// 9. 生产记录（门板+台面+排期）
// ==========================================
async function createProduction(orders) {
    console.log('\n========== 9. 生产记录 ==========');
    const c = await db.getClient();
    try {
        await c.query('BEGIN');
        for (const order of orders) {
            const doorId = uuid();
            await c.query(
                `INSERT INTO door_panel_production (id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_complete,current_location,created_at) VALUES ($1,$2,$3,'标准门板',800,600,18,25.5,2,'304不锈钢','银色','拉丝',true,true,6,'粉末喷涂','银色',180,30,'completed',CURRENT_TIMESTAMP-INTERVAL'3 days',CURRENT_TIMESTAMP,'仓库A区',NOW())`,
                [doorId, order.id, 'D' + Date.now() + ri(100, 999)]
            );
            const ctId = uuid();
            await c.query(
                `INSERT INTO countertop_production (id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_complete,current_location,created_at) VALUES ($1,$2,$3,'石英石台面','石英石',2000,600,15,'白色','磨边',true,true,1,'completed',CURRENT_TIMESTAMP-INTERVAL'2 days',CURRENT_TIMESTAMP,'仓库B区',NOW())`,
                [ctId, order.id, 'CT' + Date.now() + ri(100, 999)]
            );
            const schId = uuid();
            await c.query(
                `INSERT INTO production_schedule (id,schedule_no,order_id,schedule_date,priority,status,stage,scheduled_date,estimated_hours,created_at) VALUES ($1,$2,$3,CURRENT_DATE,3,'scheduled','cutting',CURRENT_DATE+1,8,NOW())`,
                [schId, 'SCH' + Date.now() + ri(100, 999), order.id]
            );
            console.log('OK 生产: ' + order.no + ' -> 门板+台面+排期');
        }
        await c.query('COMMIT');
        console.log('OK: 生产记录' + orders.length + '条');
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 生产:', err.message); }
    finally { c.release(); }
}

// ==========================================
// 10. 包装
// ==========================================
async function createPackages(orders) {
    console.log('\n========== 10. 包装 ==========');
    const c = await db.getClient();
    const pkgIds = [];
    try {
        await c.query('BEGIN');
        for (const order of orders) {
            const pkgId = uuid();
            await c.query(
                `INSERT INTO package_record (id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,longest_length,total_volume,status,scan_operator_name,scan_time,storage_area,storage_position,created_at) VALUES ($1,$2,$3,'纸箱包装','木架加固',$4,$5,$6,120,$7,'stored','周九',CURRENT_TIMESTAMP-INTERVAL'1 days','A区','A-01',NOW())`,
                [pkgId, 'PK' + Date.now() + ri(100, 999), order.id, ri(3, 8), ri(5, 15), Number(rf(50, 200).toFixed(1)), Number(rf(1, 5).toFixed(2))]
            );
            for (let i = 0; i < ri(3, 6); i++) {
                await c.query(
                    `INSERT INTO package_item (id,package_id,product_name,product_type,quantity,weight,length,width,height,scanned,barcode,created_at) VALUES ($1,$2,$3,'橱柜',$4,$5,800,600,2000,true,$6,NOW())`,
                    [uuid(), pkgId, '橱柜部件' + (i + 1), ri(1, 3), Number(rf(5, 30).toFixed(1)), 'BC' + Date.now() + i]
                );
            }
            pkgIds.push({ id: pkgId, orderId: order.id, no: order.no });
            console.log('OK 包装: ' + order.no);
        }
        await c.query('COMMIT');
        console.log('OK: 包装' + pkgIds.length + '条');
        return pkgIds;
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 包装:', err.message); return []; }
    finally { c.release(); }
}

// ==========================================
// 11. 物流
// ==========================================
async function createLogistics(packages) {
    console.log('\n========== 11. 物流 ==========');
    const c = await db.getClient();
    try {
        await c.query('BEGIN');
        for (const pkg of packages) {
            const logId = uuid();
            await c.query(
                `INSERT INTO logistics_record (id,logistics_no,order_id,logistics_company,logistics_no_ext,driver_name,driver_phone,send_province,send_city,send_district,send_address,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,freight,insured_amount,status,package_count,total_weight,ship_date,estimate_arrive,created_at) VALUES ($1,$2,$3,'德邦物流',$4,'吴十','13800003008','广东省','广州市','白云区','广州市白云区钟落潭','广东省','深圳市','南山区','深圳市南山区科技园','李女士','13700003002',350,5000,'in_transit',$5,$6,CURRENT_DATE-2,CURRENT_DATE+3,NOW())`,
                [logId, 'LG' + Date.now() + ri(100, 999), pkg.orderId, 'DP' + Date.now() + ri(1000, 9999), ri(3, 8), Number(rf(80, 200).toFixed(1))]
            );
            const tracks = [
                { loc: '广州白云区', status: '已揽收', desc: '货物已从广州发出' },
                { loc: '广州转运中心', status: '运输中', desc: '到达广州转运中心' },
                { loc: '深圳转运中心', status: '运输中', desc: '到达深圳转运中心' }
            ];
            for (let t = 0; t < tracks.length; t++) {
                const daysAgo = (tracks.length - t).toString();
                await c.query(
                    `INSERT INTO logistics_track (id,logistics_record_id,track_time,location,status,description) VALUES ($1,$2,CURRENT_TIMESTAMP-($3||' days')::interval,$4,$5,$6)`,
                    [uuid(), logId, daysAgo, tracks[t].loc, tracks[t].status, tracks[t].desc]
                );
            }
            console.log('OK 物流: ' + pkg.no + ' -> 深圳（运输中）');
        }
        await c.query('COMMIT');
        console.log('OK: 物流' + packages.length + '条');
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 物流:', err.message); }
    finally { c.release(); }
}

// ==========================================
// 12. 安装任务
// ==========================================
async function createInstallation(orders) {
    console.log('\n========== 12. 安装任务 ==========');
    const c = await db.getClient();
    try {
        const empR = await c.query(`SELECT id FROM employee WHERE dept_id IN (SELECT id FROM department WHERE dept_type='installation') LIMIT 5`);
        const instEmps = empR.rows;
        await c.query('BEGIN');
        for (let i = 0; i < Math.min(3, orders.length); i++) {
            const order = orders[i];
            const taskId = uuid();
            const leader = instEmps[0] || { id: uuid() };
            await c.query(
                `INSERT INTO installation_task (id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,appointment_date,appointment_remark,leader_id,leader_name,status,actual_start,accept_status,created_at) VALUES ($1,$2,$3,'广东省','深圳市','南山区','深圳市南山区科技园','李女士','13700003002',CURRENT_DATE+5,'请提前联系',$4,'王二','in_progress',CURRENT_TIMESTAMP-INTERVAL'1 days','pending',NOW())`,
                [taskId, 'INS' + Date.now() + ri(100, 999), order.id, leader.id]
            );
            for (let j = 0; j < Math.min(2, instEmps.length); j++) {
                await c.query(
                    `INSERT INTO installer_allocation (id,task_id,employee_id,employee_name,role,work_date,work_hours,overtime_hours,allowance) VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7,$8)`,
                    [uuid(), taskId, instEmps[j].id, j === 0 ? '王二' : '郑一', j === 0 ? '队长' : '工人', Number(rf(7.5, 9).toFixed(1)), Number(rf(0, 2).toFixed(1)), ri(50, 150)]
                );
            }
            const stages = ['上门勘测', '材料到场', '框架安装', '面板安装', '调试检验', '交付验收'];
            for (let s = 0; s < stages.length; s++) {
                await c.query(
                    `INSERT INTO installation_progress (id,task_id,progress,stage,stage_name,description) VALUES ($1,$2,$3,$4,$5,$6)`,
                    [uuid(), taskId, Math.round((s + 1) * 100 / 6), s + 1, stages[s], s < 4 ? '已完成' : '进行中']
                );
            }
            console.log('OK 安装: ' + order.no + ' -> 王二带队');
        }
        await c.query('COMMIT');
        console.log('OK: 安装任务' + Math.min(3, orders.length) + '条');
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 安装:', err.message); }
    finally { c.release(); }
}

// ==========================================
// 13. 考勤
// ==========================================
async function createAttendance(emps) {
    console.log('\n========== 13. 考勤 ==========');
    const c = await db.getClient();
    try {
        await c.query('BEGIN');
        for (const emp of emps.slice(0, 10)) {
            for (let d = 30; d >= 1; d--) {
                const dt = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
                if (dt.getDay() === 0 || dt.getDay() === 6) continue;
                const isLate = Math.random() > 0.8;
                const h = isLate ? ri(8, 9) : ri(7, 8);
                const m = isLate ? ri(10, 30) : ri(0, 59);
                const wh = Number(rf(7.5, 9).toFixed(1));
                await c.query(
                    `INSERT INTO attendance_record (id,employee_id,record_date,check_in_time,check_out_time,status,working_hours) VALUES ($1,$2,$3::date,($3::date+($4||' hour')::interval+($5||' minute')::interval)::timestamp,($3::date+($4||' hour')::interval+($5||' minute')::interval+'9 hour'::interval)::timestamp,$6,$7)`,
                    [uuid(), emp.id, dt.toISOString().split('T')[0], h.toString(), m.toString(), isLate ? 'late' : 'normal', wh]
                );
            }
            console.log('OK 考勤: ' + emp.name);
        }
        await c.query('COMMIT');
        console.log('OK: 考勤完成');
    } catch (err) { await c.query('ROLLBACK'); console.log('FAIL 考勤:', err.message); }
    finally { c.release(); }
// ==========================================
}
// 14. 财务
// ==========================================
async function createFinance(orders) {
    console.log("\n========== 14. 财务 ==========");
    const c = await db.getClient();
    try {
        await c.query("BEGIN");
        for (const order of orders) {
            const amt = rf(5000, 15000);
            await c.query(
                "INSERT INTO payment_in (id,payment_no,source_type,source_id,amount,payment_method,status,created_at) VALUES ($1,$2,'order',$3,$4,'transfer','confirmed',NOW()-INTERVAL'20 days')",
                [uuid(), "PAY"+Date.now()+ri(1000,9999), order.id, amt]
            );
            console.log("OK 收款: "+amt.toFixed(2));
        }
        for (const order of orders) {
            const total = rf(10000, 30000);
            const paid = rf(3000, 8000);
            await c.query(
                "INSERT INTO receivable (id,order_id,bill_no,bill_date,due_date,amount,total_amount,paid_amount,status,created_at) VALUES ($1,$2,$3,CURRENT_DATE-15,CURRENT_DATE+15,$4,$4,$5,'partial',NOW())",
                [uuid(), order.id, "BILL"+Date.now()+ri(1000,9999), total, paid]
            );
        }
        await c.query("COMMIT");
        console.log("OK: 财务完成");
    } catch (err) { await c.query("ROLLBACK"); console.log("FAIL 财务:", err.message); }
    finally { c.release(); }
}

// ==========================================
// 15. 报表验证
// ==========================================
async function verifyReports() {
    console.log("\n========== 15. 报表验证 ==========");
    try {
        const att = await db.query("SELECT e.employee_name,d.dept_name,COUNT(*) FILTER(WHERE a.status='normal')::text as normal_days,COUNT(*) FILTER(WHERE a.status='late')::text as late_days,ROUND(SUM(a.working_hours)::numeric,1)::text as total_hours FROM attendance_record a JOIN employee e ON a.employee_id=e.id LEFT JOIN department d ON e.dept_id=d.id WHERE a.record_date>=CURRENT_DATE-INTERVAL'30 days' GROUP BY e.id,e.employee_name,d.dept_name ORDER BY e.employee_name");
        console.log("\n考勤统计:");
        if(att.rows.length) console.table(att.rows); else console.log("(无)");

        const ord = await db.query("SELECT order_status,COUNT(*)::text as count,COALESCE(SUM(total_amount),0)::text as total FROM order_master WHERE order_no LIKE 'O%' GROUP BY order_status");
        console.log("\n订单统计:");
        if(ord.rows.length) console.table(ord.rows); else console.log("(无)");

        const pay = await db.query("SELECT source_type,COUNT(*)::text as count,COALESCE(SUM(amount),0)::text as total FROM payment_in WHERE source_type='order' GROUP BY source_type");
        console.log("\n收款统计:");
        if(pay.rows.length) console.table(pay.rows); else console.log("(无)");

        const prod = await db.query("SELECT status,COUNT(*)::text as count FROM door_panel_production GROUP BY status");
        console.log("\n门板生产:");
        if(prod.rows.length) console.table(prod.rows); else console.log("(无)");

        const ct = await db.query("SELECT status,COUNT(*)::text as count FROM countertop_production GROUP BY status");
        console.log("\n台面生产:");
        if(ct.rows.length) console.table(ct.rows); else console.log("(无)");

        const pkg = await db.query("SELECT status,COUNT(*)::text as count,COALESCE(SUM(total_packages),0)::text as pkgs FROM package_record GROUP BY status");
        console.log("\n包装统计:");
        if(pkg.rows.length) console.table(pkg.rows); else console.log("(无)");

        const log = await db.query("SELECT status,COUNT(*)::text as count FROM logistics_record GROUP BY status");
        console.log("\n物流统计:");
        if(log.rows.length) console.table(log.rows); else console.log("(无)");

        const ins = await db.query("SELECT status,COUNT(*)::text as count FROM installation_task GROUP BY status");
        console.log("\n安装统计:");
        if(ins.rows.length) console.table(ins.rows); else console.log("(无)");

        console.log("\n[OK] 报表验证完成");
    } catch (err) { console.log("FAIL 报表:", err.message); }
}

// ==========================================
// 主函数
// ==========================================
async function main() {
    console.log("========================================");
    console.log("  [V6] 橱柜工厂 - 完整端到端测试");
    console.log("========================================");
    try {
        await clearAllData();
        await sl(300);
        const { empIds } = await createBasic();
        await sl(200);
        const custIds = await createCustomers();
        await sl(200);
        const supIds = await createSuppliers();
        await sl(200);
        const whIds = await createWarehouses();
        await sl(200);
        const matIds = await createMaterials(supIds);
        await sl(200);
        const orderIds = await createOrders(custIds);
        await sl(200);
        await createStockIn(matIds, whIds, supIds);
        await sl(200);
        await createProduction(orderIds);
        await sl(200);
        const pkgs = await createPackages(orderIds);
        await sl(200);
        await createLogistics(pkgs);
        await sl(200);
        await createInstallation(orderIds);
        await sl(200);
        await createAttendance(empIds);
        await sl(200);
        await createFinance(orderIds);
        await sl(200);
        await verifyReports();
        console.log("\n========================================");
        console.log("  [OK] 全流程完成！");
        console.log("========================================");
    } catch (err) { console.error("FAIL:", err); }
    finally { process.exit(); }
}
main();
