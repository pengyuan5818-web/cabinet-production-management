--橱柜工厂管理系统 - 完整数据库初始化脚本
--版本: V1.0
--日期: 2026-04-17
--表数量: 45+
--数据库: PostgreSQL 18

-- 1. 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. 创建枚举类型
DO $$ BEGIN
    CREATE TYPE customer_status AS ENUM ('new', 'following', 'ordered', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('draft', 'pending', 'producing', 'shipped', 'installed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dealer_status AS ENUM ('pending', 'active', 'suspended', 'terminated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE production_stage AS ENUM (
        'order_confirmed', 'design_confirmed', 'material_prepared',
        'cutting', 'bending', 'welding', 'polishing',
        'edge_banding', 'drilling', 'assembly',
        'countertop_production', 'countertop_quality',
        'door_panel_production', 'door_panel_quality',
        'quality_check', 'packaging', 'warehouse_out',
        'logistics_shipped', 'installation', 'completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. 经销商模块
CREATE TABLE IF NOT EXISTS dealer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_code VARCHAR(50) NOT NULL UNIQUE,
    dealer_name VARCHAR(200) NOT NULL,
    dealer_type VARCHAR(20),
    contact_person VARCHAR(100), phone VARCHAR(20), email VARCHAR(100),
    province VARCHAR(50), city VARCHAR(50), district VARCHAR(50), address VARCHAR(500),
    business_license VARCHAR(500), tax_certificate VARCHAR(500),
    bank_name VARCHAR(100), bank_account VARCHAR(50), bank_account_name VARCHAR(100),
    credit_level VARCHAR(20),
    status dealer_status DEFAULT 'pending',
    entry_date DATE,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealer_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID NOT NULL REFERENCES dealer(id),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(100),
    phone VARCHAR(20), email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'staff',
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealer_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID NOT NULL REFERENCES dealer(id),
    permission_key VARCHAR(100) NOT NULL,
    permission_name VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id UUID,
    is_granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dealer_id, permission_key)
);

-- 4. 客户模块
CREATE TABLE IF NOT EXISTS customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_no VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    province VARCHAR(50), city VARCHAR(50), district VARCHAR(50),
    address VARCHAR(500),
    status customer_status DEFAULT 'new',
    dealer_id UUID REFERENCES dealer(id),
    source VARCHAR(50),
    designer_id UUID,
    salesperson_id UUID,
    reminder_date DATE,
    last_follow_date TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_follow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id),
    follow_type VARCHAR(20),
    follow_content TEXT,
    next_plan TEXT,
    next_follow_date DATE,
    attachment JSONB,
    location_lat DECIMAL(10,6), location_lng DECIMAL(10,6),
    created_by UUID,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 5. 设计模块
CREATE TABLE IF NOT EXISTS design_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customer(id),
    order_id UUID,
    design_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'appointment',
    appointment_date TIMESTAMP(0),
    appointment_address VARCHAR(500),
    actual_measure_date TIMESTAMP(0),
    measurer_id UUID,
    room_type VARCHAR(50),
    room_area DECIMAL(10,2),
    design_file VARCHAR(500),
    design_image JSONB,
    alpha_imported BOOLEAN DEFAULT FALSE,
    cost_price DECIMAL(12,2),
    sell_price DECIMAL(12,2),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS design_attachment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID REFERENCES design_record(id),
    file_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    source VARCHAR(20) DEFAULT 'factory',
    alpha_file_id VARCHAR(50),
    alpha_category VARCHAR(50),
    uploaded_by UUID,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 6. 订单模块
