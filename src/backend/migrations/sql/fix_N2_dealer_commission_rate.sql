-- ================================================
-- Bug N2 修复：dealer 表缺少 commission_rate 字段
-- 执行方式：pgAdmin 或 psql 运行此 SQL
-- ================================================

-- 1. dealer 表增加 commission_rate 字段
ALTER TABLE dealer ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.05;

-- 2. 更新现有经销商默认佣金率 5%
UPDATE dealer SET commission_rate = 0.05 WHERE commission_rate IS NULL OR commission_rate = 0;

-- 3. dealer_commission 表增加字段（如果 migrations/006 未执行）
ALTER TABLE dealer_commission ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE dealer_commission ADD COLUMN IF NOT EXISTS settlement_batch VARCHAR(50);
ALTER TABLE dealer_commission ADD COLUMN IF NOT EXISTS settled_by UUID;
ALTER TABLE dealer_commission ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP;
ALTER TABLE dealer_commission ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. 新增结算记录表（如果 migrations/006 未执行）
CREATE TABLE IF NOT EXISTS dealer_commission_settlement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_no VARCHAR(50) UNIQUE NOT NULL,
  dealer_id UUID NOT NULL REFERENCES dealer(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(20),
  paid_amount NUMERIC(12,2) DEFAULT 0,
  paid_at TIMESTAMP,
  paid_by UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. production_stage 表补充产能字段（如果 migrations/007 未执行）
ALTER TABLE production_stage ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2);
ALTER TABLE production_stage ADD COLUMN IF NOT EXISTS daily_capacity NUMERIC(8,2);

-- 6. 更新 production_stage 默认产能数据
UPDATE production_stage SET estimated_hours = 4.0, daily_capacity = 50 WHERE estimated_hours IS NULL;

SELECT 'N2修复完成' AS status;
