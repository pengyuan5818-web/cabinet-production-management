/**
 * 考勤管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { DeliAttendanceService } = require('../hardware/deliAttendanceService');

// 创建得力云服务实例（用于API调用）
const deliService = new DeliAttendanceService();

/**
 * GET /api/attendance
 * 考勤记录列表
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, employee_id, dept_id, date, start_date, end_date, status } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let p = 0;

    if (employee_id) { where.push(`ar.employee_id = $${++p}::uuid`); params.push(employee_id); }
    if (dept_id) { where.push(`e.dept_id = $${++p}::uuid`); params.push(dept_id); }
    if (date) { where.push(`ar.record_date = $${++p}`); params.push(date); }
    if (start_date) { where.push(`ar.record_date >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`ar.record_date <= $${++p}`); params.push(end_date); }
    if (status) { where.push(`ar.status = $${++p}`); params.push(status); }

    const whereSql = where.join(' AND ');
    params.push(parseInt(page_size), parseInt(offset));

    const result = await db.query(`
      SELECT ar.*, e.employee_name, e.employee_no, d.dept_name
      FROM attendance_record ar
      LEFT JOIN employee e ON ar.employee_id = e.id
      LEFT JOIN department d ON e.dept_id = d.id
      WHERE ${whereSql}
      ORDER BY ar.record_date DESC, ar.check_in_time DESC
      LIMIT $${++p} OFFSET $${++p}
    `, params);

    const countResult = await db.query(`
      SELECT COUNT(*) FROM attendance_record ar
      LEFT JOIN employee e ON ar.employee_id = e.id
      WHERE ${whereSql}
    `, params.slice(0, -2));

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
 * POST /api/attendance/check-in
 * 打卡上班
 */
