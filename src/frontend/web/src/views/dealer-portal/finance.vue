<template>
  <div class="finance-page">
    <div class="page-header">
      <h2 class="page-title">账务明细</h2>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-value warning">¥{{ formatMoney(stats.receivable) }}</div>
          <div class="stat-label">经销商应收款（欠工厂）</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-value success">¥{{ formatMoney(stats.commissionReceivable) }}</div>
          <div class="stat-label">累计佣金收益</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-value">¥{{ formatMoney(stats.balance) }}</div>
          <div class="stat-label">账户余额</div>
        </div>
      </el-col>
    </el-row>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="finance-tabs">
      <el-tab-pane label="应收款记录" name="receivables">
        <el-table :data="receivables" v-loading="loading" stripe>
          <el-table-column prop="statement_no" label="账单号" width="180" />
          <el-table-column prop="period" label="账期" width="120" />
          <el-table-column prop="order_no" label="关联订单" width="150" />
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'settled' ? 'success' : row.status === 'partial' ? 'warning' : 'info'" size="small">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="due_date" label="到期日" width="120" />
          <el-table-column prop="settled_at" label="结算时间" width="120" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="付款记录" name="payments">
        <el-table :data="payments" v-loading="loading" stripe>
          <el-table-column prop="payment_no" label="付款单号" width="180" />
          <el-table-column prop="amount" label="付款金额" width="120">
            <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="payment_method" label="付款方式" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'confirmed' ? 'success' : 'info'" size="small">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="paid_at" label="付款时间" width="160" />
          <el-table-column prop="remark" label="备注" min-width="120" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="对账单" name="statements">
        <el-table :data="statements" v-loading="loading" stripe>
          <el-table-column prop="statement_no" label="账单号" width="180" />
          <el-table-column prop="period" label="账期" width="120" />
          <el-table-column prop="order_amount" label="订单金额" width="120">
            <template #default="{ row }">¥{{ formatMoney(row.order_amount) }}</template>
          </el-table-column>
          <el-table-column prop="commission" label="佣金" width="120">
            <template #default="{ row }">¥{{ formatMoney(row.commission) }}</template>
          </el-table-column>
          <el-table-column prop="payment_amount" label="已付款" width="120">
            <template #default="{ row }">¥{{ formatMoney(row.payment_amount) }}</template>
          </el-table-column>
          <el-table-column prop="balance" label="余额" width="120">
            <template #default="{ row }">
              <span :style="{ color: row.balance > 0 ? '#e6a23c' : '#67c23a', fontWeight: 'bold' }">
                ¥{{ formatMoney(row.balance) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'settled' ? 'success' : 'warning'" size="small">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import axios from 'axios'

const activeTab = ref('receivables')
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const receivables = ref([])
const payments = ref([])
const statements = ref([])
const stats = ref({ receivable: 0, commissionReceivable: 0, balance: 0 })

function statusText(s) {
  const m = { pending: '待确认', confirmed: '已确认', settled: '已结清', partial: '部分结清', unpaid: '未付款' }
  return m[s] || s
}
function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }
function getHeaders() { return { Authorization: `Bearer ${localStorage.getItem('dealer_token')}` } }

async function loadData(p = 1) {
  page.value = p
  loading.value = true
  try {
    const params = { page: p, page_size: pageSize.value }
    if (activeTab.value === 'receivables') {
      const res = await axios.get('/dealer/v1/receivables', { params, headers: getHeaders() })
      if (res.data.success) { receivables.value = res.data.data?.list || []; total.value = res.data.data?.total || 0 }
    } else if (activeTab.value === 'payments') {
      const res = await axios.get('/dealer/v1/payments', { params, headers: getHeaders() })
      if (res.data.success) { payments.value = res.data.data?.list || []; total.value = res.data.data?.total || 0 }
    } else {
      const res = await axios.get('/dealer/v1/statements', { params, headers: getHeaders() })
      if (res.data.success) { statements.value = res.data.data?.list || []; total.value = res.data.data?.total || 0 }
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function loadStats() {
  try {
    const res = await axios.get('/dealer/v1/finance/summary', { headers: getHeaders() })
    if (res.data.success) stats.value = res.data.data || {}
  } catch {}
}

watch(activeTab, () => loadData(1))
loadStats()
loadData()
</script>

<style scoped>
.finance-page { padding: 0; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 22px; color: #333; }
.stat-cards { margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 10px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-value { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
.stat-value.success { color: #67c23a; }
.stat-value.warning { color: #e6a23c; }
.stat-label { font-size: 13px; color: #888; }
.finance-tabs { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
