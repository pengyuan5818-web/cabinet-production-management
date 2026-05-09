-- 审批管理数据库设计
-- 橱柜工厂管理系统

-- 审批申请表
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'purchase'|'expense'|'payment'|'order_change'
  title VARCHAR(200) NOT NULL,
  content JSONB, -- 申请内容（JSON格式）
  status VARCHAR(20) DEFAULT 'pending', -- 'pending'|'approved'|'rejected'
  applicant_id UUID NOT NULL,
  applicant_name VARCHAR(100),
  approver_id UUID, -- 主审批人
  approver_name VARCHAR(100),
  sign_type VARCHAR(10) DEFAULT 'single', -- 'single'单签/'all'会签/'any'或签
  approver_ids UUID[], -- 审批人ID列表（JSON数组）
  approver_names VARCHAR(500), -- 审批人名称列表（逗号分隔）
  opinion TEXT, -- 审批意见
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 审批历史表
CREATE TABLE IF NOT EXISTS approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  approver_id UUID NOT NULL,
  approver_name VARCHAR(100),
  action VARCHAR(20), -- 'approve'|'reject'
  opinion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_applicant ON approval_requests(applicant_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON approval_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_request ON approval_history(request_id);

-- 审批类型枚举值说明
COMMENT ON COLUMN approval_requests.type IS 'purchase:采购审批, expense:费用报销, payment:付款审批, order_change:订单变更';
COMMENT ON COLUMN approval_requests.sign_type IS 'single:单签(一人审批即可), all:会签(全部审批人通过), any:或签(任一审批人通过)';
