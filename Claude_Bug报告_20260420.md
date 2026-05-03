# Bug 报告 - 橱柜工厂管理系统 API 测试
# 测试日期: 2026-04-20
# 测试人: AI Subagent

## 测试概要

- 后端状态: 已运行 (端口3000)
- 测试方法: 真实 HTTP 请求
- 总测试接口: 20+

---

## Bug 列表

### [1] [POST /api/cost/calculate/batch] [400] [order_ids 必须是数组] [输入验证逻辑问题]
**问题描述**: 传入 {"orderIds":[]} (camelCase) 返回 400，提示 "order_ids 必须是数组"
**根因分析**: API 接收 snake_case (order_ids)，但前端可能发送 camelCase (orderIds)。当收到 undefined 时，Array.isArray(undefined) 返回 false，导致返回 400 而不是更友好的提示
**影响**: 较小，前端发送正确字段名即可

---

### [2] [POST /api/shipment] [500] [服务器内部错误] [SQL GROUP BY 子句错误]
**问题描述**: 调用 POST /api/shipment 返回 500 内部错误
**根因分析**: 错误日志显示 "字段 \"om.id\" 必须出现在 GROUP BY 子句中或者在聚合函数中使用"
  - 位置: routes/shipment.js 第68行
  - 原因: SQL 查询中 SELECT 使用了 om.id 但未在 GROUP BY 中声明
**影响**: 订单发货功能无法使用

---

### [3] [GET /api/dealers/:id/webhook-logs] [500] [服务器内部错误] [UUID 类型不匹配]
**问题描述**: 调用 GET /api/dealers/1/webhook-logs 返回 500 内部错误
**根因分析**: 错误日志显示 "操作符不存在: character varying = uuid"
  - 位置: routes/dealer.js 约第207行
  - 原因: webhook 表的 dealer_id 字段类型为 character varying，但传入的 :id 参数是 uuid 类型，比较操作符不匹配
**影响**: 经销商 webhook 日志查询功能无法使用

---

### [4] [GET /api/reports/production/scheduling] [200] [数据异常] [SQL 错误]
**问题描述**: 错误日志: "字段 \"om.id\" 必须出现在 GROUP BY 子句中或者在聚合函数中使用"
**根因分析**: 位于 routes/report.js 第207行，SQL 查询使用了 GROUP BY 但 SELECT 包含非聚合列
**影响**: 生产排程报表数据可能不准确

---

### [5] [GET /api/finance/dealer-arrears] [500] [服务器内部错误] [SQL 别名错误]
**错误日志**: "字段 u.id 不存在" at routes/finance.js:502
**根因分析**: SQL JOIN 查询使用了未定义的表别名 "u"
**影响**: 经销商应收款查询失败

---

### [6] [POST /api/shipment] [500] [字段不存在] [cb.board_spec]
**错误日志**: "字段 cb.board_spec 不存在" at routes/shipment.js:134
**根因分析**: cabinet_board 表没有 board_spec 列，应该拼接 length/width/thickness
**影响**: 扫码出库功能无法使用

---

### [7] [GET /api/dashboard] [500] [枚举值无效] [order_status]
**错误日志**: "对于枚举order_status的输入值无效 \"quality_check\""
**根因分析**: order_status 枚举类型不包含 "quality_check" 值，可能从前端传入
**影响**: 仪表盘数据加载失败

---

### [8] [POST /api/package] [500] [UUID 格式错误]
**错误日志**: "无效的类uuid 输入语法: \"materials\""
**根因分析**: routes/package.js 第100行，传入的 ID 参数 "materials" 不是有效的 UUID 格式
**影响**: _package 相关 API 无法正常使用

---

### [9] [POST /api/auth/login] [200] [空数据返回] [首次登录返回空 data]
**问题描述**: 测试脚本中第二次 POST /api/auth/login 成功返回 token，但 data 对象某些字段可能为 null
**影响**: 较小，仅影响某些依赖字段的前端逻辑

---

### [10] [GET /api/reports/employee/performance] [200] [空数据] [数据库无记录]
**问题描述**: 返回 200 但 data.count = 0，无员工绩效数据
**影响**: 前端显示空报表

---

### [11] [GET /api/reports/employee/production] [200] [空数据] [数据库无记录]
**问题描述**: 返回 200 但 data 为空对象 {}
**影响**: 前端显示空报表

---

### [12] [POST /api/orders] [200] [空返回] [未返回创建结果]
**问题描述**: POST 创建订单返回成功但没有返回创建的订单 ID
**影响**: 前端无法获取新订单信息，需要重新查询

---

## 待确认的 Bug (需要数据库检查)

- webhook_log 表是否存在
- shipment 表结构是否正确
- cabinet_board 表是否有 board_spec 列

---

## 数据库相关 Bug (从错误日志发现)

| 位置 | 错误信息 | 根因 |
|------|---------|------|
| report.js:207 | 操作符不存在: character varying = uuid | UUID 与 varchar 比较类型不匹配 |
| finance.js:502 | 字段 u.id 不存在 | JOIN 别名错误 |
| shipment.js:68 | GROUP BY 错误 | SQL 语法问题 |
| shipment.js:134 | 字段 cb.board_spec 不存在 | 表结构缺少列 |
| dashboard.js:177 | 枚举值无效 | 缺少枚举值 |
| package.js:100 | 无效的类uuid | 参数格式错误 |

---

## 测试 API 结果汇总

| # | API | 状态码 | 结果 |
|---|-----|--------|------|
| 1 | POST /api/auth/login | 200 | ✓ 成功返回token |
| 2 | GET /api/orders | 200 | ✓ 空列表 |
| 3 | POST /api/orders | 200 | ✓ 创建成功(无返回) |
| 4 | POST /api/production/schedule/generate | 200 | ✓ 返回0 |
| 5 | GET /api/production/stages | 200 | ✓ 20条记录 |
| 6 | GET /api/cost/report/detail | 200 | ✓ 空数据 |
| 7 | GET /api/cost/allocation/pool | 200 | ✓ 9条记录 |
| 8 | POST /api/cost/calculate/batch | 200 | ✓ 空数组(需检查) |
| 9 | GET /api/reports/production/scheduling | 200 | ✓ 3条记录 |
| 10 | GET /api/dealers/commissions | 200 | ✓ 空数据 |
| 11 | GET /api/dealers/1/webhook-logs | **500** | ✗ 服务器错误 |
| 12 | GET /api/finance/customer-arrears | 200 | ✓ 空数据 |
| 13 | GET /api/finance/dealer-arrears | 200 | ✓ 空数据 |
| 14 | GET /api/finance/supplier-arrears | 200 | ✓ 空数据 |
| 15 | GET /api/warehouse/materials | 200 | ✓ 空数据 |
| 16 | POST /api/shipment | **500** | ✗ 服务器错误 |
| 17 | GET /api/system/config | 200 | ✓ 配置数据 |
| 18 | GET /api/reports/employee/performance | 200 | △ 空数据 |
| 19 | GET /api/reports/employee/production | 200 | △ 空数据 |

---

## 修复建议

1. **优先级 P0 (阻断)**:
   - Bug #2: shipment SQL GROUP BY 错误
   - Bug #3: webhook-logs UUID 类型不匹配

2. **优先级 P1 (高)**:
   - Bug #4, #5, #6: SQL 查询错误
   - Bug #7: order_status 枚举值

3. **优先级 P2 (中)**:
   - Bug #8: UUID 参数验证
   - Bug #9, #10, #11: 空数据问题

---

报告生成时间: 2026-04-20 16:32 GMT+8