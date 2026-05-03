/**
 * 硬件服务模块
 * 支持: 扫码枪、扬声器、考勤机、标签打印机
 */
const { ScannerService } = require('./scannerService');
const { VoiceService } = require('./voiceService');
const SerialPort = require('serialport');
const net = require('net');
const logger = require('../utils/logger');

// 硬件配置
const HARDWARE_CONFIG = {
  // 扫码枪配置（串口）
  scanner: {
    enabled: process.env.SCANNER_ENABLED !== 'false',
    port: process.env.SCANNER_PORT || 'COM3',
    baudRate: parseInt(process.env.SCANNER_BAUD || '9600')
  },
  // 扬声器配置（串口）
  speaker: {
    enabled: process.env.SPEAKER_ENABLED !== 'false',
    port: process.env.SPEAKER_PORT || 'COM4',
    baudRate: parseInt(process.env.SPEAKER_BAUD || '115200')
  },
  // 考勤机配置（网络）
  attendance: {
    enabled: process.env.ATTENDANCE_ENABLED !== 'false',
    host: process.env.HIKVISION_HOST || '192.168.1.64',
    port: parseInt(process.env.HIKVISION_PORT || '8000')
  }
};

// ── 语音服务（MiniMax TTS）───────────────────────────────
const voiceService = new VoiceService();

// ── 扫码枪服务（串口）───────────────────────────────────
const scannerService = new ScannerService();

/**
 * 初始化硬件服务
 * 在 backend 启动时调用一次
 */
async function initHardware() {
  // 启动扫码枪监听
  if (HARDWARE_CONFIG.scanner.enabled) {
    await scannerService.start();
  }
}

/**
 * 注册扫码回调（业务逻辑通过此方法接入）
 * @param {function} callback (barcode: string) => void
 */
function onBarcode(callback) {
  scannerService.onScan(callback);
}

// ── 扬声器服务（串口协议）───────────────────────────────
class SpeakerService {
  constructor() {
    this.serialPort = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;
    if (!HARDWARE_CONFIG.speaker.enabled) return;

    try {
      this.serialPort = new SerialPort({
        path: HARDWARE_CONFIG.speaker.port,
        baudRate: HARDWARE_CONFIG.speaker.baudRate
      });

      this.serialPort.on('open', () => {
        this.isConnected = true;
        logger.info(`扬声器已连接: ${HARDWARE_CONFIG.speaker.port}`);
      });

      this.serialPort.on('error', (err) => {
        logger.error('扬声器连接错误:', err.message);
        this.isConnected = false;
      });

      this.serialPort.on('close', () => {
        this.isConnected = false;
      });
    } catch (err) {
      logger.error('扬声器连接失败:', err.message);
    }
  }

  /**
   * 播放语音（通过 MiniMax TTS）
   */
  async playVoice(message) {
    await voiceService.speak(message);
  }

  /**
   * 播放语音（串口协议，老设备兼容）
   */
  async playVoiceRaw(message) {
    if (!this.isConnected) await this.connect();
    if (!this.serialPort?.isOpen) return;

    const data = this.buildVoiceProtocol(message);
    return new Promise((resolve, reject) => {
      this.serialPort.write(data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  buildVoiceProtocol(message) {
    const textBytes = Buffer.from(message, 'utf16le');
    const len = textBytes.length + 3;
    const buffer = Buffer.alloc(5 + textBytes.length);
    buffer[0] = 0xAA;
    buffer[1] = len;
    buffer[2] = 0x01;
    textBytes.copy(buffer, 3);
    buffer[buffer.length - 2] = this.calculateChecksum(0x01, textBytes);
    buffer[buffer.length - 1] = 0x55;
    return buffer;
  }

  calculateChecksum(cmd, data) {
    let sum = cmd;
    for (const byte of data) sum += byte;
    return sum & 0xFF;
  }

  close() {
    if (this.serialPort) { this.serialPort.close(); this.isConnected = false; }
  }
}

// ── 考勤机服务 ────────────────────────────────────────
class AttendanceMachineService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;
    if (!HARDWARE_CONFIG.attendance.enabled) return;

    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.connect(HARDWARE_CONFIG.attendance.port, HARDWARE_CONFIG.attendance.host, () => {
        this.isConnected = true;
        logger.info(`考勤机已连接: ${HARDWARE_CONFIG.attendance.host}:${HARDWARE_CONFIG.attendance.port}`);
        resolve();
      });
      this.socket.on('error', (err) => {
        this.isConnected = false;
        reject(err);
      });
      this.socket.on('close', () => { this.isConnected = false; });
    });
  }

  async getAttendanceRecords(startTime, endTime) {
    if (!this.isConnected) await this.connect();
    // TODO: 实现海康威视考勤协议
    return [];
  }

  close() {
    if (this.socket) { this.socket.destroy(); this.isConnected = false; }
  }
}

// ── 标签打印机服务 ─────────────────────────────────────
class LabelPrinterService {
  constructor() {
    this.printerName = process.env.PRINTER_NAME || 'ZDesigner ZD420C';
  }

  async printBoardLabel(boardInfo) {
    const { barcode, cabinet_no, board_name, material, length, width, thickness } = boardInfo;
    const zpl = [
      '^XA',
      `^FO50,30^A0N,30,30^FD${board_name}^FS`,
      `^FO50,70^A0N,25,25^FD柜体: ${cabinet_no}^FS`,
      `^FO50,100^A0N,20,20^FD规格: ${length}×${width}×${thickness}^FS`,
      `^FO50,130^A0N,20,20^FD材质: ${material}^FS`,
      `^FO50,180^BY3^BCN,100,Y,N,N^FD${barcode}^FS`,
      '^XZ'
    ].join('\n');

    logger.info(`[Printer] 板件标签: ${barcode}`);
    return { success: true, zpl };
  }

  async printOrderLabel(orderInfo) {
    const { order_no, customer_name, delivery_address } = orderInfo;
    const zpl = [
      '^XA',
      `^FO50,30^A0N,40,40^FD订单号: ${order_no}^FS`,
      `^FO50,80^A0N,25,25^FD客户: ${customer_name}^FS`,
      `^FO50,115^A0N,20,20^FD地址: ${delivery_address}^FS`,
      `^FO50,160^BY3^BCN,120,Y,N,N^FD${order_no}^FS`,
      '^XZ'
    ].join('\n');

    logger.info(`[Printer] 订单标签: ${order_no}`);
    return { success: true, zpl };
  }
}

// 导出单例
const speakerService = new SpeakerService();
const attendanceService = new AttendanceMachineService();
const labelPrinterService = new LabelPrinterService();

module.exports = {
  scannerService,
  voiceService,
  speakerService,
  attendanceService,
  labelPrinterService,
  HARDWARE_CONFIG,
  initHardware,
  onBarcode
};
