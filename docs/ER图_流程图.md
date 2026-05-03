# 不锈钢橱柜工厂管理系统 - ER图与流程图

## 一、核心模块ER关系图

### 1.1 客户域 (Customer Domain)

```mermaid
erDiagram
    CUSTOMER ||--o{ CUSTOMER_FOLLOW : has
    CUSTOMER ||--o{ DESIGN_RECORD : has
    CUSTOMER ||--o{ QUOTE : has
    CUSTOMER ||--o{ ORDER_MASTER : has
    
    CUSTOMER {
        uuid id PK
        string customer_no UK
        string name
        string phone
        string address
        enum status "new/following/ordered/completed"
        uuid designer_id FK
        uuid salesperson_id FK
        date reminder_date
        datetime last_follow_date
        datetime created_at
    }
    
    CUSTOMER_FOLLOW {
        uuid id PK
        uuid customer_id FK
        enum follow_type "visit/call/wechat/other"
        text follow_content
        text next_plan
        date next_follow_date
        json attachment
        decimal latitude
        decimal longitude
        datetime created_at
        uuid created_by FK
    }
    
    DESIGN_RECORD {
        uuid id PK
        string design_no UK
        uuid customer_id FK
        uuid order_id FK
        enum design_type "measure/quote/detail"
        enum status "appointment/measuring/designing/design_done"
        datetime appointment_date
        string appointment_address
        datetime actual_measure_date
        uuid measurer_id FK
        enum room_type
        decimal room_area
        string design_file
        json design_image
        boolean alpha_imported
        decimal cost_price
        decimal sell_price
        datetime created_at
    }
    
    QUOTE {
        uuid id PK
        string quote_no UK
        uuid customer_id FK
        uuid design_id FK
        decimal total_amount
        decimal discount_amount
        decimal final_amount
        enum status "draft/quoted/adjusting/approved/confirmed"
        text adjust_reason
        uuid approval_id FK
        datetime created_at
    }
    
    ORDER_MASTER {
        uuid id PK
        string order_no UK
        string qr_code UK
        uuid customer_id FK
        uuid design_id FK
        uuid quote_id FK
        enum order_type "new/reorder/after_sales"
        enum status "pending/producing/shipped/installed/completed"
        decimal total_amount
        decimal deposit_amount
        decimal progress_amount
        decimal final_amount
        decimal paid_amount
        date delivery_date
        date install_date
        string alpha_order_no
        int priority_level
        boolean is_urgent
        datetime created_at
    }
```

### 1.2 生产域 (Production Domain)

```mermaid
erDiagram
    ORDER_MASTER ||--|| ORDER_DETAIL : contains
    ORDER_MASTER ||--o{ ORDER_TRACKING : tracked_by
    ORDER_MASTER ||--o{ PACKAGE_RECORD : packaged_into
    ORDER_DETAIL ||--o{ PACKAGE_ITEM : packed_as
    
    ORDER_TRACKING ||--o{ ORDER_TRACKING_ATTACHMENT : has
    
    ORDER_DETAIL {
        uuid id PK
        uuid order_id FK
        string product_name
        string cabinet_no
        string color
        string material
        decimal length
        decimal width
        decimal height
        int quantity
        decimal unit_price
        decimal total_price
        json hardware
        enum production_status
        string location_in_workshop
    }
    
    ORDER_TRACKING {
        uuid id PK
        uuid order_id FK
        string order_no
        string qr_code
        enum stage "14个阶段枚举"
        string stage_name
        int stage_order
        enum status "pending/in_progress/completed"
        datetime start_time
        datetime complete_time
        uuid operator_id FK
        string operator_name
        string operator_dept
        string location
        text remark
    }
    
    ORDER_TRACKING_ATTACHMENT {
        uuid id PK
        uuid tracking_id FK
        string file_name
        string file_path
        string file_type
        bigint file_size
        enum file_category
        datetime uploaded_at
        uuid uploaded_by FK
    }
    
    PACKAGE_RECORD {
        uuid id PK
        string package_no UK
        uuid order_id FK
        enum package_type "standard/reinforced/export/custom"
        string sort_area
        string sort_position
        int package_count
        int actual_count
        decimal weight
        decimal volume
        boolean is_hazardous
        enum status "sorting/packaged/warehoused/shipped"
        datetime packaged_at
        uuid packaged_by FK
        datetime warehouse_in_time
    }
    
    PACKAGE_ITEM {
        uuid id PK
        uuid package_id FK
        uuid order_detail_id FK
        string product_name
        string product_no
        string cabinet_no
        int quantity
        decimal length
        decimal width
        decimal height
        decimal weight
        boolean is_frangible
        json material_list
        boolean packed
    }
    
    SORT_RULE {
        uuid id PK
        string rule_name
        enum rule_type "area/position/priority"
        json condition_json
        string sort_area
        int sort_priority
        boolean is_active
    }
    
    PACKAGE_TYPE_RULE {
        uuid id PK
        string rule_name
        json condition_json
        enum package_type
        json material_config
        enum protection_level "normal/medium/high"
        decimal cost_per_unit
    }
```

