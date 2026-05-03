// 橱柜工厂系统 - 异常边界测试 V1
const { Pool } = require("pg");
const pool = new Pool({ host: process.env.DB_HOST || "localhost", port: parseInt(process.env.DB_PORT || "5432"), user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD || "postgres", database: process.env.DB_NAME || "cabinet_factory", max: 10 });
const uuid = () => require("crypto").randomUUID();
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rf = (a, b) => parseFloat((Math.random() * (b - a) + a).toFixed(2));
const pick = a => a[ri(0, a.length - 1)];
const ts = () => Date.now().toString();
const db = { query: (t, p) => pool.query(t, p) };

async function clearAll() {
    console.log("\n========================================");
    console.log("  橱柜工厂 - 异常边界测试 V1");
    console.log("========================================");
    console.log("\n========== 1. 清空数据 ==========");
    const client = await pool.connect();
    try {
        await client.query('SET session_replication_role = replica;');
        await client.query('TRUNCATE TABLE payment_in, receivable, attendance_record, installation_progress, installer_allocation, installation_task, logistics_record, package_item, package_record, door_panel_production, countertop_production, production_schedule, stock_in, stock_out, stock_inventory, order_tracking, order_bom, order_detail, order_master, material, warehouse, supplier, customer, employee, department RESTART IDENTITY CASCADE;');
        await client.query('SET session_replication_role = origin;');
        console.log('OK: 清空完成');
    } finally { client.release(); }
}

