/**
 * 成本核算核心服务
 * costAccountingService.js
 *
 * 三大成本要素：
 *   1. 直接材料  = BOM用量 × 采购单价（含损耗）
 *   2. 直接人工  = 工时记录 × 人工单价
 *   3. 制造费用  = 费用池金额 × 分配率（按人工/机时/产量）
 *
 * 分配流程：
 *   1. 归集  → 月末将费用归集到 cost_allocation_pool
 *   2. 分配  → 按规则把制造费用分配到各订单
 *   3. 计算  → 汇总料/工/费计算订单总成本和毛利率
 */

const db = require('../db');
const crypto = require('crypto');

// ==================== 成本归集 ====================

/**
 * 归集某月制造费用
 * @param {string} costMonth YYYY-MM
 */
async function collectMonthlyOverhead(costMonth) {
  // 1. 从 salary_record 归集生产人员工资 → MFG001
  const laborResult = await db.query(
    `SELECT COALESCE(SUM(
       (COALESCE(base_salary,0) + COALESCE(post_salary,0) + COALESCE(performance_salary,0) + COALESCE(overtime_pay,0))
       - COALESCE(deduction,0)
     ),0) as total
     FROM salary_record
     WHERE TO_CHAR(salary_month, 'YYYY-MM') = $1
       AND status IN ('paid','pending')`,
    [costMonth]
  );
  const laborCost = parseFloat(laborResult.rows[0]?.total || 0);

  // 2. 从 expense 归集已报销的车间费用
  const expenseResult = await db.query(
    `SELECT expense_type, SUM(amount) as total
     FROM expense
     WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1
       AND reimbursed = TRUE
     GROUP BY expense_type`,
    [costMonth]
  );

  // 3. 归集到 monthly_cost_pool
  const poolResult = await db.query(
    `SELECT id, pool_code, pool_name, pool_category, allocation_base FROM cost_allocation_pool WHERE is_active = TRUE`
  );
  const pools = poolResult.rows;

  for (const pool of pools) {
    let amount = 0;
    if (pool.pool_code === 'MFG001' || pool.pool_code === 'MFG002') {
      amount = laborCost;
    } else {
      const matched = expenseResult.rows.find(r =>
        r.expense_type?.toLowerCase().includes(pool.pool_name.substring(0, 4))
      );
      amount = matched ? parseFloat(matched.total) : 0;
    }

    await db.query(
      `INSERT INTO monthly_cost_pool
         (pool_id, pool_code, pool_name, pool_category, cost_month, actual_amount, total_labor_hours)
       VALUES ($1,$2,$3,$4,$5,$6,0)
       ON CONFLICT (pool_id, cost_month, department)
       DO UPDATE SET actual_amount = EXCLUDED.actual_amount, updated_at = NOW()`,
      [pool.id, pool.pool_code, pool.pool_name, pool.pool_category, costMonth, amount]
    );
  }

  return { laborCost, poolCount: pools.length };
}

/**
 * 记录工时
 */
async function recordWorkHours({ employeeId, employeeName, orderId, orderNo, productionStage, workDate, hours, workType = '正常', station, efficiency = 1.0, remark }) {
  const recordNo = `WH${Date.now()}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const laborCost = hours * efficiency * 50; // 暂定 50元/小时，实际应取员工时薪

  const result = await db.query(
    `INSERT INTO work_hours_record
       (record_no, employee_id, employee_name, order_id, order_no, production_stage, work_date, hours, work_type, station, efficiency, labor_cost, remark)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [recordNo, employeeId, employeeName, orderId, orderNo, productionStage, workDate, hours, workType, station, efficiency, laborCost, remark]
  );
  return result.rows[0];
}

/**
 * 批量导入工时（支持 Excel 解析后调用）
 */
async function batchRecordWorkHours(records) {
  const results = [];
  for (const r of records) {
    const row = await recordWorkHours(r);
    results.push(row);
  }
  return results;
}

