/**
 * 得力云考勤服务
 * 支持: 得力3960CSE/W (WiFi联网版) 及得力云API支持的考勤机
 * 数据流向: 得力考勤机 → 得力云 → 我们的系统
 */
const crypto = require('crypto');
const db = require('../db');
const logger = require('../utils/logger');

class DeliAttendanceService {
  constructor() {
    // 得力云API配置
    this.apiBase = 'https://v2-api.delicloud.com';
    this.appKey = process.env.DELI_APP_KEY || '';
    this.appSecret = process.env.DELI_APP_SECRET || '';
    this.companyId = process.env.DELI_COMPANY_ID || '';

    // 定时同步配置
    this.syncInterval = parseInt(process.env.DELI_SYNC_INTERVAL || '3600000'); // 默认1小时
    this.syncTimer = null;
  }

  /**
   * 生成得力API签名
   * @param {number} timestamp - 时间戳（毫秒）
   */
  generateSignature(timestamp) {
    const str = `${this.appKey}${timestamp}${this.appSecret}`;
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * 调用得力云API
   * @param {string} cmd - Api-Cmd值
   * @param {object} data - 请求体数据
   */
  async request(cmd, data = {}) {
    if (!this.appKey || !this.appSecret) {
      throw new Error('得力云API未配置，请设置环境变量 DELI_APP_KEY 和 DELI_APP_SECRET');
    }

    const timestamp = Date.now();
    const sign = this.generateSignature(timestamp);

    const headers = {
      'Content-Type': 'application/json',
      'App-Key': this.appKey,
      'App-Timestamp': timestamp.toString(),
      'App-Sig': sign,
      'Api-Cmd': cmd
    };

    const response = await fetch(`${this.apiBase}${data.path || '/v2.0/checkin/query'}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.code !== 0) {
      throw new Error(`得力云API错误: ${result.msg || result.code}`);
    }

    return result.data;
  }

  /**
   * 拉取打卡记录
   * @param {number} startTime - 开始时间戳（秒）
   * @param {number} endTime - 结束时间戳（秒）
   */
  async fetchCheckinRecords(startTime, endTime) {
    const data = {
      path: '/v2.0/checkin/query',
      start_time: startTime,
      end_time: endTime,
      limit: 500
    };

    const result = await this.request('checkin_query', data);
    return result;
  }

  /**
   * 同步打卡记录到本地数据库
   * @param {Array} records - 打卡记录数组
   */
  async syncCheckinRecords(records) {
    const results = {
      total: records.length,
      synced: 0,
      skipped: 0,
      errors: 0
    };

    for (const rec of records) {
      try {
        await this.processCheckinRecord(rec);
        results.synced++;
      } catch (err) {
        if (err.message === '员工不存在') {
          results.skipped++;
        } else {
          results.errors++;
          logger.error(`同步打卡记录失败: ${err.message}`, rec);
        }
      }
    }

    return results;
  }

  /**
   * 处理单条打卡记录
   * @param {object} rec - 打卡记录
   *   - ext_id: 员工外部ID（工号）
   *   - check_time: 打卡时间戳（秒）
   *   - check_type: 打卡方式 (fp=指纹, fa=人脸, card=刷卡, app_scan=APP扫码等)
   *   - terminal_id: 设备ID
   */
  async processCheckinRecord(rec) {
    const { ext_id, check_time, check_type, terminal_id } = rec;

    // 查找员工（通过工号）
    const emp = await db.query(
      `SELECT id, employee_name FROM employee WHERE employee_no = $1 AND status = 'active' LIMIT 1`,
      [ext_id]
    );

    if (emp.rows.length === 0) {
      throw new Error('员工不存在');
    }

    const employeeId = emp.rows[0].id;
    const checkDate = new Date(check_time * 1000).toISOString().slice(0, 10);
    const checkTimeStr = new Date(check_time * 1000).toTimeString().slice(0, 8);

    // 判断是上班打卡还是下班打卡
    const isFirstCheck = await this.isFirstCheckOfDay(employeeId, checkDate);

    if (isFirstCheck) {
      // 上班打卡
      const exist = await db.query(
        `SELECT id FROM attendance_record WHERE employee_id = $1 AND record_date = $2`,
        [employeeId, checkDate]
      );

      if (exist.rows.length === 0) {
        await db.query(
          `INSERT INTO attendance_record (employee_id, record_date, check_in_time, status, device_no, source)
           VALUES ($1::uuid, $2, $3, 'normal', $4, 'deli_cloud')`,
          [employeeId, checkDate, checkTimeStr, terminal_id || '']
        );
        logger.info(`[Deli] 上班打卡: ${emp.rows[0].employee_name} @ ${checkTimeStr}`);
      }
    } else {
      // 下班打卡
      const exist = await db.query(
        `SELECT id, check_in_time FROM attendance_record WHERE employee_id = $1 AND record_date = $2`,
        [employeeId, checkDate]
      );

      if (exist.rows.length > 0) {
        const checkIn = exist.rows[0].check_in_time;
        const [h1, m1, s1] = checkIn.split(':').map(Number);
        const [h2, m2, s2] = checkTimeStr.split(':').map(Number);
        const hours = ((h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1)) / 3600;

        await db.query(
          `UPDATE attendance_record
           SET check_out_time = $1, working_hours = $2,
               status = CASE WHEN $2 < 4 THEN 'early_leave' ELSE 'normal' END,
               device_no = COALESCE($3, device_no)
           WHERE id = $4`,
          [checkTimeStr, Math.round(hours * 10) / 10, terminal_id || '', exist.rows[0].id]
        );
        logger.info(`[Deli] 下班打卡: ${emp.rows[0].employee_name} @ ${checkTimeStr}`);
      }
    }
  }

  /**
   * 判断是否是当天第一次打卡
   */
  async isFirstCheckOfDay(employeeId, date) {
    const result = await db.query(
      `SELECT id FROM attendance_record WHERE employee_id = $1 AND record_date = $2`,
      [employeeId, date]
    );
    return result.rows.length === 0;
  }

  /**
   * 从得力云拉取并同步数据
   * @param {number} hoursAgo - 拉取多少小时前的数据，默认24小时
   */
  async pullAndSync(hoursAgo = 24) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (hoursAgo * 3600);

    logger.info(`[Deli] 开始同步打卡记录: ${new Date(startTime * 1000).toISOString()} ~ ${new Date(endTime * 1000).toISOString()}`);

    try {
      const data = await this.fetchCheckinRecords(startTime, endTime);
      const records = data?.data || [];

      if (records.length === 0) {
        logger.info('[Deli] 没有新的打卡记录');
        return { synced: 0 };
      }

      const results = await this.syncCheckinRecords(records);
      logger.info(`[Deli] 同步完成: 共${results.total}条，成功${results.synced}条，跳过${results.skipped}条，失败${results.errors}条`);

      return results;
    } catch (err) {
      logger.error('[Deli] 同步失败:', err.message);
      throw err;
    }
  }

  /**
   * 同步得力云员工到本地
   * 将得力云中的员工与本地员工关联（通过工号匹配）
   */
  async syncEmployees() {
    try {
      // 查询得力云员工列表
      const data = await this.request('employee_query', { path: '/v2.0/employee/query' });
      const employees = data?.rows || [];

      logger.info(`[Deli] 从云端获取到 ${employees.length} 名员工`);

      let synced = 0;
      for (const emp of employees) {
        // 通过工号查找本地员工，建立关联
        if (emp.employee_num) {
          const localEmp = await db.query(
            `UPDATE employee SET deli_ext_id = $1 WHERE employee_no = $2 RETURNING id`,
            [emp.id, emp.employee_num]
          );
          if (localEmp.rows.length > 0) {
            synced++;
          }
        }
      }

      logger.info(`[Deli] 员工同步完成: ${synced} 名员工已关联`);
      return { total: employees.length, synced };
    } catch (err) {
      logger.error('[Deli] 员工同步失败:', err.message);
      throw err;
    }
  }

  /**
   * 启动定时同步
   * @param {number} intervalMs - 同步间隔（毫秒）
   */
  startAutoSync(intervalMs) {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    const interval = intervalMs || this.syncInterval;
    logger.info(`[Deli] 启动定时同步，间隔 ${interval / 1000 / 60} 分钟`);

    // 启动时立即同步一次
    this.pullAndSync(24).catch(err => logger.error('[Deli] 启动同步失败:', err.message));

    this.syncTimer = setInterval(() => {
      this.pullAndSync(24).catch(err => logger.error('[Deli] 定时同步失败:', err.message));
    }, interval);
  }

  /**
   * 停止定时同步
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('[Deli] 定时同步已停止');
    }
  }

  /**
   * 获取考勤记录（月度统计用）
   * @param {number} startTime - 开始时间戳（秒）
   * @param {number} endTime - 结束时间戳（秒）
   */
  async getAttendanceData(startTime, endTime) {
    return await this.fetchCheckinRecords(startTime, endTime);
  }
}

// 导出单例
module.exports = { DeliAttendanceService };