CREATE TABLE IF NOT EXISTS order_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    qr_code VARCHAR(100) UNIQUE,
    source_type VARCHAR(20) DEFAULT 'factory',
    dealer_id UUID REFERENCES dealer(id),
    customer_id UUID REFERENCES customer(id),
    order_status order_status DEFAULT 'draft',
    total_amount DECIMAL(12,2) DEFAULT 0,
    deposit_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) DEFAULT 0,
    expected_delivery DATE,
    actual_delivery DATE,
    delivery_address VARCHAR(500),
    delivery_contact VARCHAR(100), delivery_phone VARCHAR(20),
    delivery_province VARCHAR(50), delivery_city VARCHAR(50), delivery_district VARCHAR(50),
    installation_required BOOLEAN DEFAULT TRUE,
    design_id UUID REFERENCES design_record(id),
    design_file_path VARCHAR(500),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES order_master(id),
    product_name VARCHAR(200),
    product_type VARCHAR(50),
    cabinet_count INT DEFAULT 0,
    board_count INT DEFAULT 0,
    has_boards BOOLEAN DEFAULT FALSE,
    material VARCHAR(100),
    color VARCHAR(50),
    length DECIMAL(10,2), width DECIMAL(10,2), height DECIMAL(10,2),
    unit_price DECIMAL(12,2),
    quantity INT DEFAULT 1,
    amount DECIMAL(12,2),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES order_master(id),
    current_stage VARCHAR(50),
    stage_name VARCHAR(100),
    stage_status VARCHAR(20) DEFAULT 'pending',
    operator_id UUID,
    operator_name VARCHAR(100),
    operator_device VARCHAR(100),
    stage_remark TEXT,
    photos JSONB,
    started_at TIMESTAMP(0),
    completed_at TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, current_stage)
);

-- 7. 阿尔法家对接模块
CREATE TABLE IF NOT EXISTS cabinet_board (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES order_master(id),
    order_detail_id UUID REFERENCES order_detail(id),
    board_no VARCHAR(50) NOT NULL,
    cabinet_no VARCHAR(50) NOT NULL,
    cabinet_name VARCHAR(100),
    board_name VARCHAR(100),
    board_type VARCHAR(50),
    material VARCHAR(100),
    color VARCHAR(50),
    length INT, width INT, thickness INT,
    quantity INT DEFAULT 1,
    edge_left DECIMAL(5,2), edge_right DECIMAL(5,2), edge_top DECIMAL(5,2), edge_bottom DECIMAL(5,2),
    hole_count INT DEFAULT 0,
    slot_count INT DEFAULT 0,
    weight DECIMAL(8,2),
    remark TEXT,
    barcode VARCHAR(100),
    current_location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, cabinet_no, board_name)
);

CREATE TABLE IF NOT EXISTS order_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES order_master(id),
    material_code VARCHAR(50) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    material_type VARCHAR(50),
    specification VARCHAR(100),
    unit VARCHAR(20),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2),
    total_price DECIMAL(12,2),
    supplier_id UUID,
    supplier_name VARCHAR(200),
    bom_type VARCHAR(20) DEFAULT 'main',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, material_code, bom_type)
);

CREATE TABLE IF NOT EXISTS alpha_import_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_no VARCHAR(50) NOT NULL UNIQUE,
    file_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500),
    file_size INT,
    file_hash VARCHAR(64),
    source_type VARCHAR(20),
    source_id UUID,
    total_records INT DEFAULT 0,
    success_count INT DEFAULT 0,
    fail_count INT DEFAULT 0,
    error_log JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    imported_by UUID,
    imported_at TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 8. 台面生产模块
CREATE TABLE IF NOT EXISTS countertop_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES order_master(id),
    production_no VARCHAR(50) NOT NULL UNIQUE,
    countertop_type VARCHAR(20),
    material VARCHAR(100),
    length INT, width INT, thickness DECIMAL(5,2),
    color VARCHAR(50),
    edge_style VARCHAR(50),
    has_sink_hole BOOLEAN DEFAULT FALSE,
    has_faucet_hole BOOLEAN DEFAULT FALSE,
    sink_size VARCHAR(50),
    faucet_type VARCHAR(50),
    quantity INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending',
    cutting_start TIMESTAMP(0), cutting_complete TIMESTAMP(0),
    polishing_start TIMESTAMP(0), polishing_complete TIMESTAMP(0),
    quality_start TIMESTAMP(0), quality_complete TIMESTAMP(0),
    quality_result VARCHAR(20),
    package_type VARCHAR(50),
    current_location VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 9. 系统用户