// ==================== 成本分配 ====================

/**
 * 将制造费用分配到订单
 * @param {string} costMonth YYYY-MM
 */
async function allocateOverheadToOrders(costMonth) {
  // 1. 获取该月各订单的人工工时
  const laborHoursResult = await db.query(
    `SELECT order_id, order_no, SUM(hours * COALESCE(efficiency,1)) as total_hours
     FROM work_hours_record
     WHERE TO_CHAR(work_date, 'YYYY-MM') = $1 AND order_id IS NOT NULL
     GROUP BY order_id, order_no`,
    [costMonth]
  );
  const orderHours = laborHoursResult.rows; // [{order_id, order_no, total_hours}]

  const totalHours = orderHours.reduce((s, r) => s + parseFloat(r.total_hours || 0), 0);
  if (totalHours === 0) return { allocated: 0, reason: '无工时记录' };

  // 2. 获取该月各费用池金额（按人工工时分配）
  const overheadResult = await db.query(
    `SELECT mcp.pool_id, mcp.pool_name, mcp.actual_amount, cap.allocation_base, cap.id as rule_pool_id
     FROM monthly_cost_pool mcp
     JOIN cost_allocation_pool cap ON cap.id = mcp.pool_id
     WHERE mcp.cost_month = $1 AND mcp.actual_amount > 0`,
    [costMonth]
  );

  let totalAllocated = 0;
  const allocations = [];

  for (const order of orderHours) {
    const orderHoursNum = parseFloat(order.total_hours || 0);
    const ratio = orderHoursNum / totalHours;
    let orderOverhead = 0;

    for (const oh of overheadResult.rows) {
      const amount = parseFloat(oh.actual_amount || 0) * ratio;
      orderOverhead += amount;

      allocations.push({
        orderId: order.order_id,
        orderNo: order.order_no,
        poolName: oh.pool_name,
        poolId: oh.pool_id,
        baseValue: orderHoursNum,
        rate: ratio,
        amount: parseFloat(amount.toFixed(2))
      });
    }

    totalAllocated += orderOverhead;

    // 更新 order_cost_summary 的 manufacturing_overhead
    await db.query(
      `UPDATE order_cost_summary
       SET manufacturing_overhead = COALESCE(manufacturing_overhead,0) + $1,
           overhead_details = COALESCE(overhead_details,'[]')::jsonb || $2::jsonb,
           total_cost = material_cost + labor_cost + COALESCE(manufacturing_overhead,0) + $1 + other_direct_cost,
           gross_profit = order_amount - (material_cost + labor_cost + COALESCE(manufacturing_overhead,0) + $1 + other_direct_cost),
           gross_margin = CASE WHEN order_amount > 0 THEN
             ((order_amount - (material_cost + labor_cost + COALESCE(manufacturing_overhead,0) + $1 + other_direct_cost)) / order_amount * 100)
             ELSE 0 END,
           updated_at = NOW()
       WHERE order_id = $3`,
      [
        parseFloat(orderOverhead.toFixed(2)),
        JSON.stringify(allocations.filter(a => a.orderId === order.order_id)),
        order.order_id
      ]
    );
  }

  return { allocated: totalAllocated, orderCount: orderHours.length, allocations };
}

// ==================== 订单成本计算 ====================

/**
 * 计算单个订单的成本（材料 + 人工）
 * 制造费用由 allocateOverheadToOrders 分配
 */
