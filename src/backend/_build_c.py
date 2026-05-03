import subprocess

script_c = r"""
const fs = require('fs');
const path = 'C:\\Users\\Administrator\\Desktop\\橱柜工厂管理系统\\src\\backend\\full_test_abnormal_v1.js';
let out = [];
function L(s){out.push(s);}

L('async function createLogistics(orders) {');
L("    console.log('\\n========== 11. 物流（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L("        var cities = [\"深圳市南山区\", \"东莞市南城区\", \"佛山市禅城区\", \"惠州市惠城区\"];");
L('        for (var li = 0; li < Math.min(4, orders.length); li++) {');
L('            var order = orders[li]; var logId = uuid(); var estDate = new Date(); estDate.setDate(estDate.getDate() + 3);');
L("            await client.query('INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,estimate_arrive,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())', [logId, 'LF' + ts().slice(-6) + li, order.id, '顺丰速运', '司机张', '13800001111', 500, 'in_transit', '广东省', cities[li].split("市")[0] + "市", cities[li] + "区", cities[li] + "具体地址", '客户', '13800000001', estDate.toISOString().split("T")[0], '正常运输中']);");
L("            console.log('OK 物流: -> ' + cities[li] + ' [in_transit]');");
L('        }');
L('        if (orders.length > 4) { var rejId = uuid(); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())", [rejId, "LF" + ts().slice(-6) + "REJ", orders[4].id, "德邦物流", "司机李", "13800002222", 800, "rejected", "广东省", "深圳市", "南山区", "客户地址", "客户", "13800000001", "边界-拒收(货物破损)"]); console.log("OK 边界物流: 拒收 [rejected]"); }');
L('        if (orders.length > 0) { var rtsId = uuid(); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())", [rtsId, "LF" + ts().slice(-6) + "RTS", orders[0].id, "中通速递", "司机王", "13800003333", 300, "returned", "广东省", "佛山市", "禅城区", "客户地址", "边界-超时退回(10天未妥投)"]); console.log("OK 边界物流: 超期退回 [returned]"); }');
L('        if (orders.length > 1) { var lateId = uuid(); var ovDate = new Date(); ovDate.setDate(ovDate.getDate() - 3); await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,estimate_arrive,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())", [lateId, "LF" + ts().slice(-6) + "LATE", orders[1].id, "韵达快递", "司机赵", "13800004444", 300, "in_transit", "广东省", "广州市", "天河区", "客户地址", "客户", "13800000001", ovDate.toISOString().split("T")[0], "边界-已超期3天仍未到达"]); console.log("OK 边界物流: 超期未到达 [in_transit, 超期3天]"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');
L('');
L('async function createInstallation(orders) {');
L("    console.log('\\n========== 12. 安装任务（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L("        var instCities = [\"深圳市南山区科苑花园\", \"东莞市南城区汇一城\"];");
L('        for (var ii = 0; ii < Math.min(2, orders.length); ii++) {');
L('            var instId = uuid(); var appDate = new Date(); appDate.setDate(appDate.getDate() + 1);');
L("            await client.query('INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,appointment_date,leader_name,status,accept_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())', [instId, 'IN' + ts().slice(-6) + ii, orders[ii].id, '广东省', instCities[ii].split("市")[0] + "市", instCities[ii] + "区", instCities[ii] + "具体地址", '客户', '13800000001', appDate.toISOString().split("T")[0], '王二', 'in_progress', 'pending']);");
L("            await client.query('INSERT INTO installer_allocation(id,task_id,employee_name,role,work_hours,allowance,created_at) VALUES($1,$2,$3,$4,8,0,NOW())', [uuid(), instId, '王二', '组长']);");
L("            await client.query('INSERT INTO installer_allocation(id,task_id,employee_name,role,work_hours,allowance,created_at) VALUES($1,$2,$3,$4,8,0,NOW())', [uuid(), instId, '郑一', '组员']);");
L("            await client.query('INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,50,$3,$4,$5,NOW())', [uuid(), instId, 'installation', '安装中', '门板安装中']);");
L("            console.log('OK 安装: -> ' + instCities[ii] + ' [in_progress]');");
L('        }');
L('        if (orders.length > 2) { var failId = uuid(); await client.query("INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,leader_name,status,accept_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())", [failId, "IN" + ts().slice(-6) + "FW", orders[2].id, "广东省", "佛山市", "禅城区", "禅城区某小区", "客户", "13800000001", "王二", "rework", "failed"]); await client.query("INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,30,$3,$4,$5,NOW())", [uuid(), failId, "dismantle", "拆旧", "已完成拆旧"]); await client.query("INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,60,$3,$4,$5,NOW())", [uuid(), failId, "installation", "安装", "门板划伤，停工"]); await client.query("INSERT INTO installation_progress(id,task_id,progress,stage,stage_name,description,created_at) VALUES($1,$2,0,$3,$4,$5,NOW())", [uuid(), failId, "countertop", "台面", "等待返工"]); console.log("OK 边界安装: 安装失败需返工 [rework]"); }');
L('        if (orders.length > 3) { var cmpId = uuid(); await client.query("INSERT INTO installation_task(id,task_no,order_id,install_province,install_city,install_district,install_address,install_contact,install_phone,leader_name,status,accept_status,accept_remark,visit_status,visit_remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())", [cmpId, "IN" + ts().slice(-6) + "CM", orders[3].id, "广东省", "惠州市", "惠城区", "惠城区某小区", "客户", "13800000001", "王二", "completed", "accepted", "勉强通过，缝隙超标", "visited", "客户很不满意"]); console.log("OK 边界安装: 完成但客户差评 [completed, visit_status=visited]"); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');
L('');
L('async function createAttendance(empIds) {');
L("    console.log('\\n========== 13. 考勤（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        for (var ai = 0; ai < empIds.length; ai++) {');
L('            var emp = empIds[ai];');
L('            for (var ad = 0; ad < 20; ad++) { var d = new Date(); d.setDate(d.getDate() - ad); var dateStr = d.toISOString().split("T")[0]; await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,8,$7,NOW())", [uuid(), emp.id, dateStr, 'normal', "08:0" + String(ad % 10), "18:0" + String(ad % 10), '正常']); }');
L('            for (var aa = 21; aa <= 23; aa++) { var da = new Date(); da.setDate(da.getDate() - aa); await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,working_hours,remark,created_at) VALUES($1,$2,$3,$4,0,$5,NOW())", [uuid(), emp.id, da.toISOString().split("T")[0], 'absent', '边界-旷工']); }');
L('            var otDate = new Date(); otDate.setDate(otDate.getDate() - 24);');
L('            await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,14,$7,NOW())", [uuid(), emp.id, otDate.toISOString().split("T")[0], 'normal', "08:00", "22:30", '边界-日加班6小时']);');
L('            for (var al = 25; al <= 29; al++) { var dl = new Date(); dl.setDate(dl.getDate() - al); await client.query("INSERT INTO attendance_record(id,employee_id,record_date,status,check_in_time,check_out_time,working_hours,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,7,$7,NOW())", [uuid(), emp.id, dl.toISOString().split("T")[0], 'late', "09:30", "18:00", '边界-迟到']); }');
L('        }');
L("        console.log('OK 考勤: ' + empIds.length + '人 x 30天（含旷工/加班/迟到异常）');");
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');
L('');
L('async function createFinance(orders) {');
L("    console.log('\\n========== 14. 财务（正常+异常） ==========');");
L('    const client = await pool.connect();');
L("    try {");
L("        await client.query('BEGIN');");
L('        for (var fi = 0; fi < Math.min(3, orders.length); fi++) { var order = orders[fi]; var payId = uuid(); var amount = order.total > 0 ? order.total * 0.3 : rf(1000, 5000); await client.query("INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())", [payId, "PAY" + ts().slice(-8), 'order', amount, '00000000-0000-0000-0000-000000000000', '客户', 'bank_transfer', 'confirmed', order.id, '正常收款']); console.log("OK 收款: ¥" + amount.toFixed(2) + " [confirmed]"); }');
L('        var overId = uuid(); var overOrder = orders.find(o => o.total > 0) || orders[0];');
L('        if (overOrder) { await client.query("INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,paid_amount,status,remark,created_at) VALUES($1,$2,$3,\'BILL\'+NOW()::text,\'2026-03-01\',\'2026-03-15\',$4,0,$5,$6,NOW())", [overId, '00000000-0000-0000-0000-000000000000', overOrder.id, rf(10000, 30000), 'overdue', '边界-逾期20天']); console.log("OK 边界财务: 逾期应收账款 [overdue, 逾期20天]"); }');
L('        var badId = uuid(); var badOrder = orders.find(o => o.total > 0);');
L('        if (badOrder) { await client.query("INSERT INTO receivable(id,dealer_id,order_id,bill_no,bill_date,due_date,amount,paid_amount,status,remark,created_at) VALUES($1,$2,$3,\'BILL\'+NOW()::text,\'2026-01-01\',\'2026-01-15\',$4,0,$5,$6,NOW())", [badId, '00000000-0000-0000-0000-000000000000', badOrder.id, rf(20000, 50000), 'bad_debt', '边界-坏账(客户破产)']); console.log("OK 边界财务: 坏账 [bad_debt]"); }');
L('        if (orders.length > 1 && orders[1].total > 0) { var refId = uuid(); await client.query("INSERT INTO payment_in(id,payment_no,source_type,amount,customer_id,customer_name,payment_method,status,order_id,remark,created_at) VALUES($1,$2,$3,-$4,$5,$6,$7,$8,$9,$10,NOW())", [refId, "PAY" + ts().slice(-8), 'order', orders[1].total * 0.2, '00000000-0000-0000-0000-000000000000', '客户', 'bank_transfer', 'refunded', orders[1].id, '边界-部分退款(产品质量问题)']); console.log("OK 边界财务: 部分退款 ¥" + (orders[1].total * 0.2).toFixed(2)); }');
L("        await client.query('COMMIT');");
L('    } catch (err) { await client.query("ROLLBACK"); throw err; }');
L('    finally { client.release(); }');
L('}');
fs.appendFileSync(path, out.join('\n') + '\n', 'utf8');
console.log('Part C done, lines:', out.length);
"""

result = subprocess.run(['node', '-e', script_c], capture_output=True, text=True)
print('STDOUT:', result.stdout)
print('STDERR:', result.stderr[:500] if result.stderr else '')
print('Code:', result.returncode)
