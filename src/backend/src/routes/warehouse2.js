/**
 * 仓库管理路由
 * 功能: 原材料管理、库存查询、入库、出库、调拨、扫码
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../utils/logger');

const LOW_STOCK_THRESHOLD = 10;

// ============ 扫码查库存 ============
router.get('/scan/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params;
    if (!barcode) return res.status(400).json({ success: false, message: '条码不能为空' });

    // 1) 先查板件
    let boardResult = await db.query(
      `SELECT cb.*, om.order_no, c.customer_name
       FROM cabinet_board cb
       LEFT JOIN order_master om ON cb.order_id = om.id
       LEFT JOIN customer c ON om.customer_id = c.id
       WHERE cb.barcode = $1`,
      [barcode]
    );

    if (boardResult.rows.length > 0) {
      return res.json({
        success: true,
        data: { type: 'board', barcode, info: boardResult.rows[0] }
      });
    }

    // 2) 再查原材料
    let materialResult = await db.query(
      `SELECT m.*,
              COALESCE(si.quantity, 0) as stock_quantity,
              COALESCE(si.locked_quantity, 0) as locked_quantity,
              w.warehouse_name
       FROM material m
       LEFT JOIN stock_inventory si ON m.id = si.material_id
       LEFT JOIN warehouse w ON si.warehouse_id = w.id
       WHERE m.material_code = $1 OR m.id::text = $1`,
      [barcode]
    );

    if (materialResult.rows.length > 0) {
      return res.json({
        success: true,
        data: { type: 'material', barcode, info: materialResult.rows[0] }
      });
    }

    res.status(404).json({ success: false, message: '条码不存在' });
  } catch (err) { next(err); }
});

// ============ 扫码入库 ============
router.post('/scan/in', async (req, res, next) => {
  try {
    const { barcode, type, warehouse_id, warehouse_name, quantity, unit_price, operator_id, operator_name, remark } = req.body;
    if (!barcode || !type) return res.status(400).json({ success: false, message: '条码和类型不能为空' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let itemId, itemName, itemQty;

      if (type === 'board') {
        const board = await client.query(`SELECT id, board_name FROM cabinet_board WHERE barcode = $1`, [barcode]);
        if (board.rows.length === 0) throw new Error('板件条码不存在');
        itemId = board.rows[0].id;
        itemName = board.rows[0].board_name;
        itemQty = 1;

        let whId = warehouse_id;
        if (!whId && warehouse_name) {
          const wh = await client.query(`SELECT id FROM warehouse WHERE warehouse_name = $1 LIMIT 1`, [warehouse_name]);
          if (wh.rows.length > 0) whId = wh.rows[0].id;
        }
        if (!whId) {
          const def = await client.query(`SELECT id FROM warehouse LIMIT 1`);
          if (def.rows.length > 0) whId = def.rows[0].id;
        }
        if (!whId) throw new Error('仓库不存在');

        await client.query(
          `UPDATE cabinet_board SET current_location = $1, updated_at = NOW() WHERE id = $2`,
          [warehouse_name || '入库区', itemId]
        );

        await client.query(
          `INSERT INTO stock_record (id, material_id, warehouse_id, biz_type, in_quantity, balance_quantity, operator_id, operator_name, remark, created_at)
           VALUES ($1, $2, $3, 'board_in', 1, 1, $4, $5, $6, NOW())`,
          [uuidv4(), itemId, whId, operator_id || null, operator_name || '', remark || '板件扫码入库']
        );

      } else {
        const material = await client.query(
          `SELECT id, material_name FROM material WHERE material_code = $1 OR id::text = $1`,
          [barcode]
        );
        if (material.rows.length === 0) throw new Error('原材料条码不存在');
        itemId = material.rows[0].id;
        itemName = material.rows[0].material_name;
        itemQty = parseFloat(quantity) || 1;

        let whId = warehouse_id;
        if (!whId && warehouse_name) {
          const wh = await client.query(`SELECT id FROM warehouse WHERE warehouse_name = $1 LIMIT 1`, [warehouse_name]);
          if (wh.rows.length > 0) whId = wh.rows[0].id;
        }
        if (!whId) {
          const def = await client.query(`SELECT id FROM warehouse LIMIT 1`);
          if (def.rows.length > 0) whId = def.rows[0].id;
        }
        if (!whId) throw new Error('仓库不存在');

        const unitPriceVal = parseFloat(unit_price) || 0;
        const totalVal = unitPriceVal * itemQty;

        const stockIn = await client.query(
          `INSERT INTO stock_in (stock_in_no, warehouse_id, total_amount, operator_id, operator_name, remark, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
          [`IN${Date.now()}`, whId, totalVal, operator_id || null, operator_name || '', remark || '扫码入库']
        );

        await client.query(
          `INSERT INTO stock_in_detail (stock_in_id, material_id, quantity, unit_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [stockIn.rows[0].id, itemId, itemQty, unitPriceVal, totalVal]
        );

        const exist = await client.query(
          `SELECT id FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2`,
          [itemId, whId]
        );
        if (exist.rows.length > 0) {
          await client.query(
            `UPDATE stock_inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`,
            [itemQty, exist.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO stock_inventory (id, material_id, warehouse_id, quantity, locked_quantity, created_at)
             VALUES ($1, $2, $3, $4, 0, NOW())`,
            [uuidv4(), itemId, whId, itemQty]
          );
        }

        await client.query(
          `INSERT INTO stock_record (id, material_id, warehouse_id, biz_type, biz_id, in_quantity, balance_quantity, operator_id, operator_name, remark, created_at)
           VALUES ($1, $2, $3, 'stock_in', $4, $5, $6, $7, $8, $9, NOW())`,
          [uuidv4(), itemId, whId, stockIn.rows[0].id, itemQty, itemQty, operator_id || null, operator_name || '', remark || '扫码入库']
        );
      }

      await client.query('COMMIT');
      logger.info(`扫码入库: barcode=${barcode}, type=${type}, qty=${itemQty}, name=${itemName}`);
      res.json({ success: true, message: '入库成功', data: { item_name: itemName, quantity: itemQty } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

// ============ 扫码出库 ============
router.post('/scan/out', async (req, res, next) => {
  try {
    const { barcode, type, warehouse_id, warehouse_name, order_id, quantity, unit_price, operator_id, operator_name, remark } = req.body;
    if (!barcode || !type) return res.status(400).json({ success: false, message: '条码和类型不能为空' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let itemId, itemName, itemQty;

      if (type === 'board') {
        const board = await client.query(`SELECT id, board_name FROM cabinet_board WHERE barcode = $1`, [barcode]);
        if (board.rows.length === 0) throw new Error('板件条码不存在');
        itemId = board.rows[0].id;
        itemName = board.rows[0].board_name;
        itemQty = 1;

        let whId = warehouse_id;
        if (!whId && warehouse_name) {
          const wh = await client.query(`SELECT id FROM warehouse WHERE warehouse_name = $1 LIMIT 1`, [warehouse_name]);
          if (wh.rows.length > 0) whId = wh.rows[0].id;
        }
        if (!whId) {
          const def = await client.query(`SELECT id FROM warehouse LIMIT 1`);
          if (def.rows.length > 0) whId = def.rows[0].id;
        }

        await client.query(
          `UPDATE cabinet_board SET current_location = '已出库', updated_at = NOW() WHERE id = $1`,
          [itemId]
        );

        await client.query(
          `INSERT INTO stock_record (id, material_id, warehouse_id, biz_type, biz_id, out_quantity, balance_quantity, operator_id, operator_name, remark, created_at)
           VALUES ($1, $2, $3, 'board_out', $4, 1, 0, $5, $6, $7, NOW())`,
          [uuidv4(), itemId, whId || null, order_id || null, operator_id || null, operator_name || '', remark || '板件扫码出库']
        );

      } else {
        const material = await client.query(
          `SELECT id, material_name FROM material WHERE material_code = $1 OR id::text = $1`,
          [barcode]
        );
        if (material.rows.length === 0) throw new Error('原材料条码不存在');
        itemId = material.rows[0].id;
        itemName = material.rows[0].material_name;
        itemQty = parseFloat(quantity) || 1;

        let whId = warehouse_id;
        if (!whId && warehouse_name) {
          const wh = await client.query(`SELECT id FROM warehouse WHERE warehouse_name = $1 LIMIT 1`, [warehouse_name]);
          if (wh.rows.length > 0) whId = wh.rows[0].id;
        }
        if (!whId) {
          const def = await client.query(`SELECT id FROM warehouse LIMIT 1`);
          if (def.rows.length > 0) whId = def.rows[0].id;
        }
        if (!whId) throw new Error('仓库不存在');

        const stock = await client.query(
          `SELECT quantity, locked_quantity FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2 FOR UPDATE`,
          [itemId, whId]
        );
        if (stock.rows.length === 0) throw new Error('库存记录不存在');
        const availQty = parseFloat(stock.rows[0].quantity) - parseFloat(stock.rows[0].locked_quantity || 0);
        if (availQty < itemQty) throw new Error(`库存不足，可用: ${availQty}`);

        const unitPriceVal = parseFloat(unit_price) || 0;
        const totalVal = unitPriceVal * itemQty;

        const stockOut = await client.query(
          `INSERT INTO stock_out (stock_out_no, warehouse_id, order_id, total_amount, operator_id, operator_name, remark, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
          [`OUT${Date.now()}`, whId, order_id || null, totalVal, operator_id || null, operator_name || '', remark || '扫码出库']
        );

        await client.query(
          `INSERT INTO stock_out_detail (stock_out_id, material_id, quantity, unit_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [stockOut.rows[0].id, itemId, itemQty, unitPriceVal, totalVal]
        );

        await client.query(
          `UPDATE stock_inventory SET quantity = quantity - $1, updated_at = NOW() WHERE material_id = $2 AND warehouse_id = $3`,
          [itemQty, itemId, whId]
        );

        await client.query(
          `INSERT INTO stock_record (id, material_id, warehouse_id, biz_type, biz_id, out_quantity, balance_quantity, operator_id, operator_name, remark, created_at)
           VALUES ($1, $2, $3, 'stock_out', $4, $5, $6, $7, $8, $9, NOW())`,
          [uuidv4(), itemId, whId, stockOut.rows[0].id, itemQty, availQty - itemQty, operator_id || null, operator_name || '', remark || '扫码出库']
        );
      }

      await client.query('COMMIT');
      logger.info(`扫码出库: barcode=${barcode}, type=${type}, qty=${itemQty}, name=${itemName}`);
      res.json({ success: true, message: '出库成功', data: { item_name: itemName, quantity: itemQty } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

// ============ 获取库位（仓库）列表 ============
router.get('/locations', async (req, res, next) => {
  try {
    const { warehouse_id } = req.query;
    let sql = `SELECT w.id, w.warehouse_code, w.warehouse_name, w.warehouse_type,
                      w.city, w.district, w.address, w.manager_name, w.phone, w.status,
                      COALESCE(SUM(si.quantity), 0) as total_quantity,
                      COUNT(DISTINCT CASE WHEN COALESCE(si.quantity, 0) > 0 THEN si.id END) as used_slots
               FROM warehouse w
               LEFT JOIN stock_inventory si ON w.id = si.warehouse_id`;
    const params = [];
    if (warehouse_id) { sql += ` WHERE w.id = $1`; params.push(warehouse_id); }
    sql += ` GROUP BY w.id ORDER BY w.warehouse_name`;
    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ============ 库存预警列表 ============
router.get('/alerts', async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = `SELECT m.id, m.material_name, m.material_code, m.category, m.unit,
                      m.min_stock, m.safe_stock,
                      COALESCE(si.quantity, 0) as current_quantity,
                      COALESCE(si.locked_quantity, 0) as locked_quantity,
                      w.warehouse_name,
                      CASE
                        WHEN COALESCE(si.quantity, 0) <= COALESCE(m.min_stock, 0) THEN 'critical'
                        WHEN COALESCE(si.quantity, 0) <= COALESCE(m.safe_stock, 0) THEN 'warning'
                        ELSE 'normal'
                      END as alert_level
               FROM material m
               LEFT JOIN stock_inventory si ON m.id = si.material_id
               LEFT JOIN warehouse w ON si.warehouse_id = w.id
               WHERE m.status = 'active'`;
    if (type === 'critical') {
      sql += ` AND COALESCE(si.quantity, 0) <= COALESCE(m.min_stock, 0)`;
    } else if (type === 'warning') {
      sql += ` AND COALESCE(si.quantity, 0) <= COALESCE(m.safe_stock, 0) AND COALESCE(si.quantity, 0) > COALESCE(m.min_stock, 0)`;
    } else {
      sql += ` AND COALESCE(si.quantity, 0) <= COALESCE(m.safe_stock, 0)`;
    }
    sql += ` ORDER BY COALESCE(si.quantity, 0) ASC, m.material_name`;
    const result = await db.query(sql);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ============ 原材料管理 ============

router.get('/materials', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, category, warehouse_id, low_stock } = req.query;
    const offset = (page - 1) * page_size;
    const params = [];
    let paramCount = 0;
    let where = 'WHERE 1=1';
    if (category) { where += ` AND m.category = $${++paramCount}`; params.push(category); }
    if (warehouse_id) { where += ` AND si.warehouse_id = $${++paramCount}`; params.push(warehouse_id); }
    if (low_stock === 'true') { where += ` AND COALESCE(si.quantity, 0) <= $${++paramCount}`; params.push(LOW_STOCK_THRESHOLD); }
    const result = await db.query(
      `SELECT m.*, COALESCE(si.quantity, 0) as quantity, COALESCE(si.locked_quantity, 0) as locked_quantity, w.warehouse_name
       FROM material m
       LEFT JOIN stock_inventory si ON m.id = si.material_id
       LEFT JOIN warehouse w ON si.warehouse_id = w.id
       ${where}
       ORDER BY m.category, m.material_name
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, parseInt(page_size), parseInt(offset)]
    );
    const count = await db.query(`SELECT COUNT(*) FROM material m ${where}`, params);
    res.json({ success: true, data: { list: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) } });
  } catch (err) { next(err); }
});

router.get('/materials/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的原材料ID格式' });
    }
    const result = await db.query(`SELECT m.*, COALESCE(si.quantity, 0) as quantity, COALESCE(si.locked_quantity, 0) as locked_quantity FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id WHERE m.id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '原材料不存在' });
    const stock = await db.query(`SELECT si.*, w.warehouse_name FROM stock_inventory si LEFT JOIN warehouse w ON si.warehouse_id = w.id WHERE si.material_id = $1`, [id]);
    res.json({ success: true, data: { ...result.rows[0], stocks: stock.rows } });
  } catch (err) { next(err); }
});

router.post('/materials', async (req, res, next) => {
  try {
    const { material_code, material_name, category, specification, unit, supplier_id, unit_price, min_stock, safe_stock } = req.body;
    const code = material_code || `MAT${Date.now()}`;
    const result = await db.query(
      `INSERT INTO material (material_code, material_name, category, specification, unit, supplier_id, unit_price, min_stock, safe_stock, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW()) RETURNING *`,
      [code, material_name, category, specification, unit, supplier_id || null, unit_price || 0, min_stock || 0, safe_stock || 0]
    );
    logger.info(`添加原材料: ${material_name}`);
    res.json({ success: true, data: result.rows[0], message: '原材料添加成功' });
  } catch (err) { next(err); }
});

router.put('/materials/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的原材料ID格式' });
    }
    const fields = req.body;
    const allowed = ['material_name', 'category', 'specification', 'unit', 'supplier_id', 'unit_price', 'min_stock', 'safe_stock', 'status'];
    const updates = [], values = [];
    let paramCount = 0;
    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key) && value !== undefined) { updates.push(`${key} = $${++paramCount}`); values.push(value); }
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: '没有有效字段更新' });
    updates.push(`updated_at = NOW()`); values.push(id);
    const result = await db.query(`UPDATE material SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`, values);
    res.json({ success: true, data: result.rows[0], message: '原材料更新成功' });
  } catch (err) { next(err); }
});

router.delete('/materials/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的原材料ID格式' });
    }
    const result = await db.query('DELETE FROM material WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '原材料不存在' });
    res.json({ success: true, message: '删除成功' });
  } catch (err) { next(err); }
});

// ============ 入库（手动） ============
router.post('/stock-in', async (req, res, next) => {
  try {
    const { material_id, warehouse_id, warehouse_name, quantity, unit_price, batch_no, supplier_id, order_no, invoice_no, remark } = req.body;
    if (!material_id || !quantity) return res.status(400).json({ success: false, message: '原材料、数量不能为空' });

    let whId = warehouse_id;
    if (!whId && warehouse_name) {
      const wh = await db.query('SELECT id FROM warehouse WHERE warehouse_name = $1 LIMIT 1', [warehouse_name]);
      if (wh.rows.length > 0) whId = wh.rows[0].id;
    }
    if (!whId) {
      const def = await db.query('SELECT id FROM warehouse LIMIT 1');
      if (def.rows.length > 0) whId = def.rows[0].id;
    }
    if (!whId) return res.status(400).json({ success: false, message: '仓库不存在，请先创建仓库' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const qty = parseFloat(quantity);
      const up = parseFloat(unit_price) || 0;
      const total = up * qty;

      const stockIn = await client.query(
        `INSERT INTO stock_in (stock_in_no, warehouse_id, supplier_id, order_id, batch_no, operator_id, operator_name, total_amount, invoice_no, remark, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
        [`IN${Date.now()}`, whId, supplier_id || null, order_no || null, batch_no || null, req.user?.id, req.user?.real_name || '', total, invoice_no || '', remark || '']
      );

      await client.query(
        `INSERT INTO stock_in_detail (stock_in_id, material_id, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [stockIn.rows[0].id, material_id, qty, up, total]
      );

      const exist = await client.query(
        `SELECT id FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2`,
        [material_id, whId]
      );
      if (exist.rows.length > 0) {
        await client.query(`UPDATE stock_inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`, [qty, exist.rows[0].id]);
      } else {
        await client.query(`INSERT INTO stock_inventory (id, material_id, warehouse_id, quantity, locked_quantity, created_at) VALUES ($1, $2, $3, $4, 0, NOW())`, [uuidv4(), material_id, whId, qty]);
      }

      const avail = await client.query(`SELECT COALESCE(quantity, 0) as q FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2`, [material_id, whId]);
      await client.query(
        `INSERT INTO stock_record (id, material_id, warehouse_id, biz_type, biz_id, in_quantity, balance_quantity, operator_id, operator_name, remark, created_at)
         VALUES ($1, $2, $3, 'stock_in', $4, $5, $6, $7, $8, $9, NOW())`,
        [uuidv4(), material_id, whId, stockIn.rows[0].id, qty, avail.rows[0]?.q || qty, req.user?.id, req.user?.real_name || '', remark || '']
      );

      await client.query('COMMIT');
      logger.info(`原材料入库: material=${material_id}, qty=${qty}`);
      res.json({ success: true, data: stockIn.rows[0], message: '入库成功' });
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
  } catch (err) { next(err); }
});

// ============ 出库（手动） ============
router.post('/stock-out', async (req, res, next) => {
  try {
    const { material_id, warehouse_id, warehouse_name, quantity, unit_price, order_id, remark } = req.body;
    if (!material_id || !quantity) return res.status(400).json({ success: false, message: '原材料、数量不能为空' });

    let whId = warehouse_id;
    if (!whId && warehouse_name) {
      const wh = await db.query('SELECT id FROM warehouse WHERE warehouse_name = $1 LIMIT 1', [warehouse_name]);
      if (wh.rows.length > 0) whId = wh.rows[0].id;
    }
    if (!whId) {
      const def = await db.query('SELECT id FROM warehouse LIMIT 1');
      if (def.rows.length > 0) whId = def.rows[0].id;
    }
    if (!whId) return res.status(400).json({ success: false, message: '仓库不存在，请先创建仓库' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const qty = parseFloat(quantity);
      const up = parseFloat(unit_price) || 0;
      const total = up * qty;

      const stock = await client.query(
        `SELECT quantity, locked_quantity FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2 FOR UPDATE`,
        [material_id, whId]
      );
      if (stock.rows.length === 0) throw new Error('库存记录不存在');
      const availQty = parseFloat(stock.rows[0].quantity) - parseFloat(stock.rows[0].locked_quantity || 0);
      if (availQty < qty) throw new Error(`库存不足，可用库存: ${availQty}`);

      const stockOut = await client.query(
        `INSERT INTO stock_out (stock_out_no, warehouse_id, order_id, total_amount, operator_id, operator_name, remark, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
        [`OUT${Date.now()}`, whId, order_id || null, total, req.user?.id, req.user?.real_name || '', remark || '']
      );

      await client.query(
        `INSERT INTO stock_out_detail (stock_out_id, material_id, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [stockOut.rows[0].id, material_id, qty, up, total]
      );

      await client.query(
        `UPDATE stock_inventory SET quantity = quantity - $1, updated_at = NOW() WHERE material_id = $2 AND warehouse_id = $3`,
        [qty, material_id, whId]
      );

      await client.query(
        `INSERT INTO stock_record (id, material_id, warehouse_id, biz_type, biz_id, out_quantity, balance_quantity, operator_id, operator_name, remark, created_at)
         VALUES ($1, $2, $3, 'stock_out', $4, $5, $6, $7, $8, $9, NOW())`,
        [uuidv4(), material_id, whId, stockOut.rows[0].id, qty, availQty - qty, req.user?.id, req.user?.real_name || '', remark || '']
      );

      await client.query('COMMIT');
      logger.info(`原材料出库: material=${material_id}, qty=${qty}`);
      res.json({ success: true, data: stockOut.rows[0], message: '出库成功' });
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
  } catch (err) { next(err); }
});

// ============ 库存记录（台账） ============
router.get('/stock-records', async (req, res, next) => {
  try {
    const { page = 1, page_size = 50, type, material_id } = req.query;
    const offset = (page - 1) * page_size;
    const params = [];
    let p = 0;
    let where = 'WHERE 1=1';
    if (type) { where += ` AND sr.biz_type = $${++p}`; params.push(type); }
    if (material_id) { where += ` AND sr.material_id = $${++p}`; params.push(material_id); }

    const sql = `SELECT sr.id, sr.biz_type, sr.in_quantity, sr.out_quantity, sr.balance_quantity,
                        sr.operator_name, sr.remark, sr.created_at,
                        COALESCE(m.material_name, '板件-' || sr.material_id::text) as material_name,
                        COALESCE(m.material_code, '') as material_code,
                        COALESCE(w.warehouse_name, '未知仓库') as warehouse_name
                 FROM stock_record sr
                 LEFT JOIN material m ON sr.material_id = m.id
                 LEFT JOIN warehouse w ON sr.warehouse_id = w.id
                 ${where}
                 ORDER BY sr.created_at DESC
                 LIMIT $${++p} OFFSET $${++p}`;
    params.push(parseInt(page_size), parseInt(offset));
    const result = await db.query(sql, params);

    let countSql = `SELECT COUNT(*) FROM stock_record sr ${where}`;
    const count = await db.query(countSql, params.slice(0, -2));

    res.json({ success: true, data: { list: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), page_size: parseInt(page_size) } });
  } catch (err) { next(err); }
});

// ============ 仓库列表 ============
router.get('/warehouses', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT w.*, COALESCE(SUM(si.quantity), 0) as total_quantity
       FROM warehouse w
       LEFT JOIN stock_inventory si ON w.id = si.warehouse_id
       GROUP BY w.id
       ORDER BY w.warehouse_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ============ 调拨 ============
router.post('/transfer', async (req, res, next) => {
  try {
    const { material_id, from_warehouse_id, to_warehouse_id, quantity, remark } = req.body;
    if (!material_id || !from_warehouse_id || !to_warehouse_id || !quantity) return res.status(400).json({ success: false, message: '参数不完整' });
    if (from_warehouse_id === to_warehouse_id) return res.status(400).json({ success: false, message: '调入仓库不能与调出仓库相同' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const stock = await client.query(
        `SELECT quantity FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2 FOR UPDATE`,
        [material_id, from_warehouse_id]
      );
      if (stock.rows.length === 0 || parseFloat(stock.rows[0].quantity) < parseFloat(quantity)) throw new Error('源仓库库存不足');

      await client.query(
        `UPDATE stock_inventory SET quantity = quantity - $1, updated_at = NOW() WHERE material_id = $2 AND warehouse_id = $3`,
        [quantity, material_id, from_warehouse_id]
      );

      const existTarget = await client.query(
        `SELECT id FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2`,
        [material_id, to_warehouse_id]
      );
      if (existTarget.rows.length > 0) {
        await client.query(`UPDATE stock_inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`, [quantity, existTarget.rows[0].id]);
      } else {
        await client.query(`INSERT INTO stock_inventory (id, material_id, warehouse_id, quantity, locked_quantity, created_at) VALUES ($1, $2, $3, $4, 0, NOW())`, [uuidv4(), material_id, to_warehouse_id, quantity]);
      }

      await client.query(
        `INSERT INTO stock_transfer (material_id, from_warehouse_id, to_warehouse_id, quantity, operator_id, remark, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [material_id, from_warehouse_id, to_warehouse_id, quantity, req.user?.id, remark]
      );

      await client.query('COMMIT');
      logger.info(`调拨: material=${material_id}, from=${from_warehouse_id}, to=${to_warehouse_id}, qty=${quantity}`);
      res.json({ success: true, message: '调拨成功' });
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
  } catch (err) { next(err); }
});

// ============ 库存汇总 ============


router.get('/summary', async (req, res, next) => {
  try {
    const total = await db.query("SELECT COUNT(DISTINCT m.id) as material_types, SUM(COALESCE(si.quantity, 0)) as total_quantity, SUM(COALESCE(si.quantity, 0) * COALESCE(m.unit_price, 0)) as total_value FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id WHERE m.status = 'active'");
    const cat = await db.query("SELECT m.category, COUNT(DISTINCT m.id) as material_types, SUM(COALESCE(si.quantity, 0)) as total_quantity FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id WHERE m.status = 'active' GROUP BY m.category ORDER BY m.category");
    const alert = await db.query("SELECT COUNT(*) as alert_count FROM material m LEFT JOIN stock_inventory si ON m.id = si.material_id WHERE m.status = 'active' AND COALESCE(si.quantity, 0) <= m.safe_stock");
    const todayIn = await db.query("SELECT COALESCE(SUM(sid.quantity), 0) as today_in FROM stock_in_detail sid JOIN stock_in si ON sid.stock_in_id = si.id WHERE si.created_at >= CURRENT_DATE");
    const todayOut = await db.query("SELECT COALESCE(SUM(sod.quantity), 0) as today_out FROM stock_out_detail sod JOIN stock_out so ON sod.stock_out_id = so.id WHERE so.created_at >= CURRENT_DATE");
    const boards = await db.query("SELECT COUNT(*) as total_boards FROM cabinet_board");
    res.json({ success: true, data: {
      total_materials: parseInt(total.rows[0].material_types || 0),
      total_quantity: parseFloat(total.rows[0].total_quantity || 0),
      total_value: parseFloat(total.rows[0].total_value || 0),
      by_category: cat.rows,
      alert_count: parseInt(alert.rows[0].alert_count || 0),
      today_in: parseFloat(todayIn.rows[0].today_in || 0),
      today_out: parseFloat(todayOut.rows[0].today_out || 0),
      total_boards: parseInt(boards.rows[0].total_boards || 0)
    }});
  } catch (err) { next(err); }
});

module.exports = router;
