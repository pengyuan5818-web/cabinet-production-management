/**
 * 报表统计路由
 * 功能: 生产报表、销售报表、库存报表、财务报表
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/reports/production/daily
 * 生产日报
 */
router.get('/production/daily', async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    // 各阶段完成情况
    const stageResult = await db.query(`
      SELECT 
        ot.current_stage,
        ot.stage_name,
        COUNT(DISTINCT ot.order_id) as order_count,
        COUNT(cb.id) as board_count
      FROM order_tracking ot
      LEFT JOIN cabinet_board cb ON cb.order_id = ot.order_id
      WHERE DATE(ot.completed_at) = $1
      GROUP BY ot.current_stage, ot.stage_name
      ORDER BY MIN(ot.created_at)
    `, [targetDate]);

    // 今日新增订单
    const newOrdersResult = await db.query(`
      SELECT COUNT(*) as count, SUM(total_amount) as amount
      FROM order_master
      WHERE DATE(created_at) = $1
    `, [targetDate]);

    // 今日完成订单
    const completedResult = await db.query(`
      SELECT COUNT(*) as count, SUM(total_amount) as amount
      FROM order_master
      WHERE DATE(updated_at) = $1 AND order_status = 'completed'
    `, [targetDate]);

    // 员工考勤
    const attendanceResult = await db.query(`
      SELECT 
        COUNT(DISTINCT employee_id) as total_attendance,
        COUNT(*) FILTER (WHERE status = 'normal') as normal,
        COUNT(*) FILTER (WHERE status = 'late') as late,
        COUNT(*) FILTER (WHERE status = 'absent') as absent
      FROM attendance_record
      WHERE record_date = $1
    `, [targetDate]);

    res.json({
      success: true,
      data: {
        date: targetDate,
        stages: stageResult.rows,
        new_orders: {
          count: parseInt(newOrdersResult.rows[0].count),
          amount: parseFloat(newOrdersResult.rows[0].amount || 0)
        },
        completed_orders: {
          count: parseInt(completedResult.rows[0].count),
          amount: parseFloat(completedResult.rows[0].amount || 0)
        },
        attendance: attendanceResult.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/production/summary
 * 生产汇总报表
 */
router.get('/production/summary', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await db.query(`
      SELECT 
        om.order_no,
        om.order_status,
        om.total_amount,
        om.expected_delivery,
        c.customer_name,
        d.dealer_name,
        COUNT(cb.id) as board_count,
        COUNT(cb.id) FILTER (WHERE cb.status = 'scanned') as scanned_count,
        STRING_AGG(ot.stage_name, ', ') as stage_history
      FROM order_master om
      LEFT JOIN customer c ON om.customer_id = c.id
      LEFT JOIN dealer d ON om.dealer_id = d.id
      LEFT JOIN cabinet_board cb ON om.id = cb.order_id
      LEFT JOIN order_tracking ot ON om.id = ot.order_id AND ot.stage_status = 'completed'
      WHERE om.created_at BETWEEN COALESCE($1, CURRENT_DATE - INTERVAL '30 days') 
        AND COALESCE($2, CURRENT_DATE)
      GROUP BY om.id, om.order_no, om.order_status, om.total_amount, 
               om.expected_delivery, c.customer_name, d.dealer_name
      ORDER BY om.created_at DESC
    `, [start_date, end_date]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/sales/dealer
 * 经销商销售报表
 */
router.get('/sales/dealer', async (req, res, next) => {
  try {
    const { start_date, end_date, year, month } = req.query;

    let dateFilter = '';
    const params = [];
    let paramCount = 0;

    if (year && month) {
      dateFilter = `AND EXTRACT(YEAR FROM om.created_at) = $${++paramCount}
                    AND EXTRACT(MONTH FROM om.created_at) = $${++paramCount}`;
      params.push(year, month);
    } else if (start_date && end_date) {
      dateFilter = `AND om.created_at BETWEEN $${++paramCount} AND $${++paramCount}`;
      params.push(start_date, end_date);
    }

    const result = await db.query(`
      SELECT 
        d.id as dealer_id,
        d.dealer_name,
        d.dealer_type,
        COUNT(om.id) as order_count,
        SUM(om.total_amount) as total_amount,
        SUM(om.balance_amount) as balance_amount,
        AVG(om.total_amount) as avg_order_amount
      FROM dealer d
      LEFT JOIN order_master om ON d.id = om.dealer_id ${dateFilter}
      GROUP BY d.id, d.dealer_name, d.dealer_type
      HAVING COUNT(om.id) > 0
      ORDER BY total_amount DESC
    `, params);

    // 总计
    const totalResult = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_amount,
        SUM(balance_amount) as total_balance
      FROM order_master
      WHERE 1=1 ${dateFilter}
    `, params);

    res.json({
      success: true,
      data: {
        list: result.rows,
        totals: {
          order_count: parseInt(totalResult.rows[0].total_orders),
          total_amount: parseFloat(totalResult.rows[0].total_amount || 0),
          total_balance: parseFloat(totalResult.rows[0].total_balance || 0)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/inventory/current
 * 库存报表
 */
router.get('/inventory/current', async (req, res, next) => {
  try {
    const { warehouse_id, category, low_stock } = req.query;

    let whereClause = ['m.status = \'active\''];
    const params = [];
    let paramCount = 0;

    if (warehouse_id) {
      whereClause.push(`si.warehouse_id = $${++paramCount}`);
      params.push(warehouse_id);
    }
    if (category) {
      whereClause.push(`m.category = $${++paramCount}`);
      params.push(category);
    }
    if (low_stock === 'true') {
      whereClause.push(`COALESCE(si.quantity, 0) <= m.safe_stock`);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');

    const result = await db.query(`
      SELECT 
        m.id,
        m.material_code,
        m.material_name,
        m.category,
        m.specification,
        m.unit as unit_name,
        m.unit_price,
        COALESCE(si.quantity, 0) as quantity,
        COALESCE(si.locked_quantity, 0) as locked_quantity,
        (COALESCE(si.quantity, 0) - COALESCE(si.locked_quantity, 0)) as available_quantity,
        m.safe_stock,
        m.min_stock,
        COALESCE(si.quantity, 0) * m.unit_price as inventory_value,
        w.warehouse_name
      FROM material m
      LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id
      LEFT JOIN warehouse w ON si.warehouse_id = w.id
      ${where}
      ORDER BY m.category, m.material_name
    `, params);

    // 汇总
    const summaryResult = await db.query(`
      SELECT 
        m.category,
        COUNT(*) as material_count,
        SUM(COALESCE(si.quantity, 0)) as total_quantity,
        SUM(COALESCE(si.quantity, 0) * COALESCE(m.unit_price, 0)) as total_value
      FROM material m
      LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id
      ${where}
      GROUP BY m.category
      ORDER BY m.category
    `, params);

    res.json({
      success: true,
      data: {
        list: result.rows,
        by_category: summaryResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/inventory/movement
 * 库存流水报表
 */
router.get('/inventory/movement', async (req, res, next) => {
  try {
    const { start_date, end_date, material_id, warehouse_id } = req.query;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (start_date) {
      whereClause.push(`sr.created_at >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      whereClause.push(`sr.created_at <= $${++paramCount}`);
      params.push(end_date);
    }
    if (material_id) {
      whereClause.push(`sr.material_id = $${++paramCount}`);
      params.push(material_id);
    }
    if (warehouse_id) {
      whereClause.push(`sr.warehouse_id = $${++paramCount}`);
      params.push(warehouse_id);
    }

    const result = await db.query(`
      SELECT * FROM (
        SELECT 
          'in' as type,
          sr.id,
          sr.material_id,
          sr.in_quantity as quantity,
          sr.created_at,
          m.material_name,
          m.material_code,
          w.warehouse_name,
          sr.biz_type,
          sr.remark as ref_name
        FROM stock_record sr
        LEFT JOIN material m ON sr.material_id = m.id
        LEFT JOIN warehouse w ON sr.warehouse_id = w.id
        WHERE sr.biz_type = 'stock_in'
          AND ${whereClause.join(' AND ')}
        
        UNION ALL
        
        SELECT 
          'out' as type,
          sr.id,
          sr.material_id,
          sr.out_quantity as quantity,
          sr.created_at,
          m.material_name,
          m.material_code,
          w.warehouse_name,
          sr.biz_type,
          sr.remark as ref_name
        FROM stock_record sr
        LEFT JOIN material m ON sr.material_id = m.id
        LEFT JOIN warehouse w ON sr.warehouse_id = w.id
        WHERE sr.biz_type = 'stock_out'
          AND ${whereClause.join(' AND ')}
      ) t
      ORDER BY created_at DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/finance/summary
 * 财务报表汇总
 */
router.get('/finance/summary', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await db.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN flow_type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN flow_type = 'expense' THEN amount ELSE 0 END) as expense,
        SUM(CASE WHEN flow_type = 'income' THEN amount ELSE -amount END) as net
      FROM fund_flow
      WHERE created_at BETWEEN COALESCE($1, CURRENT_DATE - INTERVAL '30 days')
                           AND COALESCE($2, CURRENT_DATE)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [start_date, end_date]);

    // 总计
    const totalResult = await db.query(`
      SELECT 
        SUM(CASE WHEN flow_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN flow_type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM fund_flow
      WHERE created_at BETWEEN COALESCE($1, CURRENT_DATE - INTERVAL '30 days')
                           AND COALESCE($2, CURRENT_DATE)
    `, [start_date, end_date]);

    res.json({
      success: true,
      data: {
        daily: result.rows,
        totals: {
          income: parseFloat(totalResult.rows[0].total_income || 0),
          expense: parseFloat(totalResult.rows[0].total_expense || 0),
          net: parseFloat(totalResult.rows[0].total_income || 0) - 
               parseFloat(totalResult.rows[0].total_expense || 0)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/finance/receivable-aging
 * 应收账款账龄分析
 */
router.get('/finance/receivable-aging', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        r.dealer_id,
        d.dealer_name,
        SUM(r.total_amount) as total_amount,
        SUM(r.paid_amount) as paid_amount,
        SUM(r.total_amount - r.paid_amount) as balance,
        MIN(r.due_date) as earliest_due,
        MAX(r.due_date) as latest_due,
        CASE 
          WHEN MAX(r.due_date) < CURRENT_DATE - INTERVAL '90 days' THEN 'overdue_90'
          WHEN MAX(r.due_date) < CURRENT_DATE - INTERVAL '60 days' THEN 'overdue_60'
          WHEN MAX(r.due_date) < CURRENT_DATE - INTERVAL '30 days' THEN 'overdue_30'
          WHEN MAX(r.due_date) < CURRENT_DATE THEN 'overdue'
          ELSE 'not_due'
        END as aging_status
      FROM receivable r
      LEFT JOIN dealer d ON r.dealer_id = d.id
      WHERE r.status != 'paid'
      GROUP BY r.dealer_id, d.dealer_name
      ORDER BY balance DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/employee/attendance
 * 员工考勤报表
 */
router.get('/employee/attendance', async (req, res, next) => {
  try {
    const { start_date, end_date, dept_id } = req.query;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (start_date) {
      whereClause.push(`ar.record_date >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      whereClause.push(`ar.record_date <= $${++paramCount}`);
      params.push(end_date);
    }
    if (dept_id) {
      whereClause.push(`e.dept_id = $${++paramCount}`);
      params.push(dept_id);
    }

    const result = await db.query(`
      SELECT 
        e.id as employee_id,
        e.employee_name,
        e.employee_no,
        d.dept_name,
        COUNT(ar.id) as work_days,
        COUNT(ar.id) FILTER (WHERE ar.status = 'normal') as normal_days,
        COUNT(ar.id) FILTER (WHERE ar.status = 'late') as late_days,
        COUNT(ar.id) FILTER (WHERE ar.status = 'absent') as absent_days,
        COUNT(ar.id) FILTER (WHERE ar.status = 'leave') as leave_days,
        SUM(ar.working_hours) as total_hours,
        AVG(ar.working_hours) as avg_hours
      FROM employee e
      LEFT JOIN department d ON e.dept_id = d.id
      LEFT JOIN attendance_record ar ON e.id = ar.employee_id
      WHERE ${whereClause.join(' AND ')}
      GROUP BY e.id, e.employee_name, e.employee_no, d.dept_name
      ORDER BY d.dept_name, e.employee_no
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/production/scheduling
 * 智能排程统计（转发到 production.js 的 stats 端点数据）
 */
router.get('/production/scheduling', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        ps.schedule_date,
        COUNT(DISTINCT ps.order_id) as order_count,
        SUM(ps.estimated_hours) as total_hours,
        COUNT(DISTINCT ps.order_id) FILTER (WHERE ps.status = 'completed') as completed_count,
        om.priority
      FROM production_schedule ps
      JOIN order_master om ON om.id = ps.order_id
      WHERE ps.schedule_date >= CURRENT_DATE - INTERVAL '7 days'
        AND ps.schedule_date <= CURRENT_DATE + INTERVAL '30 days'
      GROUP BY ps.schedule_date, om.priority
      ORDER BY ps.schedule_date
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * GET /api/reports/production/stages
 * 生产阶段统计（所有阶段及当前状态分布）
 */
router.get('/production/stages', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        ot.current_stage,
        ot.stage_name,
        COUNT(DISTINCT ot.order_id) as order_count,
        COUNT(cb.id) as board_count,
        COUNT(cb.id) FILTER (WHERE cb.status = 'scanned') as scanned_count
      FROM order_tracking ot
      LEFT JOIN cabinet_board cb ON cb.order_id = ot.order_id
      GROUP BY ot.current_stage, ot.stage_name
      ORDER BY MIN(ot.created_at)
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

/**
 * GET /api/reports/sales/summary
 * 销售汇总报表
 */
router.get('/sales/summary', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const params = [];
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = ' WHERE created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }
    const result = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_amount,
        SUM(balance_amount) as balance_amount
      FROM order_master
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);
    const totalResult = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_amount,
        SUM(total_amount - balance_amount) as total_paid,
        SUM(balance_amount) as total_balance
      FROM order_master
      ${dateFilter}
    `, params);
    res.json({
      success: true,
      data: {
        daily: result.rows,
        totals: {
          order_count: parseInt(totalResult.rows[0].total_orders || 0),
          total_amount: parseFloat(totalResult.rows[0].total_amount || 0),
          total_paid: parseFloat(totalResult.rows[0].total_paid || 0),
          total_balance: parseFloat(totalResult.rows[0].total_balance || 0)
        }
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/reports/employee/performance
 * 员工业绩报表
 * 按员工统计：完成订单数、产出板件数、工时、质量合格率
 */
router.get('/employee/performance', async (req, res, next) => {
  try {
    const { start_date, end_date, dept_id, page = 1, page_size = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);

    let where = ['1=1'];
    let params = [];
    let p = 0;

    if (start_date) { where.push(`DATE(ot.created_at) >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`DATE(ot.created_at) <= $${++p}`); params.push(end_date); }
    if (dept_id) { where.push(`e.dept_id = $${++p}`); params.push(dept_id); }

    const whereSql = where.join(' AND ');

    const result = await db.query(
      `SELECT
         e.id as employee_id,
         e.employee_name,
         e.employee_no,
         COALESCE(d.dept_name, '未分配') as dept_name,
         COUNT(DISTINCT ot.order_id) as completed_orders,
         COUNT(ot.id) as stage_operations,
         SUM(EXTRACT(EPOCH FROM (COALESCE(ot.completed_at, NOW()) - ot.started_at))/3600) as total_hours,
         ROUND(
           COUNT(ot.id) FILTER (WHERE ot.stage_status = 'completed') * 100.0 /
           NULLIF(COUNT(ot.id), 0), 1
         ) as completion_rate,
         COALESCE(
           (SELECT COUNT(*) FROM cabinet_board cb2
            JOIN order_tracking ot2 ON cb2.order_id = ot2.order_id
            WHERE ot2.operator_id = e.id AND DATE(ot2.completed_at) BETWEEN ${start_date ? '$'+(params.indexOf(start_date)+1) : 'DATE_TRUNC(\'month\', CURRENT_DATE)'} AND ${end_date ? '$'+(params.indexOf(end_date)+1) : 'CURRENT_DATE'}), 0
         ) as board_output
       FROM employee e
       LEFT JOIN department d ON e.dept_id = d.id
       LEFT JOIN order_tracking ot ON e.id = ot.operator_id AND ot.operator_id IS NOT NULL
       WHERE ${whereSql}
       GROUP BY e.id, e.employee_name, e.employee_no, d.dept_name
       ORDER BY completed_orders DESC, e.employee_name
       LIMIT $${++p} OFFSET $${++p}`,
      [...params, parseInt(page_size), offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM employee e LEFT JOIN department d ON e.dept_id = d.id WHERE ${whereSql}`,
      params
    );

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/reports/employee/production
 * 员工生产统计（每日产出）
 */
router.get('/employee/production', async (req, res, next) => {
  try {
    const { start_date, end_date, employee_id } = req.query;
    const start = start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end = end_date || new Date().toISOString().slice(0, 10);

    let where = ['DATE(ot.created_at) BETWEEN $1 AND $2'];
    let params = [start, end];
    if (employee_id) { where.push(`ot.operator_id = $3`); params.push(employee_id); }

    const result = await db.query(
      `SELECT
         DATE(ot.created_at) as work_date,
         e.employee_name,
         e.employee_no,
         ps.stage_name,
         COUNT(DISTINCT ot.order_id) as orders_handled,
         COUNT(ot.id) as operations,
         ROUND(
           COUNT(ot.id) FILTER (WHERE ot.stage_status='completed') * 100.0 /
           NULLIF(COUNT(ot.id), 0), 1
         ) as completion_rate
       FROM order_tracking ot
       JOIN employee e ON ot.operator_id = e.id
       JOIN production_stage ps ON ot.current_stage = ps.stage
       WHERE ${where.join(' AND ')}
       GROUP BY DATE(ot.created_at), e.employee_name, e.employee_no, ps.stage_name
       ORDER BY work_date DESC, e.employee_name`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
