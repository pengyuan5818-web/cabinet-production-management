/**
 * 橱柜工厂管理系统 - 完整流程测试脚本 V2
 * 涵盖: 客户 -> 报价 -> 设计 -> 订单 -> 生产 -> 包装 -> 物流 -> 考勤 -> 财务
 */

const axios = require('axios');

// API基础配置
const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let headers = {};

// 登录获取token
async function login() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        authToken = res.data.data?.token || res.data.token;
        headers = { Authorization: `Bearer ${authToken}` };
        console.log('✅ 登录成功, token:', authToken?.substring(0, 20) + '...');
        return authToken;
    } catch (err) {
        console.log('❌ 登录失败:', err.response?.data || err.message);
        return null;
    }
}

// 工具函数
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ==========================================
// 第一步：清空所有数据
// ==========================================
async function clearAllData() {
    console.log('\n========== 第一步：清空所有数据 ==========');
    try {
        const res = await axios.post(`${BASE_URL}/system/clear-all`, {}, { headers });
        console.log('✅ 数据清空完成:', res.data);
    } catch (err) {
        console.log('⚠️ 清空API:', err.response?.status || err.message);
        console.log('   继续手动清空...');
    }
}

// ==========================================
// 第二步：创建基础数据
// ==========================================
async function createBasicData() {
    console.log('\n========== 第二步：创建基础数据 ==========');
    
    // 2.1 创建部门
    const departments = [
        { dept_name: '销售部', dept_code: 'SALES', dept_type: 'sales' },
        { dept_name: '设计部', dept_code: 'DESIGN', dept_type: 'sales' },
        { dept_name: '生产部', dept_code: 'PROD', dept_type: 'production' },
        { dept_name: '仓储部', dept_code: 'WARE', dept_type: 'production' },
        { dept_name: '物流部', dept_code: 'LOG', dept_type: 'production' },
        { dept_name: '安装部', dept_code: 'INST', dept_type: 'production' },
        { dept_name: '财务部', dept_code: 'FIN', dept_type: 'admin' },
        { dept_name: '人事部', dept_code: 'HR', dept_type: 'admin' }
    ];
    
    const deptIds = [];
    for (const dept of departments) {
        try {
            const res = await axios.post(`${BASE_URL}/system/department`, dept, { headers });
            const id = res.data?.id || res.data?.data?.id;
            deptIds.push(id);
            console.log(`✅ 部门: ${dept.dept_name} (${id?.substring(0, 8)}...)`);
        } catch (err) {
            console.log(`⚠️ 部门失败: ${dept.dept_name} - ${err.response?.status}`);
            deptIds.push(null);
        }
    }
    
    // 2.2 创建员工 (使用正确字段名)
    const employees = [
        { employee_name: '张三', phone: '13800001001', email: 'zhangsan@company.com', dept_idx: 0, position: '销售经理', salary: 8000 },
        { employee_name: '李四', phone: '13800001002', email: 'lisi@company.com', dept_idx: 0, position: '销售员', salary: 5000 },
        { employee_name: '王五', phone: '13800001003', email: 'wangwu@company.com', dept_idx: 1, position: '设计师', salary: 7000 },
        { employee_name: '赵六', phone: '13800001004', email: 'zhaoliu@company.com', dept_idx: 1, position: '设计经理', salary: 9000 },
        { employee_name: '钱七', phone: '13800001005', email: 'qianqi@company.com', dept_idx: 2, position: '生产主管', salary: 8500 },
        { employee_name: '孙八', phone: '13800001006', email: 'sunba@company.com', dept_idx: 2, position: '生产工人', salary: 4500 },
        { employee_name: '周九', phone: '13800001007', email: 'zhoujiu@company.com', dept_idx: 3, position: '仓库管理员', salary: 5000 },
        { employee_name: '吴十', phone: '13800001008', email: 'wushi@company.com', dept_idx: 4, position: '物流司机', salary: 5500 },
        { employee_name: '郑一', phone: '13800001009', email: 'zhengyi@company.com', dept_idx: 5, position: '安装工', salary: 6000 },
        { employee_name: '王二', phone: '13800001010', email: 'wanger@company.com', dept_idx: 5, position: '安装队长', salary: 7500 },
        { employee_name: '冯三', phone: '13800001011', email: 'fengsan@company.com', dept_idx: 6, position: '会计', salary: 7000 },
        { employee_name: '陈五', phone: '13800001012', email: 'chenwu@company.com', dept_idx: 7, position: '人事专员', salary: 5000 }
    ];
    
    const employeeIds = [];
    for (const emp of employees) {
        try {
            const empData = {
                employee_no: `EMP${randomInt(1000, 9999)}`,
                employee_name: emp.employee_name,
                phone: emp.phone,
                email: emp.email,
                dept_id: deptIds[emp.dept_idx],
                position: emp.position,
                employee_type: 'full_time',
                hire_date: new Date().toISOString().split('T')[0],
                salary: emp.salary,
                gender: 'male',
                id_card_type: 'id_card',
                id_card_no: `440000${randomInt(100000000, 999999999)}`
            };
            const res = await axios.post(`${BASE_URL}/employees`, empData, { headers });
            const id = res.data?.id || res.data?.data?.id;
            employeeIds.push(id);
            console.log(`✅ 员工: ${emp.employee_name} (${id?.substring(0, 8)}...)`);
        } catch (err) {
            console.log(`⚠️ 员工失败: ${emp.employee_name} - ${err.response?.status} ${err.response?.data?.message}`);
            employeeIds.push(null);
        }
    }
    
    // 2.3 创建账户
    const accounts = [
        { account_name: '现金', account_code: 'CASH', account_type: 'cash', balance: 100000 },
        { account_name: '建设银行', account_code: 'CCB', account_type: 'bank', bank_name: '建设银行', balance: 500000 },
        { account_name: '微信支付', account_code: 'WECHAT', account_type: 'wechat', balance: 50000 },
        { account_name: '支付宝', account_code: 'ALIPAY', account_type: 'alipay', balance: 50000 }
    ];
    
    const accountIds = [];
    for (const acc of accounts) {
        try {
            const res = await axios.post(`${BASE_URL}/finance/account`, acc, { headers });
            const id = res.data?.id || res.data?.data?.id;
            accountIds.push(id);
            console.log(`✅ 账户: ${acc.account_name}`);
        } catch (err) {
            accountIds.push(null);
            console.log(`⚠️ 账户失败: ${acc.account_name}`);
        }
    }
    
    // 2.4 创建供应商
    const suppliers = [
        { supplier_name: '广东不锈钢板材厂', supplier_code: 'SUP001', contact_person: '刘老板', phone: '13900001001', supplier_type: 'manufacturer' },
        { supplier_name: '浙江五金配件厂', supplier_code: 'SUP002', contact_person: '陈老板', phone: '13900001002', supplier_type: 'manufacturer' },
        { supplier_name: '上海胶水供应商', supplier_code: 'SUP003', contact_person: '周老板', phone: '13900001003', supplier_type: 'distributor' }
    ];
    
    const supplierIds = [];
    for (const sup of suppliers) {
        try {
            const res = await axios.post(`${BASE_URL}/suppliers`, sup, { headers });
            const id = res.data?.id || res.data?.data?.id;
            supplierIds.push(id);
            console.log(`✅ 供应商: ${sup.supplier_name}`);
        } catch (err) {
            supplierIds.push(null);
            console.log(`⚠️ 供应商失败: ${sup.supplier_name}`);
        }
    }
    
    // 2.5 创建仓库
    const warehouses = [
        { warehouse_name: '原材料仓库', warehouse_code: 'WH01', warehouse_type: 'raw_material', area: 2000 },
        { warehouse_name: '成品仓库', warehouse_code: 'WH02', warehouse_type: 'finished', area: 1500 },
        { warehouse_name: '包装材料库', warehouse_code: 'WH03', warehouse_type: 'raw_material', area: 500 }
    ];
    
    const warehouseIds = [];
    for (const wh of warehouses) {
        try {
            const res = await axios.post(`${BASE_URL}/warehouse`, wh, { headers });
            const id = res.data?.id || res.data?.data?.id;
            warehouseIds.push(id);
            console.log(`✅ 仓库: ${wh.warehouse_name}`);
        } catch (err) {
            warehouseIds.push(null);
            console.log(`⚠️ 仓库失败: ${wh.warehouse_name}`);
        }
    }
    
    return { deptIds, employeeIds, accountIds, supplierIds, warehouseIds };
}

