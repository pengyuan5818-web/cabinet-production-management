import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 认证
export const auth = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
}

// 仪表盘
export const dashboard = {
  summary: () => api.get('/dashboard/summary')
}

// 订单
export const orders = {
  list: (params) => api.get('/orders', { params }),
  detail: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  submit: (id) => api.post(`/orders/${id}/submit`),
  updateStage: (id, data) => api.post(`/orders/${id}/stages`, data),
  tracking: (id) => api.get(`/orders/${id}/tracking`),
  changeStatus: (id, data) => api.post(`/orders/${id}/status`, data),
  createInstallation: (id, data) => api.post(`/orders/${id}/installation`, data),
  confirmInstallation: (id, data) => api.put(`/orders/${id}/installation/confirm`, data)
}

// 生产
export const production = {
  stages: () => api.get('/production/stages'),
  track: (orderId) => api.get(`/production/track/${orderId}`),
  pending: (params) => api.get('/production/pending', { params }),
  scan: (data) => api.post('/production/scan', data),
  updateStage: (data) => api.post('/production/stage', data),
  board: (barcode) => api.get(`/production/board/${barcode}`),
  voice: (data) => api.post('/production/voice', data)
}

// 仓库
export const warehouse = {
  // 列表与查询
  list: (params) => api.get('/warehouse/materials', { params }),
  inventory: () => api.get('/warehouse/inventory'),
  summary: () => api.get('/warehouse/summary'),
  stockRecords: (params) => api.get('/warehouse/stock-records', { params }),
  // 库位
  locations: () => api.get('/warehouse/locations'),
  finishedLocations: () => api.get('/warehouse/finished-locations'),
  addFinishedLocation: (data) => api.post('/warehouse/finished-locations', data),
  deleteFinishedLocation: (id) => api.delete(`/warehouse/finished-locations/${id}`),
  resetFinishedLocation: (id) => api.put(`/warehouse/finished-locations/${id}/reset`),
  // 预警
  alerts: () => api.get('/warehouse/alerts'),
  // 常规入库/出库
  stockIn: (data) => api.post('/warehouse/stock-in', data),
  stockOut: (data) => api.post('/warehouse/stock-out', data),
  // 扫码
  scan: (barcode) => api.get(`/warehouse/scan/${barcode}`),
  scanIn: (data) => api.post('/warehouse/scan/in', data),
  scanOut: (data) => api.post('/warehouse/scan/out', data),
  // 仓库管理
  getWarehouses: () => api.get('/warehouse/warehouses'),
  updateWarehouse: (id, data) => api.put(`/warehouse/warehouses/${id}`, data),
  createWarehouse: (data) => api.post('/warehouse/warehouses', data),
  // 库位管理（通用）
  getAllLocations: (params) => api.get('/warehouse/all-locations', { params }),
  createLocation: (data) => api.post('/warehouse/locations', data),
  updateLocation: (id, data) => api.put(`/warehouse/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/warehouse/locations/${id}`),
}

// 财务
export const finance = {
  receivables: (params) => api.get('/finance/receivables', { params }),
  payables: (params) => api.get('/finance/payables', { params }),
  summary: () => api.get('/finance/summary'),
  collectReceivable: (id, data) => api.post(`/finance/receivables/${id}/collect`, data),
  payPayable: (id, data) => api.post(`/finance/payables/${id}/pay`, data),
  createReceivable: (data) => api.post('/finance/receivables', data),
  createPayable: (data) => api.post('/finance/payables', data),
  createInvoice: (data) => api.post('/finance/invoices', data),
  invoices: (params) => api.get('/finance/invoices', { params }),
  fundFlow: (params) => api.get('/finance/fund-flow', { params }),
  reconciliation: (data) => api.post('/finance/reconciliation', data),
  customerArrears: (params) => api.get('/finance/customer-arrears', { params }),
  dealerArrears: (params) => api.get('/finance/dealer-arrears', { params }),
  supplierArrears: (params) => api.get('/finance/supplier-arrears', { params }),
}

