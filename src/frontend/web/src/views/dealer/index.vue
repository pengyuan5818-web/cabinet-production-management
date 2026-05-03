<template>
  <div class="dealer-page">
    <!-- 搜索栏 -->
    <el-card style="margin-bottom:12px">
      <el-form :inline="true">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="名称/联系人/电话" clearable style="width:180px" />
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="searchForm.level" placeholder="全部" clearable style="width:120px">
            <el-option label="A级" value="A" />
            <el-option label="B级" value="B" />
            <el-option label="C级" value="C" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width:120px">
            <el-option label="合作中" value="active" />
            <el-option label="已停止" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadDealers(1)">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="primary" @click="openFormDialog(null)">新增经销商</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card>
      <el-table :data="dealers" v-loading="loading" stripe>
        <el-table-column prop="dealer_name" label="经销商名称" min-width="160" />
        <el-table-column prop="contact_person" label="联系人" width="120" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="level" label="等级" width="80" align="center">
          <template #default="{row}">
            <el-tag :type="levelTypeMap[row.level] || 'info'" size="small">{{ row.level || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="region" label="地区" width="120" />
        <el-table-column prop="credit_limit" label="信用额度" width="120" align="right">
          <template #default="{row}">¥{{ formatNum(row.credit_limit) }}</template>
        </el-table-column>
        <el-table-column prop="payment_days" label="账期(天)" width="90" align="center" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{row}">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '合作中' : '已停止' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="openDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="openFormDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        :total="total"
        v-model:current-page="page"
        :page-size="pageSize"
        layout="total,prev,pager,next"
        style="margin-top:12px"
        @current-change="loadDealers"
      />
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="form.id ? '编辑经销商' : '新增经销商'" width="580px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="经销商名称" prop="dealer_name">
          <el-input v-model="form.dealer_name" placeholder="必填" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact_person">
              <el-input v-model="form.contact_person" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="手机号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="等级" prop="level">
              <el-select v-model="form.level" style="width:100%">
                <el-option label="A级" value="A" />
                <el-option label="B级" value="B" />
                <el-option label="C级" value="C" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地区">
              <el-input v-model="form.region" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="信用额度">
              <el-input-number v-model="form.credit_limit" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账期(天)">
              <el-input-number v-model="form.payment_days" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="合作中" value="active" />
            <el-option label="已停止" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="经销商详情" size="560px">
      <el-tabs v-model="detailTab">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="1" border v-if="detail">
            <el-descriptions-item label="经销商名称">{{ detail.dealer_name }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contact_person }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ detail.phone }}</el-descriptions-item>
            <el-descriptions-item label="等级">{{ detail.level }}</el-descriptions-item>
            <el-descriptions-item label="地区">{{ detail.region }}</el-descriptions-item>
            <el-descriptions-item label="地址">{{ detail.address }}</el-descriptions-item>
            <el-descriptions-item label="信用额度">¥{{ formatNum(detail.credit_limit) }}</el-descriptions-item>
            <el-descriptions-item label="账期">{{ detail.payment_days }}天</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="detail.status === 'active' ? 'success' : 'info'" size="small">
                {{ detail.status === 'active' ? '合作中' : '已停止' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="备注">{{ detail.remark }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 门店管理 -->
        <el-tab-pane label="门店" name="stores">
          <div style="margin-bottom:12px;text-align:right">
            <el-button type="primary" size="small" @click="openStoreDialog(null)">新增门店</el-button>
          </div>
          <el-table :data="stores" v-loading="storesLoading" stripe size="small">
            <el-table-column prop="store_name" label="门店名称" min-width="140" />
            <el-table-column prop="address" label="地址" min-width="160" show-overflow-tooltip />
            <el-table-column prop="contact_person" label="联系人" width="100" />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{row}">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '营业中' : '已关闭' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{row}">
                <el-button type="warning" link size="small" @click="openStoreDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteStore(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="storesTotal > storesPageSize"
            :total="storesTotal"
            v-model:current-page="storesPage"
            :page-size="storesPageSize"
            layout="prev,pager,next"
            style="margin-top:8px"
            @current-change="loadStores"
          />
        </el-tab-pane>

        <!-- 价格体系 -->
        <el-tab-pane label="价格体系" name="prices">
          <div style="margin-bottom:12px;text-align:right">
            <el-button type="primary" size="small" @click="openPriceDialog(null)">新增价格级别</el-button>
          </div>
          <el-table :data="priceLevels" v-loading="pricesLoading" stripe size="small">
            <el-table-column prop="price_type" label="价格类型" min-width="120" />
            <el-table-column prop="discount_rate" label="折扣率" width="100">
              <template #default="{row}">
                {{ row.discount_rate != null ? (row.discount_rate * 100).toFixed(0) + '%' : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
            <el-table-column label="操作" width="120">
              <template #default="{row}">
                <el-button type="warning" link size="small" @click="openPriceDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeletePrice(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <!-- 门店弹窗 -->
    <el-dialog v-model="storeDialogVisible" :title="storeForm.id ? '编辑门店' : '新增门店'" width="500px">
      <el-form :model="storeForm" :rules="storeFormRules" ref="storeFormRef" label-width="90px">
        <el-form-item label="门店名称" prop="store_name">
          <el-input v-model="storeForm.store_name" placeholder="必填" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="storeForm.address" placeholder="详细地址" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact_person">
              <el-input v-model="storeForm.contact_person" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="storeForm.phone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-select v-model="storeForm.status" style="width:100%">
            <el-option label="营业中" value="active" />
            <el-option label="已关闭" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="storeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStore" :loading="storeSubmitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 价格级别弹窗 -->
    <el-dialog v-model="priceDialogVisible" :title="priceForm.id ? '编辑价格级别' : '新增价格级别'" width="420px">
      <el-form :model="priceForm" :rules="priceFormRules" ref="priceFormRef" label-width="90px">
        <el-form-item label="价格类型" prop="price_type">
          <el-input v-model="priceForm.price_type" placeholder="如：标准价/代理价/工程价" />
        </el-form-item>
        <el-form-item label="折扣率" prop="discount_rate">
          <el-input-number v-model="priceForm.discount_rate" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="priceForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="priceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPrice" :loading="priceSubmitting">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { dealer } from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const levelTypeMap = { A: 'success', B: 'warning', C: 'info' }

const loading = ref(false)
const submitting = ref(false)
const dealers = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const searchForm = reactive({ keyword: '', level: '', status: '' })

const formVisible = ref(false)
const formRef = ref(null)
const form = ref({})
const detailVisible = ref(false)
const detail = ref({})

const formRules = {
  dealer_name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误', trigger: 'blur' }]
}

// --- 详情抽屉Tab ---
const detailTab = ref('info')

// --- 门店管理 ---
const stores = ref([])
const storesTotal = ref(0)
const storesPage = ref(1)
const storesPageSize = 20
const storesLoading = ref(false)
const storeDialogVisible = ref(false)
const storeFormRef = ref(null)
const storeForm = ref({})
const storeSubmitting = ref(false)
const storeFormRules = {
  store_name: [{ required: true, message: '请输入门店名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误', trigger: 'blur' }]
}

const loadStores = async () => {
  if (!detail.value?.id) return
  storesLoading.value = true
  try {
    const res = await dealer.stores(detail.value.id, { page: storesPage.value, page_size: storesPageSize })
    if (res.success) { stores.value = res.data?.list || []; storesTotal.value = res.data?.total || 0 }
  } catch (e) { ElMessage.error('加载门店失败') }
  storesLoading.value = false
}

const openStoreDialog = (row) => {
  storeForm.value = row ? { ...row } : { status: 'active' }
  storeDialogVisible.value = true
}

const submitStore = async () => {
  const valid = await storeFormRef.value?.validate().catch(() => false)
  if (!valid) return
  storeSubmitting.value = true
  try {
    const did = detail.value.id
    const sid = storeForm.value.id
    const api = sid ? dealer.updateStore(did, sid, storeForm.value) : dealer.createStore(did, storeForm.value)
    const res = await api
    if (res.success) { ElMessage.success('保存成功'); storeDialogVisible.value = false; loadStores() }
    else ElMessage.error(res.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  storeSubmitting.value = false
}

const handleDeleteStore = (row) => {
  ElMessageBox.confirm('确定删除门店「' + row.store_name + '」？', '删除确认', { type: 'warning' })
    .then(async () => {
      const res = await dealer.deleteStore(detail.value.id, row.id)
      if (res.success) { ElMessage.success('已删除'); loadStores() }
      else ElMessage.error(res.message || '删除失败')
    }).catch(() => {})
}

// --- 价格体系 ---
const priceLevels = ref([])
const pricesLoading = ref(false)
const priceDialogVisible = ref(false)
const priceFormRef = ref(null)
const priceForm = ref({})
const priceSubmitting = ref(false)
const priceFormRules = {
  price_type: [{ required: true, message: '请输入价格类型', trigger: 'blur' }],
  discount_rate: [{ required: true, message: '请输入折扣率', trigger: 'blur' }]
}

const loadPrices = async () => {
  if (!detail.value?.id) return
  pricesLoading.value = true
  try {
    const res = await dealer.priceLevels(detail.value.id)
    if (res.success) priceLevels.value = res.data?.list || []
  } catch (e) { ElMessage.error('加载价格体系失败') }
  pricesLoading.value = false
}

const openPriceDialog = (row) => {
  priceForm.value = row ? { ...row } : { discount_rate: 1 }
  priceDialogVisible.value = true
}

const submitPrice = async () => {
  const valid = await priceFormRef.value?.validate().catch(() => false)
  if (!valid) return
  priceSubmitting.value = true
  try {
    const did = detail.value.id
    const pid = priceForm.value.id
    const api = pid ? dealer.updatePriceLevel(did, pid, priceForm.value) : dealer.createPriceLevel(did, priceForm.value)
    const res = await api
    if (res.success) { ElMessage.success('保存成功'); priceDialogVisible.value = false; loadPrices() }
    else ElMessage.error(res.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  priceSubmitting.value = false
}

const handleDeletePrice = (row) => {
  ElMessageBox.confirm('确定删除价格类型「' + row.price_type + '」？', '删除确认', { type: 'warning' })
    .then(async () => {
      const res = await dealer.deletePriceLevel(detail.value.id, row.id)
      if (res.success) { ElMessage.success('已删除'); loadPrices() }
      else ElMessage.error(res.message || '删除失败')
    }).catch(() => {})
}

const loadDealers = async (p = 1) => {
  loading.value = true
  page.value = p
  try {
    const params = { page: p, page_size: pageSize, ...searchForm }
    const res = await dealer.list(params)
    if (res.success) {
      dealers.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const resetSearch = () => {
  Object.assign(searchForm, { keyword: '', level: '', status: '' })
  loadDealers(1)
}

const openFormDialog = (row) => {
  form.value = row ? { ...row } : { level: 'B', status: 'active', credit_limit: 0, payment_days: 30 }
  formVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const id = form.value.id
    const api = id ? dealer.update(id, form.value) : dealer.create(form.value)
    const res = await api
    if (res.success) {
      ElMessage.success('保存成功')
      formVisible.value = false
      loadDealers(page.value)
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) { ElMessage.error('保存失败') }
  submitting.value = false
}

const openDetail = (row) => {
  detail.value = row
  detailTab.value = 'info'
  detailVisible.value = true
}

watch(detailTab, (tab) => {
  if (!detailVisible.value || !detail.value?.id) return
  if (tab === 'stores') loadStores()
  else if (tab === 'prices') loadPrices()
})

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除经销商「' + row.dealer_name + '」？', '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    const res = await dealer.delete(row.id)
    if (res.success) { ElMessage.success('已删除'); loadDealers(page.value) }
    else ElMessage.error(res.message || '删除失败')
  }).catch(() => {})
}

const formatNum = (v) => v == null ? '0.00' : parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

onMounted(() => loadDealers())
</script>
