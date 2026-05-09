-- 合同管理数据库设计
-- 橱柜工厂管理系统

-- 合同表
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no VARCHAR(50) UNIQUE NOT NULL,
  contract_type VARCHAR(20) DEFAULT 'sale', -- 'sale'|'purchase'|'outsource'
  title VARCHAR(200),
  customer_id UUID,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  customer_address VARCHAR(500),
  order_id UUID, -- 关联订单
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft'|'signed'|'ongoing'|'completed'|'cancelled'
  sign_date DATE,
  start_date DATE,
  end_date DATE,
  content TEXT, -- 合同正文
  attachments JSONB, -- 附件URL列表 [{name, url}]
  payment_terms VARCHAR(100), -- 付款条款
  delivery_terms VARCHAR(100), -- 交货条款
  warranty_terms VARCHAR(200), -- 保修条款
  created_by UUID,
  created_by_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 合同条款表
CREATE TABLE IF NOT EXISTS contract_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  term_title VARCHAR(200),
  term_content TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 合同操作历史表
CREATE TABLE IF NOT EXISTS contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create'|'update'|'sign'|'complete'|'cancel'
  operator_id UUID,
  operator_name VARCHAR(100),
  detail TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_contracts_no ON contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_order ON contracts(order_id);
CREATE INDEX IF NOT EXISTS idx_contract_terms_contract ON contract_terms(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_contract ON contract_history(contract_id);

-- 合同类型枚举说明
COMMENT ON COLUMN contracts.contract_type IS 'sale:销售合同, purchase:采购合同, outsource:外协合同';
COMMENT ON COLUMN contracts.status IS 'draft:草稿, signed:已签署, ongoing:履行中, completed:已完成, cancelled:已取消';
