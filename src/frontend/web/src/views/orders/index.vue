<template>
  <div class="orders-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
          <el-button type="primary" @click="handleCreate">新建订单</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input v-model="search" placeholder="搜索订单号/客户名" style="width: 260px" clearable @keyup.enter="handleSearch" />
        <el-select v-model="filterStatus" placeholder="订单状态" clearable style="width: 140px">
          <el-option label="草稿" value="draft" />
          <el-option label="待生产" value="pending" />
          <el-option label="生产中" value="producing" />
          <el-option label="已发货" value="shipped" />
          <el-option label="已安装" value="installed" />
          <el-option label="已完成" value="completed" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <!-- 订单列表 -->
      <el-table :data="orderList" v-loading="loading" style="margin-top: 16px" stripe>
        <el-table-column prop="order_no" label="订单号" width="150" fixed />
        <el-table-column prop="customer_name" label="客户名" min-width="120" />
        <el-table-column prop="dealer_name" label="门店" min-width="120" show-overflow-tooltip />
        <el-table-column prop="sales_name" label="销售员" width="100" show-overflow-tooltip />
        <el-table-column prop="customer_phone" label="电话" width="130" />
        <el-table-column prop="order_status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.order_status)" size="small">{{ getStatusText(row.order_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.priority" :type="getPriorityType(row.priority)" size="small">{{ getPriorityText(row.priority) }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="installation_required" label="安装" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.installation_required" type="success" size="small">包安装</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expected_delivery" label="预计交付" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-button type="warning" link @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="loadOrders"
        @current-change="loadOrders"
      />
    </el-card>

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="detailVisible" title="订单详情" size="720px" direction="rtl" :before-close="handleDetailClose">
      <template v-if="currentOrder">
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="订单号">{{ currentOrder.order_no }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ currentOrder.customer_name }}</el-descriptions-item>
            <el-descriptions-item label="门店">{{ currentOrder.dealer_name }}</el-descriptions-item>
            <el-descriptions-item label="销售员">{{ currentOrder.sales_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ currentOrder.customer_phone }}</el-descriptions-item>
            <el-descriptions-item label="优先级">
              <el-tag v-if="currentOrder.priority" :type="getPriorityType(currentOrder.priority)" size="small">{{ getPriorityText(currentOrder.priority) }}</el-tag>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="预计交付">{{ currentOrder.expected_delivery }}</el-descriptions-item>
            <el-descriptions-item label="收货地址" :span="2">{{ currentOrder.delivery_address }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 生产状态进度 -->
        <div class="detail-section">
          <div class="section-title">生产状态</div>
          <div class="production-progress">
            <el-steps :active="getStepActive(currentOrder.order_status)" finish-status="success" align-center>
              <el-step title="订单创建" />
              <el-step title="设计确认" />
              <el-step title="生产中" />
              <el-step title="质检" />
              <el-step title="打包" />
              <el-step title="发货" />
            </el-steps>
          </div>
        </div>

        <!-- 追踪时间线 -->
        <div class="detail-section">
          <div class="section-title">追踪记录</div>
          <el-timeline v-if="trackingList.length">
            <el-timeline-item v-for="item in trackingList" :key="item.id" :type="getTimelineType(item.stage_status)" :timestamp="formatTime(item.created_at)" placement="top">
              <p><strong>{{ item.stage_name }}</strong> — <el-tag size="small" :type="item.stage_status === 'completed' ? 'success' : 'info'">{{ item.stage_status === 'completed' ? '已完成' : '进行中' }}</el-tag></p>
              <p v-if="item.remark" class="timeline-remark">{{ item.remark }}</p>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无追踪记录" />
        </div>

        <!-- 订单明细 -->
        <div class="detail-section">
          <div class="section-title">订单明细</div>
          <el-table :data="detailList" stripe size="small" max-height="300">
            <el-table-column prop="product_name" label="品名" min-width="120" show-overflow-tooltip />
            <el-table-column prop="specification" label="规格" min-width="140" show-overflow-tooltip />
            <el-table-column prop="quantity" label="数量" width="80" align="center" />
            <el-table-column prop="unit_price" label="单价" width="100" align="right">
              <template #default="{ row }">¥{{ row.unit_price }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100" align="right">
              <template #default="{ row }">¥{{ row.amount }}</template>
            </el-table-column>
          </el-table>
          <div class="detail-total">
            <span>合计：<strong>¥{{ currentOrder.total_amount }}</strong></span>
          </div>
        </div>
      </template>
      <template v-else>
        <el-empty description="加载中..." />
      </template>
      <template #footer>
        <div class="drawer-footer" v-if="currentOrder">
          <el-button v-if="currentOrder.order_status === 'draft'" type="danger" @click="handleDelete">删除订单</el-button>
          <div class="footer-right">
            <el-button @click="detailVisible = false">关闭</el-button>
            <el-button v-if="currentOrder.order_status === 'draft'" type="success" @click="handleToProduction">转生产</el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- 订单编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑订单" width="560px" :close-on-click-modal="false">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="客户名" prop="customer_name">
          <el-input v-model="editForm.customer_name" placeholder="请输入客户名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="customer_phone">
          <el-input v-model="editForm.customer_phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="收货地址" prop="delivery_address">
          <el-input v-model="editForm.delivery_address" type="textarea" :rows="2" placeholder="请输入收货地址" />
        </el-form-item>
        <el-form-item label="预计交付" prop="expected_delivery">
          <el-date-picker v-model="editForm.expected_delivery" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="editForm.priority" placeholder="选择优先级" style="width: 100%">
            <el-option label="普通" value="normal" />
            <el-option label="紧急" value="urgent" />
            <el-option label="加急" value="rush" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建订单弹窗 -->
    <el-dialog v-model="createVisible" title="新建订单" width="600px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="客户名" prop="customer_name">
          <el-select
            v-model="createForm.customer_id"
            placeholder="选择或搜索客户"
            filterable
            allow-create
            :default-first-option="true"
            style="width:100%"
            :loading="customerLoading"
            @visible-change="onCustomerDropdown"
          >
            <el-option
              v-for="c in customerList"
              :key="c.id"
              :label="c.customer_name + ' - ' + c.phone"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="联系电话" prop="customer_phone">
          <el-input v-model="createForm.customer_phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="createForm.city" placeholder="如：深圳" />
        </el-form-item>
        <el-form-item label="区县" prop="district">
          <el-input v-model="createForm.district" placeholder="如：南山区" />
        </el-form-item>
        <el-form-item label="收货地址" prop="address">
          <el-input v-model="createForm.address" type="textarea" :rows="2" placeholder="详细收货地址" />
        </el-form-item>
        <el-form-item label="期望交付">
          <el-date-picker v-model="createForm.expected_delivery" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="橱柜尺寸">
          <el-input v-model="createForm.cabinet_size" placeholder="如：W2400*D600*H2200" />
        </el-form-item>
        <el-form-item label="门板颜色">
          <el-input v-model="createForm.door_color" placeholder="如：哑白" />
        </el-form-item>
        <el-form-item label="门板材质">
          <el-input v-model="createForm.door_material" placeholder="如：实木多层" />
        </el-form-item>
        <el-form-item label="台面材质">
          <el-input v-model="createForm.countertop_material" placeholder="如：石英石" />
        </el-form-item>
        <el-form-item label="订单总价">
          <el-input-number v-model="createForm.total_price" :min="0" :step="1000" style="width: 100%" placeholder="0" />
        </el-form-item>
        <el-form-item label="已收定金">
          <el-input-number v-model="createForm.deposit_paid" :min="0" :step="1000" style="width: 100%" placeholder="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
        <el-form-item label="安装服务">
          <el-radio-group v-model="createForm.installation_required">
            <el-radio :label="true">包安装</el-radio>
            <el-radio :label="false">不包安装</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleSaveCreate">创建订单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { orders, production, customer } from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const orderList = ref([])
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const detailVisible = ref(false)
const currentOrder = ref(null)
const trackingList = ref([])
const detailList = ref([])

const editVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  customer_name: '',
  customer_phone: '',
  delivery_address: '',
  expected_delivery: '',
  remark: '',
  priority: ''
})
const editRules = {
  customer_name: [{ required: true, message: '请输入客户名', trigger: 'blur' }],
  customer_phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }]
}

