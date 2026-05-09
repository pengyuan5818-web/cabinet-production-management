-- 扫码枪设备表（支持多把扫码枪，每把对应不同工序和库位）
CREATE TABLE IF NOT EXISTS scanner_device (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,         -- 位置编号，如 SCAN-01
  name VARCHAR(100) NOT NULL,                -- 位置名称，如 "开料工序入口"
  process_type VARCHAR(50) NOT NULL,         -- 工序类型
  process_name VARCHAR(100),                  -- 工序名称
  com_port VARCHAR(20),                      -- COM端口，如 COM3
  baud_rate INTEGER DEFAULT 9600,            -- 波特率
  terminator VARCHAR(10) DEFAULT '\r\n',     -- 终止符
  remark VARCHAR(200),                       -- 备注
  status VARCHAR(20) DEFAULT 'active',       -- active/inactive
  is_online BOOLEAN DEFAULT false,           -- 是否在线
  last_scan_time TIMESTAMP,                  -- 最后扫码时间
  last_scan_barcode VARCHAR(100),            -- 最后扫码条码
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 扫码记录表（带位置信息）
-- 注意：不使用外键约束，避免 order_master / cabinet_board 表不存在时报错
CREATE TABLE IF NOT EXISTS scan_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id UUID,                                -- 扫码枪ID
  scanner_code VARCHAR(50),                       -- 扫码枪编号
  process_type VARCHAR(50),                       -- 工序类型
  barcode VARCHAR(100) NOT NULL,                  -- 条码
  barcode_type VARCHAR(30),                       -- 条码类型：order/board/package
  order_id UUID,                                  -- 关联订单ID（冗余字段，无外键约束）
  board_id UUID,                                  -- 关联板件ID（冗余字段，无外键约束）
  scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 扫码时间
  remark VARCHAR(200)                            -- 备注
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_scanner_code ON scanner_device(code);
CREATE INDEX IF NOT EXISTS idx_scanner_process ON scanner_device(process_type);
CREATE INDEX IF NOT EXISTS idx_scanner_status ON scanner_device(status);
CREATE INDEX IF NOT EXISTS idx_scan_record_scanner ON scan_record(scanner_id);
CREATE INDEX IF NOT EXISTS idx_scan_record_barcode ON scan_record(barcode);
CREATE INDEX IF NOT EXISTS idx_scan_record_time ON scan_record(scan_time);

-- 工序类型枚举值说明：
-- cutting      - 开料
-- punching     - 冲孔
-- welding      - 焊接
-- assembly     - 组装
-- polishing    - 打磨/抛光
-- quality      - 质检
-- packing      - 包装
-- warehouse    - 仓库/入库
-- shipping     - 出货
-- installation - 安装
-- return       - 退料/返工