// ==========================================
// 第三步：创建客户数据
// ==========================================
async function createCustomers() {
    console.log('\n========== 第三步：创建客户数据 ==========');
    
    const customers = [
        { customer_name: '张先生', phone: '13700001001', address: '广州市天河区珠江新城', source: '电话营销' },
        { customer_name: '李女士', phone: '13700001002', address: '深圳市南山区科技园', source: '网络推广' },
        { customer_name: '王先生', phone: '13700001003', address: '佛山市顺德区大良镇', source: '朋友推荐' },
        { customer_name: '赵先生', phone: '13700001004', address: '东莞市南城区鸿福路', source: '电话营销' },
        { customer_name: '刘女士', phone: '13700001005', address: '惠州市惠城区江北', source: '展会客户' },
        { customer_name: '陈先生', phone: '13700001006', address: '中山市东区利和广场', source: '网络推广' },
        { customer_name: '黄先生', phone: '13700001007', address: '珠海市香洲区拱北', source: '朋友推荐' },
        { customer_name: '周女士', phone: '13700001008', address: '江门市蓬江区万达', source: '电话营销' }
    ];
    
    const customerIds = [];
    for (const cust of customers) {
        try {
            const res = await axios.post(`${BASE_URL}/customers`, cust, { headers });
            const id = res.data?.id || res.data?.data?.id;
            customerIds.push(id);
            console.log(`✅ 客户: ${cust.customer_name}`);
        } catch (err) {
            customerIds.push(null);
            console.log(`⚠️ 客户失败: ${cust.customer_name} - ${err.response?.status}`);
        }
    }
    
    return customerIds;
}