const createVisible = ref(false)
const createLoading = ref(false)
const createFormRef = ref(null)
const createForm = reactive({
  customer_id: null,
  customer_name: '',
  customer_phone: '',
  city: '',
  district: '',
  address: '',
  expected_delivery: '',
  cabinet_size: '',
  door_color: '',
  door_material: '',
  countertop_material: '',
  total_price: 0,
  deposit_paid: 0,
  remark: ''
})
const createRules = {
  customer_name: [{ required: true, message: '请选择或输入客户名', trigger: 'blur' }]
}

const customerList = ref([])
const customerLoading = ref(false)

const onCustomerDropdown = (open) => {
  if (open && customerList.value.length === 0) loadCustomerList()
}

const loadCustomerList = async () => {
  customerLoading.value = true
  try {
    const res = await customer.list({ page_size: 999 })
    if (res.success) customerList.value = res.data.list || res.data || []
  } catch (e) { console.error(e) }
  customerLoading.value = false
}

const stageMap = {
  draft: 0,
  pending: 1,
  design_confirmed: 2,
  producing: 3,
  quality_check: 4,
  packed: 5,
  shipped: 6,
  installed: 7,
  completed: 8
}

const statusTextMap = {
  draft: '草稿',
  pending: '待生产',
  producing: '生产中',
  shipped: '已发货',
  installed: '已安装',
  completed: '已完成',
  cancelled: '已取消'
}

