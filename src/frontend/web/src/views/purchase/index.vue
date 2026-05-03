<template>
  <div class="purchase-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>供应商采购管理</span>
          <div>
            <el-button type="primary" @click="openGenerateDialog" :loading="loading">生成采购建议</el-button>
            <el-button type="success" @click="openCreateOrderDialog">新建采购单</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- Tab1: 采购建议 -->
        <el-tab-pane label="采购建议" name="suggestions">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <el-select v-model="filter.order_id" placeholder="关联订单" clearable filterable style="width: 200px">
              <el-option v-for="o in orderOptions" :key="o.id" :label="o.order_no" :value="o.id" />
            </el-select>
            <el-select v-model="filter.status" placeholder="状态" clearable style="width: 130px">
              <el-option label="待确认" value="pending" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已满足" value="fulfilled" />
            </el-select>
            <el-button type="primary" @click="loadSuggestions">搜索</el-button>
            <el-button @click="resetSuggestionFilter">重置</el-button>
          </div>

          <!-- 建议列表 -->
          <el-table :data="suggestions" v-loading="loading" stripe style="margin-top: 16px" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="40" :selectable="row => row.status === 'pending'" />
            <el-table-column prop="material_code" label="物料编码" width="130" />
            <el-table-column prop="material_name" label="物料名称" min-width="160" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="required_quantity" label="需求量" width="90" align="right" />
            <el-table-column prop="current_stock" label="当前库存" width="90" align="right" />
            <el-table-column prop="shortage_quantity" label="缺口数量" width="90" align="right">
              <template #default="{ row }">
                <span style="color: #f56c6c; font-weight: bold">{{ row.shortage_quantity }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="suggested_quantity" label="建议采购量" width="100" align="right" />
            <el-table-column prop="suggested_supplier_name" label="推荐供应商" min-width="140" />
            <el-table-column prop="estimated_price" label="预估金额" width="110" align="right">
              <template #default="{ row }">
                ¥{{ (row.estimated_price || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewSuggestion(row)" :disabled="row.status !== 'pending'">确认</el-button>
                <el-button type="info" link size="small" @click="viewSuggestionDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="suggestionPage"
            v-model:page-size="suggestionPageSize"
            :total="suggestionTotal"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px"
            @size-change="loadSuggestions"
            @current-change="loadSuggestions"
          />
        </el-tab-pane>

        <!-- Tab2: 采购单管理 -->
        <el-tab-pane label="采购单管理" name="orders">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <el-select v-model="orderFilter.status" placeholder="状态" clearable style="width: 150px">
              <el-option label="草稿" value="draft" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="部分到货" value="partial_received" />
              <el-option label="已完成" value="received" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" @click="loadOrders">搜索</el-button>
            <el-button @click="resetOrderFilter">重置</el-button>
          </div>

          <!-- 采购单列表 -->
          <el-table :data="orders" v-loading="orderLoading" stripe style="margin-top: 16px">
            <el-table-column prop="order_no" label="采购单号" width="160" />
            <el-table-column prop="supplier_name" label="供应商" min-width="160" />
            <el-table-column prop="total_amount" label="总金额" width="110" align="right">
              <template #default="{ row }">
                ¥{{ (row.total_amount || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="expected_date" label="预计到货" width="110" />
            <el-table-column prop="received_date" label="实际到货" width="110" />
            <el-table-column prop="operator_name" label="操作员" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="orderStatusType(row.status)" size="small">{{ orderStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewOrderDetail(row)">详情</el-button>
                <el-button v-if="row.status === 'draft'" type="warning" link size="small" @click="changeOrderStatus(row, 'confirmed')">确认</el-button>
                <el-button v-if="row.status === 'confirmed' || row.status === 'partial_received'" type="success" link size="small" @click="openReceiveDialog(row)">入库</el-button>
                <el-button v-if="row.status === 'draft'" type="danger" link size="small" @click="changeOrderStatus(row, 'cancelled')">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="orderPage"
            v-model:page-size="orderPageSize"
            :total="orderTotal"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px"
            @size-change="loadOrders"
            @current-change="loadOrders"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 生成采购建议对话框 -->
    <el-dialog v-model="generateDialogVisible" title="生成采购建议" width="500px" :close-on-click-modal="false">
      <el-form :model="generateForm" label-width="100px">
        <el-form-item label="选择订单" required>
          <el-select v-model="generateForm.order_id" placeholder="请选择订单" filterable style="width: 100%">
            <el-option v-for="o in orderOptions" :key="o.id" :label="`${o.order_no} - ${o.customer_name}`" :value="o.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGenerate" :loading="submitting">生成</el-button>
      </template>
    </el-dialog>

    <!-- 确认采购建议对话框 -->
    <el-dialog v-model="confirmDialogVisible" title="确认采购建议" width="600px" :close-on-click-modal="false">
      <el-descriptions :column="2" border size="small" v-if="currentSuggestion">
        <el-descriptions-item label="物料编码">{{ currentSuggestion.material_code }}</el-descriptions-item>
        <el-descriptions-item label="物料名称">{{ currentSuggestion.material_name }}</el-descriptions-item>
        <el-descriptions-item label="缺口数量">{{ currentSuggestion.shortage_quantity }}</el-descriptions-item>
        <el-descriptions-item label="推荐供应商">{{ currentSuggestion.suggested_supplier_name }}</el-descriptions-item>
        <el-descriptions-item label="预估金额">¥{{ (currentSuggestion.estimated_price || 0).toFixed(2) }}</el-descriptions-item>
      </el-descriptions>
      <el-divider />
      <el-form :model="confirmForm" label-width="100px" style="margin-top: 16px">
        <el-form-item label="供应商" required>
          <el-select v-model="confirmForm.supplier_id" placeholder="请选择供应商" filterable style="width: 100%">
            <el-option v-for="s in supplierOptions" :key="s.id" :label="s.supplier_name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计到货日期">
          <el-date-picker v-model="confirmForm.expected_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmSuggestion" :loading="submitting">确认生成采购单</el-button>
      </template>
    </el-dialog>

    <!-- 新建采购单对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建采购单" width="700px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="供应商" required>
          <el-select v-model="createForm.supplier_id" placeholder="请选择供应商" filterable style="width: 100%">
            <el-option v-for="s in supplierOptions" :key="s.id" :label="s.supplier_name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计到货">
          <el-date-picker v-model="createForm.expected_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-divider content-position="left">采购明细</el-divider>
        <div v-for="(item, idx) in createForm.items" :key="idx" class="item-row">
          <el-select v-model="item.material_id" placeholder="物料" filterable style="width: 200px" @change="onMaterialChange(item)">
            <el-option v-for="m in materialOptions" :key="m.id" :label="`${m.material_name} (${m.material_code})`" :value="m.id" />
          </el-select>
          <el-input-number v-model="item.quantity" :min="0" :precision="2" style="width: 120px" />
          <el-input v-model="item.unit" placeholder="单位" style="width: 70px" />
          <el-input-number v-model="item.unit_price" :min="0" :precision="2" style="width: 120px" @change="calcItemTotal(item)" />
          <span style="width: 80px; text-align: right">¥{{ (item.total_price || 0).toFixed(2) }}</span>
          <el-button type="danger" link @click="removeCreateItem(idx)">删除</el-button>
        </div>
        <el-button type="dashed" style="width: 100%; margin-top: 8px" @click="addCreateItem">+ 添加物料</el-button>
        <div style="text-align: right; margin-top: 12px; font-weight: bold">
          总金额: ¥{{ (createForm.total_amount || 0).toFixed(2) }}
        </div>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateOrder" :loading="submitting">创建</el-button>
      </template>
    </el-dialog>

    <!-- 采购单详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="采购单详情" width="800px" :close-on-click-modal="false">
      <el-descriptions :column="3" border size="small" v-if="currentOrder">
        <el-descriptions-item label="采购单号">{{ currentOrder.order_no }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ currentOrder.supplier_name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="orderStatusType(currentOrder.status)" size="small">{{ orderStatusLabel(currentOrder.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ (currentOrder.total_amount || 0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="预计到货">{{ currentOrder.expected_date }}</el-descriptions-item>
        <el-descriptions-item label="实际到货">{{ currentOrder.received_date }}</el-descriptions-item>
        <el-descriptions-item label="操作员">{{ currentOrder.operator_name }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentOrder.remark }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>采购明细</el-divider>
      <el-table :data="currentOrderItems" stripe size="small">
        <el-table-column prop="material_code" label="物料编码" width="130" />
        <el-table-column prop="material_name" label="物料名称" min-width="140" />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="quantity" label="采购数量" width="100" align="right" />
        <el-table-column prop="unit_price" label="单价" width="90" align="right">
          <template #default="{ row }">
            ¥{{ (row.unit_price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_price" label="小计" width="100" align="right">
          <template #default="{ row }">
            ¥{{ (row.total_price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="received_quantity" label="已入库" width="90" align="right">
          <template #default="{ row }">
            {{ row.received_quantity || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="itemStatusType(row.status)" size="small">{{ itemStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 入库对话框 -->
    <el-dialog v-model="receiveDialogVisible" title="采购入库" width="600px" :close-on-click-modal="false">
      <el-alert v-if="currentOrder" type="info" :closable="false" style="margin-bottom: 16px">
        采购单: {{ currentOrder.order_no }} | 供应商: {{ currentOrder.supplier_name }}
      </el-alert>
      <el-table :data="receiveItems" stripe size="small">
        <el-table-column prop="material_name" label="物料名称" min-width="140" />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="quantity" label="采购数量" width="90" align="right" />
        <el-table-column prop="received_quantity" label="已入库" width="80" align="right" />
        <el-table-column label="本次入库" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.this_receive" :min="0" :max="(row.quantity - row.received_quantity)" :precision="2" size="small" style="width: 120px" />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="receiveDialogVisible = false">取消</el-button>
        <el-button type="success" @click="handleReceive" :loading="submitting">确认入库</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { purchase, orders as orderApi, supplier as supplierApi } from '../../api'

const activeTab = ref('suggestions')

// --- 采购建议相关 ---
const suggestions = ref([])
const loading = ref(false)
const filter = reactive({ order_id: '', status: '' })
const suggestionPage = ref(1)
const suggestionPageSize = ref(20)
const suggestionTotal = ref(0)
const generateDialogVisible = ref(false)
const confirmDialogVisible = ref(false)
const submitting = ref(false)
const currentSuggestion = ref(null)
const selectedSuggestions = ref([])

const generateForm = reactive({ order_id: '' })
const confirmForm = reactive({ supplier_id: '', expected_date: '' })

// --- 采购单相关 ---
const orders = ref([])
const orderLoading = ref(false)
const orderFilter = reactive({ status: '' })
const orderPage = ref(1)
const orderPageSize = ref(20)
const orderTotal = ref(0)
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const receiveDialogVisible = ref(false)
const currentOrder = ref(null)
const currentOrderItems = ref([])
const receiveItems = ref([])

const createForm = reactive({
  supplier_id: '',
  expected_date: '',
  remark: '',
  items: [],
  total_amount: 0
})

// --- 下拉选项 ---
const orderOptions = ref([])
const supplierOptions = ref([])
const materialOptions = ref([])

// --- 加载采购建议 ---
async function loadSuggestions() {
  loading.value = true
  try {
    const params = { page: suggestionPage.value, page_size: suggestionPageSize.value }
    if (filter.order_id) params.order_id = filter.order_id
    if (filter.status) params.status = filter.status
    const res = await purchase.suggestions(params)
    suggestions.value = res.data || []
    suggestionTotal.value = res.total || suggestions.value.length
  } catch (err) {
    ElMessage.error('加载采购建议失败')
  } finally {
    loading.value = false
  }
}

// --- 加载采购单 ---
async function loadOrders() {
  orderLoading.value = true
  try {
    const params = { page: orderPage.value, page_size: orderPageSize.value }
    if (orderFilter.status) params.status = orderFilter.status
    const res = await purchase.orders(params)
    orders.value = res.data || []
    orderTotal.value = res.total || orders.value.length
  } catch (err) {
    ElMessage.error('加载采购单失败')
  } finally {
    orderLoading.value = false
  }
}

// --- 加载选项数据 ---
async function loadOptions() {
  try {
    const [orderRes, supplierRes] = await Promise.all([
      orderApi.list({ page_size: 200 }),
      supplierApi.list({ page_size: 200 })
    ])
    orderOptions.value = orderRes.data || []
    supplierOptions.value = supplierRes.data || []
  } catch (err) {
    console.error('加载选项失败', err)
  }
  try {
    const warehouseRes = await import('../../api').then(m => m.default.warehouse?.list({ page_size: 500 }))
    if (warehouseRes?.data) {
      materialOptions.value = warehouseRes.data
    }
  } catch (err) {
    // ignore
  }
}

// --- 生成采购建议 ---
async function handleGenerate() {
  if (!generateForm.order_id) {
    ElMessage.warning('请选择订单')
    return
  }
  submitting.value = true
  try {
    const res = await purchase.generateSuggestions({ order_id: generateForm.order_id })
    if (res.success) {
      ElMessage.success(`生成成功，共 ${res.count} 条采购建议`)
      generateDialogVisible.value = false
      loadSuggestions()
    } else {
      ElMessage.info(res.message || '无需采购')
    }
  } catch (err) {
    ElMessage.error('生成采购建议失败')
  } finally {
    submitting.value = false
  }
}

// --- 确认采购建议 ---
async function handleConfirmSuggestion() {
  if (!confirmForm.supplier_id) {
    ElMessage.warning('请选择供应商')
    return
  }
  submitting.value = true
  try {
    const operator = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await purchase.confirmSuggestion(currentSuggestion.value.id, {
      supplier_id: confirmForm.supplier_id,
      expected_date: confirmForm.expected_date,
      operator_id: operator.id || '00000000-0000-0000-0000-000000000001',
      operator_name: operator.employee_name || operator.username || 'admin'
    })
    if (res.success) {
      ElMessage.success('采购单已生成')
      confirmDialogVisible.value = false
      loadSuggestions()
      loadOrders()
    }
  } catch (err) {
    ElMessage.error('确认失败')
  } finally {
    submitting.value = false
  }
}

// --- 创建采购单 ---
async function handleCreateOrder() {
  if (!createForm.supplier_id) {
    ElMessage.warning('请选择供应商')
    return
  }
  submitting.value = true
  try {
    const operator = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await purchase.create({
      supplier_id: createForm.supplier_id,
      expected_date: createForm.expected_date,
      operator_id: operator.id || '00000000-0000-0000-0000-000000000001',
      operator_name: operator.employee_name || operator.username || 'admin',
      remark: createForm.remark,
      items: createForm.items.map(it => ({
        ...it,
        total_price: (it.quantity || 0) * (it.unit_price || 0)
      }))
    })
    if (res.success) {
      ElMessage.success('采购单创建成功')
      createDialogVisible.value = false
      loadOrders()
    }
  } catch (err) {
    ElMessage.error('创建失败')
  } finally {
    submitting.value = false
  }
}

// --- 采购入库 ---
async function handleReceive() {
  const validItems = receiveItems.value.filter(it => it.this_receive > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请输入入库数量')
    return
  }
  submitting.value = true
  try {
    const res = await purchase.receive(currentOrder.value.id, {
      items: validItems.map(it => ({
        item_id: it.id,
        received_quantity: it.this_receive
      }))
    })
    if (res.success) {
      ElMessage.success('入库成功')
      receiveDialogVisible.value = false
      loadOrders()
      // 刷新详情
      if (detailDialogVisible.value) {
        await loadOrderDetail(currentOrder.value.id)
      }
    }
  } catch (err) {
    ElMessage.error('入库失败')
  } finally {
    submitting.value = false
  }
}

// --- 采购单状态变更 ---
async function changeOrderStatus(row, status) {
  try {
    await ElMessageBox.confirm(`确认将采购单 "${row.order_no}" 状态改为 "${orderStatusLabel(status)}"？`, '提示')
    const res = await purchase.updateStatus(row.id, { status })
    if (res.success) {
      ElMessage.success('状态已更新')
      loadOrders()
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('更新失败')
  }
}

// --- 查看采购建议详情 ---
function viewSuggestion(row) {
  currentSuggestion.value = row
  confirmForm.supplier_id = row.suggested_supplier_id || ''
  confirmForm.expected_date = ''
  confirmDialogVisible.value = true
}

function viewSuggestionDetail(row) {
  currentSuggestion.value = row
  confirmDialogVisible.value = true
}

// --- 查看采购单详情 ---
async function viewOrderDetail(row) {
  try {
    const res = await purchase.orderDetail(row.id)
    currentOrder.value = res.data
    currentOrderItems.value = res.data.items || []
    detailDialogVisible.value = true
  } catch (err) {
    ElMessage.error('加载详情失败')
  }
}

async function loadOrderDetail(id) {
  try {
    const res = await purchase.orderDetail(id)
    currentOrder.value = res.data
    currentOrderItems.value = res.data.items || []
  } catch (err) {
    // ignore
  }
}

// --- 入库对话框 ---
function openReceiveDialog(row) {
  currentOrder.value = row
  receiveItems.value = []
  purchase.orderDetail(row.id).then(res => {
    currentOrderItems.value = res.data.items || []
    receiveItems.value = (res.data.items || []).map(it => ({
      ...it,
      this_receive: 0
    }))
    receiveDialogVisible.value = true
  })
}

// --- 新建采购单 ---
function openCreateOrderDialog() {
  Object.assign(createForm, {
    supplier_id: '',
    expected_date: '',
    remark: '',
    items: [],
    total_amount: 0
  })
  createDialogVisible.value = true
}

// --- 生成对话框 ---
function openGenerateDialog() {
  generateForm.order_id = ''
  generateDialogVisible.value = true
}

// --- 工具函数 ---
function handleSelectionChange(val) {
  selectedSuggestions.value = val
}

function resetSuggestionFilter() {
  filter.order_id = ''
  filter.status = ''
  loadSuggestions()
}

function resetOrderFilter() {
  orderFilter.status = ''
  loadOrders()
}

function addCreateItem() {
  createForm.items.push({ material_id: '', material_name: '', material_code: '', unit: '', quantity: 1, unit_price: 0, total_price: 0 })
  calcCreateTotal()
}

function removeCreateItem(idx) {
  createForm.items.splice(idx, 1)
  calcCreateTotal()
}

function onMaterialChange(item) {
  const mat = materialOptions.value.find(m => m.id === item.material_id)
  if (mat) {
    item.material_name = mat.material_name
    item.material_code = mat.material_code
    item.unit = mat.unit
    item.unit_price = mat.unit_price || 0
    calcItemTotal(item)
  }
}

function calcItemTotal(item) {
  item.total_price = (item.quantity || 0) * (item.unit_price || 0)
  calcCreateTotal()
}

function calcCreateTotal() {
  createForm.total_amount = createForm.items.reduce((sum, it) => sum + (it.total_price || 0), 0)
}

function statusType(s) {
  return { pending: 'warning', confirmed: 'primary', fulfilled: 'success' }[s] || 'info'
}

function statusLabel(s) {
  return { pending: '待确认', confirmed: '已确认', fulfilled: '已满足' }[s] || s
}

function orderStatusType(s) {
  return { draft: 'info', confirmed: 'primary', partial_received: 'warning', received: 'success', cancelled: 'danger' }[s] || 'info'
}

function orderStatusLabel(s) {
  return { draft: '草稿', confirmed: '已确认', partial_received: '部分到货', received: '已完成', cancelled: '已取消' }[s] || s
}

function itemStatusType(s) {
  return { pending: 'warning', partial: 'primary', received: 'success' }[s] || 'info'
}

function itemStatusLabel(s) {
  return { pending: '待入库', partial: '部分', received: '已入库' }[s] || s
}

onMounted(() => {
  loadOptions()
  loadSuggestions()
  loadOrders()
})
</script>

<style scoped>
.purchase-page {
  min-height: 100%;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.item-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.low-stock {
  color: #f56c6c;
  font-weight: bold;
}
</style>
