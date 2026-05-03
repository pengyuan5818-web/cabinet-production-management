const fs = require('fs');
const path = 'C:\\Users\\Administrator\\Desktop\\橱柜工厂管理系统\\src\\backend\\full_test_abnormal_v1.js';
let out = '';
const ln = s => out += s + '\n';

// Use ONLY $1, $2, etc. parameters - NO inline string values in SQL
// This completely avoids backtick/quote issues

ln('async function createOrders(custIds) {');
ln("    console.log('\\n========== 7. 订单（正常+异常） ==========');");
ln('    const client = await pool.connect(); const orderIds = [];');
ln("    try {");
ln("        await client.query('BEGIN');");
ln("        const orders = [{ cIdx: 0, amt: 34202.29, late: false, prio: 3 }, { cIdx: 1, amt: 26960.58, late: false, prio: 3 }, { cIdx: 2, amt: 22242.17, late: false, prio: 3 }, { cIdx: 3, amt: 42915.07, late: true, prio: 5 }, { cIdx: 4, amt: 15000.00, late: true, prio: 5 }, { cIdx: 0, amt: 0, late: false, prio: 3 }, { cIdx: 1, amt: 98765.43, late: false, prio: 5 }];");
ln('        for (const o of orders) {');
ln('            const id = uuid(); const cust = custIds[o.cIdx] || custIds[0];');
ln('            orderIds.push({ id, total: o.amt, late: o.late });');
ln('            const delDate = new Date(); delDate.setDate(delDate.getDate() + 15);');
ln("            await client.query($1, [id, 'O' + ts().slice(-8) + ri(1000,9999), cust.id, o.amt, o.amt * 0.3, o.amt * 0.7, delDate.toISOString().split('T')[0], o.prio]);");
ln('            const detId = uuid();');
ln("            await client.query($2, [detId, id, o.amt]);");
ln('            const trkId = uuid();');
ln("            await client.query($3, [trkId, id]);");
ln('            const bomId = uuid();');
ln("            await client.query($4, [bomId, id]);");
ln('            var statusStr = o.amt === 0 ? "零金额" : o.late ? "逾期未交付" : "正常";');
ln("            console.log('OK: ' + id.substring(0,8) + '... [¥' + o.amt.toFixed(2) + '] [' + statusStr + ']');");
ln('        }');
ln("        await client.query('COMMIT'); return orderIds;");
ln('    } catch (err) { await client.query(\"ROLLBACK\"); throw err; }');
ln('    finally { client.release(); }');
ln('}');
ln('async function createStock(matIds, whIds) {');
ln("    console.log('\\n========== 8. 入库+库存（正常+边界） ==========');");
ln('    const client = await pool.connect();');
ln("    try {");
ln("        await client.query('BEGIN');");
ln('        var zeroMat = matIds.find(m => m.name.indexOf("铰链") >= 0);');
ln('        if (zeroMat) {');
ln('            var inId = uuid();');
ln("            await client.query($5, [inId, 'IN' + ts().slice(-6), whIds[0].id]);");
ln('            var invId = uuid();');
ln("            await client.query($6, [invId, whIds[0].id, zeroMat.id]);");
ln('            var outId = uuid();');
ln("            await client.query($7, [outId, 'OUT' + ts().slice(-6), whIds[0].id]);");
ln("            await client.query($8, [whIds[0].id, zeroMat.id]);");
ln("            console.log('OK 边界: 铰链 -> 零库存（进10出10）');");
ln('        }');
ln('        var lowMat = matIds.find(m => m.name.indexOf("1.5mm") >= 0);');
ln('        if (lowMat) { var inv2 = uuid(); await client.query($9, [inv2, whIds[0].id, lowMat.id]); console.log("OK 边界: 不锈钢板1.5mm -> 库存不足（5张，安全库存100）"); }');
ln('        var overMat = matIds.find(m => m.name.indexOf("2.0mm") >= 0);');
ln('        if (overMat) { var inv3 = uuid(); await client.query($10, [inv3, whIds[0].id, overMat.id]); console.log("OK 边界: 不锈钢板2.0mm -> 超额入库99999张"); }');
ln("        await client.query('COMMIT');");
ln('    } catch (err) { await client.query(\"ROLLBACK\"); throw err; }');
ln('    finally { client.release(); }');
ln('}');
ln('async function createProduction(orders) {');
ln("    console.log('\\n========== 9. 生产记录（正常+异常） ==========');");
ln('    const client = await pool.connect();');
ln("    try {");
ln("        await client.query('BEGIN');");
ln('        for (var pi = 0; pi < Math.min(4, orders.length); pi++) {');
ln('            var order = orders[pi];');
ln('            var doorId = uuid();');
ln("            await client.query($11, [doorId, order.id, 'D' + ts().slice(-6) + ri(100,999)]);");
ln('            var ctId = uuid();');
ln("            await client.query($12, [ctId, order.id, 'CT' + ts().slice(-6) + ri(100,999)]);");
ln("            console.log('OK 生产: ' + order.id.substring(0,8) + '... 门板+台面 [completed]');");
ln('        }');
ln('        var lateOrder = orders.find(o => o.late);');
ln('        if (lateOrder) { var schId = uuid(); await client.query($13, [schId, "SCH" + ts().slice(-6) + "LATE", lateOrder.id]); console.log("OK 边界: 延期排期（2026-03-10，至今未开始）"); }');
ln('        if (orders[0]) { var doorId2 = uuid(); await client.query($14, [doorId2, orders[0].id, "D" + ts().slice(-6) + "BAD"]); console.log("OK 边界: 门板质量不合格 [rejected]"); }');
ln('        if (orders[1]) { var ctId2 = uuid(); await client.query($15, [ctId2, orders[1].id, "CT" + ts().slice(-6) + "SCRP"]); console.log("OK 边界: 台面报废 [scrapped]"); }');
ln("        await client.query('COMMIT');");
ln('    } catch (err) { await client.query(\"ROLLBACK\"); throw err; }');
ln('    finally { client.release(); }');
ln('}');
ln('async function createPackages(orders) {');
ln("    console.log('\\n========== 10. 包装（正常+异常） ==========');");
ln('    const client = await pool.connect();');
ln("    try {");
ln("        await client.query('BEGIN');");
ln('        for (var pai = 0; pai < Math.min(3, orders.length); pai++) {');
ln('            var order = orders[pai]; var pkgId = uuid();');
ln('            var totalPkgs = ri(5, 15); var damagedPkgs = pai === 1 ? ri(1, 3) : 0; var missingPkgs = pai === 2 ? 2 : 0;');
ln('            var remark = damagedPkgs > 0 ? "边界-部分破损" : missingPkgs > 0 ? "边界-缺件" : "正常包装";');
ln("            await client.query($16, [pkgId, 'PKG' + ts().slice(-6) + pai, order.id, totalPkgs, totalPkgs * ri(3,8), rf(50,200), remark]);");
ln('            for (var paj = 0; paj < Math.min(3, totalPkgs); paj++) { var itemRemark = damagedPkgs > 0 && paj < damagedPkgs ? "轻微破损" : "正常"; await client.query($17, [uuid(), pkgId, pick(["门板","台面","铰链","导轨","拉手"]), rf(5,30), itemRemark]); }');
ln('            var statusStr = damagedPkgs > 0 ? "部分破损" : missingPkgs > 0 ? "缺件" : "正常";');
ln("            console.log('OK 包装: 订单' + (pai+1) + ' -> ' + totalPkgs + '件 [' + statusStr + ']');");
ln('        }');
ln('        if (orders.length > 3) { var pkgId2 = uuid(); await client.query($18, [pkgId2, 'PKG' + ts().slice(-6) + 'X', orders[3].id]); await client.query($19, [uuid(), pkgId2]); console.log("OK 边界: 记录10件但明细只有1条"); }');
ln("        await client.query('COMMIT');");
ln('    } catch (err) { await client.query(\"ROLLBACK\"); throw err; }');
ln('    finally { client.release(); }');
ln('}');

