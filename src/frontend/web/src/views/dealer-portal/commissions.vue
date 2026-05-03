<template>
  <div class="commissions-page">
    <div class="page-header">
      <h2 class="page-title">佣金查询</h2>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value success">¥{{ formatMoney(stats.total) }}</div>
          <div class="stat-label">累计佣金</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value warning">¥{{ formatMoney(stats.pending) }}</div>
          <div class="stat-label">待结算</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value">¥{{ formatMoney(stats.settled) }}</div>
          <div class="stat-label">已结算</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value">{{ stats.count }} 笔</div>
          <div class="stat-label">总记录</div>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选 -->
    <div class="search-bar">
      <el-select v-model="filterForm.status" placeholder="状态" style="width: 140px" clearable>
        <el-option label="待结算" value="pending" />
        <el-option label="已结算" value="settled" />
        <el-option label="已支付" value="paid" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" />
      <el-button @click="loadCommissions(1)">搜索</el-button>
      <el-button @click="resetFilter">重置</el-button>
    </div>

    <!-- 列表 -->
    <el-table :data="commissions" v-loading="loading" stripe>
      <el-table-column prop="commission_no" label="佣金单号" width="180" />
      <el-table-column prop="order_no" label="订单号" width="160">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="$router.push(`/dealer-portal/track?orderNo=${row.order_no}`)">
            {{ row.order_no }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="order_amount" label="订单金额" width="120">
        <template #default="{ row }">¥{{ formatMoney(row.order_amount) }}</template>
      </el-table-column>
      <el-table-column prop="commission_amount" label="佣金金额" width="120">
        <template #default="{ row }">
          <span style="color: #67c23a; font-weight: bold">¥{{ formatMoney(row.commission_amount) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="commission_rate" label="佣金比例" width="100">
        <template #default="{ row }">{{ row.commission_rate }}%</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="settled_at" label="结算时间" width="120" />
      <el-table-column prop="created_at" label="生成时间" width="120" />
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadCommissions"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const statusMap = {
  pending: { text: '待结算', type: 'warning' },
  settled: { text: '已结算', type: 'success' },
  paid: { text: '已支付', type: 'primary' }
}
function statusType(s) { return statusMap[s]?.type || '' }
function statusText(s) { return statusMap[s]?.text || s }
function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }
function getHeaders() { return { Authorization: `Bearer ${localStorage.getItem('dealer_token')}` } }

const commissions = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dateRange = ref([])
const filterForm = reactive({ status: '' })
const stats = ref({ total: 0, pending: 0, settled: 0, count: 0 })

async function loadCommissions(p = 1) {
  page.value = p
  loading.value = true
  try {
    const params = { page: p, page_size: pageSize.value }
    if (filterForm.status) params.status = filterForm.status
    if (dateRange.value?.length === 2) { params.start_date = dateRange.value[0]; params.end_date = dateRange.value[1] }
    const res = await axios.get('/dealer/v1/commissions', { params, headers: getHeaders() })
    if (res.data.success) {
      commissions.value = res.data.data?.list || []
      total.value = res.data.data?.total || 0
      // 计算统计
      const all = res.data.data?.list || []
      stats.value.total = all.reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0)
      stats.value.pending = all.filter(c => c.status === 'pending').reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0)
      stats.value.settled = all.filter(c => ['settled', 'paid'].includes(c.status)).reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0)
      stats.value.count = all.length
    }
  } catch { console.error('加载失败') }
  finally { loading.value = false }
}

function resetFilter() {
  filterForm.status = ''
  dateRange.value = []
  loadCommissions(1)
}

onMounted(() => loadCommissions())
</script>

<style scoped>
.commissions-page { padding: 0; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 22px; color: #333; }
.stat-cards { margin-bottom: 16px; }
.stat-card { background: #fff; border-radius: 10px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-value { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
.stat-value.success { color: #67c23a; }
.stat-value.warning { color: #e6a23c; }
.stat-label { font-size: 13px; color: #888; }
.search-bar { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; display: flex; gap: 10px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
