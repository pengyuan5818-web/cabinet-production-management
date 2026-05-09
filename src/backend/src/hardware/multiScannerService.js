/**
 * 多扫码枪管理服务
 * 支持同时连接多把扫码枪，每把对应不同工序和位置
 */
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const logger = require('../utils/logger');
const db = require('../db');

class MultiScannerService {
  constructor() {
    // Map<scannerId, { port, baudRate, terminator, isOpen, callbacks }>
    this.scanners = new Map();
    // 全局回调（用于没有指定scanner_id时的处理）
    this.globalCallbacks = [];
  }

  /**
   * 从数据库加载所有启用的扫码枪并连接
   */
  async loadAndConnect() {
    try {
      const result = await db.query(
        `SELECT id, code, name, process_type, process_name, com_port, baud_rate, terminator, status
         FROM scanner_device WHERE status = 'active' ORDER BY code`
      );

      logger.info(`[MultiScanner] 加载到 ${result.rows.length} 把扫码枪`);

      for (const scanner of result.rows) {
        if (scanner.com_port) {
          await this.connectScanner(scanner);
        }
      }

      return result.rows.length;
    } catch (err) {
      logger.error('[MultiScanner] 加载扫码枪失败:', err.message);
      return 0;
    }
  }

  /**
   * 连接单个扫码枪
   */
  async connectScanner(scanner) {
    if (this.scanners.has(scanner.id)) {
      logger.info(`[MultiScanner] ${scanner.code} 已连接，跳过`);
      return;
    }

    const { id, code, name, process_type, com_port, baud_rate, terminator } = scanner;

    try {
      const port = new SerialPort({
        path: com_port,
        baudRate: baud_rate || 9600,
        autoOpen: false
      });

      const term = terminator || '\r\n';
      const parser = port.pipe(new ReadlineParser({ delimiter: term }));

      await new Promise((resolve, reject) => {
        port.open((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      parser.on('data', async (barcode) => {
        const trimmed = barcode.trim();
        if (trimmed.length < 4) return;

        logger.info(`[MultiScanner][${code}] 扫码: ${trimmed}`);

        // 调用全局回调（同步调用，避免在 async handler 中嵌套 async）
        for (const cb of this.globalCallbacks) {
          try {
            cb(trimmed, {
              scanner_id: id,
              scanner_code: code,
              process_type,
              process_name: scanner.process_name,
              name
            });
          } catch (e) {
            logger.error(`[MultiScanner][${code}] 回调异常:`, e.message);
          }
        }

        // 更新最后扫码时间和在线状态（fire-and-forget，避免阻塞）
        db.query(
          `UPDATE scanner_device
           SET last_scan_time = CURRENT_TIMESTAMP, last_scan_barcode = $1, is_online = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [trimmed, id]
        ).catch(e => logger.warn(`[MultiScanner] 更新扫码枪状态失败:`, e.message));
      });

      port.on('error', (err) => {
        logger.error(`[MultiScanner][${code}] 串口错误: ${err.message}`);
      });

      port.on('close', () => {
        logger.warn(`[MultiScanner][${code}] 连接断开，10秒后重连...`);
        this.scanners.delete(id);
        setTimeout(() => this.reconnectScanner(scanner), 10000);
      });

      this.scanners.set(id, {
        port,
        parser,
        scanner,
        isOpen: true
      });

      logger.info(`[MultiScanner] ${code}(${name}) 已连接: ${com_port} @ ${baud_rate || 9600}`);

    } catch (err) {
      logger.error(`[MultiScanner][${code}] 连接失败: ${err.message}`);
    }
  }

  /**
   * 重新连接扫码枪
   */
  async reconnectScanner(scanner) {
    try {
      const result = await db.query(
        `SELECT status FROM scanner_device WHERE id = $1`,
        [scanner.id]
      );
      if (result.rows.length > 0 && result.rows[0].status === 'active') {
        await this.connectScanner(scanner);
      }
    } catch (err) {
      logger.error(`[MultiScanner][${scanner.code}] 重连失败:`, err.message);
    }
  }

  /**
   * 断开扫码枪连接
   */
  async disconnectScanner(scannerId) {
    const s = this.scanners.get(scannerId);
    if (s) {
      s.port.close();
      this.scanners.delete(scannerId);
      logger.info(`[MultiScanner] 扫码枪已断开: ${s.scanner.code}`);
    }
  }

  /**
   * 注册全局扫码回调
   * @param {function} callback (barcode, scannerInfo) => void
   */
  onScan(callback) {
    this.globalCallbacks.push(callback);
  }

  /**
   * 移除回调
   */
  offScan(callback) {
    this.globalCallbacks = this.globalCallbacks.filter(cb => cb !== callback);
  }

  /**
   * 获取所有已连接的扫码枪状态
   */
  getStatus() {
    const list = [];
    for (const [id, s] of this.scanners) {
      list.push({
        scanner_id: id,
        code: s.scanner.code,
        name: s.scanner.name,
        process_type: s.scanner.process_type,
        port: s.port.path,
        baud_rate: s.port.baudRate,
        is_online: s.isOpen
      });
    }
    return list;
  }

  /**
   * 停止所有连接
   */
  stopAll() {
    for (const [id, s] of this.scanners) {
      try {
        s.port.close();
      } catch (e) { /* ignore */ }
    }
    this.scanners.clear();
    logger.info('[MultiScanner] 所有扫码枪已断开');
  }
}

// 导出单例
const multiScannerService = new MultiScannerService();
module.exports = { MultiScannerService, multiScannerService };
