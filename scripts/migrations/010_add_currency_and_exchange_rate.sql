-- ============================================================
-- 迁移脚本：010_add_currency_and_exchange_rate.sql
-- 币种支持 + 汇率换算
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(10) NOT NULL UNIQUE,
    currency_name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    rate_to_cny DECIMAL(16,6) NOT NULL DEFAULT 1.000000,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO exchange_rates (currency, currency_name, symbol, rate_to_cny, is_active) VALUES
    ('CNY', '人民币', '¥', 1.000000, TRUE),
    ('USD', '美元', '$', 7.250000, TRUE),
    ('HKD', '港币', 'HK$', 0.920000, TRUE),
    ('EUR', '欧元', '€', 7.850000, TRUE),
    ('GBP', '英镑', '£', 9.100000, TRUE),
    ('JPY', '日元', '¥', 0.048000, TRUE),
    ('KRW', '韩元', '₩', 0.005200, TRUE),
    ('AUD', '澳元', 'A$', 4.650000, TRUE)
ON CONFLICT (currency) DO NOTHING;

ALTER TABLE order_master ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE order_master ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE order_master ADD COLUMN IF NOT EXISTS deposit_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE order_master ADD COLUMN IF NOT EXISTS balance_amount_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE order_detail ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE order_detail ADD COLUMN IF NOT EXISTS unit_price_cny DECIMAL(16,4) DEFAULT 0;
ALTER TABLE order_detail ADD COLUMN IF NOT EXISTS amount_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE order_bom ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE order_bom ADD COLUMN IF NOT EXISTS unit_price_cny DECIMAL(16,4) DEFAULT 0;
ALTER TABLE order_bom ADD COLUMN IF NOT EXISTS total_price_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE receivable ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE receivable ADD COLUMN IF NOT EXISTS amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE receivable ADD COLUMN IF NOT EXISTS tax_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE receivable ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE receivable ADD COLUMN IF NOT EXISTS paid_amount_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE collection_record ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE collection_record ADD COLUMN IF NOT EXISTS collection_amount_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE payable ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE payable ADD COLUMN IF NOT EXISTS amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE payable ADD COLUMN IF NOT EXISTS tax_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE payable ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE payable ADD COLUMN IF NOT EXISTS paid_amount_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE payment_record ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE payment_record ADD COLUMN IF NOT EXISTS payment_amount_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE invoice ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS tax_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE fund_flow ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE fund_flow ADD COLUMN IF NOT EXISTS amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE fund_flow ADD COLUMN IF NOT EXISTS balance_after_cny DECIMAL(16,2) DEFAULT 0;

ALTER TABLE stock_in ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE stock_in ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(16,2) DEFAULT 0;
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS total_amount_cny DECIMAL(16,2) DEFAULT 0;

COMMIT;
