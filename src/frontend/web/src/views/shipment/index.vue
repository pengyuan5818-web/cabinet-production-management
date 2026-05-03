<template>
  <div class="shipment-page">
    <!-- 顶栏筛选 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="订单号">
          <el-input v-model="filterForm.order_no" placeholder="订单号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="客户名">
          <el-input v-model="filterForm.customer_name" placeholder="客户名" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders" :loading="loading">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 订单列表 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>发货订单列表</span>
        </div>
      </template>
      <el-table :data="orderList" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" min-width="140" />
        <el-table-column prop="customer_name" label="客户名" min-width="120" />
        <el-table-column prop="order_status" label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.order_status === 'completed' ? 'success' : 'warning'" size="small">
              {{ row.order_status === 'completed' ? '已完成' : '生产中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total_boards" label="板件总数" width="100" align="center" />
        <el-table-column prop="in_stock_boards" label="在库数" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: bold">{{ row.in_stock_boards }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="missing_boards" label="缺失/已发" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #f56c6c">{{ row.missing_boards }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openShipDialog(row)" :disabled="row.in_stock_boards === 0">
              出库发货
            </el-button>
            <el-button size="small" @click="viewHistory(row)">记录</el-button>
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
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </el-card>

    <!-- 出库确认对话框 -->
    <el-dialog v-model="shipDialogVisible" title="发货出库" width="900px" :close-on-click-modal="false">
      <!-- 订单基本信息 -->
      <div class="order-summary" v-if="currentOrder">
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="订单号">{{ currentOrder.order_no }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customer_name }}</el-descriptions-item>
          <el-descriptions-item label="板件总数">{{ boardList.length }}</el-descriptions-item>
          <el-descriptions-item label="待发货">
            <span style="color: #67c23a; font-weight: bold">{{ inStockCount }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 板件清单 -->
      <el-table :data="boardList" stripe size="small" max-height="400" :row-class-name="getRowClass">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="barcode" label="条码" min-width="160" />
        <el-table-column prop="board_name" label="板件名" min-width="140" />
        <el-table-column prop="board_spec" label="规格" min-width="120" />
        <el-table-column prop="location_code" label="库位" width="120" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 扫码输入区 -->
      <div class="scan-area">
        <el-input
          v-model="scanInput"
          placeholder="扫描或输入板件条码，按回车确认"
          @keyup.enter="handleScanShip"
          clearable
          style="width: 400px"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="handleScanShip" :loading="scanLoading">确认发货</el-button>
        <span v-if="scanResult" :class="['scan-result', scanResult.ok ? 'ok' : 'fail']">
          {{ scanResult.msg }}
        </span>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="shipDialogVisible = false">关闭</el-button>
          <el-button type="success" @click="handleBatchShip" :loading="batchLoading" :disabled="inStockCount === 0">
            一键批量出库 ({{ inStockCount }} 件)
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 历史记录对话框 -->
    <el-dialog v-model="historyDialogVisible" title="发货记录" width="700px">
      <el-timeline v-if="shipmentHistory.length > 0">
        <el-timeline-item
          v-for="s in shipmentHistory"
          :key="s.id"
          :timestamp="formatDate(s.shipped_at || s.created_at)"
          placement="top"
        >
          <el-card shadow="never">
            <div class="history-item">
              <p><strong>操作人:</strong> {{ s.operator_name || '系统' }} &nbsp;&nbsp;
                <strong>发货数量:</strong> {{ s.shipped_boards }} 件</p>
              <p v-if="s.remark"><strong>备注:</strong> {{ s.remark }}</p>
              <el-table :data="s.items" size="small" max-height="200">
                <el-table-column prop="barcode" label="条码" min-width="140" />
                <el-table-column prop="board_name" label="板件名" min-width="120" />
                <el-table-column prop="board_spec" label="规格" min-width="100" />
                <el-table-column prop="shipped_at" label="发货时间" width="160">
                  <template #default="{ row }">
                    {{ formatDate(row.shipped_at) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无发货记录" />

      <template #footer>
        <el-button @click="historyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shipment } from '../../api'

const loading = ref(false)
const orderList = ref([])
const filterForm = ref({ order_no: '', customer_name: '' })
const pagination = ref({ page: 1, page_size: 50, total: 0 })

// 出库对话框
const shipDialogVisible = ref(false)
const currentOrder = ref(null)
const boardList = ref([])
const scanInput = ref('')
const scanLoading = ref(false)
const batchLoading = ref(false)
const scanResult = ref(null)

// 历史记录对话框
const historyDialogVisible = ref(false)
const shipmentHistory = ref([])

const inStockCount = computed(() => boardList.value.filter(b => b.status === 'in_stock').length)

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', { hour12: false })
}

function statusLabel(s) {
  return { in_stock: '在库', shipped: '已发货', missing: '缺失' }[s] || s
}

function statusTagType(s) {
  return { in_stock: 'success', shipped: 'info', missing: 'danger' }[s] || ''
}

function getRowClass({ row }) {
  if (row.status === 'shipped') return 'shipped-row'
  if (row.highlight) return 'highlight-row'
  return ''
}

async function loadOrders() {
  loading.value = true
  try {
    const res = await shipment.orders({
      page: pagination.value.page,
      page_size: pagination.value.page_size,
      order_no: filterForm.value.order_no || undefined,
      customer_name: filterForm.value.customer_name || undefined
    })
    orderList.value = res.data || []
    pagination.value.total = res.total || 0
  } catch (e) {
    ElMessage.error('加载订单失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterForm.value = { order_no: '', customer_name: '' }
  loadOrders()
}

async function openShipDialog(order) {
  currentOrder.value = order
  shipDialogVisible.value = true
  scanResult.value = null
  scanInput.value = ''
  await loadBoards(order.order_id)
}

async function loadBoards(orderId) {
  try {
    const res = await shipment.orderBoards(orderId)
    boardList.value = res.data || []
  } catch (e) {
    ElMessage.error('加载板件失败: ' + e.message)
  }
}

async function handleScanShip() {
  if (!scanInput.value.trim()) return
  if (!currentOrder.value) return
  scanLoading.value = true
  scanResult.value = null
  try {
    const res = await shipment.scanBarcode({
      barcode: scanInput.value.trim(),
      order_id: currentOrder.value.order_id,
      operator_id: localStorage.getItem('employee_id') || '',
      operator_name: localStorage.getItem('employee_name') || '操作员'
    })
    if (res.success) {
      if (res.already_shipped) {
        scanResult.value = { ok: false, msg: '该板件已发货' }
      } else {
        scanResult.value = { ok: true, msg: `发货成功: ${res.data.board_name}` }
        // 更新列表中高亮的行
        const board = boardList.value.find(b => b.board_id === res.data.board_id)
        if (board) {
          board.status = 'shipped'
          board.highlight = true
          setTimeout(() => { board.highlight = false }, 2000)
        }
      }
    } else {
      scanResult.value = { ok: false, msg: res.message || '发货失败' }
    }
    scanInput.value = ''
  } catch (e) {
    scanResult.value = { ok: false, msg: e.message || '扫码发货失败' }
  } finally {
    scanLoading.value = false
  }
}

async function handleBatchShip() {
  if (inStockCount.value === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要将 ${inStockCount.value} 件板件全部发货出库吗？`,
      '批量发货确认',
      { type: 'warning' }
    )
  } catch {
    return
  }

  batchLoading.value = true
  try {
    const res = await shipment.create({
      order_id: currentOrder.value.order_id,
      operator_id: localStorage.getItem('employee_id') || '',
      operator_name: localStorage.getItem('employee_name') || '操作员',
      remark: ''
    })
    if (res.success) {
      ElMessage.success(res.message || '批量发货成功')
      shipDialogVisible.value = false
      loadOrders()
    } else {
      ElMessage.error(res.message || '批量发货失败')
    }
  } catch (e) {
    ElMessage.error('批量发货失败: ' + e.message)
  } finally {
    batchLoading.value = false
  }
}

async function viewHistory(order) {
  historyDialogVisible.value = true
  try {
    const res = await shipment.list(order.order_id)
    shipmentHistory.value = res.data || []
  } catch (e) {
    ElMessage.error('加载发货记录失败: ' + e.message)
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.shipment-page {
  padding: 16px;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-summary {
  margin-bottom: 16px;
}

.scan-area {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.scan-result {
  font-size: 14px;
}

.scan-result.ok {
  color: #67c23a;
}

.scan-result.fail {
  color: #f56c6c;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.history-item p {
  margin: 4px 0;
}

:deep(.shipped-row) {
  opacity: 0.5;
}

:deep(.highlight-row) {
  background-color: #f0f9eb !important;
}
</style>
