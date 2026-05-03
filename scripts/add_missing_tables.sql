-- ============================================
-- 补充缺失的表 - 从原始设计文档 docs/11_附录_剩余表结构.md
-- 执行时间: 2026-04-18
-- ============================================

-- 1. 经销商申请表 (dealer_application)
CREATE TABLE IF NOT EXISTS dealer_application (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL, contact_person VARCHAR(100),
    phone VARCHAR(20), email VARCHAR(100), address VARCHAR(500),
    business_license VARCHAR(200), tax_no VARCHAR(50),
    applied_products TEXT, estimated_volume DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    review_comment TEXT, reviewed_by UUID, reviewed_at TIMESTAMP,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 2. 经销商客户表 (dealer_customer)
CREATE TABLE IF NOT EXISTS dealer_customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID NOT NULL REFERENCES dealer(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    customer_name VARCHAR(100), phone VARCHAR(20),
    address VARCHAR(500), source VARCHAR(50),
    first_order_date DATE, last_order_date DATE, order_count INT DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dealer_id, customer_id)
);

-- 3. 经销商客户跟进表 (dealer_customer_follow)
CREATE TABLE IF NOT EXISTS dealer_customer_follow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_customer_id UUID NOT NULL REFERENCES dealer_customer(id),
    follow_type VARCHAR(30), follow_content TEXT,
    next_follow_date DATE,
    created_by UUID, created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 4. 经销商设计文件表 (dealer_design_file)
CREATE TABLE IF NOT EXISTS dealer_design_file (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID REFERENCES dealer(id),
    customer_id UUID REFERENCES customer(id),
    design_file_no VARCHAR(50), file_name VARCHAR(200),
    file_path VARCHAR(500), file_size INT,
    file_type VARCHAR(50), file_hash VARCHAR(100),
    uploaded_by UUID, uploaded_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    remark TEXT
);

-- 5. 报价主表 (quote)
CREATE TABLE IF NOT EXISTS quote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_no VARCHAR(50) NOT NULL UNIQUE,
    dealer_id UUID REFERENCES dealer(id),
    customer_id UUID REFERENCES customer(id),
    customer_name VARCHAR(100), contact_phone VARCHAR(20),
    total_amount DECIMAL(12,2) DEFAULT 0, discount_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) DEFAULT 0, valid_until DATE,
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID, created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 6. 报价明细表 (quote_detail)
CREATE TABLE IF NOT EXISTS quote_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quote(id),
    product_name VARCHAR(200), product_type VARCHAR(50),
    length INT, width INT, height INT, quantity INT DEFAULT 1,
    unit_price DECIMAL(12,2), total_price DECIMAL(12,2),
    remark TEXT, created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 7. 经销商订单表 (dealer_order)
CREATE TABLE IF NOT EXISTS dealer_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_order_no VARCHAR(50) NOT NULL UNIQUE,
    dealer_id UUID NOT NULL REFERENCES dealer(id),
    order_master_id UUID REFERENCES order_master(id),
    order_no VARCHAR(50),
    total_amount DECIMAL(12,2) DEFAULT 0, paid_amount DECIMAL(12,2) DEFAULT 0,
    order_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 8. Alpha下载日志表 (alpha_download_log)
CREATE TABLE IF NOT EXISTS alpha_import_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_no VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id), order_no VARCHAR(50),
    file_name VARCHAR(200), file_path VARCHAR(500),
    board_count INT, total_area DECIMAL(10,2),
    import_status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    operator_id UUID, operator_name VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 9. Alpha下载日志表 (alpha_download_log)
CREATE TABLE IF NOT EXISTS alpha_download_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    download_no VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID REFERENCES order_master(id), order_no VARCHAR(50),
    file_type VARCHAR(50), file_name VARCHAR(200), file_path VARCHAR(500),
    file_size INT, download_status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    operator_id UUID, operator_name VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 10. 台面BOM表 (countertop_bom)