// SQL templates - MUST be defined before use
const SQL = {
om: "INSERT INTO order_master(id,order_no,source_type,customer_id,order_status,total_amount,deposit_amount,balance_amount,expected_delivery,installation_required,priority,delivery_province,delivery_city,delivery_district,delivery_address,delivery_contact,delivery_phone,remark,created_at) VALUES($1,$2,'customer',$3,'pending',$4,$5,$6,$7,true,$8,'广东省','广州市','天河区','天河区某小区','客户','13800000001','测试订单',NOW())",
od: "INSERT INTO order_detail(id,order_id,product_name,product_type,cabinet_count,board_count,has_boards,material,color,length,width,height,unit_price,quantity,amount,created_at) VALUES($1,$2,'标准橱柜','定制品',2,8,true,'304不锈钢','银色',800,600,2000,1,1,$3,NOW())",
ot: "INSERT INTO order_tracking(id,order_id,current_stage,stage_name,stage_status,operator_name,started_at,created_at) VALUES($1,$2,'design','设计阶段','in_progress','王五',NOW(),NOW())",
ob: "INSERT INTO order_bom(id,order_id,material_code,material_name,material_type,specification,unit,quantity,unit_price,total_price,remark,created_at) VALUES($1,$2,'MAT-SUS15','不锈钢板','原材料','1.5mm','张',10,380,3800,NULL,NOW())",
si: "INSERT INTO stock_in(id,stock_in_no,warehouse_id,supplier_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,NULL,'陈四',1200,'边界-零库存进10出10',NOW())",
inv_in: "INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,10,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=10,updated_at=NOW()",
so: "INSERT INTO stock_out(id,stock_out_no,warehouse_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,'周九',1200,'边界-零库存出库',NOW())",
inv_zero: "UPDATE stock_inventory SET quantity=0,last_out_date=NOW(),updated_at=NOW() WHERE warehouse_id=$1 AND material_id=$2",
inv_low: "INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,5,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=5,updated_at=NOW()",
inv_over: "INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,99999,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=99999,updated_at=NOW()",
dp: "INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,'标准门板',800,600,18,25.5,2,'304不锈钢','银色','拉丝',true,'液压',6,'粉末喷涂','银色',180,30,'completed',CURRENT_TIMESTAMP-INTERVAL'3 days',CURRENT_TIMESTAMP,'仓库A区',NOW())",
ct: "INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,'石英石台面','石英石',2000,600,15,'白色','磨边',true,true,1,'completed',CURRENT_TIMESTAMP-INTERVAL'2 days',CURRENT_TIMESTAMP,'仓库B区',NOW())",
sch: "INSERT INTO production_schedule(id,schedule_no,order_id,schedule_date,priority,status,stage,scheduled_date,estimated_hours,created_at) VALUES($1,$2,$3,DATE'2026-03-10',5,'scheduled','cutting',DATE'2026-03-10',16,NOW())",
dp_bad: "INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_start,quality_complete,quality_result,quality_remark,current_location,created_at) VALUES($1,$2,$3,'标准门板',800,600,18,25.5,2,'304不锈钢','银色','拉丝',true,'液压',6,'粉末喷涂','银色',180,30,'in_production',CURRENT_TIMESTAMP-INTERVAL'5 days',CURRENT_TIMESTAMP-INTERVAL'1 day',CURRENT_TIMESTAMP,'rejected','涂层气泡超标，已返工2次','待返工区',NOW())",
ct_bad: "INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_start,quality_complete,quality_result,current_location,created_at) VALUES($1,$2,$3,'石英石台面','石英石',2000,600,15,'白色','磨边',true,true,1,'in_production',CURRENT_TIMESTAMP-INTERVAL'4 days',CURRENT_TIMESTAMP-INTERVAL'1 day',CURRENT_TIMESTAMP,'scrapped','废料区',NOW())",
pkg: "INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,'纸箱+木架','木架加固',$4,$5,$6,'stored','周九','仓库C区',$7,NOW())",
pkg_item: "INSERT INTO package_item(id,package_id,product_name,product_type,quantity,weight,remark,created_at) VALUES($1,$2,$3,'橱柜',1,$4,$5,NOW())",
pkg_bad: "INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,'纸箱','标准',10,10,500,'stored','周九','仓库D区','边界-明细数量不符',NOW())",
pkg_item_bad: "INSERT INTO package_item(id,package_id,product_name,quantity,weight,remark,created_at) VALUES($1,$2,'门板',1,25,'边界-明细只有1条',NOW())",
};

fs.appendFileSync(path, out, 'utf8');
console.log('Part 2 appended');
