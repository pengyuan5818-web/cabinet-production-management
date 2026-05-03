-- P0 修复 + 多币种遗漏字段补充
-- 脚本编号: 011
-- 执行时间: 2026-04-25
-- 包含: P0-1 remarkes拼写修复, P0-2 fund_flow外键, P0-3 遗漏6张表多币种字段

BEGIN;

-- =====================
-- P0-1: payable.remarkes 拼写错误修复
-- =====================
-- Step 1: 添加正确字段 remark（如果不存在）
ALTER TABLE payable ADD COLUMN IF NOT EXISTS remark TEXT;

-- Step 2: 迁移数据
UPDATE payable SET remark = remarkes WHERE remark IS NULL AND remarkes IS NOT NULL;

-- Step 3: 删除错误字段
ALTER TABLE payable DROP COLUMN IF EXISTS remarkes;

-- =====================
-- P0-2: fund_flow.order_id 添加外键约束
-- =====================
-- 先检查是否有无效数据
DO $$ BEGIN
    -- 如果有无效order_id，先设为NULL
    UPDATE fund_flow SET order_id = NULL WHERE order_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM order_master WHERE id = fund_flow.order_id);
EXCEPTION WHEN others THEN NULL;
END $$;

-- 添加外键约束（如果不存在）
ALTER TABLE fund_flow 
  ADD CONSTRAINT fund_flow_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES order_master(id) ON DELETE SET NULL;

-- =====================
-- P0-3: 多币种遗漏表补充 currency + _cny 字段
-- =====================

-- collection_record
ALTER TABLE collection_record ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE collection_record ADD COLUMN IF NOT EXISTS collection_amount_cny DECIMAL(12,2);

-- payment_record
ALTER TABLE payment_record ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE payment_record ADD COLUMN IF NOT EXISTS payment_amount_cny DECIMAL(12,2);

-- invoice
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(12,2);

-- fund_flow（如果还没有的话，检查010已加了什么）
ALTER TABLE fund_flow ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE fund_flow ADD COLUMN IF NOT EXISTS amount_cny DECIMAL(12,2);

-- stock_in
ALTER TABLE stock_in ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE stock_in ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(12,2);

-- stock_out
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(12,2);

-- =====================
-- P1: cabinet_board L/W 从INT改为DECIMAL
-- =====================
ALTER TABLE cabinet_board ALTER COLUMN length TYPE DECIMAL(10,2) USING length::DECIMAL(10,2);
ALTER TABLE cabinet_board ALTER COLUMN width TYPE DECIMAL(10,2) USING width::DECIMAL(10,2);

COMMIT;

-- 验证
SELECT 'P0修复执行完成' AS status;
