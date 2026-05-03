/**
 * 成本核算路由
 * /api/cost/*
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const costService = require('../services/costAccountingService');

/**
 * GET /api/cost/report/detail
 * 成本明细表
 */
router.get('/report/detail', async (req, res, next) => {
  try {
    const { cost_month, order_no, page = 1, page_size = 20 } = req.query;
    const result = await costService.getCostDetailReport({
      costMonth: cost_month,
      orderNo: order_no,
      page: parseInt(page),
      pageSize: parseInt(page_size)
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/report/monthly-summary
 * 月度成本汇总
 */
router.get('/report/monthly-summary', async (req, res, next) => {
  try {
    const { cost_month } = req.query;
    if (!cost_month) return res.status(400).json({ success: false, message: '缺少 cost_month 参数（YYYY-MM）' });
    const result = await costService.getMonthlyCostSummary(cost_month);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/report/ratio
 * 成本结构分析（料/工/费占比）
 */
router.get('/report/ratio', async (req, res, next) => {
  try {
    const { cost_month } = req.query;
    if (!cost_month) return res.status(400).json({ success: false, message: '缺少 cost_month 参数' });
    const result = await costService.getCostRatioAnalysis(cost_month);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/report/margin-ranking
 * 毛利率排行
 */
router.get('/report/margin-ranking', async (req, res, next) => {
  try {
    const { cost_month, limit = 20 } = req.query;
    if (!cost_month) return res.status(400).json({ success: false, message: '缺少 cost_month 参数' });
    const result = await costService.getMarginRanking(cost_month, parseInt(limit));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * POST /api/cost/calculate/batch
 * 批量计算订单成本（必须写在 :orderId 之前，否则 batch 被当作 orderId）
 */
router.post('/calculate/batch', async (req, res, next) => {
  try {
    const { order_ids } = req.body;
    if (!Array.isArray(order_ids)) return res.status(400).json({ success: false, message: 'order_ids 必须是数组' });
    const results = await costService.batchCalculateOrderCosts(order_ids);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

/**
 * POST /api/cost/calculate/:orderId
 * 计算单个订单成本
 */
router.post('/calculate/:orderId', async (req, res, next) => {
  try {
    const result = await costService.calculateOrderCost(req.params.orderId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * POST /api/cost/collect-overhead/:costMonth
 * 归集月度制造费用
 */
router.post('/collect-overhead/:costMonth', async (req, res, next) => {
  try {
    const result = await costService.collectMonthlyOverhead(req.params.costMonth);
    res.json({ success: true, message: '费用归集完成', data: result });
  } catch (err) { next(err); }
});

/**
 * POST /api/cost/allocate/:costMonth
 * 分配月度制造费用到订单
 */
router.post('/allocate/:costMonth', async (req, res, next) => {
  try {
    const result = await costService.allocateOverheadToOrders(req.params.costMonth);
    res.json({ success: true, message: '费用分配完成', data: result });
  } catch (err) { next(err); }
});

/**
 * POST /api/cost/work-hours
 * 记录工时
 */
router.post('/work-hours', async (req, res, next) => {
  try {
    const { employee_id, employee_name, order_id, order_no, production_stage, work_date, hours, work_type, station, efficiency, remark } = req.body;
    if (!employee_id || !employee_name || !work_date || !hours) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }
    const result = await costService.recordWorkHours({
      employeeId: employee_id,
      employeeName: employee_name,
      orderId: order_id,
      orderNo: order_no,
      productionStage: production_stage,
      workDate: work_date,
      hours: parseFloat(hours),
      workType: work_type || '正常',
      station,
      efficiency: parseFloat(efficiency || 1.0),
      remark
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/work-hours
 * 工时记录查询
 */
router.get('/work-hours', async (req, res, next) => {
  try {
    const { employee_id, order_id, cost_month, page = 1, page_size = 50 } = req.query;
    const offset = (page - 1) * page_size;
    let where = ['1=1'];
    let params = [];
    let p = 0;

    if (employee_id) { where.push(`employee_id = $${++p}`); params.push(employee_id); }
    if (order_id) { where.push(`order_id = $${++p}`); params.push(order_id); }
    if (cost_month) { where.push(`TO_CHAR(work_date, 'YYYY-MM') = $${++p}`); params.push(cost_month); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM work_hours_record ${whereStr}
       ORDER BY work_date DESC LIMIT $${p+1} OFFSET $${p+2}`,
      params
    );
    const countResult = await db.query(
      `SELECT COUNT(*) FROM work_hours_record ${whereStr}`, params.slice(0, -2)
    );

    res.json({
      success: true,
      data: { list: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/allocation/pool
 * 费用项目池列表（别名，与前端旧路径兼容）
 */
router.get('/allocation/pool', async (req, res, next) => {
  try {
    const { category } = req.query;
    let where = 'WHERE is_active = TRUE';
    if (category) where += ` AND pool_category = '${category}'`;
    const result = await db.query(
      `SELECT * FROM cost_allocation_pool ${where} ORDER BY pool_code`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/overhead-pool
 * 费用项目池列表
 */
router.get('/overhead-pool', async (req, res, next) => {
  try {
    const { category } = req.query;
    let where = 'WHERE is_active = TRUE';
    if (category) where += ` AND pool_category = '${category}'`;
    const result = await db.query(
      `SELECT * FROM cost_allocation_pool ${where} ORDER BY pool_code`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/allocation-rules
 * 分配规则列表
 */
router.get('/allocation-rules', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.*, p.pool_name
       FROM cost_allocation_rule r
       JOIN cost_allocation_pool p ON p.id = r.pool_id
       WHERE r.is_active = TRUE
         AND (r.expiry_date IS NULL OR r.expiry_date >= CURRENT_DATE)
       ORDER BY r.rule_code`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * POST /api/cost/allocation-rules
 * 新增分配规则
 */
router.post('/allocation-rules', async (req, res, next) => {
  try {
    const { rule_code, rule_name, pool_id, department, allocation_method, rate, formula, effective_date, expiry_date } = req.body;
    if (!rule_code || !rule_name || !pool_id || !allocation_method || !effective_date) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }
    const result = await db.query(
      `INSERT INTO cost_allocation_rule (rule_code, rule_name, pool_id, department, allocation_method, rate, formula, effective_date, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [rule_code, rule_name, pool_id, department, allocation_method, rate, formula, effective_date, expiry_date]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/order-cost/:orderId
 * 查询某订单成本汇总
 */
router.get('/order-cost/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const result = await db.query(
      `SELECT * FROM order_cost_summary WHERE order_id = $1`,
      [orderId]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) { next(err); }
});

/**
 * GET /api/cost/monthly-pool/:costMonth
 * 查看某月费用归集明细
 */
router.get('/monthly-pool/:costMonth', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT mcp.*, p.allocation_base
       FROM monthly_cost_pool mcp
       JOIN cost_allocation_pool p ON p.id = mcp.pool_id
       WHERE mcp.cost_month = $1
       ORDER BY p.pool_category, p.pool_code`,
      [req.params.costMonth]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
