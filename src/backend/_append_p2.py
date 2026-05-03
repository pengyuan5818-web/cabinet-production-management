path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'

extra = """
async function createStock(matIds, whIds) {
    console.log("\\n========== 8. 入库+库存（正常+边界） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        var zeroMat = null;
        for (var mi = 0; mi < matIds.length; mi++) { if (matIds[mi].name.indexOf("铰链") >= 0) { zeroMat = matIds[mi]; break; } }
        if (zeroMat) {
            var inId = uuid();
            await client.query("INSERT INTO stock_in (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,source,status,remark,created_at) VALUES ($1,$2,$3,10,12,120,'陈四','采购入库','checked','边界测试-零库存',NOW())", [inId, whIds[0].id, zeroMat.id]);
            await client.query("INSERT INTO stock_inventory (id,warehouse_id,material_id,quantity,unit_price,total_value,last_in_id,last_out_id,created_at,updated_at) VALUES ($1,$2,$3,10,12,120,$4,NULL,NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=10,total_value=120,updated_at=NOW()", [uuid(), whIds[0].id, zeroMat.id, inId]);
            var outId = uuid();
            await client.query("INSERT INTO stock_out (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,purpose,status,remark,created_at) VALUES ($1,$2,$3,10,12,120,'周九','生产领用','approved','边界测试-零库存出库',NOW())", [outId, whIds[0].id, zeroMat.id]);
            await client.query("UPDATE stock_inventory SET quantity=0,total_value=0,last_out_id=$4,updated_at=NOW() WHERE warehouse_id=$2 AND material_id=$3", [null, whIds[0].id, zeroMat.id, outId]);
            console.log("OK 边界库存: 铰链 -> 零库存（进10出10）");
        }
        var lowMat = null;
        for (var mi2 = 0; mi2 < matIds.length; mi2++) { if (matIds[mi2].name.indexOf("1.5mm") >= 0) { lowMat = matIds[mi2]; break; } }
        if (lowMat) {
            var inId2 = uuid();
            await client.query("INSERT INTO stock_in (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,source,status,remark,created_at) VALUES ($1,$2,$3,5,380,1900,'陈四','采购入库','checked','边界测试-库存不足',NOW())", [inId2, whIds[0].id, lowMat.id]);
            await client.query("INSERT INTO stock_inventory (id,warehouse_id,material_id,quantity,unit_price,total_value,last_in_id,last_out_id,created_at,updated_at) VALUES ($1,$2,$3,5,380,1900,$4,NULL,NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=5,total_value=1900,updated_at=NOW()", [uuid(), whIds[0].id, lowMat.id, inId2]);
            console.log("OK 边界库存: 不锈钢板 -> 库存不足（5个）");
        }
        var overMat = null;
        for (var mi3 = 0; mi3 < matIds.length; mi3++) { if (matIds[mi3].name.indexOf("2.0mm") >= 0) { overMat = matIds[mi3]; break; } }
        if (overMat) {
            var inId3 = uuid();
            await client.query("INSERT INTO stock_in (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,source,status,remark,created_at) VALUES ($1,$2,$3,99999,520,51999480,'陈四','大批量采购','checked','边界测试-超额入库99999张',NOW())", [inId3, whIds[0].id, overMat.id]);
            await client.query("INSERT INTO stock_inventory (id,warehouse_id,material_id,quantity,unit_price,total_value,last_in_id,last_out_id,created_at,updated_at) VALUES ($1,$2,$3,99999,520,51999480,$4,NULL,NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=99999,total_value=51999480,updated_at=NOW()", [uuid(), whIds[0].id, overMat.id, inId3]);
            console.log("OK 边界库存: 2.0mm板 -> 超额入库99999张");
        }
        await client.query("COMMIT");
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createProduction(orders) {
    console.log("\\n========== 9. 生产记录（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (var pi = 0; pi < Math.min(4, orders.length); pi++) {
            var order = orders[pi];
            var doorId = uuid();
            await client.query("INSERT INTO door_panel_production (id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_complete,current_location,created_at) VALUES ($1,$2,$3,'标准门板',800,600,18,25.5,2,'304不锈钢','银色','拉丝',true,true,6,'粉末喷涂','银色',180,30,'completed',CURRENT_TIMESTAMP-INTERVAL'3 days',CURRENT_TIMESTAMP,'仓库A区',NOW())", [doorId, order.id, "D" + ts().slice(-6) + String(ri(100,999))]);
            var ctId = uuid();
            await client.query("INSERT INTO countertop_production (id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_complete,current_location,created_at) VALUES ($1,$2,$3,'石英石台面','石英石',2000,600,15,'白色','磨边',true,true,1,'completed',CURRENT_TIMESTAMP-INTERVAL'2 days',CURRENT_TIMESTAMP,'仓库B区',NOW())", [ctId, order.id, "CT" + ts().slice(-6) + String(ri(100,999))]);
            console.log("OK 生产: " + order.id.substring(0,8) + "... 门板+台面 完成");
        }
        var lateOrder = null;
        for (var li = 0; li < orders.length; li++) { if (orders[li].late) { lateOrder = orders[li]; break; } }
        if (lateOrder) {
            var schId = uuid();
            await client.query("INSERT INTO production_schedule (id,schedule_no,order_id,schedule_date,priority,status,stage,scheduled_date,estimated_hours,created_at) VALUES ($1,$2,$3,DATE'2026-03-10',5,'scheduled','cutting',DATE'2026-03-10',16,NOW())", [schId, "SCH" + ts().slice(-6) + "LATE", lateOrder.id]);
            console.log("OK 边界生产: 延期排期（2026-03-10，至今未开始）");
        }
        if (orders[0]) {
            var doorId2 = uuid();
            await client.query("INSERT INTO door_panel_production (id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_start,quality_complete,quality_result,quality_remark,current_location,created_at) VALUES ($1,$2,$3,'标准门板',800,600,18,25.5,2,'304不锈钢','银色','拉丝',true,true,6,'粉末喷涂','银色',180,30,'in_production',CURRENT_TIMESTAMP-INTERVAL'5 days',CURRENT_TIMESTAMP-INTERVAL'1 day',CURRENT_TIMESTAMP,'rejected','涂层气泡超标，已返工2次','待返工区',NOW())", [doorId2, orders[0].id, "D" + ts().slice(-6) + "BAD"]);
            console.log("OK 边界生产: 门板质量不合格（rejected, 返工2次）");
        }
        if (orders[1]) {
            var ctId2 = uuid();
            await client.query("INSERT INTO countertop_production (id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_start,quality_complete,quality_result,current_location,created_at) VALUES ($1,$2,$3,'石英石台面','石英石',2000,600,15,'白色','磨边',true,true,1,'in_production',CURRENT_TIMESTAMP-INTERVAL'4 days',CURRENT_TIMESTAMP-INTERVAL'1 day',CURRENT_TIMESTAMP,'scrapped','开裂严重无法修复，直接报废','废料区',NOW())", [ctId2, orders[1].id, "CT" + ts().slice(-6) + "SCRP"]);
            console.log("OK 边界生产: 台面报废（scrapped）");
        }
        await client.query("COMMIT");
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createPackages(orders) {
    console.log("\\n========== 10. 包装（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (var pai = 0; pai < Math.min(3, orders.length); pai++) {
            var order = orders[pai];
            var pkgId = uuid();
            var totalPkgs = ri(5, 15);
            var damagedPkgs = pai === 1 ? ri(1, 3) : 0;
            var missingPkgs = pai === 2 ? 2 : 0;
            var remark = damagedPkgs > 0 ? "边界测试-部分破损" : missingPkgs > 0 ? "边界测试-缺件" : "正常包装";
            await client.query("INSERT INTO package_record (id,order_id,package_no,total_packages,damaged_packages,missing_packages,package_type,package_weight,package_volume,storage_location,storage_date,status,operator,remark,created_at) VALUES ($1,$2,$3,$4,$5,$6,'纸箱+木架',$7,0.5,'仓库C区',CURRENT_DATE,'stored','周九',$8,NOW())", [pkgId, order.id, "PKG" + ts().slice(-6) + String(pai), totalPkgs, damagedPkgs, missingPkgs, rf(50, 200), remark]);
            for (var paj = 0; paj < Math.min(3, totalPkgs); paj++) {
                var itemRemark = damagedPkgs > 0 && paj < damagedPkgs ? "轻微破损" : "正常";
                await client.query("INSERT INTO package_item (id,package_id,item_name,quantity,weight,remark,created_at) VALUES ($1,$2,$3,1,$4,$5,NOW())", [uuid(), pkgId, pick(["门板", "台面", "铰链", "导轨", "拉手"]), rf(5, 30), itemRemark]);
            }
            var statusStr = damagedPkgs > 0 ? "部分破损" : missingPkgs > 0 ? "缺件" : "正常";
            console.log("OK 包装: 订单" + (pai+1) + " -> " + totalPkgs + "件 [" + statusStr + "]");
        }
        if (orders.length > 3) {
            var pkgId2 = uuid();
            await client.query("INSERT INTO package_record (id,order_id,package_no,total_packages,damaged_packages,missing_packages,package_type,package_weight,storage_location,storage_date,status,operator,remark,created_at) VALUES ($1,$2,$3,10,0,0,'纸箱',500,'仓库D区',CURRENT_DATE,'stored','周九','边界测试-明细数量不符',NOW())", [pkgId2, orders[3].id, "PKG" + ts().slice(-6) + "X"]);
            await client.query("INSERT INTO package_item (id,package_id,item_name,quantity,weight,remark,created_at) VALUES ($1,$2,'门板',1,25,'边界测试-明细只有1条',NOW())", [uuid(), pkgId2]);
            console.log("OK 边界包装: 记录10件但明细只有1条");
        }
        await client.query("COMMIT");
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createLogistics(orders) {
    console.log("\\n========== 11. 物流/运输（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        var cities = ["深圳市", "东莞市", "佛山市", "惠州市", "中山市"];
        for (var li2 = 0; li2 < Math.min(4, orders.length); li2++) {
            var order = orders[li2];
            var logId = uuid();
            await client.query("INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,remark,created_at) VALUES ($1,$2,$3,'顺丰速运','司机','13800001111','粤B12345',$4,CURRENT_DATE+3,NULL,CURRENT_TIMESTAMP,'in_transit',500,'正常运输中',NOW())", [logId, order.id, "LF" + ts().slice(-6) + String(li2), cities[li2] + "区"]);
            console.log("OK 物流: -> " + cities[li2] + " [运输中]");
        }
        if (orders.length > 4) {
            var rejId = uuid();
            await client.query("INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,rejection_reason,remark,created_at) VALUES ($1,$2,$3,'德邦物流','司机','13800002222','粤B99999','深圳市南山区',CURRENT_DATE+2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP-INTERVAL'2 days','rejected',800,'客户拒收-货物破损','边界测试-拒收',NOW())", [rejId, orders[4].id, "LF" + ts().slice(-6) + "REJ"]);
            console.log("OK 边界物流: 拒收（货物破损）");
        }
        if (orders.length > 0) {
            var rtsId = uuid();
            await client.query("INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,return_reason,remark,created_at) VALUES ($1,$2,$3,'中通速递','司机','13800003333','粤B88888','佛山市禅城区',CURRENT_DATE-7,NULL,CURRENT_TIMESTAMP-INTERVAL'10 days','returned',300,'超时未妥投自动退回','边界测试-超时退回',NOW())", [rtsId, orders[0].id, "LF" + ts().slice(-6) + "RTS"]);
            console.log("OK 边界物流: 超期退回（已运输10天）");
        }
        if (orders.length > 1) {
            var lateId = uuid();
            await client.query("INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,remark,created_at) VALUES ($1,$2,$3,'韵达快递','司机','13800004444','粤B77777','广州市天河区',CURRENT_DATE-3,NULL,CURRENT_TIMESTAMP-INTERVAL'5 days','in_transit',300,'边界测试-已超期3天仍未到达',NOW())", [lateId, orders[1].id, "LF" + ts().slice(-6) + "LATE"]);
            console.log("OK 边界物流: 超期未到达（已超期3天）");
        }
        await client.query("COMMIT");
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createInstallation(orders) {
    console.log("\\n========== 12. 安装任务（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        var instCities = ["深圳市南山区", "东莞市南城区"];
        for (var ii = 0; ii < Math.min(2, orders.length); ii++) {
            var instId = uuid();
            await client.query("INSERT INTO installation_task (id,order_id,task_no,installation_type,scheduled_date,scheduled_end_date,actual_start_date,actual_end_date,installation_address,contact_name,contact_phone,status,priority,quality_check,quality_score,quality_remark,customer_satisfaction,remark,operator,created_at) VALUES ($1,$2,$3,'新装',CURRENT_DATE+1,CURRENT_DATE+3,NULL,NULL,$4,'客户','13800000001','in_progress','normal',NULL,NULL,NULL,NULL,NULL,NULL,'王二',NOW())", [instId, orders[ii].id, "IN" + ts().slice(-6) + String(ii), instCities[ii]]);
            await client.query("INSERT INTO installer_allocation (id,task_id,employee_id,role,scheduled_hours,actual_hours,overtime_hours,work_date,status,remark,created_at) VALUES ($1,$2,'王二','组长',8,NULL,0,CURRENT_DATE,'assigned','正常分配',NOW())", [uuid(), instId]);
            await client.query("INSERT INTO installer_allocation (id,task_id,employee_id,role,scheduled_hours,actual_hours,overtime_hours,work_date,status,remark,created_at) VALUES ($1,$2,'郑一','组员',8,NULL,0,CURRENT_DATE,'assigned','正常分配',NOW())", [uuid(), instId]);
            console.log("OK 安装: 订单" + ii + " -> " + instCities[ii] + " [进行中]");
        }
        if (orders.length > 2) {
            var failId = uuid();
            await client.query("INSERT INTO installation_task (id,order_id,task_no,installation_type,scheduled_date,scheduled_end_date,actual_start_date,actual_end_date,installation_address,contact_name,contact_phone,status,priority,quality_check,quality_score,quality_remark,customer_satisfaction,remark,operator,created_at) VALUES ($1,$2,$3,'新装',CURRENT_DATE-5,CURRENT_DATE-3,CURRENT_TIMESTAMP-INTERVAL'5 days',CURRENT_TIMESTAMP-INTERVAL'3 days','佛山市禅城区','客户','13800000001','rework','high','failed',30,'台面缝隙超标，门板划伤，需要返工','边界测试-安装不合格需返工',2,'王二',NOW())", [failId, orders[2].id, "IN" + ts().slice(-6) + "FW"]);
            await client.query("INSERT INTO installation_progress (id,task_id,stage,status,remark,operator,created_at) VALUES ($1,$2,'拆旧','completed','已完成拆旧','王二',NOW())", [uuid(), failId]);
            await client.query("INSERT INTO installation_progress (id,task_id,stage,status,remark,operator,created_at) VALUES ($1,$2,'安装','failed','门板划伤，停工','郑一',NOW())", [uuid(), failId]);
            await client.query("INSERT INTO installation_progress (id,task_id,stage,status,remark,operator,created_at) VALUES ($1,$2,'台面','pending','等待返工','郑一',NOW())", [uuid(), failId]);
            console.log("OK 边界安装: 安装失败需返工（评分30分）");
        }
        if (orders.length > 3) {
            var cmpId = uuid();
            await client.query("INSERT INTO installation_task (id,order_id,task_no,installation_type,scheduled_date,scheduled_end_date,actual_start_date,actual_end_date,installation_address,contact_name,contact_phone,status,priority,quality_check,quality_score,quality_remark,customer_satisfaction,remark,operator,created_at) VALUES ($1,$2,$3,'新装',CURRENT_DATE-10,CURRENT_DATE-8,CURRENT_TIMESTAMP-INTERVAL'10 days',CURRENT_TIMESTAMP-INTERVAL'8 days','惠州市惠城区','客户','13800000001','completed','normal','passed',20,'勉强通过','很不满意/10','边界测试-客户投诉，差评',1,'王二',NOW())", [cmpId, orders[3].id, "IN" + ts().slice(-6) + "CM"]);
            console.log("OK 边界安装: 完成但客户差评（满意度20分）");
        }
        await client.query("COMMIT");
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createAttendance(empIds) {
    console.log("\\n========== 13. 考勤（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (var ai = 0; ai < empIds.length; ai++) {
            var emp = empIds[ai];
            for (var ad = 0; ad < 20; ad++) {
                var d = new Date(); d.setDate(d.getDate() - ad);
                var dateStr = d.toISOString().split("T")[0];
                await client.query("INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'normal',$4,$5,8,0,NULL,0,'正常',$6,NOW())", [uuid(), emp.id, dateStr, "08:0" + String(ad % 10), "18:0" + String(ad % 10), emp.name]);
            }
            for (var aa = 21; aa <= 23; aa++) {
                var da = new Date(); da.setDate(da.getDate() - aa);
                var dateStrA = da.toISOString().split("T")[0];
                await client.query("INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'absent',NULL,NULL,0,0,NULL,0,'边界测试-旷工',$4,NOW())", [uuid(), emp.id, dateStrA, emp.name]);
            }
            var otDate = new Date(); otDate.setDate(otDate.getDate() - 24);
            var otDateStr = otDate.toISOString().split("T")[0];
            await client.query("INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'normal','08:00','22:30',8,6,NULL,0,'边界测试-日加班6小时',$4,NOW())", [uuid(), emp.id, otDateStr, emp.name]);
            for (var al = 25; al <= 29; al++) {
                var dl = new Date(); dl.setDate(dl.getDate() - al);
                var dateStrL = dl.toISOString().split("T")[0];
                await client.query("INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'late','09:30','18:00',7,0,NULL,0,'边界测试-迟到',$4,NOW())", [uuid(), emp.id, dateStrL, emp.name]);
            }
        }
        console.log("OK 考勤: " + empIds.length + "人 x 30天（含旷工/加班/迟到异常）");
        await client.query("COMMIT");
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function createFinance(orders) {
    console.log("\\n========== 14. 财务（正常+异常） ==========");
    var client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (var fi = 0; fi < Math.min(3, orders.length); fi++) {
            var order = orders[fi];
            var payId = uuid();
            var amount = order.total > 0 ? order.total * 0.3 : rf(1000, 5000);
            await client.query("INSERT INTO payment_in (id,order_id,amount,payment_method,payment_date,bank_reference,payer_name,operator,status,remark,created_at) VALUES ($1,$2,$3,'bank_transfer',CURRENT_DATE,'BNK' || $4,'客户','冯三','received','正常收款',NOW())", [payId, order.id, amount, ts().slice(-8)]);
            console.log("OK 收款: ¥" + amount.toFixed(2) + " [正常]");
        }
        var overId = uuid();
        var overOrder = null;
        for (var oi2 = 0; oi2 < orders.length; oi2++) { if (orders[oi2].total > 0) { overOrder = orders[oi2]; break; } }
        if (!overOrder) overOrder = orders[0];
        await client.query("INSERT INTO receivable (id,order_id,customer_id,amount,paid_amount,due_date,overdue_days,status,penalty,penalty_reason,operator,remark,created_at) VALUES ($1,$2,$3,$4,$5,DATE'2026-03-01',20,'overdue',$4*0.1,'逾期20天加收10%违约金','冯三','边界测试-逾期20天',NOW())", [overId, overOrder.id, "客户", rf(10000, 30000), 0]);
        console.log("OK 边界财务: 逾期应收账款（逾期20天+10%违约金）");
        var badId = uuid();
        var badOrder = null;
        for (var oi3 = 0; oi3 < orders.length; oi3++) { if (orders[oi3].total > 0) { badOrder = orders[oi3]; break; } }
        if (!badOrder) badOrder = orders[1];
        await client.query("INSERT INTO receivable (id,order_id,customer_id,amount,paid_amount,due_date,overdue_days,status,write_off_reason,operator,remark,created_at) VALUES ($1,$2,$3,$4,0,DATE'2026-01-01',110,'bad_debt','客户破产，全额计提坏账',NULL,'边界测试-坏账（全额无法收回）',NOW())", [badId, badOrder.id, "客户", rf(20000, 50000)]);
        console.log("OK 边界财务: 坏账（客户破产）");
        if (orders.length > 1) {
            var refId = uuid();
            var refOrder = orders[1];
            var refundAmt = refOrder.total > 0 ? refOrder.total * 0.2 : rf(1000, 3000);
            await client.query("INSERT INTO payment_in (id,order_id,amount,payment_method,payment_date,bank_reference,payer_name,operator,status,remark,created_at) VALUES ($1,$2,-$3,'bank_transfer',CURRENT_DATE,'BNK' || $4,'客户','冯三','refunded','边界测试-部分退款','退回原因：产品质量问题')", [refId, refOrder.id, refundAmt, ts().slice(-8)]);
            console.log("OK 边界财务: 部分退款 ¥" + refundAmt.toFixed(2));
        }
        await client.query("COMMIT");
    } catch(err) { await client.query("ROLLBACK"); throw err; }
    finally { client.release(); }
}

async function verifyReports() {
    console.log("\\n========== 15. 报表验证（异常数据统计） ==========");
    try {
        var att = await db.query("SELECT e.emp_name, COUNT(*) FILTER (WHERE a.status='normal') as normal_days, COUNT(*) FILTER (WHERE a.status='absent') as absent_days, COUNT(*) FILTER (WHERE a.status='late') as late_days, SUM(a.overtime_hours) as total_ot FROM attendance_record a JOIN employee e ON e.id=a.employee_id GROUP BY e.emp_name ORDER BY e.emp_name");
        console.log("\\n考勤异常统计:");
        console.table(att.rows);
        var inv = await db.query("SELECT m.material_name, w.warehouse_name, i.quantity FROM stock_inventory i JOIN material m ON m.id=i.material_id JOIN warehouse w ON w.id=i.warehouse_id ORDER BY i.quantity ASC");
        console.log("\\n库存（按数量升序）:");
        console.table(inv.rows);
        var rec = await db.query("SELECT order_id, amount, paid_amount, overdue_days, status, penalty FROM receivable WHERE status IN ('overdue','bad_debt')");
        console.log("\\n逾期/坏账应收款:");
        console.table(rec.rows);
        var log = await db.query("SELECT logistics_no, status, estimated_arrival, CASE WHEN estimated_arrival < CURRENT_DATE AND status='in_transit' THEN '已超期' ELSE '正常' END as delay_flag, rejection_reason, return_reason FROM logistics_record");
        console.log("\\n物流状态:");
        console.table(log.rows);
        var inst = await db.query("SELECT task_no, status, quality_score, customer_satisfaction, remark FROM installation_task");
        console.log("\\n安装任务:");
        console.table(inst.rows);
        var pkg = await db.query("SELECT pr.package_no, pr.total_packages, (SELECT COUNT(*) FROM package_item pi WHERE pi.package_id=pr.id) as item_count, pr.damaged_packages, pr.missing_packages, pr.status FROM package_record pr");
        console.log("\\n包装（检查件数/明细相符）:");
        console.table(pkg.rows);
        var payments = await db.query("SELECT order_id, amount, payment_method, status, remark FROM payment_in ORDER BY created_at DESC");
        console.log("\\n收款记录（含退款）:");
        console.table(payments.rows);
    } catch(err) { console.log("WARN 报表验证出错: " + err.message.split("\\n")[0]); }
}

async function main() {
    await clearAll();
    var _r = await createBasic();
    var custIds = await createCustomers();
    var _s = await createSuppliers();
    var whIds = await createWarehouses();
    var matIds = await createMaterials();
    var orders = await createOrders(custIds);
    await createStock(matIds, whIds);
    await createProduction(orders);
    await createPackages(orders);
    await createLogistics(orders);
    await createInstallation(orders);
    await createAttendance(_r.empIds);
    await createFinance(orders);
    await verifyReports();
    console.log("\\n========================================");
    console.log("  [OK] 异常测试完成！");
    console.log("========================================");
    process.exit();
}

main().catch(function(err) { console.error("ERROR:", err.message); process.exit(1); });
"""

with open(path, 'a', encoding='utf-8') as f:
    f.write(extra)

import subprocess
r = subprocess.run(['node', '--check', path], capture_output=True)
stderr = r.stderr.decode('utf-8', errors='replace')
print('Lines:', open(path, encoding='utf-8').read().count('\n'))
print('Syntax:', stderr[:300] if stderr else 'OK')
print('Return code:', r.returncode)
