<template>
  <div class="receivable-page">
    <!-- 概览卡片 -->
    <el-row :gutter="12" style="margin-bottom: 12px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <el-icon style="font-size: 24px; color: #409eff"><Wallet /></el-icon>
            <div>
              <div class="stat-label">总应收</div>
              <div class="stat-value" style="color: #409eff">¥{{ formatNum(summary.total_receivable) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <el-icon style="font-size: 24px; color: #67c23a"><Money /></el-icon>
            <div>
              <div class="stat-label">总已收</div>
              <div class="stat-value" style="color: #67c23a">¥{{ formatNum(summary.total_paid) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <el-icon style="font-size: 24px; color: #e6a23c"><Coin /></el-icon>
            <div>
              <div class="stat-label">总未收</div>
              <div class="stat-value" style="color: #e6a23c">¥{{ formatNum(summary.total_unpaid) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <el-icon style="font-size: 24px; color: #f56c6c"><Warning /></el-icon>
            <div>
              <div class="stat-label">超期金额</div>
              <div class="stat-value" style="color: #f56c6c">¥{{ formatNum(summary.overdue_amount) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 账龄分析卡片 -->
    <el-row :gutter="12" style="margin-bottom: 12px">
      <el-col :span="6">
        <el-card shadow="hover" class="aging-card">
          <div class="aging-label">30天内</div>
          <div class="aging-value" style="color: #67c23a">¥{{ formatNum(aging.within_30) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="aging-card">
          <div class="aging-label">30-60天</div>
          <div class="aging-value" style="color: #e6a23c">¥{{ formatNum(aging.days_30_60) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="aging-card">
          <div class="aging-label">60-90天</div>
          <div class="aging-value" style="color: #f56c6c">¥{{ formatNum(aging.days_60_90) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="aging-card">
          <div class="aging-label">90天以上</div>
          <div class="aging-value" style="color: #909399">¥{{ formatNum(aging.over_90) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tab + 列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <el-radio-group v-model="activeTab" @change="loadList" style="margin-right: 12px">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="unpaid">未收</el-radio-button>
            <el-radio-button value="partial">部分</el-radio-button>
            <el-radio-button value="overdue">超期</el-radio-button>
          </el-radio-group>
          <el-button type="primary" size="small" @click="showCreateDialog = true">生成应收款</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" min-width="140" />
        <el-table-column prop="customer_name" label="客户名" min-width="130" />
        <el-table-column prop="total_amount" label="应收总额" min-width="110" align="right">
          <template #default="{ row }">
            ¥{{ formatNum(row.total_amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="paid_amount" label="已收" min-width="100" align="right">
          <template #default="{ row }">
            <span style="color: #67c23a">¥{{ formatNum(row.paid_amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="balance_amount" label="余额" min-width="100" align="right">
          <template #default="{ row }">
            <span style="color: #e6a23c">¥{{ formatNum(row.balance_amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="payment_term" label="账期" width="90" align="center">
          <template #default="{ row }">
            {{ paymentTermLabel(row.payment_term) }}
          </template>
        </el-table-column>
        <el-table-column prop="due_date" label="到期日" width="110">
          <template #default="{ row }">
            {{ row.due_date || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="payment_status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.payment_status)" size="small">
              {{ statusLabel(row.payment_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.payment_status !== 'paid'"
              type="success"
              size="small"
              @click="openCollectDialog(row)"
            >收款</el-button>
            <el-button size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.page_size"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <!-- 收款对话框 -->
    <el-dialog v-model="collectDialogVisible" title="收款核销" width="480px">
      <el-form :model="collectForm" label-width="100px">
        <el-form-item label="订单号">
          <el-input v-model="currentRow.order_no" disabled />
        </el-form-item>
        <el-form-item label="客户名">
          <el-input v-model="currentRow.customer_name" disabled />
        </el-form-item>
        <el-form-item label="应收总额">
          <el-input :value="'¥' + formatNum(currentRow.total_amount)" disabled />
        </el-form-item>
        <el-form-item label="已收金额">
          <el-input :value="'¥' + formatNum(currentRow.paid_amount)" disabled />
        </el-form-item>
        <el-form-item label="待收金额">
          <el-input :value="'¥' + formatNum(currentRow.balance_amount)" disabled />
        </el-form-item>
        <el-divider />
        <el-form-item label="收款金额" required>
          <el-input-number
            v-model="collectForm.collection_amount"
            :min="0.01"
            :max="currentRow.balance_amount"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="收款日期" required>
          <el-date-picker
            v-model="collectForm.collection_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="收款方式">
          <el-select v-model="collectForm.collection_method" placeholder="选择方式" style="width: 100%">
            <el-option label="现金" value="cash" />
            <el-option label="银行转账" value="bank_transfer" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作员">
          <el-input v-model="collectForm.operator_name" placeholder="操作员姓名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="collectForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="collectDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="collectLoading" @click="submitCollect">确认收款</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="应收款详情" width="700px">
      <el-descriptions :column="2" border v-if="detailData.id">
        <el-descriptions-item label="订单号">{{ detailData.order_no }}</el-descriptions-item>
        <el-descriptions-item label="客户名">{{ detailData.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="应收总额">¥{{ formatNum(detailData.total_amount) }}</el-descriptions-item>
        <el-descriptions-item label="已收金额">
          <span style="color: #67c23a">¥{{ formatNum(detailData.paid_amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="待收金额">
          <span style="color: #e6a23c">¥{{ formatNum(detailData.balance_amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="账期">{{ paymentTermLabel(detailData.payment_term) }}</el-descriptions-item>
        <el-descriptions-item label="到期日">{{ detailData.due_date }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detailData.payment_status)" size="small">
            {{ statusLabel(detailData.payment_status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 16px">
        <div style="font-weight: 600; margin-bottom: 8px">收款记录</div>
        <el-table :data="detailData.records || []" stripe size="small">
          <el-table-column prop="collection_no" label="收款单号" min-width="160" />
          <el-table-column prop="collection_amount" label="收款金额" min-width="100" align="right">
            <template #default="{ row }">
              ¥{{ formatNum(row.collection_amount) }}
            </template>
          </el-table-column>
          <el-table-column prop="collection_date" label="收款日期" width="110" />
          <el-table-column prop="collection_method" label="收款方式" width="100" align="center">
            <template #default="{ row }">
              {{ methodLabel(row.collection_method) }}
            </template>
          </el-table-column>
          <el-table-column prop="operator_name" label="操作员" width="100" />
          <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        </el-table>
        <el-empty v-if="!detailData.records?.length" description="暂无收款记录" />
      </div>
    </el-dialog>

    <!-- 生成应收款对话框 -->
    <el-dialog v-model="showCreateDialog" title="生成应收款" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="选择订单" required>
          <el-select
            v-model="createForm.order_id"
            placeholder="请选择订单"
            filterable
            style="width: 100%"
            @change="onOrderChange"
          >
            <el-option
              v-for="o in orderOptions"
              :key="o.id"
              :label="`${o.order_no} - ${o.customer_name}`"
              :value="o.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="客户名">
          <el-input v-model="createForm.customer_name" disabled />
        </el-form-item>
        <el-form-item label="订单金额">
          <el-input :value="'¥' + formatNum(createForm.total_amount)" disabled />
        </el-form-item>
        <el-form-item label="账期" required>
          <el-select v-model="createForm.payment_term" style="width: 100%">
            <el-option label="30天" value="month_30" />
            <el-option label="60天" value="month_60" />
            <el-option label="90天" value="month_90" />
            <el-option label="120天" value="month_120" />
            <el-option label="分期" value="instalment" />
          </el-select>
        </el-form-item>
        <el-form-item label="到期日">
          <el-date-picker
            v-model="createForm.due_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="留空自动计算"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="submitCreate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { receivable, orders } from '../../api'

const loading = ref(false)
const collectLoading = ref(false)
const createLoading = ref(false)

const activeTab = ref('all')
const list = ref([])
const summary = ref({})
const aging = ref({})
const pagination = ref({ page: 1, page_size: 20, total: 0 })

const collectDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const showCreateDialog = ref(false)
const currentRow = ref({})
const detailData = ref({})

const collectForm = reactive({
  collection_amount: 0,
  collection_date: '',
  collection_method: '',
  operator_name: '',
  remark: ''
})

const createForm = reactive({
  order_id: '',
  customer_name: '',
  total_amount: 0,
  payment_term: 'month_30',
  due_date: ''
})

const orderOptions = ref([])

function formatNum(val) {
  if (val == null) return '0.00'
  return parseFloat(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function paymentTermLabel(term) {
  const map = {
    month_30: '30天',
    month_60: '60天',
    month_90: '90天',
    month_120: '120天',
    instalment: '分期'
  }
  return map[term] || term || '-'
}

function statusLabel(status) {
  const map = {
    unpaid: '未收',
    partial: '部分',
    paid: '已收',
    overdue: '超期'
  }
  return map[status] || status || '-'
}

function statusTagType(status) {
  const map = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success',
    overdue: 'danger'
  }
  return map[status] || 'info'
}

function methodLabel(method) {
  const map = {
    cash: '现金',
    bank_transfer: '银行转账',
    wechat: '微信',
    alipay: '支付宝'
  }
  return map[method] || method || '-'
}

async function loadSummary() {
  try {
    const res = await receivable.summary()
    summary.value = res
  } catch (e) {
    console.error('加载概览失败', e)
  }
}

async function loadAging() {
  try {
    const res = await receivable.aging()
    aging.value = res
  } catch (e) {
    console.error('加载账龄失败', e)
  }
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      page_size: pagination.value.page_size
    }
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    const res = await receivable.list(params)
    list.value = res.list || []
    pagination.value.total = res.total || 0
  } catch (e) {
    console.error('加载列表失败', e)
    ElMessage.error('加载列表失败')
  } finally {
    loading.value = false
  }
}

async function loadOrdersForCreate() {
  try {
    const res = await orders.list({ page: 1, page_size: 500 })
    orderOptions.value = (res.list || []).filter(o => o.order_status === 'completed' || o.order_status === 'delivered')
  } catch (e) {
    console.error('加载订单列表失败', e)
  }
}

function onOrderChange(orderId) {
  const order = orderOptions.value.find(o => o.id === orderId)
  if (order) {
    createForm.customer_name = order.customer_name || ''
    createForm.total_amount = order.total_amount || 0
  }
}

function openCollectDialog(row) {
  currentRow.value = { ...row }
  collectForm.collection_amount = parseFloat(row.balance_amount)
  collectForm.collection_date = new Date().toISOString().split('T')[0]
  collectForm.collection_method = ''
  collectForm.operator_name = ''
  collectForm.remark = ''
  collectDialogVisible.value = true
}

async function submitCollect() {
  if (!collectForm.collection_amount || collectForm.collection_amount <= 0) {
    return ElMessage.warning('请输入收款金额')
  }
  if (!collectForm.collection_date) {
    return ElMessage.warning('请选择收款日期')
  }
  collectLoading.value = true
  try {
    await receivable.collect(currentRow.value.id, { ...collectForm })
    ElMessage.success('收款核销成功')
    collectDialogVisible.value = false
    loadList()
    loadSummary()
    loadAging()
  } catch (e) {
    ElMessage.error(e.message || '收款失败')
  } finally {
    collectLoading.value = false
  }
}

async function viewDetail(row) {
  try {
    const res = await receivable.detail(row.id)
    detailData.value = res
    detailDialogVisible.value = true
  } catch (e) {
    ElMessage.error('加载详情失败')
  }
}

async function submitCreate() {
  if (!createForm.order_id) {
    return ElMessage.warning('请选择订单')
  }
  createLoading.value = true
  try {
    await receivable.create({ ...createForm })
    ElMessage.success('生成成功')
    showCreateDialog.value = false
    loadList()
    loadSummary()
  } catch (e) {
    ElMessage.error(e.message || '生成失败')
  } finally {
    createLoading.value = false
  }
}

onMounted(() => {
  loadSummary()
  loadAging()
  loadList()
})
</script>

<style scoped>
.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 20px;
  font-weight: 600;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.aging-card {
  text-align: center;
}
.aging-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}
.aging-value {
  font-size: 18px;
  font-weight: 600;
}
</style>
