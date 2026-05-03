/**
 * 佣金自动生成服务
 * 触发时机：订单状态变为 completed 时自动调用
 */
const db = require('../db');
const logger = require('../utils/logger');

function generateCommissionNo() {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `CM${datePart}${rand}`;
}

/**
 * 订单完成时，自动生成佣金记录
 * @param {string} orderId - 订单ID
 */
async function autoGenerate(orderId) {
  try {
    // 查找有经销商的订单
    const order = await db.query(
      `SELECT o.id, o.order_no, o.total_amount, o.dealer_id,
              d.commission_rate, d.dealer_name
       FROM order_master o
       JOIN dealer d ON o.dealer_id = d.id
       WHERE o.id = $1 AND o.dealer_id IS NOT NULL`,
      [orderId]
    );

    if (!order.rows.length) {
      logger.debug(`订单 ${orderId} 无经销商，跳过佣金生成`);
      return;
    }

    const { order_no, total_amount, dealer_id, commission_rate, dealer_name } = order.rows[0];

    // 检查是否已有佣金记录
    const exist = await db.query(
      `SELECT id FROM dealer_commission WHERE order_id = $1`,
      [orderId]
    );
    if (exist.rows.length > 0) {
      logger.info(`订单 ${order_no} 已有佣金记录，跳过`);
      return;
    }

    const rate = parseFloat(commission_rate || 0);
    const commissionAmount = Math.round(parseFloat(total_amount || 0) * rate * 100) / 100;

    if (commissionAmount <= 0) {
      logger.info(`订单 ${order_no} 佣金金额为 0，跳过`);
      return;
    }

    await db.query(
      `INSERT INTO dealer_commission
         (commission_no, dealer_id, order_id, order_no, order_amount, commission_rate, commission_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [generateCommissionNo(), dealer_id, orderId, order_no, total_amount, rate, commissionAmount]
    );

    logger.info(`佣金记录已生成: ${order_no} 经销商=${dealer_name} 金额=${commissionAmount} 比例=${rate}`);

    // Webhook：通知经销商佣金已生成（pending 状态用 commission.created）
    try {
      const webhookService = require('./webhookService');
      webhookService.trigger(dealer_id, 'commission.created', {
        order_no,
        commission_amount: commissionAmount,
        commission_rate: rate,
        status: 'pending'
      });
    } catch (e) {
      logger.error('佣金 Webhook 通知失败:', e.message);
    }

  } catch (err) {
    logger.error(`佣金自动生成失败 [${orderId}]:`, err.message);
  }
}

/**
 * 结算佣金（工厂管理员操作）
 * 支持抵扣货款(pay_method=deduct) 或现金支付(pay_method=cash)
 * @param {object} opts
 */
async function settle({ commissionIds, paymentMethod, operatorId, operatorName, remark }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 生成分批次号
    const batchNo = `SETTLE${Date.now()}`;
    const settleDate = new Date();

    // 累计总金额
    const sumResult = await client.query(
      `SELECT SUM(commission_amount) as total, COUNT(*) as cnt
       FROM dealer_commission WHERE id = ANY($1) AND status = 'pending'`,
      [commissionIds]
    );
    const { total, cnt } = sumResult.rows[0];
    if (!total || cnt === 0) throw new Error('没有可结算的佣金记录');

    // 按支付方式分别处理
    if (paymentMethod === 'deduct') {
      // 抵扣货款：更新关联应收账单
      for (const cid of commissionIds) {
        const rec = await client.query(
          `UPDATE dealer_commission
           SET status='settled', payment_method='deduct',
               settled_at=NOW(), settled_by=$1,
               settled_batch=NULL, settled_remark=$2
           WHERE id=$3 AND status='pending'
           RETURNING dealer_id, commission_amount`,
          [operatorId, remark || '', cid]
        );
        if (rec.rows.length) {
          // 抵扣该经销商的一条未结清应收款
          await client.query(
            `UPDATE receivable
             SET paid_amount = paid_amount + $1, updated_at = NOW()
             WHERE dealer_id = $2 AND status IN ('unpaid','partial')
             LIMIT 1`,
            [rec.rows[0].commission_amount, rec.rows[0].dealer_id]
          );
        }
      }
    } else {
      // 现金支付：仅更新佣金状态
      await client.query(
        `UPDATE dealer_commission
         SET status='settled', payment_method='cash',
             settled_at=NOW(), settled_by=$1,
             settled_batch=$2, settled_remark=$3
         WHERE id = ANY($4) AND status='pending'`,
        [operatorId, batchNo, remark || '', commissionIds]
      );
    }

    // 记录结算批次
    await client.query(
      `INSERT INTO dealer_commission_settlement
         (settle_batch, settle_date, total_amount, total_count,
          ${paymentMethod === 'deduct' ? 'deduct_amount, deduct_count' : 'cash_amount, cash_count'},
          operator_id, operator_name, status, remark)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8)`,
      [batchNo, settleDate, parseFloat(total), parseInt(cnt),
       paymentMethod === 'deduct' ? parseFloat(total) : 0,
       paymentMethod === 'deduct' ? parseInt(cnt) : 0,
       paymentMethod === 'cash' ? parseFloat(total) : 0,
       paymentMethod === 'cash' ? parseInt(cnt) : 0,
       operatorId, operatorName, remark || '']
    );

    await client.query('COMMIT');
    logger.info(`佣金结算完成: 批次=${batchNo} 总额=${total} 方式=${paymentMethod}`);

    // Webhook：通知经销商佣金已结算（需在 COMMIT 之后）
    try {
      const webhookService = require('./webhookService');
      for (const cid of commissionIds) {
        const rec = await db.query(
          `SELECT dealer_id, order_no, commission_amount FROM dealer_commission WHERE id=$1`,
          [cid]
        );
        if (rec.rows.length) {
          webhookService.trigger(rec.rows[0].dealer_id, 'commission.settled', {
            order_no: rec.rows[0].order_no,
            commission_amount: rec.rows[0].commission_amount,
            settle_batch: batchNo,
            payment_method: paymentMethod
          });
        }
      }
    } catch (e) {
      logger.error('佣金结算 Webhook 通知失败:', e.message);
    }

    return { batchNo, total, count: cnt };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 查询佣金列表（带筛选）
 */
async function list({ dealerId, status, startDate, endDate, page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const conditions = ['1=1'];
  const params = [];
  let p = 0;

  if (dealerId) { conditions.push(`dc.dealer_id = $${++p}`); params.push(dealerId); }
  if (status) { conditions.push(`dc.status = $${++p}`); params.push(status); }
  if (startDate) { conditions.push(`dc.created_at >= $${++p}`); params.push(startDate); }
  if (endDate) { conditions.push(`dc.created_at <= $${++p}`); params.push(endDate); }

  const where = conditions.join(' AND ');
  const countResult = await db.query(
    `SELECT COUNT(*) FROM dealer_commission dc WHERE ${where}`, params
  );

  params.push(parseInt(pageSize), offset);
  const rows = await db.query(
    `SELECT dc.*, d.dealer_name
     FROM dealer_commission dc
     JOIN dealer d ON dc.dealer_id = d.id
     WHERE ${where}
     ORDER BY dc.created_at DESC
     LIMIT $${++p} OFFSET $${++p}`,
    params
  );

  return {
    list: rows.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
}

module.exports = { autoGenerate, settle, list };
