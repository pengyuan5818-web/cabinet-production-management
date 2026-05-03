-- 发货出库功能 - DDL建表脚本
-- 幂等版本（IF NOT EXISTS）

-- 发货记录表
CREATE TABLE IF NOT EXISTS shipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES order_master(id),
  order_no VARCHAR(50) NOT NULL,
  total_boards INTEGER DEFAULT 0,
  shipped_boards INTEGER DEFAULT 0,
  operator_id UUID REFERENCES employee(id),
  operator_name VARCHAR(100),
  shipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  remark VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 发货明细表
CREATE TABLE IF NOT EXISTS shipment_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipment(id) ON DELETE CASCADE,
  board_id UUID REFERENCES cabinet_board(id),
  barcode VARCHAR(100) NOT NULL,
  board_name VARCHAR(200),
  board_spec VARCHAR(200),
  location_code VARCHAR(50),
  shipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_shipment_order_id ON shipment(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_shipped_at ON shipment(shipped_at);
CREATE INDEX IF NOT EXISTS idx_shipment_item_shipment_id ON shipment_item(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_item_barcode ON shipment_item(barcode);