const priorityTextMap = { normal: '普通', urgent: '紧急', rush: '加急' }
const priorityTagMap = { normal: 'info', urgent: 'warning', rush: 'danger' }
const getPriorityText = (p) => priorityTextMap[p] || p
const getPriorityType = (p) => priorityTagMap[p] || 'info'

const statusTagMap = {
  draft: 'info',
  pending: 'warning',
  producing: 'primary',
  shipped: 'warning',
  installed: 'success',
  completed: 'success',
  cancelled: 'danger'
}

const getStatusType = (status) => statusTagMap[status] || 'info'
const getStatusText = (status) => statusTextMap[status] || status

const getStepActive = (status) => {
  // 6步: 订单创建=0, 设计确认=1, 生产中=2, 质检=3, 打包=4, 发货=5
  const stepMap = {
    draft: 0, pending: 1, design_confirmed: 1, producing: 2,
    quality_check: 3, quality: 3, packed: 4, packaging: 4,
    shipped: 5, installing: 5, installed: 5, completed: 5
  }
  return stepMap[status] ?? 0
}

const getTimelineType = (stageStatus) => stageStatus === 'completed' ? 'success' : 'primary'

const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await orders.list({
      page: page.value,
      page_size: pageSize.value,
      order_no: search.value,
      status: filterStatus.value
    })
    if (res.success) {
      orderList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    ElMessage.error('加载订单列表失败')
  }
  loading.value = false
}

const handleSearch = () => {
  page.value = 1
  loadOrders()
}

const handleReset = () => {
  search.value = ''
  filterStatus.value = ''
  page.value = 1
  loadOrders()
}

const handleCreate = () => {
  createFormRef.value?.resetFields()
  Object.assign(createForm, {
    customer_id: null, customer_name: '', customer_phone: '', city: '', district: '', address: '',
    expected_delivery: '', cabinet_size: '', door_color: '', door_material: '',
    countertop_material: '', total_price: 0, deposit_paid: 0, remark: '',
    installation_required: false
  })
  createVisible.value = true
}

