/**
 * 智能生产排程服务
 *
 * 算法思路：
 * 1. 收集所有未排程的订单
 * 2. 按紧迫度（交期 + 优先级）排序
 * 3. 每日产能有限，按阶段预估工时分配到工作日
 * 4. 考虑工作日历、产能百分比
 */
const db = require('../db');
const logger = require('../utils/logger');

function generateScheduleNo() {
  return 'SCH' + Date.now() + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

/**
 * 生成排程（针对单个或批量订单）
 * @param {string[]} orderIds - 订单ID列表，不传则排所有未排程订单
 */
async function generateSchedule(orderIds) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 获取未完成且未排程的订单
    let query = `
      SELECT om.id, om.order_no, om.expected_delivery, om.priority,
             om.estimated_hours, om.order_status,
             d.dealer_name
      FROM order_master om
      LEFT JOIN dealer d ON om.dealer_id = d.id
      WHERE om.order_status IN ('pending','producing')
        AND (om.schedule_status IS NULL OR om.schedule_status = 'unscheduled')
    `;
    const params = [];
    if (orderIds?.length) {
      query += ` AND om.id = ANY($1)`;
      params.push(orderIds);
    }
    query += ` ORDER BY om.expected_delivery ASC NULLS LAST, om.priority ASC`;

    const orders = await client.query(query, params);
    if (!orders.rows.length) {
      await client.query('COMMIT');
      return { scheduled: 0, message: '没有需要排程的订单' };
    }

    // 获取所有阶段定义（按顺序）
    const stages = await client.query(
      `SELECT stage, stage_name, stage_order, estimated_hours
       FROM production_stage WHERE estimated_hours > 0 ORDER BY stage_order`
    );

    // 获取当前阶段 for each order
    const orderStages = {};
    for (const order of orders.rows) {
      const tracking = await client.query(
        `SELECT current_stage FROM order_tracking
         WHERE order_id=$1 AND stage_status='in_progress' ORDER BY created_at DESC LIMIT 1`,
        [order.id]
      );
      orderStages[order.id] = tracking.rows[0]?.current_stage || 'order_confirmed';
    }

    // 获取未来工作日（未来60天，排除休息日）
    const workdays = await client.query(`
      SELECT work_date, capacity_pct FROM production_calendar
      WHERE work_date >= CURRENT_DATE
        AND work_date <= CURRENT_DATE + INTERVAL '60 days'
        AND capacity_pct > 0
      ORDER BY work_date
    `);
    const workdayList = workdays.rows; // [{work_date, capacity_pct}]

    // 每日产能（小时），默认8小时工作制 * 产能百分比
    const DAILY_HOURS = 8;
    const capacityMap = {};
    for (const w of workdayList) {
      const dateStr = w.work_date instanceof Date
        ? w.work_date.toISOString().slice(0, 10)
        : String(w.work_date).slice(0, 10);
      capacityMap[dateStr] = DAILY_HOURS * (w.capacity_pct / 100);
    }

    // 阶段工时（从 production_stage 读取）
    const stageHours = {};
    for (const s of stages.rows) {
      stageHours[s.stage] = parseFloat(s.estimated_hours || 4);
    }

    let scheduledCount = 0;
    let workdayIdx = 0;

    for (const order of orders.rows) {
      // 计算剩余阶段及总工时
      const currentStage = orderStages[order.id];
      const remainingStages = stages.rows.filter(s => s.stage_order >= stages.rows.find(x => x.stage === currentStage)?.stage_order);

      let totalHours = remainingStages.reduce((sum, s) => sum + (stageHours[s.stage] || 4), 0);
      // 如果已有预估工时，用它
      if (order.estimated_hours) {
        totalHours = parseFloat(order.estimated_hours);
      }

      // 计算需要的工作天数
      const requiredDays = Math.ceil(totalHours / DAILY_HOURS);

      // 交期紧迫度
      const deliveryDate = order.expected_delivery ? new Date(order.expected_delivery) : null;
      const daysLeft = deliveryDate
        ? Math.ceil((deliveryDate - new Date()) / (1000 * 60 * 60 * 24))
        : 999;
      const urgencyScore = daysLeft < 7 ? 1000 : (10 - (order.priority || 5)) * 10;

      // 分配工作日
      let hoursLeft = totalHours;
      let lastWorkday = null;

      for (let i = 0; i < requiredDays && workdayIdx < workdayList.length; i++) {
        const workday = workdayList[workdayIdx];
        const dateStr = workday.work_date instanceof Date
          ? workday.work_date.toISOString().slice(0, 10)
          : String(workday.work_date).slice(0, 10);

        const availHours = capacityMap[dateStr] || DAILY_HOURS;
        lastWorkday = dateStr;

        // 分配每个阶段
        for (const stageDef of remainingStages) {
          const stageH = stageHours[stageDef.stage] || 4;
          if (hoursLeft <= 0) break;

          const assignHours = Math.min(stageH, hoursLeft);

          // 查是否已有排程记录
          const exist = await client.query(
            `SELECT id FROM production_schedule WHERE order_id=$1 AND stage=$2`,
            [order.id, stageDef.stage]
          );
          if (!exist.rows.length) {
            await client.query(
              `INSERT INTO production_schedule
                 (schedule_no, order_id, stage, schedule_date, estimated_hours, status)
               VALUES ($1, $2, $3, $4, $5, 'scheduled')`,
              [generateScheduleNo(), order.id, stageDef.stage, dateStr, assignHours]
            );
          }
          hoursLeft -= assignHours;
        }

        workdayIdx++;
      }

      // 更新订单排程状态
      await client.query(
        `UPDATE order_master SET schedule_status='scheduled' WHERE id=$1`,
        [order.id]
      );

      scheduledCount++;
      logger.info(`排程完成: ${order.order_no} 剩余工时=${totalHours}h 最早开始=${lastWorkday} 紧迫度=${urgencyScore}`);
    }

    await client.query('COMMIT');
    logger.info(`排程完成: 共处理 ${scheduledCount} 个订单`);
    return { scheduled: scheduledCount };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 获取订单排程详情
 */
async function getSchedule(orderId) {
  const schedule = await db.query(
    `SELECT ps.*, om.order_no, om.expected_delivery
     FROM production_schedule ps
     JOIN order_master om ON ps.order_id = om.id
     WHERE ps.order_id = $1
     ORDER BY ps.scheduled_date, ps.stage`,
    [orderId]
  );
  return schedule.rows;
}

/**
 * 获取日历视图（某日期范围内的每日排程）
 */
async function getCalendarView(startDate, endDate) {
  const result = await db.query(
    `SELECT
       ps.scheduled_date,
       ps.stage,
       ps.estimated_hours,
       ps.status,
       om.order_no,
       om.priority,
       om.expected_delivery,
       ps.stage as current_stage
     FROM production_schedule ps
     JOIN order_master om ON ps.order_id = om.id
     WHERE ps.scheduled_date BETWEEN $1 AND $2
     ORDER BY ps.scheduled_date, om.priority, om.expected_delivery`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * 获取排程统计（每日总工时）
 */
async function getScheduleStats(startDate, endDate) {
  const result = await db.query(
    `SELECT
       ps.scheduled_date,
       SUM(ps.estimated_hours) as total_hours,
       COUNT(DISTINCT ps.order_id) as order_count,
       COUNT(DISTINCT ps.stage) as stage_count
     FROM production_schedule ps
     WHERE ps.scheduled_date BETWEEN $1 AND $2
     GROUP BY ps.scheduled_date
     ORDER BY ps.scheduled_date`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * 调整排程（重新分配工人/日期）
 */
async function reschedule(scheduleId, { workerId, workerName, scheduledDate }) {
  const fields = [];
  const vals = [];
  let p = 0;
  if (workerId !== undefined) { fields.push(`worker_id=$${++p}`); vals.push(workerId); }
  if (workerName !== undefined) { fields.push(`worker_name=$${++p}`); vals.push(workerName); }
  if (scheduledDate !== undefined) { fields.push(`scheduled_date=$${++p}`); vals.push(scheduledDate); }
  if (!fields.length) return;

  vals.push(scheduleId);
  await db.query(
    `UPDATE production_schedule SET ${fields.join(', ')} WHERE id=$${p + 1}`,
    vals
  );
}

/**
 * 将订单加入排程队列（标记为待排程）
 * 新订单创建或提交时调用，自动设置 schedule_status = 'unscheduled'
 * @param {string} orderId
 */
async function enqueue(orderId) {
  const result = await db.query(
    `UPDATE order_master
     SET schedule_status = 'unscheduled',
         updated_at = NOW()
     WHERE id = $1
       AND (schedule_status IS NULL OR schedule_status = 'unscheduled')
       AND order_status IN ('draft','pending')
     RETURNING id, order_no, schedule_status`,
    [orderId]
  );
  if (result.rows.length) {
    logger.info(`订单 ${result.rows[0].order_no} 已加入排程队列`);
  }
  return result.rows[0] || null;
}

module.exports = { generateSchedule, getSchedule, getCalendarView, getScheduleStats, enqueue };