// 客户
export const customer = {
  list: (params) => api.get('/customers', { params }),
  detail: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  createFollow: (data) => api.post('/customers/follow', data),
  follows: (id) => api.get(`/customers/${id}/follows`)
}

// 经销商
export const dealer = {
  list: (params) => api.get('/dealers', { params }),
  detail: (id) => api.get(`/dealers/${id}`),
  create: (data) => api.post('/dealers', data),
  update: (id, data) => api.put(`/dealers/${id}`, data),
  delete: (id) => api.delete(`/dealers/${id}`),
  // 门店管理
  stores: (dealerId, params) => api.get(`/dealers/${dealerId}/stores`, { params }),
  createStore: (dealerId, data) => api.post(`/dealers/${dealerId}/stores`, data),
  updateStore: (dealerId, storeId, data) => api.put(`/dealers/${dealerId}/stores/${storeId}`, data),
  deleteStore: (dealerId, storeId) => api.delete(`/dealers/${dealerId}/stores/${storeId}`),
  // 价格体系
  priceLevels: (dealerId, params) => api.get(`/dealers/${dealerId}/prices`, { params }),
  createPriceLevel: (dealerId, data) => api.post(`/dealers/${dealerId}/prices`, data),
  updatePriceLevel: (dealerId, priceId, data) => api.put(`/dealers/${dealerId}/prices/${priceId}`, data),
  deletePriceLevel: (dealerId, priceId) => api.delete(`/dealers/${dealerId}/prices/${priceId}`)
}

// 员工
export const employee = {
  list: (params) => api.get('/employees', { params }),
  detail: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  checkIn: (data) => api.post('/employees/attendance/check-in', data),
  checkOut: (data) => api.post('/employees/attendance/check-out', data),
  attendance: (id, params) => api.get(`/employees/${id}/attendance`, { params }),
  departments: () => api.get('/employees/departments')
}

// 供应商
export const supplier = {
  list: (params) => api.get('/suppliers', { params }),
  detail: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  evaluations: (id, params) => api.get(`/suppliers/${id}/evaluations`, { params }),
  payments: (id, params) => api.get(`/suppliers/${id}/payments`, { params }),
  createPayment: (id, data) => api.post(`/suppliers/${id}/payments`, data),
  reconciliations: (id, params) => api.get(`/suppliers/${id}/reconciliations`, { params }),
  createReconciliation: (id, data) => api.post(`/suppliers/${id}/reconciliations`, data)
}

// 报表
export const report = {
  productionDaily: (params) => api.get('/reports/production/daily', { params }),
  productionSummary: (params) => api.get('/reports/production/summary', { params }),
  salesDealer: (params) => api.get('/reports/sales/dealer', { params }),
  inventoryCurrent: () => api.get('/reports/inventory/current'),
  inventoryMovement: (params) => api.get('/reports/inventory/movement', { params }),
  financeSummary: () => api.get('/reports/finance/summary'),
  financeAging: () => api.get('/reports/finance/receivable-aging'),
  employeeAttendance: (params) => api.get('/reports/employee/attendance', { params })
}

// 系统
export const system = {
  settings: () => api.get('/system/settings'),
  updateSettings: (data) => api.put('/system/settings', data),
  dictionaries: (params) => api.get('/system/dictionaries', { params }),
  createDictionary: (data) => api.post('/system/dictionary', data),
  deleteDictionary: (id) => api.delete(`/system/dictionary/${id}`),
  logs: (params) => api.get('/system/logs', { params }),
  users: (params) => api.get('/system/users', { params }),
  createUser: (data) => api.post('/system/users', data),
  updateUser: (id, data) => api.put(`/system/users/${id}`, data),
  deleteUser: (id) => api.delete(`/system/users/${id}`)
}

