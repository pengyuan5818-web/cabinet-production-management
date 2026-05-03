/**
 * 员工管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/employees
 * 员工列表
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, dept_id, position, status, keyword } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (dept_id) {
      // Cast to UUID if valid UUID string, otherwise skip
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(dept_id));
      if (isUUID) {
        whereClause.push(`e.dept_id = $${++paramCount}::uuid`);
        params.push(String(dept_id));
      }
    }
    if (position) {
      whereClause.push(`e.position = $${++paramCount}`);
      params.push(position);
    }
    if (status) {
      whereClause.push(`e.status = $${++paramCount}`);
      params.push(status);
    }
    if (keyword) {
      whereClause.push(`(e.employee_name LIKE $${paramCount + 1} OR e.employee_no LIKE $${paramCount + 1} OR e.phone LIKE $${paramCount + 1})`);
      params.push(`%${keyword}%`);
      paramCount++;
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT e.*, d.dept_name, u.unit_name as id_card_type_name
       FROM employee e
       LEFT JOIN department d ON e.dept_id = d.id
       LEFT JOIN unit u ON e.id_card_type = u.unit_code
       ${where}
       ORDER BY e.employee_no
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM employee e ${where}`,
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
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/:id
 * 员工详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的员工ID格式' });
    }

    const result = await db.query(
      `SELECT e.*, d.dept_name
       FROM employee e
       LEFT JOIN department d ON e.dept_id = d.id
       WHERE e.id = $1::uuid`,
      [id]
    );

    if (result.rows.length === 0) {
    }

    // 获取考勤统计（本月）
    const attendanceResult = await db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'normal') as normal_days,
        COUNT(*) FILTER (WHERE status = 'late') as late_days,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'leave') as leave_days,
        SUM(working_hours) as total_hours
       FROM attendance_record
       WHERE employee_id = $1
         AND DATE(record_date) >= DATE_TRUNC('month', CURRENT_DATE)
         AND DATE(record_date) <= CURRENT_DATE`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        attendance: attendanceResult.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees
 * 创建员工
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      employee_no, employee_name, id_card_type, id_card_no,
      gender, birth_date, phone, email, address,
      dept_id, position, employee_type, hire_date,
      bank_name, bank_account, emergency_contact, emergency_phone
    } = req.body;

    // 生成员工编号
    const empNo = employee_no || `EMP${Date.now()}`;

    const result = await db.query(
      `INSERT INTO employee (
        employee_no, employee_name, id_card_type, id_card_no,
        gender, birth_date, phone, email, address,
        dept_id, position, employee_type, hire_date,
        bank_name, bank_account, emergency_contact, emergency_phone,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active', NOW())
      RETURNING *`,
      [empNo, employee_name, id_card_type, id_card_no,
       gender, birth_date, phone, email, address,
       dept_id, position, employee_type, hire_date,
       bank_name, bank_account, emergency_contact, emergency_phone]
    );

    logger.info(`创建员工: ${employee_name}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '员工创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/employees/:id
 * 更新员工
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const allowedFields = [
      'employee_name', 'id_card_type', 'id_card_no', 'gender', 'birth_date',
      'phone', 'email', 'address', 'dept_id', 'position', 'employee_type',
      'bank_name', 'bank_account', 'emergency_contact', 'emergency_phone', 'status'
    ];

    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${++paramCount}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有有效字段更新' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE employee SET ${updates.join(', ')} WHERE id = $${paramCount + 1}::uuid RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: '员工更新成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/employees/:id
 * 删除员工
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM employee WHERE id = $1::uuid', [id]);

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/:id/attendance
 * 员工考勤记录
 */