### 1.3 物流安装域 (Logistics & Installation Domain)

```mermaid
erDiagram
    ORDER_MASTER ||--o{ LOGISTICS_RECORD : has
    LOGISTICS_RECORD ||--o{ LOGISTICS_TRACK : tracked_by
    LOGISTICS_RECORD ||--|| INSTALLATION_TASK : leads_to
    INSTALLATION_TASK ||--o{ INSTALLER_ALLOCATION : assigned_to
    INSTALLATION_TASK ||--o{ INSTALLATION_PROGRESS : progresses
    INSTALLATION_TASK ||--|| INSTALLATION_ACCEPT : accepted_by
    INSTALLATION_TASK ||--o{ INSTALLATION_VISIT : visited_by
    
    LOGISTICS_RECORD {
        uuid id PK
        string logistics_no UK
        uuid order_id FK
        json package_ids
        string logistics_company
        string tracking_no
        enum status "picking_up/in_transit/in_delivery/delivered"
        datetime pickup_time
        string pickup_address
        string delivery_address
        date estimated_arrival
        decimal shipping_fee
        boolean is_paid
        string signee
        datetime sign_time
    }
    
    LOGISTICS_TRACK {
        uuid id PK
        uuid logistics_id FK
        string status
        string location
        text description
        datetime track_time
        string operator
    }
    
    INSTALLATION_TASK {
        uuid id PK
        string task_no UK
        uuid order_id FK
        uuid logistics_id FK
        enum status "pending/scheduled/in_progress/completed/accepted"
        datetime appointment_date
        string appointment_time_range
        datetime actual_start
        datetime actual_end
        string install_address
        string install_contact
        string install_phone
        int floor
        boolean has_elevator
        decimal install_fee
        boolean is_paid
        decimal work_hours
    }
    
    INSTALLER_ALLOCATION {
        uuid id PK
        uuid task_id FK
        uuid installer_id FK
        string installer_name
        boolean leader
        datetime arrive_time
        datetime complete_time
        decimal work_hours
        enum status "assigned/arrived/working/completed"
    }
    
    INSTALLATION_PROGRESS {
        uuid id PK
        uuid task_id FK
        int progress_percent
        string current_stage
        text stage_detail
        text problem_description
        json problem_photo
        boolean is_problem_solved
        text solution
        text next_plan
        datetime recorded_at
        uuid recorded_by FK
    }
    
    INSTALLATION_ACCEPT {
        uuid id PK
        uuid task_id FK
        datetime accept_time
        enum accept_type "self_accept/company_accept"
        int quality_score
        json quality_photos
        string customer_signature
        boolean customer_accept
        text customer_remark
        enum accept_status "pass/reject"
        text reject_reason
        boolean rework_required
    }
    
    INSTALLATION_VISIT {
        uuid id PK
        uuid task_id FK
        enum visit_type "phone/visit/online"
        datetime visit_date
        uuid visitor_id FK
        string visitor_name
        int satisfaction
        int quality_score
        int service_score
        boolean is_problem_reported
        text problem_description
        enum problem_status "pending/solving/solved"
        date next_visit_date
        text visit_record
    }
```