CREATE TABLE IF NOT EXISTS countertop_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_code VARCHAR(50) NOT NULL UNIQUE,
    bom_name VARCHAR(100), countertop_type VARCHAR(20),
    material_name VARCHAR(100), thickness DECIMAL(5,2),
    length_min INT, length_max INT, width_min INT, width_max INT,
    unit_cost DECIMAL(10,2), unit VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 11. 门板生产表 (door_panel_production)
CREATE TABLE IF NOT EXISTS door_panel_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES order_master(id),
    order_detail_id UUID REFERENCES order_detail(id),
    door_no VARCHAR(50) NOT NULL UNIQUE,
    door_type VARCHAR(20) NOT NULL,
    length INT, width INT, thickness DECIMAL(5,2), weight DECIMAL(8,2), quantity INT DEFAULT 1,
    material VARCHAR(100), color VARCHAR(50), finish VARCHAR(50),
    has_handle BOOLEAN DEFAULT FALSE, handle_type VARCHAR(50), handle_position VARCHAR(50),
    has_hinge BOOLEAN DEFAULT TRUE, hinge_count INT,
    coating_type VARCHAR(50), coating_color VARCHAR(50), coating_brand VARCHAR(50), coating_thickness DECIMAL(5,2),
    baking_temp DECIMAL(5,2), baking_time INT,
    status VARCHAR(50) DEFAULT 'pending',
    cutting_start TIMESTAMP, cutting_complete TIMESTAMP,
    pretreat_start TIMESTAMP, pretreat_complete TIMESTAMP,
    coating_start TIMESTAMP, coating_complete TIMESTAMP,
    baking_start TIMESTAMP, baking_complete TIMESTAMP,
    quality_start TIMESTAMP, quality_complete TIMESTAMP,
    quality_result VARCHAR(20), quality_photos JSONB, quality_remark TEXT,
    package_type VARCHAR(50), edge_protection VARCHAR(50),
    current_location VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_door_panel_order ON door_panel_production(order_id);

-- 12. 喷涂工艺配方表 (coating_recipe)
CREATE TABLE IF NOT EXISTS coating_recipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_code VARCHAR(50) NOT NULL UNIQUE,
    recipe_name VARCHAR(100) NOT NULL,
    door_type VARCHAR(20), coating_type VARCHAR(50), color VARCHAR(50),
    pretreat_temp DECIMAL(5,2), pretreat_time INT, degrease_temp DECIMAL(5,2), degrease_time INT,
    spray_pressure DECIMAL(5,2), spray_distance DECIMAL(5,2), spray_speed VARCHAR(20), spray_pass INT,
    baking_temp DECIMAL(5,2), baking_time INT, baking_ramp VARCHAR(20),
    primer_type VARCHAR(50), primer_thickness DECIMAL(5,2), topcoat_type VARCHAR(50), topcoat_thickness DECIMAL(5,2),
    notes TEXT, is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- 13. 喷涂设备表 (coating_equipment)
CREATE TABLE IF NOT EXISTS coating_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_code VARCHAR(50) NOT NULL UNIQUE,
    equipment_name VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    location VARCHAR(100), model VARCHAR(100), manufacturer VARCHAR(100),
    status VARCHAR(20) DEFAULT 'running', today_output INT DEFAULT 0, total_output INT DEFAULT 0,
    last_maintenance DATE, next_maintenance DATE, maintenance_cycle INT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 14. 喷涂BOM表 (coating_bom)
CREATE TABLE IF NOT EXISTS coating_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coating_type VARCHAR(20) NOT NULL,
    item_name VARCHAR(100) NOT NULL, unit VARCHAR(20),
    consumption_per_unit DECIMAL(10,4),
    supplier_id UUID REFERENCES supplier(id), unit_price DECIMAL(12,2)
);

-- 15. 库位表 (warehouse_location)
CREATE TABLE IF NOT EXISTS warehouse_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    location_code VARCHAR(50) NOT NULL, location_name VARCHAR(100),
    zone VARCHAR(50), shelf VARCHAR(50), layer INT, position INT,
    status VARCHAR(20) DEFAULT 'available',
    UNIQUE(warehouse_id, location_code), created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 16. 库存预警表 (inventory_alert)