async function createBasic() {
    console.log('\n========== 2. 基础数据：部门+员工 ==========');
    const client = await pool.connect(); const deptIds = {}; const empIds = [];
    try {
        await client.query('BEGIN');
        const depts = [{ n: '销售部A', c: 'DEPT-SA', t: 'sales' }, { n: '设计部A', c: 'DEPT-DE', t: 'design' }, { n: '生产部A', c: 'DEPT-PR', t: 'production' }, { n: '仓储部A', c: 'DEPT-WH', t: 'warehouse' }, { n: '物流部A', c: 'DEPT-LO', t: 'logistics' }, { n: '安装部A', c: 'DEPT-IN', t: 'installation' }, { n: '财务部A', c: 'DEPT-FI', t: 'finance' }, { n: '人事部A', c: 'DEPT-HR', t: 'admin' }];
        for (const d of depts) { const id = uuid(); deptIds[d.c] = id; await client.query('INSERT INTO department(id,dept_code,dept_name,dept_type,status,created_at) VALUES($1,$2,$3,$4,$5,NOW())', [id, d.c, d.n, d.t, 'active']); }
        const emps = [{ n: '张三', d: 'DEPT-SA' }, { n: '李四', d: 'DEPT-SA' }, { n: '王五', d: 'DEPT-DE' }, { n: '赵六', d: 'DEPT-DE' }, { n: '钱七', d: 'DEPT-PR' }, { n: '孙八', d: 'DEPT-PR' }, { n: '周九', d: 'DEPT-WH' }, { n: '吴十', d: 'DEPT-WH' }, { n: '郑一', d: 'DEPT-LO' }, { n: '王二', d: 'DEPT-IN' }, { n: '冯三', d: 'DEPT-FI' }, { n: '陈四', d: 'DEPT-HR' }];
        for (const e of emps) { const id = uuid(); empIds.push({ id, name: e.n, dept: e.d }); await client.query('INSERT INTO employee(id,employee_no,employee_name,dept_id,position,phone,status,hire_date,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())', [id, 'E' + ts().slice(-6) + ri(100,999), e.n, deptIds[e.d], '员工', '13800000000', 'active', '2024-01-01']); }
        await client.query('COMMIT');
        console.log('OK: ' + depts.length + '部门, ' + emps.length + '员工');
        return { deptIds, empIds };
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createCustomers() {
    console.log('\n========== 3. 客户（正常+异常） ==========');
    const client = await pool.connect(); const custIds = [];
    try {
        await client.query('BEGIN');
        const custData = [{ n: '张先生', p: '13800138001', a: '广州市天河区珠江新城花城大道', t: 'normal' }, { n: '李女士', p: '13800138002', a: '深圳市南山区科技园', t: 'normal' }, { n: '王先生', p: '138001380000123', a: '佛山市禅城区季华六路绿地中心', t: 'abnormal_long_phone' }, { n: '赵先生', p: '', a: '广州市天河区珠江新城花城大道123号某某小区A栋1501很长', t: 'abnormal_empty_phone' }, { n: '刘女士', p: '', a: '东莞市南城区鸿福路108号', t: 'abnormal_empty_phone2' }, { n: '陈退', p: '13800138006', a: '珠海市香洲区情侣中路', t: 'abnormal_special' }];
        for (const cu of custData) {
            const id = uuid(); custIds.push({ id, name: cu.n, type: cu.t });
            try { await client.query('INSERT INTO customer(id,customer_no,customer_name,phone,province,city,district,address,status,source,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())', [id, 'C' + ts().slice(-6) + ri(100,999), cu.n, cu.p || null, '广东省', '广州市', '天河区', cu.a, 'following', '测试']); console.log('OK: ' + cu.n + ' [' + cu.t + ']'); }
            catch (e2) { console.log('FAIL: ' + cu.n + ' [' + cu.t + '] - ' + e2.message.split('\n')[0]); }
        }
        await client.query('COMMIT'); return custIds;
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createSuppliers() {
    console.log('\n========== 4. 供应商 ==========');
    const client = await pool.connect(); const suppIds = [];
    try {
        await client.query('BEGIN');
        const supps = [{ n: '深圳伟业五金', c: 'SUP-SZ001', ct: '李经理', p: '13800138111' }, { n: '广州华南板材', c: 'SUP-GZ001', ct: '张经理', p: '13800138222' }, { n: '佛山高明石英石', c: 'SUP-FS001', ct: '王经理', p: '13800138333' }];
        for (const s of supps) { const id = uuid(); suppIds.push({ id, name: s.n }); await client.query('INSERT INTO supplier(id,supplier_code,supplier_name,contact_person,phone,province,city,supply_category,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', [id, s.c, s.n, s.ct, s.p, '广东省', '深圳市', '原材料', 'active']); console.log('OK: ' + s.n); }
        await client.query('COMMIT'); return suppIds;
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createWarehouses() {
    console.log('\n========== 5. 仓库 ==========');
    const client = await pool.connect(); const whIds = [];
    try {
        await client.query('BEGIN');
        const whs = [{ n: '广州总仓', c: 'WH001T' }, { n: '佛山分仓', c: 'WH002T' }, { n: '深圳分仓', c: 'WH003T' }];
        for (const w of whs) { const id = uuid(); whIds.push({ id, name: w.n }); await client.query('INSERT INTO warehouse(id,warehouse_code,warehouse_name,warehouse_type,province,city,district,address,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', [id, w.c, w.n, 'main', '广东省', '广州市', '白云区', '广州市白云区钟落潭', 'active']); console.log('OK: ' + w.n); }
        await client.query('COMMIT'); return whIds;
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createMaterials(suppIds) {
    console.log('\n========== 6. 材料（正常+边界） ==========');
    const client = await pool.connect(); const matIds = [];
    try {
        await client.query('BEGIN');
        const mats = [{ n: '304不锈钢板1.5mm', cat: '不锈钢', sp: 380, code: 'MAT-SUS15' }, { n: '304不锈钢板2.0mm', cat: '不锈钢', sp: 520, code: 'MAT-SUS20' }, { n: '石英石台面板白色', cat: '台面', sp: 0, code: 'MAT-QS01' }, { n: '防火门板标准18mm', cat: '门板', sp: 220, code: 'MAT-FM01' }, { n: '抽屉导轨普通型', cat: '五金', sp: 15, code: 'MAT-DG01' }, { n: '液压铰链带缓冲', cat: '五金', sp: 8, code: 'MAT-HJ01' }, { n: 'ABS封边条白色', cat: '辅料', sp: 3, code: 'MAT-FB01' }, { n: 'LED灯带暖白色', cat: '电器', sp: 25, code: 'MAT-LED' }];
        for (const m of mats) {
            const id = uuid(); matIds.push({ id, name: m.n, code: m.code });
            try { await client.query('INSERT INTO material(id,material_code,material_name,category,specification,unit,unit_price,safe_stock,supplier_id,supplier_name,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())', [id, m.code + ts().slice(-4), m.n, m.cat, '标准', '张', m.sp, 100, suppIds[0] ? suppIds[0].id : null, suppIds[0] ? suppIds[0].name : '供应商', 'active']); console.log('OK: ' + m.n + ' [price=' + m.sp + ']'); }
            catch (me) { console.log('FAIL: ' + m.n + ' - ' + me.message.split('\n')[0]); }
        }
        await client.query('COMMIT'); return matIds;
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}
async function createOrders(custIds) {
    console.log('\n========== 7. 订单（正常+异常） ==========');
    const client = await pool.connect(); const orderIds = [];
    try {
        await client.query('BEGIN');
        const orders = [{ cIdx: 0, amt: 34202.29, late: false, prio: 3 }, { cIdx: 1, amt: 26960.58, late: false, prio: 3 }, { cIdx: 2, amt: 22242.17, late: false, prio: 3 }, { cIdx: 3, amt: 42915.07, late: true, prio: 5 }, { cIdx: 4, amt: 15000.00, late: true, prio: 5 }, { cIdx: 0, amt: 0, late: false, prio: 3 }, { cIdx: 1, amt: 98765.43, late: false, prio: 5 }];
        for (const o of orders) {
            const id = uuid(); const cust = custIds[o.cIdx] || custIds[0];
            orderIds.push({ id, total: o.amt, late: o.late });
            const delDate = new Date(); delDate.setDate(delDate.getDate() + 15);
            await client.query('INSERT INTO order_master(id,order_no,source_type,customer_id,order_status,total_amount,deposit_amount,balance_amount,expected_delivery,installation_required,priority,delivery_province,delivery_city,delivery_district,delivery_address,delivery_contact,delivery_phone,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())', [id, 'O' + ts().slice(-8) + ri(1000,9999), 'customer', cust.id, 'pending', o.amt, o.amt * 0.3, o.amt * 0.7, delDate.toISOString().split('T')[0], true, o.prio, '广东省', '广州市', '天河区', '天河区某小区', '客户', '13800000001', '测试订单']);
            const detId = uuid();
            await client.query('INSERT INTO order_detail(id,order_id,product_name,product_type,cabinet_count,board_count,has_boards,material,color,length,width,height,unit_price,quantity,amount,created_at) VALUES($1,$2,$3,$4,2,8,true,$5,$6,800,600,2000,1,1,$7,NOW())', [detId, id, '标准橱柜', '定制品', '304不锈钢', '银色', o.amt]);
            const trkId = uuid();
            await client.query('INSERT INTO order_tracking(id,order_id,current_stage,stage_name,stage_status,operator_name,started_at,created_at) VALUES($1,$2,$3,$4,$5,$6,NOW(),NOW())', [trkId, id, 'design', '设计阶段', 'in_progress', '王五']);
            const bomId = uuid();
            await client.query('INSERT INTO order_bom(id,order_id,material_code,material_name,material_type,specification,unit,quantity,unit_price,total_price,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,10,380,3800,NULL,NOW())', [bomId, id, 'MAT-SUS15', '不锈钢板', '原材料', '1.5mm', '张']);
            var statusStr = o.amt === 0 ? "零金额" : o.late ? "逾期未交付" : "正常";
            console.log('OK: ' + id.substring(0,8) + '... [¥' + o.amt.toFixed(2) + '] [' + statusStr + ']');
        }
        await client.query('COMMIT'); return orderIds;
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createStock(matIds, whIds) {
    console.log('\n========== 8. 入库+库存（正常+边界） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        var zeroMat = matIds.find(m => m.name.indexOf("铰链") >= 0);
        if (zeroMat) {
            var inId = uuid();
            await client.query('INSERT INTO stock_in(id,stock_in_no,warehouse_id,supplier_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,NULL,$4,1200,$5,NOW())', [inId, 'IN' + ts().slice(-6), whIds[0].id, '陈四', '边界-零库存进10出10']);
            var invId = uuid();
            await client.query('INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,10,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=10,updated_at=NOW()', [invId, whIds[0].id, zeroMat.id]);
            var outId = uuid();
            await client.query('INSERT INTO stock_out(id,stock_out_no,warehouse_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,$4,1200,$5,NOW())', [outId, 'OUT' + ts().slice(-6), whIds[0].id, '周九', '边界-零库存出库']);
            await client.query('UPDATE stock_inventory SET quantity=0,last_out_date=NOW(),updated_at=NOW() WHERE warehouse_id=$1 AND material_id=$2', [whIds[0].id, zeroMat.id]);
            console.log('OK 边界: 铰链 -> 零库存（进10出10）');
        }
        var lowMat = matIds.find(m => m.name.indexOf("1.5mm") >= 0);
        if (lowMat) { var inv2 = uuid(); await client.query("INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,5,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=5,updated_at=NOW()", [inv2, whIds[0].id, lowMat.id]); console.log("OK 边界: 不锈钢板1.5mm -> 库存不足（5张，安全库存100）"); }
        var overMat = matIds.find(m => m.name.indexOf("2.0mm") >= 0);
        if (overMat) { var inv3 = uuid(); await client.query("INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,99999,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=99999,updated_at=NOW()", [inv3, whIds[0].id, overMat.id]); console.log("OK 边界: 不锈钢板2.0mm -> 超额入库99999张"); }
        await client.query('COMMIT');
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createProduction(orders) {
    console.log('\n========== 9. 生产记录（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (var pi = 0; pi < Math.min(4, orders.length); pi++) {
            var order = orders[pi];
            var doorId = uuid();
            await client.query(`INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,quality_result,current_location,created_at,updated_at) VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,'passed',$13,NOW(),NOW())`, [doorId, order.id, 'D' + ts().slice(-6) + ri(100,999), '标准门板','304不锈钢','银色','拉丝',true,true,'粉末喷涂','银色','completed','仓库A'])
            var ctId = uuid();
            await client.query(`INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,quality_result,current_location,created_at,updated_at) VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,1,$10,'passed',$11,NOW(),NOW())`, [ctId, order.id, 'CT' + ts().slice(-6) + ri(100,999), '石英石台面','石英石','白色','直角边',true,true,'completed','仓库B'])
            console.log('OK 生产: ' + order.id.substring(0,8) + '... 门板+台面 [completed]');
        }
        var lateOrder = orders.find(o => o.late);
        if (lateOrder) { var schId = uuid(); await client.query("INSERT INTO production_schedule(id,schedule_no,order_id,schedule_date,priority,status,stage,scheduled_date,estimated_hours,created_at) VALUES($1,$2,$3,'2026-03-10',5,'scheduled','cutting','2026-03-10',16,NOW())", [schId, "SCH" + ts().slice(-6) + "LATE", lateOrder.id]); console.log("OK 边界: 延期排期（2026-03-10，至今未开始）"); }
        if (orders[0]) { var doorId2 = uuid(); await client.query(`INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,quality_result,quality_remark,current_location,created_at,updated_at) VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,'rejected',$13,$14,NOW(),NOW())`, [doorId2, orders[0].id, 'D' + ts().slice(-6) + 'BAD', '标准门板','304不锈钢','银色','拉丝',true,true,'粉末喷涂','银色','rejected','质量不合格，已返工','仓库A']); console.log('OK 边界: 门板质量不合格 [rejected]'); }
        if (orders[1]) { var ctId2 = uuid(); await client.query(`INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,quality_result,current_location,created_at,updated_at) VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,1,$10,'scrapped',$11,NOW(),NOW())`, [ctId2, orders[1].id, 'CT' + ts().slice(-6) + 'SCRP', '石英石台面','石英石','白色','直角边',true,true,'scrapped','仓库B']); console.log('OK 边界: 台面报废 [scrapped]'); }
        await client.query('COMMIT');
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createPackages(orders) {
    console.log('\n========== 10. 包装（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (var pai = 0; pai < Math.min(3, orders.length); pai++) {
            var order = orders[pai]; var pkgId = uuid();
            var totalPkgs = ri(5, 15); var damagedPkgs = pai === 1 ? ri(1, 3) : 0; var missingPkgs = pai === 2 ? 2 : 0;
            var remark = damagedPkgs > 0 ? "边界-部分破损" : missingPkgs > 0 ? "边界-缺件" : "正常包装";
            await client.query('INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())', [pkgId, 'PKG' + ts().slice(-6) + pai, order.id, '纸箱+木架', '木架加固', totalPkgs, totalPkgs * ri(3,8), rf(50,200), 'stored', '周九', '仓库C区', remark]);
            for (var paj = 0; paj < Math.min(3, totalPkgs); paj++) { var itemRemark = damagedPkgs > 0 && paj < damagedPkgs ? "轻微破损" : "正常"; await client.query("INSERT INTO package_item(id,package_id,product_name,product_type,quantity,weight,remark,created_at) VALUES($1,$2,$3,$4,1,$5,$6,NOW())", [uuid(), pkgId, pick(["门板","台面","铰链","导轨","拉手"]), "橱柜", rf(5,30), itemRemark]); }
            var statusStr = damagedPkgs > 0 ? "部分破损" : missingPkgs > 0 ? "缺件" : "正常";
            console.log('OK 包装: 订单' + (pai+1) + ' -> ' + totalPkgs + '件 [' + statusStr + ']');
        }
        if (orders.length > 3) { var pkgId2 = uuid(); await client.query("INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,$4,$5,10,10,500,$6,$7,$8,$9,NOW())", [pkgId2, "PKG" + ts().slice(-6) + "X", orders[3].id, "纸箱", "标准", "stored", "周九", "仓库D区", "边界-明细数量不符"]); await client.query("INSERT INTO package_item(id,package_id,product_name,quantity,weight,remark,created_at) VALUES($1,$2,$3,1,25,$4,NOW())", [uuid(), pkgId2, "门板", "边界-明细只有1条"]); console.log("OK 边界: 记录10件但明细只有1条"); }
        await client.query('COMMIT');
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createLogistics(orders) {
    console.log("\n========== 11. 物流（正常+异常） ==========");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        var cities = ["深圳市南山区", "东莞市南城区", "佛山市禅城区", "惠州市惠城区"];
        for (var li = 0; li < Math.min(4, orders.length); li++) {
            var order = orders[li]; var logId = uuid(); var estDate = new Date(); estDate.setDate(estDate.getDate() + 3);
            await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,estimate_arrive,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())", [logId, "LF" + ts().slice(-6) + li, order.id, "顺丰速运", "司机张", "13800001111", 500, "in_transit", "广东省", cities[li].split("市")[0] + "市", cities[li] + "区", cities[li] + "具体地址", "客户", "13800000001", estDate.toISOString().split("T")[0], "正常运输中"]);
            console.log("OK 物流: -> " + cities[li] + " [in_transit]");
        }
        if (orders.length > 4) { var rejId = uuid(); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())", [rejId, "LF" + ts().slice(-6) + "REJ", orders[4].id, "德邦物流", "司机李", "13800002222", 800, "rejected", "广东省", "深圳市", "南山区", "客户地址", "客户", "13800000001", "边界-拒收(货物破损)"]); console.log("OK 边界物流: 拒收 [rejected]"); }
        if (orders.length > 0) { var rtsId = uuid(); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())", [rtsId, "LF" + ts().slice(-6) + "RTS", orders[0].id, "中通速递", "司机王", "13800003333", 300, "returned", "广东省", "佛山市", "禅城区", "客户地址", "边界-超时退回(10天未妥投)"]); console.log("OK 边界物流: 超期退回 [returned]"); }
        if (orders.length > 1) { var lateId = uuid(); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())", [lateId, "LF" + ts().slice(-6) + "LATE", orders[1].id, "韵达快递", "司机赵", "13800004444", 300, "in_transit", "广东省", "广州市", "天河区", "客户地址", "客户", "13800000001", "边界-已超期3天仍未到达"]); console.log("OK 边界物流: 超期未到达 [in_transit, 超期3天]"); }
        await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createInstallation(orders) {
    console.log("\n========== 12. 安装任务（正常+异常） ==========");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        var instCities = ["深圳市南山区科苑花园", "东莞市南城区汇一城"];
        for (var ii = 0; ii < Math.min(2, orders.length); ii++) {
            var instId = uuid(); var appDate = new Date(); appDate.setDate(appDate.getDate() + 1);
            await client.query("INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,appointment_date,leader_name,status,accept_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())", [instId, "IN" + ts().slice(-6) + ii, orders[ii].id, "广东省", instCities[ii].split("市")[0] + "市", instCities[ii] + "区", instCities[ii] + "具体地址", "客户", "13800000001", appDate.toISOString().split("T")[0], "王二", "in_progress", "pending"]);
            await client.query("INSERT INTO installer_allocation(id,task_id,employee_name,role,work_hours,allowance,created_at) VALUES($1,$2,$3,$4,8,0,NOW())", [uuid(), instId, "王二", "组长"]);
            await client.query("INSERT INTO installer_allocation(id,task_id,employee_name,role,work_hours,allowance,created_at) VALUES($1,$2,$3,$4,8,0,NOW())", [uuid(), instId, "郑一", "组员"]);
            await client.query("INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,50,$3,$4,$5,NOW())", [uuid(), instId, "installation", "安装中", "门板安装中"]);
            console.log("OK 安装: -> " + instCities[ii] + " [in_progress]");
        }
        if (orders.length > 2) { var failId = uuid(); await client.query("INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,leader_name,status,accept_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())", [failId, "IN" + ts().slice(-6) + "FW", orders[2].id, "广东省", "佛山市", "禅城区", "禅城区某小区", "客户", "13800000001", "王二", "rework", "failed"]); await client.query("INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,30,$3,$4,$5,NOW())", [uuid(), failId, "dismantle", "拆旧", "已完成拆旧"]); await client.query("INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,60,$3,$4,$5,NOW())", [uuid(), failId, "installation", "安装", "门板划伤，停工"]); await client.query("INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,0,$3,$4,$5,NOW())", [uuid(), failId, "countertop", "台面", "等待返工"]); console.log("OK 边界安装: 安装失败需返工 [rework]"); }
        if (orders.length > 3) { var cmpId = uuid(); await client.query("INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,leader_name,status,accept_status,accept_remark,visit_status,visit_remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())", [cmpId, "IN" + ts().slice(-6) + "CM", orders[3].id, "广东省", "惠州市", "惠城区", "惠城区某小区", "客户", "13800000001", "王二", "completed", "accepted", "勉强通过，缝隙超标", "visited", "客户很不满意"]); console.log("OK 边界安装: 完成但客户差评 [completed, visit_status=visited]"); }
        await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createAttendance(empIds) {
    console.log("\n========== 13. 考勤（正常+异常） ==========");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (var ai = 0; ai < empIds.length; ai++) {
            var emp = empIds[ai];
            for (var ad = 0; ad < 20; ad++) { var d = new Date(); d.setDate(d.getDate() - ad); var dateStr = d.toISOString().split("T")[0]; await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,8,$7,NOW())", [uuid(), emp.id, dateStr, "normal", "08:0" + String(ad % 10), "18:0" + String(ad % 10), "正常"]); }
            for (var aa = 21; aa <= 23; aa++) { var da = new Date(); da.setDate(da.getDate() - aa); await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,working_hours,remark,created_at) VALUES($1,$2,$3,$4,0,$5,NOW())", [uuid(), emp.id, da.toISOString().split("T")[0], "absent", "边界-旷工"]); }
            var otDate = new Date(); otDate.setDate(otDate.getDate() - 24);
            await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,14,$7,NOW())", [uuid(), emp.id, otDate.toISOString().split("T")[0], "normal", "08:00", "22:30", "边界-日加班6小时"]);
            for (var al = 25; al <= 29; al++) { var dl = new Date(); dl.setDate(dl.getDate() - al); await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,7,$7,NOW())", [uuid(), emp.id, dl.toISOString().split("T")[0], "late", "09:30", "18:00", "边界-迟到"]); }
        }
        console.log("OK 考勤: " + empIds.length + "人 x 30天（含旷工/加班/迟到异常）");
        await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createFinance(orders) {
    console.log("\n========== 14. 财务（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (var fi = 0; fi < Math.min(3, orders.length); fi++) {
            var order = orders[fi];
            var payId = uuid();
            var amount = order.total > 0 ? order.total * 0.3 : rf(1000, 5000);
            await client.query(
                "INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) " +
                "VALUES($1,$2,$3,$4,null,$5,$6,$7,$8,$9,NOW())",
                [payId, "PAY" + ts().slice(-8) + fi, "order", amount, "正常客户", "bank_transfer", "confirmed", order.id, "正常收款"]
            );
            console.log("OK 收款: " + amount.toFixed(2) + " [confirmed]");
        }
        var overId = uuid();
        var overOrder = orders.find(function(o) { return o.total > 0; }) || orders[0];
        if (overOrder) {
            var d = new Date();
            d.setDate(d.getDate() - 20);
            var bd = new Date();
            bd.setDate(bd.getDate() - 35);
            var overAmt = rf(10000, 30000);
            var overTax = parseFloat((overAmt * 0.13).toFixed(2));
            var overTotal = parseFloat((overAmt + overTax).toFixed(2));
            await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,NOW())",
                [overId, overOrder.id, "BILL" + ts().slice(-8), bd, d, overAmt, 0.13, overTax, overTotal, "overdue", "边界-逾期20天"]
            );
            console.log("OK 边界财务: 逾期应收账款 [overdue, 逾期20天]");
        }
        var badId = uuid();
        var badOrder = orders.find(function(o) { return o.total > 0; });
        if (badOrder) {
            var d2 = new Date();
            d2.setDate(d2.getDate() - 90);
            var bd2 = new Date();
            bd2.setDate(bd2.getDate() - 105);
            var badAmt = rf(20000, 50000);
            var badTax = parseFloat((badAmt * 0.13).toFixed(2));
            var badTotal = parseFloat((badAmt + badTax).toFixed(2));
            await client.query(
                "INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,tax_rate,tax_amount,total_amount,paid_amount,status,remark,created_at) " +
                "VALUES($1,null,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,NOW())",
                [badId, badOrder.id, "BILL" + ts().slice(-8) + "BD", bd2, d2, badAmt, 0.13, badTax, badTotal, "bad_debt", "边界-坏账"]
            );
            console.log("OK 边界财务: 坏账 [bad_debt]");
        }
        if (orders.length > 1 && orders[1].total > 0) {
            var refId = uuid();
            var refAmt = orders[1].total * 0.2;
            await client.query(
                "INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) " +
                "VALUES($1,$2,$3,$4,null,$5,$6,$7,$8,$9,NOW())",
                [refId, "PAY" + ts().slice(-8) + "RF", "order", -refAmt, "正常客户", "bank_transfer", "refunded", orders[1].id, "边界-部分退款"]
            );
            console.log("OK 边界财务: 部分退款 " + refAmt.toFixed(2));
        }
        await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function verifyReports() {
    console.log("\n========== 15. 数据验证 ==========");
    function fmt(v) {
        if (v === null || v === undefined) return 'null';
        if (typeof v === 'bigint') return String(v);
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    }
    function printRow(row) {
        var parts = [];
        for (var k in row) parts.push(k + "=" + fmt(row[k]));
        console.log("  " + parts.join(", "));
    }
    async function runQuery(label, sql) {
        try {
            var r = await db.query(sql);
            console.log("\n[" + label + "] rows=" + r.rows.length);
            r.rows.forEach(function(row, i) { printRow(row); });
            if (!r.rows.length) console.log("  (无数据)");
        } catch(e) {
            console.log("ERR [" + label + "]: " + e.message.split("\n")[0]);
        }
    }
    await runQuery("考勤统计", "SELECT e.employee_name, " +
        "COUNT(*) FILTER (WHERE a.status = 'normal') as normal_days, " +
        "COUNT(*) FILTER (WHERE a.status = 'absent') as absent_days, " +
        "COUNT(*) FILTER (WHERE a.status = 'late') as late_days " +
        "FROM attendance_record a JOIN employee e ON a.employee_id = e.id " +
        "GROUP BY e.employee_name");
    await runQuery("库存记录", "SELECT m.material_name, w.warehouse_name, " +
        "CAST(i.quantity AS int) as quantity " +
        "FROM stock_inventory i " +
        "JOIN material m ON i.material_id = m.id " +
        "JOIN warehouse w ON i.warehouse_id = w.id");
    await runQuery("应收异常", "SELECT order_id, CAST(amount AS text), " +
        "CAST(paid_amount AS text), status, remark " +
        "FROM receivable WHERE status IN ('overdue', 'bad_debt')");
    await runQuery("物流异常", "SELECT logistics_no, logistics_company, status, remark " +
        "FROM logistics_record WHERE status IN ('rejected', 'returned')");
    await runQuery("安装异常", "SELECT task_no, status, accept_status, visit_status " +
        "FROM installation_task WHERE status IN ('rework', 'failed') OR visit_status = 'visited'");
    await runQuery("包装记录", "SELECT pr.package_no, CAST(pr.total_packages AS int), " +
        "(SELECT COUNT(*) FROM package_item pi WHERE pi.package_id = pr.id) as item_count " +
        "FROM package_record pr");
    await runQuery("付款记录", "SELECT payment_no, CAST(amount AS text), payment_method, status, remark " +
        "FROM payment_in ORDER BY created_at DESC LIMIT 20");
    console.log("\n=== 全部测试完成 ===");
}

async function main() {
    await clearAll();
    var r = await createBasic();
    var custIds = await createCustomers();
    var suppIds = await createSuppliers();
    var whIds = await createWarehouses();
    var matIds = await createMaterials(suppIds);
    var orders = await createOrders(custIds);
    await createStock(matIds, whIds);
    await createProduction(orders);
    await createPackages(orders);
    await createLogistics(orders);
    await createInstallation(orders);
    await createAttendance(r.empIds);
    await createFinance(orders);
    await verifyReports();
    await pool.end();
    console.log("\n========================================");
    console.log("  [OK] 异常边界测试完成！");
    console.log("========================================");
    process.exit();
}

main().catch(function(err) { console.error('ERROR:', err.message); process.exit(1); });
