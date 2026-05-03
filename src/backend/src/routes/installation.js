/**
 * 安装管理路由
 * 表结构（实际数据库）:
 *   installation_task      - 安装任务主表
 *   installation_progress   - 安装进度记录
 *   installation_accept    - 安装验收记录
 *   installation_visit     - 安装回访记录
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../utils/logger');

function generateTaskNo() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `INS${dateStr}${random}`;
}

/**
 * GET /api/installation
 * GET /api/installation/list
 * 安装任务列表
 */
router.get(['/', '/list'], async (req, res, next) => {
  try {
    const { page = 1, page_size = 20, status, keyword, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    const params = [];
    let c = 0;

    if (status) { where.push(`it.status = $${++c}`); params.push(status); }
    if (keyword) {
      where.push(`(it.task_no LIKE $${++c} OR it.install_address LIKE $${++c} OR om.order_no LIKE $${++c})`);
      params.push(`%${keyword}%`); c++;
    }
    if (start_date) { where.push(`it.appointment_date >= $${++c}`); params.push(start_date); }
    if (end_date) { where.push(`it.appointment_date <= $${++c}`); params.push(end_date); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT it.*, om.order_no, om.delivery_address, om.delivery_contact, om.delivery_phone
       FROM installation_task it
       LEFT JOIN order_master om ON it.order_id = om.id
       ${whereStr}
       ORDER BY it.appointment_date DESC NULLS LAST, it.created_at DESC
       LIMIT $${c + 1} OFFSET $${c + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM installation_task it ${whereStr}`,
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
  } catch (err) { next(err); }
});

/**
 * GET /api/installation/:id
 * 安装任务详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // UUID格式校验，防止 /tasks 等被误匹配到 /:id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的任务ID格式' });
    }

    const task = await db.query(
      `SELECT it.*, om.order_no, om.delivery_address, om.delivery_contact, om.delivery_phone,
              c.customer_name, c.phone as customer_phone, d.dealer_name
       FROM installation_task it
       LEFT JOIN order_master om ON it.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       LEFT JOIN dealer d ON om.dealer_id = d.id
       WHERE it.id = $1`,
      [id]
    );

    if (task.rows.length === 0) {
      return res.status(404).json({ success: false, message: '安装任务不存在' });
    }

    const [progress, accept, visit] = await Promise.all([
      db.query(`SELECT * FROM installation_progress WHERE task_id = $1 ORDER BY created_at ASC`, [id]),
      db.query(`SELECT * FROM installation_accept WHERE task_id = $1 ORDER BY created_at ASC`, [id]),
      db.query(`SELECT * FROM installation_visit WHERE task_id = $1 ORDER BY visit_date DESC`, [id])
    ]);

    res.json({
      success: true,
      data: {
        ...task.rows[0],
        progress: progress.rows,
        accept: accept.rows,
        visit: visit.rows
      }
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/installation
 * 创建安装任务
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      order_id, install_province, install_city, install_district, install_address,
      install_contact, install_phone, appointment_date, appointment_remark,
      leader_id, leader_name, remark
    } = req.body;

    if (!order_id) return res.status(400).json({ success: false, message: 'order_id 不能为空' });
    if (!appointment_date) return res.status(400).json({ success: false, message: 'appointment_date 不能为空' });

    const existing = await db.query(
      `SELECT id, task_no FROM installation_task WHERE order_id = $1 LIMIT 1`,
      [order_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: `该订单已有安装任务: ${existing.rows[0].task_no}` });
    }

    const id = uuidv4();
    const taskNo = generateTaskNo();

    await db.query(
      `INSERT INTO installation_task
       (id, task_no, order_id, install_province, install_city, install_district,
        install_address, install_contact, install_phone, appointment_date, appointment_remark,
        leader_id, leader_name, status, remark, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'scheduled', $14, NOW())`,
      [id, taskNo, order_id, install_province, install_city, install_district,
       install_address, install_contact, install_phone, appointment_date, appointment_remark,
       leader_id, leader_name, remark]
    );

    // 同步订单安装状态
    await db.query(
      `UPDATE order_master SET installation_status = 'scheduled' WHERE id = $1`,
      [order_id]
    );

    logger.info(`创建安装任务: ${taskNo}, order_id=${order_id}`);
    res.json({ success: true, data: { id, task_no: taskNo } });
  } catch (err) { next(err); }
});

/**
 * PUT /api/installation/:id
 * 更新安装任务
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的任务ID格式' });
    }
    const {
      status, appointment_date, appointment_remark,
      install_contact, install_phone, install_address,
      leader_id, leader_name, remark
    } = req.body;

    const updates = [];
    const params = [];
    let c = 0;

    if (status) {
      updates.push(`status = $${++c}`);
      params.push(status);
      if (status === 'in_progress') {
        updates.push(`actual_start = COALESCE(actual_start, NOW())`);
      } else if (status === 'completed') {
        updates.push(`actual_complete = NOW()`);
        // 查找订单ID，同步订单状态为 'installed'（安装完成待收款）
        const taskRow = await db.query(
          `SELECT order_id FROM installation_task WHERE id = $1`,
          [id]
        );
        if (taskRow.rows.length > 0) {
          const orderId = taskRow.rows[0].order_id;
          await db.query(
            `UPDATE order_master SET order_status = 'installed', updated_at = NOW() WHERE id = $1`,
            [orderId]
          );
          // 触发佣金生成（安装完成 = 业务完成）
          try {
            require('../services/commissionService').autoGenerate(orderId);
          } catch (e) {
            logger.error('安装完成触发佣金失败:', e.message);
          }
        }
      }
    }
    if (appointment_date !== undefined) { updates.push(`appointment_date = $${++c}`); params.push(appointment_date); }
    if (appointment_remark !== undefined) { updates.push(`appointment_remark = $${++c}`); params.push(appointment_remark); }
    if (install_contact !== undefined) { updates.push(`install_contact = $${++c}`); params.push(install_contact); }
    if (install_phone !== undefined) { updates.push(`install_phone = $${++c}`); params.push(install_phone); }
    if (install_address !== undefined) { updates.push(`install_address = $${++c}`); params.push(install_address); }
    if (leader_id !== undefined) { updates.push(`leader_id = $${++c}`); params.push(leader_id); }
    if (leader_name !== undefined) { updates.push(`leader_name = $${++c}`); params.push(leader_name); }
    if (remark !== undefined) { updates.push(`remark = $${++c}`); params.push(remark); }

    if (updates.length === 0) {
      return res.json({ success: true, message: '无更新内容' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await db.query(
      `UPDATE installation_task SET ${updates.join(', ')} WHERE id = $${++c}`,
      params
    );

    // 同步订单安装状态
    if (status) {
      await db.query(
        `UPDATE order_master SET installation_status = $1 WHERE id = (SELECT order_id FROM installation_task WHERE id = $2)`,
        [status, id]
      );
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * POST /api/installation/:id/progress
 * 添加安装进度
 */
router.post('/:id/progress', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的任务ID格式' });
    }
    const { progress, stage, stage_name, description, photos } = req.body;

    if (progress === undefined) return res.status(400).json({ success: false, message: 'progress 不能为空' });

    // 检查是否已有进度记录
    const existing = await db.query(
      `SELECT id FROM installation_progress WHERE task_id = $1 AND stage = $2 LIMIT 1`,
      [id, stage]
    );

    if (existing.rows.length > 0) {
      // 更新
      await db.query(
        `UPDATE installation_progress SET progress = $1, description = $2, photos = $3, updated_at = NOW()
         WHERE id = $4`,
        [progress, description, photos ? JSON.stringify(photos) : null, existing.rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO installation_progress (id, task_id, progress, stage, stage_name, description, photos, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [uuidv4(), id, progress, stage, stage_name, description, photos ? JSON.stringify(photos) : null]
      );
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * POST /api/installation/:id/accept
 * 添加验收记录
 */
router.post('/:id/accept', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的任务ID格式' });
    }
    const { accept_type, self_check_result, self_check_by, self_check_at,
            factory_check_result, factory_check_by, factory_check_at,
            customer_sign_result, customer_sign_photos, customer_sign_date,
            issue_list, remark } = req.body;

    if (!accept_type) return res.status(400).json({ success: false, message: 'accept_type 不能为空' });

    await db.query(
      `INSERT INTO installation_accept
       (id, task_id, accept_type, self_check_result, self_check_by, self_check_at,
        factory_check_result, factory_check_by, factory_check_at,
        customer_sign_result, customer_sign_photos, customer_sign_date,
        issue_list, remark, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [uuidv4(), id, accept_type, self_check_result, self_check_by, self_check_at || new Date(),
       factory_check_result, factory_check_by, factory_check_at,
       customer_sign_result, customer_sign_photos ? JSON.stringify(customer_sign_photos) : null,
       customer_sign_date || new Date(), issue_list ? JSON.stringify(issue_list) : null, remark]
    );

    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * POST /api/installation/:id/visit
 * 添加回访记录
 */
router.post('/:id/visit', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的任务ID格式' });
    }
    const { visit_type, visit_date, satisfaction, quality_score, service_score,
            feedback, issue_list, handle_status, visitor_id, visitor_name } = req.body;

    if (!visit_type || !visit_date) {
      return res.status(400).json({ success: false, message: 'visit_type 和 visit_date 不能为空' });
    }

    await db.query(
      `INSERT INTO installation_visit
       (id, task_id, visit_type, visit_date, satisfaction, quality_score, service_score,
        feedback, issue_list, handle_status, visitor_id, visitor_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [uuidv4(), id, visit_type, visit_date, satisfaction, quality_score, service_score,
       feedback, issue_list ? JSON.stringify(issue_list) : null, handle_status || 'pending',
       visitor_id, visitor_name]
    );

    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/installation/:id
 * 删除安装任务
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的任务ID格式' });
    }

    const rec = await db.query(`SELECT order_id FROM installation_task WHERE id = $1`, [id]);
    if (rec.rows.length === 0) {
      return res.status(404).json({ success: false, message: '安装任务不存在' });
    }
    const orderId = rec.rows[0].order_id;

    await db.query(`DELETE FROM installation_progress WHERE task_id = $1`, [id]);
    await db.query(`DELETE FROM installation_accept WHERE task_id = $1`, [id]);
    await db.query(`DELETE FROM installation_visit WHERE task_id = $1`, [id]);
    await db.query(`DELETE FROM installation_task WHERE id = $1`, [id]);

    await db.query(`UPDATE order_master SET installation_status = NULL WHERE id = $1`, [orderId]);

    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

module.exports = router;
