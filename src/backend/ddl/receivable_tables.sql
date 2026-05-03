-- 应收款管理 DDL 脚本（幂等）
-- accounts_receivable: 应收账款主表
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES order_master(id),
  order_no VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES customer(id),
  customer_name VARCHAR(200),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  invoice_no VARCHAR(50),
  due_date DATE,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_term VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- collection_record: 收款记录表
CREATE TABLE IF NOT EXISTS collection_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES accounts_receivable(id),
  order_id UUID REFERENCES order_master(id),
  collection_no VARCHAR(50) NOT NULL,
  collection_amount DECIMAL(12,2) NOT NULL,
  collection_date DATE NOT NULL,
  collection_method VARCHAR(20),
  account_bank VARCHAR(50),
  operator_id UUID REFERENCES employee(id),
  operator_name VARCHAR(100),
  remark VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ar_order_id ON accounts_receivable(order_id);
CREATE INDEX IF NOT EXISTS idx_ar_customer_id ON accounts_receivable(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON accounts_receivable(payment_status);
CREATE INDEX IF NOT EXISTS idx_ar_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_cr_receivable_id ON collection_record(receivable_id);
CREATE INDEX IF NOT EXISTS idx_cr_order_id ON collection_record(order_id);
