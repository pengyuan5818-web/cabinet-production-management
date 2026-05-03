/**
 * 供应商采购路由
 * 根据订单BOM自动生成采购建议，关联供应商，生成采购单
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * 生成采购单号
 */
function generateOrderNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `PO${dateStr}${random}`;
}

/**
 * GET /api/purchase/suggestions
 * 采购建议列表 - BOM展开后的原材料缺口清单
 */
router.get('/suggestions', async (req, res, next) => {
  try {
    const { order_id, status } = req.query;

    // 先查已有采购建议
    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (order_id) {
      whereClause.push(`ps.order_id = $${++paramCount}`);
      params.push(order_id);
    }
    if (status) {
      whereClause.push(`ps.status = $${++paramCount}`);
      params.push(status);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(50, 0);

    const result = await db.query(
      `SELECT ps.*,
              om.order_no as source_order_no,
              m.material_name, m.material_code, m.unit, m.unit_price,
              s.supplier_name as suggested_supplier_name
       FROM purchase_suggestion ps
       LEFT JOIN order_master om ON ps.order_id = om.id
       LEFT JOIN material m ON ps.material_id = m.id
       LEFT JOIN supplier s ON ps.suggested_supplier_id = s.id
       ${where}
       ORDER BY ps.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/purchase/suggestions/generate
 * 生成采购建议 - 根据订单BOM展开
 */
router.post('/suggestions/generate', async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: '缺少order_id' });
    }

    // 查订单板件
    const boardsResult = await db.query(
      `SELECT id, order_id, board_name FROM cabinet_board WHERE order_id = $1`,
      [order_id]
    );

    if (boardsResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '订单没有板件' });
    }

    // 查订单BOM材料配比
    const bomResult = await db.query(
      `SELECT ob.*, m.material_name, m.material_code, m.unit, m.unit_price, m.supplier_id
       FROM order_bom ob
       JOIN material m ON ob.material_id = m.id
       WHERE ob.order_id = $1`,
      [order_id]
    );

    // 按材料汇总需求量
    const materialDemand = {};
    for (const bom of bomResult.rows) {
      const mid = bom.material_id;
      if (!materialDemand[mid]) {
        materialDemand[mid] = {
          material_id: mid,
          material_name: bom.material_name,
          material_code: bom.material_code,
          unit: bom.unit,
          unit_price: bom.unit_price || 0,
          supplier_id: bom.supplier_id,
          required_quantity: 0
        };
      }
      materialDemand[mid].required_quantity += parseFloat(bom.quantity || 0);
    }

    // 查当前库存
    const materialIds = Object.keys(materialDemand);
    let stockMap = {};
    if (materialIds.length > 0) {
      const stockResult = await db.query(
        `SELECT material_id, COALESCE(quantity, 0) as quantity FROM stock_inventory WHERE material_id = ANY($1)`,
        [materialIds]
      );
      for (const row of stockResult.rows) {
        stockMap[row.material_id] = parseFloat(row.quantity);
      }
    }

    // 计算缺口，生成建议
    const suggestions = [];
    for (const [mid, mat] of Object.entries(materialDemand)) {
      const currentStock = stockMap[mid] || 0;
      const shortage = mat.required_quantity - currentStock;
      if (shortage > 0) {
        // 查默认供应商
        let supplierName = null;
        if (mat.supplier_id) {
          const supResult = await db.query(`SELECT supplier_name FROM supplier WHERE id = $1`, [mat.supplier_id]);
          if (supResult.rows.length > 0) supplierName = supResult.rows[0].supplier_name;
        }
        suggestions.push({
          order_id,
          material_id: mid,
          material_name: mat.material_name,
          material_code: mat.material_code,
          unit: mat.unit,
          required_quantity: mat.required_quantity,
          current_stock: currentStock,
          shortage_quantity: shortage,
          suggested_quantity: shortage,
          estimated_price: (mat.unit_price || 0) * shortage,
          suggested_supplier_id: mat.supplier_id,
          suggested_supplier_name: supplierName
        });
      }
    }

    // 写入 purchase_suggestion 表
    if (suggestions.length > 0) {
      const insertResult = await db.query(
        `INSERT INTO purchase_suggestion
          (order_id, material_id, material_name, material_code, unit,
           required_quantity, current_stock, shortage_quantity,
           suggested_quantity, estimated_price, suggested_supplier_id, suggested_supplier_name)
         VALUES ${suggestions.map((_, i) =>
          `($${i*12+1}, $${i*12+2}, $${i*12+3}, $${i*12+4}, $${i*12+5},
           $${i*12+6}, $${i*12+7}, $${i*12+8}, $${i*12+9}, $${i*12+10}, $${i*12+11}, $${i*12+12})`
         ).join(', ')}
         RETURNING *`,
        suggestions.flatMap(s => [
          s.order_id, s.material_id, s.material_name, s.material_code, s.unit,
          s.required_quantity, s.current_stock, s.shortage_quantity,
          s.suggested_quantity, s.estimated_price, s.suggested_supplier_id, s.suggested_supplier_name
        ])
      );
      res.json({ success: true, data: insertResult.rows, count: insertResult.rows.length });
    } else {
      res.json({ success: true, data: [], count: 0, message: '库存充足，无需采购' });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/purchase/suggestions/:id
 * 采购建议详情
 */
router.get('/suggestions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的建议ID格式' });
    }
    const result = await db.query(
      `SELECT ps.*,
              om.order_no as source_order_no,
              m.material_name, m.material_code, m.unit, m.unit_price,
              s.supplier_name as suggested_supplier_name
       FROM purchase_suggestion ps
       LEFT JOIN order_master om ON ps.order_id = om.id
       LEFT JOIN material m ON ps.material_id = m.id
       LEFT JOIN supplier s ON ps.suggested_supplier_id = s.id
       WHERE ps.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未找到' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/purchase/suggestions/:id/confirm
 * 确认采购建议 → 生成采购单
 */
router.post('/suggestions/:id/confirm', async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { supplier_id, expected_date, operator_id, operator_name } = req.body;
    if (!supplier_id || !operator_id) {
      return res.status(400).json({ success: false, message: '缺少supplier_id或operator_id' });
    }

    // 查建议详情
    const sugResult = await client.query(
      `SELECT ps.*, om.order_no
       FROM purchase_suggestion ps
       LEFT JOIN order_master om ON ps.order_id = om.id
       WHERE ps.id = $1 AND ps.status = 'pending'`,
      [req.params.id]
    );
    if (sugResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '采购建议不存在或已处理' });
    }
    const sug = sugResult.rows[0];

    // 查供应商名
    const supResult = await client.query(`SELECT supplier_name FROM supplier WHERE id = $1`, [supplier_id]);
    const supplierName = supResult.rows.length > 0 ? supResult.rows[0].supplier_name : '';

    // 创建采购单
    const orderResult = await client.query(
      `INSERT INTO purchase_order
        (order_no, supplier_id, supplier_name, expected_date, operator_id, operator_name, status, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7)
       RETURNING *`,
      [
        generateOrderNo(),
        supplier_id,
        supplierName,
        expected_date || null,
        operator_id,
        operator_name,
        sug.estimated_price || 0
      ]
    );
    const purchaseOrder = orderResult.rows[0];

    // 创建采购明细
    const itemResult = await client.query(
      `INSERT INTO purchase_item
        (purchase_order_id, material_id, material_name, material_code, unit,
         quantity, unit_price, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        purchaseOrder.id,
        sug.material_id,
        sug.material_name,
        sug.material_code,
        sug.unit,
        sug.suggested_quantity,
        sug.estimated_price / (sug.suggested_quantity || 1),
        sug.estimated_price
      ]
    );

    // 更新建议状态
    await client.query(
      `UPDATE purchase_suggestion SET status = 'confirmed' WHERE id = $1`,
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: { purchase_order: purchaseOrder, purchase_item: itemResult.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/purchase/orders
 * 采购单列表
 */
router.get('/orders', async (req, res, next) => {
  try {
    const { status, page = 1, page_size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);

    let whereClause = ['1=1'];
    const params = [];
    let paramCount = 0;

    if (status) {
      whereClause.push(`po.status = $${++paramCount}`);
      params.push(status);
    }

    const where = 'WHERE ' + whereClause.join(' AND ');
    params.push(parseInt(page_size), offset);

    const result = await db.query(
      `SELECT po.*,
              s.supplier_name,
              e.employee_name as operator_name
       FROM purchase_order po
       LEFT JOIN supplier s ON po.supplier_id = s.id
       LEFT JOIN employee e ON po.operator_id = e.id
       ${where}
       ORDER BY po.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM purchase_order po ${where}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      page_size: parseInt(page_size)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/purchase/order/:id
 * 采购单详情（含明细）
 */
router.get('/order/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的采购单ID格式' });
    }
    const orderResult = await db.query(
      `SELECT po.*,
              s.supplier_name,
              e.employee_name as operator_name
       FROM purchase_order po
       LEFT JOIN supplier s ON po.supplier_id = s.id
       LEFT JOIN employee e ON po.operator_id = e.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未找到' });
    }

    const itemsResult = await db.query(
      `SELECT pi.*, m.material_name, m.material_code, m.unit
       FROM purchase_item pi
       LEFT JOIN material m ON pi.material_id = m.id
       WHERE pi.purchase_order_id = $1
       ORDER BY pi.created_at`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/purchase/order
 * 创建采购单（手动）
 */
router.post('/order', async (req, res, next) => {
  try {
    const { supplier_id, expected_date, operator_id, operator_name, remark, items } = req.body;
    if (!supplier_id || !operator_id) {
      return res.status(400).json({ success: false, message: '缺少supplier_id或operator_id' });
    }

    // 查供应商名
    const supResult = await db.query(`SELECT supplier_name FROM supplier WHERE id = $1`, [supplier_id]);
    const supplierName = supResult.rows.length > 0 ? supResult.rows[0].supplier_name : '';

    // 计算总金额
    let totalAmount = 0;
    if (items && items.length > 0) {
      totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    }

    const orderResult = await db.query(
      `INSERT INTO purchase_order
        (order_no, supplier_id, supplier_name, expected_date, operator_id, operator_name, remark, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING *`,
      [
        generateOrderNo(),
        supplier_id,
        supplierName,
        expected_date || null,
        operator_id,
        operator_name,
        remark || '',
        totalAmount
      ]
    );

    const purchaseOrder = orderResult.rows[0];

    // 插入明细
    if (items && items.length > 0) {
      for (const item of items) {
        const unitPrice = parseFloat(item.unit_price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        await db.query(
          `INSERT INTO purchase_item
            (purchase_order_id, material_id, material_name, material_code, unit, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            purchaseOrder.id,
            item.material_id,
            item.material_name,
            item.material_code,
            item.unit,
            quantity,
            unitPrice,
            unitPrice * quantity
          ]
        );
      }
    }

    res.json({ success: true, data: purchaseOrder });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/purchase/order/:id
 * 更新采购单状态
 */
router.put('/order/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ success: false, message: '无效的采购单ID格式' });
    }
    const { status, expected_date, received_date, remark } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (status) {
      updates.push(`status = $${++paramCount}`);
      params.push(status);
    }
    if (expected_date !== undefined) {
      updates.push(`expected_date = $${++paramCount}`);
      params.push(expected_date);
    }
    if (received_date !== undefined) {
      updates.push(`received_date = $${++paramCount}`);
      params.push(received_date);
    }
    if (remark !== undefined) {
      updates.push(`remark = $${++paramCount}`);
      params.push(remark);
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      return res.status(400).json({ success: false, message: '没有更新字段' });
    }

    params.push(req.params.id);
    const result = await db.query(
      `UPDATE purchase_order SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未找到' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/purchase/order/:id/receive
 * 采购入库
 */
router.post('/order/:id/receive', async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: '缺少items' });
    }

    // 查采购单
    const orderResult = await client.query(
      `SELECT * FROM purchase_order WHERE id = $1`,
      [req.params.id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '采购单不存在' });
    }

    // 查找默认仓库（原材料仓库）
    const whResult = await client.query(
      `SELECT id FROM warehouse WHERE warehouse_name LIKE '%原材料%' LIMIT 1`
    );
    const warehouseId = whResult.rows.length > 0 ? whResult.rows[0].id : null;

    // 更新每个明细的已收货数量和状态
    for (const item of items) {
      const { item_id, received_quantity } = item;
      const recvQty = parseFloat(received_quantity) || 0;
      if (recvQty <= 0) continue;

      // 查明细
      const itemResult = await client.query(
        `SELECT * FROM purchase_item WHERE id = $1 AND purchase_order_id = $2`,
        [item_id, req.params.id]
      );
      if (itemResult.rows.length === 0) continue;

      const existing = itemResult.rows[0];
      const newReceived = (parseFloat(existing.received_quantity) || 0) + recvQty;
      const newStatus = newReceived >= parseFloat(existing.quantity) ? 'received' : 'partial';

      await client.query(
        `UPDATE purchase_item SET received_quantity = $1, status = $2 WHERE id = $3`,
        [newReceived, newStatus, item_id]
      );

      // 更新库存（upsert）
      if (warehouseId) {
        const existInv = await client.query(
          `SELECT id, quantity FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2`,
          [existing.material_id, warehouseId]
        );
        if (existInv.rows.length > 0) {
          await client.query(
            `UPDATE stock_inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`,
            [recvQty, existInv.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO stock_inventory (id, material_id, warehouse_id, quantity, locked_quantity, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW())`,
            [existing.material_id, warehouseId, recvQty]
          );
        }
        // 记录库存流水
        await client.query(
          `INSERT INTO stock_record (id, material_id, warehouse_id, biz_type, biz_id, in_quantity, balance_quantity, remark, created_at)
           VALUES (gen_random_uuid(), $1, $2, 'stock_in', $3, $4, COALESCE((SELECT quantity FROM stock_inventory WHERE material_id = $1 AND warehouse_id = $2), $4), $5, NOW())`,
          [existing.material_id, warehouseId, req.params.id, recvQty, `采购入库-${item_id}`]
        );
      }
    }

    // 更新采购单状态
    const itemsResult = await client.query(
      `SELECT status FROM purchase_item WHERE purchase_order_id = $1`,
      [req.params.id]
    );
    const allReceived = itemsResult.rows.every(i => i.status === 'received');
    const anyPartial = itemsResult.rows.some(i => i.status === 'partial' || i.status === 'received');
    let newOrderStatus = 'confirmed';
    if (allReceived) newOrderStatus = 'received';
    else if (anyPartial) newOrderStatus = 'partial_received';

    await client.query(
      `UPDATE purchase_order SET status = $1, received_date = CASE WHEN $1 = 'received' THEN CURRENT_DATE ELSE received_date END, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newOrderStatus, req.params.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: '入库成功', status: newOrderStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