// ==========================================
// 第四步：创建设计记录
// ==========================================
async function createDesigns(customerIds) {
    console.log('\n========== 第四步：创建设计记录 ==========');
    
    const designs = [];
    for (let i = 0; i < Math.min(5, customerIds.length); i++) {
        if (!customerIds[i]) continue;
        
        const design = {
            customer_id: customerIds[i],
            design_type: 'detail',
            status: 'design_done',
            room_type: i % 2 === 0 ? 'kitchen' : 'bathroom',
            room_area: randomFloat(8, 25),
            design_no: `DS${Date.now()}${i}`
        };
        
        try {
            const res = await axios.post(`${BASE_URL}/design`, design, { headers });
            const designData = res.data?.data || res.data;
            designs.push(designData);
            console.log(`✅ 设计: ${design.design_no}`);
        } catch (err) {
            designs.push(null);
            console.log(`⚠️ 设计失败: ${err.response?.status}`);
        }
    }
    
    return designs;
}

// ==========================================
// 第五步：创建报价单
// ==========================================
async function createQuotes(customerIds, designs) {
    console.log('\n========== 第五步：创建报价单 ==========');
    
    const quotes = [];
    for (let i = 0; i < designs.length; i++) {
        if (!designs[i] || !customerIds[i]) continue;
        
        const quote = {
            customer_id: customerIds[i],
            design_id: designs[i].id || designs[i],
            total_amount: randomFloat(15000, 50000),
            discount_amount: randomFloat(1000, 5000),
            final_amount: randomFloat(12000, 45000),
            status: 'confirmed',
            quote_no: `QT${Date.now()}${i}`
        };
        
        try {
            const res = await axios.post(`${BASE_URL}/quote`, quote, { headers });
            const quoteData = res.data?.data || res.data;
            quotes.push(quoteData);
            console.log(`✅ 报价: ${quote.quote_no}`);
        } catch (err) {
            quotes.push(null);
            console.log(`⚠️ 报价失败: ${err.response?.status}`);
        }
    }
    
    return quotes;
}