### 1.4 仓库域 (Warehouse Domain)

```mermaid
erDiagram
    WAREHOUSE ||--o{ WAREHOUSE_LOCATION : has
    WAREHOUSE ||--o{ INVENTORY : stores
    MATERIAL ||--o{ INVENTORY : tracked_in
    INVENTORY ||--o{ INVENTORY_ALERT : triggers
    INVENTORY ||--o{ INVENTORY_LEDGER : logged_by
    INVENTORY ||--o{ INVENTORY_IN : sourced_from
    INVENTORY ||--o{ INVENTORY_OUT : destined_to
    SUPPLIER ||--o{ INVENTORY_IN : supplies
    SUPPLIER ||--o{ PAYABLE : owed_by
    
    WAREHOUSE {
        uuid id PK
        string warehouse_code UK
        string warehouse_name
        enum warehouse_type "raw_material/finished/product"
        string address
        decimal area
        uuid manager_id FK
        enum status
    }
    
    WAREHOUSE_LOCATION {
        uuid id PK
        uuid warehouse_id FK
        string location_code UK
        enum location_type "rack/shelf/floor"
        string zone
        string row
        string column
        string level
        decimal max_capacity
        boolean is_available
    }
    
    MATERIAL {
        uuid id PK
        string material_code UK
        string material_name
        enum category "board/hardware/adhesive/packaging/other"
        string unit
        string spec
        string color
        decimal thickness
        decimal length
        decimal width
        string brand
        uuid supplier_id FK
        decimal safety_stock
        decimal min_order_qty
        decimal standard_cost
    }
    
    INVENTORY {
        uuid id PK
        uuid material_id FK
        uuid warehouse_id FK
        uuid location_id FK
        string batch_no
        decimal quantity
        decimal available_quantity
        decimal reserved_quantity
        decimal unit_cost
        decimal total_cost
        date production_date
        date expire_date
        enum quality_status "normal/expired/damaged"
        date last_check_date
    }
    
    INVENTORY_ALERT {
        uuid id PK
        uuid material_id FK
        enum alert_type "low_stock/expire/damage"
        decimal current_quantity
        decimal threshold
        enum alert_level "warning/critical"
        boolean is_processed
        datetime processed_at
        uuid processed_by FK
        text solution
    }
    
    INVENTORY_IN {
        uuid id PK
        string in_no UK
        uuid warehouse_id FK
        enum in_type "purchase/return/production/transfer"
        uuid supplier_id FK
        string purchase_order_no
        decimal total_quantity
        decimal total_amount
        date in_date
        enum in_status
        uuid warehouse_keeper FK
    }
    
    INVENTORY_OUT {
        uuid id PK
        string out_no UK
        uuid warehouse_id FK
        enum out_type "production/sale/return/transfer/waste"
        uuid production_order_id FK
        uuid sales_order_id FK
        uuid customer_id FK
        decimal total_quantity
        decimal total_amount
        date out_date
        uuid applicant_id FK
        uuid approver_id FK
    }
    
    INVENTORY_LEDGER {
        uuid id PK
        uuid material_id FK
        uuid warehouse_id FK
        uuid location_id FK
        string batch_no
        enum in_out "in/out"
        string in_out_type
        string ref_no
        decimal quantity_before
        decimal quantity_change
        decimal quantity_after
        decimal unit_cost
        decimal total_amount
        uuid operator_id FK
        datetime operate_time
    }
    
    SUPPLIER {
        uuid id PK
        string supplier_code UK
        string supplier_name
        enum supplier_type "manufacturer/distributor/agent"
        string contact_person
        string phone
        string mobile
        string email
        string address
        string bank_account
        string tax_no
        int payment_days
        decimal credit_limit
        enum status "active/inactive/blacklist"
        int rating
    }
```