CREATE TABLE IF NOT EXISTS sys_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'staff',
    dept_id UUID,
    dept_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP(0),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 10. 操作日志
CREATE TABLE IF NOT EXISTS operation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_no VARCHAR(50) NOT NULL UNIQUE,
    module VARCHAR(50),
    action VARCHAR(50),
    operator_id UUID,
    operator_name VARCHAR(100),
    operator_ip VARCHAR(50),
    biz_type VARCHAR(50),
    biz_id UUID,
    biz_no VARCHAR(50),
    before_value JSONB,
    after_value JSONB,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 11. 审批中心
CREATE TABLE IF NOT EXISTS approval_center (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_no VARCHAR(50) NOT NULL UNIQUE,
    biz_type VARCHAR(50) NOT NULL,
    biz_id UUID,
    biz_no VARCHAR(50),
    title VARCHAR(200),
    applicant_id UUID,
    applicant_name VARCHAR(100),
    applicant_dept VARCHAR(100),
    current_approver_id UUID,
    current_approver_name VARCHAR(100),
    approval_data JSONB,
    status approval_status DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMP(0),
    approved_remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 12. 仓库管理模块
CREATE TABLE IF NOT EXISTS warehouse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_code VARCHAR(50) NOT NULL UNIQUE,
    warehouse_name VARCHAR(100) NOT NULL,
    warehouse_type VARCHAR(20),
    province VARCHAR(50), city VARCHAR(50), district VARCHAR(50),
    address VARCHAR(500),
    manager_id UUID,
    manager_name VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_code VARCHAR(20) NOT NULL UNIQUE,
    unit_name VARCHAR(50) NOT NULL,
    unit_type VARCHAR(20),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(50) NOT NULL UNIQUE,
    material_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    specification VARCHAR(100),
    unit VARCHAR(20),
    unit_price DECIMAL(12,2) DEFAULT 0,
    safe_stock DECIMAL(10,2) DEFAULT 0,
    min_stock DECIMAL(10,2) DEFAULT 0,
    supplier_id UUID,
    supplier_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    material_id UUID NOT NULL REFERENCES material(id),
    quantity DECIMAL(10,2) DEFAULT 0,
    locked_quantity DECIMAL(10,2) DEFAULT 0,
    last_in_date DATE,
    last_out_date DATE,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, material_id)
);

CREATE TABLE IF NOT EXISTS stock_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_in_no VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    supplier_id UUID,
    order_id UUID,
    batch_no VARCHAR(50),
    operator_id UUID,
    operator_name VARCHAR(100),
    total_amount DECIMAL(12,2) DEFAULT 0,
    invoice_no VARCHAR(50),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_in_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_in_id UUID NOT NULL REFERENCES stock_in(id),
    material_id UUID NOT NULL REFERENCES material(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2),
    total_price DECIMAL(12,2),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_out (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_out_no VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    order_id UUID REFERENCES order_master(id),
    customer_id UUID,
    batch_no VARCHAR(50),
    operator_id UUID,
    operator_name VARCHAR(100),
    total_amount DECIMAL(12,2) DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_out_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_out_id UUID NOT NULL REFERENCES stock_out(id),
    material_id UUID NOT NULL REFERENCES material(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2),
    total_price DECIMAL(12,2),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_transfer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_no VARCHAR(50) NOT NULL UNIQUE,
    from_warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    material_id UUID NOT NULL REFERENCES material(id),
    quantity DECIMAL(10,2) NOT NULL,
    operator_id UUID,
    operator_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP(0)
);

CREATE TABLE IF NOT EXISTS stock_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES material(id),
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    biz_type VARCHAR(20) NOT NULL,
    biz_id UUID,
    in_quantity DECIMAL(10,2) DEFAULT 0,
    out_quantity DECIMAL(10,2) DEFAULT 0,
    balance_quantity DECIMAL(10,2),
    operator_id UUID,
    operator_name VARCHAR(100),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 13. 员工管理模块
