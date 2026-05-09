<template>
  <div class="contract-container">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input v-model="queryParams.keyword" placeholder="搜索合同编号/标题/客户" style="width: 250px" clearable @change="handleSearch">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="queryParams.type" placeholder="合同类型" clearable @change="handleSearch">
          <el-option label="销售合同" value="sale" />
          <el-option label="采购合同" value="purchase" />
          <el-option label="外协合同" value="outsource" />
        </el-select>
        <el-select v-model="queryParams.status" placeholder="合同状态" clearable @change="handleSearch">
          <el-option label="草稿" value="draft" />
          <el-option label="已签署" value="signed" />
          <el-option label="履行中" value="ongoing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" @click="handleAdd">新建合同</el-button>
      </div>
    </div>

    <!-- 合同列表 -->
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="contract_no" label="合同编号" width="160" />
      <el-table-column prop="title" label="合同标题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="contract_type_text" label="类型" width="100" />
      <el-table-column prop="customer_name" label="客户" width="120" />
      <el-table-column prop="amount" label="金额" width="120" align="right">
        <template #default="{ row }">
          ¥{{ Number(row.amount).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column prop="status_text" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">{{ row.status_text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sign_date" label="签署日期" width="120">
        <template #default="{ row }">
          {{ row.sign_date || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="created_by_name" label="创建人" width="100" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleView(row)">查看</el-button>
          <el-button link type="primary" @click="handleEdit(row)" v-if="row.status === 'draft'">编辑</el-button>
          <el-button link type="success" @click="handleSign(row)" v-if="row.status === 'draft'">签署</el-button>
          <el-button link type="danger" @click="handleDelete(row)" v-if="row.status === 'draft'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSearch"
        @current-change="handleSearch"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" @closed="handleDialogClosed">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同类型" prop="contract_type">
              <el-select v-model="form.contract_type" placeholder="请选择" style="width: 100%" :disabled="dialogMode === 'edit'">
                <el-option label="销售合同" value="sale" />
                <el-option label="采购合同" value="purchase" />
                <el-option label="外协合同" value="outsource" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同标题" prop="title">
              <el-input v-model="form.title" placeholder="请输入合同标题" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户名称" prop="customer_name">
              <el-input v-model="form.customer_name" placeholder="请输入客户名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户电话" prop="customer_phone">
              <el-input v-model="form.customer_phone" placeholder="请输入客户电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="客户地址" prop="customer_address">
          <el-input v-model="form.customer_address" placeholder="请输入客户地址" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同金额" prop="amount">
              <el-input-number v-model="form.amount" :min="0" :precision="2" placeholder="请输入金额" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="签订日期" prop="sign_date">
              <el-date-picker v-model="form.sign_date" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="start_date">
              <el-date-picker v-model="form.start_date" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="end_date">
              <el-date-picker v-model="form.end_date" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="付款条款">
          <el-input v-model="form.payment_terms" placeholder="请输入付款条款" />
        </el-form-item>
        <el-form-item label="交货条款">
          <el-input v-model="form.delivery_terms" placeholder="请输入交货条款" />
        </el-form-item>
        <el-form-item label="保修条款">
          <el-input v-model="form.warranty_terms" placeholder="请输入保修条款" />
        </el-form-item>
        <el-form-item label="合同内容">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请输入合同内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="detailVisible" title="合同详情" width="900px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="合同编号">{{ detailData.contract_no }}</el-descriptions-item>
        <el-descriptions-item label="合同类型">{{ detailData.contract_type_text }}</el-descriptions-item>
        <el-descriptions-item label="合同标题" :span="2">{{ detailData.title }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ detailData.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="客户电话">{{ detailData.customer_phone }}</el-descriptions-item>
        <el-descriptions-item label="客户地址" :span="2">{{ detailData.customer_address }}</el-descriptions-item>
        <el-descriptions-item label="合同金额">¥{{ Number(detailData.amount || 0).toLocaleString() }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(detailData.status)">{{ detailData.status_text }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="签订日期">{{ detailData.sign_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ detailData.start_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结束日期">{{ detailData.end_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="付款条款" :span="2">{{ detailData.payment_terms || '-' }}</el-descriptions-item>
        <el-descriptions-item label="交货条款" :span="2">{{ detailData.delivery_terms || '-' }}</el-descriptions-item>
        <el-descriptions-item label="保修条款" :span="2">{{ detailData.warranty_terms || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ detailData.created_by_name }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(detailData.created_at) }}</el-descriptions-item>
      </el-descriptions>

      <el-divider>合同内容</el-divider>
      <pre class="content-pre">{{ detailData.content || '暂无内容' }}</pre>

      <el-divider v-if="detailData.terms?.length">合同条款</el-divider>
      <div v-if="detailData.terms?.length" class="terms-list">
        <div v-for="term in detailData.terms" :key="term.id" class="term-item">
          <h4>{{ term.term_title }}</h4>
          <p>{{ term.term_content }}</p>
        </div>
      </div>

      <el-divider v-if="detailData.history?.length">操作历史</el-divider>
      <el-timeline v-if="detailData.history?.length">
        <el-timeline-item v-for="item in detailData.history" :key="item.id">
          <p>{{ item.operator_name }} {{ getActionText(item.action) }}</p>
          <p class="timeline-time">{{ formatDate(item.created_at) }}</p>
          <p v-if="item.detail">{{ item.detail }}</p>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contract as contractApi } from '@/api'
import { Search } from '@element-plus/icons-vue'

const loading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const detailVisible = ref(false)
const dialogMode = ref('add') // add, edit
const dialogTitle = ref('新建合同')
const submitting = ref(false)
const formRef = ref(null)
const detailData = ref({})

const queryParams = reactive({
  keyword: '',
  type: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const form = reactive({
  contract_type: 'sale',
  title: '',
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  amount: 0,
  sign_date: '',
  start_date: '',
  end_date: '',
  payment_terms: '',
  delivery_terms: '',
  warranty_terms: '',
  content: ''
})

const formRules = {
  contract_type: [{ required: true, message: '请选择合同类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入合同标题', trigger: 'blur' }],
  customer_name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入合同金额', trigger: 'blur' }]
}

const getStatusTagType = (status) => {
  const map = {
    draft: 'info',
    signed: 'success',
    ongoing: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }
  return map[status] || ''
}

const getActionText = (action) => {
  const map = {
    create: '创建合同',
    update: '更新合同',
    sign: '签署合同',
    complete: '完成合同',
    cancel: '取消合同'
  }
  return map[action] || action
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await contractApi.list({ ...queryParams, page: pagination.page, pageSize: pagination.pageSize })
    if (res.code === 0) {
      tableData.value = res.data.list || []
      pagination.total = res.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取合同列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogMode.value = 'add'
  dialogTitle.value = '新建合同'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  try {
    const res = await contractApi.detail(row.id)
    if (res.code === 0) {
      const data = res.data
      Object.assign(form, {
        contract_type: data.contract_type,
        title: data.title,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        amount: Number(data.amount),
        sign_date: data.sign_date,
        start_date: data.start_date,
        end_date: data.end_date,
        payment_terms: data.payment_terms,
        delivery_terms: data.delivery_terms,
        warranty_terms: data.warranty_terms,
        content: data.content
      })
      dialogMode.value = 'edit'
      dialogTitle.value = '编辑合同'
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取合同详情失败:', error)
  }
}

const handleView = async (row) => {
  try {
    const res = await contractApi.detail(row.id)
    if (res.code === 0) {
      detailData.value = res.data
      detailVisible.value = true
    }
  } catch (error) {
    console.error('获取合同详情失败:', error)
  }
}

const handleSign = async (row) => {
  try {
    await ElMessageBox.confirm('确定要签署这份合同吗？签署后将无法编辑。', '提示', {
      type: 'warning'
    })
    const res = await contractApi.sign(row.id, { sign_date: new Date().toISOString().split('T')[0] })
    if (res.code === 0) {
      ElMessage.success('签署成功')
      fetchData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('签署失败:', error)
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这份合同吗？', '提示', {
      type: 'warning'
    })
    const res = await contractApi.delete(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const resetForm = () => {
  Object.assign(form, {
    contract_type: 'sale',
    title: '',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    amount: 0,
    sign_date: '',
    start_date: '',
    end_date: '',
    payment_terms: '',
    delivery_terms: '',
    warranty_terms: '',
    content: ''
  })
  formRef.value?.clearValidate()
}

const handleDialogClosed = () => {
  resetForm()
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true
    
    let res
    if (dialogMode.value === 'add') {
      res = await contractApi.create({
        ...form,
        created_by: 'current-user-id',
        created_by_name: '当前用户'
      })
    } else {
      res = await contractApi.update(detailData.value.id, {
        ...form,
        operator_id: 'current-user-id',
        operator_name: '当前用户'
      })
    }
    
    if (res.code === 0) {
      ElMessage.success(dialogMode.value === 'add' ? '创建成功' : '更新成功')
      dialogVisible.value = false
      fetchData()
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.contract-container {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.content-pre {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.terms-list {
  margin-top: 15px;
}

.term-item {
  padding: 10px;
  margin-bottom: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.term-item h4 {
  margin: 0 0 8px 0;
  color: #409eff;
}

.term-item p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.timeline-time {
  font-size: 12px;
  color: #999;
  margin: 4px 0;
}
</style>
