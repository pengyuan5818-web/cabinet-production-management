/**
 * 财务管理路由
 * 功能: 收款、付款、发票、对账
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/finance/receivables
 * 应收账款列表
 */
router.get('/receivables', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status, dealer_id, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (status) {
      whereClause.push(`r.status = $${++paramCount}`);
      params.push(status);
    }
    if (dealer_id) {
      whereClause.push(`r.dealer_id = $${++paramCount}`);
      params.push(dealer_id);
    }
    if (start_date) {
      whereClause.push(`r.bill_date >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      whereClause.push(`r.bill_date <= $${++paramCount}`);
      params.push(end_date);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT r.*, d.dealer_name, om.order_no
       FROM receivable r
       LEFT JOIN dealer d ON r.dealer_id = d.id
       LEFT JOIN order_master om ON r.order_id = om.id
       ${where}
       ORDER BY r.bill_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM receivable r ${where}`,
      params.slice(0, -2)
    );

    // 汇总
    const summaryResult = await db.query(
      `SELECT 
        SUM(amount) as total_amount,
        SUM(paid_amount) as total_paid,
        SUM(amount - paid_amount) as total_unpaid
       FROM receivable r ${where}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(countResult.rows[0].count),
        summary: {
          total_amount: parseFloat(summaryResult.rows[0].total_amount || 0),
          total_paid: parseFloat(summaryResult.rows[0].total_paid || 0),
          total_unpaid: parseFloat(summaryResult.rows[0].total_unpaid || 0)
        },
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/finance/receivables
 * 创建应收账单
 */
router.post('/receivables', async (req, res, next) => {
  try {
    const {
      dealer_id, order_id, bill_no, bill_date, due_date,
      amount, tax_rate, tax_amount, remark
    } = req.body;

    const taxAmt = tax_amount || (amount * (tax_rate || 0.13));
    const totalAmount = amount + taxAmt;

    const result = await db.query(
      `INSERT INTO receivable (
        dealer_id, order_id, bill_no, bill_date, due_date,
        amount, tax_rate, tax_amount, total_amount,
        paid_amount, status, remark, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 'unpaid', $10, NOW())
      RETURNING *`,
      [dealer_id, order_id, bill_no, bill_date, due_date,
       amount, tax_rate || 0.13, taxAmt, totalAmount, remark]
    );

    logger.info(`创建应收账单: ${bill_no}, 金额: ${totalAmount}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '账单创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/finance/receivables/:id/collect
 * 收款
 */
router.post('/receivables/:id/collect', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的账单ID格式' });
    }
    const { collection_amount, collection_date, payment_method, bank_serial, remark } = req.body;

    if (!collection_amount) {
      return res.status(400).json({ success: false, message: '收款金额不能为空' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 获取账单信息
      const billResult = await client.query(
        `SELECT * FROM receivable WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (billResult.rows.length === 0) {
        throw new Error('账单不存在');
      }

      const bill = billResult.rows[0];
      const newPaidAmount = parseFloat(bill.paid_amount) + parseFloat(collection_amount);
      const newStatus = newPaidAmount >= bill.total_amount ? 'paid' : 'partial';

      // 更新账单
      await client.query(
        `UPDATE receivable SET 
         paid_amount = $1, status = $2, updated_at = NOW()
         WHERE id = $3`,
        [newPaidAmount, newStatus, id]
      );

      // 创建收款记录
      const recordResult = await client.query(
        `INSERT INTO collection_record (
          receivable_id, order_id, collection_amount, collection_date,
          payment_method, bank_serial, operator_id, remark, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [id, bill.order_id, collection_amount, collection_date,
         payment_method, bank_serial, req.user.id, remark]
      );

      // 创建资金流水
      await client.query(
        `INSERT INTO fund_flow (
          flow_no, flow_type, biz_type, biz_id, order_id,
          amount, payment_method, operator_id, remark, created_at
        ) VALUES ($1, 'income', 'collection', $2, $3, $4, $5, $6, $7, NOW())`,
        [`CF${Date.now()}`, id, bill.order_id, collection_amount, payment_method, req.user.id, remark]
      );

      await client.query('COMMIT');

      logger.info(`收款成功: bill=${bill.bill_no}, amount=${collection_amount}`);

      // Webhook：通知经销商收款已确认
      if (bill.dealer_id) {
        require('../services/webhookService').trigger(bill.dealer_id, 'payment.confirmed', {
          bill_no: bill.bill_no,
          order_id: bill.order_id,
          collection_amount: parseFloat(collection_amount),
          payment_method,
          operator: req.user?.realName || 'system'
        }).catch(err => logger.error('Webhook payment.confirmed error:', err));
      }

      res.json({
        success: true,
        data: recordResult.rows[0],
        message: '收款成功'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/finance/payables
 * 应付账款列表
 */
router.get('/payables', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status, supplier_id, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (status) {
      whereClause.push(`p.status = $${++paramCount}`);
      params.push(status);
    }
    if (supplier_id) {
      whereClause.push(`p.supplier_id = $${++paramCount}`);
      params.push(supplier_id);
    }
    if (start_date) {
      whereClause.push(`p.bill_date >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      whereClause.push(`p.bill_date <= $${++paramCount}`);
      params.push(end_date);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT p.*, s.supplier_name, s.contact_person, s.phone as supplier_phone
       FROM payable p
       LEFT JOIN supplier s ON p.supplier_id = s.id
       ${where}
       ORDER BY p.bill_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM payable p ${where}`,
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
 * POST /api/finance/payables
 * 创建应付账单
 */
router.post('/payables', async (req, res, next) => {
  try {
    const {
      supplier_id, bill_no, bill_date, due_date,
      amount, tax_rate, tax_amount, total_amount, remark
    } = req.body;


    // 自动识别: tax_rate 传 13 视为 13%，即 0.13；传 0.13 也正常识别
    const rawRate = parseFloat(tax_rate || 0.13);
    const taxRate = rawRate > 1 ? rawRate / 100 : rawRate;
    const taxAmt = tax_amount !== undefined ? parseFloat(tax_amount) : (amount * taxRate);
    const totalAmount = total_amount !== undefined ? parseFloat(total_amount) : (amount + taxAmt);

    const result = await db.query(
      `INSERT INTO payable (
        supplier_id, bill_no, bill_date, due_date,
        amount, tax_rate, tax_amount, total_amount,
        paid_amount, status, remark, created_at
      ) VALUES ($1, $2, COALESCE($3, CURRENT_DATE), COALESCE($4, CURRENT_DATE + INTERVAL '30 days'), $5, $6, $7, $8, 0, 'unpaid', $9, NOW())
      RETURNING *`,
      [supplier_id, bill_no, bill_date || null, due_date || null,
       amount, taxRate, taxAmt, totalAmount, remark]
    );

    logger.info(`创建应付账单: ${bill_no}, 金额: ${totalAmount}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '账单创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/finance/payables/:id/pay
 * 付款
 */
router.post('/payables/:id/pay', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的账单ID格式' });
    }
    const { payment_amount, payment_date, payment_method, bank_serial, remark } = req.body;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const billResult = await client.query(
        `SELECT * FROM payable WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (billResult.rows.length === 0) {
        throw new Error('账单不存在');
      }

      const bill = billResult.rows[0];
      const newPaidAmount = parseFloat(bill.paid_amount) + parseFloat(payment_amount);
      const newStatus = newPaidAmount >= bill.total_amount ? 'paid' : 'partial';

      await client.query(
        `UPDATE payable SET 
         paid_amount = $1, status = $2, updated_at = NOW()
         WHERE id = $3`,
        [newPaidAmount, newStatus, id]
      );

      const recordResult = await client.query(
        `INSERT INTO payment_record (
          payable_id, payment_amount, payment_date,
          payment_method, bank_serial, operator_id, remark, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *`,
        [id, payment_amount, payment_date, payment_method, bank_serial, req.user.id, remark]
      );

      await client.query(
        `INSERT INTO fund_flow (
          flow_no, flow_type, biz_type, biz_id,
          amount, payment_method, operator_id, remark, created_at
        ) VALUES ($1, 'expense', 'payment', $2, $3, $4, $5, $6, NOW())`,
        [`PF${Date.now()}`, id, payment_amount, payment_method, req.user.id, remark]
      );

      await client.query('COMMIT');

      logger.info(`付款成功: bill=${bill.bill_no}, amount=${payment_amount}`);

      res.json({
        success: true,
        data: recordResult.rows[0],
        message: '付款成功'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/finance/invoices
 * 发票列表
 */
router.get('/invoices', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, type, status } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (type) {
      whereClause.push(`invoice_type = $${++paramCount}`);
      params.push(type);
    }
    if (status) {
      whereClause.push(`status = $${++paramCount}`);
      params.push(status);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT i.*, d.dealer_name, s.supplier_name
       FROM invoice i
       LEFT JOIN dealer d ON i.dealer_id = d.id
       LEFT JOIN supplier s ON i.supplier_id = s.id
       ${where}
       ORDER BY i.invoice_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM invoice i ${where}`,
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
 * POST /api/finance/invoices
 * 创建发票
 */
router.post('/invoices', async (req, res, next) => {
  try {
    const {
      invoice_no, invoice_type, invoice_date,
      dealer_id, supplier_id, order_id,
      amount, tax_rate, tax_amount, total_amount,
      remark
    } = req.body;

    const result = await db.query(
      `INSERT INTO invoice (
        invoice_no, invoice_type, invoice_date,
        dealer_id, supplier_id, order_id,
        amount, tax_rate, tax_amount, total_amount,
        status, remark, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'issued', $11, NOW())
      RETURNING *`,
      [invoice_no, invoice_type, invoice_date,
       dealer_id, supplier_id, order_id,
       amount, tax_rate, tax_amount, total_amount, remark]
    );

    logger.info(`创建发票: ${invoice_no}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: '发票创建成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/finance/fund-flow
 * 资金流水
 */
router.get('/fund-flow', async (req, res, next) => {
  try {
    const { 
      page = 1, page_size = 50, 
      flow_type, biz_type, start_date, end_date 
    } = req.query;
    const offset = (page - 1) * page_size;

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (flow_type) {
      whereClause.push(`flow_type = $${++paramCount}`);
      params.push(flow_type);
    }
    if (biz_type) {
      whereClause.push(`biz_type = $${++paramCount}`);
      params.push(biz_type);
    }
    if (start_date) {
      whereClause.push(`created_at >= $${++paramCount}`);
      params.push(start_date);
    }
    if (end_date) {
      whereClause.push(`created_at <= $${++paramCount}`);
      params.push(end_date);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT ff.*, u.real_name as operator_name
       FROM fund_flow ff
       LEFT JOIN sys_user u ON ff.operator_id = u.id
       ${where}
       ORDER BY ff.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM fund_flow ff ${where}`,
      params.slice(0, -2)
    );

    // 汇总
    const summaryResult = await db.query(
      `SELECT 
        SUM(CASE WHEN flow_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN flow_type = 'expense' THEN amount ELSE 0 END) as total_expense
       FROM fund_flow ff ${where}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(countResult.rows[0].count),
        summary: {
          total_income: parseFloat(summaryResult.rows[0].total_income || 0),
          total_expense: parseFloat(summaryResult.rows[0].total_expense || 0)
        },
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/finance/summary
 * 财务汇总
 */
router.get('/summary', async (req, res, next) => {
  try {
    const [receivableResult, payableResult, invoiceResult, flowResult] = await Promise.all([
      db.query(`
        SELECT 
          SUM(total_amount) as total_receivable,
          SUM(paid_amount) as total_received,
          SUM(total_amount - paid_amount) as total_unreceived
        FROM receivable
      `),
      db.query(`
        SELECT 
          SUM(total_amount) as total_payable,
          SUM(paid_amount) as total_paid,
          SUM(total_amount - paid_amount) as total_unpaid
        FROM payable
      `),
      db.query(`
        SELECT 
          COUNT(*) as total_invoices,
          SUM(total_amount) as total_invoice_amount
        FROM invoice
        WHERE DATE(invoice_date) >= DATE_TRUNC('month', CURRENT_DATE)
      `),
      db.query(`
        SELECT 
          SUM(CASE WHEN flow_type = 'income' THEN amount ELSE 0 END) as month_income,
          SUM(CASE WHEN flow_type = 'expense' THEN amount ELSE 0 END) as month_expense
        FROM fund_flow
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `)
    ]);

    res.json({
      success: true,
      data: {
        receivable: {
          total: parseFloat(receivableResult.rows[0].total_receivable || 0),
          received: parseFloat(receivableResult.rows[0].total_received || 0),
          unreceived: parseFloat(receivableResult.rows[0].total_unreceived || 0)
        },
        payable: {
          total: parseFloat(payableResult.rows[0].total_payable || 0),
          paid: parseFloat(payableResult.rows[0].total_paid || 0),
          unpaid: parseFloat(payableResult.rows[0].total_unpaid || 0)
        },
        invoice: {
          count: parseInt(invoiceResult.rows[0].total_invoices || 0),
          amount: parseFloat(invoiceResult.rows[0].total_invoice_amount || 0)
        },
        fund_flow: {
          month_income: parseFloat(flowResult.rows[0].month_income || 0),
          month_expense: parseFloat(flowResult.rows[0].month_expense || 0)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/finance/reconciliation
 * 对账
 */
router.post('/reconciliation', async (req, res, next) => {
  try {
    const { dealer_id, start_date, end_date } = req.body;

    // 获取该经销商期间内的账单和收款
    const [receivablesResult, collectionsResult] = await Promise.all([
      db.query(`
        SELECT bill_no, bill_date, total_amount, paid_amount, 
               (total_amount - paid_amount) as balance
        FROM receivable
        WHERE dealer_id = $1 AND bill_date BETWEEN $2 AND $3
        ORDER BY bill_date
      `, [dealer_id, start_date, end_date]),
      
      db.query(`
        SELECT cr.bank_serial, cr.collection_date, cr.collection_amount, cr.payment_method
        FROM collection_record cr
        JOIN receivable r ON cr.receivable_id = r.id
        WHERE r.dealer_id = $1 AND cr.collection_date BETWEEN $2 AND $3
        ORDER BY cr.collection_date
      `, [dealer_id, start_date, end_date])
    ]);

    const receivables = receivablesResult.rows;
    const collections = collectionsResult.rows;

    const totalReceivable = receivables.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
    const totalPaid = receivables.reduce((sum, r) => sum + parseFloat(r.paid_amount), 0);
    const totalBalance = receivables.reduce((sum, r) => sum + parseFloat(r.balance), 0);

    res.json({
      success: true,
      data: {
        dealer_id,
        period: { start_date, end_date },
        receivables,
        collections,
        summary: {
          total_receivable: totalReceivable,
          total_paid: totalPaid,
          total_balance: totalBalance,
          receivable_count: receivables.length,
          collection_count: collections.length
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/finance/customer-arrears
 * 客户欠款（直销客户）
 */
router.get('/customer-arrears', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status, start_date, end_date, keyword } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    let params = [];
    let p = 0;

    if (status) { where.push(`ar.payment_status = $${++p}`); params.push(status); }
    if (start_date) { where.push(`ar.due_date >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`ar.due_date <= $${++p}`); params.push(end_date); }
    if (keyword) { where.push(`(ar.order_no ILIKE $${++p} OR ar.customer_name ILIKE $${++p})`); params.push('%' + keyword + '%'); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT ar.*, o.order_no, o.total_amount as order_amount,
              c.customer_name, c.phone as customer_phone
       FROM accounts_receivable ar
       LEFT JOIN order_master o ON ar.order_id = o.id
       LEFT JOIN customer c ON o.customer_id = c.id
       ${whereStr}
       ORDER BY ar.due_date DESC
       LIMIT $${p + 1} OFFSET $${p + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM accounts_receivable ar ${whereStr}`,
      params.slice(0, -2)
    );

    const summaryResult = await db.query(
      `SELECT
        COALESCE(SUM(ar.total_amount),0) as total_amount,
        COALESCE(SUM(ar.paid_amount),0) as paid_amount,
        COALESCE(SUM(ar.balance_amount),0) as balance_amount
       FROM accounts_receivable ar
       LEFT JOIN order_master o ON ar.order_id = o.id
       LEFT JOIN customer c ON o.customer_id = c.id
       ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(countResult.rows[0].count),
        summary: summaryResult.rows[0],
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/finance/dealer-arrears
 * 代理欠款（代理商账务）
 */
router.get('/dealer-arrears', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status, dealer_id, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    let params = [];
    let p = 0;

    if (status) { where.push(`dr.status = $${++p}`); params.push(status); }
    if (dealer_id) { where.push(`dr.dealer_id = $${++p}`); params.push(dealer_id); }
    if (start_date) { where.push(`dr.due_date >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`dr.due_date <= $${++p}`); params.push(end_date); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT dr.*, d.dealer_name, d.contact_person, d.phone
       FROM dealer_receivable dr
       LEFT JOIN dealer d ON dr.dealer_id = d.id
       ${whereStr}
       ORDER BY dr.due_date DESC
       LIMIT $${p + 1} OFFSET $${p + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM dealer_receivable dr ${whereStr}`,
      params.slice(0, -2)
    );

    const summaryResult = await db.query(
      `SELECT
        COALESCE(SUM(amount),0) as total_amount,
        COALESCE(SUM(paid_amount),0) as paid_amount,
        COALESCE(SUM(pending_amount),0) as pending_amount
       FROM dealer_receivable dr ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(countResult.rows[0].count),
        summary: summaryResult.rows[0],
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/finance/supplier-arrears
 * 供应商欠款（采购应付款）
 */
router.get('/supplier-arrears', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, status, supplier_id, start_date, end_date } = req.query;
    const offset = (page - 1) * page_size;

    let where = ['1=1'];
    let params = [];
    let p = 0;

    if (status) { where.push(`p.status = $${++p}`); params.push(status); }
    if (supplier_id) { where.push(`p.supplier_id = $${++p}`); params.push(supplier_id); }
    if (start_date) { where.push(`p.bill_date >= $${++p}`); params.push(start_date); }
    if (end_date) { where.push(`p.bill_date <= $${++p}`); params.push(end_date); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    params.push(page_size, offset);

    const result = await db.query(
      `SELECT p.*, s.supplier_name, s.contact_person, s.phone
       FROM payable p
       LEFT JOIN supplier s ON p.supplier_id = s.id
       ${whereStr}
       ORDER BY p.bill_date DESC
       LIMIT $${p + 1} OFFSET $${p + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM payable p ${whereStr}`,
      params.slice(0, -2)
    );

    const summaryResult = await db.query(
      `SELECT
        COALESCE(SUM(total_amount),0) as total_amount,
        COALESCE(SUM(paid_amount),0) as paid_amount,
        COALESCE(SUM(total_amount - paid_amount),0) as balance_amount
       FROM payable p ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        list: result.rows,
        total: parseInt(countResult.rows[0].count),
        summary: summaryResult.rows[0],
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
