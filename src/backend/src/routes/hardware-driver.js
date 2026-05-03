/**
 * 硬件驱动路由
 * 直接控制: COM端口扫描枪监听、文字转语音播报
 * 
 * 注意: serialport在Windows上可能需要管理员权限，请用try/catch处理所有操作
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// 懒加载模块，避免启动时就报错
let SerialPort;
let barcodeScannerInstance = null; // 当前打开的扫码枪实例

// ==================== COM端口列表 ====================

/**
 * GET /api/hardware/driver/ports
 * 列出所有可用的COM端口
 */
router.get('/ports', async (req, res) => {
  try {
    let ports = [];
    try {
      if (!SerialPort) {
        SerialPort = require('serialport');
      }
      const listModule = require('@serialport/list');
      const listFn = listModule.list || listModule.default?.list;
      if (typeof listFn === 'function') {
        ports = await listFn();
      }
    } catch (hwErr) {
      // VM环境无串口，返回空列表而不报错
      ports = [];
    }
    res.json({
      success: true,
      data: ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        serialNumber: p.serialNumber,
        pnpId: p.pnpId,
        locationId: p.locationId,
        friendlyName: p.friendlyName
      }))
    });
  } catch (err) {
    logger.error('获取COM端口列表失败:', err);
    res.status(200).json({
      success: false,
      message: '获取COM端口列表失败: ' + err.message
    });
  }
});

// ==================== 扫码枪实时监听 ====================

/**
 * POST /api/hardware/driver/scan/start
 * 打开指定COM口，开始监听扫码枪（事件驱动，推送结果到前端）
 * 
 * Body: { port: 'COM3', baudRate: 9600 }
 */
