/**
 * 供应商管理路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/suppliers
 * 供应商列表
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status, category, keyword } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (status) {
      whereClause.push(`s.status = $${++paramCount}`);
      params.push(status);
    }
    if (category) {
      whereClause.push(`s.supply_category = $${++paramCount}`);
      params.push(category);
    }
    if (keyword) {
      whereClause.push(`(s.supplier_name LIKE $${paramCount + 1} OR s.supplier_code LIKE $${paramCount + 1})`);
      params.push(`%${keyword}%`);
      paramCount++;
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT s.*, 
              COUNT(DISTINCT m.id) as material_count,
              SUM(p.total_amount) as total_purchase
       FROM supplier s
       LEFT JOIN material m ON s.id = m.supplier_id
       LEFT JOIN payable p ON s.id = p.supplier_id
       ${where}
       GROUP BY s.id
       ORDER BY s.supplier_code
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM supplier s ${where}`,
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
 * GET /api/suppliers/:id
 * 供应商详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的供应商ID格式' });
    }

    const result = await db.query('SELECT * FROM supplier WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    // 供应原材料
    const materialResult = await db.query(
      `SELECT * FROM material WHERE supplier_id = $1 ORDER BY material_name`,
      [id]
    );

    // 历史账单
    const payableResult = await db.query(
      `SELECT * FROM payable WHERE supplier_id = $1 ORDER BY bill_date DESC LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        materials: materialResult.rows,
        payables: payableResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/suppliers
 * 创建供应商
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      supplier_code, supplier_name, contact_person, phone, email,
      province, city, district, address, supply_category,
      business_license, tax_id, bank_name, bank_account, bank_account_name
    } = req.body;

    const code = supplier_code || `SUP${Date.now()}`;

    const result = await db.query(
      `INSERT INTO supplier (
        supplier_code, supplier_name, contact_person, phone, email,
        province, city, district, address, supply_category,
        business_license, tax_id, bank_name, bank_account, bank_account_name,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', NOW())
      RETURNING *`,
      [code, supplier_name, contact_person, phone, email,
       province, city, district, address, supply_category,
       business_license, tax_id, bank_name, bank_account, bank_account_name]
    );

    logger.info(`创建供应商: ${supplier_name}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '供应商创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/suppliers/:id
 * 更新供应商
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const allowedFields = [
      'supplier_name', 'contact_person', 'phone', 'email',
      'province', 'city', 'district', 'address', 'supply_category',
      'business_license', 'tax_id', 'bank_name', 'bank_account', 'bank_account_name', 'status'
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
      `UPDATE supplier SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: '供应商更新成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/suppliers/:id
 * 删除供应商
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查是否有关联订单
    const materialCheck = await db.query(
      'SELECT COUNT(*) FROM material WHERE supplier_id = $1',
      [id]
    );

    if (parseInt(materialCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: '该供应商有供应材料，无法删除'
      });
    }

    await db.query('DELETE FROM supplier WHERE id = $1', [id]);

    res.json({ success: true, message: '供应商已删除' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/suppliers/:id/evaluate
 * 供应商评价
 */