router.post('/check-in', async (req, res, next) => {
  try {
    const { employee_id, device_no, location, remark } = req.body;
    if (!employee_id) return res.status(400).json({ success: false, message: '员工ID不能为空' });

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 8);

    // 查重：今天已打卡
    const exist = await db.query(
      `SELECT id FROM attendance_record WHERE employee_id = $1::uuid AND record_date = $2`,
      [employee_id, today]
    );

    if (exist.rows.length > 0) {
      return res.status(400).json({ success: false, message: '今日已打卡' });
    }

    const r = await db.query(`
      INSERT INTO attendance_record (employee_id, record_date, check_in_time, status, device_no, remark)
      VALUES ($1::uuid, $2, $3, 'normal', $4, $5) RETURNING *
    `, [employee_id, today, now, device_no || '', remark || '']);

    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * POST /api/attendance/check-out
 * 打卡下班
 */
router.post('/check-out', async (req, res, next) => {
  try {
    const { employee_id, device_no, location, remark } = req.body;
    if (!employee_id) return res.status(400).json({ success: false, message: '员工ID不能为空' });

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 8);

    const exist = await db.query(
      `SELECT id, check_in_time FROM attendance_record WHERE employee_id = $1::uuid AND record_date = $2`,
      [employee_id, today]
    );

    if (exist.rows.length === 0) {
      return res.status(400).json({ success: false, message: '今日未打卡，请先上班打卡' });
    }

    const checkIn = exist.rows[0].check_in_time;
    const [h1, m1, s1] = checkIn.split(':').map(Number);
    const [h2, m2, s2] = now.split(':').map(Number);
    const hours = ((h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1)) / 3600;

    const r = await db.query(`
      UPDATE attendance_record
      SET check_out_time = $1, working_hours = $2, status = CASE WHEN $2 < 4 THEN 'early_leave' ELSE 'normal' END,
          device_no = COALESCE($3, device_no), remark = COALESCE($4, remark)
      WHERE id = $5 RETURNING *
    `, [now, Math.round(hours * 10) / 10, device_no || '', remark || '', exist.rows[0].id]);

    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

/**
 * GET /api/attendance/monthly
 * 月度考勤统计
 */
router.get('/monthly', async (req, res, next) => {
  try {
    const { year, month, dept_id } = req.query;
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || (now.getMonth() + 1);

    let where = ['1=1'];
    const params = [];
    let p = 0;
    if (dept_id) { where.push(`e.dept_id = $${++p}::uuid`); params.push(dept_id); }

    const whereSql = where.join(' AND ');

    const result = await db.query(`
      SELECT
        e.id as employee_id,
        e.employee_name,
        e.employee_no,
        COALESCE(d.dept_name, '未分配') as dept_name,
        COUNT(ar.id) as total_records,
        COUNT(ar.id) FILTER (WHERE ar.status = 'normal') as normal_count,
        COUNT(ar.id) FILTER (WHERE ar.status = 'late') as late_count,
        COUNT(ar.id) FILTER (WHERE ar.status = 'early_leave') as early_leave_count,
        COUNT(ar.id) FILTER (WHERE ar.status = 'absent') as absent_count,
        COUNT(ar.id) FILTER (WHERE ar.status = 'leave') as leave_count,
        ROUND(
          COUNT(ar.id) FILTER (WHERE ar.status = 'normal') * 100.0 /
          NULLIF(COUNT(ar.id), 0), 1
        ) as normal_rate,
        ROUND(SUM(ar.working_hours), 1) as total_hours,
        ROUND(AVG(ar.working_hours) FILTER (WHERE ar.status = 'normal'), 1) as avg_hours
      FROM employee e
      LEFT JOIN attendance_record ar ON e.id = ar.employee_id
        AND EXTRACT(YEAR FROM ar.record_date) = $${++p}
        AND EXTRACT(MONTH FROM ar.record_date) = $${++p}
      LEFT JOIN department d ON e.dept_id = d.id
      WHERE ${whereSql} AND e.status = 'active'
      GROUP BY e.id, e.employee_name, e.employee_no, d.dept_name
      ORDER BY d.dept_name, e.employee_no
    `, [y, m, ...params]);

    // 全勤人数
    const perfect = await db.query(`
      SELECT COUNT(*) as cnt FROM (
        SELECT e.id FROM employee e
        LEFT JOIN attendance_record ar ON e.id = ar.employee_id
          AND EXTRACT(YEAR FROM ar.record_date) = $1
          AND EXTRACT(MONTH FROM ar.record_date) = $2
        WHERE e.status = 'active'
        GROUP BY e.id
        HAVING COUNT(ar.id) FILTER (WHERE ar.status != 'normal') = 0
          AND COUNT(ar.id) >= 20
      ) t
    `, [y, m]);

    res.json({
      success: true,
      data: {
        year: y,
        month: m,
        list: result.rows,
        perfect_attendance_count: parseInt(perfect.rows[0].cnt)
      }
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/attendance/device-sync
 * 考勤机数据同步（支持指纹/刷卡/外接设备）
 * 接收格式: [{ employee_no, check_time, check_type }]
 */
router.post('/device-sync', async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: '缺少打卡记录' });
    }

    const results = [];
    for (const rec of records) {
      const { employee_no, check_time, check_type } = rec;
      if (!employee_no || !check_time) continue;

      const date = check_time.slice(0, 10);
      const time = check_time.slice(11, 19);

      // 查找员工
      const emp = await db.query(
        `SELECT id FROM employee WHERE employee_no = $1 AND status = 'active' LIMIT 1`,
        [employee_no]
      );
      if (emp.rows.length === 0) {
        results.push({ employee_no, status: 'not_found' });
        continue;
      }
      const employee_id = emp.rows[0].id;

      if (check_type === 'in' || check_type === 'check_in') {
        const exist = await db.query(
          `SELECT id FROM attendance_record WHERE employee_id = $1 AND record_date = $2`,
          [employee_id, date]
        );
        if (exist.rows.length === 0) {
          await db.query(
            `INSERT INTO attendance_record (employee_id, record_date, check_in_time, status)
             VALUES ($1::uuid, $2, $3, 'normal')`,
            [employee_id, date, time]
          );
          results.push({ employee_no, status: 'check_in_ok' });
        } else {
          results.push({ employee_no, status: 'already_checked_in' });
        }
      } else {
        const exist = await db.query(
          `SELECT id, check_in_time FROM attendance_record WHERE employee_id = $1 AND record_date = $2`,
          [employee_id, date]
        );
        if (exist.rows.length > 0) {
          const checkIn = exist.rows[0].check_in_time;
          const [h1, m1, s1] = checkIn.split(':').map(Number);
          const [h2, m2, s2] = time.split(':').map(Number);
          const hours = ((h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1)) / 3600;
          await db.query(
            `UPDATE attendance_record SET check_out_time = $1, working_hours = $2,
             status = CASE WHEN $2 < 4 THEN 'early_leave' ELSE 'normal' END
             WHERE id = $3`,
            [time, Math.round(hours * 10) / 10, exist.rows[0].id]
          );
          results.push({ employee_no, status: 'check_out_ok' });
        } else {
          results.push({ employee_no, status: 'no_check_in_record' });
        }
      }
    }

    res.json({ success: true, data: { synced: results.length, results } });
  } catch (err) { next(err); }
});

/**
 * POST /api/attendance/sync-from-deli
 * 从得力云手动同步打卡记录
 */
router.post('/sync-from-deli', async (req, res, next) => {
  try {
    const { hours = 24 } = req.body;
    const result = await deliService.pullAndSync(hours);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/deli-status
 * 获取得力云服务状态
 */
router.get('/deli-status', async (req, res) => {
  res.json({
    success: true,
    data: {
      configured: !!(process.env.DELI_APP_KEY && process.env.DELI_APP_SECRET),
      appKey: process.env.DELI_APP_KEY ? process.env.DELI_APP_KEY.slice(0, 8) + '***' : null,
      companyId: process.env.DELI_COMPANY_ID || null,
      syncInterval: parseInt(process.env.DELI_SYNC_INTERVAL || '3600000') / 1000 / 60 + '分钟'
    }
  });
});

module.exports = router;
