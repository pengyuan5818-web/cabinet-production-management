/**
 * 合同管理路由
 * 橱柜工厂管理系统
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// 合同状态映射
const CONTRACT_STATUS = {
  draft: '草稿',
  signed: '已签署',
  ongoing: '履行中',
  completed: '已完成',
  cancelled: '已取消'
};

const CONTRACT_TYPES = {
  sale: '销售合同',
  purchase: '采购合同',
  outsource: '外协合同'
};

// 生成合同编号
function generateContractNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `HT${year}${month}${day}${random}`;
}

// 获取合同列表
router.get('/', async (req, res) => {
  try {
    const { type, status, keyword, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (type) {
      whereClause += ` AND contract_type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (keyword) {
      whereClause += ` AND (title LIKE $${paramIndex} OR contract_no LIKE $${paramIndex} OR customer_name LIKE $${paramIndex})`;
      params.push(`%${keyword}%`);
      paramIndex++;
    }
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM contracts ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    params.push(pageSize, offset);
    const result = await pool.query(
      `SELECT id, contract_no, contract_type, title, customer_id, customer_name,
              order_id, amount, status, sign_date, start_date, end_date,
              created_by, created_by_name, created_at, updated_at
       FROM contracts 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );
    
    const list = result.rows.map(row => ({
      ...row,
      contract_type_text: CONTRACT_TYPES[row.contract_type] || row.contract_type,
      status_text: CONTRACT_STATUS[row.status] || row.status
    }));
    
    res.json({
      code: 0,
      data: {
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total
        }
      }
    });
  } catch (error) {
    console.error('获取合同列表失败:', error);
    res.status(500).json({ code: 500, message: '获取合同列表失败' });
  }
});

// 新建合同
router.post('/', async (req, res) => {
  try {
    const {
      contract_type, title, customer_id, customer_name, customer_phone,
      customer_address, order_id, amount, content, attachments,
      payment_terms, delivery_terms, warranty_terms,
      created_by, created_by_name
    } = req.body;
    
    const contract_no = generateContractNo();
    
    const result = await pool.query(
      `INSERT INTO contracts 
       (contract_no, contract_type, title, customer_id, customer_name, 
        customer_phone, customer_address, order_id, amount, content, attachments,
        payment_terms, delivery_terms, warranty_terms, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [contract_no, contract_type || 'sale', title, customer_id, customer_name,
       customer_phone, customer_address, order_id, amount || 0, content,
       attachments ? JSON.stringify(attachments) : null,
       payment_terms, delivery_terms, warranty_terms, created_by, created_by_name]
    );
    
    // 记录操作历史
    await pool.query(
      `INSERT INTO contract_history (contract_id, action, operator_id, operator_name, detail)
       VALUES ($1, 'create', $2, $3, '创建合同')`,
      [result.rows[0].id, created_by, created_by_name]
    );
    
    res.json({
      code: 0,
      data: result.rows[0],
      message: '合同创建成功'
    });
  } catch (error) {
    console.error('创建合同失败:', error);
    res.status(500).json({ code: 500, message: '创建合同失败' });
  }
});

// 获取合同详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT c.*, 
              json_agg(ct.*) FILTER (WHERE ct.id IS NOT NULL) as terms,
              json_agg(ch.*) FILTER (WHERE ch.id IS NOT NULL) ORDER BY ch.created_at as history
       FROM contracts c
       LEFT JOIN contract_terms ct ON c.id = ct.contract_id
       LEFT JOIN contract_history ch ON c.id = ch.contract_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '合同不存在' });
    }
    
    const row = result.rows[0];
    const data = {
      ...row,
      contract_type_text: CONTRACT_TYPES[row.contract_type] || row.contract_type,
      status_text: CONTRACT_STATUS[row.status] || row.status,
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      terms: row.terms ? row.terms.filter(t => t.id).sort((a, b) => a.sort_order - b.sort_order) : [],
      history: row.history ? row.history.filter(h => h.id) : []
    };
    
    res.json({ code: 0, data });
  } catch (error) {
    console.error('获取合同详情失败:', error);
    res.status(500).json({ code: 500, message: '获取合同详情失败' });
  }
});

// 更新合同
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, customer_id, customer_name, customer_phone, customer_address,
      order_id, amount, content, attachments, payment_terms, delivery_terms,
      warranty_terms, start_date, end_date, operator_id, operator_name
    } = req.body;
    
    // 检查合同状态
    const checkResult = await pool.query(
      'SELECT status FROM contracts WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '合同不存在' });
    }
    
    if (checkResult.rows[0].status !== 'draft') {
      return res.status(400).json({ code: 400, message: '只有草稿状态的合同可以编辑' });
    }
    
    const result = await pool.query(
      `UPDATE contracts SET
        title = COALESCE($1, title),
        customer_id = COALESCE($2, customer_id),
        customer_name = COALESCE($3, customer_name),
        customer_phone = COALESCE($4, customer_phone),
        customer_address = COALESCE($5, customer_address),
        order_id = COALESCE($6, order_id),
        amount = COALESCE($7, amount),
        content = COALESCE($8, content),
        attachments = COALESCE($9, attachments),
        payment_terms = COALESCE($10, payment_terms),
        delivery_terms = COALESCE($11, delivery_terms),
        warranty_terms = COALESCE($12, warranty_terms),
        start_date = COALESCE($13, start_date),
        end_date = COALESCE($14, end_date),
        updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [title, customer_id, customer_name, customer_phone, customer_address,
       order_id, amount, content, 
       attachments ? JSON.stringify(attachments) : null,
       payment_terms, delivery_terms, warranty_terms, start_date, end_date, id]
    );
    
    // 记录操作历史
    await pool.query(
      `INSERT INTO contract_history (contract_id, action, operator_id, operator_name, detail)
       VALUES ($1, 'update', $2, $3, '更新合同信息')`,
      [id, operator_id, operator_name]
    );
    
    res.json({
      code: 0,
      data: result.rows[0],
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新合同失败:', error);
    res.status(500).json({ code: 500, message: '更新合同失败' });
  }
});

// 删除合同（仅限草稿状态）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM contracts WHERE id = $1 AND status = $2 RETURNING id',
      [id, 'draft']
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ code: 400, message: '无法删除该合同' });
    }
    
    // 删除关联的条款和历史
    await pool.query('DELETE FROM contract_terms WHERE contract_id = $1', [id]);
    await pool.query('DELETE FROM contract_history WHERE contract_id = $1', [id]);
    
    res.json({
      code: 0,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除合同失败:', error);
    res.status(500).json({ code: 500, message: '删除合同失败' });
  }
});

// 签署合同
router.put('/:id/sign', async (req, res) => {
  try {
    const { id } = req.params;
    const { sign_date, operator_id, operator_name } = req.body;
    
    const result = await pool.query(
      `UPDATE contracts 
       SET status = 'signed', sign_date = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'draft'
       RETURNING *`,
      [sign_date || new Date(), id]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ code: 400, message: '合同签署失败' });
    }
    
    // 记录操作历史
    await pool.query(
      `INSERT INTO contract_history (contract_id, action, operator_id, operator_name, detail)
       VALUES ($1, 'sign', $2, $3, '签署合同')`,
      [id, operator_id, operator_name]
    );
    
    res.json({
      code: 0,
      data: result.rows[0],
      message: '合同签署成功'
    });
  } catch (error) {
    console.error('签署合同失败:', error);
    res.status(500).json({ code: 500, message: '签署合同失败' });
  }
});

// 合同条款管理
router.get('/:id/terms', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM contract_terms 
       WHERE contract_id = $1 
       ORDER BY sort_order ASC`,
      [id]
    );
    
    res.json({
      code: 0,
      data: result.rows
    });
  } catch (error) {
    console.error('获取合同条款失败:', error);
    res.status(500).json({ code: 500, message: '获取合同条款失败' });
  }
});

// 添加合同条款
router.post('/:id/terms', async (req, res) => {
  try {
    const { id } = req.params;
    const { term_title, term_content, sort_order } = req.body;
    
    const result = await pool.query(
      `INSERT INTO contract_terms (contract_id, term_title, term_content, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, term_title, term_content, sort_order || 0]
    );
    
    res.json({
      code: 0,
      data: result.rows[0],
      message: '条款添加成功'
    });
  } catch (error) {
    console.error('添加合同条款失败:', error);
    res.status(500).json({ code: 500, message: '添加合同条款失败' });
  }
});

// 更新合同条款
router.put('/:id/terms/:termId', async (req, res) => {
  try {
    const { id, termId } = req.params;
    const { term_title, term_content, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE contract_terms SET
        term_title = COALESCE($1, term_title),
        term_content = COALESCE($2, term_content),
        sort_order = COALESCE($3, sort_order)
       WHERE id = $4 AND contract_id = $5
       RETURNING *`,
      [term_title, term_content, sort_order, termId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '条款不存在' });
    }
    
    res.json({
      code: 0,
      data: result.rows[0],
      message: '条款更新成功'
    });
  } catch (error) {
    console.error('更新合同条款失败:', error);
    res.status(500).json({ code: 500, message: '更新合同条款失败' });
  }
});

// 删除合同条款
router.delete('/:id/terms/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    
    await pool.query(
      'DELETE FROM contract_terms WHERE id = $1',
      [termId]
    );
    
    res.json({
      code: 0,
      message: '条款删除成功'
    });
  } catch (error) {
    console.error('删除合同条款失败:', error);
    res.status(500).json({ code: 500, message: '删除合同条款失败' });
  }
});

// 更新合同状态
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, operator_id, operator_name } = req.body;
    
    const validStatuses = ['draft', 'signed', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的状态' });
    }
    
    const result = await pool.query(
      `UPDATE contracts SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '合同不存在' });
    }
    
    // 记录操作历史
    const actionMap = {
      signed: 'sign',
      ongoing: 'update',
      completed: 'complete',
      cancelled: 'cancel'
    };
    
    await pool.query(
      `INSERT INTO contract_history (contract_id, action, operator_id, operator_name, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, actionMap[status] || 'update', operator_id, operator_name, `更新状态为${CONTRACT_STATUS[status]}`]
    );
    
    res.json({
      code: 0,
      data: result.rows[0],
      message: '状态更新成功'
    });
  } catch (error) {
    console.error('更新合同状态失败:', error);
    res.status(500).json({ code: 500, message: '更新合同状态失败' });
  }
});

module.exports = router;