async function calculateOrderCost(orderId) {
  const orderResult = await db.query(
    `SELECT om.*,
       (SELECT COALESCE(SUM(total_price),0) FROM order_bom WHERE order_id = om.id) as bom_total
     FROM order_master om WHERE om.id = $1`,
    [orderId]
  );
  const order = orderResult.rows[0];
  if (!order) throw new Error(`订单 ${orderId} 不存在`);

  const orderNo = order.order_no;

  // 1. 直接材料成本 = order_bom 实际用量 × 单价
  const bomResult = await db.query(
    `SELECT
       SUM(ob.quantity * COALESCE(ob.unit_price, m.unit_price, 0)) as material_cost,
       jsonb_agg(jsonb_build_object(
         'material_name', ob.material_name,
         'material_code', ob.material_code,
         'quantity', ob.quantity,
         'unit_price', COALESCE(ob.unit_price, m.unit_price, 0),
         'total', ob.quantity * COALESCE(ob.unit_price, m.unit_price, 0)
       )) as details
     FROM order_bom ob
     LEFT JOIN material m ON m.material_code = ob.material_code
     WHERE ob.order_id = $1`,
    [orderId]
  );
  const materialCost = parseFloat(bomResult.rows[0]?.material_cost || 0);
  const materialDetails = bomResult.rows[0]?.details || [];

  // 2. 直接人工成本 = 工时记录
  const laborResult = await db.query(
    `SELECT
       COALESCE(SUM(labor_cost),0) as labor_cost,
       COALESCE(SUM(hours),0) as labor_hours,
       jsonb_agg(jsonb_build_object(
         'employee_name', employee_name,
         'hours', hours,
         'cost', labor_cost
       ) ORDER BY work_date) as details
     FROM work_hours_record
     WHERE order_id = $1`,
    [orderId]
  );
  const laborCost = parseFloat(laborResult.rows[0]?.labor_cost || 0);
  const laborHours = parseFloat(laborResult.rows[0]?.labor_hours || 0);
  const laborDetails = laborResult.rows[0]?.details || [];

  // 3. 标准材料成本（BOM）
  const standardMaterialCost = parseFloat(order.bom_total || 0);
  const materialCostVariance = materialCost - standardMaterialCost;

  // 4. 总成本（制造费用待分配）
  const totalCost = materialCost + laborCost;
  const orderAmount = parseFloat(order.total_amount || 0);
  const grossProfit = orderAmount - totalCost;
  const grossMargin = orderAmount > 0 ? (grossProfit / orderAmount * 100) : 0;

  // 5. 写入/更新 order_cost_summary
  const result = await db.query(
    `INSERT INTO order_cost_summary
       (order_id, order_no, cost_period,
        material_cost, material_details,
        labor_cost, labor_hours, labor_details,
        standard_material_cost, material_cost_variance,
        order_amount, total_cost, gross_profit, gross_margin)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (order_id) DO UPDATE SET
       material_cost = EXCLUDED.material_cost,
       material_details = EXCLUDED.material_details,
       labor_cost = EXCLUDED.labor_cost,
       labor_hours = EXCLUDED.labor_hours,
       labor_details = EXCLUDED.labor_details,
       standard_material_cost = EXCLUDED.standard_material_cost,
       material_cost_variance = EXCLUDED.material_cost_variance,
       order_amount = EXCLUDED.order_amount,
       total_cost = EXCLUDED.total_cost,
       gross_profit = EXCLUDED.gross_profit,
       gross_margin = EXCLUDED.gross_margin,
       calculated_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [
      orderId, orderNo,
      new Date().toISOString().slice(0, 7),
      materialCost, JSON.stringify(materialDetails),
      laborCost, laborHours, JSON.stringify(laborDetails),
      standardMaterialCost, materialCostVariance,
      orderAmount, totalCost, grossProfit, grossMargin
    ]
  );

  return result.rows[0];
}

/**
 * 批量计算订单成本
 */
async function batchCalculateOrderCosts(orderIds) {
  const results = [];
  for (const orderId of orderIds) {
    try {
      const r = await calculateOrderCost(orderId);
      results.push(r);
    } catch (e) {
      console.error(`计算订单 ${orderId} 成本失败:`, e.message);
    }
  }
  return results;
}

// ==================== 成本分析报表 ====================

/**
 * 成本明细表
 */
async function getCostDetailReport({ costMonth, orderNo, department, page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  let where = ['1=1'];
  let params = [];
  let p = 0;

  if (costMonth) { where.push(`TO_CHAR(calculated_at, 'YYYY-MM') = $${++p}`); params.push(costMonth); }
  if (orderNo) { where.push(`order_no LIKE $${++p}`); params.push(`%${orderNo}%`); }

  const whereStr = 'WHERE ' + where.join(' AND ');
  params.push(pageSize, offset);

  const result = await db.query(
    `SELECT * FROM order_cost_summary ${whereStr}
     ORDER BY calculated_at DESC LIMIT $${p+1} OFFSET $${p+2}`,
    params
  );

  const countResult = await db.query(
    `SELECT COUNT(*) FROM order_cost_summary ${whereStr}`,
    params.slice(0, -2)
  );

  return { list: result.rows, total: parseInt(countResult.rows[0].count), page, pageSize };
}

/**
 * 月度成本汇总
 */
async function getMonthlyCostSummary(costMonth) {
  // 工时汇总
  const laborSummary = await db.query(
    `SELECT
       COUNT(DISTINCT employee_id) as worker_count,
       SUM(hours) as total_hours,
       SUM(labor_cost) as total_labor_cost
     FROM work_hours_record
     WHERE TO_CHAR(work_date, 'YYYY-MM') = $1`,
    [costMonth]
  );

  // 费用池汇总
  const overheadSummary = await db.query(
    `SELECT pool_category,
       SUM(actual_amount) as total
     FROM monthly_cost_pool
     WHERE cost_month = $1
     GROUP BY pool_category`,
    [costMonth]
  );

  // 订单成本汇总
  const orderSummary = await db.query(
    `SELECT
       COUNT(*) as order_count,
       SUM(material_cost) as total_material,
       SUM(labor_cost) as total_labor,
       SUM(manufacturing_overhead) as total_overhead,
       SUM(total_cost) as total_cost,
       SUM(order_amount) as total_sales,
       AVG(gross_margin) as avg_margin
     FROM order_cost_summary
     WHERE TO_CHAR(calculated_at, 'YYYY-MM') = $1`,
    [costMonth]
  );

  return {
    labor: laborSummary.rows[0],
    overhead: overheadSummary.rows,
    order: orderSummary.rows[0]
  };
}

/**
 * 成本占比分析（料/工/费）
 */
async function getCostRatioAnalysis(costMonth) {
  const result = await db.query(
    `SELECT
       SUM(material_cost) as total_material,
       SUM(labor_cost) as total_labor,
       SUM(manufacturing_overhead) as total_overhead,
       SUM(total_cost) as grand_total
     FROM order_cost_summary
     WHERE TO_CHAR(calculated_at, 'YYYY-MM') = $1`,
    [costMonth]
  );

  const row = result.rows[0];
  const total = parseFloat(row.grand_total || 0);
  if (total === 0) return { material: 0, labor: 0, overhead: 0, total: 0 };

  return {
    material: parseFloat(((row.total_material || 0) / total * 100).toFixed(2)),
    labor: parseFloat(((row.total_labor || 0) / total * 100).toFixed(2)),
    overhead: parseFloat(((row.total_overhead || 0) / total * 100).toFixed(2)),
    total
  };
}

/**
 * 毛利率排行
 */
async function getMarginRanking(costMonth, limit = 20) {
  const result = await db.query(
    `SELECT order_no, total_cost, order_amount, gross_profit, gross_margin
     FROM order_cost_summary
     WHERE TO_CHAR(calculated_at, 'YYYY-MM') = $1
       AND order_amount > 0
     ORDER BY gross_margin DESC
     LIMIT $2`,
    [costMonth, limit]
  );
  return result.rows;
}

module.exports = {
  collectMonthlyOverhead,
  recordWorkHours,
  batchRecordWorkHours,
  allocateOverheadToOrders,
  calculateOrderCost,
  batchCalculateOrderCosts,
  getCostDetailReport,
  getMonthlyCostSummary,
  getCostRatioAnalysis,
  getMarginRanking
};
