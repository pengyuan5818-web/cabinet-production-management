with open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js', 'r', encoding='utf-8') as f:
    content = f.read()

missing = '''
async function createPackages(orders) {
    console.log('\n========== 10. 包装（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < Math.min(3, orders.length); i++) {
            const order = orders[i];
            const pkgId = uuid();
            const totalPkgs = ri(5, 15);
            const damagedPkgs = i === 1 ? ri(1, 3) : 0;
            const missingPkgs = i === 2 ? 2 : 0;
            await client.query(
                `INSERT INTO package_record (id,order_id,package_no,total_packages,damaged_packages,missing_packages,package_type,package_weight,package_volume,storage_location,storage_date,status,operator,remark,created_at) VALUES ($1,$2,$3,$4,$5,$6,'纸箱+木架',$7,0.5,'仓库C区',CURRENT_DATE,'stored','周九',$8,NOW())`,
                [pkgId, order.id, 'PKG' + ts().slice(-6) + String(i), totalPkgs, damagedPkgs, missingPkgs, rf(50, 200), damagedPkgs > 0 ? '边界测试-部分破损' : missingPkgs > 0 ? '边界测试-缺件' : '正常包装']
            );
            for (let j = 0; j < Math.min(3, totalPkgs); j++) {
                await client.query(
                    `INSERT INTO package_item (id,package_id,item_name,quantity,weight,remark,created_at) VALUES ($1,$2,$3,1,$4,$5,NOW())`,
                    [uuid(), pkgId, pick(['门板', '台面', '铰链', '导轨', '拉手']), rf(5, 30), damagedPkgs > 0 && j < damagedPkgs ? '轻微破损' : '正常']
                );
            }
            console.log(`OK 包装: 订单${i+1} -> ${totalPkgs}件 [${damagedPkgs > 0 ? '部分破损' : missingPkgs > 0 ? '缺件' : '正常'}]`);
        }
        if (orders.length > 3) {
            const pkgId2 = uuid();
            await client.query(
                `INSERT INTO package_record (id,order_id,package_no,total_packages,damaged_packages,missing_packages,package_type,package_weight,storage_location,storage_date,status,operator,remark,created_at) VALUES ($1,$2,$3,10,0,0,'纸箱',500,'仓库D区',CURRENT_DATE,'stored','周九','边界测试-明细数量不符',NOW())`,
                [pkgId2, orders[3].id, 'PKG' + ts().slice(-6) + 'X']
            );
            await client.query(
                `INSERT INTO package_item (id,package_id,item_name,quantity,weight,remark,created_at) VALUES ($1,$2,'门板',1,25,'边界测试-明细只有1条',NOW())`,
                [uuid(), pkgId2]
            );
            console.log(`OK 边界包装: 记录10件但明细只有1条`);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createLogistics(orders) {
    console.log('\n========== 11. 物流/运输（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const cities = ['深圳市', '东莞市', '佛山市', '惠州市', '中山市'];
        for (let i = 0; i < Math.min(4, orders.length); i++) {
            const order = orders[i];
            const logId = uuid();
            await client.query(
                `INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,remark,created_at) VALUES ($1,$2,$3,'顺丰速运','司机','13800001111','粤B12345',$4,CURRENT_DATE+3,NULL,CURRENT_TIMESTAMP,'in_transit',500,'正常运输中',NOW())`,
                [logId, order.id, 'LF' + ts().slice(-6) + String(i), cities[i] + '区']
            );
            console.log(`OK 物流: -> ${cities[i]} [运输中]`);
        }
        if (orders.length > 4) {
            const rejId = uuid();
            await client.query(
                `INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,rejection_reason,remark,created_at) VALUES ($1,$2,$3,'德邦物流','司机','13800002222','粤B99999','深圳市南山区',CURRENT_DATE+2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP-INTERVAL'2 days','rejected',800,'客户拒收-货物破损','边界测试-拒收',NOW())`,
                [rejId, orders[4].id, 'LF' + ts().slice(-6) + 'REJ']
            );
            console.log(`OK 边界物流: 拒收（货物破损）`);
        }
        if (orders.length > 0) {
            const rtsId = uuid();
            await client.query(
                `INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,return_reason,remark,created_at) VALUES ($1,$2,$3,'中通速递','司机','13800003333','粤B88888','佛山市禅城区',CURRENT_DATE-7,NULL,CURRENT_TIMESTAMP-INTERVAL'10 days','returned',300,'超时未妥投自动退回','边界测试-超时退回',NOW())`,
                [rtsId, orders[0].id, 'LF' + ts().slice(-6) + 'RTS']
            );
            console.log(`OK 边界物流: 超期退回（已运输10天）`);
        }
        if (orders.length > 1) {
            const lateId = uuid();
            await client.query(
                `INSERT INTO logistics_record (id,order_id,logistics_no,carrier,driver_name,driver_phone,vehicle_no,shipping_address,estimated_arrival,actual_arrival,shipping_date,status,freight,remark,created_at) VALUES ($1,$2,$3,'韵达快递','司机','13800004444','粤B77777','广州市天河区',CURRENT_DATE-3,NULL,CURRENT_TIMESTAMP-INTERVAL'5 days','in_transit',300,'边界测试-已超期3天仍未到达',NOW())`,
                [lateId, orders[1].id, 'LF' + ts().slice(-6) + 'LATE']
            );
            console.log(`OK 边界物流: 超期未到达（已超期3天）`);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createInstallation(orders) {
    console.log('\n========== 12. 安装任务（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const cities = ['深圳市南山区', '东莞市南城区'];
        for (let i = 0; i < Math.min(2, orders.length); i++) {
            const instId = uuid();
            await client.query(
                `INSERT INTO installation_task (id,order_id,task_no,installation_type,scheduled_date,scheduled_end_date,actual_start_date,actual_end_date,installation_address,contact_name,contact_phone,status,priority,quality_check,quality_score,quality_remark,customer_satisfaction,remark,operator,created_at) VALUES ($1,$2,$3,'新装',CURRENT_DATE+1,CURRENT_DATE+3,NULL,NULL,$4,'客户','13800000001','in_progress','normal',NULL,NULL,NULL,NULL,NULL,'王二',NOW())`,
                [instId, orders[i].id, 'IN' + ts().slice(-6) + String(i), cities[i]]
            );
            await client.query(
                `INSERT INTO installer_allocation (id,task_id,employee_id,role,scheduled_hours,actual_hours,overtime_hours,work_date,status,remark,created_at) VALUES ($1,$2,$3,'组长',8,NULL,0,CURRENT_DATE,'assigned','正常分配',NOW())`,
                [uuid(), instId, '王二']
            );
            await client.query(
                `INSERT INTO installer_allocation (id,task_id,employee_id,role,scheduled_hours,actual_hours,overtime_hours,work_date,status,remark,created_at) VALUES ($1,$2,$3,'组员',8,NULL,0,CURRENT_DATE,'assigned','正常分配',NOW())`,
                [uuid(), instId, '郑一']
            );
            console.log(`OK 安装: 订单${i} -> ${cities[i]} [进行中]`);
        }
        if (orders.length > 2) {
            const failId = uuid();
            await client.query(
                `INSERT INTO installation_task (id,order_id,task_no,installation_type,scheduled_date,scheduled_end_date,actual_start_date,actual_end_date,installation_address,contact_name,contact_phone,status,priority,quality_check,quality_score,quality_remark,customer_satisfaction,remark,operator,created_at) VALUES ($1,$2,$3,'新装',CURRENT_DATE-5,CURRENT_DATE-3,CURRENT_TIMESTAMP-INTERVAL'5 days',CURRENT_TIMESTAMP-INTERVAL'3 days','佛山市禅城区','客户','13800000001','rework','high','failed',30,'台面缝隙超标，门板划伤，需要返工','边界测试-安装不合格需返工',2,'王二',NOW())`,
                [failId, orders[2].id, 'IN' + ts().slice(-6) + 'FW']
            );
            await client.query(
                `INSERT INTO installation_progress (id,task_id,stage,status,remark,operator,created_at) VALUES ($1,$2,'拆旧','completed','已完成拆旧','王二',NOW())`,
                [uuid(), failId]
            );
            await client.query(
                `INSERT INTO installation_progress (id,task_id,stage,status,remark,operator,created_at) VALUES ($1,$2,'安装','failed','门板划伤，停工','郑一',NOW())`,
                [uuid(), failId]
            );
            await client.query(
                `INSERT INTO installation_progress (id,task_id,stage,status,remark,operator,created_at) VALUES ($1,$2,'台面','pending','等待返工','郑一',NOW())`,
                [uuid(), failId]
            );
            console.log(`OK 边界安装: 安装失败需返工（评分30分）`);
        }
        if (orders.length > 3) {
            const cmpId = uuid();
            await client.query(
                `INSERT INTO installation_task (id,order_id,task_no,installation_type,scheduled_date,scheduled_end_date,actual_start_date,actual_end_date,installation_address,contact_name,contact_phone,status,priority,quality_check,quality_score,quality_remark,customer_satisfaction,remark,operator,created_at) VALUES ($1,$2,$3,'新装',CURRENT_DATE-10,CURRENT_DATE-8,CURRENT_TIMESTAMP-INTERVAL'10 days',CURRENT_TIMESTAMP-INTERVAL'8 days','惠州市惠城区','客户','13800000001','completed','normal','passed',20,'勉强通过','很不满意/10','边界测试-客户投诉，差评',1,'王二',NOW())`,
                [cmpId, orders[3].id, 'IN' + ts().slice(-6) + 'CM']
            );
            console.log(`OK 边界安装: 完成但客户差评（满意度20分）`);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createAttendance(empIds) {
    console.log('\n========== 13. 考勤（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const emp of empIds) {
            const empId = emp.id;
            for (let d = 0; d < 20; d++) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const dateStr = date.toISOString().split('T')[0];
                await client.query(
                    `INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'normal',$4,$5,8,0,NULL,0,'正常',$6,NOW())`,
                    [uuid(), empId, dateStr, '08:0' + String(d % 10), '18:0' + String(d % 10), emp.name]
                );
            }
            for (let d = 21; d <= 23; d++) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const dateStr = date.toISOString().split('T')[0];
                await client.query(
                    `INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'absent',NULL,NULL,0,0,NULL,0,'边界测试-旷工',$4,NOW())`,
                    [uuid(), empId, dateStr, emp.name]
                );
            }
            const OTDate = new Date();
            OTDate.setDate(OTDate.getDate() - 24);
            const OTDateStr = OTDate.toISOString().split('T')[0];
            await client.query(
                `INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'normal','08:00','22:30',8,6,NULL,0,'边界测试-日加班6小时',$4,NOW())`,
                [uuid(), empId, OTDateStr, emp.name]
            );
            for (let d = 25; d <= 29; d++) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const dateStr = date.toISOString().split('T')[0];
                await client.query(
                    `INSERT INTO attendance_record (id,employee_id,work_date,status,check_in_time,check_out_time,regular_hours,overtime_hours,leave_type,leave_days,remark,operator,created_at) VALUES ($1,$2,$3,'late','09:3' + $4,'18:00',7,0,NULL,0,'边界测试-迟到','`+emp.name+`',NOW())`,
                    [uuid(), empId, dateStr, String(d % 10)]
                );
            }
        }
        console.log(`OK 考勤: ${empIds.length}人 x 30天（含旷工/加班/迟到异常）`);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createFinance(orders) {
    console.log('\n========== 14. 财务（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const order of orders.slice(0, 3)) {
            const payId = uuid();
            const amount = order.total > 0 ? order.total * 0.3 : rf(1000, 5000);
            await client.query(
                `INSERT INTO payment_in (id,order_id,amount,payment_method,payment_date,bank_reference,payer_name,operator,status,remark,created_at) VALUES ($1,$2,$3,'bank_transfer',CURRENT_DATE,'BNK' || $4,'客户','冯三','received','正常收款',NOW())`,
                [payId, order.id, amount, ts().slice(-8)]
            );
            console.log(`OK 收款: \u00a5${amount.toFixed(2)} [正常]`);
        }
        const overId = uuid();
        const overOrder = orders.find(o => o.total > 0) || orders[0];
        await client.query(
            `INSERT INTO receivable (id,order_id,customer_id,amount,paid_amount,due_date,overdue_days,status,penalty,penalty_reason,operator,remark,created_at) VALUES ($1,$2,$3,$4,$5,DATE'2026-03-01',20,'overdue',$4*0.1,'逾期20天加收10%违约金','冯三','边界测试-逾期20天',NOW())`,
            [overId, overOrder.id, '客户', rf(10000, 30000), 0]
        );
        console.log(`OK 边界财务: 逾期应收账款（逾期20天+10%违约金）`);
        const badId = uuid();
        const badOrder = orders.find(o => o.total > 0) || orders[1];
        await client.query(
            `INSERT INTO receivable (id,order_id,customer_id,amount,paid_amount,due_date,overdue_days,status,write_off_reason,operator,remark,created_at) VALUES ($1,$2,$3,$4,0,DATE'2026-01-01',110,'bad_debt','客户破产，全额计提坏账',NULL,'边界测试-坏账（全额无法收回）',NOW())`,
            [badId, badOrder.id, '客户', rf(20000, 50000)]
        );
        console.log(`OK 边界财务: 坏账（客户破产）`);
        if (orders.length > 1) {
            const refId = uuid();
            const refOrder = orders[1];
            const refundAmt = refOrder.total > 0 ? refOrder.total * 0.2 : rf(1000, 3000);
            await client.query(
                `INSERT INTO payment_in (id,order_id,amount,payment_method,payment_date,bank_reference,payer_name,operator,status,remark,created_at) VALUES ($1,$2,-$3,'bank_transfer',CURRENT_DATE,'BNK' || $4,'客户','冯三','refunded','边界测试-部分退款','退回原因：产品质量问题')`,
                [refId, refOrder.id, refundAmt, ts().slice(-8)]
            );
            console.log(`OK 边界财务: 部分退款 \u00a5${refundAmt.toFixed(2)}`);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function verifyReports() {
    console.log('\n========== 15. 报表验证（异常数据统计） ==========');
    try {
        const att = await db.query(`
            SELECT e.emp_name,
                   COUNT(*) FILTER (WHERE a.status = 'normal') as normal_days,
                   COUNT(*) FILTER (WHERE a.status = 'absent') as absent_days,
                   COUNT(*) FILTER (WHERE a.status = 'late') as late_days,
                   SUM(a.overtime_hours) as total_ot
            FROM attendance_record a
            JOIN employee e ON e.id = a.employee_id
            GROUP BY e.emp_name ORDER BY e.emp_name
        `);
        console.log('\n考勤异常统计:');
        console.table(att.rows);

        const inv = await db.query(`
            SELECT m.material_name, w.warehouse_name, i.quantity
            FROM stock_inventory i
            JOIN material m ON m.id = i.material_id
            JOIN warehouse w ON w.id = i.warehouse_id
            ORDER BY i.quantity ASC
        `);
        console.log('\n库存（按数量升序）:');
        console.table(inv.rows);

        const rec = await db.query(`
            SELECT order_id, amount, paid_amount, overdue_days, status, penalty
            FROM receivable WHERE status IN ('overdue', 'bad_debt')
        `);
        console.log('\n逾期/坏账应收款:');
        console.table(rec.rows);

        const log = await db.query(`
            SELECT logistics_no, status, estimated_arrival,
                   CASE WHEN estimated_arrival < CURRENT_DATE AND status = 'in_transit' THEN '已超期' ELSE '正常' END as delay_flag,
                   rejection_reason, return_reason
            FROM logistics_record
        `);
        console.log('\n物流状态:');
        console.table(log.rows);

        const inst = await db.query(`
            SELECT task_no, status, quality_score, customer_satisfaction, remark
            FROM installation_task
        `);
        console.log('\n安装任务:');
        console.table(inst.rows);

        const pkg = await db.query(`
            SELECT pr.package_no, pr.total_packages,
                   (SELECT COUNT(*) FROM package_item pi WHERE pi.package_id = pr.id) as item_count,
                   pr.damaged_packages, pr.missing_packages, pr.status
            FROM package_record pr
        `);
        console.log('\n包装（检查件数/明细相符）:');
        console.table(pkg.rows);

        const payments = await db.query(`
            SELECT order_id, amount, payment_method, status, remark
            FROM payment_in ORDER BY created_at DESC
        `);
        console.log('\n收款记录（含退款）:');
        console.table(payments.rows);
    } catch (err) {
        console.log('WARN 报表验证出错:', err.message.split('\n')[0]);
    }
}

async function main() {
    console.log('========================================');
    console.log('  橱柜工厂 - 异常与边界测试 V1');
    console.log('========================================');
    await clearAll();
    const { empIds } = await createBasic();
    const custIds = await createCustomers();
    const supIds = await createSuppliers();
    const whIds = await createWarehouses();
    await createMaterials();
    const orders = await createOrders(custIds);
    await createStock([], whIds);
    await createProduction(orders);
    await createPackages(orders);
    await createLogistics(orders);
    await createInstallation(orders);
    await createAttendance(empIds);
    await createFinance(orders);
    await verifyReports();
    console.log('\n========================================');
    console.log('  [OK] 异常测试完成！');
    console.log('========================================');
    process.exit();
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
'''

new_content = content + missing
with open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print(f'Written. New length: {len(new_content)}')
opens = new_content.count('{')
closes = new_content.count('}')
print(f'Brace balance: {{ {opens} }} {closes}')
