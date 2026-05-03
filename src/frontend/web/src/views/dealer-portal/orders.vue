<template>
  <div class="orders-page">
    <div class="page-header">
      <h2 class="page-title">我的订单</h2>
      <el-button type="primary" @click="showCreateDialog = true">+ 新建订单</el-button>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-input v-model="searchForm.orderNo" placeholder="订单号" style="width: 180px" clearable />
      <el-input v-model="searchForm.customerName" placeholder="客户名称" style="width: 160px" clearable />
      <el-select v-model="searchForm.status" placeholder="订单状态" style="width: 130px" clearable>
        <el-option v-for="(v,k) in statusMap" :key="k" :label="v.text" :value="k" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="创建开始" end-placeholder="创建结束" style="width: 260px" value-format="YYYY-MM-DD" />
      <el-button @click="loadOrders(1)">搜索</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="orders" v-loading="loading" stripe>
      <el-table-column prop="order_no" label="订单号" width="160" />
      <el-table-column prop="customer_name" label="客户" min-width="120" />
      <el-table-column prop="total_amount" label="订单金额" width="120">
        <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
      </el-table-column>
      <el-table-column prop="order_status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusMap[row.order_status]?.type">{{ statusMap[row.order_status]?.text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="expected_delivery" label="预计交付" width="120" />
      <el-table-column prop="created_at" label="创建时间" width="120" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="$router.push(`/dealer-portal/track?orderNo=${row.order_no}`)">追踪</el-button>
          <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadOrders"
      />
    </div>

    <!-- 新建订单对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建订单" width="600px">
      <el-form :model="orderForm" label-width="100px">
        <el-form-item label="客户">
          <el-select v-model="orderForm.customer_id" filterable placeholder="搜索客户" style="width:100%">
            <el-option v-for="c in customers" :key="c.id" :label="c.customer_name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单金额">
          <el-input-number v-model="orderForm.total_amount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="预计交付日期">
          <el-date-picker v-model="orderForm.expected_delivery" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="orderForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitOrder">提交</el-button>
      </template>
    </el-dialog>

    <!-- 订单详情 -->
    <el-dialog v-model="showDetailDialog" title="订单详情" width="700px">
      <div v-if="detail" class="order-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ detail.order_no }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusMap[detail.order_status]?.type">{{ statusMap[detail.order_status]?.text }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="客户">{{ detail.customer_name }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ formatMoney(detail.total_amount) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
          <el-descriptions-item label="预计交付">{{ detail.expected_delivery }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待确认', type: 'warning' },
  producing: { text: '生产中', type: '' },
  shipped: { text: '已发货', type: 'primary' },
  installed: { text: '已安装', type: '' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' }
}

function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }
function getHeaders() { return { Authorization: `Bearer ${localStorage.getItem('dealer_token')}` } }

const searchForm = reactive({ orderNo: '', customerName: '', status: '' })
const dateRange = ref([])
const orders = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const submitting = ref(false)
const customers = ref([])
const detail = ref(null)
const orderForm = reactive({ customer_id: null, total_amount: 0, expected_delivery: '', remark: '' })

async function loadOrders(p = 1) {
  page.value = p
  loading.value = true
  try {
    const params = { page: p, page_size: pageSize.value }
    if (searchForm.orderNo) params.order_no = searchForm.orderNo
    if (searchForm.customerName) params.customer_name = searchForm.customerName
    if (searchForm.status) params.status = searchForm.status
    if (dateRange.value?.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await axios.get('/dealer/v1/orders', { params, headers: getHeaders() })
    if (res.data.success) {
      orders.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    }
  } catch (err) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  searchForm.orderNo = ''
  searchForm.customerName = ''
  searchForm.status = ''
  dateRange.value = []
  loadOrders(1)
}

function viewDetail(row) {
  detail.value = row
  showDetailDialog.value = true
}

async function loadCustomers() {
  try {
    const res = await axios.get('/dealer/v1/customers', { params: { page: 1, page_size: 200 }, headers: getHeaders() })
    if (res.data.success) customers.value = res.data.data.list || []
  } catch {}
}

async function submitOrder() {
  if (!orderForm.customer_id) return ElMessage.warning('请选择客户')
  submitting.value = true
  try {
    const res = await axios.post('/dealer/v1/orders', orderForm, { headers: getHeaders() })
    if (res.data.success) {
      ElMessage.success('订单已创建')
      showCreateDialog.value = false
      loadOrders()
    } else {
      ElMessage.error(res.data.message || '创建失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadOrders()
  loadCustomers()
})
</script>

<style scoped>
.orders-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 22px; color: #333; }
.search-bar { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
