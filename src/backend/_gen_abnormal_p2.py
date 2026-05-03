path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'

extra = """
            await client.query('INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_start,quality_complete,quality_result,quality_remark,current_location,created_at) VALUES($1,$2,$3,\\'标准门板\\',800,600,18,25.5,2,\\'304不锈钢\\',\\'银色\\',\\'拉丝\\',true,\\'液压铰链\\',6,\\'粉末喷涂\\',\\'银色\\',180,30,\\'in_production\\',CURRENT_TIMESTAMP-INTERVAL\\'5 days\\',CURRENT_TIMESTAMP-INTERVAL\\'1 day\\',CURRENT_TIMESTAMP,\\'rejected\\',\\'涂层气泡超标，已返工2次\\',\\'待返工区\\',NOW())', [doorId2, orders[0].id, 'D' + ts().slice(-6) + 'BAD']);
            console.log('OK 边界生产: 门板质量不合格 [rejected, 返工2次]');
        }
        // Scrapped
        if (orders[1]) {
            var ctId2 = uuid();
            await client.query('INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_start,quality_complete,quality_result,current_location,created_at) VALUES($1,$2,$3,\\'石英石台面\\',\\'石英石\\',2000,600,15,\\'白色\\',\\'磨边\\',true,true,1,\\'in_production\\',CURRENT_TIMESTAMP-INTERVAL\\'4 days\\',CURRENT_TIMESTAMP-INTERVAL\\'1 day\\',CURRENT_TIMESTAMP,\\'scrapped\\',\\'废料区\\',NOW())', [ctId2, orders[1].id, 'CT' + ts().slice(-6) + 'SCRP']);
            console.log('OK 边界生产: 台面报废 [scrapped]');
        }
        await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
}

async function createPackages(orders) {
    console.log('\\n========== 10. 包装（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (var pai = 0; pai < Math.min(3, orders.length); pai++) {
            var order = orders[pai];
            var pkgId = uuid();
            var totalPkgs = ri(5, 15);
            var damagedPkgs = pai === 1 ? ri(1, 3) : 0;
            var missingPkgs = pai === 2 ? 2 : 0;
            var remark = damagedPkgs > 0 ? '边界测试-部分破损' : missingPkgs > 0 ? '边界测试-缺件' : '正常包装';
            await client.query('INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,\\'纸箱+木架\\',\\'木架加固\\',$4,$5,$6,\\'stored\\',\\'周九\\',\\'仓库C区\\',$7,NOW())', [pkgId, 'PKG' + ts().slice(-6) + pai, order.id, totalPkgs, totalPkgs * ri(3, 8), rf(50, 200), remark]);
            for (var paj = 0; paj < Math.min(3, totalPkgs); paj++) {
                var itemRemark = damagedPkgs > 0 && paj < damagedPkgs ? '轻微破损' : '正常';
                await client.query('INSERT INTO package_item(id,package_id,product_name,product_type,quantity,weight,remark,created_at) VALUES($1,$2,$3,\\'橱柜\\',1,$4,$5,NOW())', [uuid(), pkgId, pick(['门板', '台面', '铰链', '导轨', '拉手']), rf(5, 30), itemRemark]);
            }
            var statusStr = damagedPkgs > 0 ? '部分破损' : missingPkgs > 0 ? '缺件' : '正常';
            console.log('OK 包装: 订单' + (pai + 1) + ' -> ' + totalPkgs + '件 [' + statusStr + ']');
        }
        // Mismatch: record 10 packages but only 1 item
        if (orders.length > 3) {
            var pkgId2 = uuid();
            await client.query('INSERT INTO package_record(id,package_no,order_id,package_type,package_method,total_packages,total_quantity,total_weight,status,scan_operator_name,storage_area,remark,created_at) VALUES($1,$2,$3,\\'纸箱\\',\\'标准\\',10,10,500,\\'stored\\',\\'周九\\',\\'仓库D区\\',\\'边界测试-明细数量不符\\',NOW())', [pkgId2, 'PKG' + ts().slice(-6) + 'X', orders[3].id]);
            await client.query('INSERT INTO package_item(id,package_id,product_name,quantity,weight,remark,created_at) VALUES($1,$2,\\'门板\\',1,25,\\'边界测试-明细只有1条\\',NOW())', [uuid(), pkgId2]);
            console.log('OK 边界包装: 记录10件但明细只有1条');
        }
        await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
}

async function createLogistics(orders) {
    console.log('\\n========== 11. 物流/运输（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        var cities = ['深圳市南山区', '东莞市南城区', '佛山市禅城区', '惠州市惠城区', '中山市东区'];
        for (var li = 0; li < Math.min(4, orders.length); li++) {
            var order = orders[li];
            var logId = uuid();
            var estDate = new Date(); estDate.setDate(estDate.getDate() + 3);
            await client.query('INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,estimate_arrive,remark,created_at) VALUES($1,$2,$3,\\'顺丰速运\\',\\'司机张\\',\\'13800001111\\',500,\\'in_transit\\',\\'广东省\\',$4,\\'区\\',$5,\\'客户\\',\\'13800000001\\',$6,\\'正常运输中\\',NOW())', [logId, 'LF' + ts().slice(-6) + li, order.id, cities[li].split('市')[0] + '市', cities[li], estDate.toISOString().split('T')[0]]);
            console.log('OK 物流: -> ' + cities[li] + ' [in_transit]');
        }
        // Rejected
        if (orders.length > 4) {
            var rejId = uuid();
            await client.query('INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,remark,created_at) VALUES($1,$2,$3,\\'德邦物流\\',\\'司机李\\',\\'13800002222\\',800,\\'rejected\\',\\'广东省\\',\\'深圳市\\',\\'南山区\\',\\'客户地址\\',\\'客户\\',\\'13800000001\\',\\'边界测试-拒收(货物破损)\\',NOW())', [rejId, 'LF' + ts().slice(-6) + 'REJ', orders[4].id]);
            console.log('OK 边界物流: 拒收 [rejected]');
        }
        // Returned
        if (orders.length > 0) {
            var rtsId = uuid();
            await client.query('INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,remark,created_at) VALUES($1,$2,$3,\\'中通速递\\',\\'司机王\\',\\'13800003333\\',300,\\'returned\\',\\'广东省\\',\\'佛山市\\',\\'禅城区\\',\\'客户地址\\',\\'边界测试-超时退回(10天未妥投)\\',NOW())', [rtsId, 'LF' + ts().slice(-6) + 'RTS', orders[0].id]);
            console.log('OK 边界物流: 超期退回 [returned]');
        }
        // Overdue in transit
        if (orders.length > 1) {
            var lateId = uuid();
            var ovDate = new Date(); ovDate.setDate(ovDate.getDate() - 3);
            await client.query('INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,estimate_arrive,remark,created_at) VALUES($1,$2,$3,\\'韵达快递\\',\\'司机赵\\',\\'13800004444\\',300,\\'in_transit\\',\\'广东省\\',\\'广州市\\',\\'天河区\\',\\'客户地址\\',\\'客户\\',\\'13800000001\\',$4,\\'边界测试-已超期3天仍未到达\\',NOW())', [lateId, 'LF' + ts().slice(-6) + 'LATE', orders[1].id, ovDate.toISOString().split('T')[0]]);
            console.log('OK 边界物流: 超期未到达 [in_transit, 超期3天]');
        }
        await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
}

async function createInstallation(orders) {
    console.log('\\n========== 12. 安装任务（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        var instCities = ['深圳市南山区科苑花园', '东莞市南城区汇一城'];
        for (var ii = 0; ii < Math.min(2, orders.length); ii++) {
            var instId = uuid();
            var appDate = new Date(); appDate.setDate(appDate.getDate() + 1);
            await client.query('INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,appointment_date,leader_name,status,accept_status,created_at) VALUES($1,$2,$3,\\'广东省\\',$4,\\'区\\',$5,$6,$7,$8,\\'王二\\',\\'in_progress\\',\\'pending\\',NOW())', [instId, 'IN' + ts().slice(-6) + ii, orders[ii].id, instCities[ii].split('市')[0] + '市', instCities[ii], '客户', '13800000001', appDate.toISOString().split('T')[0]]);
            await client.query('INSERT INTO installer_allocation(id,task_id,employee_name,role,work_hours,allowance,created_at) VALUES($1,$2,\\'王二\\',\\'组长\\',8,0,NOW())', [uuid(), instId]);
            await client.query('INSERT INTO installer_allocation(id,task_id,employee_name,role,work_hours,allowance,created_at) VALUES($1,$2,\\'郑一\\',\\'组员\\',8,0,NOW())', [uuid(), instId]);
            await client.query('INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,50,\\'installation\\',\\'安装中\\',\\'门板安装中\\',NOW())', [uuid(), instId]);
            console.log('OK 安装: -> ' + instCities[ii] + ' [in_progress]');
        }
        // Rework required
        if (orders.length > 2) {
            var failId = uuid();
            await client.query('INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,leader_name,status,accept_status,created_at) VALUES($1,$2,$3,\\'广东省\\',\\'佛山市\\',\\'禅城区\\',\\'禅城区某小区\\',\\'客户\\',\\'13800000001\\',\\'王二\\',\\'rework\\',\\'failed\\',NOW())', [failId, 'IN' + ts().slice(-6) + 'FW', orders[2].id]);
            await client.query('INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,30,\\'dismantle\\',\\'拆旧\\',\\'已完成拆旧\\',NOW())', [uuid(), failId]);
            await client.query('INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,60,\\'installation\\',\\'安装\\',\\'门板划伤，停工\\',NOW())', [uuid(), failId]);
            await client.query('INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,0,\\'countertop\\',\\'台面\\',\\'等待返工\\',NOW())', [uuid(), failId]);
            console.log('OK 边界安装: 安装失败需返工 [rework]');
        }
        // Completed with bad rating
        if (orders.length > 3) {
            var cmpId = uuid();
            await client.query('INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,leader_name,status,accept_status,accept_remark,visit_status,visit_remark,created_at) VALUES($1,$2,$3,\\'广东省\\',\\'惠州市\\',\\'惠城区\\',\\'惠城区某小区\\',\\'客户\\',\\'13800000001\\',\\'王二\\',\\'completed\\',\\'accepted\\',\\'勉强通过，缝隙超标\\',\\'visited\\',\\'客户很不满意\\',NOW())', [cmpId, 'IN' + ts().slice(-6) + 'CM', orders[3].id]);
            console.log('OK 边界安装: 完成但客户差评 [completed, visit_status=visited]');
        }
        await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
}

async function createAttendance(empIds) {
    console.log('\\n========== 13. 考勤（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (var ai = 0; ai < empIds.length; ai++) {
            var emp = empIds[ai];
            // Normal days (20 days)
            for (var ad = 0; ad < 20; ad++) {
                var d = new Date(); d.setDate(d.getDate() - ad);
                var dateStr = d.toISOString().split('T')[0];
                await client.query('INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,\\'normal\\',$4,$5,8,\\'正常\\',NOW())', [uuid(), emp.id, dateStr, '08:0' + String(ad % 10), '18:0' + String(ad % 10)]);
            }
            // Absent (3 days)
            for (var aa = 21; aa <= 23; aa++) {
                var da = new Date(); da.setDate(da.getDate() - aa);
                await client.query('INSERT INTO attendance_record(id,employee_id,record_date,status,working_hours,remark,created_at) VALUES($1,$2,$3,\\'absent\\',0,\\'边界测试-旷工\\',NOW())', [uuid(), emp.id, da.toISOString().split('T')[0]]);
            }
            // Overtime (6 hours)
            var otDate = new Date(); otDate.setDate(otDate.getDate() - 24);
            await client.query('INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,\\'normal\\',\\'08:00\\',\\'22:30\\',14,\\'边界测试-日加班6小时\\',NOW())', [uuid(), emp.id, otDate.toISOString().split('T')[0]]);
            // Late (5 days)
            for (var al = 25; al <= 29; al++) {
                var dl = new Date(); dl.setDate(dl.getDate() - al);
                await client.query('INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,\\'late\\',\\'09:30\\',\\'18:00\\',7,\\'边界测试-迟到\\',NOW())', [uuid(), emp.id, dl.toISOString().split('T')[0]]);
            }
        }
        console.log('OK 考勤: ' + empIds.length + '人 x 30天（含旷工/加班/迟到异常）');
        await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
}

async function createFinance(orders) {
    console.log('\\n========== 14. 财务（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Normal payments
        for (var fi = 0; fi < Math.min(3, orders.length); fi++) {
            var order = orders[fi];
            var payId = uuid();
            var amount = order.total > 0 ? order.total * 0.3 : rf(1000, 5000);
            await client.query('INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) VALUES($1,$2,\\'order\\',$3,$4,\\'客户\\',\\'bank_transfer\\',\\'confirmed\\',$5,\\'正常收款\\',NOW())', [payId, 'PAY' + ts().slice(-8), amount, orders[0] && orders[0].id ? '00000000-0000-0000-0000-000000000000' : '00000000-0000-0000-0000-000000000000', order.id]);
            console.log('OK 收款: ¥' + amount.toFixed(2) + ' [confirmed]');
        }
        // Overdue receivable
        var overId = uuid();
        var overOrder = orders.find(o => o.total > 0) || orders[0];
        if (overOrder) {
            await client.query("INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,paid_amount,status,remark,created_at) VALUES($1,$2,$3,'BILL'+NOW()::text,DATE'2026-03-01',DATE'2026-03-15',$4,0,'overdue','边界测试-逾期20天',NOW())", [overId, '00000000-0000-0000-0000-000000000000', overOrder.id, rf(10000, 30000)]);
            console.log('OK 边界财务: 逾期应收账款 [overdue, 逾期20天]');
        }
        // Bad debt
        var badId = uuid();
        var badOrder = orders.find(o => o.total > 0);
        if (badOrder) {
            await client.query("INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,paid_amount,status,remark,created_at) VALUES($1,$2,$3,'BILL'+NOW()::text,DATE'2026-01-01',DATE'2026-01-15',$4,0,'bad_debt','边界测试-坏账(客户破产)',NOW())", [badId, '00000000-0000-0000-0000-000000000000', badOrder.id, rf(20000, 50000)]);
            console.log('OK 边界财务: 坏账 [bad_debt]');
        }
        // Partial refund
        if (orders.length > 1 && orders[1].total > 0) {
            var refId = uuid();
            await client.query('INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) VALUES($1,$2,\\'order\\',-$3,$4,\\'客户\\',\\'bank_transfer\\',\\'refunded\\',$5,\\'边界测试-部分退款(产品质量问题)\\',NOW())', [refId, 'PAY' + ts().slice(-8), orders[1].total * 0.2, '00000000-0000-0000-0000-000000000000', orders[1].id]);
            console.log('OK 边界财务: 部分退款 ¥' + (orders[1].total * 0.2).toFixed(2));
        }
        await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
}

async function verifyReports() {
    console.log('\\n========== 15. 报表验证 ==========');
    try {
        var att = await db.query("SELECT e.employee_name, COUNT(*) FILTER (WHERE a.status='normal') as normal_days, COUNT(*) FILTER (WHERE a.status='absent') as absent_days, COUNT(*) FILTER (WHERE a.status='late') as late_days FROM attendance_record a JOIN employee e ON e.id=a.employee_id GROUP BY e.employee_name ORDER BY e.employee_name");
        console.log('\\n[考勤异常统计]');
        console.table(att.rows);
        var inv = await db.query("SELECT m.material_name, w.warehouse_name, i.quantity, i.locked_quantity FROM stock_inventory i JOIN material m ON m.id=i.material_id JOIN warehouse w ON w.id=i.warehouse_id ORDER BY i.quantity ASC NULLS LAST");
        console.log('\\n[库存（按数量升序）]');
        console.table(inv.rows);
        var rec = await db.query("SELECT order_id, amount, paid_amount, status, remark FROM receivable WHERE status IN ('overdue','bad_debt')");
        console.log('\\n[逾期/坏账应收款]');
        console.table(rec.rows);
        var log = await db.query("SELECT logistics_no, logistics_company, status, remark FROM logistics_record ORDER BY created_at DESC");
        console.log('\\n[物流状态]');
        console.table(log.rows);
        var inst = await db.query("SELECT task_no, status, accept_status, accept_remark, visit_status FROM installation_task ORDER BY created_at DESC");
        console.log('\\n[安装任务]');
        console.table(inst.rows);
        var pkg = await db.query("SELECT pr.package_no, pr.total_packages, pr.total_weight, pr.status, (SELECT COUNT(*) FROM package_item pi WHERE pi.package_id=pr.id) as item_count, pr.remark FROM package_record pr ORDER BY pr.created_at DESC");
        console.log('\\n[包装记录（检查件数相符）]');
        console.table(pkg.rows);
        var payments = await db.query("SELECT payment_no, amount, payment_method, status, remark FROM payment_in ORDER BY created_at DESC");
        console.log('\\n[收款记录（含退款）]');
        console.table(payments.rows);
    } catch (err) { console.log('WARN 报表验证出错: ' + err.message.split('\\n')[0]); }
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
    console.log('\\n========================================');
    console.log('  [OK] 异常边界测试完成！');
    console.log('========================================');
    process.exit();
}

main().catch(function(err) { console.error('ERROR:', err.message); process.exit(1); });
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + extra)

import subprocess
r = subprocess.run(['node', '--check', path], capture_output=True)
stderr = r.stderr.decode('utf-8', errors='replace')
print('Lines:', open(path, encoding='utf-8').read().count('\n'))
print('Syntax:', stderr[:300] if stderr else 'OK')
print('Code:', r.returncode)
