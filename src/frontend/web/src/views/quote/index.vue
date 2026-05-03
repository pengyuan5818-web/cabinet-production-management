<template>
  <div class="quote-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报价管理</span>
          <el-button type="primary" @click="openCreateDialog">新建报价</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 报价列表 -->
        <el-tab-pane label="报价单列表" name="list">
          <div class="filter-bar">
            <el-input v-model="filter.keyword" placeholder="报价单号/客户名" clearable style="width: 200px" />
            <el-select v-model="filter.status" placeholder="状态" clearable style="width: 130px">
              <el-option label="草稿" value="draft" />
              <el-option label="已发送" value="sent" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已成交" value="won" />
              <el-option label="已失效" value="lost" />
            </el-select>
            <el-date-picker v-model="filter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
            <el-button type="primary" @click="loadQuotes">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </div>

          <el-table :data="quotes" v-loading="loading" stripe style="margin-top: 16px">
            <el-table-column prop="quote_no" label="报价单号" width="170" />
            <el-table-column prop="customer_name" label="客户" min-width="150" />
            <el-table-column prop="contact" label="联系人" width="100" />
            <el-table-column prop="contact_phone" label="联系电话" width="120" />
            <el-table-column prop="total_amount" label="报价金额" width="120" align="right">
              <template #default="{ row }">
                <span style="color: #e6a23c; font-weight: bold">￥{{ (row.total_amount || 0).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="discount_amount" label="折扣" width="80" align="right">
              <template #default="{ row }">
                <span v-if="row.discount_amount > 0" style="color: #67c23a">-￥{{ row.discount_amount }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="final_amount" label="最终金额" width="120" align="right">
              <template #default="{ row }">
                <span style="color: #f56c6c; font-weight: bold">￥{{ (row.final_amount || 0).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="valid_until" label="有效期至" width="110" />
            <el-table-column prop="sales_name" label="销售员" width="90" />
            <el-table-column prop="created_at" label="创建时间" width="110" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewQuote(row)">查看</el-button>
                <el-button link type="success" size="small" @click="editQuote(row)">编辑</el-button>
                <el-button link type="warning" size="small" @click="duplicateQuote(row)">复制</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="page"
            :page-size="20"
            :total="total"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="loadQuotes"
          />
        </el-tab-pane>

        <!-- 产品配置 -->
        <el-tab-pane label="产品配置报价" name="config">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            选择产品类型和配置项，自动计算报价
          </el-alert>
          <el-form :model="configForm" label-width="120px" style="max-width: 800px">
            <el-form-item label="产品类型">
              <el-select v-model="configForm.product_type" placeholder="选择产品类型" style="width: 100%">
                <el-option label="不锈钢橱柜" value="cabinet" />
                <el-option label="衣柜" value="wardrobe" />
                <el-option label="浴室柜" value="bathroom" />
                <el-option label="阳台柜" value="balcony" />
                <el-option label="其他定制" value="custom" />
              </el-select>
            </el-form-item>
            <el-form-item label="门板材质">
              <el-select v-model="configForm.door_material" placeholder="选择门板材质" style="width: 100%">
                <el-option label="不锈钢烤漆" value="ss_painted" />
                <el-option label="不锈钢覆膜" value="ss_membrane" />
                <el-option label="石英石" value="quartz" />
                <el-option label="大理石" value="marble" />
              </el-select>
            </el-form-item>
            <el-form-item label="台面材质">
              <el-select v-model="configForm.counter_material" placeholder="选择台面材质" style="width: 100%">
                <el-option label="石英石台面" value="quartz_counter" />
                <el-option label="不锈钢台面" value="ss_counter" />
                <el-option label="岩板台面" value="sintered" />
              </el-select>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="长度(m)">
                  <el-input-number v-model="configForm.length" :min="0" :precision="2" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="宽度(m)">
                  <el-input-number v-model="configForm.width" :min="0" :precision="2" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="高度(m)">
                  <el-input-number v-model="configForm.height" :min="0" :precision="2" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="功能配件">
              <el-checkbox-group v-model="configForm.accessories">
                <el-checkbox value="sink">台下盆</el-checkbox>
                <el-checkbox value="faucet">龙头</el-checkbox>
                <el-checkbox value="lights">灯带</el-checkbox>
                <el-checkbox value="hood">油烟机</el-checkbox>
                <el-checkbox value="disposal">垃圾处理器</el-checkbox>
                <el-checkbox value="dispenser">消毒柜</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="calculatePrice">计算报价</el-button>
              <el-button @click="resetConfig">重置</el-button>
            </el-form-item>
          </el-form>

          <el-divider v-if="calculatedPrice" />
          <div v-if="calculatedPrice" class="price-result">
            <el-descriptions title="报价计算结果" :column="2" border>
              <el-descriptions-item label="产品类型">{{ configForm.product_type }}</el-descriptions-item>
              <el-descriptions-item label="投影面积">{{ (configForm.length * configForm.height).toFixed(2) }} m2</el-descriptions-item>
              <el-descriptions-item label="基础报价">￥{{ calculatedPrice.base.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="材质加价">￥{{ calculatedPrice.material.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="配件加价">￥{{ calculatedPrice.accessory.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="合计">￥{{ calculatedPrice.total.toFixed(2) }}</el-descriptions-item>
            </el-descriptions>
            <div style="margin-top: 16px">
              <el-button type="success" @click="saveAsQuote">保存为报价单</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 报价单详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="报价单详情" width="900px" :close-on-click-modal="false">
      <el-descriptions :column="3" border size="small" v-if="currentQuote">
        <el-descriptions-item label="报价单号">{{ currentQuote.quote_no }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ currentQuote.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ currentQuote.contact }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentQuote.contact_phone }}</el-descriptions-item>
        <el-descriptions-item label="报价金额">￥{{ (currentQuote.total_amount || 0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="折扣">￥{{ (currentQuote.discount_amount || 0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="最终金额">
          <span style="color: #f56c6c; font-weight: bold">￥{{ (currentQuote.final_amount || 0).toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="有效期至">{{ currentQuote.valid_until }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(currentQuote.status)" size="small">{{ statusLabel(currentQuote.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="销售员">{{ currentQuote.sales_name }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentQuote.created_at }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ currentQuote.remark || '无' }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>报价明细</el-divider>
      <el-table :data="currentQuoteItems" stripe size="small">
        <el-table-column prop="item_name" label="项目/产品" min-width="160" />
        <el-table-column prop="specification" label="规格" min-width="120" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="quantity" label="数量" width="80" align="right" />
        <el-table-column prop="unit_price" label="单价" width="100" align="right">
          <template #default="{ row }">
            ￥{{ (row.unit_price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="110" align="right">
          <template #default="{ row }">
            ￥{{ (row.amount || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="100" />
      </el-table>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="info" @click="loseQuote" v-if="currentQuote && currentQuote.status !== 'lost'">标记失效</el-button>
        <el-button type="success" @click="winQuote" v-if="currentQuote && ['sent','confirmed'].includes(currentQuote.status)">标记成交</el-button>
        <el-button type="warning" @click="confirmQuote" v-if="currentQuote && currentQuote.status === 'sent'">确认报价</el-button>
        <el-button type="primary" @click="sendQuote" v-if="currentQuote && currentQuote.status === 'draft'">发送报价单</el-button>
      </template>
    </el-dialog>

    <!-- 新建/编辑报价对话框 -->
    <el-dialog v-model="editDialogVisible" :title="editMode ? '编辑报价' : '新建报价'" width="900px" :close-on-click-modal="false">
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户名称" prop="customer_name">
              <el-input v-model="editForm.customer_name" placeholder="请输入客户名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="editForm.contact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contact_phone">
              <el-input v-model="editForm.contact_phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期至">
              <el-date-picker v-model="editForm.valid_until" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="选择日期" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="销售员">
              <el-input v-model="editForm.sales_name" placeholder="请输入销售员姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="折扣金额">
              <el-input-number v-model="editForm.discount_amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
        <el-divider>报价明细</el-divider>
        <div v-for="(item, idx) in editItems" :key="idx" class="quote-item-row">
          <el-row :gutter="8">
            <el-col :span="5">
              <el-input v-model="item.item_name" placeholder="项目名称" />
            </el-col>
            <el-col :span="4">
              <el-input v-model="item.specification" placeholder="规格" />
            </el-col>
            <el-col :span="3">
              <el-input v-model="item.unit" placeholder="单位" />
            </el-col>
            <el-col :span="3">
              <el-input-number v-model="item.quantity" :min="1" style="width: 100%" />
            </el-col>
            <el-col :span="4">
              <el-input-number v-model="item.unit_price" :min="0" :precision="2" style="width: 100%" />
            </el-col>
            <el-col :span="3">
              <span style="line-height: 32px">￥{{ (item.quantity * item.unit_price).toFixed(2) }}</span>
            </el-col>
            <el-col :span="2">
              <el-button type="danger" link @click="removeEditItem(idx)" :disabled="editItems.length <= 1">删除</el-button>
            </el-col>
          </el-row>
        </div>
        <el-button type="primary" link @click="addEditItem" style="margin-top: 8px">+ 添加明细</el-button>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitQuote">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { quote as quoteApi } from '../../api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const activeTab = ref('list')
const quotes = ref([])
const page = ref(1)
const total = ref(0)

const filter = reactive({
  keyword: '',
  status: '',
  dateRange: null
})

const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const editMode = ref(false)
const submitting = ref(false)
const currentQuote = ref(null)
const currentQuoteItems = ref([])
const editFormRef = ref(null)

const editForm = reactive({
  customer_name: '',
  contact: '',
  contact_phone: '',
  valid_until: '',
  sales_name: '',
  remark: '',
  discount_amount: 0
})

const editRules = {
  customer_name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  contact_phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }]
}

const editItems = ref([
  { item_name: '', specification: '', unit: '项', quantity: 1, unit_price: 0 }
])

// 配置报价表单
const configForm = reactive({
  product_type: 'cabinet',
  door_material: '',
  counter_material: '',
  length: 3,
  width: 0.6,
  height: 2,
  accessories: []
})

const calculatedPrice = ref(null)

const statusMap = {
  draft: { label: '草稿', type: 'info' },
  sent: { label: '已发送', type: 'primary' },
  confirmed: { label: '已确认', type: 'success' },
  won: { label: '已成交', type: 'success' },
  lost: { label: '已失效', type: 'danger' }
}

const statusLabel = (status) => statusMap[status]?.label || status
const statusType = (status) => statusMap[status]?.type || 'info'

const loadQuotes = async () => {
  loading.value = true
  try {
    const params = {
      page,
      page_size: 20,
      keyword: filter.keyword,
      status: filter.status
    }
    if (filter.dateRange && filter.dateRange.length === 2) {
      params.start_date = filter.dateRange[0]
      params.end_date = filter.dateRange[1]
    }
    const res = await quoteApi.list(params)
    if (res.success) {
      quotes.value = res.data.list || res.data || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    ElMessage.error('加载报价列表失败')
  }
  loading.value = false
}

const resetFilter = () => {
  filter.keyword = ''
  filter.status = ''
  filter.dateRange = null
  page.value = 1
  loadQuotes()
}

const viewQuote = async (row) => {
  try {
    const res = await quoteApi.detail(row.id)
    if (res.success) {
      currentQuote.value = res.data
      currentQuoteItems.value = res.data.items || []
      detailDialogVisible.value = true
    }
  } catch (e) {
    ElMessage.error('加载报价详情失败')
  }
}

const editQuote = (row) => {
  editMode.value = true
  Object.assign(editForm, {
    customer_name: row.customer_name || '',
    contact: row.contact || '',
    contact_phone: row.contact_phone || '',
    valid_until: row.valid_until || '',
    sales_name: row.sales_name || '',
    remark: row.remark || '',
    discount_amount: row.discount_amount || 0
  })
  editItems.value = row.items && row.items.length > 0
    ? row.items.map(i => ({ ...i }))
    : [{ item_name: '', specification: '', unit: '项', quantity: 1, unit_price: 0 }]
  currentQuote.value = row
  editDialogVisible.value = true
}

const openCreateDialog = () => {
  editMode.value = false
  Object.assign(editForm, {
    customer_name: '',
    contact: '',
    contact_phone: '',
    valid_until: '',
    sales_name: '',
    remark: '',
    discount_amount: 0
  })
  editItems.value = [{ item_name: '', specification: '', unit: '项', quantity: 1, unit_price: 0 }]
  editDialogVisible.value = true
}

const addEditItem = () => {
  editItems.value.push({ item_name: '', specification: '', unit: '项', quantity: 1, unit_price: 0 })
}

const removeEditItem = (idx) => {
  editItems.value.splice(idx, 1)
}

const submitQuote = async () => {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const data = { ...editForm, items: editItems.value }
    if (editMode.value) {
      await quoteApi.update(currentQuote.value.id, data)
    } else {
      await quoteApi.create(data)
    }
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    loadQuotes()
  } catch (e) {
    ElMessage.error('保存失败')
  }
  finally {
    submitting.value = false
  }
}

const sendQuote = async () => {
  if (!currentQuote.value) return
  try {
    await quoteApi.send(currentQuote.value.id)
    ElMessage.success('报价单已发送')
    detailDialogVisible.value = false
    loadQuotes()
  } catch (e) {
    ElMessage.error('发送失败')
  }
}

const confirmQuote = async () => {
  if (!currentQuote.value) return
  try {
    await quoteApi.confirm(currentQuote.value.id)
    ElMessage.success('报价已确认')
    detailDialogVisible.value = false
    loadQuotes()
  } catch (e) {
    ElMessage.error('确认失败')
  }
}

const winQuote = async () => {
  if (!currentQuote.value) return
  try {
    await quoteApi.win(currentQuote.value.id)
    ElMessage.success('报价已成交')
    detailDialogVisible.value = false
    loadQuotes()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const loseQuote = async () => {
  if (!currentQuote.value) return
  try {
    await quoteApi.lose(currentQuote.value.id)
    ElMessage.success('报价已标记为失效')
    detailDialogVisible.value = false
    loadQuotes()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const calculatePrice = () => {
  const area = (configForm.length || 0) * (configForm.height || 0)
  const basePriceMap = { cabinet: 2800, wardrobe: 2200, bathroom: 2500, balcony: 2000, custom: 3000 }
  const doorMaterialMap = { ss_painted: 400, ss_membrane: 300, quartz: 500, marble: 600 }
  const counterMaterialMap = { quartz_counter: 350, ss_counter: 200, sintered: 800 }
  const accessoryMap = { sink: 800, faucet: 400, lights: 300, hood: 2000, disposal: 1200, dispenser: 1500 }

  const base = area * (basePriceMap[configForm.product_type] || 2800)
  const doorMaterial = area * (doorMaterialMap[configForm.door_material] || 0)
  const counterMaterial = area * (counterMaterialMap[configForm.counter_material] || 0)
  const accessory = configForm.accessories.reduce((sum, a) => sum + (accessoryMap[a] || 0), 0)

  calculatedPrice.value = {
    base,
    material: doorMaterial + counterMaterial,
    accessory,
    total: base + doorMaterial + counterMaterial + accessory
  }
}

const saveAsQuote = () => {
  if (!calculatedPrice.value) return
  openCreateDialog()
}

const resetConfig = () => {
  Object.assign(configForm, {
    product_type: 'cabinet',
    door_material: '',
    counter_material: '',
    length: 3,
    width: 0.6,
    height: 2,
    accessories: []
  })
  calculatedPrice.value = null
}

const duplicateQuote = (row) => {
  editMode.value = false
  Object.assign(editForm, {
    customer_name: row.customer_name || '',
    contact: row.contact || '',
    contact_phone: row.contact_phone || '',
    valid_until: '',
    sales_name: row.sales_name || '',
    remark: row.remark || '',
    discount_amount: row.discount_amount || 0
  })
  editItems.value = row.items && row.items.length > 0
    ? row.items.map(i => ({ ...i }))
    : [{ item_name: '', specification: '', unit: '项', quantity: 1, unit_price: 0 }]
  currentQuote.value = null
  editDialogVisible.value = true
}

onMounted(() => loadQuotes())
</script>

<style scoped>
.quote-page {
  padding: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.price-result {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}
.quote-item-row {
  margin-bottom: 8px;
}
</style>
