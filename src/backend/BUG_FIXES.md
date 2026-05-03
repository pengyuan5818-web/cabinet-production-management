# Bug修复记录

## 2026-05-03 修复（第四阶段）

### 新增修复汇总

| 文件 | 路由 | 修复内容 |
|------|------|---------|
| finance.js | `/receivables/:id/collect` POST | 添加UUID校验 |
| finance.js | `/payables/:id/pay` POST | 添加UUID校验 |
| quote.js | `/:id` GET | 添加UUID校验 |
| quote.js | `/:id` PUT | 添加UUID校验 |
| design.js | `/drawing/:id/audit` PUT | 添加UUID校验 |
| quality.js | `/:id` PUT | 添加UUID校验 |
| quality.js | `/standard/:id` PUT | 添加UUID校验 |
| quality.js | `/standard/:id` DELETE | 添加UUID校验 |

## 2026-05-03 修复（第三阶段）

| 文件 | 路由 | 修复内容 |
|------|------|---------|
| warehouse.js | `/materials/:id` GET/PUT/DELETE | 添加UUID校验 |
| warehouse.js | `/warehouses/:id` PUT | 添加UUID校验 |
| warehouse.js | `/locations/:id` PUT/DELETE | 添加UUID校验 |
| warehouse.js | `/finished-locations/:id` DELETE | 添加UUID校验 |
| warehouse.js | `/finished-locations/:id/reset` PUT | 添加UUID校验 |
| customer.js | `/:id` GET/PUT/DELETE | 添加UUID校验 |
| customer.js | `/:id/follows` GET | 添加UUID校验 |

## 2026-05-03 修复（第二阶段）

| 文件 | 问题 | 修复方式 |
|------|------|---------|
| order.js | order_tracking重复键约束 | 改为约束名 |
| dealer.js | dealer_api表无role字段 | 移除role字段 |

## 2026-05-03 修复（第一阶段）

| 文件 | 问题 | 修复方式 |
|------|------|---------|
| dealer.js | 路由误匹配 | UUID格式校验 |
| dealer.js | INSERT字段数不匹配 | 移除多余字段 |
| installation.js | 6个路由UUID校验缺失 | 全部添加UUID校验 |
| order.js | 10个路由UUID校验缺失 | 全部添加UUID校验 |
| employee.js | INSERT字段数不匹配 | status改为常量 |
| employee.js | UUID校验缺失 | 添加UUID校验 |

## 待确认问题（数据库Schema不一致）

1. **order_delivery表**: 某些环境可能缺少 `order_no`, `signed_by`, `delivered_at` 字段
2. **package_item表**: 某些环境可能缺少 `box_no` 字段
3. **order_tracking表**: 某些环境可能缺少唯一约束
4. **dealer_api表**: 某些环境可能缺少 `role` 字段

## 修复策略总结

1. **UUID校验**: 所有 `/:id` 路由添加UUID格式校验，防止字符串被误匹配
2. **INSERT字段匹配**: 确保INSERT语句的字段数与VALUES占位符数完全匹配
3. **ON CONFLICT**: 使用约束名而非列名，避免引用问题
4. **数据库迁移**: 建议运行数据库迁移脚本确保schema一致
