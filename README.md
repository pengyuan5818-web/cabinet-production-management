# 橱柜工厂生产管理系统

不锈钢橱柜工厂生产管理ERP系统，支持订单管理、生产排程、仓库管理、财务统计等全流程功能。

## 功能模块

- 📦 **订单管理** - 订单创建、编辑、状态跟踪、二维码管理
- 🏭 **生产管理** - 生产排程、任务分配、进度跟踪
- 📋 **拆单管理** - 阿尔法家软件拆单对接
- 🏠 **安装管理** - 安装任务派发、进度跟踪、验收管理
- 🚚 **发货管理** - 物流跟踪、签收管理
- 📦 **包装管理** - 包装清单、扫描出入库
- 🏯 **仓库管理** - 原材料/成品库存管理
- 💰 **财务管理** - 应收应付、发票管理、资金流水
- 📊 **数据看板** - 生产统计、订单趋势、业绩分析
- 👥 **员工管理** - 考勤、工资、部门管理
- 🔧 **系统设置** - 用户权限、经销商管理

## 技术栈

- **后端**: Node.js + Express + PostgreSQL
- **前端**: Electron (桌面应用)
- **数据库**: PostgreSQL
- **认证**: JWT

## 项目结构

```
橱柜工厂管理系统/
├── src/
│   ├── backend/          # 后端API服务
│   │   └── src/
│   │       ├── routes/   # 路由文件
│   │       ├── db.js     # 数据库连接
│   │       └── index.js  # 入口文件
│   ├── desktop/          # Electron桌面端
│   └── ...
├── INSPECTION_REPORT.md  # 系统检查报告
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd src/backend
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cabinet_factory
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

### 3. 初始化数据库

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE cabinet_factory;"

# 运行数据库迁移脚本（需要根据实际脚本调整）
psql -U postgres -d cabinet_factory -f init.sql
```

### 4. 启动后端服务

```bash
cd src/backend
node src/index.js
```

服务运行在 http://localhost:3000

### 5. 启动桌面端

```bash
cd src/desktop
npm start
```

## API文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/register | 用户注册 |
| GET | /api/auth/me | 获取当前用户信息 |
| POST | /api/auth/change-password | 修改密码 |

### 订单接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/orders | 订单列表 |
| GET | /api/orders/:id | 订单详情 |
| POST | /api/orders | 创建订单 |
| PUT | /api/orders/:id | 更新订单 |
| DELETE | /api/orders/:id | 删除订单 |
| POST | /api/orders/:id/submit | 提交订单 |
| POST | /api/orders/:id/status | 更新状态 |

### 仓库接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/warehouse/scan/:barcode | 条码扫描 |
| POST | /api/warehouse/scan/in | 入库扫描 |
| POST | /api/warehouse/scan/out | 出库扫描 |
| GET | /api/warehouse/materials | 物料列表 |

## 配置说明

### 阿尔法家拆单软件对接

系统支持与阿尔法家拆单软件对接，请联系管理员配置相关参数。

### 经销商开放API

系统提供经销商开放API，支持经销商自助下单、订单查询等功能。

## 许可证

MIT License

## 联系方式

- 公司：广东培思特厨卫科技有限公司
- 产品：不锈钢橱柜定制
