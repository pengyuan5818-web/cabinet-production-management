/**
 * 串口扫码枪服务
 * 监听串口输入，检测完整条码后触发回调
 * 兼容 serialport v13
 */
const { SerialPort } = require('serialport');
const logger = require('../utils/logger');

class ScannerService {
  constructor() {
    this.port = null;
    this.buffer = '';
    this.callbacks = [];
    this.isListening = false;
    // 扫码枪通常以回车或换行结尾
    this.terminator = '\r\n';
    this.enabled = process.env.SCANNER_ENABLED !== 'false';
    this.portPath = process.env.SCANNER_PORT || 'COM3';
    this.baudRate = parseInt(process.env.SCANNER_BAUD || '9600');
  }

  /**
   * 注册扫码回调
   * @param {function} callback (barcode: string) => void
   */
  onScan(callback) {
    this.callbacks.push(callback);
  }

  /**
   * 移除扫码回调
   */
  offScan(callback) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  /**
   * 启动监听
   */
  async start() {
    if (!this.enabled) {
      logger.info('扫码枪服务已禁用（SCANNER_ENABLED=false）');
      return;
    }

    if (this.isListening) return;

    try {
      // 列出可用串口
      const ports = await SerialPort.list();
      const scannerPort = ports.find(p => p.path === this.portPath);

      if (!scannerPort) {
        logger.warn(`未找到扫码枪串口: ${this.portPath}，可用端口: ${ports.map(p => p.path).join(', ')}`);
        // 尝试第一个 COM 端口
        const firstCom = ports.find(p => p.path.startsWith('COM'));
        if (firstCom) {
          logger.info(`自动使用端口: ${firstCom.path}`);
        } else {
          return;
        }
      }

      const path = scannerPort?.path || firstCom?.path || this.portPath;

      this.port = new SerialPort({
        path,
        baudRate: this.baudRate,
        autoOpen: false
      });

      // 手动处理行分隔符
      this.port.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        this.buffer += text;

        // 查找终止符
        let idx;
        while ((idx = this.buffer.indexOf(this.terminator)) !== -1) {
          const barcode = this.buffer.slice(0, idx).trim();
          this.buffer = this.buffer.slice(idx + this.terminator.length);

          if (barcode.length >= 6) {
            logger.info(`[Scanner] 扫码: ${barcode}`);
            this.callbacks.forEach(cb => {
              try { cb(barcode); } catch (e) { logger.error('Scanner callback error:', e); }
            });
          }
        }
      });

      this.port.on('error', (err) => {
        logger.error('扫码枪串口错误:', err.message);
      });

      this.port.on('close', () => {
        this.isListening = false;
        logger.info('扫码枪连接已断开，5秒后重连...');
        setTimeout(() => this.start(), 5000);
      });

      this.port.open((err) => {
        if (err) {
          logger.error('扫码枪串口打开失败:', err.message);
          return;
        }
        this.isListening = true;
        logger.info(`扫码枪已连接: ${path} @ ${this.baudRate}bps`);
      });

    } catch (err) {
      logger.error('扫码枪服务启动失败:', err.message);
    }
  }

  /**
   * 停止监听
   */
  stop() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
    this.isListening = false;
  }

  /**
   * 列出可用串口（调试用）
   */
  static async listPorts() {
    const ports = await SerialPort.list();
    return ports.map(p => ({ path: p.path, manufacturer: p.manufacturer }));
  }
}

module.exports = { ScannerService };