### 1.5 财务域 (Finance Domain)

```mermaid
erDiagram
    ORDER_MASTER ||--o{ PAYMENT_IN : receives
    ORDER_MASTER ||--o{ RECEIVABLE : owed_by
    SUPPLIER ||--o{ PAYMENT_OUT : pays
    SUPPLIER ||--o{ PAYABLE : owes
    PAYMENT_IN ||--o| INVOICE : invoiced_as
    PAYMENT_OUT ||--o| INVOICE : invoiced_as
    ACCOUNT ||--o{ PAYMENT_IN : received_to
    ACCOUNT ||--o{ PAYMENT_OUT : paid_from
    
    PAYMENT_IN {
        uuid id PK
        string payment_no UK
        uuid order_id FK
        uuid customer_id FK
        enum payment_type "deposit/progress/final/other"
        decimal amount
        enum payment_method "cash/card/transfer/wechat/alipay"
        uuid account_id FK
        date payment_date
        string payer
        uuid invoice_id FK
        string receipt_file
        enum status "received/confirmed/invoiced"
        uuid confirmed_by FK
        datetime confirmed_at
    }
    
    PAYMENT_OUT {
        uuid id PK
        string payment_no UK
        enum pay_type "supplier/staff/expense/other"
        uuid supplier_id FK
        uuid employee_id FK
        uuid related_order_id FK
        decimal amount
        enum payment_method "cash/card/transfer"
        uuid account_id FK
        date payment_date
        string payee
        uuid invoice_id FK
        enum status
        uuid approver_id FK
    }
    
    RECEIVABLE {
        uuid id PK
        string receivable_no UK
        uuid order_id FK
        uuid customer_id FK
        enum payment_type "deposit/progress/final"
        date expected_date
        decimal amount
        decimal received_amount
        decimal pending_amount
        int overdue_days
        enum status "pending/partial/collected/overdue"
        date last_reminder_date
    }
    
    PAYABLE {
        uuid id PK
        string payable_no UK
        uuid supplier_id FK
        string purchase_order_no
        enum payment_type "advance/progress/final"
        date expected_date
        decimal amount
        decimal paid_amount
        decimal pending_amount
        int overdue_days
        enum status
    }
    
    INVOICE {
        uuid id PK
        string invoice_no UK
        enum invoice_type "vat_special/vat_normal/receipt"
        string invoice_title
        string tax_no
        uuid customer_id FK
        uuid supplier_id FK
        decimal amount
        decimal tax_amount
        decimal total_amount
        decimal tax_rate
        date invoice_date
        enum billing_type "sales/purchase"
        uuid related_payment_in_id FK
        uuid related_payment_out_id FK
        string invoice_file
        enum status "issued/used/cancelled"
    }
    
    ACCOUNT {
        uuid id PK
        string account_code UK
        string account_name
        enum account_type "cash/bank/wechat/alipay"
        string bank_name
        string bank_account
        decimal initial_balance
        decimal current_balance
        enum status
    }
```

### 1.6 OA域 (OA Domain)

