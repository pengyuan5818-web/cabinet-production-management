/**
 * 订单管理路由
 * 功能: 订单CRUD、状态流转、二维码生成、追踪
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const logger = require('../utils/logger');

/* =========================================================
 * 状态流转配置
 * ========================================================= */
const validTransitions = {
  'pending': ['producing', 'cancelled'],
  'producing': ['shipped', 'cancelled'],
  'shipped': ['installed'],   // 物流签收后由安装确认接口更新
  'installed': [],            // 不能通过status接口转completed，只能收款触发
  'completed': [],
  'cancelled': []
};

/* =========================================================
 * 辅助函数
 * ========================================================= */
function generateOrderNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ORD${dateStr}${seq}`;
}

function generateLogNo() {
  return `LOG${Date.now()}`;
}

function generateInstallTaskNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  // 当日序号：查询当日最大序号+1
  return `INS${dateStr}XXXX`; // 实际序号在插入时补全
}

async function getNextInstallSeq(dateStr) {
  const result = await db.query(
    `SELECT task_no FROM installation_task
     WHERE task_no LIKE $1
     ORDER BY task_no DESC LIMIT 1`,
    [`INS${dateStr}%`]
  );
  if (result.rows.length === 0) return '0001';
  const lastNo = result.rows[0].task_no;
  const lastSeq = parseInt(lastNo.slice(-4), 10);
  return String(lastSeq + 1).padStart(4, '0');
}

/* =========================================================
 * GET / - 订单列表（支持分页、筛选）
 * ========================================================= */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      page_size = 20,
      status,
      dealer_id,
      customer_id,
      order_no,
      start_date,
      end_date,
      source_type
    } = req.query;

    const offset = (page - 1) * page_size;
    const conditions = ['1=1'];
    const params = [];
    let paramCount = 0;

    // 权限过滤：经销商只能看自己的订单
    if (req.user.type === 'dealer') {
      conditions.push(`o.dealer_id = $${++paramCount}`);
      params.push(req.user.dealerId);
    }

    if (status) {
      conditions.push(`o.order_status = $${++paramCount}`);
      params.push(status);
    }
    if (dealer_id) {
      conditions.push(`o.dealer_id = $${++paramCount}`);
      params.push(dealer_id);
    }
    if (customer_id) {
      conditions.push(`o.customer_id = $${++paramCount}`);
      params.push(customer_id);
    }
    if (order_no) {
      conditions.push(`o.order_no LIKE $${++paramCount}`);
      params.push(`%${order_no}%`);
    }
    if (start_date) {
      conditions.push(`o.created_at >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      conditions.push(`o.created_at <= $${++paramCount}`);
      params.push(end_date);
    }
    if (source_type) {
      conditions.push(`o.source_type = $${++paramCount}`);
      params.push(source_type);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const queryParams = [...params, parseInt(page_size), parseInt(offset)];

    const result = await db.query(
      `SELECT o.*,
              d.dealer_name,
              c.customer_name, c.phone as customer_phone,
              dr.design_no
       FROM order_master o
       LEFT JOIN dealer d ON o.dealer_id = d.id
       LEFT JOIN customer c ON o.customer_id = c.id
       LEFT JOIN design_record dr ON o.design_id = dr.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      queryParams
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM order_master o ${whereClause}`,
      params
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

/* =========================================================
 * GET /:id - 订单详情
 * ========================================================= */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }

    const orderResult = await db.query(
      `SELECT o.*,
              d.dealer_name, d.contact_person as dealer_contact, d.phone as dealer_phone,
              c.customer_name, c.phone as customer_phone, c.address as customer_address,
              dr.design_no, dr.design_file
       FROM order_master o
       LEFT JOIN dealer d ON o.dealer_id = d.id
       LEFT JOIN customer c ON o.customer_id = c.id
       LEFT JOIN design_record dr ON o.design_id = dr.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = orderResult.rows[0];

    // 权限校验
    if (req.user.type === 'dealer' && order.dealer_id !== req.user.dealerId) {
      return res.status(403).json({ success: false, message: '无权访问此订单' });
    }

    // 订单明细
    const detailResult = await db.query(
      `SELECT * FROM order_detail WHERE order_id = $1`,
      [id]
    );

    // 订单追踪
    const trackingResult = await db.query(
      `SELECT * FROM order_tracking WHERE order_id = $1 ORDER BY created_at`,
      [id]
    );

    // 橱柜板件数据
    const boardResult = await db.query(
      `SELECT id, board_no, cabinet_no, cabinet_name, board_name, board_type,
              material, color, length, width, thickness, quantity,
              edge_left, edge_right, edge_top, edge_bottom,
              status, current_location, barcode, created_at
       FROM cabinet_board WHERE order_id = $1 ORDER BY created_at`,
      [id]
    );
    const boardStats = await db.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN status = 'scanned' THEN 1 ELSE 0 END) as scanned
       FROM cabinet_board WHERE order_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...order,
        details: detailResult.rows,
        tracking: trackingResult.rows,
        boards: {
          total: parseInt(boardStats.rows[0].total),
          pending: parseInt(boardStats.rows[0].pending),
          scanned: parseInt(boardStats.rows[0].scanned),
          list: boardResult.rows
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * POST / - 创建订单（状态 = pending）
 * ========================================================= */
router.post('/', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const {
      source_type = 'factory',
      dealer_id,
      customer_id,
      customer_name,
      city,
      district,
      address,
      design_id,
      expected_delivery,
      delivery_address,
      delivery_contact,
      delivery_phone,
      installation_required = true,
      remark
    } = req.body;

    // 解析客户
    let resolvedCustomerId = customer_id;
    if (!resolvedCustomerId && customer_name) {
      const existCustomer = await db.query(
        `SELECT id FROM customer WHERE customer_name = $1 LIMIT 1`,
        [customer_name]
      );
      if (existCustomer.rows.length > 0) {
        resolvedCustomerId = existCustomer.rows[0].id;
      } else {
        const customerNo = 'C' + Date.now();
        const newCust = await db.query(
          `INSERT INTO customer (customer_no, customer_name, phone, province, city, district, address, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ordered', NOW()) RETURNING id`,
          [customerNo, customer_name, delivery_phone || '', '', city || '', district || '', address || delivery_address || '']
        );
        resolvedCustomerId = newCust.rows[0].id;
      }
    }

    // 解析经销商
    let resolvedDealerId = dealer_id;
    if (!resolvedDealerId && req.body.dealer_name) {
      const existDealer = await db.query(
        `SELECT id FROM dealer WHERE dealer_name = $1 LIMIT 1`,
        [req.body.dealer_name]
      );
      if (existDealer.rows.length > 0) {
        resolvedDealerId = existDealer.rows[0].id;
      }
    }

    // 生成订单号
    const orderNo = generateOrderNo();

    // 生成二维码内容（使用订单号作为二维码值）
    const qrCode = orderNo;

    await client.query('BEGIN');

    // 创建订单（直接从 pending 开始，跳过 draft）
    const orderResult = await client.query(
      `INSERT INTO order_master (
          order_no, qr_code, source_type, dealer_id, customer_id, design_id,
          expected_delivery, delivery_address, delivery_contact, delivery_phone,
          installation_required, order_status, remark, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, NOW())
        RETURNING *`,
      [orderNo, qrCode, source_type, resolvedDealerId || null, resolvedCustomerId || null, design_id || null,
       expected_delivery || null, delivery_address || null, delivery_contact || null, delivery_phone || null,
       installation_required, remark || '']
    );

    const order = orderResult.rows[0];

    // 创建初始追踪记录（订单确认）
    await client.query(
      `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, created_at)
       VALUES ($1, 'order_confirmed', '订单确认', 'completed', NOW())`,
      [order.id]
    );

    // 更新客户状态
    if (resolvedCustomerId) {
      await client.query(
        `UPDATE customer SET status = 'ordered', updated_at = NOW() WHERE id = $1`,
        [resolvedCustomerId]
      );
    }

    await client.query('COMMIT');

    logger.info(`创建订单: ${orderNo}`);

    res.json({
      success: true,
      data: order,
      message: '订单创建成功'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/* =========================================================
 * PUT /:id - 更新订单
 * ========================================================= */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const {
      expected_delivery,
      delivery_address,
      delivery_contact,
      delivery_phone,
      installation_required,
      remark
    } = req.body;

    const check = await db.query(
      `SELECT order_status FROM order_master WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    if (check.rows[0].order_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只有确认前（pending/draft）的订单可以修改'
      });
    }

    const result = await db.query(
      `UPDATE order_master SET
       expected_delivery = COALESCE($1, expected_delivery),
       delivery_address = COALESCE($2, delivery_address),
       delivery_contact = COALESCE($3, delivery_contact),
       delivery_phone = COALESCE($4, delivery_phone),
       installation_required = COALESCE($5, installation_required),
       remark = COALESCE($6, remark),
       updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [expected_delivery, delivery_address, delivery_contact, delivery_phone,
       installation_required, remark, id]
    );

    logger.info(`更新订单: ${result.rows[0].order_no}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '订单更新成功'
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * DELETE /:id - 删除订单（仅 pending/draft 可删）
 * ========================================================= */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }

    const check = await db.query(
      `SELECT order_status FROM order_master WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const status = check.rows[0].order_status;
    if (status !== 'pending' && status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有 pending 或 draft 状态的订单可以删除'
      });
    }

    await db.query('DELETE FROM order_master WHERE id = $1', [id]);

    res.json({ success: true, message: '订单已删除' });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * POST /:id/submit - 提交订单（pending → producing）
 * ========================================================= */
router.post('/:id/submit', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }

    await client.query('BEGIN');

    const check = await client.query(
      `SELECT * FROM order_master WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = check.rows[0];

    if (order.order_status === 'producing') {
      // 幂等：已提交直接返回成功
      await client.query('ROLLBACK');
      return res.json({ success: true, message: '订单已提交' });
    }

    if (order.order_status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `当前状态"${order.order_status}"不能提交生产，需要先确认订单（pending）`
      });
    }

    // 更新状态 → producing（生产中）
    await client.query(
      `UPDATE order_master SET order_status = 'producing', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // 添加追踪记录（幂等：重复提交不会插入冲突记录）
    await client.query(
      `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, created_at)
       VALUES ($1, 'order_confirmed', '订单确认', 'completed', NOW())
       ON CONFLICT ON CONSTRAINT order_tracking_order_id_current_stage_key DO NOTHING`,
      [id]
    );

    // 使用 upsert 方式避免重复键错误
    await client.query(
      `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, created_at)
       VALUES ($1, 'design_confirmed', '设计确认', 'completed', NOW())
       ON CONFLICT ON CONSTRAINT order_tracking_order_id_current_stage_key DO NOTHING`,
      [id]
    );

    await client.query(
      `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, created_at)
       VALUES ($1, 'material_prepared', '材料准备', 'pending', NOW())
       ON CONFLICT ON CONSTRAINT order_tracking_order_id_current_stage_key DO NOTHING`,
      [id]
    );

    await client.query('COMMIT');

    logger.info(`提交订单: ${order.order_no}`);

    res.json({
      success: true,
      message: '订单已提交，进入生产流程'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/* =========================================================
 * POST /:id/status - 状态更新（validTransitions 控制）
 * ========================================================= */
router.post('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const { status, remark } = req.body;

    const check = await db.query(
      `SELECT order_status, order_no, dealer_id FROM order_master WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const currentStatus = check.rows[0].order_status;
    const dealerId = check.rows[0].dealer_id;

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `不能从 ${currentStatus} 切换为 ${status}`
      });
    }

    const result = await db.query(
      `UPDATE order_master SET order_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    // 记录操作日志
    await db.query(
      `INSERT INTO operation_log (log_no, module, action, operator_id, operator_name, biz_type, biz_id, biz_no, before_value, after_value, remark, created_at)
       VALUES ($1, 'order', 'status_change', $2, $3, 'order', $4, $5, $6, $7, $8, NOW())`,
      [generateLogNo(), req.user.id, req.user.realName, id, check.rows[0].order_no,
       currentStatus, status, remark || null]
    );

    logger.info(`订单状态变更: ${check.rows[0].order_no} ${currentStatus} -> ${status}`);

    // Webhook：通知经销商订单状态变更
    if (dealerId) {
      try {
        require('../services/webhookService').trigger(dealerId, 'order.status_changed', {
          order_no: check.rows[0].order_no,
          from_status: currentStatus,
          to_status: status,
          operator: req.user?.realName || 'system',
          remark
        });
      } catch (e) {
        logger.error('Webhook trigger error:', e);
      }
    }

    // 佣金自动生成：订单完成时
    if (status === 'completed' && dealerId) {
      try {
        require('../services/commissionService').autoGenerate(id);
      } catch (e) {
        logger.error('佣金自动生成失败:', e);
      }
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `订单状态已更新为 ${status}`
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * POST /:id/delivery - 物流签收确认（shipped 时调用）
 * ========================================================= */
router.post('/:id/delivery', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const { signed_by, signature_url, delivery_photos, remark } = req.body;

    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT order_status, order_no, dealer_id, installation_required,
              delivery_contact, delivery_phone, delivery_address
       FROM order_master WHERE id=$1 FOR UPDATE`,
      [id]
    );

    if (!orderRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = orderRes.rows[0];

    if (order.order_status !== 'shipped') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `当前订单状态为"${order.order_status}"，需要"shipped"才能确认物流签收`
      });
    }

    // 1. 创建 order_delivery 记录
    const deliveryId = uuidv4();
    await client.query(
      `INSERT INTO order_delivery (id, order_id, order_no, signed_by, signature_url, delivery_photos, delivered_at, remark, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,NOW())`,
      [deliveryId, id, order.order_no, signed_by, signature_url,
       JSON.stringify(delivery_photos || []), remark || '']
    );

    // 2. 更新 logistics_record 状态为 delivered
    await client.query(
      `UPDATE logistics_record SET status = 'delivered', updated_at = NOW()
       WHERE order_id = $1 AND status != 'delivered'`,
      [id]
    );

    let installationTaskId = null;

    // 3. 如果需要安装：自动创建安装任务，订单状态保持 shipped
    if (order.installation_required) {
      // 查询最新的 logistics_id
      const logisticsRes = await client.query(
        `SELECT id FROM logistics_record WHERE order_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [id]
      );
      const logisticsId = logisticsRes.rows[0]?.id || null;

      // 生成安装任务编号
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const seq = await getNextInstallSeq(dateStr);
      const taskNo = `INS${dateStr}${seq}`;

      installationTaskId = uuidv4();
      await client.query(
        `INSERT INTO installation_task (
           id, task_no, order_id, logistics_id,
           install_contact, install_phone, install_address,
           status, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW(),NOW())`,
        [installationTaskId, taskNo, id, logisticsId,
         order.delivery_contact || '', order.delivery_phone || '', order.delivery_address || '']
      );
    }

    // 4. 更新订单状态
    if (order.installation_required) {
      // 保持 shipped，等待安装完成
      await client.query(
        `UPDATE order_master SET updated_at=NOW() WHERE id=$1`,
        [id]
      );
    } else {
      // 不需要安装，订单直接完成
      await client.query(
        `UPDATE order_master SET order_status='completed', updated_at=NOW() WHERE id=$1`,
        [id]
      );
    }

    // 5. 创建追踪记录
    await client.query(
      `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, stage_remark, created_at)
       VALUES ($1, 'installation', '上门安装', 'pending', '物流已签收，等待安装师傅预约', NOW())`,
      [id]
    );

    // 6. Webhook：通知经销商
    if (order.dealer_id) {
      try {
        require('../services/webhookService').trigger(order.dealer_id, 'order.status_changed', {
          order_no: order.order_no,
          from_status: 'shipped',
          to_status: order.installation_required ? 'shipped' : 'completed',
          operator: req.user?.realName || 'system',
          message: order.installation_required
            ? '物流已签收，安装任务已创建，等待安装师傅预约时间'
            : '物流已签收，订单已完成'
        });
      } catch (e) {
        logger.error('Webhook trigger error:', e);
      }
    }

    await client.query('COMMIT');
    logger.info(`物流签收完成: order=${order.order_no}, installation_task=${installationTaskId}`);

    res.json({
      success: true,
      message: order.installation_required
        ? '物流已签收，安装任务已自动创建，等待安装师傅预约时间'
        : '物流已签收，订单已完成',
      data: {
        delivery_id: deliveryId,
        installation_task_id: installationTaskId
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/* =========================================================
 * GET /:id/tracking - 订单追踪
 * ========================================================= */
router.get('/:id/tracking', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const result = await db.query(
      `SELECT * FROM order_tracking WHERE order_id = $1 ORDER BY created_at`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * POST /:id/qrcode/generate - 生成二维码
 * ========================================================= */
router.post('/:id/qrcode/generate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }

    const orderResult = await db.query(
      `SELECT order_no FROM order_master WHERE id = $1`,
      [id]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const orderNo = orderResult.rows[0].order_no;
    const qrCodeValue = orderNo;

    // 生成二维码图片（base64 data URL）
    const qrDataUrl = await QRCode.toDataURL(qrCodeValue, { width: 300 });

    // 更新订单二维码字段
    await db.query(
      `UPDATE order_master SET qr_code = $1, updated_at = NOW() WHERE id = $2`,
      [qrCodeValue, id]
    );

    res.json({
      success: true,
      data: {
        order_no: orderNo,
        qr_code: qrCodeValue,
        qr_image: qrDataUrl
      }
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * GET /:id/qrcode - 获取二维码
 * ========================================================= */
router.get('/:id/qrcode', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const { size = 300 } = req.query;

    const result = await db.query(
      `SELECT order_no, qr_code FROM order_master WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const qrCodeValue = result.rows[0].qr_code || result.rows[0].order_no;
    const qrDataUrl = await QRCode.toDataURL(qrCodeValue, {
      width: parseInt(size)
    });

    res.json({
      success: true,
      data: {
        order_no: result.rows[0].order_no,
        qr_code: qrCodeValue,
        qr_image: qrDataUrl
      }
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * GET /stats/summary - 统计汇总
 * ========================================================= */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE order_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE order_status = 'producing') as producing_count,
        COUNT(*) FILTER (WHERE order_status = 'shipped') as shipped_count,
        COUNT(*) FILTER (WHERE order_status = 'installed') as installed_count,
        COUNT(*) FILTER (WHERE order_status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE order_status = 'cancelled') as cancelled_count,
        COUNT(*) as total_count,
        SUM(total_amount) FILTER (WHERE order_status NOT IN ('cancelled')) as total_amount,
        SUM(balance_amount) FILTER (WHERE order_status NOT IN ('cancelled', 'completed')) as total_pending
       FROM order_master`
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * GET /stats/daily - 每日统计
 * ========================================================= */
router.get('/stats/daily', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await db.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COUNT(*) FILTER (WHERE order_status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE order_status = 'cancelled') as cancelled_count,
        SUM(total_amount) FILTER (WHERE order_status NOT IN ('cancelled')) as daily_amount
       FROM order_master
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
       end_date || new Date().toISOString()]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
 * POST /:id/assign - 分配订单
 * ========================================================= */
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的订单ID格式' });
    }
    const { dealer_id, design_id } = req.body;

    const check = await db.query(
      `SELECT order_status, order_no, dealer_id FROM order_master WHERE id = $1`,
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = check.rows[0];

    // 只有 pending 状态可以重新分配
    if (order.order_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `当前状态"${order.order_status}"不允许分配，只有 pending 状态可以分配`
      });
    }

    const updates = [];
    const params = [];
    let p = 0;

    if (dealer_id !== undefined) {
      updates.push(`dealer_id = $${++p}`);
      params.push(dealer_id);
    }
    if (design_id !== undefined) {
      updates.push(`design_id = $${++p}`);
      params.push(design_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的分配信息' });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await db.query(
      `UPDATE order_master SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      params
    );

    logger.info(`分配订单: ${order.order_no}, dealer_id=${dealer_id}, design_id=${design_id}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '订单分配成功'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