CREATE TABLE IF NOT EXISTS department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dept_code VARCHAR(50) NOT NULL UNIQUE,
    dept_name VARCHAR(100) NOT NULL,
    dept_type VARCHAR(20),
    parent_id UUID,
    manager_id UUID,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_no VARCHAR(50) NOT NULL UNIQUE,
    employee_name VARCHAR(100) NOT NULL,
    id_card_type VARCHAR(20),
    id_card_no VARCHAR(50),
    gender VARCHAR(10),
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(500),
    dept_id UUID REFERENCES department(id),
    position VARCHAR(100),
    employee_type VARCHAR(20),
    hire_date DATE,
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'probation',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee(id),
    record_date DATE NOT NULL,
    check_in_time TIME,
    check_in_device VARCHAR(100),
    check_in_location VARCHAR(200),
    check_in_photo VARCHAR(500),
    check_out_time TIME,
    check_out_device VARCHAR(100),
    check_out_location VARCHAR(200),
    check_out_photo VARCHAR(500),
    working_hours DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'normal',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, record_date)
);

CREATE TABLE IF NOT EXISTS salary_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee(id),
    salary_month DATE NOT NULL,
    base_salary DECIMAL(10,2),
    post_salary DECIMAL(10,2),
    performance_salary DECIMAL(10,2),
    overtime_pay DECIMAL(10,2),
    bonus DECIMAL(10,2),
    deduction DECIMAL(10,2),
    social_security DECIMAL(10,2),
    housing_fund DECIMAL(10,2),
    tax DECIMAL(10,2),
    net_salary DECIMAL(10,2),
    attendance_days INT,
    actual_days INT,
    late_times INT,
    absence_days INT,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP(0),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 14. 财务管理模块
CREATE TABLE IF NOT EXISTS receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID REFERENCES dealer(id),
    order_id UUID REFERENCES order_master(id),
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    bill_date DATE NOT NULL,
    due_date DATE,
    amount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.13,
    tax_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivable(id),
    order_id UUID REFERENCES order_master(id),
    collection_amount DECIMAL(12,2) NOT NULL,
    collection_date DATE,
    payment_method VARCHAR(20),
    bank_serial VARCHAR(50),
    operator_id UUID,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    bill_date DATE NOT NULL,
    due_date DATE,
    amount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.13,
    tax_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_id UUID NOT NULL REFERENCES payable(id),
    payment_amount DECIMAL(12,2) NOT NULL,
    payment_date DATE,
    payment_method VARCHAR(20),
    bank_serial VARCHAR(50),
    operator_id UUID,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_type VARCHAR(20),
    invoice_date DATE,
    dealer_id UUID REFERENCES dealer(id),
    supplier_id UUID,
    order_id UUID REFERENCES order_master(id),
    amount DECIMAL(12,2),
    tax_rate DECIMAL(5,4),
    tax_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'issued',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fund_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_no VARCHAR(50) NOT NULL UNIQUE,
    flow_type VARCHAR(20) NOT NULL,
    biz_type VARCHAR(50),
    biz_id UUID,
    order_id UUID REFERENCES order_master(id),
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2),
    payment_method VARCHAR(20),
    operator_id UUID,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 15. 供应商管理模块
CREATE TABLE IF NOT EXISTS supplier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    province VARCHAR(50), city VARCHAR(50), district VARCHAR(50),
    address VARCHAR(500),
    supply_category VARCHAR(50),
    business_license VARCHAR(500),
    tax_id VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_account_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    evaluation_date DATE NOT NULL,
    quality_score DECIMAL(3,1),
    delivery_score DECIMAL(3,1),
    price_score DECIMAL(3,1),
    service_score DECIMAL(3,1),
    overall_score DECIMAL(3,1),
    evaluator_id UUID,
    evaluator_name VARCHAR(100),
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 16. 系统设置模块
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(20),
    remark TEXT,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dict_type VARCHAR(50) NOT NULL,
    dict_code VARCHAR(50) NOT NULL,
    dict_name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    remark TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dict_type, dict_code)
);