```mermaid
erDiagram
    EMPLOYEE ||--o{ ATTENDANCE : has
    EMPLOYEE ||--o{ LEAVE_REQUEST : requests
    EMPLOYEE ||--o{ OVERTIME_RECORD : applies
    EMPLOYEE ||--o{ EXPENSE : submits
    EMPLOYEE ||--o{ APPROVAL_CENTER : approves_or
    APPROVAL_FLOW_CONFIG ||--o{ APPROVAL_CENTER : triggers
    DEPARTMENT ||--o{ EMPLOYEE : contains
    DEPARTMENT ||--o{ POSITION : has
    
    EMPLOYEE {
        uuid id PK
        string employee_no UK
        string name
        string phone
        string email
        string id_card
        uuid department_id FK
        uuid position_id FK
        date entry_date
        date contract_start
        date contract_end
        decimal salary
        string bank_account
        enum status "active/resigned/leave"
    }
    
    DEPARTMENT {
        uuid id PK
        string dept_code UK
        string dept_name
        uuid parent_id FK
        enum dept_type "production/sales/admin"
        uuid manager_id FK
        int sort_order
    }
    
    POSITION {
        uuid id PK
        string position_code UK
        string position_name
        uuid department_id FK
        int position_level
        boolean is_approval_role
    }
    
    ATTENDANCE {
        uuid id PK
        uuid employee_id FK
        date attendance_date
        enum day_type "workday/weekend/holiday"
        datetime check_in_time
        enum check_in_status "normal/late/absent"
        datetime check_out_time
        enum check_out_status "normal/leave_early/absent"
        decimal work_hours
        decimal overtime_hours
        int late_minutes
        int early_leave_minutes
        string machine_no
    }
    
    ATTENDANCE_SUMMARY {
        uuid id PK
        uuid employee_id FK
        string year_month
        int normal_days
        int late_count
        int late_minutes_total
        int absent_days
        int work_days
        int actual_work_days
        decimal overtime_hours
        decimal leave_days
    }
    
    LEAVE_REQUEST {
        uuid id PK
        string leave_no UK
        uuid employee_id FK
        uuid department_id FK
        enum leave_type "annual/sick/personal/marriage/maternity/paternity/funeral"
        date start_date
        date end_date
        decimal total_days
        text reason
        json attachment
        enum status "draft/pending/approved/rejected"
        uuid current_approver_id FK
        json approval_history
    }
    
    OVERTIME_RECORD {
        uuid id PK
        string overtime_no UK
        uuid employee_id FK
        uuid department_id FK
        date overtime_date
        datetime start_time
        datetime end_time
        decimal total_hours
        enum overtime_type "workday/weekend/holiday"
        text work_content
        boolean is_compensated
        decimal compensation_hours
        enum status
        uuid approver_id FK
    }
    
    EXPENSE {
        uuid id PK
        string expense_no UK
        uuid employee_id FK
        uuid department_id FK
        enum expense_type "travel/entertainment/office/communication/transportation/other"
        date expense_date
        decimal total_amount
        int receipt_count
        json expense_details
        json attachment
        enum status
        decimal approved_amount
        text rejected_reason
    }
    
    APPROVAL_FLOW_CONFIG {
        uuid id PK
        string flow_name
        enum biz_type "quote_adjust/expense/leave/overtime/purchase/payment"
        json flow_config
        boolean is_active
    }
    
    APPROVAL_CENTER {
        uuid id PK
        string approval_no UK
        enum biz_type
        uuid biz_id FK
        string biz_no
        uuid applicant_id FK
        string applicant_name
        uuid department_id FK
        string title
        text content
        decimal amount
        json attachment
        int current_level
        uuid current_approver_id FK
        enum status "pending/approved/rejected/cancelled"
        text result_remark
        datetime approved_at
    }
```

---

## 二、业务流程图

### 2.1 客户生命周期流程

```mermaid
stateDiagram-v2
    [*] --> 新建客户: 录入信息
    新建客户 --> 跟进中: 首次跟进
    跟进中 --> 跟进中: 持续跟进
    跟进中 --> 已下单: 确认订单
    已下单 --> 跟进中: 订单取消/变更
    已下单 --> 生产中: 开始生产
    生产中 --> 已发货: 包装发货
    已发货 --> 安装中: 物流到达
    安装中 --> 安装完成: 安装确认
    安装完成 --> 客户验收: 客户确认
    客户验收 --> 已完成: 验收通过
    客户验收 --> 安装中: 验收不通过
    已完成 --> [*]
    
    note right of 新建客户: 状态: new
    note right of 跟进中: 状态: following
    note right of 已下单: 状态: ordered
    note right of 已完成: 状态: completed
```

