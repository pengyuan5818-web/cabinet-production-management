<template>
  <div class="dashboard">
    <h2 class="page-title">工作台</h2>

    <!-- 关键指标卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e3f2fd; color: #1565c0">📦</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalOrders }}</div>
            <div class="stat-label">总订单数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #fff3e0; color: #e65100">⏳</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.inProgress }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e8f5e9; color: #2e7d32">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #fce4ec; color: #c62828">💰</div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(stats.pendingCommission) }}</div>
            <div class="stat-label">待结算佣金</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 近期订单 -->
    <div class="section">
      <div class="section-header">
        <h3>近期订单</h3>
        <el-button size="small" @click="$router.push('/dealer-portal/orders')">查看全部</el-button>
      </div>
      <el-table :data="recentOrders" stripe>
        <el-table-column prop="order_no" label="订单号" width="160" />
        <el-table-column prop="customer_name" label="客户" />
        <el-table-column prop="total_amount" label="金额" width="120">
          <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column prop="order_status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.order_status)">{{ statusText(row.order_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expected_delivery" label="预计交付" width="120" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$router.push(`/dealer-portal/track?orderNo=${row.order_no}`)">
              追踪
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 账务概览 -->
    <el-row :gutter="16" class="finance-row">
      <el-col :span="12">
        <div class="panel">
          <h3>📊 佣金概览</h3>
          <div class="commission-list">
            <div class="commission-item">
              <span>已结算佣金</span>
              <span class="amount success">¥{{ formatMoney(commissionStats.settled) }}</span>
            </div>
            <div class="commission-item">
              <span>待确认佣金</span>
              <span class="amount warning">¥{{ formatMoney(commissionStats.pending) }}</span>
            </div>
            <div class="commission-item">
              <span>累计佣金</span>
              <span class="amount">¥{{ formatMoney(commissionStats.total) }}</span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="panel">
          <h3>💳 账款概览</h3>
          <div class="commission-list">
            <div class="commission-item">
              <span>应付账款</span>
              <span class="amount warning">¥{{ formatMoney(financeStats.payable) }}</span>
            </div>
            <div class="commission-item">
              <span>应收款</span>
              <span class="amount success">¥{{ formatMoney(financeStats.receivable) }}</span>
            </div>
            <div class="commission-item">
              <span>账户余额</span>
              <span class="amount">¥{{ formatMoney(financeStats.balance) }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const dealerInfo = JSON.parse(localStorage.getItem('dealer_info') || '{}')

const stats = ref({ totalOrders: 0, inProgress: 0, completed: 0, pendingCommission: 0 })
const recentOrders = ref([])
const commissionStats = ref({ settled: 0, pending: 0, total: 0 })
const financeStats = ref({ payable: 0, receivable: 0, balance: 0 })

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待确认', type: 'warning' },
  producing: { text: '生产中', type: '' },
  shipped: { text: '已发货', type: '' },
  installed: { text: '已安装', type: '' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' }
}

function statusType(s) { return statusMap[s]?.type || '' }
function statusText(s) { return statusMap[s]?.text || s }
function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }

function getHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('dealer_token')}` }
}

onMounted(async () => {
  try {
    // 订单统计
    const [orderRes, commissionRes, financeRes] = await Promise.all([
      axios.get('/dealer/v1/orders', { params: { page: 1, page_size: 5 }, headers: getHeaders() }),
      axios.get('/dealer/v1/commissions', { headers: getHeaders() }),
      axios.get('/dealer/v1/finance/summary', { headers: getHeaders() })
    ])

    if (orderRes.data.success) {
      const data = orderRes.data.data
      recentOrders.value = data.list || []
      stats.value.totalOrders = data.total || 0
      stats.value.inProgress = (data.list || []).filter(o => !['completed', 'cancelled'].includes(o.order_status)).length
      stats.value.completed = (data.list || []).filter(o => o.order_status === 'completed').length
    }

    if (commissionRes.data.success) {
      const list = commissionRes.data.data?.list || []
      commissionStats.value.total = list.reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0)
      commissionStats.value.settled = list.filter(c => c.status === 'settled').reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0)
      commissionStats.value.pending = list.filter(c => c.status === 'pending').reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0)
      stats.value.pendingCommission = commissionStats.value.pending
    }

    if (financeRes.data.success) {
      const f = financeRes.data.data || {}
      financeStats.value.payable = f.payable || 0
      financeStats.value.receivable = f.receivable || 0
      financeStats.value.balance = f.balance || 0
    }
  } catch (err) {
    console.error('加载数据失败:', err)
  }
})
</script>

<style scoped>
.dashboard { padding: 0; }
.page-title { font-size: 22px; margin-bottom: 20px; color: #333; }

.stat-cards { margin-bottom: 24px; }
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.stat-icon { font-size: 32px; width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-value { font-size: 24px; font-weight: bold; color: #333; }
.stat-label { font-size: 13px; color: #888; margin-top: 4px; }

.section { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { font-size: 16px; color: #333; }

.finance-row { margin-top: 0; }
.panel { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.panel h3 { font-size: 16px; margin-bottom: 16px; }

.commission-list { display: flex; flex-direction: column; gap: 12px; }
.commission-item { display: flex; justify-content: space-between; font-size: 14px; color: #666; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.commission-item:last-child { border-bottom: none; }
.amount { font-weight: bold; font-size: 15px; }
.amount.success { color: #67c23a; }
.amount.warning { color: #e6a23c; }
</style>
