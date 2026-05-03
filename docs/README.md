# 橱柜工厂管理系统

## 项目简介
不锈钢橱柜工厂生产管理系统，支持经销商管理、订单追踪、阿尔法家拆单对接、扫码枪集成。

## 技术栈
- **后端**: Node.js + Express + PostgreSQL
- **前端**: Vue3 + Electron (Win桌面端)
- **数据库**: PostgreSQL
- **硬件**: 扫码枪、扬声器、考勤机、标签打印机

## 目录结构
`
docs/           # 设计文档
src/            # 源代码
  backend/      # 后端API
  frontend/     # 前端
  shared/       # 共享代码
scripts/        # 工具脚本
config/         # 配置文件
tests/          # 测试
deployment/     # 部署
`

## 快速开始
1. 安装 PostgreSQL
2. 执行数据库初始化脚本
3. 安装依赖: npm install
4. 启动后端: npm run dev
5. 启动前端: npm run electron

## 文档
- [数据库设计](./docs/11_不锈钢橱柜工厂管理系统_完整数据库设计.md)
- [业务流程图](./docs/12_业务流程图设计.md)
- [阿尔法家对接](./docs/06_阿尔法家对接适配分析报告.md)
- [硬件适配](./docs/05_工厂流程验证及硬件适配方案.md)
- [经销商管理](./docs/09_经销商管理模块设计.md)
