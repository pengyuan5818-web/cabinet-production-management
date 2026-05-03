// 生成完整测试脚本
const fs = require('fs');
const path = 'C:\\Users\\Administrator\\Desktop\\橱柜工厂管理系统\\src\\backend\\full_test_abnormal_v1.js';
let out = '';

function L(s) { out += s + '\n'; }

// === HEADER ===
L('// 橱柜工厂系统 - 异常边界测试 V1');
L('const { Pool } = require("pg");');
L('const pool = new Pool({ host: process.env.DB_HOST || "localhost", port: parseInt(process.env.DB_PORT || "5432"), user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD || "postgres", database: process.env.DB_NAME || "cabinet_factory", max: 10 });');
L('const uuid = () => require("crypto").randomUUID();');
L('const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;');
L('const rf = (a, b) => parseFloat((Math.random() * (b - a) + a).toFixed(2));');
L('const pick = a => a[ri(0, a.length - 1)];');
L('const ts = () => Date.now().toString();');
L('const db = { query: (t, p) => pool.query(t, p) };');

// === CLEARALL ===
L('async function clearAll() {');
L('    console.log("\\n========================================");');
L('    console.log("  橱柜工厂 - 异常边界测试 V1");');
L('    console.log("========================================");');
L('    console.log("\\n========== 1. 清空数据 ==========");');
L('    const client = await pool.connect();');
L('    try {');
L("        await client.query('SET session_replication_role = replica;');");
L("        await client.query('TRUNCATE TABLE payment_in, receivable, attendance_record, installation_progress, installer_allocation, installation_task, logistics_track, logistics_record, package_item, package_record, door_panel_production, countertop_production, production_schedule, production_worker, production_stage, stock_in, stock_out, stock_inventory, order_tracking, order_bom, order_detail, order_master, material_bom, material, warehouse, supplier, customer, employee, department CASCADE;');");
L("        await client.query('SET session_replication_role = origin;');");
L("        console.log('OK: 清空完成');");
L('    } finally { client.release(); }');
L('}');