CREATE TABLE IF NOT EXISTS inventory_alert (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES material(id),
    alert_type VARCHAR(20) NOT NULL,
    threshold DECIMAL(10,2), current_quantity DECIMAL(10,2),
    alert_level VARCHAR(20) DEFAULT 'warning',
    status VARCHAR(20) DEFAULT 'pending',
    handled_by UUID, handled_at TIMESTAMP, remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 17. 库存台账表 (inventory_transaction)
CREATE TABLE IF NOT EXISTS inventory_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no VARCHAR(50) NOT NULL UNIQUE,
    biz_type VARCHAR(20) NOT NULL, biz_id UUID, biz_no VARCHAR(50),
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    material_id UUID NOT NULL REFERENCES material(id),
    location_id UUID REFERENCES warehouse_location(id),
    in_quantity DECIMAL(10,2) DEFAULT 0, out_quantity DECIMAL(10,2) DEFAULT 0,
    before_quantity DECIMAL(10,2), after_quantity DECIMAL(10,2),
    unit_cost DECIMAL(12,2), total_cost DECIMAL(12,2),
    batch_no VARCHAR(50), expire_date DATE,
    from_order_id UUID, from_order_no VARCHAR(50),
    operator_id UUID, operator_name VARCHAR(100),
    remark TEXT, created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_transaction_biz ON inventory_transaction(biz_type, biz_id);

-- 18. 物流记录表 (logistics_record)
CREATE TABLE IF NOT EXISTS logistics_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logistics_no VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES order_master(id),
    logistics_company VARCHAR(100), logistics_no_ext VARCHAR(100),
    driver_name VARCHAR(100), driver_phone VARCHAR(20), driver_id VARCHAR(20),
    send_province VARCHAR(50), send_city VARCHAR(50), send_district VARCHAR(50), send_address VARCHAR(500),
    receive_province VARCHAR(50), receive_city VARCHAR(50), receive_district VARCHAR(50),
    receive_address VARCHAR(500), receive_contact VARCHAR(100), receive_phone VARCHAR(20),
    freight DECIMAL(10,2), insured_amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    package_count INT, total_weight DECIMAL(8,2),
    ship_date DATE, estimate_arrive DATE, actual_arrive TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_logistics_order ON logistics_record(order_id);

-- 19. 物流追踪表 (logistics_track)
CREATE TABLE IF NOT EXISTS logistics_track (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logistics_record_id UUID NOT NULL REFERENCES logistics_record(id),
    track_time TIMESTAMP NOT NULL, location VARCHAR(200),
    status VARCHAR(50), description TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 20. 安装任务表 (installation_task)
CREATE TABLE IF NOT EXISTS installation_task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES order_master(id),
    logistics_id UUID REFERENCES logistics_record(id),
    install_province VARCHAR(50), install_city VARCHAR(50), install_district VARCHAR(50),
    install_address VARCHAR(500), install_contact VARCHAR(100), install_phone VARCHAR(20),
    appointment_date TIMESTAMP, appointment_remark TEXT,
    leader_id UUID, leader_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    actual_start TIMESTAMP, actual_complete TIMESTAMP, actual_duration INT,
    accept_status VARCHAR(20), accept_photos JSONB, accept_remark TEXT, accept_date TIMESTAMP,
    visit_status VARCHAR(20), visit_date TIMESTAMP, visit_remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 21. 安装人员分配表 (installer_allocation)
CREATE TABLE IF NOT EXISTS installer_allocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES installation_task(id),
    employee_id UUID, employee_name VARCHAR(100), role VARCHAR(20),
    work_date DATE, work_hours DECIMAL(5,2), overtime_hours DECIMAL(5,2),
    allowance DECIMAL(10,2),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 22. 安装进度表 (installation_progress)
CREATE TABLE IF NOT EXISTS installation_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES installation_task(id),
    progress INT, stage VARCHAR(50), stage_name VARCHAR(100),
    description TEXT, photos JSONB,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 23. 安装验收表 (installation_accept)
CREATE TABLE IF NOT EXISTS installation_accept (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES installation_task(id),
    accept_type VARCHAR(20),
    self_check_result VARCHAR(20), self_check_by UUID, self_check_at TIMESTAMP,
    factory_check_result VARCHAR(20), factory_check_by UUID, factory_check_at TIMESTAMP,
    customer_sign_result VARCHAR(20), customer_sign_photos JSONB, customer_sign_date TIMESTAMP,
    issue_list JSONB, remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 24. 安装回访表 (installation_visit)
CREATE TABLE IF NOT EXISTS installation_visit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES installation_task(id),
    visit_type VARCHAR(20), visit_date DATE,
    satisfaction INT, quality_score INT, service_score INT,
    feedback TEXT, issue_list JSONB, handle_status VARCHAR(20),
    visitor_id UUID, visitor_name VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 25. 包装记录表 (package_record)
CREATE TABLE IF NOT EXISTS package_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_no VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES order_master(id),
    package_type VARCHAR(50), package_method VARCHAR(50),
    total_packages INT, total_quantity INT, total_weight DECIMAL(8,2),
    longest_length INT, total_volume DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending',
    scan_operator_id UUID, scan_operator_name VARCHAR(100), scan_time TIMESTAMP,
    storage_area VARCHAR(50), storage_position VARCHAR(50),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_package_order ON package_record(order_id);

-- 26. 分拣规则表 (sort_rule)
CREATE TABLE IF NOT EXISTS sort_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(50) NOT NULL UNIQUE, rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(20), conditions JSONB,
    assigned_area VARCHAR(50), assigned_position VARCHAR(50),
    priority INT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 27. 包装类型规则表 (package_type_rule)
CREATE TABLE IF NOT EXISTS package_type_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type VARCHAR(50) NOT NULL, package_type VARCHAR(50) NOT NULL,
    material VARCHAR(200), thickness DECIMAL(5,2),
    protective_material VARCHAR(100), edge_protection VARCHAR(100),
    label_required VARCHAR(200), weight_limit DECIMAL(8,2),
    is_active BOOLEAN DEFAULT TRUE, remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 28. 包装物料明细表 (package_item)
CREATE TABLE IF NOT EXISTS package_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES package_record(id),
    product_name VARCHAR(200), product_type VARCHAR(50),
    quantity INT, weight DECIMAL(8,2), length INT, width INT, height INT,
    scanned BOOLEAN DEFAULT FALSE, scanned_at TIMESTAMP, scanned_by UUID,
    barcode VARCHAR(100), remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_package_item_package ON package_item(package_id);
CREATE INDEX IF NOT EXISTS idx_package_item_barcode ON package_item(barcode);

-- 29. 收款登记表 (payment_in)
CREATE TABLE IF NOT EXISTS payment_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no VARCHAR(50) NOT NULL UNIQUE,
    source_type VARCHAR(20) NOT NULL, source_id UUID, source_no VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL, actual_amount DECIMAL(12,2),
    customer_id UUID REFERENCES customer(id), customer_name VARCHAR(100),
    dealer_id UUID REFERENCES dealer(id),
    payment_method VARCHAR(20), payment_account VARCHAR(100),
    bank_name VARCHAR(100), bank_account VARCHAR(50), bank_water VARCHAR(100),
    voucher_file VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending', confirmed_by UUID, confirmed_at TIMESTAMP,
    order_id UUID REFERENCES order_master(id), order_no VARCHAR(50),
    receivable_id UUID, remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_payment_in_source ON payment_in(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_payment_in_customer ON payment_in(customer_id);

-- 30. 付款登记表 (payment_out)
CREATE TABLE IF NOT EXISTS payment_out (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no VARCHAR(50) NOT NULL UNIQUE,
    source_type VARCHAR(20) NOT NULL, source_id UUID, source_no VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL, actual_amount DECIMAL(12,2),
    supplier_id UUID REFERENCES supplier(id), supplier_name VARCHAR(200),
    payment_method VARCHAR(20), payment_account VARCHAR(100),
    bank_name VARCHAR(100), bank_account VARCHAR(50), bank_water VARCHAR(100),
    voucher_file VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending', confirmed_by UUID, confirmed_at TIMESTAMP,
    purchase_id UUID, purchase_no VARCHAR(50),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, created_by UUID
);

-- 31. 经销商应收款表 (dealer_receivable)
CREATE TABLE IF NOT EXISTS dealer_receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_no VARCHAR(50) NOT NULL UNIQUE,
    dealer_id UUID NOT NULL REFERENCES dealer(id),
    source_type VARCHAR(20) NOT NULL, source_id UUID, source_no VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL, paid_amount DECIMAL(12,2) DEFAULT 0, pending_amount DECIMAL(12,2),
    payment_terms INT, due_date DATE, overdue_days INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', payment_ids JSONB, remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 32. 经销商付款表 (dealer_payment)
CREATE TABLE IF NOT EXISTS dealer_payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_no VARCHAR(50) NOT NULL UNIQUE,
    dealer_id UUID NOT NULL REFERENCES dealer(id),
    payment_type VARCHAR(20) NOT NULL, source_id UUID, source_no VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL, payment_method VARCHAR(20),
    bank_name VARCHAR(100), bank_account VARCHAR(50), bank_water VARCHAR(100), voucher_file VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending', confirmed_by UUID, confirmed_at TIMESTAMP,
    receivable_id UUID REFERENCES dealer_receivable(id), remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, created_by UUID
);

-- 33. 经销商佣金表 (dealer_commission)
CREATE TABLE IF NOT EXISTS dealer_commission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_no VARCHAR(50) NOT NULL UNIQUE,
    dealer_id UUID NOT NULL REFERENCES dealer(id),
    order_id UUID, order_no VARCHAR(50),
    order_amount DECIMAL(12,2), commission_rate DECIMAL(5,2), commission_amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    settled_amount DECIMAL(12,2) DEFAULT 0, settled_at TIMESTAMP, settled_by UUID,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 34. 请假申请表 (leave_application)
CREATE TABLE IF NOT EXISTS leave_application (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_no VARCHAR(50) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES employee(id), employee_name VARCHAR(100),
    leave_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL, end_date DATE NOT NULL, total_days DECIMAL(5,1),
    reason TEXT, attachment JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    approval_id UUID, approval_no VARCHAR(50), approval_status VARCHAR(20),
    approved_by UUID, approved_at TIMESTAMP, approved_remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 35. 报销记录表 (expense)
CREATE TABLE IF NOT EXISTS expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_no VARCHAR(50) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES employee(id), employee_name VARCHAR(100),
    expense_type VARCHAR(20) NOT NULL, amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL, expense_content TEXT, attachment JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    approval_id UUID, approval_no VARCHAR(50),
    approved_by UUID, approved_at TIMESTAMP, approved_remark TEXT,
    reimbursed BOOLEAN DEFAULT FALSE, reimbursed_at TIMESTAMP, reimbursed_by UUID,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 36. 加班记录表 (overtime_record)
CREATE TABLE IF NOT EXISTS overtime_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overtime_no VARCHAR(50) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES employee(id), employee_name VARCHAR(100),
    work_date DATE NOT NULL, start_time TIMESTAMP, end_time TIMESTAMP, total_hours DECIMAL(5,2),
    reason TEXT, status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID, approved_at TIMESTAMP,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 37. 岗位表 (position)
CREATE TABLE IF NOT EXISTS position (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_code VARCHAR(50) NOT NULL UNIQUE, position_name VARCHAR(100) NOT NULL,
    dept_id UUID REFERENCES department(id), position_level INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 完成
-- ============================================
