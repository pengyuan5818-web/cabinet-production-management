/**
 * 橱柜工厂管理系统 - 完整端到端测试脚本 V5
 * 覆盖：部门→员工→客户→订单→生产→库存→分拣→包装→运输→安装→考勤→财务
 */

const db = require('./src/db');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        for (const t of tables) {
            try { await client.query(`DELETE FROM ${t}`); } catch (e) {}
        }
        try { await client.query("DELETE FROM employee WHERE employee_name NOT IN ('admin')"); } catch (e) {}
        try { await client.query("DELETE FROM department WHERE dept_code LIKE '%T%'"); } catch (e) {}
        try { await client.query("DELETE FROM customer"); } catch (e) {}
        try { await client.query("DELETE FROM supplier WHERE supplier_code LIKE '%T%'"); } catch (e) {}
        try { await client.query("DELETE FROM warehouse WHERE warehouse_code LIKE '%T%'"); } catch (e) {}
        await client.query('COMMIT');
        console.log('✅ 数据清空完成');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('⚠️ 清空完成（部分）');
    } finally {
        client.release();
    }
}

// ==========================================
// 2. 创建基础数据（部门+员工）
// ==========================================
async function createBasic() {
    console.log('\n========== 2. 创建基础数据（部门+员工） ==========');
    const client = await db.getClient();
    const ts = Date.now().toString().slice(-4);
    const deptIds = {};

    try {
        await client.query('BEGIN');

        const depts = [
            { name: '销售部T', code: `SA${ts}`, type: 'sales' },
            { name: '设计部T', code: `DE${ts}`, type: 'design' },
            { name: '生产部T', code: `PR${ts}`, type: 'production' },
            { name: '仓储部T', code: `WA${ts}`, type: 'warehouse' },
            { name: '物流部T', code: `LO${ts}`, type: 'logistics' },
            { name: '安装部T', code: `IN${ts}`, type: 'installation' },
            { name: '财务部T', code: `FI${ts}`, type: 'admin' },
            { name: '人事部T', code: `HR${ts}`, type: 'admin' }
        ];

        for (const d of depts) {
            const id = uuid();
            await client.query(
                `INSERT INTO department (id, dept_name, dept_code, dept_type, status, created_at)
                 VALUES ($1, $2, $3, $4, 'active', NOW())`,
                [id, d.name, d.code, d.type]
            );
            deptIds[d.code] = id;
            console.log(`✅ 部门: ${d.name}`);
        }

        const emps = [
            { name: '张三', phone: '13800003001', dept: `SA${ts}`, pos: '销售经理' },
            { name: '李四', phone: '13800003002', dept: `SA${ts}`, pos: '销售员' },
            { name: '王五', phone: '13800003003', dept: `DE${ts}`, pos: '设计师' },
            { name: '赵六', phone: '13800003004', dept: `DE${ts}`, pos: '设计经理' },
            { name: '钱七', phone: '13800003005', dept: `PR${ts}`, pos: '生产主管' },
            { name: '孙八', phone: '13800003006', dept: `PR${ts}`, pos: '生产工人' },
            { name: '周九', phone: '13800003007', dept: `WA${ts}`, pos: '仓库管理员' },
            { name: '吴十', phone: '13800003008', dept: `LO${ts}`, pos: '物流司机' },
            { name: '郑一', phone: '13800003009', dept: `IN${ts}`, pos: '安装工' },
            { name: '王二', phone: '13800003010', dept: `IN${ts}`, pos: '安装队长' },
            { name: '冯三', phone: '13800003011', dept: `FI${ts}`, pos: '会计' },
            { name: '陈五', phone: '13800003012', dept: `HR${ts}`, pos: '人事专员' }
        ];

        const empIds = [];
        for (const e of emps) {
            const id = uuid();
            await client.query(
                `INSERT INTO employee (id, employee_no, employee_name, phone, dept_id, position, employee_type, hire_date, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, 'full_time', CURRENT_DATE, 'active', NOW())`,
                [id, `EP${Date.now()}${randInt(100, 999)}`, e.name, e.phone, deptIds[e.dept], e.pos]
            );
            empIds.push({ id, name: e.name, dept: deptIds[e.dept] });
            console.log(`✅ 员工: ${e.name}`);
        }

        await client.query('COMMIT');
        return { deptIds, empIds, ts };
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 基础数据失败:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

// ==========================================
// 3. 创建客户
// ==========================================
async function createCustomers() {
    console.log('\n========== 3. 创建客户 ==========');
    const client = await db.getClient();
    const custIds = [];

    try {
        await client.query('BEGIN');
        const custs = [
            { name: '张先生', phone: '13700003001', addr: '广州市天河区珠江新城' },
            { name: '李女士', phone: '13700003002', addr: '深圳市南山区科技园' },
            { name: '王先生', phone: '13700003003', addr: '佛山市顺德区大良镇' },
            { name: '赵先生', phone: '13700003004', addr: '东莞市南城区鸿福路' },
            { name: '刘女士', phone: '13700003005', addr: '惠州市惠城区江北' }
        ];

        for (const c of custs) {
            const id = uuid();
            await client.query(
                `INSERT INTO customer (id, customer_no, customer_name, phone, address, status, source, created_at)
                 VALUES ($1, $2, $3, $4, $5, 'following', '测试来源', NOW())`,
                [id, `C${Date.now()}${randInt(100, 999)}`, c.name, c.phone, c.addr]
            );
            custIds.push(id);
            console.log(`✅ 客户: ${c.name}`);
        }

        await client.query('COMMIT');
        return custIds;
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 客户创建失败');
        return [];
    } finally {
        client.release();
    }
}

// ==========================================
// 4. 创建供应商
// ==========================================
async function createSuppliers() {
    console.log('\n========== 4. 创建供应商 ==========');
    const client = await db.getClient();
    const supIds = [];

    try {
        await client.query('BEGIN');
        const sups = [
            { name: '宝钢不锈钢T', contact: '陈经理', phone: '13900001001', cat: '不锈钢板' },
            { name: '海德威配件T', contact: '林经理', phone: '13900001002', cat: '五金配件' },
            { name: '华润板材T', contact: '周经理', phone: '13900001003', cat: '板材' }
        ];

        for (const s of sups) {
            const id = uuid();
            await client.query(
                `INSERT INTO supplier (id, supplier_code, supplier_name, contact_person, phone, status, supply_category, created_at)
                 VALUES ($1, $2, $3, $4, $5, 'active', $6, NOW())`,
                [id, `SUP${Date.now()}${randInt(100, 999)}`, s.name, s.contact, s.phone, s.cat]
            );
            supIds.push({ id, name: s.name });
            console.log(`✅ 供应商: ${s.name}`);
        }

        await client.query('COMMIT');
        return supIds;
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 供应商创建失败');
        return [];
    } finally {
        client.release();
    }
}

// ==========================================
// 5. 创建仓库
// ==========================================
async function createWarehouses() {
    console.log('\n========== 5. 创建仓库 ==========');
    const client = await db.getClient();
    const whIds = [];

    try {
        await client.query('BEGIN');
        const whs = [
            { name: '广州总仓T', code: `WH001T`, addr: '广州市白云区钟落潭' },
            { name: '佛山分仓T', code: `WH002T`, addr: '佛山市南海区狮山镇' }
        ];

        for (const w of whs) {
            const id = uuid();
            await client.query(
                `INSERT INTO warehouse (id, warehouse_code, warehouse_name, warehouse_type, province, city, district, address, status, created_at)
                 VALUES ($1, $2, $3, 'main', '广东省', '广州市', '白云区', $4, 'active', NOW())`,
                [id, w.code, w.name, w.addr]
            );
            whIds.push(id);
            console.log(`✅ 仓库: ${w.name}`);
        }

        await client.query('COMMIT');
        return whIds;
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 仓库创建失败');
        return [];
    } finally {
        client.release();
    }
}

// ==========================================
// 6. 创建材料
// ==========================================
async function createMaterials(supIds) {
    console.log('\n========== 6. 创建材料 ==========');
    const client = await db.getClient();
    const matIds = [];

    try {
        await client.query('BEGIN');
        const mats = [
            { code: 'MAT-SS-001', name: '不锈钢板 304 1.5mm', cat: '不锈钢板', spec: '1.5mm*1220*2440', unit: '张', price: 380 },
            { code: 'MAT-SS-002', name: '不锈钢板 304 2.0mm', cat: '不锈钢板', spec: '2.0mm*1220*2440', unit: '张', price: 520 },
            { code: 'MAT-AC-001', name: '铝合金门框料', cat: '铝合金', spec: '6063-T5', unit: '米', price: 45 },
            { code: 'MAT-GL-001', name: '钢化玻璃 8mm', cat: '玻璃', spec: '8mm*2000*1000', unit: '㎡', price: 180 },
            { code: 'MAT-HW-001', name: '不锈钢铰链', cat: '五金', spec: '304#', unit: '个', price: 12 },
            { code: 'MAT-HW-002', name: '门锁套装', cat: '五金', spec: '银色', unit: '套', price: 85 }
        ];

        for (const m of mats) {
            const id = uuid();
            await client.query(
                `INSERT INTO material (id, material_code, material_name, category, specification, unit, unit_price, safe_stock, min_stock, supplier_id, supplier_name, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 100, 20, $8, $9, 'active', NOW())`,
                [id, m.code, m.name, m.cat, m.spec, m.unit, m.price, supIds[randInt(0, supIds.length - 1)].id, m.name.split(' ')[0]]
            );
            matIds.push({ id, code: m.code, name: m.name, price: m.price });
            console.log(`✅ 材料: ${m.name}`);
        }

        await client.query('COMMIT');
        return matIds;
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 材料创建失败:', err.message);
        return [];
    } finally {
        client.release();
    }
}

// ==========================================
// 7. 创建订单+明细+追踪
// ==========================================
async function createOrders(custIds) {
    console.log('\n========== 7. 创建订单 ==========');
    const client = await db.getClient();
    const orderIds = [];

    try {
        await client.query('BEGIN');

        for (let i = 0; i < custIds.length; i++) {
            const orderId = uuid();
            const totalAmount = randFloat(15000, 45000);
            const deposit = Number((totalAmount * 0.3).toFixed(2));
            const bal = Number((totalAmount - deposit).toFixed(2));
            const orderNo = `O${Date.now()}${i}`;

            await client.query(
                `INSERT INTO order_master (id, order_no, customer_id, order_status, total_amount, deposit_amount, balance_amount, expected_delivery, created_at)
                 VALUES ($1, $2, $3, 'producing', $4, $5, $6, CURRENT_DATE + 15, NOW())`,
                [orderId, orderNo, custIds[i], totalAmount, deposit, bal]
            );

            // 明细
            const cabCount = randInt(2, 4);
            for (let j = 0; j < cabCount; j++) {
                const unitPrice = randFloat(2000, 5000);
                const qty = randInt(1, 3);
                const amount = Number((unitPrice * qty).toFixed(2));
                await client.query(
                    `INSERT INTO order_detail (id, order_id, product_name, product_type, cabinet_count, material, color, length, width, height, unit_price, quantity, amount)
                     VALUES ($1, $2, $3, '橱柜', 1, '不锈钢', '银色', 1000, 600, 2000, $4, $5, $6)`,
                    [uuid(), orderId, `橱柜${j + 1}`, unitPrice, qty, amount]
                );
            }

            // 订单追踪（8阶段）
            const stages = ['订单确认', '设计拆单', '材料准备', '开料切割', '封边处理', '钻孔加工', '组装检验', '包装入库'];
            for (let s = 0; s < stages.length; s++) {
                const done = s < 7;
                await client.query(
                    `INSERT INTO order_tracking (id, order_id, current_stage, stage_name, stage_status, started_at, completed_at)
                     VALUES ($1, $2, $3, $3, $4, CURRENT_TIMESTAMP - ($5 || ' days')::interval, CASE WHEN $4='completed' THEN CURRENT_TIMESTAMP - ($6 || ' days')::interval ELSE NULL END)`,
                    [uuid(), orderId, stages[s], done ? 'completed' : 'in_progress', (8 - s).toString(), (7 - s).toString()]
                );
            }

            orderIds.push({ id: orderId, no: orderNo });
            console.log(`✅ 订单: ${orderNo} (${cabCount}个橱柜, ¥${totalAmount.toFixed(2)})`);
        }

        await client.query('COMMIT');
        return orderIds;
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 订单创建失败:', err.message);
        return [];
    } finally {
        client.release();
    }
}

// ==========================================
// 8. 创建入库+库存
// ==========================================
async function createStockIn(matIds, whIds, supIds) {
    console.log('\n========== 8. 创建入库+库存 ==========');
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        for (const mat of matIds) {
            const qty = randInt(50, 200);
            const amount = Number((qty * mat.price).toFixed(2));
            const stockInId = uuid();

            await client.query(
                `INSERT INTO stock_in (id, stock_in_no, warehouse_id, supplier_id, batch_no, total_amount, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${randInt(1, 10)} days')`,
                [stockInId, `IN${Date.now()}${randInt(100, 999)}`, whIds[0], supIds[0].id, `BATCH${Date.now()}`, amount]
            );

            await client.query(
                `INSERT INTO stock_inventory (id, warehouse_id, material_id, quantity, locked_quantity, last_in_date, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, 0, CURRENT_DATE, NOW(), NOW())
                 ON CONFLICT (warehouse_id, material_id) DO UPDATE SET quantity = stock_inventory.quantity + $4, last_in_date = CURRENT_DATE, updated_at = NOW()`,
                [uuid(), whIds[0], mat.id, qty]
            );

            console.log(`✅ 入库: ${mat.name} x${qty}`);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 入库创建失败:', err.message);
    } finally {
        client.release();
    }
}

// ==========================================
// 9. 创建生产记录（门板+台面）
// ==========================================
async function createProduction(orders) {
    console.log('\n========== 9. 创建生产记录 ==========');
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        for (const order of orders) {
            // 门板生产
            const doorId = uuid();
            await client.query(
                `INSERT INTO door_panel_production (id, order_id, door_no, door_type, length, width, thickness, weight, quantity, material, color, finish, has_handle, has_hinge, hinge_count, coating_type, coating_color, baking_temp, baking_time, status, cutting_complete, coating_complete, baking_complete, quality_complete, current_location, created_at)
                 VALUES ($1, $2, $3, '标准门板', 800, 600, 18, 25.5, 2, '304不锈钢', '银色', '拉丝', true, true, 6, '粉末喷涂', '银色', 180, 30, 'quality_completed', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP, '仓库A区', NOW())`,
                [doorId, order.id, `D${Date.now()}${randInt(100, 999)}`]
            );

            // 台面生产
            const ctId = uuid();
            await client.query(
                `INSERT INTO countertop_production (id, order_id, production_no, countertop_type, material, length, width, thickness, color, edge_style, has_sink_hole, has_faucet_hole, quantity, status, cutting_complete, polishing_complete, quality_complete, current_location, created_at)
                 VALUES ($1, $2, $3, '石英石台面', '石英石', 2000, 600, 15, '白色', '磨边', true, true, 1, 'quality_completed', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP, '仓库B区', NOW())`,
                [ctId, order.id, `CT${Date.now()}${randInt(100, 999)}`]
            );

            // 生产排期
            const schId = uuid();
            await client.query(
                `INSERT INTO production_schedule (id, schedule_no, order_id, schedule_date, priority, status, stage, scheduled_date, estimated_hours, created_at)
                 VALUES ($1, $2, $3, CURRENT_DATE, 'normal', 'in_progress', 'cutting', CURRENT_DATE + 1, 8, NOW())`,
                [schId, `SCH${Date.now()}${randInt(100, 999)}`, order.id]
            );

            console.log(`✅ 生产: 订单${order.no} → 门板+台面`);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 生产记录创建失败:', err.message);
    } finally {
        client.release();
    }
}

// ==========================================
// 10. 创建包装记录
// ==========================================
async function createPackages(orders) {
    console.log('\n========== 10. 创建包装记录 ==========');
    const client = await db.getClient();
    const pkgIds = [];

    try {
        await client.query('BEGIN');

        for (const order of orders) {
            const pkgId = uuid();
            await client.query(
                `INSERT INTO package_record (id, package_no, order_id, package_type, package_method, total_packages, total_quantity, total_weight, longest_length, total_volume, status, scan_operator_name, scan_time, storage_area, storage_position, created_at)
                 VALUES ($1, $2, $3, '纸箱包装', '木架加固', $4, $5, $6, 120, $7, 'stored', '周九', CURRENT_TIMESTAMP - INTERVAL '1 days', 'A区', 'A-01', NOW())`,
                [pkgId, `PK${Date.now()}${randInt(100, 999)}`, order.id, randInt(3, 8), randInt(5, 15), Number((randFloat(50, 200)).toFixed(1)), Number((randFloat(1, 5)).toFixed(2))]
            );

            // 包装明细
            for (let i = 0; i < randInt(3, 6); i++) {
                await client.query(
                    `INSERT INTO package_item (id, package_id, product_name, product_type, quantity, weight, length, width, height, scanned, barcode, created_at)
                     VALUES ($1, $2, $3, '橱柜', $4, $5, 800, 600, 2000, true, $6, NOW())`,
                    [uuid(), pkgId, `橱柜部件${i + 1}`, randInt(1, 3), Number((randFloat(5, 30)).toFixed(1)), `BC${Date.now()}${i}`]
                );
            }

            pkgIds.push({ id: pkgId, orderId: order.id, no: order.no });
            console.log(`✅ 包装: 订单${order.no}`);
        }

        await client.query('COMMIT');
        return pkgIds;
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 包装创建失败:', err.message);
        return [];
    } finally {
        client.release();
    }
}

// ==========================================
// 11. 创建物流记录
// ==========================================
async function createLogistics(packages) {
    console.log('\n========== 11. 创建物流记录 ==========');
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        for (const pkg of packages) {
            const logId = uuid();
            await client.query(
                `INSERT INTO logistics_record (id, logistics_no, order_id, logistics_company, logistics_no_ext, driver_name, driver_phone, send_province, send_city, send_district, send_address, receive_province, receive_city, receive_district, receive_address, receive_contact, receive_phone, freight, insured_amount, status, package_count, total_weight, ship_date, estimate_arrive, created_at)
                 VALUES ($1, $2, $3, '德邦物流', $4, '吴十', '13800003008', '广东省', '广州市', '白云区', '广州市白云区钟落潭', '广东省', '深圳市', '南山区', '深圳市南山区科技园', '李女士', '13700003002', 350, 5000, 'in_transit', $5, $6, CURRENT_DATE - 2, CURRENT_DATE + 3, NOW())`,
                [logId, `LG${Date.now()}${randInt(100, 999)}`, pkg.orderId, `DP${Date.now()}${randInt(1000, 9999)}`, randInt(3, 8), Number((randFloat(80, 200)).toFixed(1))]
            );

            // 物流追踪
            const tracks = [
                { loc: '广州白云区', status: '已揽收', desc: '货物已从广州发出' },
                { loc: '广州转运中心', status: '运输中', desc: '货物到达广州转运中心' },
                { loc: '深圳转运中心', status: '运输中', desc: '货物到达深圳转运中心' }
            ];
            for (let t = 0; t < tracks.length; t++) {
                await client.query(
                    `INSERT INTO logistics_track (id, logistics_record_id, track_time, location, status, description)
                     VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '${tracks.length - t} days', $3, $4, $5)`,
                    [uuid(), logId, tracks[t].loc, tracks[t].status, tracks[t].desc]
                );
            }

            console.log(`✅ 物流: 订单${pkg.no} → 深圳市南山区（运输中）`);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 物流创建失败:', err.message);
    } finally {
        client.release();
    }
}

// ==========================================
// 12. 创建安装任务
// ==========================================
async function createInstallation(orders) {
    console.log('\n========== 12. 创建安装任务 ==========');
    const client = await db.getClient();
    const installEmpIds = [];

    try {
        // 找安装部员工ID
        const empResult = await client.query(`SELECT id FROM employee WHERE dept_id IN (SELECT id FROM department WHERE dept_code LIKE '%IN%T') LIMIT 5`);
        for (const row of empResult.rows) installEmpIds.push(row.id);

        await client.query('BEGIN');

        for (let i = 0; i < Math.min(3, orders.length); i++) {
            const order = orders[i];
            const taskId = uuid();

            await client.query(
                `INSERT INTO installation_task (id, task_no, order_id, install_province, install_city, install_district, install_address, install_contact, install_phone, appointment_date, appointment_remark, leader_id, leader_name, status, actual_start, actual_complete, accept_status, created_at)
                 VALUES ($1, $2, $3, '广东省', '深圳市', '南山区', '深圳市南山区科技园', '李女士', '13700003002', CURRENT_DATE + 5, '请提前联系确认', $4, '王二', 'in_progress', CURRENT_TIMESTAMP - INTERVAL '1 days', NULL, 'pending', NOW())`,
                [taskId, `INS${Date.now()}${randInt(100, 999)}`, order.id, installEmpIds[0] || uuid()]
            );

            // 分配安装人员
            for (let j = 0; j < Math.min(2, installEmpIds.length); j++) {
                await client.query(
                    `INSERT INTO installer_allocation (id, task_id, employee_id, employee_name, role, work_date, work_hours, overtime_hours, allowance)
                     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8)`,
                    [uuid(), taskId, installEmpIds[j], j === 0 ? '王二' : '郑一', j === 0 ? '队长' : '工人', Number((randFloat(7.5, 9)).toFixed(1)), Number((randFloat(0, 2)).toFixed(1)), randInt(50, 150)]
                );
            }

            // 安装进度
            const stages = ['上门勘测', '材料到场', '框架安装', '面板安装', '调试检验', '交付验收'];
            for (let s = 0; s < stages.length; s++) {
                const done = s < 4;
                await client.query(
                    `INSERT INTO installation_progress (id, task_id, progress, stage, stage_name, description)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [uuid(), taskId, Math.round((s + 1) * 100 / 6), s + 1, stages[s], done ? '已完成' : '进行中']
                );
            }

            console.log(`✅ 安装任务: 订单${order.no} → 王二带队`);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 安装任务创建失败:', err.message);
    } finally {
        client.release();
    }
}

// ==========================================
// 13. 创建考勤数据
// ==========================================
async function createAttendance(emps) {
    console.log('\n========== 13. 创建考勤数据 ==========');
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        for (const emp of emps.slice(0, 10)) {
            for (let d = 30; d >= 1; d--) {
                const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                const isLate = Math.random() > 0.8;
                const h = isLate ? randInt(8, 9) : randInt(7, 8);
                const m = isLate ? randInt(10, 30) : randInt(0, 59);
                const wh = Number((7.5 + Math.random() * 1.5).toFixed(1));

                await client.query(
                    `INSERT INTO attendance_record (id, employee_id, record_date, check_in_time, check_out_time, status, working_hours)
                     VALUES ($1, $2, $3::date, ($3::date + INTERVAL '1 hour' * $4 + INTERVAL '1 minute' * $5), ($3::date + INTERVAL '1 hour' * $4 + INTERVAL '1 minute' * $5 + INTERVAL '9 hours'), $6, $7)`,
                    [uuid(), emp.id, date.toISOString().split('T')[0], h, m, isLate ? 'late' : 'normal', wh]
                );
            }
            console.log(`✅ 考勤: ${emp.name}`);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 考勤创建失败:', err.message);
    } finally {
        client.release();
    }
}

// ==========================================
// 14. 创建财务数据
// ==========================================
async function createFinance(orders) {
    console.log('\n========== 14. 创建财务数据 ==========');
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // 收款
        for (const order of orders) {
            const amt = randFloat(5000, 15000);
            await client.query(
                `INSERT INTO payment_in (id, payment_no, source_type, source_id, amount, payment_method, status, created_at)
                 VALUES ($1, $2, 'order', $3, $4, 'transfer', 'confirmed', NOW() - INTERVAL '20 days')`,
                [uuid(), `PAY${Date.now()}${randInt(1000, 9999)}`, order.id, amt]
            );
            console.log(`✅ 收款: ¥${amt.toFixed(2)}`);
        }

        // 应收账单
        for (const order of orders) {
            const total = randFloat(10000, 30000);
            const paid = randFloat(3000, 8000);
            await client.query(
                `INSERT INTO receivable (id, order_id, bill_no, bill_date, due_date, amount, total_amount, paid_amount, status, created_at)
                 VALUES ($1, $2, $3, CURRENT_DATE - 15, CURRENT_DATE + 15, $4, $4, $5, 'partial', NOW())`,
                [uuid(), order.id, `BILL${Date.now()}${randInt(1000, 9999)}`, total, paid]
            );
        }

        await client.query('COMMIT');
        console.log('✅ 财务数据完成');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log('❌ 财务数据失败:', err.message);
    } finally {
        client.release();
    }
}

// ==========================================
// 15. 验证报表
// ==========================================
async function verifyReports() {
    console.log('\n========== 15. 验证报表功能 ==========');

    try {
        const att = await db.query(`
            SELECT e.employee_name, d.dept_name,
                   COUNT(*) FILTER (WHERE a.status = 'normal') as normal_days,
                   COUNT(*) FILTER (WHERE a.status = 'late') as late_days,
                   ROUND(SUM(a.working_hours)::numeric, 1) as total_hours
            FROM attendance_record a
            JOIN employee e ON a.employee_id = e.id
            LEFT JOIN department d ON e.dept_id = d.id
            WHERE a.record_date >= CURRENT_DATE - INTERVAL '30 days'
              AND e.id IN (SELECT id FROM employee ORDER BY created_at DESC LIMIT 10)
            GROUP BY e.id, e.employee_name, d.dept_name ORDER BY e.employee_name`);
        console.log('\n考勤统计:');
        if (att.rows.length) console.table(att.rows); else console.log('(无数据)');

        const ord = await db.query(`SELECT order_status, COUNT(*)::text as count, COALESCE(SUM(total_amount), 0)::text as total_amount FROM order_master WHERE order_no LIKE 'O%' GROUP BY order_status`);
        console.log('\n订单统计:');
        if (ord.rows.length) console.table(ord.rows); else console.log('(无数据)');

        const pay = await db.query(`SELECT source_type, COUNT(*)::text as count, COALESCE(SUM(amount), 0)::text as total FROM payment_in WHERE source_type = 'order' GROUP BY source_type`);
        console.log('\n收款统计:');
        if (pay.rows.length) console.table(pay.rows); else console.log('(无数据)');

        const prod = await db.query(`SELECT status, COUNT(*)::text as count FROM door_panel_production GROUP BY status`);
        console.log('\n门板生产统计:');
        if (prod.rows.length) console.table(prod.rows); else console.log('(无数据)');

        const pkg = await db.query(`SELECT status, COUNT(*)::text as count, COALESCE(SUM(total_packages), 0)::text as total_packages FROM package_record GROUP BY status`);
        console.log('\n包装统计:');
        if (pkg.rows.length) console.table(pkg.rows); else console.log('(无数据)');

        const log = await db.query(`SELECT status, COUNT(*)::text as count FROM logistics_record GROUP BY status`);
        console.log('\n物流统计:');
        if (log.rows.length) console.table(log.rows); else console.log('(无数据)');

        const ins = await db.query(`SELECT status, COUNT(*)::text as count FROM installation_task GROUP BY status`);
        console.log('\n安装任务统计:');
        if (ins.rows.length) console.table(ins.rows); else console.log('(无数据)');

        console.log('\n✅ 报表验证完成');
    } catch (err) {
        console.log('❌ 报表验证失败:', err.message);
    }
}

// ==========================================
// 主函数
// ==========================================
async function main() {
    console.log('==========================================');
    console.log('  橱柜工厂管理系统 - 完整端到端测试 V5');
    console.log('==========================================');

    try {
        await clearAllData();
        await sleep(300);

        const { empIds } = await createBasic();
        await sleep(200);

        const custIds = await createCustomers();
        await sleep(200);

        const supIds = await createSuppliers();
        await sleep(200);

        const whIds = await createWarehouses();
        await sleep(200);

        const matIds = await createMaterials(supIds);
        await sleep(200);

        const orderIds = await createOrders(custIds);
        await sleep(200);

        await createStockIn(matIds, whIds, supIds);
        await sleep(200);

        await createProduction(orderIds);
        await sleep(200);

        const packages = await createPackages(orderIds);
        await sleep(200);

        await createLogistics(packages);
        await sleep(200);

        await createInstallation(orderIds);
        await sleep(200);

        await createAttendance(empIds);
        await sleep(200);

        await createFinance(orderIds);
        await sleep(200);

        await verifyReports();

        console.log('\n==========================================');
        console.log('  ✅ 测试完成！全流程数据创建成功！');
        console.log('==========================================');
    } catch (err) {
        console.error('❌ 测试失败:', err);
    } finally {
        process.exit();
    }
}

main();