router.get('/:id/attendance', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, page = 1, page_size = 31 } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['employee_id = $1'];
    const params = [id];
    let paramCount = 1;

    if (start_date) {
      whereClause.push(`record_date >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      whereClause.push(`record_date <= $${++paramCount}`);
      params.push(end_date);
    }

    params.push(page_size, offset);

    const result = await db.query(
      `SELECT * FROM attendance_record
       WHERE ${whereClause.join(' AND ')}
       ORDER BY record_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      success: true,
      data: {
        list: result.rows,
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees/attendance/check-in
 * 打卡
 */
router.post('/attendance/check-in', async (req, res, next) => {
  try {
    const { employee_id, device_id, location, photo_url } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: '员工ID不能为空' });
    }

    const now = new Date();
    const recordDate = now.toISOString().slice(0, 10);
    const checkTime = now.toTimeString().slice(0, 8);

    // 检查今日是否已打卡
    const exist = await db.query(
      `SELECT id, check_in_time FROM attendance_record 
       WHERE employee_id = $1 AND record_date = $2`,
      [employee_id, recordDate]
    );

    let result;

    if (exist.rows.length > 0) {
      const workStartTime = '09:00:00';
      const status = checkTime > workStartTime ? 'late' : 'normal';

      result = await db.query(
        `UPDATE attendance_record SET 
         check_in_time = $1, check_in_device = $2,
         check_in_location = $3, check_in_photo = $4,
         status = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [checkTime, device_id, location, photo_url, status, exist.rows[0].id]
      );
    } else {
      result = await db.query(
        `INSERT INTO attendance_record (
          employee_id, record_date, check_in_time, check_in_device,
          check_in_location, check_in_photo, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'normal', NOW())
        RETURNING *`,
        [employee_id, recordDate, checkTime, device_id, location, photo_url]
      );
    }

    logger.info(`打卡: employee=${employee_id}, time=${checkTime}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '打卡成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees/attendance/check-out
 * 打卡下班
 */
router.post('/attendance/check-out', async (req, res, next) => {
  try {
    const { employee_id, device_id, location, photo_url } = req.body;

    const now = new Date();
    const recordDate = now.toISOString().slice(0, 10);
    const checkTime = now.toTimeString().slice(0, 8);

    // 检查今日是否已打卡上班
    const exist = await db.query(
      `SELECT id, check_in_time FROM attendance_record 
       WHERE employee_id = $1 AND record_date = $2`,
      [employee_id, recordDate]
    );

    if (exist.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
      });
    }

    // 计算工作时长
    const checkInTime = exist.rows[0].check_in_time;
    const [inH, inM, inS] = checkInTime.split(':').map(Number);
    const [outH, outM, outS] = checkTime.split(':').map(Number);
    const workMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    const workHours = Math.max(0, workMinutes / 60).toFixed(2);

    const result = await db.query(
      `UPDATE attendance_record SET 
       check_out_time = $1, check_out_device = $2,
       check_out_location = $3, check_out_photo = $4,
       working_hours = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [checkTime, device_id, location, photo_url, workHours, exist.rows[0].id]
    );

    logger.info(`下班打卡: employee=${employee_id}, time=${checkTime}, hours=${workHours}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '下班打卡成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/departments
 * 部门列表
 */
router.get('/departments', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT d.*, 
              COUNT(e.id) as employee_count,
              p.person_name as manager_name
       FROM department d
       LEFT JOIN employee e ON d.id = e.dept_id AND e.status != 'resigned'
       LEFT JOIN person p ON d.manager_id = p.id
       GROUP BY d.id, p.person_name
       ORDER BY d.dept_code`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/salary/:employee_id
 * 员工工资记录
 */
router.get('/salary/:employee_id', async (req, res, next) => {
  try {
    const { employee_id } = req.params;
    const { year, month } = req.query;

    let whereClause = ['employee_id = $1'];
    const params = [employee_id];
    let paramCount = 1;

    if (year) {
      whereClause.push(`EXTRACT(YEAR FROM salary_month) = $${++paramCount}`);
      params.push(year);
    }
    if (month) {
      whereClause.push(`EXTRACT(MONTH FROM salary_month) = $${++paramCount}`);
      params.push(month);
    }

    const result = await db.query(
      `SELECT * FROM salary_record
       WHERE ${whereClause.join(' AND ')}
       ORDER BY salary_month DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/attendance
 * 考勤记录列表（顶层考勤查询）
 * 来自前端: 无直接调用，但提供统一查询入口
 */
router.get('/attendance', async (req, res, next) => {
  try {
    const { start_date, end_date, dept_id, keyword, page = 1, page_size = 50 } = req.query;
    let where = ['1=1'];
    const params = [];
    let c = 0;
    if (start_date) { where.push(`ar.record_date >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`ar.record_date <= $${++c}`); params.push(end_date); }
    if (dept_id) { where.push(`e.dept_id = $${++c}::uuid`); params.push(dept_id); }
    if (keyword) { where.push(`(e.employee_name LIKE $${++c} OR e.employee_no LIKE $${++c})`); params.push(`%${keyword}%`); }
    const offset = (page - 1) * page_size;
    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);
    const result = await db.query(`
      SELECT ar.*, e.employee_name, e.employee_no, d.dept_name
      FROM attendance_record ar
      JOIN employee e ON ar.employee_id = e.id
      LEFT JOIN department d ON e.dept_id = d.id
      ${whereStr}
      ORDER BY ar.record_date DESC
      LIMIT $${c + 1} OFFSET $${c + 2}
    `, params);
    const countResult = await db.query(`SELECT COUNT(*) FROM attendance_record ar JOIN employee e ON ar.employee_id = e.id ${whereStr}`, params.slice(0, -2));
    res.json({ success: true, data: { list: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) } });
  } catch (err) { next(err); }
});

module.exports = router;