// === CREATEBASIC ===
L('async function createBasic() {');
L("    console.log('\\n========== 2. 基础数据：部门+员工 ==========');");
L('    const client = await pool.connect(); const deptIds = {}; const empIds = [];');
L("    try {");
L("        await client.query('BEGIN');");
L("        const depts = [{ n: '销售部A', c: 'DEPT-SA', t: 'sales' }, { n: '设计部A', c: 'DEPT-DE', t: 'design' }, { n: '生产部A', c: 'DEPT-PR', t: 'production' }, { n: '仓储部A', c: 'DEPT-WH', t: 'warehouse' }, { n: '物流部A', c: 'DEPT-LO', t: 'logistics' }, { n: '安装部A', c: 'DEPT-IN', t: 'installation' }, { n: '财务部A', c: 'DEPT-FI', t: 'finance' }, { n: '人事部A', c: 'DEPT-HR', t: 'admin' }];");
L("        for (const d of depts) { const id = uuid(); deptIds[d.c] = id; await client.query('INSERT INTO department(id,dept_code,dept_name,dept_type,status,created_at) VALUES($1,$2,$3,$4,\"active\",NOW())', [id, d.c, d.n, d.t]); }");
L("        const emps = [{ n: '张三', d: 'DEPT-SA' }, { n: '李四', d: 'DEPT-SA' }, { n: '王五', d: 'DEPT-DE' }, { n: '赵六', d: 'DEPT-DE' }, { n: '钱七', d: 'DEPT-PR' }, { n: '孙八', d: 'DEPT-PR' }, { n: '周九', d: 'DEPT-WH' }, { n: '吴十', d: 'DEPT-WH' }, { n: '郑一', d: 'DEPT-LO' }, { n: '王二', d: 'DEPT-IN' }, { n: '冯三', d: 'DEPT-FI' }, { n: '陈四', d: 'DEPT-HR' }];");
L("        for (const e of emps) { const id = uuid(); empIds.push({ id, name: e.n, dept: e.d }); await client.query('INSERT INTO employee(id,employee_no,employee_name,dept_id,position,phone,status,hire_date,created_at) VALUES($1,$2,$3,$4,\"员工\",\"13800000000\",\"active\",DATE\"2024-01-01\",NOW())', [id, 'E' + ts().slice(-6) + ri(100,999), e.n, deptIds[e.d]]); }");
L("        await client.query('COMMIT');");
L("        console.log('OK: ' + depts.length + '部门, ' + emps.length + '员工');");
L('        return { deptIds, empIds };');
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATECUSTOMERS ===
L('async function createCustomers() {');
L("    console.log('\\n========== 3. 客户（正常+异常） ==========');");
L('    const client = await pool.connect(); const custIds = [];');
L("    try {");
L("        await client.query('BEGIN');");
L("        const custData = [{ n: '张先生', p: '13800138001', a: '广州市天河区珠江新城花城大道', t: 'normal' }, { n: '李女士', p: '13800138002', a: '深圳市南山区科技园', t: 'normal' }, { n: '王先生', p: '138001380000123', a: '佛山市禅城区季华六路绿地中心', t: 'abnormal_long_phone' }, { n: '赵先生', p: '', a: '广州市天河区珠江新城花城大道123号某某小区A栋1501很长', t: 'abnormal_empty_phone' }, { n: '刘女士', p: '', a: '东莞市南城区鸿福路108号', t: 'abnormal_empty_phone2' }, { n: '陈退', p: '13800138006', a: '珠海市香洲区情侣中路', t: 'abnormal_special' }];");
L('        for (const cu of custData) {');
L("            const id = uuid(); custIds.push({ id, name: cu.n, type: cu.t });");
L("            try { await client.query('INSERT INTO customer(id,customer_no,customer_name,phone,province,city,district,address,status,source,created_at) VALUES($1,$2,$3,$4,\"广东省\",\"广州市\",\"天河区\",$5,\"following\",\"测试\",NOW())', [id, 'C' + ts().slice(-6) + ri(100,999), cu.n, cu.p || null, cu.a]); console.log('OK: ' + cu.n + ' [' + cu.t + ']'); }");
L("            catch (e2) { console.log('FAIL: ' + cu.n + ' [' + cu.t + '] - ' + e2.message.split('\\n')[0]); }");
L('        }');
L("        await client.query('COMMIT'); return custIds;");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATESUPPLIERS ===
L('async function createSuppliers() {');
L("    console.log('\\n========== 4. 供应商 ==========');");
L('    const client = await pool.connect(); const suppIds = [];');
L("    try {");
L("        await client.query('BEGIN');");
L("        const supps = [{ n: '深圳伟业五金', c: 'SUP-SZ001', ct: '李经理', p: '13800138111' }, { n: '广州华南板材', c: 'SUP-GZ001', ct: '张经理', p: '13800138222' }, { n: '佛山高明石英石', c: 'SUP-FS001', ct: '王经理', p: '13800138333' }];");
L("        for (const s of supps) { const id = uuid(); suppIds.push({ id, name: s.n }); await client.query('INSERT INTO supplier(id,supplier_code,supplier_name,contact_person,phone,province,city,supply_category,status,created_at) VALUES($1,$2,$3,$4,$5,\"广东省\",\"深圳市\",\"原材料\",\"active\",NOW())', [id, s.c, s.n, s.ct, s.p]); console.log('OK: ' + s.n); }");
L("        await client.query('COMMIT'); return suppIds;");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATEWAREHOUSES ===
L('async function createWarehouses() {');
L("    console.log('\\n========== 5. 仓库 ==========');");
L('    const client = await pool.connect(); const whIds = [];');
L("    try {");
L("        await client.query('BEGIN');");
L("        const whs = [{ n: '广州总仓', c: 'WH001T' }, { n: '佛山分仓', c: 'WH002T' }, { n: '深圳分仓', c: 'WH003T' }];");
L("        for (const w of whs) { const id = uuid(); whIds.push({ id, name: w.n }); await client.query('INSERT INTO warehouse(id,warehouse_code,warehouse_name,warehouse_type,province,city,district,address,status,created_at) VALUES($1,$2,$3,\"main\",\"广东省\",\"广州市\",\"白云区\",\"广州市白云区钟落潭\",\"active\",NOW())', [id, w.c, w.n]); console.log('OK: ' + w.n); }");
L("        await client.query('COMMIT'); return whIds;");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATEMATERIALS ===
L('async function createMaterials(suppIds) {');
L("    console.log('\\n========== 6. 材料（正常+边界） ==========');");
L('    const client = await pool.connect(); const matIds = [];');
L("    try {");
L("        await client.query('BEGIN');");
L("        const mats = [{ n: '304不锈钢板1.5mm', cat: '不锈钢', sp: 380, code: 'MAT-SUS15' }, { n: '304不锈钢板2.0mm', cat: '不锈钢', sp: 520, code: 'MAT-SUS20' }, { n: '石英石台面板白色', cat: '台面', sp: 0, code: 'MAT-QS01' }, { n: '防火门板标准18mm', cat: '门板', sp: 220, code: 'MAT-FM01' }, { n: '抽屉导轨普通型', cat: '五金', sp: 15, code: 'MAT-DG01' }, { n: '液压铰链带缓冲', cat: '五金', sp: 8, code: 'MAT-HJ01' }, { n: 'ABS封边条白色', cat: '辅料', sp: 3, code: 'MAT-FB01' }, { n: 'LED灯带暖白色', cat: '电器', sp: 25, code: 'MAT-LED' }];");
L('        for (const m of mats) {');
L('            const id = uuid(); matIds.push({ id, name: m.n, code: m.code });');
L("            try { await client.query('INSERT INTO material(id,material_code,material_name,category,specification,unit,unit_price,safe_stock,supplier_id,supplier_name,status,created_at) VALUES($1,$2,$3,$4,\"标准\",\"张\",$5,100,$6,$7,\"active\",NOW())', [id, m.code + ts().slice(-4), m.n, m.cat, m.sp, suppIds[0] ? suppIds[0].id : null, suppIds[0] ? suppIds[0].name : '供应商']); console.log('OK: ' + m.n + ' [price=' + m.sp + ']'); }");
L("            catch (me) { console.log('FAIL: ' + m.n + ' - ' + me.message.split('\\n')[0]); }");
L('        }');
L("        await client.query('COMMIT'); return matIds;");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATEORDERS ===
L('async function createOrders(custIds) {');
L("    console.log('\\n========== 7. 订单（正常+异常） ==========');");
L('    const client = await pool.connect(); const orderIds = [];');
L("    try {");
L("        await client.query('BEGIN');");
L("        const orders = [{ cIdx: 0, amt: 34202.29, late: false, prio: 3 }, { cIdx: 1, amt: 26960.58, late: false, prio: 3 }, { cIdx: 2, amt: 22242.17, late: false, prio: 3 }, { cIdx: 3, amt: 42915.07, late: true, prio: 5 }, { cIdx: 4, amt: 15000.00, late: true, prio: 5 }, { cIdx: 0, amt: 0, late: false, prio: 3 }, { cIdx: 1, amt: 98765.43, late: false, prio: 5 }];");
L('        for (const o of orders) {');
L('            const id = uuid(); const cust = custIds[o.cIdx] || custIds[0];');
L('            orderIds.push({ id, total: o.amt, late: o.late });');
L('            const delDate = new Date(); delDate.setDate(delDate.getDate() + 15);');
L("            await client.query('INSERT INTO order_master(id,order_no,source_type,customer_id,order_status,total_amount,deposit_amount,balance_amount,expected_delivery,installation_required,priority,delivery_province,delivery_city,delivery_district,delivery_address,delivery_contact,delivery_phone,remark,created_at) VALUES($1,$2,'customer',$3,'pending',$4,$5,$6,$7,true,$8,\"广东省\",\"广州市\",\"天河区\",\"天河区某小区\",\"客户\",\"13800000001\",\"测试订单\",NOW())', [id, 'O' + ts().slice(-8) + ri(1000,9999), cust.id, o.amt, o.amt * 0.3, o.amt * 0.7, delDate.toISOString().split('T')[0], o.prio]);");
L('            const detId = uuid();');
L("            await client.query('INSERT INTO order_detail(id,order_id,product_name,product_type,cabinet_count,board_count,has_boards,material,color,length,width,height,unit_price,quantity,amount,created_at) VALUES($1,$2,'标准橱柜','定制品',2,8,true,'304不锈钢','银色',800,600,2000,1,1,$3,NOW())', [detId, id, o.amt]);");
L('            const trkId = uuid();');
L("            await client.query('INSERT INTO order_tracking(id,order_id,current_stage,stage_name,stage_status,operator_name,started_at,created_at) VALUES($1,$2,'design','设计阶段','in_progress','王五',NOW(),NOW())', [trkId, id]);");
L('            const bomId = uuid();');
L("            await client.query('INSERT INTO order_bom(id,order_id,material_code,material_name,material_type,specification,unit,quantity,unit_price,total_price,remark,created_at) VALUES($1,$2,'MAT-SUS15','不锈钢板','原材料','1.5mm','张',10,380,3800,NULL,NOW())', [bomId, id]);");
L('            var statusStr = o.amt === 0 ? "零金额" : o.late ? "逾期未交付" : "正常";');
L("            console.log('OK: ' + id.substring(0,8) + '... [¥' + o.amt.toFixed(2) + '] [' + statusStr + ']');");
L('        }');
L("        await client.query('COMMIT'); return orderIds;");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATESTOCK ===
L('async function createStock(matIds, whIds) {');
L("    console.log('\\n========== 8. 入库+库存（正常+边界） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        var zeroMat = matIds.find(m => m.name.indexOf("铰链") >= 0);');
L('        if (zeroMat) {');
L('            var inId = uuid();');
L("            await client.query('INSERT INTO stock_in(id,stock_in_no,warehouse_id,supplier_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,NULL,'陈四',1200,'边界-零库存进10出10',NOW())', [inId, 'IN' + ts().slice(-6), whIds[0].id]);");
L('            var invId = uuid();');
L("            await client.query('INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,10,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=10,updated_at=NOW()', [invId, whIds[0].id, zeroMat.id]);");
L('            var outId = uuid();');
L("            await client.query('INSERT INTO stock_out(id,stock_out_no,warehouse_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,'周九',1200,'边界-零库存出库',NOW())', [outId, 'OUT' + ts().slice(-6), whIds[0].id]);");
L("            await client.query('UPDATE stock_inventory SET quantity=0,last_out_date=NOW(),updated_at=NOW() WHERE warehouse_id=$1 AND material_id=$2', [whIds[0].id, zeroMat.id]);");
L("            console.log('OK 边界: 铰链 -> 零库存（进10出10）');");
L('        }');
L('        var lowMat = matIds.find(m => m.name.indexOf("1.5mm") >= 0);');
L('        if (lowMat) { var inv2 = uuid(); await client.query("INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,5,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=5,updated_at=NOW()", [inv2, whIds[0].id, lowMat.id]); console.log("OK 边界: 不锈钢板1.5mm -> 库存不足（5张，安全库存100）"); }');
L('        var overMat = matIds.find(m => m.name.indexOf("2.0mm") >= 0);');
L('        if (overMat) { var inv3 = uuid(); await client.query("INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,99999,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=99999,updated_at=NOW()", [inv3, whIds[0].id, overMat.id]); console.log("OK 边界: 不锈钢板2.0mm -> 超额入库99999张"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATEPRODUCTION ===
L('async function createProduction(orders) {');
L("    console.log('\\n========== 9. 生产记录（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        for (var pi = 0; pi < Math.min(4, orders.length); pi++) {');
L('            var order = orders[pi];');
L('            var doorId = uuid();');
L("            await client.query('INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,'标准门板',800,600,18,25.5,2,'304不锈钢','银色','拉丝',true,'液压',6,'粉末喷涂','银色',180,30,'completed',CURRENT_TIMESTAMP-INTERVAL'3 days',CURRENT_TIMESTAMP,'仓库A区',NOW())', [doorId, order.id, 'D' + ts().slice(-6) + ri(100,999)]);");
L('            var ctId = uuid();');
L("            await client.query('INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,'石英石台面','石英石',2000,600,15,'白色','磨边',true,true,1,'completed',CURRENT_TIMESTAMP-INTERVAL'2 days',CURRENT_TIMESTAMP,'仓库B区',NOW())', [ctId, order.id, 'CT' + ts().slice(-6) + ri(100,999)]);");
L("            console.log('OK 生产: ' + order.id.substring(0,8) + '... 门板+台面 [completed]');");
L('        }');
L('        var lateOrder = orders.find(o => o.late);');
L('        if (lateOrder) { var schId = uuid(); await client.query("INSERT INTO production_schedule(id,schedule_no,order_id,schedule_date,priority,status,stage,scheduled_date,estimated_hours,created_at) VALUES($1,$2,$3,DATE'2026-03-10',5,'scheduled','cutting',DATE'2026-03-10',16,NOW())", [schId, 'SCH' + ts().slice(-6) + 'LATE', lateOrder.id]); console.log("OK 边界: 延期排期（2026-03-10，至今未开始）"); }');
L('        if (orders[0]) { var doorId2 = uuid(); await client.query("INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_start,quality_complete,quality_result,quality_remark,current_location,created_at) VALUES($1,$2,$3,'标准门板',800,600,18,25.5,2,'304不锈钢','银色','拉丝',true,'液压',6,'粉末喷涂','银色',180,30,'in_production',CURRENT_TIMESTAMP-INTERVAL'5 days',CURRENT_TIMESTAMP-INTERVAL'1 day',CURRENT_TIMESTAMP,'rejected','涂层气泡超标，已返工2次','待返工区',NOW())", [doorId2, orders[0].id, 'D' + ts().slice(-6) + 'BAD']); console.log("OK 边界: 门板质量不合格 [rejected]"); }');
L('        if (orders[1]) { var ctId2 = uuid(); await client.query("INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_start,quality_complete,quality_result,current_location,created_at) VALUES($1,$2,$3,'石英石台面','石英石',2000,600,15,'白色','磨边',true,true,1,'in_production',CURRENT_TIMESTAMP-INTERVAL'4 days',CURRENT_TIMESTAMP-INTERVAL'1 day',CURRENT_TIMESTAMP,'scrapped','废料区',NOW())", [ctId2, orders[1].id, 'CT' + ts().slice(-6) + 'SCRP']); console.log("OK 边界: 台面报废 [scrapped]"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATEPACKAGES ===
L('async function createPackages(orders) {');
L("    console.log('\\n========== 10. 包装（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        for (var pai = 0; pai < Math.min(3, orders.length); pai++) {');
L('            var order = orders[pai]; var pkgId = uuid();');
L('            var totalPkgs = ri(5, 15); var damagedPkgs = pai === 1 ? ri(1, 3) : 0; var missingPkgs = pai === 2 ? 2 : 0;');
L('            var remark = damagedPkgs > 0 ? "边界-部分破损" : missingPkgs > 0 ? "边界-缺件" : "正常包装";');
L("            await client.query('INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,'纸箱+木架','木架加固',$4,$5,$6,'stored','周九','仓库C区',$7,NOW())', [pkgId, 'PKG' + ts().slice(-6) + pai, order.id, totalPkgs, totalPkgs * ri(3,8), rf(50,200), remark]);");
L('            for (var paj = 0; paj < Math.min(3, totalPkgs); paj++) { var itemRemark = damagedPkgs > 0 && paj < damagedPkgs ? "轻微破损" : "正常"; await client.query("INSERT INTO package_item(id,package_id,product_name,product_type,quantity,weight,remark,created_at) VALUES($1,$2,$3,'橱柜',1,$4,$5,NOW())", [uuid(), pkgId, pick(["门板","台面","铰链","导轨","拉手"]), rf(5,30), itemRemark]); }');
L('            var statusStr = damagedPkgs > 0 ? "部分破损" : missingPkgs > 0 ? "缺件" : "正常";');
L("            console.log('OK 包装: 订单' + (pai+1) + ' -> ' + totalPkgs + '件 [' + statusStr + ']');");
L('        }');
L('        if (orders.length > 3) { var pkgId2 = uuid(); await client.query("INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,'纸箱','标准',10,10,500,'stored','周九','仓库D区','边界-明细数量不符',NOW())", [pkgId2, 'PKG' + ts().slice(-6) + 'X', orders[3].id]); await client.query("INSERT INTO package_item(id,package_id,product_name,quantity,weight,remark,created_at) VALUES($1,$2,'门板',1,25,'边界-明细只有1条',NOW())", [uuid(), pkgId2]); console.log("OK 边界: 记录10件但明细只有1条"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATELOGISTICS ===
L('async function createLogistics(orders) {');
L("    console.log('\\n========== 11. 物流（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L("        var cities = [\"深圳市南山区\", \"东莞市南城区\", \"佛山市禅城区\", \"惠州市惠城区\"];");
L('        for (var li = 0; li < Math.min(4, orders.length); li++) {');
L('            var order = orders[li]; var logId = uuid(); var estDate = new Date(); estDate.setDate(estDate.getDate() + 3);');
L("            await client.query('INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,estimate_arrive,remark,created_at) VALUES($1,$2,$3,'顺丰速运','司机张','13800001111',500,'in_transit','广东省',$4,$5,$6,'客户','13800000001',$7,'正常运输中',NOW())', [logId, 'LF' + ts().slice(-6) + li, order.id, cities[li].split("市")[0] + "市", cities[li] + "区", cities[li] + "具体地址", estDate.toISOString().split("T")[0]]);");
L("            console.log('OK 物流: -> ' + cities[li] + ' [in_transit]');");
L('        }');
L('        if (orders.length > 4) { var rejId = uuid(); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,remark,created_at) VALUES($1,$2,$3,'德邦物流','司机李','13800002222',800,'rejected','广东省','深圳市','南山区','客户地址','客户','13800000001','边界-拒收(货物破损)',NOW())", [rejId, 'LF' + ts().slice(-6) + 'REJ', orders[4].id]); console.log("OK 边界物流: 拒收 [rejected]"); }');
L('        if (orders.length > 0) { var rtsId = uuid(); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,remark,created_at) VALUES($1,$2,$3,'中通速递','司机王','13800003333',300,'returned','广东省','佛山市','禅城区','客户地址','边界-超时退回(10天未妥投)',NOW())", [rtsId, 'LF' + ts().slice(-6) + 'RTS', orders[0].id]); console.log("OK 边界物流: 超期退回 [returned]"); }');
L('        if (orders.length > 1) { var lateId = uuid(); var ovDate = new Date(); ovDate.setDate(ovDate.getDate() - 3); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,estimate_arrive,remark,created_at) VALUES($1,$2,$3,'韵达快递','司机赵','13800004444',300,'in_transit','广东省','广州市','天河区','客户地址','客户','13800000001',$4,'边界-已超期3天仍未到达',NOW())", [lateId, 'LF' + ts().slice(-6) + 'LATE', orders[1].id, ovDate.toISOString().split("T")[0]]); console.log("OK 边界物流: 超期未到达 [in_transit, 超期3天]"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');

// === CREATEINSTALLATION ===
L('async function createInstallation(orders) {');
L("    console.log('\\n========== 12. 安装任务（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L("        var instCities = [\"深圳市南山区科苑花园\", \"东莞市南城区汇一城\"];");
L('        for (var ii = 0; ii < Math.min(2, orders.length); ii++) {');
L('            var instId = uuid(); var appDate = new Date(); appDate.setDate(appDate.getDate() + 1);');
L("            await client.query('INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,appointment_date,leader_name,status,accept_status,created_at) VALUES($1,$2,$3,'广东省',$4,$5,$6,$7,$8,$9,'王二','in_progress','pending',NOW())", [instId, 'IN' + ts().slice(-6) + ii, orders[ii].id, instCities[ii].split("市")[0] + "市", instCities[ii] + "区", instCities[ii] + "具体地址", "客户", "13800000001", appDate.toISOString().split