### 2.2 订单生产追踪流程

```mermaid
flowchart TD
    subgraph 订单确认
        A[客户下单] --> B[订单审核]
        B --> C[生成订单编号]
        C --> D[生成订单二维码]
    end
    
    subgraph 设计阶段
        D --> E[设计确认]
        E --> F[导入阿尔法家]
    end
    
    subgraph 生产阶段
        F --> G[材料准备]
        G --> H[开料切割]
        H --> I[封边]
        I --> J[钻孔]
        J --> K[组装]
        K --> L[质检]
    end
    
    subgraph 包装发货
        L --> M[分拣]
        M --> N[包装]
        N --> O[生成物料清单]
        O --> P[仓库出库]
    end
    
    subgraph 物流安装
        P --> Q[物流发货]
        Q --> R[物流跟踪]
        R --> S[到达安装]
        S --> T[安装预约]
        T --> U[安装人员分配]
        U --> V[安装施工]
        V --> W[安装进度记录]
        W --> X[安装完成]
    end
    
    subgraph 验收回访
        X --> Y[客户验收]
        Y --> Z{验收通过?}
        Z -->|是| AA[安装回访]
        Z -->|否| V[返工]
        AA --> AB[订单完成]
        AB --> AC[二维码归档]
    end
    
    AC --> [*]
```

### 2.3 报价审批流程

```mermaid
flowchart TD
    A[新建报价] --> B[编辑报价明细]
    B --> C[计算总价]
    C --> D[提交报价]
    D --> E[已报客户]
    E --> F{客户反馈}
    F -->|价格合适| G[价格成交]
    F -->|需要调价| H[申请调价]
    
    H --> I{调价幅度}
    I -->|≤5%| J[1级审批]
    I -->|5%~10%| K[2级审批]
    I -->|>10%| L[3级审批]
    
    J --> M{审批结果}
    K --> M
    L --> M
    
    M -->|通过| G
    M -->|驳回| N[修改重新申请]
    N --> B
    
    G --> O[生成订单]
    O --> P[订单确认]
    P --> [*]
```

### 2.4 包装分拣流程

```mermaid
flowchart TD
    A[订单完成生产] --> B[生成包装任务]
    B --> C[获取订单信息]
    C --> D[匹配分拣规则]
    
    D --> E{匹配结果}
    E -->|区域规则| F[分配堆放区域]
    E -->|优先级规则| G[调整堆放优先级]
    E -->|位置规则| H[分配具体库位]
    
    F --> I[分拣确认]
    G --> I
    H --> I
    
    I --> J[选择包装方式]
    
    J --> K{匹配规则}
    K -->|标准包装| L[标准材料配置]
    K -->|加强包装| M[加强材料配置]
    K -->|出口包装| N[出口材料配置]
    K -->|定制包装| O[自定义配置]
    
    L --> P[执行包装]
    M --> P
    N --> P
    O --> P
    
    P --> Q[生成物料清单]
    Q --> R[打印标签]
    R --> S[入库确认]
    S --> T[关联物流]
    T --> [*]
```

### 2.5 财务收款流程

```mermaid
flowchart TD
    A[订单创建] --> B[应收账款生成]
    B --> C{款项类型}
    
    C -->|订金 30%| D[应收订金]
    C -->|进度款 50%| E[应收进度款]
    C -->|尾款 20%| F[应收尾款]
    
    D --> G[收款登记]
    E --> G
    F --> G
    
    G --> H{付款方式}
    H -->|现金| I[登记现金收款]
    H -->|转账| J[登记银行转账]
    H -->|微信| K[登记微信收款]
    H -->|支付宝| L[登记支付宝收款]
    
    I --> M[更新账户余额]
    J --> M
    K --> M
    L --> M
    
    M --> N[更新应收账款]
    N --> O[开具发票]
    O --> P[关联发票记录]
    P --> Q[应收账款完成]
    Q --> [*]
```

