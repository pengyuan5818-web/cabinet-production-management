/**
 * 订单分拣路由
 * 功能: 分拣任务管理、板件扫码入库
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * 初始化表（幂等）
 */
async function ensureTables() {
  const sqlPath = path.join(__dirname, '../db/sort_ddl.sql');
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    try { await db.query(sql); } catch (e) { /* 表可能已存在 */ }
  }
}
ensureTables();

/**
 * 智能库位推荐算法
 * 查询 warehouse_location 表，找 zone='sort'（分拣区）的空闲库位
 * 格式: {warehouse_code}-{location_row}-{订单号后6位}
 */
async function suggestLocation(orderNo) {
  // 查找分拣区空闲库位
  const locResult = await db.query(
    `SELECT wl.location_code, w.warehouse_code, w.warehouse_name
     FROM warehouse_location wl
     JOIN warehouse w ON wl.warehouse_id = w.id
     WHERE wl.zone = 'sort' AND (wl.status IS NULL OR wl.status = 'available')
     ORDER BY wl.location_code
     LIMIT 1`
  );

  if (locResult.rows.length > 0) {
    const { warehouse_code, warehouse_name } = locResult.rows[0];
    const suffix = orderNo.slice(-10).replace(/[^A-Z0-9]/g, '');
    return `${warehouse_code}-SORT-${suffix}`;
  }

  // 没有专门的sort区，找任何空闲库位
  const anyLoc = await db.query(
    `SELECT wl.location_code, w.warehouse_code
     FROM warehouse_location wl
     JOIN warehouse w ON wl.warehouse_id = w.id
     WHERE wl.status IS NULL OR wl.status = 'available'
     ORDER BY wl.location_code
     LIMIT 1`
  );

  if (anyLoc.rows.length > 0) {
    const { warehouse_code } = anyLoc.rows[0];
    const suffix = orderNo.slice(-10).replace(/[^A-Z0-9]/g, '');
    return `${warehouse_code}-SORT-${suffix}`;
  }

  // 兜底：直接用订单号生成
  return `WH01-SORT-${orderNo.slice(-10).replace(/[^A-Z0-9]/g, '')}`;
}

/**
 * 自动创建分拣任务（供其他路由调用）
 */
