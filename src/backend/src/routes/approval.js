/**
 * 审批管理路由
 * 橱柜工厂管理系统
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// 审批类型映射
const APPROVAL_TYPES = {
  purchase: '采购审批',
  expense: '费用报销',
  payment: '付款审批',
  order_change: '订单变更'
};

const APPROVAL_STATUS = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝'
};

// 获取审批列表
router.get('/', async (req, res) => {
  try {
    const { type, status, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM approval_requests ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    params.push(pageSize, offset);
    const result = await pool.query(
      `SELECT id, type, title, content, status, applicant_id, applicant_name,
              approver_id, approver_name, sign_type, approver_ids, approver_names,
              opinion, created_at, updated_at
       FROM approval_requests 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );
    
    // 格式化数据
    const list = result.rows.map(row => ({
      ...row,
      type_text: APPROVAL_TYPES[row.type] || row.type,
      status_text: APPROVAL_STATUS[row.status] || row.status,
      content: row.content ? JSON.parse(row.content) : null
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
    console.error('获取审批列表失败:', error);
    res.status(500).json({ code: 500, message: '获取审批列表失败' });
  }
});

// 获取待我审批的列表
router.get('/todo', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.headers['x-user-id'] || 'default-user';
    
    const result = await pool.query(
      `SELECT id, type, title, content, status, applicant_id, applicant_name,
              approver_id, approver_name, sign_type, approver_ids, approver_names,
              opinion, created_at, updated_at
       FROM approval_requests 
       WHERE status = 'pending' 
         AND (approver_id = $1 OR $1 = ANY(approver_ids))
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    
    const list = result.rows.map(row => ({
      ...row,
      type_text: APPROVAL_TYPES[row.type] || row.type,
      status_text: '待审批',
      content: row.content ? JSON.parse(row.content) : null
    }));
    
    res.json({
      code: 0,
      data: { list }
    });
  } catch (error) {
    console.error('获取待审批列表失败:', error);
    res.status(500).json({ code: 500, message: '获取待审批列表失败' });
  }
});

// 获取我的申请
router.get('/my', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.headers['x-user-id'] || 'default-user';
    
    const result = await pool.query(
      `SELECT id, type, title, content, status, applicant_id, applicant_name,
              approver_id, approver_name, sign_type, approver_ids, approver_names,
              opinion, created_at, updated_at
       FROM approval_requests 
       WHERE applicant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    
    const list = result.rows.map(row => ({
      ...row,
      type_text: APPROVAL_TYPES[row.type] || row.type,
      status_text: APPROVAL_STATUS[row.status] || row.status,
      content: row.content ? JSON.parse(row.content) : null
    }));
    
    res.json({
      code: 0,
      data: { list }
    });
  } catch (error) {
    console.error('获取我的申请失败:', error);
    res.status(500).json({ code: 500, message: '获取我的申请失败' });
  }
});

// 提交审批申请
router.post('/', async (req, res) => {
  try {
    const {
      type, title, content, applicant_id, applicant_name,
      approver_id, approver_name, sign_type, approver_ids, approver_names
    } = req.body;
    
    if (!type || !title || !applicant_id) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }
    
    const result = await pool.query(
      `INSERT INTO approval_requests 
       (type, title, content, applicant_id, applicant_name, approver_id, 
        approver_name, sign_type, approver_ids, approver_names)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [type, title, content ? JSON.stringify(content) : null, 
       applicant_id, applicant_name, approver_id, approver_name,
       sign_type || 'single', approver_ids || [], approver_names || '']
    );
    
    res.json({
      code: 0,
      data: result.rows[0],
      message: '提交成功'
    });
  } catch (error) {
    console.error('提交审批申请失败:', error);
    res.status(500).json({ code: 500, message: '提交审批申请失败' });
  }
});

// 获取审批详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT ar.*, 
              json_agg(ah.*) FILTER (WHERE ah.id IS NOT NULL) as history
       FROM approval_requests ar
       LEFT JOIN approval_history ah ON ar.id = ah.request_id
       WHERE ar.id = $1
       GROUP BY ar.id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '审批不存在' });
    }
    
    const row = result.rows[0];
    const data = {
      ...row,
      type_text: APPROVAL_TYPES[row.type] || row.type,
      status_text: APPROVAL_STATUS[row.status] || row.status,
      content: row.content ? JSON.parse(row.content) : null,
      history: row.history ? row.history.map(h => ({
        ...h,
        action_text: h.action === 'approve' ? '通过' : '拒绝'
      })) : []
    };
    
    res.json({ code: 0, data });
  } catch (error) {
    console.error('获取审批详情失败:', error);
    res.status(500).json({ code: 500, message: '获取审批详情失败' });
  }
});

// 审批通过
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id, approver_name, opinion } = req.body;
    
    // 检查审批是否存在且状态为待审批
    const checkResult = await pool.query(
      'SELECT status, sign_type, approver_ids FROM approval_requests WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '审批不存在' });
    }
    
    const approval = checkResult.rows[0];
    if (approval.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '该审批已处理' });
    }
    
    // 根据审批类型判断是否通过
    let newStatus = 'approved';
    if (approval.sign_type === 'all') {
      // 会签模式：检查是否所有审批人都已审批
      const historyResult = await pool.query(
        'SELECT COUNT(*) FROM approval_history WHERE request_id = $1',
        [id]
      );
      const approvedCount = parseInt(historyResult.rows[0].count);
      if (approvedCount + 1 < approval.approver_ids.length) {
        newStatus = 'pending';
      }
    } else if (approval.sign_type === 'any') {
      // 或签模式：任一审批人通过即可
      newStatus = 'approved';
    }
    
    // 更新审批状态
    await pool.query(
      `UPDATE approval_requests 
       SET status = $1, opinion = $2, updated_at = NOW()
       WHERE id = $3`,
      [newStatus, opinion, id]
    );
    
    // 记录审批历史
    await pool.query(
      `INSERT INTO approval_history (request_id, approver_id, approver_name, action, opinion)
       VALUES ($1, $2, $3, 'approve', $4)`,
      [id, approver_id, approver_name, opinion]
    );
    
    res.json({
      code: 0,
      data: { status: newStatus },
      message: '审批通过'
    });
  } catch (error) {
    console.error('审批通过失败:', error);
    res.status(500).json({ code: 500, message: '审批通过失败' });
  }
});

// 审批拒绝
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id, approver_name, opinion } = req.body;
    
    // 检查审批是否存在且状态为待审批
    const checkResult = await pool.query(
      'SELECT status FROM approval_requests WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '审批不存在' });
    }
    
    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ code: 400, message: '该审批已处理' });
    }
    
    // 更新审批状态
    await pool.query(
      `UPDATE approval_requests 
       SET status = 'rejected', opinion = $1, updated_at = NOW()
       WHERE id = $2`,
      [opinion, id]
    );
    
    // 记录审批历史
    await pool.query(
      `INSERT INTO approval_history (request_id, approver_id, approver_name, action, opinion)
       VALUES ($1, $2, $3, 'reject', $4)`,
      [id, approver_id, approver_name, opinion]
    );
    
    res.json({
      code: 0,
      message: '审批已拒绝'
    });
  } catch (error) {
    console.error('审批拒绝失败:', error);
    res.status(500).json({ code: 500, message: '审批拒绝失败' });
  }
});

// 删除审批申请（仅限草稿状态）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM approval_requests WHERE id = $1 AND status = $2 RETURNING id',
      [id, 'pending']
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ code: 400, message: '无法删除该审批' });
    }
    
    res.json({
      code: 0,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除审批失败:', error);
    res.status(500).json({ code: 500, message: '删除审批失败' });
  }
});

module.exports = router;