router.get('/:id/evaluate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { year } = req.query;

    const result = await db.query(
      `SELECT * FROM supplier_evaluation
       WHERE supplier_id = $1
         AND EXTRACT(YEAR FROM evaluation_date) = COALESCE($2, EXTRACT(YEAR FROM CURRENT_DATE))
       ORDER BY evaluation_date DESC`,
      [id, year]
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
 * GET /api/suppliers/:id/payments
 * 供应商付款记录
 */
router.get('/:id/payments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的供应商ID格式' });
    }
    const { page = 1, page_size = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);

    const [data, count] = await Promise.all([
      db.query(
        `SELECT sp.*
         FROM supplier_payment sp
         WHERE sp.supplier_id = $1
         ORDER BY sp.payment_date DESC
         LIMIT $2 OFFSET $3`,
        [id, parseInt(page_size), offset]
      ),
      await db.query('SELECT COUNT(*) as total FROM supplier_payment WHERE supplier_id = $1', [id])
    ]);

    res.json({
      success: true,
      data: {
        list: data.rows,
        total: parseInt(count.rows[0].total),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/suppliers/:id/payables
 * 供应商应付账款列表
 */
router.get('/:id/payables', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, page_size = 50, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);

    let whereClause = ['supplier_id = $1'];
    const params = [id];
    if (status) {
      params.push(status);
      whereClause.push(`status = $${params.length}`);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');

    const [data, count] = await Promise.all([
      db.query(
        `SELECT * FROM payable ${where}
         ORDER BY bill_date DESC, created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(page_size), offset]
      ),
      await db.query(`SELECT COUNT(*) as total FROM payable ${where}`, params)
    ]);

    res.json({
      success: true,
      data: {
        list: data.rows,
        total: parseInt(count.rows[0].total),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/suppliers/:id/payments
 * 新增付款记录（自动核销对应供应商的应付账单）
 */
router.post('/:id/payments', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { amount, payment_method, payer, remark, reconciliation_id } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '付款金额必须大于0' });
    }

    await client.query('BEGIN');

    // 1. 插入付款记录
    const payResult = await client.query(
      `INSERT INTO supplier_payment (supplier_id, reconciliation_id, amount, payment_method, payer, remark, payment_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, reconciliation_id || null, amount, payment_method || '', payer || '', remark || '']
    );

    let reconciledPayables = [];

    // 2. 自动核销应付账单
    if (reconciliation_id) {
      // 核销指定对账单：更新对账单的已付金额
      await client.query(
        `UPDATE supplier_reconciliation
         SET paid_amount = paid_amount + $1,
             status = CASE WHEN paid_amount + $1 >= payable_amount THEN 'paid' WHEN paid_amount + $1 > 0 THEN 'partial' ELSE status END,
             updated_at = NOW()
         WHERE id = $2 AND supplier_id = $3`,
        [amount, reconciliation_id, id]
      );

      // 同时核销该对账单关联的、尚未关联到其他对账的应付账单
      const unpaidPayables = await client.query(
        `SELECT * FROM payable
         WHERE supplier_id = $1
           AND status != 'paid'
           AND reconciliation_id IS NULL
         ORDER BY due_date ASC
         LIMIT 10`,
        [id]
      );

      let remaining = parseFloat(amount);
      for (const p of unpaidPayables.rows) {
        if (remaining <= 0) break;
        const owed = parseFloat(p.total_amount) - parseFloat(p.paid_amount);
        const settle = Math.min(remaining, owed);
        const newPaid = parseFloat(p.paid_amount) + settle;
        const newStatus = newPaid >= parseFloat(p.total_amount) ? 'paid' : 'partial';
        await client.query(
          `UPDATE payable SET paid_amount = $1, status = $2, reconciliation_id = $3, updated_at = NOW()
           WHERE id = $4`,
          [newPaid, newStatus, reconciliation_id, p.id]
        );
        reconciledPayables.push({ bill_no: p.bill_no, payable_id: p.id, settled: settle, remaining: owed - settle });
        remaining -= settle;
      }
    } else {
      // 无指定对账单：直接按时间顺序核销该供应商的所有未付账单
      const unpaidPayables = await client.query(
        `SELECT * FROM payable
         WHERE supplier_id = $1 AND status != 'paid'
         ORDER BY due_date ASC
         LIMIT 20`,
        [id]
      );

      let remaining = parseFloat(amount);
      for (const p of unpaidPayables.rows) {
        if (remaining <= 0) break;
        const owed = parseFloat(p.total_amount) - parseFloat(p.paid_amount);
        const settle = Math.min(remaining, owed);
        const newPaid = parseFloat(p.paid_amount) + settle;
        const newStatus = newPaid >= parseFloat(p.total_amount) ? 'paid' : 'partial';
        await client.query(
          `UPDATE payable SET paid_amount = $1, status = $2, updated_at = NOW()
           WHERE id = $3`,
          [newPaid, newStatus, p.id]
        );
        reconciledPayables.push({ bill_no: p.bill_no, payable_id: p.id, settled: settle, remaining: owed - settle });
        remaining -= settle;
      }
    }

    // 同步写 fund_flow（与财务路由 /api/finance/payables/:id/pay 保持一致）
    // 同步写 fund_flow（与财务路由 /api/finance/payables/:id/pay 保持一致）
    if (reconciledPayables.length > 0) {
      for (const rp of reconciledPayables) {
        await client.query(
          `INSERT INTO fund_flow (flow_no, flow_type, biz_type, biz_id, amount, payment_method, operator_id, remark, created_at)
           VALUES ($1, 'expense', 'payment', $2, $3, $4, $5, $6, NOW())`,
          [`PF${Date.now()}-${rp.payable_id.slice(0,8)}`, rp.payable_id, rp.settled, payment_method || '', req.user?.id || null, remark || `核销账单${rp.bill_no}`]
        );
      }
    } else {
      // 没有匹配到任何账单，也记一条支出记录
      await client.query(
        `INSERT INTO fund_flow (flow_no, flow_type, biz_type, biz_id, amount, payment_method, operator_id, remark, created_at)
         VALUES ($1, 'expense', 'payment', NULL::uuid, $2, $3, $4, $5, $6, NOW())`,
        [`PF${Date.now()}-${id.slice(0,8)}`, amount, payment_method || '', req.user?.id || null, remark || '供应商付款']
      );
    }

    await client.query('COMMIT');

    logger.info(`供应商付款成功: supplier=${id}, amount=${amount}, 核销${reconciledPayables.length}张账单`);
    res.json({
      success: true,
      data: {
        payment: payResult.rows[0],
        reconciled: reconciledPayables
      },
      message: `付款成功，已自动核销${reconciledPayables.length}张账单`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/suppliers/:id/reconciliations
 * 供应商对账记录
 */
router.get('/:id/reconciliations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, page_size = 50, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);

    let whereClause = 'WHERE sr.supplier_id = $1';
    const params = [id];
    if (status) {
      params.push(status);
      whereClause += ` AND sr.status = $${params.length}`;
    }

    const [data, count] = await Promise.all([
      db.query(
        `SELECT sr.*,
                COALESCE((SELECT SUM(amount) FROM supplier_payment WHERE reconciliation_id = sr.id), 0) as actual_paid
         FROM supplier_reconciliation sr
         ${whereClause}
         ORDER BY sr.bill_date DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(page_size), offset]
      ),
      await db.query(`SELECT COUNT(*) as total FROM supplier_reconciliation sr ${whereClause}`, params)
    ]);

    const list = data.rows.map(row => ({
      ...row,
      balance: parseFloat(row.payable_amount) - parseFloat(row.actual_paid || row.paid_amount)
    }));

    res.json({
      success: true,
      data: {
        list,
        total: parseInt(count.rows[0].total),
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/suppliers/:id/reconciliations
 * 发起对账（创建对账账单）
 */
router.post('/:id/reconciliations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payable_amount, paid_amount = 0, remark } = req.body;

    if (!payable_amount || payable_amount <= 0) {
      return res.status(400).json({ success: false, message: '应付金额必须大于0' });
    }

    // 自动生成账单号
    const billNoResult = await db.query(
      `SELECT 'RC' || TO_CHAR(NOW(), 'YYYYMMDD') ||
              LPAD(CAST(COALESCE(MAX(SUBSTRING(bill_no FROM 13 FOR 4)::int), 0) + 1 AS VARCHAR), 4, '0') as next_bill_no
       FROM supplier_reconciliation
       WHERE bill_no LIKE 'RC' || TO_CHAR(NOW(), 'YYYYMMDD') || '%'`
    );
    const billNo = billNoResult.rows[0]?.next_bill_no ||
      'RC' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '0001';
    const newId = require('crypto').randomUUID();

    const status = paid_amount >= payable_amount ? 'paid' : paid_amount > 0 ? 'partial' : 'pending';

    const result = await db.query(
      `INSERT INTO supplier_reconciliation (supplier_id, bill_no, payable_amount, paid_amount, status, remark, bill_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, billNo, payable_amount, paid_amount, status, remark || '']
    );

    logger.info(`创建供应商对账单: supplier=${id}, bill_no=${billNo}, amount=${payable_amount}`);
    res.json({ success: true, data: result.rows[0], message: '对账单已创建' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/suppliers/:id/reconciliations/:rid
 * 更新对账记录（如确认付款）
 */
router.put('/:id/reconciliations/:rid', async (req, res, next) => {
  try {
    const { id, rid } = req.params;
    const { payable_amount, paid_amount, status, remark } = req.body;

    const updates = [];
    const params = [];
    if (payable_amount != null) { params.push(payable_amount); updates.push(`payable_amount = $${params.length}`); }
    if (paid_amount != null) { params.push(paid_amount); updates.push(`paid_amount = $${params.length}`); }
    if (status) { params.push(status); updates.push(`status = $${params.length}`); }
    if (remark !== undefined) { params.push(remark); updates.push(`remark = $${params.length}`); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    params.push(rid);
    const result = await db.query(
      `UPDATE supplier_reconciliation SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length} AND supplier_id = $${params.length + 1}
       RETURNING *`,
      [...params, rid, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '对账记录不存在' });
    }

    res.json({ success: true, data: result.rows[0], message: '更新成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
