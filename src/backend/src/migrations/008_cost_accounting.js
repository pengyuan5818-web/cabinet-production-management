/**
 * 成本核算系统数据库变更
 * migration_008_cost_accounting.js
 *
 * 新增表:
 *   - cost_allocation_pool     制造费用明细项目（工资、折旧、水电、房租等）
 *   - cost_allocation_rule    分配规则（按人工/机时/产量分配）
 *   - work_hours_record       工时记录（员工 × 订单 × 工序 × 工时）
 *   - order_cost_summary      订单成本汇总（每订单一张，包含料/工/费/总）
 *   - monthly_cost_pool       月度费用归集（每月每个费用项目一条）
 *
 * 已有相关表（利用现有结构）:
 *   - cost_record             通用成本记录（手动记账）
 *   - material_consumption    物料消耗记录
 *   - process_output          工序产出记录
 *   - salary_record           员工工资记录
 *   - expense                 费用报销
 *   - material                物料主数据（unit_price）
 *   - order_bom               订单BOM（实际用量）
 */

const db = require('../db');

async function migrate() {
  console.log('开始执行 migration 008: 成本核算系统...');

  // 1. 费用项目池（制造费用、管理费用、销售费用）
  await db.query(`
    CREATE TABLE IF NOT EXISTS cost_allocation_pool (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pool_code VARCHAR(50) NOT NULL UNIQUE,
      pool_name VARCHAR(100) NOT NULL,
      pool_category VARCHAR(50) NOT NULL,   -- manufacturing | management | sales
      parent_id UUID REFERENCES cost_allocation_pool(id),
      allocation_base VARCHAR(30),           -- labor_hours | machine_hours | quantity | area
      is_active BOOLEAN DEFAULT TRUE,
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ cost_allocation_pool');

  // 2. 分配规则表
  await db.query(`
    CREATE TABLE IF NOT EXISTS cost_allocation_rule (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_code VARCHAR(50) NOT NULL UNIQUE,
      rule_name VARCHAR(100) NOT NULL,
      pool_id UUID NOT NULL REFERENCES cost_allocation_pool(id),
      department VARCHAR(100),               -- 适用部门
      allocation_method VARCHAR(30) NOT NULL, -- labor_hours | machine_hours | quantity | weight | area
      rate NUMERIC(12,6),                   -- 分配率（如 0.038 表示 3.8%）
      formula TEXT,                          -- 自定义公式 JSON
      effective_date DATE NOT NULL,
      expiry_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ cost_allocation_rule');

  // 3. 工时记录（生产员工 × 订单 × 工序/阶段）
  await db.query(`
    CREATE TABLE IF NOT EXISTS work_hours_record (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      record_no VARCHAR(50) NOT NULL UNIQUE,
      employee_id UUID NOT NULL,
      employee_name VARCHAR(100),
      order_id UUID,
      order_no VARCHAR(50),
      production_stage VARCHAR(100),         -- 哪个生产阶段
      work_date DATE NOT NULL,
      hours NUMERIC(6,2) NOT NULL,           -- 工时数
      work_type VARCHAR(30),                  -- 正常 | 加班 | 调休
      station VARCHAR(100),                   -- 工位/设备
      efficiency NUMERIC(5,2),               -- 效率系数
      labor_cost NUMERIC(12,2),               -- 人工成本
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ work_hours_record');

  // 4. 订单成本汇总
  await db.query(`
    CREATE TABLE IF NOT EXISTS order_cost_summary (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL UNIQUE,
      order_no VARCHAR(50) NOT NULL,
      cost_period VARCHAR(7) NOT NULL,        -- YYYY-MM 月份

      -- 直接材料
      material_cost NUMERIC(14,2) DEFAULT 0,
      material_details JSONB,                 -- [{material_name, quantity, unit_price, total}]

      -- 直接人工
      labor_cost NUMERIC(14,2) DEFAULT 0,
      labor_hours NUMERIC(10,2) DEFAULT 0,
      labor_details JSONB,                    -- [{employee_name, hours, cost}]

      -- 制造费用（分配后）
      manufacturing_overhead NUMERIC(14,2) DEFAULT 0,
      overhead_details JSONB,                 -- [{pool_name, base_value, rate, amount}]

      -- 其他直接费用
      other_direct_cost NUMERIC(14,2) DEFAULT 0,

      -- 总成本
      total_cost NUMERIC(14,2) DEFAULT 0,

      -- 订单售价
      order_amount NUMERIC(14,2) DEFAULT 0,

      -- 成本分析
      gross_profit NUMERIC(14,2) DEFAULT 0,  -- order_amount - total_cost
      gross_margin NUMERIC(6,2) DEFAULT 0,     -- gross_profit / order_amount * 100

      -- 标准成本对比
      standard_material_cost NUMERIC(14,2) DEFAULT 0,
      material_cost_variance NUMERIC(14,2) DEFAULT 0,

      calculated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ order_cost_summary');

  // 5. 月度费用归集
  await db.query(`
    CREATE TABLE IF NOT EXISTS monthly_cost_pool (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pool_id UUID NOT NULL REFERENCES cost_allocation_pool(id),
      pool_code VARCHAR(50) NOT NULL,
      pool_name VARCHAR(100) NOT NULL,
      pool_category VARCHAR(50) NOT NULL,
      cost_month VARCHAR(7) NOT NULL,         -- YYYY-MM

      -- 归集维度
      department VARCHAR(100),
      product_line VARCHAR(100),

      -- 实际发生额
      actual_amount NUMERIC(14,2) DEFAULT 0,
      budget_amount NUMERIC(14,2) DEFAULT 0,
      variance_amount NUMERIC(14,2) DEFAULT 0,

      -- 分配参数
      total_labor_hours NUMERIC(12,2) DEFAULT 0,
      total_machine_hours NUMERIC(12,2) DEFAULT 0,
      total_quantity NUMERIC(12,2) DEFAULT 0,
      total_weight NUMERIC(12,2) DEFAULT 0,

      -- 分配后金额
      allocated_amount NUMERIC(14,2) DEFAULT 0,

      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(pool_id, cost_month, department)
    )
  `);
  console.log('✓ monthly_cost_pool');

  // 6. 初始化制造费用项目池（示例数据）
  const pools = [
    { code: 'MFG001', name: '生产工人工资', category: 'manufacturing', base: 'labor_hours' },
    { code: 'MFG002', name: '生产工人社保', category: 'manufacturing', base: 'labor_hours' },
    { code: 'MFG003', name: '车间折旧费', category: 'manufacturing', base: 'machine_hours' },
    { code: 'MFG004', name: '车间水电费', category: 'manufacturing', base: 'machine_hours' },
    { code: 'MFG005', name: '车间房租', category: 'manufacturing', base: 'area' },
    { code: 'MFG006', name: '设备维护费', category: 'manufacturing', base: 'machine_hours' },
    { code: 'MFG007', name: '刀具/辅料', category: 'manufacturing', base: 'quantity' },
    { code: 'MGT001', name: '管理人员工资', category: 'management', base: 'labor_hours' },
    { code: 'SALES001', name: '销售费用', category: 'sales', base: 'quantity' },
  ];

  for (const p of pools) {
    await db.query(
      `INSERT INTO cost_allocation_pool (pool_code, pool_name, pool_category, allocation_base)
       VALUES ($1,$2,$3,$4) ON CONFLICT (pool_code) DO NOTHING`,
      [p.code, p.name, p.category, p.base]
    );
  }
  console.log('✓ 费用项目池初始化数据');

  // 7. 为已有员工工资数据创建基础分配规则
  await db.query(`
    INSERT INTO cost_allocation_rule (rule_code, rule_name, pool_id, allocation_method, effective_date)
    SELECT 'RULE-LABOR', '按人工工时分配', id, 'labor_hours', CURRENT_DATE
    FROM cost_allocation_pool WHERE pool_code = 'MFG001'
    ON CONFLICT (rule_code) DO NOTHING
  `);
  console.log('✓ 分配规则初始化');

  console.log('\n✅ migration 008 完成!');
  console.log('新增表: cost_allocation_pool / cost_allocation_rule / work_hours_record / order_cost_summary / monthly_cost_pool');
  console.log('料/工/费三层成本结构完成');
}

migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
