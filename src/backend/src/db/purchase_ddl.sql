-- 供应商采购模块 DDL（幂等）

-- 采购建议表
CREATE TABLE IF NOT EXISTS purchase_suggestion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES order_master(id),
  order_no VARCHAR(50),
  material_id UUID REFERENCES material(id),
  material_name VARCHAR(200),
  material_code VARCHAR(50),
  unit VARCHAR(20),
  required_quantity DECIMAL(12,2) NOT NULL,
  current_stock DECIMAL(12,2) DEFAULT 0,
  shortage_quantity DECIMAL(12,2) NOT NULL,
  suggested_supplier_id UUID REFERENCES supplier(id),
  suggested_supplier_name VARCHAR(200),
  suggested_quantity DECIMAL(12,2) NOT NULL,
  estimated_price DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending/confirmed/fulfilled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 采购单表
CREATE TABLE IF NOT EXISTS purchase_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) NOT NULL,
  supplier_id UUID REFERENCES supplier(id),
  supplier_name VARCHAR(200),
  total_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft', -- draft/confirmed/partial_received/received/cancelled
  expected_date DATE,
  received_date DATE,
  operator_id UUID REFERENCES employee(id),
  operator_name VARCHAR(100),
  remark VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 采购明细表
CREATE TABLE IF NOT EXISTS purchase_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
  material_id UUID REFERENCES material(id),
  material_name VARCHAR(200),
  material_code VARCHAR(50),
  unit VARCHAR(20),
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  received_quantity DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending/partial/received
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_purchase_suggestion_order_id ON purchase_suggestion(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_suggestion_status ON purchase_suggestion(status);
CREATE INDEX IF NOT EXISTS idx_purchase_suggestion_material_id ON purchase_suggestion(material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier_id ON purchase_order(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_status ON purchase_order(status);
CREATE INDEX IF NOT EXISTS idx_purchase_item_order_id ON purchase_item(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_item_material_id ON purchase_item(material_id);
