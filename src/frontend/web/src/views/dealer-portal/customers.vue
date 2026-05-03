<template>
  <div class="customers-page">
    <div class="page-header">
      <h2 class="page-title">我的客户</h2>
      <el-button type="primary" @click="showAddDialog = true">+ 添加客户</el-button>
    </div>

    <div class="search-bar">
      <el-input v-model="searchForm.name" placeholder="客户名称" style="width: 180px" clearable />
      <el-input v-model="searchForm.phone" placeholder="联系电话" style="width: 150px" clearable />
      <el-select v-model="searchForm.source" placeholder="客户来源" style="width: 130px" clearable>
        <el-option label="自然来客" value="natural" />
        <el-option label="渠道推荐" value="referral" />
        <el-option label="线上推广" value="online" />
        <el-option label="其他" value="other" />
      </el-select>
      <el-button @click="loadCustomers(1)">搜索</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="customers" v-loading="loading" stripe>
      <el-table-column prop="customer_name" label="客户名称" min-width="120" />
      <el-table-column prop="contact_person" label="联系人" width="100" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
      <el-table-column prop="source" label="来源" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ sourceMap[row.source] || row.source }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="添加时间" width="120" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="editCustomer(row)">编辑</el-button>
          <el-button type="primary" link size="small" @click="viewOrders(row)">订单记录</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadCustomers"
      />
    </div>

    <!-- 添加/编辑客户 -->
    <el-dialog v-model="showAddDialog" :title="editMode ? '编辑客户' : '添加客户'" width="550px">
      <el-form :model="customerForm" label-width="90px">
        <el-form-item label="客户名称" required>
          <el-input v-model="customerForm.customer_name" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="customerForm.contact_person" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="customerForm.phone" />
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="customerForm.province" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="customerForm.city" />
        </el-form-item>
        <el-form-item label="区县">
          <el-input v-model="customerForm.district" />
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="customerForm.address" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="客户来源">
          <el-select v-model="customerForm.source" style="width: 100%">
            <el-option label="自然来客" value="natural" />
            <el-option label="渠道推荐" value="referral" />
            <el-option label="线上推广" value="online" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="customerForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveCustomer">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const sourceMap = { natural: '自然来客', referral: '渠道推荐', online: '线上推广', other: '其他' }
function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }
function getHeaders() { return { Authorization: `Bearer ${localStorage.getItem('dealer_token')}` } }

const customers = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showAddDialog = ref(false)
const editMode = ref(false)
const submitting = ref(false)
const searchForm = reactive({ name: '', phone: '', source: '' })
const customerForm = reactive({
  id: null, customer_name: '', contact_person: '', phone: '',
  province: '', city: '', district: '', address: '', source: 'natural', remark: ''
})

async function loadCustomers(p = 1) {
  page.value = p
  loading.value = true
  try {
    const params = { page: p, page_size: pageSize.value }
    if (searchForm.name) params.customer_name = searchForm.name
    if (searchForm.phone) params.phone = searchForm.phone
    if (searchForm.source) params.source = searchForm.source
    const res = await axios.get('/dealer/v1/customers', { params, headers: getHeaders() })
    if (res.data.success) {
      customers.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    }
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

function resetSearch() {
  Object.assign(searchForm, { name: '', phone: '', source: '' })
  loadCustomers(1)
}

function editCustomer(row) {
  editMode.value = true
  Object.assign(customerForm, row)
  showAddDialog.value = true
}

function viewOrders(row) {
  // 跳转到订单页面并筛选该客户
}

async function saveCustomer() {
  if (!customerForm.customer_name) return ElMessage.warning('请填写客户名称')
  submitting.value = true
  try {
    const method = editMode.value ? 'put' : 'post'
    const url = editMode.value ? `/dealer/v1/customers/${customerForm.id}` : '/dealer/v1/customers'
    const res = await axios[method](url, customerForm, { headers: getHeaders() })
    if (res.data.success) {
      ElMessage.success('保存成功')
      showAddDialog.value = false
      loadCustomers()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err) { ElMessage.error(err.response?.data?.message || '保存失败') }
  finally { submitting.value = false }
}

onMounted(() => loadCustomers())
</script>

<style scoped>
.customers-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 22px; color: #333; }
.search-bar { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