// 硬件设备
// 注意: 以下API为硬件驱动模块，需要后端已安装 serialport 和 @edge-tts
export const hardware = {
  // COM端口
  listPorts: () => api.get('/hardware/driver/ports'),

  // 扫码枪
  startScan: (data) => api.post('/hardware/driver/scan/start', data),
  stopScan: () => api.post('/hardware/driver/scan/stop'),
  scanStatus: () => api.get('/hardware/driver/scan/status'),

  // 语音
  listVoices: () => api.get('/hardware/driver/voice/voices'),
  playVoice: (data) => api.post('/hardware/driver/voice', data),
  testVoice: (data) => api.post('/hardware/driver/voice/test', data)
}

// 扫码枪设备管理
export const scanner = {
  // 设备列表
  list: (params) => api.get('/scanner', { params }),
  // 添加设备
  create: (data) => api.post('/scanner', data),
  // 更新设备
  update: (id, data) => api.put(`/scanner/${id}`, data),
  // 删除设备
  delete: (id) => api.delete(`/scanner/${id}`),
  // 心跳
  heartbeat: (id) => api.post(`/scanner/${id}/heartbeat`),
  // 扫码
  scan: (data) => api.post('/scanner/scan', data),
  // 扫码记录
  records: (id, params) => api.get(`/scanner/${id}/records`, { params }),
  // 工序类型枚举
  processTypes: () => api.get('/scanner/process-types')
}

// 订单分拣
export const sort = {
  tasks: (params) => api.get('/sort/tasks', { params }),
  taskDetail: (id) => api.get(`/sort/task/${id}`),
  createTask: (data) => api.post('/sort/task', data),
  scanBarcode: (id, data) => api.post(`/sort/task/${id}/scan`, data),
  orderBoards: (orderId) => api.get(`/sort/order-boards/${orderId}`),
  pendingOrders: () => api.get('/sort/orders')
}

// 发货出库
export const shipment = {
  list: (params) => api.get('/shipment/', { params }),
  orders: (params) => api.get('/shipment/orders', { params }),
  orderBoards: (orderId) => api.get(`/shipment/order-boards/${orderId}`),
  create: (data) => api.post('/shipment/', data),
  scanBarcode: (data) => api.post('/shipment/scan', data)
}

// 应收款
export const receivable = {
  list: (params) => api.get('/receivables/list', { params }),
  detail: (id) => api.get(`/receivables/${id}`),
  collect: (id, data) => api.post(`/receivables/${id}/collect`, data),
  summary: () => api.get('/receivables/summary'),
  aging: () => api.get('/receivables/aging'),
  autoCreate: (data) => api.post('/receivables/auto', data),
  create: (data) => api.post('/receivables', data)
}

// 供应商采购
export const purchase = {
  // 采购建议
  suggestions: (params) => api.get('/purchase/suggestions', { params }),
  suggestionDetail: (id) => api.get(`/purchase/suggestions/${id}`),
  generateSuggestions: (data) => api.post('/purchase/suggestions/generate', data),
  confirmSuggestion: (id, data) => api.post(`/purchase/suggestions/${id}/confirm`, data),
  // 采购单
  orders: (params) => api.get('/purchase/orders', { params }),
  orderDetail: (id) => api.get(`/purchase/order/${id}`),
  create: (data) => api.post('/purchase/order', data),
  updateStatus: (id, data) => api.put(`/purchase/order/${id}`, data),
  receive: (id, data) => api.post(`/purchase/order/${id}/receive`, data)
}

