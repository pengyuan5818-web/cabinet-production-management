import subprocess

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'

script_b = r"""
const fs = require('fs');
const path = 'C:\\Users\\Administrator\\Desktop\\橱柜工厂管理系统\\src\\backend\\full_test_abnormal_v1.js';
let out = [];
function L(s){out.push(s);}

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
L("            await client.query('INSERT INTO order_master(id,order_no,source_type,customer_id,order_status,total_amount,deposit_amount,balance_amount,expected_delivery,installation_required,priority,delivery_province,delivery_city,delivery_district,delivery_address,delivery_contact,delivery_phone,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())', [id, 'O' + ts().slice(-8) + ri(1000,9999), 'customer', cust.id, 'pending', o.amt, o.amt * 0.3, o.amt * 0.7, delDate.toISOString().split('T')[0], true, o.prio, '广东省', '广州市', '天河区', '天河区某小区', '客户', '13800000001', '测试订单']);");
L('            const detId = uuid();');
L("            await client.query('INSERT INTO order_detail(id,order_id,product_name,product_type,cabinet_count,board_count,has_boards,material,color,length,width,height,unit_price,quantity,amount,created_at) VALUES($1,$2,$3,$4,2,8,true,$5,$6,800,600,2000,1,1,$7,NOW())', [detId, id, '标准橱柜', '定制品', '304不锈钢', '银色', o.amt]);");
L('            const trkId = uuid();');
L("            await client.query('INSERT INTO order_tracking(id,order_id,current_stage,stage_name,stage_status,operator_name,started_at,created_at) VALUES($1,$2,$3,$4,$5,$6,NOW(),NOW())', [trkId, id, 'design', '设计阶段', 'in_progress', '王五']);");
L('            const bomId = uuid();');
L("            await client.query('INSERT INTO order_bom(id,order_id,material_code,material_name,material_type,specification,unit,quantity,unit_price,total_price,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,10,380,3800,NULL,NOW())', [bomId, id, 'MAT-SUS15', '不锈钢板', '原材料', '1.5mm', '张']);");
L('            var statusStr = o.amt === 0 ? "零金额" : o.late ? "逾期未交付" : "正常";');
L("            console.log('OK: ' + id.substring(0,8) + '... [¥' + o.amt.toFixed(2) + '] [' + statusStr + ']');");
L('        }');
L("        await client.query('COMMIT'); return orderIds;");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');
L('');
L('async function createStock(matIds, whIds) {');
L("    console.log('\\n========== 8. 入库+库存（正常+边界） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        var zeroMat = matIds.find(m => m.name.indexOf("铰链") >= 0);');
L('        if (zeroMat) {');
L('            var inId = uuid();');
L("            await client.query('INSERT INTO stock_in(id,stock_in_no,warehouse_id,supplier_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,NULL,$4,1200,$5,NOW())', [inId, 'IN' + ts().slice(-6), whIds[0].id, '陈四', '边界-零库存进10出10']);");
L('            var invId = uuid();');
L("            await client.query('INSERT INTO stock_inventory(id,warehouse_id,material_id,quantity,last_in_date,created_at,updated_at) VALUES($1,$2,$3,10,NOW(),NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=10,updated_at=NOW()', [invId, whIds[0].id, zeroMat.id]);");
L('            var outId = uuid();');
L("            await client.query('INSERT INTO stock_out(id,stock_out_no,warehouse_id,operator_name,total_amount,remark,created_at) VALUES($1,$2,$3,$4,1200,$5,NOW())', [outId, 'OUT' + ts().slice(-6), whIds[0].id, '周九', '边界-零库存出库']);");
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
L('');
L('async function createProduction(orders) {');
L("    console.log('\\n========== 9. 生产记录（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        for (var pi = 0; pi < Math.min(4, orders.length); pi++) {');
L('            var order = orders[pi];');
L('            var doorId = uuid();');
L("            await client.query('INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,CURRENT_TIMESTAMP-INTERVAL \'3 days\',CURRENT_TIMESTAMP,$13,NOW())', [doorId, order.id, 'D' + ts().slice(-6) + ri(100,999), '标准门板', '304不锈钢', '银色', '拉丝', true, '液压', '粉末喷涂', '银色', 'completed', '仓库A区']);");
L('            var ctId = uuid();');
L("            await client.query('INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,1,$10,CURRENT_TIMESTAMP-INTERVAL \'2 days\',CURRENT_TIMESTAMP,$11,NOW())', [ctId, order.id, 'CT' + ts().slice(-6) + ri(100,999), '石英石台面', '石英石', '白色', '磨边', true, true, 'completed', '仓库B区']);");
L("            console.log('OK 生产: ' + order.id.substring(0,8) + '... 门板+台面 [completed]');");
L('        }');
L('        var lateOrder = orders.find(o => o.late);');
L('        if (lateOrder) { var schId = uuid(); await client.query("INSERT INTO production_schedule(id,schedule_no,order_id,schedule_date,priority,status,stage,scheduled_date,estimated_hours,created_at) VALUES($1,$2,$3,\'2026-03-10\',5,\'scheduled\',\'cutting\',\'2026-03-10\',16,NOW())", [schId, "SCH" + ts().slice(-6) + "LATE", lateOrder.id]); console.log("OK 边界: 延期排期（2026-03-10，至今未开始）"); }');
L('        if (orders[0]) { var doorId2 = uuid(); await client.query("INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_start,quality_complete,quality_result,quality_remark,current_location,created_at) VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,CURRENT_TIMESTAMP-INTERVAL \'5 days\',CURRENT_TIMESTAMP-INTERVAL \'1 day\',CURRENT_TIMESTAMP,$13,$14,NOW())", [doorId2, orders[0].id, "D" + ts().slice(-6) + "BAD", "标准门板", "304不锈钢", "银色", "拉丝", true, "液压", "粉末喷涂", "银色", "in_production", "rejected", "涂层气泡超标，已返工2次", "待返工区"]); console.log("OK 边界: 门板质量不合格 [rejected]"); }');
L('        if (orders[1]) { var ctId2 = uuid(); await client.query("INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_start,quality_complete,quality_result,current_location,created_at) VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,1,$10,CURRENT_TIMESTAMP-INTERVAL \'4 days\',CURRENT_TIMESTAMP-INTERVAL \'1 day\',CURRENT_TIMESTAMP,$11,$12,NOW())", [ctId2, orders[1].id, "CT" + ts().slice(-6) + "SCRP", "石英石台面", "石英石", "白色", "磨边", true, true, "in_production", "scrapped", "废料区"]); console.log("OK 边界: 台面报废 [scrapped]"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');
L('');
L('async function createPackages(orders) {');
L("    console.log('\\n========== 10. 包装（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        for (var pai = 0; pai < Math.min(3, orders.length); pai++) {');
L('            var order = orders[pai]; var pkgId = uuid();');
L('            var totalPkgs = ri(5, 15); var damagedPkgs = pai === 1 ? ri(1, 3) : 0; var missingPkgs = pai === 2 ? 2 : 0;');
L('            var remark = damagedPkgs > 0 ? "边界-部分破损" : missingPkgs > 0 ? "边界-缺件" : "正常包装";');
L("            await client.query('INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())', [pkgId, 'PKG' + ts().slice(-6) + pai, order.id, '纸箱+木架', '木架加固', totalPkgs, totalPkgs * ri(3,8), rf(50,200), 'stored', '周九', '仓库C区', remark]);");
L('            for (var paj = 0; paj < Math.min(3, totalPkgs); paj++) { var itemRemark = damagedPkgs > 0 && paj < damagedPkgs ? "轻微破损" : "正常"; await client.query("INSERT INTO package_item(id,package_id,product_name,product_type,quantity,weight,remark,created_at) VALUES($1,$2,$3,$4,1,$5,$6,NOW())", [uuid(), pkgId, pick(["门板","台面","铰链","导轨","拉手"]), "橱柜", rf(5,30), itemRemark]); }');
L('            var statusStr = damagedPkgs > 0 ? "部分破损" : missingPkgs > 0 ? "缺件" : "正常";');
L("            console.log('OK 包装: 订单' + (pai+1) + ' -> ' + totalPkgs + '件 [' + statusStr + ']');");
L('        }');
L('        if (orders.length > 3) { var pkgId2 = uuid(); await client.query("INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,$4,$5,10,10,500,$6,$7,$8,$9,NOW())", [pkgId2, "PKG" + ts().slice(-6) + "X", orders[3].id, "纸箱", "标准", "stored", "周九", "仓库D区", "边界-明细数量不符"]); await client.query("INSERT INTO package_item(id,package_id,product_name,quantity,weight,remark,created_at) VALUES($1,$2,$3,1,25,$4,NOW())", [uuid(), pkgId2, "门板", "边界-明细只有1条"]); console.log("OK 边界: 记录10件但明细只有1条"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');
fs.appendFileSync(path, out.join('\n') + '\n', 'utf8');
console.log('Part B done, lines:', out.length);
"""

result = subprocess.run(['node', '-e', script_b], capture_output=True, text=True)
print('STDOUT:', result.stdout)
print('STDERR:', result.stderr[:500] if result.stderr else '')
print('Code:', result.returncode)
