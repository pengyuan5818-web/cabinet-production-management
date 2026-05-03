/**
 * 硬件控制路由
 * 支持: 扫码枪回调、扬声器、考勤机、标签打印机
 */
const express = require('express');
const router = express.Router();
const { 
  speakerService, 
  attendanceService, 
  barcodeScannerService,
  labelPrinterService 
} = require('../hardware');
const db = require('../db');
const logger = require('../utils/logger');

/**
 * POST /api/hardware/scan
 * 处理扫码枪扫码（Web前端调用）
 */
router.post('/scan', async (req, res, next) => {
  try {
    const { barcode, location, operator_id, operator_name } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: '条码不能为空' });
    }

    // 解析条码类型
    let scanType = 'unknown';
    let orderId = null;
    let boardInfo = null;

    if (barcode.startsWith('ORDER:')) {
      // 订单二维码
      const orderNo = barcode.replace('ORDER:', '');
      const orderResult = await db.query(
        `SELECT id, order_no, order_status, customer_name FROM order_master 
         WHERE order_no = $1 OR qr_code = $1`,
        [orderNo]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      orderId = orderResult.rows[0].id;
      scanType = 'order';
      
      // 更新板件状态
      await db.query(
        `UPDATE cabinet_board SET status = 'scanned', current_location = $1 
         WHERE order_id = $2`,
        [location, orderId]
      );

    } else {
      // 板件条码
      const boardResult = await db.query(
        `SELECT cb.*, om.order_no, om.order_status 
         FROM cabinet_board cb
         JOIN order_master om ON cb.order_id = om.id
         WHERE cb.barcode = $1`,
        [barcode]
      );

      if (boardResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: '板件不存在' });
      }

      boardInfo = boardResult.rows[0];
      orderId = boardInfo.order_id;
      scanType = 'board';

      // 更新板件状态和位置
      await db.query(
        `UPDATE cabinet_board SET status = 'scanned', current_location = $1, updated_at = NOW() 
         WHERE barcode = $2`,
        [location, barcode]
      );
    }

    // 触发语音播报
    try {
      const area = location || '分拣区';
      const stageName = scanType === 'order' ? '订单到达' : '板件分拣';
      await speakerService.playVoice(`订单${orderId}，请到${area}，${stageName}`);
    } catch (voiceErr) {
      logger.warn('语音播报失败:', voiceErr.message);
    }

    logger.info(`扫码: ${barcode}, 类型: ${scanType}, 位置: ${location}`);

    res.json({
      success: true,
      data: {
        scan_type: scanType,
        order_id: orderId,
        board: boardInfo,
        message: `${scanType === 'order' ? '订单' : '板件'}扫码成功`
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hardware/voice
 * 语音播报
 */
router.post('/voice', async (req, res, next) => {
  try {
    const { message, area, order_no } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: '播报内容不能为空' });
    }

    await speakerService.playVoice(message);

    res.json({
      success: true,
      message: '语音播报已触发',
      data: { voice_message: message }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hardware/voice/order
 * 订单语音播报
 */
router.post('/voice/order', async (req, res, next) => {
  try {
    const { order_id, area } = req.body;

    const result = await db.query(
      `SELECT om.order_no, c.customer_name, om.delivery_address
       FROM order_master om
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE om.id = $1`,
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = result.rows[0];
    const message = `订单号${order.order_no}，客户${order.customer_name}，请到${area || '分拣区'}`;

    await speakerService.playVoice(message);

    res.json({
      success: true,
      message: '订单语音播报已触发',
      data: { voice_message: message }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hardware/print/board
 * 打印板件标签
 */
router.post('/print/board', async (req, res, next) => {
  try {
    const { board_id, barcode } = req.body;

    let boardInfo;
    if (barcode) {
      const result = await db.query(
        `SELECT * FROM cabinet_board WHERE barcode = $1`,
        [barcode]
      );
      boardInfo = result.rows[0];
    } else if (board_id) {
      const result = await db.query(
        `SELECT * FROM cabinet_board WHERE id = $1`,
        [board_id]
      );
      boardInfo = result.rows[0];
    } else {
      return res.status(400).json({ success: false, message: '板件ID或条码不能为空' });
    }

    if (!boardInfo) {
      return res.status(404).json({ success: false, message: '板件不存在' });
    }

    const printResult = await labelPrinterService.printBoardLabel(boardInfo);

    res.json({
      success: true,
      message: '标签打印指令已发送',
      data: printResult
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hardware/print/order
 * 打印订单标签
 */
router.post('/print/order', async (req, res, next) => {
  try {
    const { order_id } = req.body;

    const result = await db.query(
      `SELECT om.*, c.customer_name
       FROM order_master om
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE om.id = $1`,
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = result.rows[0];
    const printResult = await labelPrinterService.printOrderLabel({
      order_no: order.order_no,
      customer_name: order.customer_name,
      delivery_address: order.delivery_address
    });

    res.json({
      success: true,
      message: '订单标签打印指令已发送',
      data: printResult
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hardware/status
 * 获取硬件状态
 */
router.get('/status', async (req, res) => {
  const { ScannerService } = require('../hardware/scannerService');
  let ports = [];
  try {
    ports = await ScannerService.listPorts();
  } catch (e) {}

  res.json({
    success: true,
    data: {
      scanner: {
        enabled: process.env.SCANNER_ENABLED !== 'false',
        port: process.env.SCANNER_PORT || 'COM3',
        baudRate: parseInt(process.env.SCANNER_BAUD || '9600'),
        availablePorts: ports
      },
      speaker: {
        enabled: process.env.SPEAKER_ENABLED !== 'false',
        port: process.env.SPEAKER_PORT || 'COM4',
        baudRate: parseInt(process.env.SPEAKER_BAUD || '115200'),
        connected: speakerService.isConnected
      },
      voice: {
        enabled: process.env.VOICE_ENABLED !== 'false',
        api: 'MiniMax TTS'
      }
    }
  });
});

/**
 * GET /api/hardware/ports
 * 列出所有可用串口（调试用）
 */
router.get('/ports', async (req, res, next) => {
  try {
    const { ScannerService } = require('../hardware/scannerService');
    const ports = await ScannerService.listPorts();
    res.json({ success: true, data: ports });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hardware/test-voice
 * 测试语音播报
 */
router.post('/test-voice', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: '播报内容不能为空' });

    await speakerService.playVoice(message);
    res.json({ success: true, message: '语音播报已触发', data: { message } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