// 阿尔法家拆单/BOM导入
export const alpha = {
  // 验证文件（预览）
  validate: (file, params) => {
    const formData = new FormData()
    formData.append('file', file)
    if (params) Object.entries(params).forEach(([k, v]) => formData.append(k, v))
    return api.post('/alpha/validate', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  // 导入BOM到订单
  import: (file, orderId) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('order_id', orderId)
    return api.post('/alpha/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
}

// 质检管理
export const quality = {
  list: (params) => api.get('/quality/list', { params }),
  create: (data) => api.post('/quality', data),
  update: (id, data) => api.put(`/quality/${id}`, data),
  standards: (params) => api.get('/quality/standards', { params }),
  createStandard: (data) => api.post('/quality/standard', data),
  updateStandard: (id, data) => api.put(`/quality/standard/${id}`, data),
  deleteStandard: (id) => api.delete(`/quality/standard/${id}`)
}

// 设计管理
export const design = {
  list: (params) => api.get('/design/drawings', { params }),
  pending: (params) => api.get('/design/pending', { params }),
  bom: (orderId) => api.get(`/design/bom/${orderId}`),
  saveBom: (orderId, data) => api.post(`/design/bom/${orderId}`, data),
  upload: (data) => api.post('/design/drawing', data),
  audit: (id, data) => api.put(`/design/drawing/${id}/audit`, data)
}

// 订单
export const orderApi = {
  list: (params) => api.get('/orders', { params }),
  detail: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  tracking: (id) => api.get(`/orders/${id}/tracking`)
}

// 报价管理
export const quote = {
  list: (params) => api.get('/quote/list', { params }),
  detail: (id) => api.get(`/quote/${id}`),
  update: (id, data) => api.put(`/quote/${id}`, data),
  create: (data) => api.post('/quote/', data),
  send: (id) => api.post(`/quote/${id}/send`),
  confirm: (id) => api.post(`/quote/${id}/confirm`),
  win: (id) => api.post(`/quote/${id}/win`),
  lose: (id) => api.post(`/quote/${id}/lose`)
}

// 包装管理
export const packageApi = {
  list: (params) => api.get('/package/list', { params }),
  detail: (id) => api.get(`/package/${id}`),
  create: (data) => api.post('/package/', data),
  updateStatus: (id, data) => api.put(`/package/${id}/status`, data),
  materials: () => api.get('/package/materials'),
  createMaterial: (data) => api.post('/package/material', data),
  updateMaterial: (id, data) => api.put(`/package/material/${id}`, data),
  stockInMaterial: (id) => api.post(`/package/material/${id}/stock-in`),
  logs: (params) => api.get('/package/logs', { params })
}

// 安装管理
export const installation = {
  list: (params) => api.get('/installation', { params }),
  detail: (id) => api.get(`/installation/${id}`),
  create: (data) => api.post('/installation', data),
  update: (id, data) => api.put(`/installation/${id}`, data),
  delete: (id) => api.delete(`/installation/${id}`),
  progress: (id, data) => api.post(`/installation/${id}/progress`, data),
  accept: (id, data) => api.post(`/installation/${id}/accept`, data),
  visit: (id, data) => api.post(`/installation/${id}/visit`, data)
}

// 汇率管理
export const exchangeRate = {
  list: () => api.get('/exchange-rates'),
  get: (currency) => api.get(`/exchange-rates/${currency}`),
  update: (currency, data) => api.put(`/exchange-rates/${currency}`, data),
  convert: (data) => api.post('/exchange-rates/convert', data)
}

// 审批管理
export const approval = {
  list: (params) => api.get('/approvals', { params }),
  detail: (id) => api.get(`/approvals/${id}`),
  create: (data) => api.post('/approvals', data),
  approve: (id, data) => api.put(`/approvals/${id}/approve`, data),
  reject: (id, data) => api.put(`/approvals/${id}/reject`, data),
  delete: (id) => api.delete(`/approvals/${id}`),
  todo: (params) => api.get('/approvals/todo', { params }),
  my: (params) => api.get('/approvals/my', { params })
}

// 合同管理
export const contract = {
  list: (params) => api.get('/contracts', { params }),
  detail: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
  sign: (id, data) => api.put(`/contracts/${id}/sign`, data),
  updateStatus: (id, data) => api.put(`/contracts/${id}/status`, data),
  terms: (id) => api.get(`/contracts/${id}/terms`),
  addTerm: (id, data) => api.post(`/contracts/${id}/terms`, data),
  updateTerm: (id, termId, data) => api.put(`/contracts/${id}/terms/${termId}`, data),
  deleteTerm: (id, termId) => api.delete(`/contracts/${id}/terms/${termId}`)
}

export default api
