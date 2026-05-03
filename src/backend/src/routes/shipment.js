/**
 * 发货出库路由
 * 功能: 订单发货、扫码出库、发货记录查询
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/shipment/orders
 * 可发货的订单列表
 * 条件: order_status = 'completed' 或 'producing', 且有板件在库
 */
// 货品列表（根路径兼容）
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status } = req.query;
    const offset = (page - 1) * page_size;
    let where = ['1=1'];
    let params = [];
    let idx = 1;
    if (status) { where.push(`s.status = $${idx++}`); params.push(status); }
    const whereSql = where.join(' AND ');
    const count = await db.query(`SELECT COUNT(*) FROM shipment s WHERE ${whereSql}`, params);
    const rows = await db.query(
      `SELECT s.*, o.order_no FROM shipment s LEFT JOIN order_master o ON s.order_id = o.id WHERE ${whereSql} ORDER BY s.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(page_size), offset]
    );
    res.json({ success: true, data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) });
  } catch (err) { next(err); }
});

router.get('/list', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status } = req.query;
    const offset = (page - 1) * page_size;
    let where = ['1=1'];
    let params = [];
    let idx = 1;
    if (status) { where.push(`s.status = $${idx++}`); params.push(status); }
    const whereSql = where.join(' AND ');
    const count = await db.query(`SELECT COUNT(*) FROM shipment s WHERE ${whereSql}`, params);
    const rows = await db.query(
      `SELECT s.*, o.order_no FROM shipment s LEFT JOIN order_master o ON s.order_id = o.id WHERE ${whereSql} ORDER BY s.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(page_size), offset]
    );
    res.json({ success: true, data: rows.rows, total: parseInt(count.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) });
  } catch (err) { next(err); }
});

