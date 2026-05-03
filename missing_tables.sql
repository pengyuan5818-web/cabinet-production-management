-- ============================================================
-- 橱柜工厂管理系统 - 缺失表补全脚本
-- 生成时间: 2026-04-18
-- 共36张缺失表
-- ============================================================

BEGIN;

-- ============================================================
-- 1. production_stage (生产阶段定义表)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_stage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage VARCHAR(64) NOT NULL UNIQUE,
    stage_name VARCHAR(128) NOT NULL,
    stage_order INT NOT NULL DEFAULT 0,
    next_stage VARCHAR(64),
    prev_stage VARCHAR(64),
    description TEXT,
    default_status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE production_stage IS '生产阶段定义表';

-- ============================================================
-- 2. process_route (生产工序路线表)
-- ============================================================
CREATE TABLE IF NOT EXISTS process_route (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_code VARCHAR(64) NOT NULL UNIQUE,
    route_name VARCHAR(128) NOT NULL,
    product_type VARCHAR(64),
    stages JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE process_route IS '生产工序路线表';

-- ============================================================
-- 3. process_card (工序卡/生产工单表)
-- ============================================================
CREATE TABLE IF NOT EXISTS process_card (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    current_stage VARCHAR(64),
    current_station VARCHAR(64),
    status VARCHAR(32) DEFAULT 'pending',
    priority INT DEFAULT 0,
    planned_start TIMESTAMP,
    planned_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    operator_id UUID,
    operator_name VARCHAR(128),
    output_quantity INT DEFAULT 0,
    reject_quantity INT DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE process_card IS '工序卡/生产工单表';

-- ============================================================
-- 4. process_station (生产工位表)
-- ============================================================
CREATE TABLE IF NOT EXISTS process_station (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(64) NOT NULL UNIQUE,
    station_name VARCHAR(128) NOT NULL,
    station_type VARCHAR(64),
    location VARCHAR(256),
    workshop VARCHAR(128),
    equipment_ids JSONB DEFAULT '[]',
    status VARCHAR(32) DEFAULT 'active',
    max_concurrent INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE process_station IS '生产工位表';

-- ============================================================
-- 5. material_bom (原材料BOM清单表)
-- ============================================================
CREATE TABLE IF NOT EXISTS material_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_code VARCHAR(64) NOT NULL UNIQUE,
    product_type VARCHAR(128),
    version VARCHAR(32) DEFAULT 'v1.0',
    material_code VARCHAR(64),
    material_name VARCHAR(128),
    specification VARCHAR(256),
    unit VARCHAR(32),
    quantity NUMERIC(12,4) DEFAULT 0,
    unit_price NUMERIC(12,4) DEFAULT 0,
    total_price NUMERIC(14,4) DEFAULT 0,
    loss_rate NUMERIC(6,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES material_bom(id),
    level INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE material_bom IS '原材料BOM清单表';

-- ============================================================
-- 6. quality_inspection (质量检验主表)
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_inspection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspect_no VARCHAR(64) NOT NULL UNIQUE,
    inspect_type VARCHAR(64) NOT NULL,
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    inspect_stage VARCHAR(64),
    inspect_result VARCHAR(32) DEFAULT 'pending',
    inspector_id UUID,
    inspector_name VARCHAR(128),
    inspect_time TIMESTAMP,
    sample_size INT DEFAULT 0,
    defect_count INT DEFAULT 0,
    defect_rate NUMERIC(6,4) DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE quality_inspection IS '质量检验主表';

-- ============================================================
-- 7. quality_record (质量检验明细记录表)
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspect_id UUID REFERENCES quality_inspection(id),
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    check_item VARCHAR(256),
    check_standard VARCHAR(512),
    check_value VARCHAR(256),
    result VARCHAR(32),
    is_pass BOOLEAN,
    defect_type VARCHAR(128),
    defect_level VARCHAR(32),
    defect_description TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE quality_record IS '质量检验明细记录表';

-- ============================================================
-- 8. equipment (生产设备表)
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_code VARCHAR(64) NOT NULL UNIQUE,
    equipment_name VARCHAR(128) NOT NULL,
    equipment_type VARCHAR(64),
    model VARCHAR(128),
    manufacturer VARCHAR(128),
    serial_no VARCHAR(128),
    purchase_date DATE,
    warranty_expire DATE,
    location VARCHAR(256),
    workshop VARCHAR(128),
    status VARCHAR(32) DEFAULT 'active',
    running_hours NUMERIC(12,2) DEFAULT 0,
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE equipment IS '生产设备表';

-- ============================================================
-- 9. equipment_maintenance (设备保养记录表)
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id),
    maintenance_no VARCHAR(64) NOT NULL UNIQUE,
    maintenance_type VARCHAR(64),
    maintainer_id UUID,
    maintainer_name VARCHAR(128),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    content TEXT,
    parts_replaced JSONB DEFAULT '[]',
    cost NUMERIC(12,2) DEFAULT 0,
    result VARCHAR(32),
    next_maintenance_date DATE,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE equipment_maintenance IS '设备保养记录表';

-- ============================================================
-- 10. device (硬件设备表)
-- ============================================================
CREATE TABLE IF NOT EXISTS device (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code VARCHAR(64) NOT NULL UNIQUE,
    device_name VARCHAR(128) NOT NULL,
    device_type VARCHAR(64),
    ip_address VARCHAR(64),
    mac_address VARCHAR(64),
    location VARCHAR(256),
    status VARCHAR(32) DEFAULT 'offline',
    last_heartbeat TIMESTAMP,
    config JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE device IS '硬件设备表';

-- ============================================================
-- 11. device_maintenance (硬件设备保养表)
-- ============================================================
CREATE TABLE IF NOT EXISTS device_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device(id),
    maintenance_type VARCHAR(64),
    maintainer_id UUID,
    maintainer_name VARCHAR(128),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    content TEXT,
    cost NUMERIC(12,2) DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE device_maintenance IS '硬件设备保养表';

-- ============================================================
-- 12. coating_plan (喷涂计划表)
-- ============================================================
CREATE TABLE IF NOT EXISTS coating_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id),
    board_ids JSONB DEFAULT '[]',
    coating_color VARCHAR(128),
    coating_recipe_id UUID,
    planned_date DATE,
    actual_date DATE,
    status VARCHAR(32) DEFAULT 'pending',
    quantity INT DEFAULT 0,
    total_area NUMERIC(12,4) DEFAULT 0,
    operator_id UUID,
    operator_name VARCHAR(128),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE coating_plan IS '喷涂计划表';

-- ============================================================
-- 13. painting_task (喷涂任务表)
-- ============================================================
CREATE TABLE IF NOT EXISTS painting_task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no VARCHAR(64) NOT NULL UNIQUE,
    plan_id UUID REFERENCES coating_plan(id),
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    task_type VARCHAR(64),
    coating_color VARCHAR(128),
    recipe_id UUID,
    status VARCHAR(32) DEFAULT 'pending',
    planned_start TIMESTAMP,
    planned_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    operator_id UUID,
    operator_name VARCHAR(128),
    output_quantity INT DEFAULT 0,
    reject_quantity INT DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE painting_task IS '喷涂任务表';

-- ============================================================
-- 14. door_panel_quality (门板质检表)
-- ============================================================
CREATE TABLE IF NOT EXISTS door_panel_quality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspect_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    inspect_result VARCHAR(32) DEFAULT 'pending',
    surface_quality VARCHAR(32),
    dimension_check VARCHAR(32),
    color_check VARCHAR(32),
    edge_check VARCHAR(32),
    defect_type VARCHAR(128),
    defect_photos JSONB DEFAULT '[]',
    inspector_id UUID,
    inspector_name VARCHAR(128),
    inspect_time TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE door_panel_quality IS '门板质检表';

-- ============================================================
-- 15. countertop_quality (台面质检表)
-- ============================================================
CREATE TABLE IF NOT EXISTS countertop_quality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspect_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id),
    production_id UUID,
    inspect_result VARCHAR(32) DEFAULT 'pending',
    flatness_check VARCHAR(32),
    dimension_check VARCHAR(32),
    seam_check VARCHAR(32),
    edge_check VARCHAR(32),
    defect_type VARCHAR(128),
    defect_photos JSONB DEFAULT '[]',
    inspector_id UUID,
    inspector_name VARCHAR(128),
    inspect_time TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE countertop_quality IS '台面质检表';

-- ============================================================
-- 16. process_output (工序产出记录表)
-- ============================================================
CREATE TABLE IF NOT EXISTS process_output (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_card_id UUID REFERENCES process_card(id),
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    station_id UUID,
    output_type VARCHAR(64),
    quantity INT DEFAULT 0,
    output_time TIMESTAMP DEFAULT NOW(),
    operator_id UUID,
    operator_name VARCHAR(128),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE process_output IS '工序产出记录表';

-- ============================================================
-- 17. process_defect (工序不良记录表)
-- ============================================================
CREATE TABLE IF NOT EXISTS process_defect (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_card_id UUID REFERENCES process_card(id),
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    defect_type VARCHAR(128),
    defect_level VARCHAR(32),
    defect_count INT DEFAULT 1,
    defect_position VARCHAR(256),
    defect_photo_url TEXT,
    cause_analysis TEXT,
    corrective_action TEXT,
    handler_id UUID,
    handler_name VARCHAR(128),
    handle_status VARCHAR(32) DEFAULT 'pending',
    handle_time TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE process_defect IS '工序不良记录表';

-- ============================================================
-- 18. production_warning (生产预警表)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_warning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warning_code VARCHAR(64) NOT NULL UNIQUE,
    warning_type VARCHAR(64),
    order_id UUID REFERENCES order_master(id),
    board_id UUID REFERENCES cabinet_board(id),
    warning_level VARCHAR(32),
    warning_title VARCHAR(256),
    warning_message TEXT,
    stage VARCHAR(64),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID,
    resolved_at TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE production_warning IS '生产预警表';

-- ============================================================
-- 19. coating_batch (喷涂批次表)
-- ============================================================
CREATE TABLE IF NOT EXISTS coating_batch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_no VARCHAR(64) NOT NULL UNIQUE,
    plan_id UUID REFERENCES coating_plan(id),
    coating_recipe_id UUID,
    coating_color VARCHAR(128),
    batch_quantity INT DEFAULT 0,
    total_area NUMERIC(12,4) DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(32) DEFAULT 'pending',
    operator_id UUID,
    operator_name VARCHAR(128),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE coating_batch IS '喷涂批次表';

-- ============================================================
-- 20. coating_record (喷涂记录表)
-- ============================================================
CREATE TABLE IF NOT EXISTS coating_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES coating_batch(id),
    board_id UUID REFERENCES cabinet_board(id),
    order_id UUID REFERENCES order_master(id),
    record_no VARCHAR(64),
    spraying_type VARCHAR(64),
    coating_thickness NUMERIC(8,2),
    drying_time INT,
    result VARCHAR(32),
    operator_id UUID,
    operator_name VARCHAR(128),
    record_time TIMESTAMP DEFAULT NOW(),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE coating_record IS '喷涂记录表';

-- ============================================================
-- 21. painting_defect (喷涂不良记录表)
-- ============================================================
CREATE TABLE IF NOT EXISTS painting_defect (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES coating_batch(id),
    board_id UUID REFERENCES cabinet_board(id),
    defect_type VARCHAR(128),
    defect_level VARCHAR(32),
    defect_count INT DEFAULT 1,
    defect_photo_url TEXT,
    cause_analysis TEXT,
    corrective_action TEXT,
    handler_id UUID,
    handler_name VARCHAR(128),
    handle_status VARCHAR(32) DEFAULT 'pending',
    handle_time TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE painting_defect IS '喷涂不良记录表';

-- ============================================================
-- 22. packaging_plan (包装计划表)
-- ============================================================
CREATE TABLE IF NOT EXISTS packaging_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id),
    package_type VARCHAR(64),
    planned_date DATE,
    actual_date DATE,
    status VARCHAR(32) DEFAULT 'pending',
    total_packages INT DEFAULT 0,
    total_quantity INT DEFAULT 0,
    operator_id UUID,
    operator_name VARCHAR(128),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE packaging_plan IS '包装计划表';

-- ============================================================
-- 23. packaging_material (包装材料表)
-- ============================================================
CREATE TABLE IF NOT EXISTS packaging_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(64) NOT NULL UNIQUE,
    material_name VARCHAR(128) NOT NULL,
    material_type VARCHAR(64),
    unit VARCHAR(32),
    stock_quantity INT DEFAULT 0,
    safe_quantity INT DEFAULT 0,
    unit_price NUMERIC(12,2) DEFAULT 0,
    supplier_id UUID,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE packaging_material IS '包装材料表';

-- ============================================================
-- 24. door_panel_production_detail (门板生产明细表)
-- ============================================================
CREATE TABLE IF NOT EXISTS door_panel_production_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_id UUID REFERENCES door_panel_production(id),
    board_id UUID REFERENCES cabinet_board(id),
    order_id UUID REFERENCES order_master(id),
    process_stage VARCHAR(64),
    status VARCHAR(32) DEFAULT 'pending',
    operator_id UUID,
    operator_name VARCHAR(128),
    output_time TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE door_panel_production_detail IS '门板生产明细表';

-- ============================================================
-- 25. countertop_production_detail (台面生产明细表)
-- ============================================================
CREATE TABLE IF NOT EXISTS countertop_production_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_id UUID REFERENCES countertop_production(id),
    order_id UUID REFERENCES order_master(id),
    process_stage VARCHAR(64),
    material_type VARCHAR(64),
    material_batch VARCHAR(64),
    length NUMERIC(10,2),
    width NUMERIC(10,2),
    thickness NUMERIC(8,2),
    quantity INT DEFAULT 1,
    status VARCHAR(32) DEFAULT 'pending',
    operator_id UUID,
    operator_name VARCHAR(128),
    output_time TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE countertop_production_detail IS '台面生产明细表';

-- ============================================================
-- 26. production_worker (生产工人表)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_worker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employee(id),
    worker_name VARCHAR(128) NOT NULL,
    workshop VARCHAR(128),
    station_id UUID REFERENCES process_station(id),
    worker_type VARCHAR(64),
    skill_level VARCHAR(32),
    phone VARCHAR(32),
    status VARCHAR(32) DEFAULT 'active',
    daily_capacity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE production_worker IS '生产工人表';

-- ============================================================
-- 27. production_schedule (生产排程表)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id),
    schedule_date DATE,
    priority INT DEFAULT 0,
    planned_starts JSONB DEFAULT '[]',
    actual_starts JSONB DEFAULT '[]',
    status VARCHAR(32) DEFAULT 'pending',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE production_schedule IS '生产排程表';

-- ============================================================
-- 28. material_consumption (材料消耗表)
-- ============================================================
CREATE TABLE IF NOT EXISTS material_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumption_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id),
    production_id UUID,
    material_id UUID REFERENCES material(id),
    batch_no VARCHAR(64),
    consumption_type VARCHAR(64),
    quantity NUMERIC(12,4) NOT NULL,
    unit_price NUMERIC(12,4) DEFAULT 0,
    total_price NUMERIC(14,4) DEFAULT 0,
    consumption_date DATE,
    operator_id UUID,
    operator_name VARCHAR(128),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE material_consumption IS '材料消耗表';

-- ============================================================
-- 29. warehouse_area (仓库分区表)
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouse_area (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouse(id),
    area_code VARCHAR(64) NOT NULL,
    area_name VARCHAR(128) NOT NULL,
    area_type VARCHAR(64),
    location_code VARCHAR(128),
    capacity NUMERIC(12,2) DEFAULT 0,
    current_quantity NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE warehouse_area IS '仓库分区表';

-- ============================================================
-- 30. stock_taking (库存盘点表)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_taking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taking_no VARCHAR(64) NOT NULL UNIQUE,
    warehouse_id UUID REFERENCES warehouse(id),
    taking_date DATE,
    taking_type VARCHAR(64),
    status VARCHAR(32) DEFAULT 'pending',
    checker_id UUID,
    checker_name VARCHAR(128),
    total_items INT DEFAULT 0,
    checked_items INT DEFAULT 0,
    discrepancy_count INT DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE stock_taking IS '库存盘点表';

-- ============================================================
-- 31. stock_taking_detail (库存盘点明细表)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_taking_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taking_id UUID REFERENCES stock_taking(id),
    material_id UUID REFERENCES material(id),
    warehouse_id UUID REFERENCES warehouse(id),
    location_id UUID,
    system_quantity NUMERIC(12,4) DEFAULT 0,
    actual_quantity NUMERIC(12,4) DEFAULT 0,
    discrepancy_quantity NUMERIC(12,4) DEFAULT 0,
    discrepancy_amount NUMERIC(14,4) DEFAULT 0,
    reason VARCHAR(256),
    handle_status VARCHAR(32) DEFAULT 'pending',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE stock_taking_detail IS '库存盘点明细表';

-- ============================================================
-- 32. invoice_detail (发票明细表)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoice(id),
    receivable_id UUID REFERENCES receivable(id),
    order_id UUID REFERENCES order_master(id),
    product_name VARCHAR(256),
    specification VARCHAR(256),
    unit VARCHAR(32),
    quantity NUMERIC(12,4) DEFAULT 0,
    unit_price NUMERIC(12,4) DEFAULT 0,
    tax_rate NUMERIC(6,4) DEFAULT 0.13,
    tax_amount NUMERIC(14,4) DEFAULT 0,
    total_amount NUMERIC(14,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE invoice_detail IS '发票明细表';

-- ============================================================
-- 33. account_period (会计期间表)
-- ============================================================
CREATE TABLE IF NOT EXISTS account_period (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'open',
    is_closed BOOLEAN DEFAULT FALSE,
    closed_by UUID,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(period_year, period_month)
);

COMMENT ON TABLE account_period IS '会计期间表';

-- ============================================================
-- 34. cost_record (成本记录表)
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_no VARCHAR(64) NOT NULL UNIQUE,
    cost_type VARCHAR(64) NOT NULL,
    order_id UUID REFERENCES order_master(id),
    cost_category VARCHAR(128),
    cost_item VARCHAR(256),
    quantity NUMERIC(12,4) DEFAULT 0,
    unit_cost NUMERIC(12,4) DEFAULT 0,
    total_cost NUMERIC(14,4) DEFAULT 0,
    cost_date DATE,
    department VARCHAR(128),
    operator_id UUID,
    operator_name VARCHAR(128),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE cost_record IS '成本记录表';

-- ============================================================
-- 35. project (项目档案表)
-- ============================================================
CREATE TABLE IF NOT EXISTS project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_no VARCHAR(64) NOT NULL UNIQUE,
    project_name VARCHAR(256) NOT NULL,
    project_type VARCHAR(64),
    order_id UUID REFERENCES order_master(id),
    customer_id UUID REFERENCES customer(id),
    dealer_id UUID REFERENCES dealer(id),
    design_id UUID,
    total_area NUMERIC(12,2) DEFAULT 0,
    cabinet_count INT DEFAULT 0,
    budget_amount NUMERIC(14,2) DEFAULT 0,
    actual_amount NUMERIC(14,2) DEFAULT 0,
    start_date DATE,
    delivery_date DATE,
    status VARCHAR(32) DEFAULT 'designing',
    project_manager VARCHAR(128),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE project IS '项目档案表';

-- ============================================================
-- 36. notification (消息通知表)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notify_no VARCHAR(64) NOT NULL UNIQUE,
    notify_type VARCHAR(64),
    title VARCHAR(256),
    content TEXT,
    sender_id UUID,
    sender_name VARCHAR(128),
    recipient_id UUID,
    recipient_type VARCHAR(32),
    biz_type VARCHAR(64),
    biz_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    priority VARCHAR(32) DEFAULT 'normal',
    channel VARCHAR(32) DEFAULT 'system',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE notification IS '消息通知表';

-- ============================================================
-- 插入生产阶段初始数据
-- ============================================================
INSERT INTO production_stage (stage, stage_name, stage_order, next_stage, prev_stage) VALUES
('order_confirmed', '订单确认', 1, 'design_confirmed', NULL),
('design_confirmed', '设计确认', 2, 'material_prepared', 'order_confirmed'),
('material_prepared', '材料准备', 3, 'cutting', 'design_confirmed'),
('cutting', '开料切割', 4, 'bending', 'material_prepared'),
('bending', '折弯加工', 5, 'welding', 'cutting'),
('welding', '焊接打磨', 6, 'polishing', 'bending'),
('polishing', '抛光处理', 7, 'edge_banding', 'welding'),
('edge_banding', '封边', 8, 'drilling', 'polishing'),
('drilling', '钻孔', 9, 'assembly', 'edge_banding'),
('assembly', '组装', 10, 'countertop_production', 'drilling'),
('countertop_production', '台面生产', 11, 'countertop_quality', 'assembly'),
('countertop_quality', '台面质检', 12, 'door_panel_production', 'countertop_production'),
('door_panel_production', '门板喷涂', 13, 'door_panel_quality', 'countertop_quality'),
('door_panel_quality', '门板质检', 14, 'quality_check', 'door_panel_production'),
('quality_check', '最终质检', 15, 'packaging', 'door_panel_quality'),
('packaging', '包装', 16, 'warehouse_out', 'quality_check'),
('warehouse_out', '成品出库', 17, 'logistics_shipped', 'packaging'),
('logistics_shipped', '物流发货', 18, 'installation', 'warehouse_out'),
('installation', '上门安装', 19, 'completed', 'logistics_shipped'),
('completed', '完成', 20, NULL, 'installation')
ON CONFLICT (stage) DO NOTHING;

COMMIT;
