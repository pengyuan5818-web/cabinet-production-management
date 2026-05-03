/**
 * 仪表盘路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/dashboard/summary
 * 仪表盘汇总数据
 */
router.get('/summary', async (req, res, next) => {
  try {
    // 今日数据
    const today = new Date().toISOString().slice(0, 10);

    const [
      orderStats,
      customerStats,
      productionStats,
      todayOrders,
      pendingTasks,
      recentOrders
    ] = await Promise.all([
      // 订单统计
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE order_status = 'producing') as producing,
          COUNT(*) FILTER (WHERE order_status = 'completed') as completed,
          SUM(total_amount) as total_amount,
          SUM(balance_amount) as total_pending
        FROM order_master
      `),
      
      // 客户统计
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'new') as new_count,
          COUNT(*) FILTER (WHERE status = 'following') as following,
          COUNT(*) FILTER (WHERE status = 'ordered') as ordered
        FROM customer
      `),
      
      // 生产统计
      db.query(`
        SELECT COUNT(*) as total_tasks,
               COUNT(*) FILTER (WHERE stage_status = 'pending') as pending,
               COUNT(*) FILTER (WHERE stage_status = 'in_progress') as in_progress,
               COUNT(*) FILTER (WHERE stage_status = 'completed') as completed
        FROM order_tracking
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      `),
      
      // 今日新增订单
      db.query(`
        SELECT COUNT(*) as count, SUM(total_amount) as amount
        FROM order_master
        WHERE DATE(created_at) = CURRENT_DATE
      `),
      
      // 待处理任务
      db.query(`
        SELECT COUNT(*) as count
        FROM order_tracking
        WHERE stage_status = 'pending'
      `),
      
      // 最近订单
      db.query(`
        SELECT om.id, om.order_no, om.order_status, om.total_amount, om.created_at,
               c.customer_name, d.dealer_name
        FROM order_master om
        LEFT JOIN customer c ON om.customer_id = c.id
        LEFT JOIN dealer d ON om.dealer_id = d.id
        ORDER BY om.created_at DESC
        LIMIT 10
      `)
    ]);

    res.json({
      success: true,
      data: {
        orders: {
          total: parseInt(orderStats.rows[0].total),
          producing: parseInt(orderStats.rows[0].producing),
          completed: parseInt(orderStats.rows[0].completed),
          total_amount: parseFloat(orderStats.rows[0].total_amount || 0),
          total_pending: parseFloat(orderStats.rows[0].total_pending || 0)
        },
        customers: {
          total: parseInt(customerStats.rows[0].total),
          new_count: parseInt(customerStats.rows[0].new_count),
          following: parseInt(customerStats.rows[0].following),
          ordered: parseInt(customerStats.rows[0].ordered)
        },
        production: {
          total_tasks: parseInt(productionStats.rows[0].total_tasks),
          pending: parseInt(productionStats.rows[0].pending),
          in_progress: parseInt(productionStats.rows[0].in_progress),
          completed: parseInt(productionStats.rows[0].completed)
        },
        today: {
          new_orders: parseInt(todayOrders.rows[0].count),
          new_amount: parseFloat(todayOrders.rows[0].amount || 0)
        },
        pending_tasks: parseInt(pendingTasks.rows[0].count),
        recent_orders: recentOrders.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/production-progress
 * 生产进度统计
 */
router.get('/production-progress', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        ot.current_stage,
        ot.stage_name,
        COUNT(*) as order_count,
        AVG(EXTRACT(EPOCH FROM (ot.completed_at - ot.started_at)) / 3600) as avg_hours
      FROM order_tracking ot
      WHERE ot.stage_status = 'completed'
        AND ot.completed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY ot.current_stage, ot.stage_name
      ORDER BY MIN(ot.created_at)
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
 * GET /api/dashboard/order-trend
 * 订单趋势（最近30天）
 */
router.get('/order-trend', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as amount
      FROM order_master
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
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
 * GET /api/dashboard/orders
 * 仪表盘订单统计数据
 */
router.get('/orders', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE order_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE order_status = 'producing') as producing,
        COUNT(*) FILTER (WHERE order_status = 'quality_check') as quality_check,
        COUNT(*) FILTER (WHERE order_status = 'packed') as packed,
        COUNT(*) FILTER (WHERE order_status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE order_status = 'installed') as installed,
        COUNT(*) FILTER (WHERE order_status = 'completed') as completed,
        SUM(total_amount) as total_amount,
        SUM(balance_amount) as total_pending
      FROM order_master
    `);

    res.json({
      success: true,
      data: {
        total: parseInt(result.rows[0].total),
        pending: parseInt(result.rows[0].pending),
        producing: parseInt(result.rows[0].producing),
        quality_check: parseInt(result.rows[0].quality_check),
        packed: parseInt(result.rows[0].packed),
        shipped: parseInt(result.rows[0].shipped),
        installed: parseInt(result.rows[0].installed),
        completed: parseInt(result.rows[0].completed),
        total_amount: parseFloat(result.rows[0].total_amount || 0),
        total_pending: parseFloat(result.rows[0].total_pending || 0)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/production
 * 仪表盘生产统计数据
 */
router.get('/production', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE stage_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE stage_status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE stage_status = 'completed') as completed
      FROM order_tracking
    `);

    res.json({
      success: true,
      data: {
        total_tasks: parseInt(result.rows[0].total_tasks),
        pending: parseInt(result.rows[0].pending),
        in_progress: parseInt(result.rows[0].in_progress),
        completed: parseInt(result.rows[0].completed)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