const handleSaveCreate = async () => {
  if (!createFormRef.value) return
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    createLoading.value = true
    try {
      const payload = {
        customer_id: createForm.customer_id || undefined,
        customer_name: createForm.customer_id ? undefined : createForm.customer_name,
        customer_phone: createForm.customer_phone,
        city: createForm.city,
        district: createForm.district,
        address: createForm.address,
        expected_delivery: createForm.expected_delivery || null,
        cabinet_size: createForm.cabinet_size || null,
        door_color: createForm.door_color || null,
        door_material: createForm.door_material || null,
        countertop_material: createForm.countertop_material || null,
        total_price: createForm.total_price || 0,
        deposit_paid: createForm.deposit_paid || 0,
        remark: createForm.remark,
        installation_required: createForm.installation_required
      }
      const res = await orders.create(payload)
      if (res.success) {
        ElMessage.success('订单创建成功')
        createVisible.value = false
        loadOrders()
      } else {
        ElMessage.error(res.message || '创建失败')
      }
    } catch (e) {
      ElMessage.error('创建订单失败')
    }
    createLoading.value = false
  })
}

const handleView = async (row) => {
  currentOrder.value = null
  detailVisible.value = true
  try {
    const [orderRes, trackRes] = await Promise.all([
      orders.detail(row.id),
      orders.tracking(row.id)
    ])
    if (orderRes.success) {
      currentOrder.value = orderRes.data
      detailList.value = orderRes.data.details || []
    }
    if (trackRes.success) {
      trackingList.value = trackRes.data || []
    }
  } catch (e) {
    ElMessage.error('加载订单详情失败')
  }
}

const handleDetailClose = () => {
  detailVisible.value = false
  currentOrder.value = null
  trackingList.value = []
  detailList.value = []
}

const handleEdit = (row) => {
  editForm.customer_name = row.customer_name || ''
  editForm.customer_phone = row.customer_phone || ''
  editForm.delivery_address = row.delivery_address || ''
  editForm.expected_delivery = row.expected_delivery || ''
  editForm.remark = row.remark || ''
  editForm.priority = row.priority || ''
  currentOrder.value = { ...row }
  editVisible.value = true
}

const handleSaveEdit = async () => {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    editLoading.value = true
    try {
      const res = await orders.update(currentOrder.value.id, {
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        delivery_address: editForm.delivery_address,
        expected_delivery: editForm.expected_delivery,
        remark: editForm.remark
      })
      if (res.success) {
        ElMessage.success('订单更新成功')
        editVisible.value = false
        loadOrders()
      } else {
        ElMessage.error(res.message || '更新失败')
      }
    } catch (e) {
      ElMessage.error('更新订单失败')
    }
    editLoading.value = false
  })
}

const handleToProduction = async () => {
  if (!currentOrder.value) return
  try {
    const res = await orders.updateStage(currentOrder.value.id, {
      stage: 'producing',
      remark: '手动转生产'
    })
    if (res.success) {
      ElMessage.success('订单已转生产')
      detailVisible.value = false
      loadOrders()
    } else {
      ElMessage.error(res.message || '转生产失败')
    }
  } catch (e) {
    ElMessage.error('转生产失败')
  }
}

const handleDelete = async () => {
  if (!currentOrder.value) return
  try {
    await ElMessageBox.confirm('确定删除该订单吗？删除后不可恢复。', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await orders.delete(currentOrder.value.id)
    if (res.success) {
      ElMessage.success('订单已删除')
      detailVisible.value = false
      loadOrders()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(() => loadOrders())
</script>

<style scoped>
.orders-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.production-progress {
  padding: 16px 8px;
  background: #f5f7fa;
  border-radius: 8px;
}

.detail-total {
  text-align: right;
  margin-top: 12px;
  font-size: 15px;
  color: #606266;
}

.detail-total strong {
  color: #f56c6c;
  font-size: 16px;
}

.timeline-remark {
  color: #909399;
  font-size: 13px;
  margin-top: 4px;
}

:deep(.el-drawer__body) {
  padding: 20px 24px;
  overflow-y: auto;
}

:deep(.el-step__title) {
  font-size: 13px;
}
</style>
