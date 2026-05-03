-- 订单分拣任务表
CREATE TABLE IF NOT EXISTS sort_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES order_master(id),
  order_no VARCHAR(50) NOT NULL,
  board_count INTEGER DEFAULT 0,
  sorted_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending/in_progress/completed
  assigned_to UUID REFERENCES employee(id),
  assigned_name VARCHAR(100),
  location_code VARCHAR(50), -- 推荐库位，如 WH01-SORT-F20260418001
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- 订单分拣明细表
CREATE TABLE IF NOT EXISTS sort_task_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_task_id UUID NOT NULL REFERENCES sort_task(id) ON DELETE CASCADE,
  board_id UUID REFERENCES cabinet_board(id),
  barcode VARCHAR(100) NOT NULL,
  board_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending', -- pending/sorted
  sorted_location VARCHAR(50),
  sorted_at TIMESTAMP,
  sorted_by UUID,
  sorted_by_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sort_task_order_id ON sort_task(order_id);
CREATE INDEX IF NOT EXISTS idx_sort_task_status ON sort_task(status);
CREATE INDEX IF NOT EXISTS idx_sort_task_item_task_id ON sort_task_item(sort_task_id);
CREATE INDEX IF NOT EXISTS idx_sort_task_item_barcode ON sort_task_item(barcode);
CREATE INDEX IF NOT EXISTS idx_sort_task_item_status ON sort_task_item(status);
