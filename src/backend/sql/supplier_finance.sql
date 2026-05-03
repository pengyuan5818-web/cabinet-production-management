-- 供应商对账与付款表
-- 运行: psql -d cabinet_factory -f supplier_finance.sql

-- 供应商对账表
CREATE TABLE IF NOT EXISTS supplier_reconciliation (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    bill_no VARCHAR(32) UNIQUE NOT NULL,
    payable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
    bill_date DATE,
    due_date DATE,
    remark TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_supplier ON supplier_reconciliation(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sr_status ON supplier_reconciliation(status);
CREATE INDEX IF NOT EXISTS idx_sr_bill_no ON supplier_reconciliation(bill_no);

-- 供应商付款记录表
CREATE TABLE IF NOT EXISTS supplier_payment (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    reconciliation_id INTEGER REFERENCES supplier_reconciliation(id) ON DELETE SET NULL,
    amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) DEFAULT '',
    payer VARCHAR(100) DEFAULT '',
    remark TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_supplier ON supplier_payment(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sp_reconciliation ON supplier_payment(reconciliation_id);

COMMENT ON TABLE supplier_reconciliation IS '供应商对账单';
COMMENT ON TABLE supplier_payment IS '供应商付款记录';