router.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, order_no, customer_name } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = `WHERE om.order_status IN ('completed', 'producing')`;
    const params = [];
    let p = 0;

    if (order_no) {
      p++;
      whereClause += ` AND om.order_no ILIKE $${p}`;
      params.push(`%${order_no}%`);
    }
    if (customer_name) {
      p++;
      whereClause += ` AND c.customer_name ILIKE $${p}`;
      params.push(`%${customer_name}%`);
    }

    // 子查询: 板件统计
    const boardStatsSql = `
      SELECT
        cb.order_id,
        COUNT(*) AS total_boards,
        COUNT(CASE WHEN cb.current_location NOT IN ('已发货', '已出库') AND cb.current_location IS NOT NULL THEN 1 END) AS in_stock_boards,
        COUNT(CASE WHEN cb.current_location IN ('已发货', '已出库') OR cb.current_location IS NULL THEN 1 END) AS shipped_or_missing
      FROM cabinet_board cb
      GROUP BY cb.order_id
    `;

    // 使用 LATERAL 子查询解决 GROUP BY 问题
    const sql = `
      SELECT
        om.id AS order_id,
        om.order_no,
        om.order_status,
        om.created_at,
        c.id AS customer_id,
        c.customer_name,
        COALESCE(bs.total_boards, 0) AS total_boards,
        COALESCE(bs.in_stock_boards, 0) AS in_stock_boards,
        COALESCE(bs.shipped_or_missing, 0) AS missing_boards
      FROM order_master om
      LEFT JOIN customer c ON om.customer_id = c.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS total_boards,
          COUNT(CASE WHEN cb.current_location NOT IN ('已发货', '已出库') AND cb.current_location IS NOT NULL THEN 1 END) AS in_stock_boards,
          COUNT(CASE WHEN cb.current_location IN ('已发货', '已出库') OR cb.current_location IS NULL THEN 1 END) AS shipped_or_missing
        FROM cabinet_board cb
        WHERE cb.order_id = om.id
      ) bs ON true
      ${whereClause}
      AND COALESCE(bs.in_stock_boards, 0) > 0
      ORDER BY om.created_at DESC
      LIMIT $${++p} OFFSET $${++p}
    `;
    params.push(Number(page_size), offset);

    const result = await db.query(sql, params);

    // 总数 - 使用子查询而非直接修改 params
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT om.id
        FROM order_master om
        LEFT JOIN customer c ON om.customer_id = c.id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(CASE WHEN cb.current_location NOT IN ('已发货', '已出库') AND cb.current_location IS NOT NULL THEN 1 END) AS in_stock_boards
          FROM cabinet_board cb
          WHERE cb.order_id = om.id
        ) bs ON true
        ${whereClause}
        AND COALESCE(bs.in_stock_boards, 0) > 0
      ) t
    `;
    const countParams = params.slice(0, -2); // remove limit/offset
    const countResult = await db.query(countSql, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: Number(countResult.rows[0]?.total || 0),
      page: Number(page),
      page_size: Number(page_size)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/shipment/order-boards/:orderId
 * 订单板件发货状态
 */
router.get('/order-boards/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const sql = `
      SELECT
        cb.id AS board_id,
        cb.barcode,
        cb.board_name,
        (cb.length || 'x' || cb.width || 'x' || cb.thickness) AS board_spec,
        cb.current_location AS location_code,
        CASE
          WHEN cb.current_location = '已发货' THEN 'shipped'
          WHEN cb.current_location IS NULL OR cb.current_location = '' THEN 'missing'
          ELSE 'in_stock'
        END AS status, cb.length, cb.width, cb.thickness
      FROM cabinet_board cb
      WHERE cb.order_id = $1
      ORDER BY cb.board_name, cb.barcode
    `;

    const result = await db.query(sql, [orderId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/shipment
 * 批量创建发货记录
 */
router.post('/', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { order_id, operator_id, operator_name, remark } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: '缺少 order_id' });
    }

    await client.query('BEGIN');

    // 获取订单信息
    const orderResult = await client.query(
      'SELECT id, order_no, dealer_id FROM order_master WHERE id = $1',
      [order_id]
    );
    if (orderResult.rows.length === 0) {
      throw new Error('订单不存在');
    }
    const order = orderResult.rows[0];

    // 查找所有在库板件（排除已发货、已出库）
    const boardsResult = await client.query(`
      SELECT id, barcode, board_name, (length || 'x' || width || 'x' || thickness) AS board_spec, current_location
      FROM cabinet_board
      WHERE order_id = $1
        AND (current_location NOT IN ('已发货', '已出库') OR current_location IS NULL)
    `, [order_id]);

    if (boardsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({
        success: true,
        message: '没有需要发货的板件',
        shipped_count: 0
      });
    }

    // 创建 shipment 记录
    const shipmentId = uuidv4();
    await client.query(`
      INSERT INTO shipment (id, order_id, order_no, total_boards, shipped_boards, operator_id, operator_name, remark)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [shipmentId, order_id, order.order_no, boardsResult.rows.length, boardsResult.rows.length, operator_id || null, operator_name || '', remark || '']);

    // 更新板件状态 + 创建明细
    const shippedAt = new Date();
    for (const board of boardsResult.rows) {
      await client.query(
        `UPDATE cabinet_board SET current_location = '已发货' WHERE id = $1`,
        [board.id]
      );
      await client.query(`
        INSERT INTO shipment_item (id, shipment_id, board_id, barcode, board_name, board_spec, location_code, shipped_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [uuidv4(), shipmentId, board.id, board.barcode, board.board_name, (board.length || 'x' || board.width || 'x' || board.thickness), board.current_location || '', shippedAt]);
    }

    await client.query('COMMIT');

    logger.info(`批量发货成功: order=${order.order_no}, count=${boardsResult.rows.length}`);

    // Webhook：通知经销商已发货
    if (order.dealer_id) {
      require('../services/webhookService').trigger(order.dealer_id, 'order.shipped', {
        order_no: order.order_no,
        shipment_id: shipmentId,
        shipped_count: boardsResult.rows.length,
        operator: operator_name || 'system'
      }).catch(err => logger.error('Webhook shipped trigger error:', err));
    }

    res.json({
      success: true,
      message: `成功发货 ${boardsResult.rows.length} 件板件`,
      data: {
        shipment_id: shipmentId,
        shipped_count: boardsResult.rows.length
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /api/shipment/scan
 * 扫码出库（逐件）
 */
router.post('/scan', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { barcode, order_id, operator_id, operator_name } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: '缺少条码' });
    }

    // 支持 ORDER:xxx 前缀（扫描订单二维码）
    let actualBarcode = barcode;
    if (barcode.startsWith('ORDER:')) {
      // 查找该订单的所有板件条码
      const orderBoardResult = await client.query(
        'SELECT barcode FROM cabinet_board WHERE order_id = $1 LIMIT 1',
        [order_id]
      );
      if (orderBoardResult.rows.length > 0) {
        actualBarcode = orderBoardResult.rows[0].barcode;
      }
    }

    await client.query('BEGIN');

    // 查找板件
    const boardResult = await client.query(`
      SELECT id, barcode, board_name, (length || 'x' || width || 'x' || thickness) AS board_spec, current_location, order_id
      FROM cabinet_board
      WHERE barcode = $1
    `, [actualBarcode]);

    if (boardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '板件不存在' });
    }

    const board = boardResult.rows[0];

    // 校验板件属于指定订单
    if (order_id && board.order_id !== order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: '该板件不属于当前订单' });
    }

    // 检查是否已发货
    if (board.current_location === '已发货') {
      await client.query('ROLLBACK');
      return res.json({
        success: true,
        message: '该板件已发货',
        already_shipped: true,
        data: board
      });
    }

    const shippedAt = new Date();

    // 更新板件状态
    await client.query(
      `UPDATE cabinet_board SET current_location = '已发货' WHERE id = $1`,
      [board.id]
    );

    // 查找或创建 shipment 记录
    let shipmentResult = await client.query(
      `SELECT id FROM shipment WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [board.order_id]
    );

    let shipmentId;
    if (shipmentResult.rows.length > 0) {
      shipmentId = shipmentResult.rows[0].id;
      await client.query(
        `UPDATE shipment SET shipped_boards = shipped_boards + 1 WHERE id = $1`,
        [shipmentId]
      );
    } else {
      // 创建新 shipment
      const orderResult = await client.query(
        'SELECT order_no FROM order_master WHERE id = $1',
        [board.order_id]
      );
      shipmentId = uuidv4();
      await client.query(`
        INSERT INTO shipment (id, order_id, order_no, total_boards, shipped_boards, operator_id, operator_name)
        VALUES ($1, $2, $3, 1, 1, $4, $5)
      `, [shipmentId, board.order_id, orderResult.rows[0]?.order_no || '', operator_id || null, operator_name || '']);
    }

    // 创建 shipment_item
    await client.query(`
      INSERT INTO shipment_item (id, shipment_id, board_id, barcode, board_name, board_spec, location_code, shipped_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [uuidv4(), shipmentId, board.id, board.barcode, board.board_name, (board.length || 'x' || board.width || 'x' || board.thickness), board.current_location || '', shippedAt]);

    await client.query('COMMIT');

    logger.info(`扫码发货: barcode=${board.barcode}, board_name=${board.board_name}`);

    res.json({
      success: true,
      message: '发货成功',
      already_shipped: false,
      data: {
        board_id: board.id,
        barcode: board.barcode,
        board_name: board.board_name,
        board_spec: (board.length || 'x' || board.width || 'x' || board.thickness),
        shipment_id: shipmentId
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/shipment/:orderId
 * 订单发货记录
 */
router.get('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }

    // 发货记录
    const shipmentResult = await db.query(`
      SELECT id, total_boards, shipped_boards, operator_name, shipped_at, remark, created_at
      FROM shipment
      WHERE order_id = $1
      ORDER BY created_at DESC
    `, [orderId]);

    // 查找每个 shipment 的明细
    const shipments = [];
    for (const s of shipmentResult.rows) {
      const itemsResult = await db.query(`
        SELECT id, board_id, barcode, board_name, board_spec, location_code, shipped_at
        FROM shipment_item
        WHERE shipment_id = $1
        ORDER BY shipped_at
      `, [s.id]);
      shipments.push({ ...s, items: itemsResult.rows });
    }

    res.json({
      success: true,
      data: shipments
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
