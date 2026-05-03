/**
 * 橱柜工厂管理系统 - 后端入口
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const db = require('./db');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
// dealer 路由专用 body parser：保留原始 body 用于 HMAC 签名验证
app.use('/dealer/', express.json({
  limit: '50mb',
  verify: (req2, res, buf) => { req2.rawBody = buf.toString(); }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, body: req.body });
  next();
});

// 公开路由
app.use('/api/auth', require('./routes/auth'));

// 经销商 Open API（API Key 认证）
app.use('/dealer/v1', require('./routes/dealer-openapi'));

// 需认证路由
app.use('/api/orders', authMiddleware, require('./routes/order'));
app.use('/api/alpha', authMiddleware, require('./routes/alpha'));
app.use('/api/dealers', authMiddleware, require('./routes/dealer'));
app.use('/api/customers', authMiddleware, require('./routes/customer'));
app.use('/api/production', authMiddleware, require('./routes/production'));
app.use('/api/hardware', authMiddleware, require('./routes/hardware'));
app.use('/api/hardware/driver', authMiddleware, require('./routes/hardware-driver'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));

// 仓库管理
app.use('/api/warehouse', authMiddleware, require('./routes/warehouse'));

// 员工管理
app.use('/api/employees', authMiddleware, require('./routes/employee'));

// 财务管理
app.use('/api/finance', authMiddleware, require('./routes/finance'));

// 应收款管理
app.use('/api/receivable', authMiddleware, require('./routes/receivable'));

// 供应商管理
app.use('/api/suppliers', authMiddleware, require('./routes/supplier'));
app.use('/api/payables', authMiddleware, require('./routes/payables'));
app.use('/api/receivables', authMiddleware, require('./routes/receivable'));

// 报表统计
app.use('/api/reports', authMiddleware, require('./routes/report'));

// 成本核算
app.use('/api/cost', authMiddleware, require('./routes/cost'));

// 系统设置
app.use('/api/system', authMiddleware, require('./routes/system'));

// 文件上传
app.use('/api/upload', authMiddleware, require('./routes/upload'));

// 订单分拣
app.use('/api/sort', authMiddleware, require('./routes/sort'));

// 发货出库
app.use('/api/shipment', authMiddleware, require('./routes/shipment'));

// 供应商采购
app.use('/api/purchase', authMiddleware, require('./routes/purchase'));

// 汇率管理
app.use('/api/exchange-rates', authMiddleware, require('./routes/exchange_rate'));
app.use('/api/quality', authMiddleware, require('./routes/quality'));
app.use('/api/design', authMiddleware, require('./routes/design'));
app.use('/api/installation', authMiddleware, require('./routes/installation'));
app.use('/api/quote', authMiddleware, require('./routes/quote'));
app.use('/api/package', authMiddleware, require('./routes/package'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 启动
app.listen(PORT, () => {
  logger.info(`橱柜工厂管理系统 API 已启动: http://localhost:${PORT}`);
});

module.exports = app;