### 2.6 OA审批流程

```mermaid
flowchart TD
    A[员工提交申请] --> B[审批中心记录]
    B --> C[获取审批流程配置]
    C --> D[确定审批级别]
    
    D --> E{审批级别}
    E -->|1级| F[1级审批人审批]
    E -->|2级| G[1级通过]
    G --> H[2级审批人审批]
    E -->|3级| I[1级通过]
    I --> J[2级通过]
    J --> K[3级审批人审批]
    
    F --> L{审批结果}
    H --> L
    K --> L
    
    L -->|通过| M[更新申请状态]
    L -->|驳回| N[返回申请人]
    N --> O[修改重新提交]
    O --> A
    
    M --> P[执行后续业务]
    P --> [*]
```

---

## 三、数据流向图

### 3.1 订单全生命周期数据流

```mermaid
flowchart LR
    subgraph 客户域
        KC[客户信息]
        KH[客户跟进]
        SJ[设计记录]
        BJ[报价记录]
    end
    
    subgraph 订单域
        DD[订单主表]
        DDX[订单明细]
        DDG[订单跟踪]
        EWM[二维码]
    end
    
    subgraph 生产域
        SC[生产进度]
        BZ[包装记录]
        BZX[包装物料]
        KCK[库存消耗]
    end
    
    subgraph 物流域
        WL[物流记录]
        AZ[安装任务]
        AZJD[安装进度]
        YS[验收]
        HF[回访]
    end
    
    subgraph 财务域
        YSZK[应收账款]
        SK[收款登记]
        FP[发票]
        LR[利润分析]
    end
    
    KC --> DD
    SJ --> BJ
    BJ --> DD
    DD --> DDX
    DD --> DDG
    DD --> EWM
    DDG --> SC
    SC --> BZ
    BZ --> BZX
    SC --> KCK
    DD --> WL
    WL --> AZ
    AZ --> AZJD
    AZJD --> YS
    YS --> HF
    DD --> YSZK
    SK --> YSZK
    YSZK --> FP
    DD --> LR
```

### 3.2 阿尔法家数据对接流

```mermaid
flowchart TD
    subgraph 工厂管理系统
        SJ[设计方案]
        BJ[报价单]
        DD[订单]
    end
    
    subgraph 数据转换
        ZJ[中间件/JSON转换]
    end
    
    subgraph 阿尔法家
        CF[拆单软件]
        SC[生产文件]
        BOM[物料清单]
        KL[开料单]
        FB[封边清单]
        ZK[钻孔图]
        BZ[包装要求]
    end
    
    SJ --> ZJ
    BJ --> ZJ
    DD --> ZJ
    ZJ -->|导出| CF
    CF -->|导入| SC
    SC -->|解析| BOM
    SC -->|解析| KL
    SC -->|解析| FB
    SC -->|解析| ZK
    SC -->|解析| BZ
    
    BOM --> KCK[库存管理]
    KL --> SCGL[生产管理]
    FB --> SCGL
    ZK --> SCGL
    BZ --> BZGL[包装管理]
```

---

## 四、ER图例说明

### 符号说明

| 符号 | 含义 |
|------|------|
| `||--||` | 一对一关系 |
| `||--o{` | 一对多关系 |
| `}o--o{` | 多对多关系 |
| `PK` | 主键 (Primary Key) |
| `FK` | 外键 (Foreign Key) |
| `UK` | 唯一键 (Unique Key) |
| `enum` | 枚举类型 |

### 颜色标识

| 模块 | 颜色 |
|------|------|
| 客户域 | 蓝色 |
| 生产域 | 绿色 |
| 物流域 | 橙色 |
| 仓库域 | 紫色 |
| 财务域 | 红色 |
| OA域 | 灰色 |

---

*文档版本: V1.0*
*生成日期: 2026-04-17*
*预览工具: VS Code (Mermaid插件) / GitHub / draw.io*