// ==========================================
// 第六步：创建订单
// ==========================================
async function createOrders(customerIds, designs, quotes) {
    console.log('\n========== 第六步：创建订单 ==========');
    
    const orders = [];
    for (let i = 0; i < quotes.length; i++) {
        if (!quotes[i] || !customerIds[i]) continue;
        
        const order = {
            customer_id: customerIds[i],
            design_id: designs[i].id || designs[i],
            quote_id: quotes[i].id || quotes[i],
            order_type: 'new',
            order_status: 'pending',
            total_amount: quotes[i].final_amount || quotes[i].total_amount,
            deposit_amount: (quotes[i].final_amount || 10000) * 0.3,
            paid_amount: (quotes[i].final_amount || 10000) * 0.3,
            delivery_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            install_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            order_no: `ORD${Date.now()}${i}`
        };
        
        try {
            const res = await axios.post(`${BASE_URL}/orders`, order, { headers });
            const orderData = res.data?.data || res.data;
            orders.push(orderData);
            console.log(`✅ 订单: ${order.order_no}`);
        } catch (err) {
            orders.push(null);
            console.log(`⚠️ 订单失败: ${err.response?.status} - ${err.response?.data?.message}`);
        }
    }
    
    return orders;
}

// ==========================================
// 第七步：创建生产追踪记录
// ==========================================
async function createProductionTracking(orders) {
    console.log('\n========== 第七步：创建生产追踪记录 ==========');
    
    const stages = [
        { name: '订单确认', order: 1 },
        { name: '设计拆单', order: 2 },
        { name: '材料准备', order: 3 },
        { name: '开料切割', order: 4 },
        { name: '封边处理', order: 5 },
        { name: '钻孔加工', order: 6 },
        { name: '组装检验', order: 7 },
        { name: '包装入库', order: 8 }
    ];
    
    const trackingRecords = [];
    
    for (const order of orders) {
        if (!order || !order.id) continue;
        
        for (const stage of stages) {
            try {
                const tracking = {
                    order_id: order.id,
                    current_stage: stage.name,
                    stage_name: stage.name,
                    stage_order: stage.order,
                    status: stage.order < 7 ? 'completed' : 'in_progress',
                    start_time: new Date(Date.now() - (8 - stage.order) * 24 * 60 * 60 * 1000).toISOString(),
                    completed_at: stage.order < 7 ? new Date(Date.now() - (8 - stage.order) * 24 * 60 * 60 * 1000).toISOString() : null
                };
                
                const res = await axios.post(`${BASE_URL}/production/tracking`, tracking, { headers });
                trackingRecords.push(res.data);
                console.log(`✅ 追踪: ${order.order_no} - ${stage.name}`);
            } catch (err) {
                console.log(`⚠️ 追踪失败: ${stage.name}`);
            }
        }
    }
    
    return trackingRecords;
}

// ==========================================
// 第八步：创建包装记录
// ==========================================
async function createPackageRecords(orders) {
    console.log('\n========== 第八步：创建包装记录 ==========');
    
    const packages = [];
    for (let i = 0; i < orders.length; i++) {
        if (!orders[i]) continue;
        
        const pkg = {
            order_id: orders[i].id,
            package_type: 'standard',
            package_count: randomInt(3, 8),
            actual_count: randomInt(3, 8),
            weight: randomFloat(50, 200),
            volume: randomFloat(1, 5),
            status: 'packaged',
            packaged_at: new Date().toISOString(),
            package_no: `PKG${Date.now()}${i}`
        };
        
        try {
            const res = await axios.post(`${BASE_URL}/package`, pkg, { headers });
            packages.push(res.data);
            console.log(`✅ 包装: ${pkg.package_no}`);
        } catch (err) {
            packages.push(null);
        }
    }
    
    return packages;
}