async function autoCreateSortTask(orderId, orderNo) {
  // 检查是否已有 pending/in_progress 任务
  const existing = await db.query(
    `SELECT id FROM sort_task WHERE order_id = $1::uuid AND status IN ('pending', 'in_progress') LIMIT 1`,
    [orderId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  // 查找该订单所有板件
  const boards = await db.query(
    `SELECT id, barcode, board_name, current_location FROM cabinet_board WHERE order_id = $1::uuid`,
    [orderId]
  );

  if (boards.rows.length === 0) return null;

  // 推荐库位
  const locationCode = await suggestLocation(orderNo);

  // 创建分拣任务
  const taskId = uuidv4();
  await db.query(
    `INSERT INTO sort_task (id, order_id, order_no, board_count, sorted_count, status, location_code, created_at)
     VALUES ($1, $2::uuid, $3, $4, 0, 'pending', $5, NOW())`,
    [taskId, orderId, orderNo, boards.rows.length, locationCode]
  );

  // 批量创建明细
  for (const board of boards.rows) {
    await db.query(
      `INSERT INTO sort_task_item (id, sort_task_id, board_id, barcode, board_name, status, created_at)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, 'pending', NOW())`,
      [uuidv4(), taskId, board.id, board.barcode, board.board_name]
    );
  }

  logger.info(`自动创建分拣任务: order_no=${orderNo}, board_count=${boards.rows.length}, location=${locationCode}`);
  return taskId;
}

/**
 * GET /api/sort/tasks
 * 分拣任务列表
 * 参数: ?status=pending&page=1&page_size=20
 */
router.get('/tasks', async (req, res, next) => {
  try {
    const { status, page = 1, page_size = 20 } = req.query;
    const offset = (page - 1) * page_size;

    let where = '';
    const params = [];
    let p = 0;

    if (status) {
      where += ` WHERE st.status = $${++p}`;
      params.push(status);
    }

    params.push(parseInt(page_size), offset);
    const result = await db.query(
      `SELECT st.*,
              c.customer_name
       FROM sort_task st
       LEFT JOIN order_master om ON st.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       ${where}
       ORDER BY
         CASE st.status
           WHEN 'pending' THEN 1
           WHEN 'in_progress' THEN 2
           WHEN 'completed' THEN 3
         END,
         st.created_at DESC
       LIMIT $${++p} OFFSET $${++p}`,
      params
    );

    // 总数
    const countResult = await db.query(
      `SELECT COUNT(*) FROM sort_task st ${where}`,
      params.slice(0, -2)
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
 * GET /api/sort/task/:id
 * 分拣任务详情（含板件清单）
 */
router.get('/task/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的任务ID格式' });
    }

    const taskResult = await db.query(
      `SELECT st.*, c.customer_name
       FROM sort_task st
       LEFT JOIN order_master om ON st.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE st.id = $1::uuid`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '分拣任务不存在' });
    }

    const itemsResult = await db.query(
      `SELECT * FROM sort_task_item
       WHERE sort_task_id = $1::uuid
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        task: taskResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/sort/task
 * 创建分拣任务
 * body: { order_id }
 */
router.post('/task', async (req, res, next) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id 不能为空' });
    }

    // 查找订单
    const orderResult = await db.query(
      `SELECT id, order_no FROM order_master WHERE id = $1::uuid`,
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const { order_no } = orderResult.rows[0];

    // 检查是否已有
    const existing = await db.query(
      `SELECT id FROM sort_task WHERE order_id = $1::uuid AND status IN ('pending', 'in_progress') LIMIT 1`,
      [order_id]
    );
    if (existing.rows.length > 0) {
      return res.json({ success: true, message: '分拣任务已存在', data: { id: existing.rows[0].id } });
    }

    // 查找板件
    const boards = await db.query(
      `SELECT id, barcode, board_name FROM cabinet_board WHERE order_id = $1::uuid`,
      [order_id]
    );

    if (boards.rows.length === 0) {
      return res.status(400).json({ success: false, message: '该订单没有板件' });
    }

    const locationCode = await suggestLocation(order_no);
    const taskId = uuidv4();

    await db.query(
      `INSERT INTO sort_task (id, order_id, order_no, board_count, sorted_count, status, location_code, created_at)
       VALUES ($1, $2::uuid, $3, $4, 0, 'pending', $5, NOW())`,
      [taskId, order_id, order_no, boards.rows.length, locationCode]
    );

    for (const board of boards.rows) {
      await db.query(
        `INSERT INTO sort_task_item (id, sort_task_id, board_id, barcode, board_name, status, created_at)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5, 'pending', NOW())`,
        [uuidv4(), taskId, board.id, board.barcode, board.board_name]
      );
    }

    logger.info(`创建分拣任务: order_no=${order_no}, board_count=${boards.rows.length}`);

    res.json({
      success: true,
      message: '分拣任务创建成功',
      data: { id: taskId, location_code: locationCode, board_count: boards.rows.length }
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/sort/task/:id/scan
 * 扫码确认入库
 * body: { barcode, operator_id, operator_name }
 */
router.post('/task/:id/scan', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { barcode, operator_id, operator_name } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: 'barcode 不能为空' });
    }

    // 查找任务
    const taskResult = await db.query(
      `SELECT * FROM sort_task WHERE id = $1::uuid`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '分拣任务不存在' });
    }

    const task = taskResult.rows[0];

    // 查找板件明细
    const itemResult = await db.query(
      `SELECT * FROM sort_task_item
       WHERE sort_task_id = $1::uuid AND barcode = $2 AND status = 'pending'`,
      [id, barcode]
    );

    if (itemResult.rows.length === 0) {
      // 检查是否已分拣
      const sortedItem = await db.query(
        `SELECT * FROM sort_task_item
         WHERE sort_task_id = $1::uuid AND barcode = $2 AND status = 'sorted'`,
        [id, barcode]
      );
      if (sortedItem.rows.length > 0) {
        return res.json({ success: true, message: '该板件已分拣入库', data: { already_sorted: true } });
      }
      return res.status(404).json({ success: false, message: '该条码不在此分拣任务中' });
    }

    const item = itemResult.rows[0];

    // 更新明细为已分拣
    await db.query(
      `UPDATE sort_task_item
       SET status = 'sorted',
           sorted_at = NOW(),
           sorted_by = $1::uuid,
           sorted_by_name = $2,
           sorted_location = $3
       WHERE id = $4::uuid`,
      [operator_id || null, operator_name || '', task.location_code, item.id]
    );

    // 更新板件当前位置
    if (item.board_id) {
      await db.query(
        `UPDATE cabinet_board SET current_location = $1, updated_at = NOW() WHERE id = $2::uuid`,
        [task.location_code, item.board_id]
      );
    }

    // 更新任务进度
    const newSortedCount = task.sorted_count + 1;
    const newStatus = newSortedCount >= task.board_count ? 'completed' : 'in_progress';

    await db.query(
      `UPDATE sort_task
       SET sorted_count = $1, status = $2,
           ${newStatus === 'completed' ? "completed_at = NOW(), " : ""}
           assigned_to = COALESCE($3::uuid, assigned_to),
           assigned_name = COALESCE($4, assigned_name)
       WHERE id = $5::uuid`,
      [newSortedCount, newStatus, operator_id || null, operator_name || '', id]
    );

    logger.info(`分拣扫码: task=${id}, barcode=${barcode}, operator=${operator_name}, location=${task.location_code}`);

    res.json({
      success: true,
      message: newStatus === 'completed' ? '分拣完成，可发货！' : `入库成功 (${newSortedCount}/${task.board_count})`,
      data: {
        sorted_count: newSortedCount,
        board_count: task.board_count,
        status: newStatus,
        location_code: task.location_code
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/sort/order-boards/:orderId
 * 查询订单所有板件状态
 */
router.get('/order-boards/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }

    const boards = await db.query(
      `SELECT cb.id, cb.barcode, cb.board_name, cb.board_no,
              cb.material, cb.length, cb.width, cb.thickness,
              cb.current_location, cb.status as board_status,
              sti.status as sort_status, sti.sorted_at, sti.sorted_by_name,
              sti.sorted_location
       FROM cabinet_board cb
       LEFT JOIN sort_task_item sti ON cb.id = sti.board_id
       WHERE cb.order_id = $1::uuid
       ORDER BY cb.board_no, cb.barcode`,
      [orderId]
    );

    const orderResult = await db.query(
      `SELECT om.order_no, c.customer_name
       FROM order_master om
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE om.id = $1::uuid`,
      [orderId]
    );

    const sorted = boards.rows.filter(b => b.sort_status === 'sorted');
    const pending = boards.rows.filter(b => !b.sort_status || b.sort_status === 'pending');

    res.json({
      success: true,
      data: {
        order_no: orderResult.rows[0]?.order_no,
        customer_name: orderResult.rows[0]?.customer_name,
        total: boards.rows.length,
        sorted_count: sorted.length,
        pending_count: pending.length,
        boards: boards.rows
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/sort/orders
 * 可创建分拣任务的订单列表（生产已完成但未分拣的）
 */
router.get('/orders', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT om.id, om.order_no, c.customer_name,
              om.expected_delivery, om.order_status,
              COUNT(cb.id) AS board_count
       FROM order_master om
       LEFT JOIN customer c ON om.customer_id = c.id
       LEFT JOIN cabinet_board cb ON om.id = cb.order_id
       LEFT JOIN sort_task st ON om.id = st.order_id AND st.status IN ('pending', 'in_progress')
       WHERE om.order_status IN ('completed', 'producing')
         AND st.id IS NULL
       GROUP BY om.id, om.order_no, c.customer_name, om.expected_delivery, om.order_status
       HAVING COUNT(cb.id) > 0
       ORDER BY om.expected_delivery ASC NULLS LAST`
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.autoCreateSortTask = autoCreateSortTask;