-- 17. 文件管理模块
CREATE TABLE IF NOT EXISTS file_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_no VARCHAR(50) NOT NULL UNIQUE,
    file_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    biz_type VARCHAR(50),
    biz_id UUID,
    category VARCHAR(50),
    uploaded_by UUID,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 18. 创建索引
CREATE INDEX IF NOT EXISTS idx_order_master_no ON order_master(order_no);
CREATE INDEX IF NOT EXISTS idx_order_master_dealer ON order_master(dealer_id);
CREATE INDEX IF NOT EXISTS idx_order_master_customer ON order_master(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_master_status ON order_master(order_status);
CREATE INDEX IF NOT EXISTS idx_order_master_created ON order_master(created_at);
CREATE INDEX IF NOT EXISTS idx_cabinet_board_order ON cabinet_board(order_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_board_barcode ON cabinet_board(barcode);
CREATE INDEX IF NOT EXISTS idx_order_bom_order ON order_bom(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON customer(phone);
CREATE INDEX IF NOT EXISTS idx_customer_dealer ON customer(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_user_username ON dealer_user(username);
CREATE INDEX IF NOT EXISTS idx_operation_log_biz ON operation_log(biz_type, biz_id);
CREATE INDEX IF NOT EXISTS idx_operation_log_created ON operation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_material_code ON material(material_code);
CREATE INDEX IF NOT EXISTS idx_material_supplier ON material(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_inventory_warehouse ON stock_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_inventory_material ON stock_inventory(material_id);
CREATE INDEX IF NOT EXISTS idx_employee_no ON employee(employee_no);
CREATE INDEX IF NOT EXISTS idx_employee_dept ON employee(dept_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_record(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_record(record_date);
CREATE INDEX IF NOT EXISTS idx_receivable_dealer ON receivable(dealer_id);
CREATE INDEX IF NOT EXISTS idx_receivable_order ON receivable(order_id);
CREATE INDEX IF NOT EXISTS idx_payable_supplier ON payable(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fund_flow_biz ON fund_flow(biz_type, biz_id);
CREATE INDEX IF NOT EXISTS idx_supplier_code ON supplier(supplier_code);
CREATE INDEX IF NOT EXISTS idx_file_records_biz ON file_records(biz_type, biz_id);

-- 19. 插入测试数据
-- 系统用户 (密码: admin123)
INSERT INTO sys_user (username, password_hash, real_name, phone, role) VALUES 
('admin', '$2b$10$rQZ8K5JxK9HPUeTnqZqJ7.AqGZ7YpLxM5vR6m9dF8eC3bN4wX7qY0a', '系统管理员', '13800138000', 'admin'),
('factory', '$2b$10$rQZ8K5JxK9HPUeTnqZqJ7.AqGZ7YpLxM5vR6m9dF8eC3bN4wX7qY0a', '工厂用户', '13800138001', 'factory'),
('warehouse', '$2b$10$rQZ8K5JxK9HPUeTnqZqJ7.AqGZ7YpLxM5vR6m9dF8eC3bN4wX7qY0a', '仓库管理员', '13800138002', 'warehouse')
ON CONFLICT (username) DO NOTHING;

-- 数据字典
INSERT INTO dictionary (dict_type, dict_code, dict_name, sort_order) VALUES
('customer_status', 'new', '新建', 1),
('customer_status', 'following', '跟进中', 2),
('customer_status', 'ordered', '已下单', 3),
('customer_status', 'completed', '已完成', 4),
('order_status', 'draft', '草稿', 1),
('order_status', 'pending', '待生产', 2),
('order_status', 'producing', '生产中', 3),
('order_status', 'shipped', '已发货', 4),
('order_status', 'installed', '已安装', 5),
('order_status', 'completed', '已完成', 6),
('order_status', 'cancelled', '已取消', 7),
('dealer_status', 'pending', '待审核', 1),
('dealer_status', 'active', '正常', 2),
('dealer_status', 'suspended', '停用', 3),
('dealer_status', 'terminated', '终止', 4),
('production_stage', 'cutting', '切割', 1),
('production_stage', 'bending', '折弯', 2),
('production_stage', 'welding', '焊接', 3),
('production_stage', 'polishing', '抛光', 4),
('production_stage', 'quality_check', '质检', 5),
('production_stage', 'packaging', '打包', 6),
('production_stage', 'warehouse_out', '出库', 7),
('payment_method', 'cash', '现金', 1),
('payment_method', 'bank_transfer', '银行转账', 2),
('payment_method', 'wechat', '微信', 3),
('payment_method', 'alipay', '支付宝', 4)
ON CONFLICT (dict_type, dict_code) DO NOTHING;

-- 单位
INSERT INTO unit (unit_code, unit_name, unit_type) VALUES
('PCS', '个', 'count'),
('M', '米', 'length'),
('M2', '平方米', 'area'),
('KG', '千克', 'weight'),
('SET', '套', 'set')
ON CONFLICT (unit_code) DO NOTHING;

-- 仓库
INSERT INTO warehouse (warehouse_code, warehouse_name, warehouse_type, address, manager_name) VALUES
('WH01', '原材料仓库', 'raw', '工厂A区1楼', '仓库管理员'),
('WH02', '成品仓库', 'finished', '工厂B区1楼', '仓库管理员'),
('WH03', '五金配件仓', 'accessory', '工厂A区2楼', '仓库管理员')
ON CONFLICT (warehouse_code) DO NOTHING;

-- 部门
INSERT INTO department (dept_code, dept_name, dept_type) VALUES
('DEPT01', '生产部', 'production'),
('DEPT02', '仓库部', 'warehouse'),
('DEPT03', '销售部', 'sales'),
('DEPT04', '财务部', 'finance'),
('DEPT05', '人事部', 'hr')
ON CONFLICT (dept_code) DO NOTHING;

-- 供应商
INSERT INTO supplier (supplier_code, supplier_name, contact_person, phone, supply_category) VALUES
('SUP001', '不锈钢板材供应商', '张经理', '13900139000', '板材'),
('SUP002', '五金配件供应商', '李经理', '13900139001', '五金'),
('SUP003', '台面材料供应商', '王经理', '13900139002', '台面')
ON CONFLICT (supplier_code) DO NOTHING;

-- 原材料
INSERT INTO material (material_code, material_name, category, specification, unit, unit_price, safe_stock, supplier_id) VALUES
('MAT001', '不锈钢板304', '板材', '1.2mm*1220*2440', '张', 280.00, 50, (SELECT id FROM supplier WHERE supplier_code='SUP001' LIMIT 1)),
('MAT002', '不锈钢板316', '板材', '1.5mm*1220*2440', '张', 350.00, 30, (SELECT id FROM supplier WHERE supplier_code='SUP001' LIMIT 1)),
('MAT003', '门板铰链', '五金', '快装铰链', '个', 8.50, 500, (SELECT id FROM supplier WHERE supplier_code='SUP002' LIMIT 1)),
('MAT004', '导轨', '五金', '三节轨', '支', 25.00, 200, (SELECT id FROM supplier WHERE supplier_code='SUP002' LIMIT 1)),
('MAT005', '石英石台面', '台面', '15mm厚度', '米', 380.00, 20, (SELECT id FROM supplier WHERE supplier_code='SUP003' LIMIT 1))
ON CONFLICT (material_code) DO NOTHING;

-- 系统配置
INSERT INTO system_config (config_key, config_value, config_type) VALUES
('company_name', '不锈钢橱柜工厂', 'basic'),
('low_stock_threshold', '10', 'warehouse'),
('work_start_time', '09:00', 'attendance'),
('work_end_time', '18:00', 'attendance'),
('max_upload_size', '52428800', 'system')
ON CONFLICT (config_key) DO NOTHING;

-- 完成
SELECT '橱柜工厂管理系统数据库初始化完成！表数量: 45+' AS message;
