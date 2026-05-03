#!/usr/bin/env python3
"""Generate full_test_abnormal_v1.js from scratch"""
import re

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'

content = r"""// ============================================================================
// 橱柜工厂管理系统 - 异常与边界测试 V1
// 测试各种边界情况和异常数据
// ============================================================================
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || '10.60.209.202',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '87030785',
    database: process.env.DB_NAME || 'cabinet_factory',
    max: 10,
    idleTimeoutMillis: 30000,
});

const db = { query: (text, params) => pool.query(text, params) };

const uuid = () => require('crypto').randomUUID();
const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rf = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pick = arr => arr[ri(0, arr.length - 1)];
const ts = () => Date.now().toString();

async function clearAll() {
    console.log('\n========================================');
    console.log('  橱柜工厂 - 异常与边界测试 V1');
    console.log('========================================');
    console.log('\n========== 1. 清空所有数据 ==========');
    const client = await pool.connect();
    try {
        const tables = [
            'payment_in', 'receivable',
            'attendance_record',
            'installation_progress', 'installer_allocation', 'installation_task',
            'logistics_track', 'logistics_record',
            'package_item', 'package_record',
            'door_panel_production', 'countertop_production', 'production_schedule',
            'production_worker', 'production_stage',
            'stock_in', 'stock_out', 'stock_inventory',
            'order_tracking', 'order_bom', 'order_detail', 'order_master',
            'material_bom', 'material', 'warehouse', 'supplier',
            'customer', 'employee', 'department',
        ];
        for (const t of tables) {
            await client.query('DELETE FROM ' + t);
        }
        console.log('OK: 清空完成');
    } finally {
        client.release();
        await pool.end();
    }
}

async function createBasic() {
    console.log('\n========== 2. 基础数据（部门+员工） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const depts = [
            { n: '销售部A', code: 'DEPT-SA' },
            { n: '设计部A', code: 'DEPT-DE' },
            { n: '生产部A', code: 'DEPT-PR' },
            { n: '仓储部A', code: 'DEPT-WH' },
            { n: '物流部A', code: 'DEPT-LO' },
            { n: '安装部A', code: 'DEPT-IN' },
            { n: '财务部A', code: 'DEPT-FI' },
            { n: '人事部A', code: 'DEPT-HR' },
        ];
        const deptIds = {};
        for (const d of depts) {
            const id = uuid();
            deptIds[d.code] = id;
            await client.query(
                'INSERT INTO department (id,dept_no,dept_name,dept_type,manager_id,status,created_at) VALUES ($1,$2,$3,\'normal\',NULL,\'active\',NOW())',
                [id, d.code, d.n]
            );
        }
        const emps = [
            { n: '张三', dept: 'DEPT-SA' },
            { n: '李四', dept: 'DEPT-SA' },
            { n: '王五', dept: 'DEPT-DE' },
            { n: '赵六', dept: 'DEPT-DE' },
            { n: '钱七', dept: 'DEPT-PR' },
            { n: '孙八', dept: 'DEPT-PR' },
            { n: '周九', dept: 'DEPT-WH' },
            { n: '吴十', dept: 'DEPT-LO' },
            { n: '郑一', dept: 'DEPT-IN' },
            { n: '王二', dept: 'DEPT-IN' },
            { n: '冯三', dept: 'DEPT-FI' },
            { n: '陈四', dept: 'DEPT-HR' },
        ];
        const empIds = [];
        for (const e of emps) {
            const id = uuid();
            empIds.push({ id, name: e.n, dept: e.dept });
            await client.query(
                'INSERT INTO employee (id,emp_no,emp_name,dept_id,position,phone,id_card,bank_account,emergency_contact,emergency_phone,status,join_date,created_at) VALUES ($1,$2,$3,$4,\'员工\',\'13800000000\',\'440000199001010000\',\'622200001\',\'紧急联系人\',\'13800000001\',\'active\',DATE\'2024-01-01\',NOW())',
                [id, 'E' + ts().slice(-6) + String(ri(100, 999)), e.n, deptIds[e.dept]]
            );
        }
        await client.query('COMMIT');
        console.log('OK: 部门' + depts.length + '个, 员工' + emps.length + '人');
        return { deptIds, empIds };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createCustomers() {
    console.log('\n========== 3. 客户（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const custs = [
            { n: '张先生', p: '13800138001', a: '广州市天河区', type: 'normal' },
            { n: '李女士', p: '13800138002', a: '深圳市南山区', type: 'normal' },
            { n: '王先生', p: '138001380000123', a: '佛山市禅城区', type: 'abnormal_phone' },
            { n: '赵先生', p: '13800138004', a: '广州市天河区珠江新城花城大道123号某某小区A栋1501房很长很长的补充描述用于测试字段上限', type: 'abnormal_address' },
            { n: '刘女士', p: '', a: '东莞市南城区', type: 'abnormal_empty' },
            { n: '陈退', p: '13800138006', a: '珠海市香洲区', type: 'abnormal_special' },
        ];
        const custIds = [];
        for (const cust of custs) {
            const id = uuid();
            custIds.push({ id, name: cust.n, type: cust.type });
            try {
                await client.query(
                    'INSERT INTO customer (id,customer_no,customer_name,phone,address,status,source,created_at) VALUES ($1,$2,$3,$4,$5,\'following\',\'测试\',NOW())',
                    [id, 'C' + ts().slice(-6) + String(ri(100, 999)), cust.n, cust.p || null, cust.a]
                );
                console.log('OK 客户: ' + cust.n + ' [' + cust.type + ']');
            } catch (err) {
                console.log('FAIL 客户: ' + cust.n + ' [' + cust.type + '] - ' + err.message.split('\n')[0]);
            }
        }
        await client.query('COMMIT');
        return custIds;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createSuppliers() {
    console.log('\n========== 4. 供应商 ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sups = [
            { n: '宝钢不锈钢A', code: 'SUP-SS-001' + ts().slice(-4), cat: '不锈钢板' },
            { n: '海德威配件A', code: 'SUP-HW-001' + ts().slice(-4), cat: '五金配件' },
            { n: '华润板材A', code: 'SUP-MB-001' + ts().slice(-4), cat: '基础板材' },
        ];
        const supIds = [];
        for (const s of sups) {
            const id = uuid();
            supIds.push({ id, name: s.n });
            await client.query(
                'INSERT INTO supplier (id,supplier_no,supplier_name,contact_name,contact_phone,address,category,status,created_at) VALUES ($1,$2,$3,\'联系人\',\'13800000000\',\'广东省佛山市\',$4,\'active\',NOW())',
                [id, s.code, s.n, s.cat]
            );
            console.log('OK 供应商: ' + s.n);
        }
        await client.query('COMMIT');
        return supIds;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createWarehouses() {
    console.log('\n========== 5. 仓库 ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const t4 = ts().slice(-4);
        const ws = [
            { n: '广州总仓A', code: 'WH001A' + t4 },
            { n: '佛山分仓A', code: 'WH002A' + t4 },
            { n: '深圳分仓A', code: 'WH003A' + t4 },
        ];
        const whIds = [];
        for (const w of ws) {
            const id = uuid();
            whIds.push({ id, name: w.n });
            await client.query(
                'INSERT INTO warehouse (id,warehouse_code,warehouse_name,warehouse_type,province,city,district,address,status,created_at) VALUES ($1,$2,$3,\'main\',\'广东省\',\'广州市\',\'白云区\',\'广州市白云区钟落潭\',\'active\',NOW())',
                [id, w.code, w.n]
            );
            console.log('OK 仓库: ' + w.n + ' [' + w.code + ']');
        }
        await client.query('COMMIT');
        return whIds;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createMaterials() {
    console.log('\n========== 6. 材料（正常+边界） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const t4 = ts().slice(-4);
        const mats = [
            { code: 'MAT-SS-001' + t4, n: '不锈钢板304 1.5mm', cat: '不锈钢板', spec: '1.5mm*1220*2440', u: '张', price: 380 },
            { code: 'MAT-SS-002' + t4, n: '不锈钢板304 2.0mm', cat: '不锈钢板', spec: '2.0mm*1220*2440', u: '张', price: 520 },
            { code: 'MAT-HW-001' + t4, n: '不锈钢铰链', cat: '五金', spec: '304#', u: '个', price: 12 },
            { code: 'MAT-FR-001' + t4, n: '填充材料（价格为零）', cat: '辅助', spec: '免费样料', u: '个', price: 0 },
            { code: 'MAT-LG-001' + t4, n: '超长名称材料用于测试数据库VARCHAR字段上限这个名称非常长需要超过255字符的测试内容来验证前端和后端的截断处理是否正确以及数据库约束是否有效执行' + ts(), cat: '测试', spec: '长名称测试', u: '米', price: 100 },
        ];
        const matIds = [];
        for (const m of mats) {
            const id = uuid();
            matIds.push({ id, name: m.n, price: m.price });
            try {
                await client.query(
                    'INSERT INTO material (id,material_code,material_name,category,spec,unit,unit_price,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,\'active\',NOW())',
                    [id, m.code, m.n, m.cat, m.spec, m.u, m.price]
                );
                console.log('OK 材料: ' + m.n.substring(0, 30) + '... [¥' + m.price + ']');
            } catch (err) {
                console.log('FAIL 材料: ' + m.n.substring(0, 30) + '... - ' + err.message.split('\n')[0]);
            }
        }
        await client.query('COMMIT');
        return matIds;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createOrders(custIds) {
    console.log('\n========== 7. 订单（正常+边界） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const orders = [];
        // Normal orders
        for (let i = 0; i < 3; i++) {
            const id = uuid();
            const custId = custIds[i % custIds.length].id;
            const total = rf(5000, 50000);
            await client.query(
                'INSERT INTO order_master (id,order_no,customer_id,order_date,delivery_date,total_amount,paid_amount,order_status,production_status,installation_status,design_status,quality_status,logistics_status,invoice_status,source,priority,assigned_to,estimator,estimator_hours,designer,design_hours,warehouse_id,shipping_address,contact_phone,contact_name,remark,created_at) VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE+15,$4,0,\'pending\',\'not_started\',\'not_started\',\'not_started\',\'not_started\',\'not_started\',\'not_started\',\'store\',\'normal\',NULL,NULL,0,NULL,0,NULL,$5,\'13800138000\',\'客户\',\'正常订单测试\',NOW())',
                [id, 'O' + ts() + String(ri(100, 999)), custId, total, '广州市天河区']
            );
            await client.query(
                'INSERT INTO order_detail (id,order_id,product_name,product_type,length,width,height,quantity,unit_price,discount,total_price,door_panel_count,countertop_count,status,created_at) VALUES ($1,$2,\'不锈钢橱柜\',\'标准型\',800,600,800,2,$3,0,$3*2,\'pending\',NOW())',
                [uuid(), id, total / 2]
            );
            orders.push({ id: id, total: total });
            console.log('OK 订单: ' + id.substring(0, 8) + '... ¥' + total.toFixed(2));
        }
        // Boundary 1: zero amount
        const id0 = uuid();
        try {
            await client.query(
                'INSERT INTO order_master (id,order_no,customer_id,order_date,delivery_date,total_amount,paid_amount,order_status,production_status,installation_status,design_status,quality_status,logistics_status,invoice_status,source,priority,assigned_to,shipping_address,contact_phone,contact_name,remark,created_at) VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE+15,0,0,\'pending\',\'not_started\',\'not_started\',\'not_started\',\'not_started\',\'not_started\',\'not_started\',\'store\',\'normal\',NULL,\'地址\',\'13800000000\',\'客户\',\'边界测试-零金额订单\',NOW())',
                [id0, 'O' + ts() + 'ZERO', custIds[0].id]
            );
            orders.push({ id: id0, total: 0 });
            console.log('OK 边界订单: 零金额');
        } catch (err) {
            console.log('FAIL 边界订单: 零金额 - ' + err.message.split('\n')[0]);
        }
        // Boundary 2: overdue delivery
        const id1 = uuid();
        await client.query(
            'INSERT INTO order_master (id,order_no,customer_id,order_date,delivery_date,total_amount,paid_amount,order_status,production_status,installation_status,design_status,quality_status,logistics_status,invoice_status,source,priority,assigned_to,shipping_address,contact_phone,contact_name,remark,created_at) VALUES ($1,$2,$3,DATE\'2026-03-01\',DATE\'2026-03-15\',$4,0,\'processing\',\'in_production\',\'not_started\',\'completed\',\'pending\',\'in_transit\',\'not_started\',\'store\',\'high\',NULL,\'地址\',\'13800000000\',\'客户\',\'边界测试-逾期订单（已逾期6天）\',NOW())',
            [id1, 'O' + ts() + 'LATE', custIds[1 % custIds.length].id, rf(10000, 30000)]
        );
        await client.query(
            'INSERT INTO order_detail (id,order_id,product_name,product_type,length,width,height,quantity,unit_price,discount,total_price,door_panel_count,countertop_count,status,created_at) VALUES ($1,$2,\'不锈钢橱柜\',\'标准型\',800,600,800,3,$3,0,$3*3,\'in_production\',NOW())',
            [uuid(), id1, rf(3000, 8000)]
        );
        orders.push({ id: id1, total: 0, late: true });
        console.log('OK 边界订单: 逾期交货（delivery_date已过）');
        // Boundary 3: overpaid
        const id2 = uuid();
        const total3 = rf(5000, 10000);
        const overpaid = total3 * 1.5;
        await client.query(
            'INSERT INTO order_master (id,order_no,customer_id,order_date,delivery_date,total_amount,paid_amount,order_status,production_status,installation_status,design_status,quality_status,logistics_status,invoice_status,source,priority,assigned_to,shipping_address,contact_phone,contact_name,remark,created_at) VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE+15,$4,$5,\'processing\',\'in_production\',\'not_started\',\'completed\',\'pending\',\'pending\',\'not_started\',\'store\',\'normal\',NULL,\'地址\',\'13800000000\',\'客户\',\'边界测试-超额付款\',NOW())',
            [id2, 'O' + ts() + 'OVER', custIds[2 % custIds.length].id, total3, overpaid]
        );
        orders.push({ id: id2, total: total3, paid: overpaid });
        console.log('OK 边界订单: 超额付款 ¥' + total3.toFixed(2) + ' 已付 ¥' + overpaid.toFixed(2));
        // Boundary 4: urgent
        const id4 = uuid();
        await client.query(
            'INSERT INTO order_master (id,order_no,customer_id,order_date,delivery_date,total_amount,paid_amount,order_status,production_status,installation_status,design_status,quality_status,logistics_status,invoice_status,source,priority,assigned_to,shipping_address,contact_phone,contact_name,remark,created_at) VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE+3,$4,0,\'processing\',\'in_production\',\'not_started\',\'completed\',\'pending\',\'pending\',\'not_started\',\'store\',\'urgent\',NULL,\'紧急地址\',\'13800000000\',\'客户\',\'边界测试-紧急订单（3天后交付）\',NOW())',
            [id4, 'O' + ts() + 'URGT', custIds[0].id, rf(20000, 80000)]
        );
        orders.push({ id: id4, total: 0, urgent: true });
        console.log('OK 边界订单: 紧急订单（3天交付）');
        await client.query('COMMIT');
        return orders;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createStock(matIds, whIds) {
    console.log('\n========== 8. 入库+库存（正常+边界） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Zero stock (in then out)
        const zeroMat = matIds.find(function(m) { return m.name.indexOf('铰链') >= 0; });
        if (zeroMat) {
            const inId = uuid();
            await client.query(
                'INSERT INTO stock_in (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,source,status,remark,created_at) VALUES ($1,$2,$3,10,12,120,\'陈四\',\'采购入库\',\'checked\',\'边界测试-零库存\',NOW())',
                [inId, whIds[0].id, zeroMat.id]
            );
            await client.query(
                'INSERT INTO stock_inventory (id,warehouse_id,material_id,quantity,unit_price,total_value,last_in_id,last_out_id,created_at,updated_at) VALUES ($1,$2,$3,10,12,120,$4,NULL,NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=10,total_value=120,updated_at=NOW()',
                [uuid(), whIds[0].id, zeroMat.id, inId]
            );
            const outId = uuid();
            await client.query(
                'INSERT INTO stock_out (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,purpose,status,remark,created_at) VALUES ($1,$2,$3,10,12,120,\'周九\',\'生产领用\',\'approved\',\'边界测试-零库存出库\',NOW())',
                [outId, whIds[0].id, zeroMat.id]
            );
            await client.query(
                'UPDATE stock_inventory SET quantity=0,total_value=0,last_out_id=$4,updated_at=NOW() WHERE warehouse_id=$2 AND material_id=$3',
                [null, whIds[0].id, zeroMat.id, outId]
            );
            console.log('OK 边界库存: 铰链 -> 零库存（进10出10）');
        }
        // Low stock (only 5)
        const lowMat = matIds.find(function(m) { return m.name.indexOf('1.5mm') >= 0; });
        if (lowMat) {
            const inId2 = uuid();
            await client.query(
                'INSERT INTO stock_in (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,source,status,remark,created_at) VALUES ($1,$2,$3,5,380,1900,\'陈四\',\'采购入库\',\'checked\',\'边界测试-库存不足\',NOW())',
                [inId2, whIds[0].id, lowMat.id]
            );
            await client.query(
                'INSERT INTO stock_inventory (id,warehouse_id,material_id,quantity,unit_price,total_value,last_in_id,last_out_id,created_at,updated_at) VALUES ($1,$2,$3,5,380,1900,$4,NULL,NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=5,total_value=1900,updated_at=NOW()',
                [uuid(), whIds[0].id, lowMat.id, inId2]
            );
            console.log('OK 边界库存: 不锈钢板 -> 库存不足（5个）');
        }
        // Over stock (99999)
        const overMat = matIds.find(function(m) { return m.name.indexOf('2.0mm') >= 0; });
        if (overMat) {
            const inId3 = uuid();
            await client.query(
                'INSERT INTO stock_in (id,warehouse_id,material_id,quantity,unit_price,total_amount,operator,source,status,remark,created_at) VALUES ($1,$2,$3,99999,520,51999480,\'陈四\',\'大批量采购\',\'checked\',\'边界测试-超额入库99999张\',NOW())',
                [inId3, whIds[0].id, overMat.id]
            );
            await client.query(
                'INSERT INTO stock_inventory (id,warehouse_id,material_id,quantity,unit_price,total_value,last_in_id,last_out_id,created_at,updated_at) VALUES ($1,$2,$3,99999,520,51999480,$4,NULL,NOW(),NOW()) ON CONFLICT (warehouse_id,material_id) DO UPDATE SET quantity=99999,total_value=51999480,updated_at=NOW()',
                [uuid(), whIds[0].id, overMat.id, inId3]
            );
            console.log('OK 边界库存: 2.0mm板 -> 超额入库99999张');
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function createProduction(orders) {
    console.log('\n========== 9. 生产记录（正常+异常） ==========');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < Math.min(4, orders.length); i++) {
            const order = orders[i];
            const doorId = uuid();
            await client.query(
                'INSERT INTO door_panel_production (id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_complete,current_location,created_at) VALUES ($1,$2,$3,\'标准门板\',800,600,18,25.5,2,\'304不锈钢\',\'银色\',\'拉丝\',true,true,6,\'粉末喷涂\',\'银色\',180,30,\'completed\',CURRENT_TIMESTAMP-INTERVAL\'3 days\',CURRENT_TIMESTAMP,\'仓库A区\',NOW())',
                [doorId, order.id, 'D' + ts().slice(-6) + String(ri(100, 999))]
            );
            const ctId = uuid();
            await client.query(
                'INSERT INTO countertop_production (id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_complete,current_location,created_at) VALUES ($1,$2,$3,\'石英石台面\',\'石英石\',2000,600,15,\'白色\',\'磨边\',true,true,1,\'completed\',CURRENT_TIMESTAMP-INTERVAL\'2 days\',CURRENT_TIMESTAMP,\'仓库B区\',NOW())',
                [ctId, order.id, 'CT' + ts().slice(-6) + String(ri(100, 999))]
            );
            console.log('OK 生产: ' + order.id.substring(0, 8) + '... 门板+台面 完成');
        }
        // Late schedule
        const lateOrder = orders.find(function(o) { return o.late === true; });
        if (lateOrder) {
            const schId = uuid();
            await client.query(
                'INSERT INTO production_schedule (id,schedule_no,order_id,schedule_date,priority,status,stage,scheduled_date,estimated_hours,created_at) VALUES ($1,$2,$3,DATE\'2026-03-10\',5,\'scheduled\',\'cutting\',DATE\'2026-03-10\',16,NOW())',
                [schId, 'SCH' + ts().slice(-6) + 'LATE', lateOrder.id]
            );
            console.log('OK 边界生产: 延期排期（2026-03-10，至今未开始）');
        }
        // Quality rejected
        if (orders[0]) {
            const doorId2 = uuid();
            await client.query(
                'INSERT INTO door_panel_production (id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_start,quality_complete,quality_result,quality_remark,current_location,created_at) VALUES ($1,$2,$3,\'标准门板\',800,600,18,25.5,2,\'304不锈钢\',\'银色\',\'拉丝\',true,true,6,\'粉末喷涂\',\'银色\',180,30,\'in_production\',CURRENT_TIMESTAMP-INTERVAL\'5 days\',CURRENT_TIMESTAMP-INTERVAL\'1 day\',CURRENT_TIMESTAMP,\'rejected\',\'涂层气泡超标，已返工2次\',\'待返工区\',NOW())',
                [doorId2, orders[0].id, 'D' + ts().slice(-6) + 'BAD']
            );
            console.log('OK 边界生产: 门板质量不合格（rejected, 返工2次）');
        }
        // Scrapped
        if (orders[1]) {
            const ctId2 = uuid();
            await client.query(
                'INSERT INTO countertop_production (id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_start,quality_complete,quality_result,current_location,created_at) VALUES ($1,$2,$3,\'石英石台面\',\'石英石\',2000,600,15,\'白色\',\'磨边\',true,true,1,\'in_production\',CURRENT_TIMESTAMP-INTERVAL\'4 days\',CURRENT_TIMESTAMP-INTERVAL\'1 day\',CURRENT_TIMESTAMP,\'scrapped\',\'开裂严重无法修复，直接报废\',\'废料区\',NOW())',
                [ctId2, orders[1].id, 'CT' + ts().slice(-6) + 'SCRP']
            );
            console.log('OK 边界生产: 台面报废（scrapped）');
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

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
            const remark = damagedPkgs > 0 ? '边界测试-部分破损' : missingPkgs > 0 ? '边界测试-缺件' : '正常包装';
            await client.query(
                'INSERT INTO package_record (id,order_id,package_no,total_packages,damaged_packages,missing_packages,package_type,package_weight,package_volume,storage_location,storage_date,status,operator,remark,created_at) VALUES ($1,$2,$3,$4,$5,$6,\'纸箱+木架\',$7,0.5,\'仓库C区\',CURRENT_DATE,\'stored\',\'周九\',$8,NOW())',
                [pkgId, order.id, 'PKG' + ts().slice(-6) + String(i), totalPkgs, damagedPkgs, missingPkgs, rf(50, 200), remark]
            );
            for (let j = 0; j < Math.min(3, totalPkgs); j++) {
                const itemRemark = damagedPkgs > 0 && j < damagedPkgs ? '轻微破损' : '正常';
                await client.query(
                    'INSERT INTO package_item (id,package_id,item_name,quantity,weight,remark,created_at) VALUES ($1,$2,$3,1,$4,$5,NOW())',
                    [uuid(), pkgId, pick(['门板', '台面', '铰链', '导轨', '拉手']), rf(5, 30), itemRemark]
                );
            }
            const statusStr = damagedPkgs > 0 ? '部分破损' : missingPkgs > 0 ? '缺件' : '正常';
            console.log('OK 包装: 订单' + (i+1) + ' -> ' + totalPkgs + '件 [' + statusStr + ']');
        }
        if (orders.length > 3) {
            const pkgId2 = uuid();
            await client.query(
                'INSERT INTO package_record (id,order_id,package_no,total_packages,damaged_packages,missing_packages,package_type,package_weight,storage_location,storage_date,status,operator,remark,created_at) VALUES ($1,$2,$3,10,0,0,\'纸箱\',500,\'仓库D区\',CURRENT_DATE,\'stored\',\'周九\',\'边界测试-明细数量不符\',NOW())',
                [pkgId2, orders[3].id, 'PKG' + ts().slice(-6) + 'X']
            );
            await client.query(
                'INSERT INTO package_item (id,package_id,item_name,quantity,weight,remark