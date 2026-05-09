import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue')
  },
  {
    path: '/',
    component: () => import('../views/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/index.vue') },
      { path: 'orders', name: 'Orders', component: () => import('../views/orders/index.vue') },
      { path: 'design', name: 'Design', component: () => import('../views/design/index.vue') },
      { path: 'production', name: 'Production', component: () => import('../views/production/index.vue') },
      { path: 'warehouse', name: 'Warehouse', component: () => import('../views/warehouse/index.vue') },
      { path: 'installation', name: 'Installation', component: () => import('../views/installation/index.vue') },
      { path: 'finance', name: 'Finance', component: () => import('../views/finance/index.vue') },
      { path: 'customer', name: 'Customer', component: () => import('../views/customer/index.vue') },
      { path: 'dealer', name: 'Dealer', component: () => import('../views/dealer/index.vue') },
      { path: 'employee', name: 'Employee', component: () => import('../views/employee/index.vue') },
      { path: 'supplier', name: 'Supplier', component: () => import('../views/supplier/index.vue') },
      { path: 'report', name: 'Report', component: () => import('../views/report/index.vue') },
      { path: 'sort', name: 'Sort', component: () => import('../views/sort/index.vue') },
      { path: 'shipment', name: 'Shipment', component: () => import('../views/shipment/index.vue') },
      { path: 'receivable', name: 'Receivable', component: () => import('../views/receivable/index.vue') },
      { path: 'purchase', name: 'Purchase', component: () => import('../views/purchase/index.vue') },
      { path: 'quality', name: 'Quality', component: () => import('../views/quality/index.vue') },
      { path: 'quote', name: 'Quote', component: () => import('../views/quote/index.vue') },
      { path: 'package', name: 'Package', component: () => import('../views/package/index.vue') },
      { path: 'system', name: 'System', component: () => import('../views/system/index.vue') },
      { path: 'system/exchange-rate', name: 'ExchangeRate', component: () => import('../views/system/exchange_rate.vue') },
      { path: 'cost', name: 'Cost', component: () => import('../views/cost/index.vue') },
      { path: 'scanner', name: 'Scanner', component: () => import('../views/scanner/index.vue') },
      { path: 'approval', name: 'Approval', component: () => import('../views/approval/index.vue') },
      { path: 'contract', name: 'Contract', component: () => import('../views/contract/index.vue') }
    ]
  },
  {
    path: '/dealer-portal',
    redirect: '/dealer-portal/login',
    children: [
      { path: 'login', name: 'DealerLogin', component: () => import('../views/dealer-portal/login.vue') },
      {
        path: '',
        component: () => import('../views/dealer-portal/layout.vue'),
        children: [
          { path: 'dashboard', name: 'DealerDashboard', component: () => import('../views/dealer-portal/dashboard.vue') },
          { path: 'orders', name: 'DealerOrders', component: () => import('../views/dealer-portal/orders.vue') },
          { path: 'track', name: 'DealerTrack', component: () => import('../views/dealer-portal/track.vue') },
          { path: 'customers', name: 'DealerCustomers', component: () => import('../views/dealer-portal/customers.vue') },
          { path: 'commissions', name: 'DealerCommissions', component: () => import('../views/dealer-portal/commissions.vue') },
          { path: 'finance', name: 'DealerFinance', component: () => import('../views/dealer-portal/finance.vue') },
          { path: 'settings', name: 'DealerSettings', component: () => import('../views/dealer-portal/settings.vue') }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
