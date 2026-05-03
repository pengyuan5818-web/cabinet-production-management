/**
 * 生产追踪路由
 * 功能: 生产阶段扫码、状态更新、语音播报
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/production/stages
 * 获取所有生产阶段（从数据库读取）
 */
router.get('/stages', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT stage, stage_name, stage_order, next_stage, prev_stage, description, default_status
       FROM production_stage
       ORDER BY stage_order`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/production/track/:orderId
 * 获取订单生产追踪详情
 */
router.get('/track/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }

    // 获取订单信息
    const orderResult = await db.query(
      `SELECT om.id, om.order_no, om.order_status, om.expected_delivery,
              c.customer_name, c.phone as customer_phone
       FROM order_master om
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE om.id = $1::uuid`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // 获取该订单所有追踪记录（按创建时间排序）
    const trackingResult = await db.query(
      `SELECT ot.*, e.employee_name as operator_name
       FROM order_tracking ot
       LEFT JOIN employee e ON ot.operator_id = e.id
       WHERE ot.order_id = $1::uuid
       ORDER BY ot.created_at ASC`,
      [orderId]
    );

    // 获取所有阶段定义（用于stage_order排序）
    const stagesResult = await db.query(
      `SELECT stage, stage_name, stage_order, next_stage, prev_stage
       FROM production_stage
       ORDER BY stage_order`
    );

    // 用 tracking 记录构建 map（按 stage 分组）
    const trackingMap = {};
    trackingResult.rows.forEach(r => {
      trackingMap[r.current_stage] = r;
    });

    // 构建阶段进度列表
    const stages = stagesResult.rows.map(s => {
      const record = trackingMap[s.stage];
      return {
        stage: s.stage,
        stage_name: s.stage_name,
        stage_order: s.stage_order,
        status: record ? record.stage_status : 'pending',
        operator_name: record?.operator_name || null,
        started_at: record?.started_at || null,
        completed_at: record?.completed_at || null,
        remark: record?.stage_remark || null
      };
    });

    // 当前进行中阶段
    const inProgress = trackingResult.rows.find(r => r.stage_status === 'in_progress');
    const currentStage = inProgress?.current_stage || stages.find(s => s.status === 'pending')?.stage || null;

    res.json({
      success: true,
      data: {
        order_id: orderId,
        order_no: order.order_no,
        order_status: order.order_status,
        current_stage: currentStage,
        current_stage_name: stages.find(s => s.stage === currentStage)?.stage_name || null,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        expected_delivery: order.expected_delivery,
        stages
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/production/scan
 * 扫码更新生产阶段
 * 支持: 订单二维码扫码 or 板件条码扫码
 */
router.post('/scan', async (req, res, next) => {
  try {
    const {
      barcode,
      stage,
      operator_id,
      operator_name,
      operator_device,
      remark,
      location
    } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: '条码不能为空' });
    }

    let orderId;
    let scanType;
    let boardInfo = null;

    // ---------- 判断是订单二维码还是板件条码 ----------
    if (barcode.startsWith('ORDER:')) {
      const orderNo = barcode.replace('ORDER:', '');
      const orderResult = await db.query(
        `SELECT id, order_no, order_status FROM order_master WHERE order_no = $1 OR qr_code = $1`,
        [orderNo]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      orderId = orderResult.rows[0].id;
      scanType = 'order';
    } else {
      // 板件条码：通过 barcode 查到 cabinet_board，再 JOIN order_master
      const boardResult = await db.query(
        `SELECT cb.id, cb.order_id, cb.barcode, cb.board_no, cb.board_name,
                cb.material, cb.length, cb.width, cb.thickness,
                cb.status as board_status, cb.current_location,
                om.order_no
         FROM cabinet_board cb
         JOIN order_master om ON cb.order_id = om.id
         WHERE cb.barcode = $1`,
        [barcode]
      );

      if (boardResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: '板件不存在' });
      }

      const board = boardResult.rows[0];
      orderId = board.order_id;
      scanType = 'board';
      boardInfo = {
        board_name: board.board_name,
        material: board.material,
        length: board.length,
        width: board.width,
        thickness: board.thickness,
        current_location: board.current_location,
        board_status: board.board_status
      };

      // 更新板件当前位置
      if (location) {
        await db.query(
          `UPDATE cabinet_board SET current_location = $1, updated_at = NOW() WHERE barcode = $2`,
          [location, barcode]
        );
        boardInfo.current_location = location;
      }
    }

    // ---------- 确定目标阶段 ----------
    let targetStage = stage;

    if (!targetStage) {
      // 自动推进：找当前 in_progress 阶段，完成后自动进入 next_stage
      const inProg = await db.query(
        `SELECT current_stage FROM order_tracking
         WHERE order_id = $1::uuid AND stage_status = 'in_progress'
         ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );

      if (inProg.rows.length > 0) {
        // 有进行中阶段 -> 扫码完成该阶段，推进到下一阶段
        const currentStageValue = inProg.rows[0].current_stage;
        const stageDef = await db.query(
          `SELECT stage_name, next_stage FROM production_stage WHERE stage = $1`,
          [currentStageValue]
        );

        if (stageDef.rows.length > 0) {
          const { next_stage, stage_name } = stageDef.rows[0];

          // 将当前阶段标记为 completed
          await db.query(
            `UPDATE order_tracking
             SET stage_status = 'completed', completed_at = NOW(),
                 operator_id = COALESCE($1::uuid, operator_id),
                 operator_name = COALESCE($2, operator_name),
                 operator_device = COALESCE($3, operator_device),
                 stage_remark = COALESCE($4, stage_remark),
                 updated_at = NOW()
             WHERE order_id = $5::uuid AND stage_status = 'in_progress'`,
            [operator_id, operator_name, operator_device, remark, orderId]
          );

          // 创建下一阶段 in_progress
          if (next_stage) {
            const nextStageName = await db.query(
              `SELECT stage_name FROM production_stage WHERE stage = $1`,
              [next_stage]
            );
            const name = nextStageName.rows[0]?.stage_name || next_stage;
            // 先删除可能存在的该阶段旧记录（防止重复）
            await db.query(
              `DELETE FROM order_tracking WHERE order_id = $1::uuid AND current_stage = $2`,
              [orderId, next_stage]
            );
            await db.query(
              `INSERT INTO order_tracking (id, order_id, current_stage, stage_name, stage_status, started_at, created_at)
               VALUES ($1, $2::uuid, $3, $4, 'in_progress', NOW(), NOW())`,
              [uuidv4(), orderId, next_stage, name]
            );
            targetStage = next_stage;
          } else {
            // 所有阶段完成 → 订单完工，自动分配库位
            const locResult = await db.query(
              `UPDATE warehouse_location
               SET status = 'occupied'
               WHERE id = (
                 SELECT id FROM warehouse_location
                 WHERE warehouse_id = (SELECT id FROM warehouse WHERE warehouse_type = 'finished')
                 AND status = 'empty'
                 ORDER BY location_code
                 LIMIT 1
               )
               RETURNING id, location_code, location_name`
            );
            const loc = locResult.rows[0];
            if (loc) {
              await db.query(
                `UPDATE order_master SET order_status = 'completed', warehouse_location_id = $1, warehouse_location_name = $2, updated_at = NOW() WHERE id = $3::uuid`,
                [loc.id, loc.location_name, orderId]
              );
            } else {
              // 没有空闲库位，仍然标记完工
              await db.query(
                `UPDATE order_master SET order_status = 'completed', updated_at = NOW() WHERE id = $1::uuid`,
                [orderId]
              );
            }
          }
        }
      } else {
        // 无进行中 -> 找最后一个 completed 阶段，从其 next_stage 开始
        const lastCompleted = await db.query(
          `SELECT current_stage FROM order_tracking
           WHERE order_id = $1::uuid AND stage_status = 'completed'
           ORDER BY created_at DESC LIMIT 1`,
          [orderId]
        );
        const fromStage = lastCompleted.rows[0]?.current_stage || 'order_confirmed';
        const nextOfLast = await db.query(
          `SELECT stage, stage_name FROM production_stage WHERE stage = (
             SELECT next_stage FROM production_stage WHERE stage = $1
           )`,
          [fromStage]
        );
        if (nextOfLast.rows.length > 0) {
          targetStage = nextOfLast.rows[0].stage;
          // 删除旧记录并新建 in_progress
          await db.query(
            `DELETE FROM order_tracking WHERE order_id = $1::uuid AND current_stage = $2`,
            [orderId, targetStage]
          );
          await db.query(
            `INSERT INTO order_tracking (id, order_id, current_stage, stage_name, stage_status, started_at, created_at)
             VALUES ($1, $2::uuid, $3, $4, 'in_progress', NOW(), NOW())`,
            [uuidv4(), orderId, targetStage, nextOfLast.rows[0].stage_name]
          );
        } else {
          // 没有可推进的阶段了（可能是已完成订单）
          return res.json({
            success: true,
            message: '订单已完成，无可推进阶段',
            data: { order_id: orderId, scan_type: scanType, board_info: boardInfo }
          });
        }
      }
    } else {
      // 前端指定了 stage：直接切换到该阶段
      const stageDef = await db.query(
        `SELECT stage, stage_name, next_stage FROM production_stage WHERE stage = $1`,
        [targetStage]
      );
      if (stageDef.rows.length === 0) {
        return res.status(400).json({ success: false, message: `无效阶段: ${targetStage}` });
      }

      // 删除该阶段旧记录，新建 in_progress
      await db.query(
        `DELETE FROM order_tracking WHERE order_id = $1::uuid AND current_stage = $2`,
        [orderId, targetStage]
      );
      await db.query(
        `INSERT INTO order_tracking (id, order_id, current_stage, stage_name, stage_status, started_at, created_at)
         VALUES ($1, $2::uuid, $3, $4, 'in_progress', NOW(), NOW())`,
        [uuidv4(), orderId, targetStage, stageDef.rows[0].stage_name]
      );
    }

    // 更新订单状态
    const stageToOrderStatus = {
      producing: 'producing', quality_check: 'producing',
      packed: 'packed', shipped: 'shipped', installed: 'installed', completed: 'completed'
    };
    if (stageToOrderStatus[targetStage]) {
      await db.query(
        `UPDATE order_master SET order_status = $1, updated_at = NOW() WHERE id = $2::uuid`,
        [stageToOrderStatus[targetStage], orderId]
      );
    }

    logger.info(`生产扫码: barcode=${barcode}, type=${scanType}, stage=${targetStage}, operator=${operator_name}`);

    // 语音播报：生产阶段扫码反馈
    try {
      const { speakerService } = require('../hardware');
      let voiceMsg = '';
      if (scanType === 'order') {
        const stageResult = await db.query(
          `SELECT stage_name FROM production_stage WHERE stage = $1`,
          [targetStage]
        );
        const stageName = stageResult.rows[0]?.stage_name || targetStage;
        const orderResult2 = await db.query(
          `SELECT order_no FROM order_master WHERE id = $1`,
          [orderId]
        );
        const orderNo = orderResult2.rows[0]?.order_no || '';
        voiceMsg = `订单${orderNo}，开始${stageName}`;
      } else {
        voiceMsg = `板件${barcode}，已分拣`;
      }
      if (voiceMsg) speakerService.playVoice(voiceMsg);
    } catch (voiceErr) {
      logger.warn('语音播报失败:', voiceErr.message);
    }

    res.json({
      success: true,
      message: `已推进到阶段: ${targetStage}`,
      data: {
        order_id: orderId,
        scan_type: scanType,
        current_stage: targetStage,
        board_info: boardInfo
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/production/stage
 * 手动更新生产阶段（手动选阶段，非扫码）
 */
router.post('/stage', async (req, res, next) => {
  try {
    const { order_id, stage, stage_status, operator_id, operator_name, remark } = req.body;

    if (!order_id || !stage) {
      return res.status(400).json({ success: false, message: 'order_id 和 stage 不能为空' });
    }

    const stageDef = await db.query(
      `SELECT stage, stage_name, next_stage FROM production_stage WHERE stage = $1`,
      [stage]
    );
    if (stageDef.rows.length === 0) {
      return res.status(400).json({ success: false, message: `无效阶段: ${stage}` });
    }

    const { stage_name, next_stage } = stageDef.rows[0];

    if (stage_status === 'completed') {
      // 完成当前阶段，推进到下一阶段
      await db.query(
        `UPDATE order_tracking
         SET stage_status = 'completed', completed_at = NOW(),
             operator_id = COALESCE($1::uuid, operator_id),
             operator_name = COALESCE($2, operator_name),
             stage_remark = COALESCE($3, stage_remark),
             updated_at = NOW()
         WHERE order_id = $4::uuid AND stage_status = 'in_progress'`,
        [operator_id, operator_name, remark, order_id]
      );

      if (next_stage) {
        const nextDef = await db.query(
          `SELECT stage_name FROM production_stage WHERE stage = $1`,
          [next_stage]
        );
        await db.query(
          `DELETE FROM order_tracking WHERE order_id = $1::uuid AND current_stage = $2`,
          [order_id, next_stage]
        );
        await db.query(
          `INSERT INTO order_tracking (id, order_id, current_stage, stage_name, stage_status, started_at, created_at)
           VALUES ($1, $2::uuid, $3, $4, 'in_progress', NOW(), NOW())`,
          [uuidv4(), order_id, next_stage, nextDef.rows[0]?.stage_name || next_stage]
        );

        // 自动创建分拣任务（进入打包阶段）
        if (next_stage === 'packaging') {
          const orderInfo = await db.query(
            `SELECT order_no FROM order_master WHERE id = $1::uuid`,
            [order_id]
          );
          if (orderInfo.rows.length > 0) {
            try {
              const sortRoute = require('./sort');
              await sortRoute.autoCreateSortTask(order_id, orderInfo.rows[0].order_no);
            } catch (sortErr) {
              logger.warn(`自动创建分拣任务失败: ${sortErr.message}`);
            }
          }
        }
      } else {
        // 最后一个阶段完成 → 订单完工，自动分配成品库位
        // 查找第一个空闲库位
        const emptyLoc = await db.query(
          `SELECT id, location_name FROM warehouse_location
           WHERE status = 'empty' AND zone = 'A区'
           ORDER BY location_code LIMIT 1`
        );
        if (emptyLoc.rows.length > 0) {
          await db.query(
            `UPDATE order_master SET order_status = 'completed', actual_delivery = CURRENT_DATE,
             warehouse_location_id = $2, warehouse_location_name = $3, updated_at = NOW()
             WHERE id = $1::uuid`,
            [order_id, emptyLoc.rows[0].id, emptyLoc.rows[0].location_name]
          );
          await db.query(
            `UPDATE warehouse_location SET status = 'occupied', updated_at = NOW() WHERE id = $1`,
            [emptyLoc.rows[0].id]
          );
        } else {
          await db.query(
            `UPDATE order_master SET order_status = 'completed', actual_delivery = CURRENT_DATE, updated_at = NOW()
             WHERE id = $1::uuid`,
            [order_id]
          );
        }
      }
    } else if (stage_status === 'in_progress') {
      // 直接进入 in_progress
      await db.query(
        `DELETE FROM order_tracking WHERE order_id = $1::uuid AND current_stage = $2`,
        [order_id, stage]
      );
      await db.query(
        `INSERT INTO order_tracking (id, order_id, current_stage, stage_name, stage_status, started_at, created_at)
         VALUES ($1, $2::uuid, $3, $4, 'in_progress', NOW(), NOW())`,
        [uuidv4(), order_id, stage, stage_name]
      );
    }

    res.json({ success: true, message: '阶段更新成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/production/board
 * 生产看板 - 当前生产状态概览
 */
router.get('/board', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20 } = req.query;
    const offset = (page - 1) * page_size;

    // 当前进行中的订单
    const activeOrders = await db.query(`
      SELECT om.id, om.order_no, om.order_status, om.expected_delivery,
             c.customer_name,
             ot.current_stage, ot.stage_name, ot.stage_status,
             ot.started_at, ot.completed_at,
             cb.board_count
      FROM order_master om
      LEFT JOIN customer c ON om.customer_id = c.id
      LEFT JOIN (
        SELECT DISTINCT ON (order_id) order_id, current_stage, stage_name, stage_status, started_at, completed_at
        FROM order_tracking
        WHERE stage_status IN ('in_progress', 'pending')
        ORDER BY order_id, created_at DESC
      ) ot ON om.id = ot.order_id
      LEFT JOIN (
        SELECT order_id, COUNT(*) as board_count FROM cabinet_board GROUP BY order_id
      ) cb ON om.id = cb.order_id
      WHERE om.order_status NOT IN ('completed', 'cancelled')
      ORDER BY om.expected_delivery ASC NULLS LAST, om.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(page_size), offset]);

    // 阶段统计
    const stageStats = await db.query(`
      SELECT current_stage, stage_name, stage_status, COUNT(*) as count
      FROM order_tracking
      WHERE stage_status IN ('in_progress', 'pending')
      GROUP BY current_stage, stage_name, stage_status
      ORDER BY MIN(created_at)
    `);

    // 今日完成
    const todayCompleted = await db.query(`
      SELECT COUNT(*) as count
      FROM order_tracking
      WHERE stage_status = 'completed'
        AND DATE(completed_at) = CURRENT_DATE
    `);

    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM order_master
      WHERE order_status NOT IN ('completed', 'cancelled')
    `);

    res.json({
      success: true,
      data: {
        list: activeOrders.rows,
        stage_stats: stageStats.rows,
        today_completed: parseInt(todayCompleted.rows[0].count),
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/production/board/id/:id
 * 按 UUID 查询板件（前端详情页用）
 */
router.get('/board/id/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT cb.*, om.order_no, c.customer_name
       FROM cabinet_board cb
       JOIN order_master om ON cb.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE cb.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '板件不存在' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/production/board/:barcode
 * 按条码查询板件信息（扫码枪用）
 */
router.get('/board/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const result = await db.query(
      `SELECT cb.*, om.order_no, c.customer_name
       FROM cabinet_board cb
       JOIN order_master om ON cb.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE cb.barcode = $1`,
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '板件不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/production/pending
 * 获取待处理生产任务（所有 pending / in_progress 订单）
 */
router.get('/pending', async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, stage } = req.query;
    const offset = (page - 1) * page_size;

    let where = `WHERE om.order_status NOT IN ('completed', 'cancelled')`;
    let params = [];
    let p = 0;

    if (stage) {
      where += ` AND EXISTS (
        SELECT 1 FROM order_tracking ot
        WHERE ot.order_id = om.id AND ot.current_stage = $${++p} AND ot.stage_status = 'in_progress'
      )`;
      params.push(stage);
    }

    const limitOffsetParams = [parseInt(page_size), offset];
    const countParams = [...params];
    const result = await db.query(
      `SELECT om.id, om.order_no, om.order_status, om.expected_delivery,
              c.customer_name,
              COALESCE(ot_tracks.stage_name, '未知') as current_stage,
              COALESCE(ot_tracks.stage_status, 'pending') as stage_status,
              cb.board_count
       FROM order_master om
       LEFT JOIN customer c ON om.customer_id = c.id
       LEFT JOIN (
         SELECT DISTINCT ON (order_id) order_id, current_stage, stage_name, stage_status
         FROM order_tracking WHERE stage_status IN ('in_progress', 'pending')
         ORDER BY order_id, created_at DESC
       ) ot_tracks ON om.id = ot_tracks.order_id
       LEFT JOIN (
         SELECT order_id, COUNT(*) as board_count FROM cabinet_board GROUP BY order_id
       ) cb ON om.id = cb.order_id
       ${where}
       ORDER BY om.expected_delivery ASC NULLS LAST, om.created_at DESC
       LIMIT $1 OFFSET $2`,
      limitOffsetParams
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM order_master om ${where}`,
      countParams
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
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/production/voice
 * 语音播报（预留）
 */
router.post('/voice', async (req, res) => {
    try {
      const { text, voice } = req.body;
      const { VoiceService } = require('../hardware/voiceService');
      const vs = new VoiceService();
      await vs.speak(text || '语音播报', voice);
      logger.info('生产语音播报: ' + (text || ''));
      res.json({ success: true, message: '语音播报已提交', data: { text, voice } });
    } catch (err) {
      logger.warn('生产语音播报失败: ' + err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  });

router.post('/schedule/generate', async (req, res, next) => {
  try {
    const { order_ids } = req.body;
    const result = await require('../services/schedulingService').generateSchedule(order_ids);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

/**
 * GET /api/production/schedule/calendar
 * 日历视图：每日排程总览
 */
router.get('/schedule/calendar', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date().toISOString().slice(0, 10);
    const end = end_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const data = await require('../services/schedulingService').getCalendarView(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/**
 * GET /api/production/schedule/stats
 * 排程统计：每日总工时
 */
router.get('/schedule/stats', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date().toISOString().slice(0, 10);
    const end = end_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const data = await require('../services/schedulingService').getScheduleStats(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/**
 * GET /api/production/schedule/:orderId
 * 获取某订单的排程详情
 */
router.get('/schedule/:orderId', async (req, res, next) => {
  try {
    const data = await require('../services/schedulingService').getSchedule(req.params.orderId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/**
 * PUT /api/production/schedule/:scheduleId
 * 调整排程（重新分配工人/日期）
 */
router.put('/schedule/:scheduleId', async (req, res, next) => {
  try {
    const { worker_id, worker_name, scheduled_date } = req.body;
    await require('../services/schedulingService').reschedule(req.params.scheduleId, {
      workerId: worker_id,
      workerName: worker_name,
      scheduledDate: scheduled_date
    });
    res.json({ success: true, message: '排程已调整' });
  } catch (err) { next(err); }
});

/**
 * GET /api/production/boards
 * 查询板件列表（支持按订单/状态/位置筛选）
 */
router.get('/boards', async (req, res, next) => {
  try {
    const { order_id, status, location, page = 1, page_size = 100 } = req.query;
    const offset = (page - 1) * page_size;
    let where = ['1=1'];
    let params = [];
    let p = 0;
    if (order_id) { where.push(`cb.order_id = $${++p}`); params.push(order_id); }
    if (status) { where.push(`cb.status = $${++p}`); params.push(status); }
    if (location) { where.push(`cb.current_location = $${++p}`); params.push(location); }
    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);
    const result = await db.query(
      `SELECT cb.*, o.order_no, d.dealer_name, cu.customer_name
       FROM cabinet_board cb
       LEFT JOIN order_master o ON cb.order_id = o.id
       LEFT JOIN dealer d ON o.dealer_id = d.id
       LEFT JOIN customer cu ON o.customer_id = cu.id
       ${whereStr}
       ORDER BY cb.created_at DESC
       LIMIT $${p+1} OFFSET $${p+2}`,
      params
    );
    const total = await db.query(`SELECT COUNT(*) FROM cabinet_board cb ${whereStr}`, params.slice(0, -2));
    res.json({ success: true, data: { list: result.rows, total: parseInt(total.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) } });
  } catch (err) { next(err); }
});

/**
 * GET /api/production/boards/:boardId
 * 查询单个板件详情
 */
router.get('/boards/:boardId', async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const result = await db.query(
      `SELECT cb.*, o.order_no, d.dealer_name, cu.customer_name, o.delivery_address
       FROM cabinet_board cb
       LEFT JOIN order_master o ON cb.order_id = o.id
       LEFT JOIN dealer d ON o.dealer_id = d.id
       LEFT JOIN customer cu ON o.customer_id = cu.id
       WHERE cb.id = $1`,
      [boardId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '板件不存在' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