router.post('/scan/start', async (req, res) => {
  try {
    const { port, baudRate = 9600 } = req.body;

    if (!port) {
      return res.status(400).json({ success: false, message: '端口号不能为空' });
    }

    // 如果已有连接，先关闭
    if (barcodeScannerInstance) {
      try {
        barcodeScannerInstance.close();
      } catch (e) { /* ignore */ }
      barcodeScannerInstance = null;
    }

    if (!SerialPort) {
      SerialPort = require('serialport');
    }

    // 创建串口连接
    const portObj = new SerialPort({
      path: port,
      baudRate: parseInt(baudRate),
      autoOpen: false
    });

    // 扫码枪通常在接收到数据后立即发送，不需要等待换行符
    // 配置 Readline 解析器来读取数据
    const Readline = SerialPort.parsers.Readline;
    const parser = portObj.pipe(new Readline({ delimiter: '\r\n' }));

    await new Promise((resolve, reject) => {
      portObj.open((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    barcodeScannerInstance = portObj;

    logger.info(`扫码枪已连接: ${port} @ ${baudRate}bps`);

    // 监听扫码数据
    parser.on('data', (barcode) => {
      const trimmedBarcode = barcode.trim();
      if (trimmedBarcode) {
        logger.info(`扫码枪收到: ${trimmedBarcode}`);
        
        // 通过SSE（Server-Sent Events）推送结果
        // 前端可以通过 GET /api/hardware/driver/scan/stream 获取推送
        if (global.barcodeSSEClients && global.barcodeSSEClients.size > 0) {
          const event = JSON.stringify({
            type: 'scan',
            barcode: trimmedBarcode,
            port: port,
            timestamp: new Date().toISOString()
          });
          
          global.barcodeSSEClients.forEach(client => {
            client.res.write(`data: ${event}\n\n`);
          });
        }
      }
    });

    portObj.on('error', (err) => {
      logger.error('扫码枪串口错误:', err);
    });

    portObj.on('close', () => {
      logger.info('扫码枪连接已关闭');
      barcodeScannerInstance = null;
    });

    res.json({
      success: true,
      message: `扫码枪已连接到 ${port}`,
      data: { port, baudRate: parseInt(baudRate) }
    });

  } catch (err) {
    logger.error('启动扫码监听失败:', err);
    
    let errorMsg = err.message;
    if (err.message.includes('Permission denied')) {
      errorMsg = '端口权限不足，请以管理员权限运行';
    } else if (err.message.includes('not found') || err.message.includes('不存在')) {
      errorMsg = '端口不存在或已被占用';
    }

    res.status(500).json({
      success: false,
      message: '启动扫码监听失败: ' + errorMsg
    });
  }
});

/**
 * POST /api/hardware/driver/scan/stop
 * 关闭扫码监听
 */
router.post('/scan/stop', (req, res) => {
  try {
    if (barcodeScannerInstance) {
      barcodeScannerInstance.close((err) => {
        if (err) {
          logger.error('关闭扫码枪失败:', err);
        }
      });
      barcodeScannerInstance = null;
      logger.info('扫码监听已停止');
    }

    res.json({
      success: true,
      message: '扫码监听已停止'
    });
  } catch (err) {
    logger.error('停止扫码监听失败:', err);
    res.status(500).json({
      success: false,
      message: '停止扫码监听失败: ' + err.message
    });
  }
});

/**
 * GET /api/hardware/driver/scan/status
 * 获取扫码监听状态
 */
router.get('/scan/status', (req, res) => {
  res.json({
    success: true,
    data: {
      connected: barcodeScannerInstance !== null && barcodeScannerInstance.isOpen,
      port: barcodeScannerInstance?.path,
      baudRate: barcodeScannerInstance?.baudRate
    }
  });
});

// ==================== 文字转语音 ====================

// edge-tts 可用音色列表（预定义，实际从微软TTS获取）
const EDGE_TTS_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', lang: 'zh-CN', gender: 'Female', engine: 'edge-tts' },
  { id: 'zh-CN-YunxiNeural', name: '云希', lang: 'zh-CN', gender: 'Male', engine: 'edge-tts' },
  { id: 'zh-CN-YunyangNeural', name: '云扬', lang: 'zh-CN', gender: 'Male', engine: 'edge-tts' },
  { id: 'zh-CN-XiaoyiNeural', name: '小艺', lang: 'zh-CN', gender: 'Female', engine: 'edge-tts' },
  { id: 'zh-CN-liaoning-YunxiaNeural', name: '辽宁云晓', lang: 'zh-CN-liaoning', gender: 'Female', engine: 'edge-tts' },
  { id: 'zh-CN-shaanxi-XiaoniNeural', name: '陕西小妮', lang: 'zh-CN-shaanxi', gender: 'Female', engine: 'edge-tts' },
  { id: 'en-US-JennyNeural', name: 'Jenny', lang: 'en-US', gender: 'Female', engine: 'edge-tts' },
  { id: 'en-US-GuyNeural', name: 'Guy', lang: 'en-US', gender: 'Male', engine: 'edge-tts' }
];

/**
 * GET /api/hardware/driver/voice/voices
 * 列出所有可用的语音音色
 */
router.get('/voice/voices', (req, res) => {
  res.json({
    success: true,
    data: EDGE_TTS_VOICES
  });
});

/**
 * POST /api/hardware/driver/voice
 * 文字转语音并播放
 * 
 * Body: { 
 *   text: '生产任务已完成', 
 *   voice: 'zh-CN-XiaoxiaoNeural',
 *   rate: '+0%',    // 语速调整
 *   volume: '+0%'   // 音量调整
 * }
 */
router.post('/voice', async (req, res) => {
  try {
    const { text, voice = 'zh-CN-XiaoxiaoNeural', rate = '+0%', volume = '+0%' } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: '语音内容不能为空' });
    }

    // 检查edge-tts是否安装
    let EdgeTTS;
    try {
      EdgeTTS = require('edge-tts/out');
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: 'edge-tts 未安装，请运行: npm install @edge-tts'
      });
    }

    logger.info(`TTS播放: "${text}" 使用音色: ${voice}`);

    // 使用edge-tts生成语音
    const tts = new EdgeTTS.EdgeTTS();
    
    // 生成音频文件到临时目录
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const tempDir = path.join(os.tmpdir(), 'cabinet-tts');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputFile = path.join(tempDir, `tts_${Date.now()}.mp3`);

    await tts.ttsPromise(text, outputFile, voice, {
      rate: rate,
      volume: volume
    });

    logger.info(`TTS文件已生成: ${outputFile}`);

    // 播放音频（Windows下使用PowerShell播放）
    const { exec } = require('child_process');
    
    await new Promise((resolve, reject) => {
      // Windows上使用PowerShell播放
      exec(`powershell -c "(New-Object System.Media.SoundPlayer '${outputFile.replace(/'/g, "''")}').PlaySync()"`, (err) => {
        // 播放完毕，清理临时文件
        try {
          fs.unlinkSync(outputFile);
        } catch (e) { /* ignore cleanup error */ }
        
        if (err) {
          logger.warn('音频播放失败:', err);
          // 不reject，因为文件已生成，只是播放失败
          resolve();
        } else {
          resolve();
        }
      });
    });

    res.json({
      success: true,
      message: '语音播报完成',
      data: { text, voice, rate, volume }
    });

  } catch (err) {
    logger.error('TTS播放失败:', err);
    res.status(500).json({
      success: false,
      message: 'TTS播放失败: ' + err.message
    });
  }
});

/**
 * POST /api/hardware/driver/voice/test
 * 测试语音（简化版，直接返回音频URL）
 */
router.post('/voice/test', async (req, res) => {
  try {
    const { text = '测试语音', voice = 'zh-CN-XiaoxiaoNeural' } = req.body;

    let EdgeTTS;
    try {
      EdgeTTS = require('edge-tts/out');
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: 'edge-tts 未安装'
      });
    }

    const tts = new EdgeTTS.EdgeTTS();
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const tempDir = path.join(os.tmpdir(), 'cabinet-tts');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputFile = path.join(tempDir, `tts_test_${Date.now()}.mp3`);
    await tts.ttsPromise(text, outputFile, voice);

    res.json({
      success: true,
      data: {
        audioFile: outputFile,
        message: '音频文件已生成'
      }
    });

  } catch (err) {
    logger.error('TTS测试失败:', err);
    res.status(500).json({
      success: false,
      message: 'TTS测试失败: ' + err.message
    });
  }
});

module.exports = router;