// ==========================================
// 第九步：创建物流和安装记录
// ==========================================
async function createLogisticsAndInstallation(orders) {
    console.log('\n========== 第九步：创建物流和安装记录 ==========');
    
    for (let i = 0; i < orders.length; i++) {
        if (!orders[i]) continue;
        
        // 物流
        const logistics = {
            order_id: orders[i].id,
            logistics_company: i % 2 === 0 ? '顺丰速运' : '德邦物流',
            tracking_no: `SF${randomInt(100000000, 999999999)}`,
            status: 'in_transit',
            pickup_address: '广东省佛山市顺德区不锈钢橱柜工厂',
            delivery_address: orders[i].address || '客户地址',
            estimated_arrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            logistics_no: `LOG${Date.now()}${i}`
        };
        
        try {
            await axios.post(`${BASE_URL}/shipment`, logistics, { headers });
            console.log(`✅ 物流: ${logistics.logistics_no}`);
        } catch (err) {
            console.log(`⚠️ 物流失败`);
        }
        
        // 安装任务
        const install = {
            order_id: orders[i].id,
            status: 'scheduled',
            appointment_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            appointment_time_range: '09:00-12:00',
            install_address: orders[i].address || '客户地址',
            install_contact: orders[i].customer_name || '客户',
            install_phone: orders[i].phone || '电话',
            task_no: `INS${Date.now()}${i}`
        };
        
        try {
            await axios.post(`${BASE_URL}/order/install`, install, { headers });
            console.log(`✅ 安装: ${install.task_no}`);
        } catch (err) {
            console.log(`⚠️ 安装任务失败`);
        }
    }
}

// ==========================================
// 第十步：创建考勤数据
// ==========================================
async function createAttendance(employeeIds) {
    console.log('\n========== 第十步：创建考勤数据 ==========');
    
    const attendanceRecords = [];
    
    for (const empId of employeeIds.slice(0, 10)) {
        if (!empId) continue;
        
        for (let d = 30; d >= 1; d--) {
            const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
            const dayOfWeek = date.getDay();
            
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            const isLate = Math.random() > 0.8;
            const isEarlyLeave = Math.random() > 0.9;
            
            const attendance = {
                employee_id: empId,
                record_date: date.toISOString().split('T')[0],
                check_in_time: new Date(date.setHours(8, isLate ? randomInt(10, 30) : randomInt(0, 9), 0)).toISOString(),
                check_out_time: new Date(date.setHours(isEarlyLeave ? 17 : 18, isEarlyLeave ? randomInt(0, 29) : randomInt(0, 59), 0)).toISOString(),
                status: isLate ? 'late' : 'normal',
                working_hours: isLate || isEarlyLeave ? randomFloat(7, 9) : randomFloat(8, 9),
                late_minutes: isLate ? randomInt(5, 30) : 0
            };
            
            try {
                await axios.post(`${BASE_URL}/attendance`, attendance, { headers });
                attendanceRecords.push(attendance);
            } catch (err) {
                // 忽略
            }
        }
        
        console.log(`✅ 考勤: 员工 ${empId?.substring(0, 8)}...`);
    }
    
    return attendanceRecords;
}

// ==========================================
// 第十一步：创建财务收付款记录
// ==========================================
async function createFinanceRecords(orders, accountIds) {
    console.log('\n========== 第十一步：创建财务收付款记录 ==========');
    
    // 收款
    for (let i = 0; i < orders.length; i++) {
        if (!orders[i]) continue;
        
        const paymentIn = {
            order_id: orders[i].id,
            customer_id: orders[i].customer_id,
            payment_type: 'deposit',
            amount: orders[i].deposit_amount || 5000,
            payment_method: i % 3 === 0 ? 'wechat' : 'transfer',
            account_id: accountIds[i % accountIds.length],
            payment_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'received',
            payment_no: `PI${Date.now()}${i}1`
        };
        
        try {
            await axios.post(`${BASE_URL}/finance/payment-in`, paymentIn, { headers });
            console.log(`✅ 收款: ${paymentIn.payment_no}`);
        } catch (err) {
            console.log(`⚠️ 收款失败`);
        }
        
        // 进度款
        if (i < 3) {
            const progressPayment = {
                order_id: orders[i].id,
                customer_id: orders[i].customer_id,
                payment_type: 'progress',
                amount: (orders[i].total_amount || 10000) * 0.5,
                payment_method: 'transfer',
                account_id: accountIds[1],
                payment_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'received',
                payment_no: `PI${Date.now()}${i}2`
            };
            
            try {
                await axios.post(`${BASE_URL}/finance/payment-in`, progressPayment, { headers });
                console.log(`✅ 进度款: ${progressPayment.payment_no}`);
            } catch (err) {
                console.log(`⚠️ 进度款失败`);
            }
        }
    }
}

// ==========================================
// 第十二步：生成考勤统计报表
// ==========================================
async function generateAttendanceReport() {
    console.log('\n========== 第十二步：生成考勤统计报表 ==========');
    
    try {
        const yearMonth = new Date().toISOString().slice(0, 7);
        const res = await axios.get(`${BASE_URL}/reports/attendance?year_month=${yearMonth}`, { headers });
        console.log('✅ 考勤统计报表成功');
        return res.data;
    } catch (err) {
        console.log('⚠️ 考勤统计报表失败:', err.response?.status);
        return null;
    }
}

// ==========================================
// 第十三步：生成财务报表
// ==========================================
async function generateFinanceReport() {
    console.log('\n========== 第十三步：生成财务报表 ==========');
    
    const reports = [];
    
    // 生产日报
    try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await axios.get(`${BASE_URL}/reports/production/daily?date=${today}`, { headers });
        console.log('✅ 生产日报成功');
        reports.push({ type: 'production_daily', data: res.data });
    } catch (err) {
        console.log('⚠️ 生产日报失败:', err.response?.status);
    }
    
    // 应收款
    try {
        const res = await axios.get(`${BASE_URL}/receivables`, { headers });
        console.log('✅ 应收款报表成功');
        reports.push({ type: 'receivables', data: res.data });
    } catch (err) {
        console.log('⚠️ 应收款报表失败:', err.response?.status);
    }
    
    // 销售统计
    try {
        const res = await axios.get(`${BASE_URL}/reports/sales`, { headers });
        console.log('✅ 销售统计成功');
        reports.push({ type: 'sales', data: res.data });
    } catch (err) {
        console.log('⚠️ 销售统计失败:', err.response?.status);
    }
    
    return reports;
}

// ==========================================
// 主函数
// ==========================================
async function runFullTest() {
    console.log('==========================================');
    console.log('  橱柜工厂管理系统 - 完整流程测试 V2');
    console.log('==========================================\n');
    
    // 1. 登录
    await login();
    if (!authToken) {
        console.log('❌ 无法获取认证token，测试终止');
        return;
    }
    
    // 2. 清空数据
    await clearAllData();
    
    // 3. 创建基础数据
    const basicData = await createBasicData();
    
    // 4. 创建客户
    const customerIds = await createCustomers();
    
    // 5. 创建设计
    const designs = await createDesigns(customerIds);
    
    // 6. 创建报价
    const quotes = await createQuotes(customerIds, designs);
    
    // 7. 创建订单
    const orders = await createOrders(customerIds, designs, quotes);
    
    // 8. 创建生产追踪
    await createProductionTracking(orders);
    
    // 9. 创建包装
    await createPackageRecords(orders);
    
    // 10. 创建物流安装
    await createLogisticsAndInstallation(orders);
    
    // 11. 创建考勤
    await createAttendance(basicData.employeeIds);
    
    // 12. 创建财务记录
    await createFinanceRecords(orders, basicData.accountIds);
    
    // 13. 生成报表
    await generateAttendanceReport();
    await generateFinanceReport();
    
    console.log('\n==========================================');
    console.log('  测试完成！');
    console.log('==========================================');
}

module.exports = { runFullTest };

if (require.main === module) {
    runFullTest().catch(console.error);
}
