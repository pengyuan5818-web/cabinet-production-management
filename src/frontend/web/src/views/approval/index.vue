<template>
  <div class="approval-container">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="activeTab" @change="handleTabChange">
          <el-radio-button label="all">全部审批</el-radio-button>
          <el-radio-button label="todo">待我审批</el-radio-button>
          <el-radio-button label="my">我的申请</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-right">
        <el-select v-model="queryParams.type" placeholder="审批类型" clearable @change="handleSearch">
          <el-option label="采购审批" value="purchase" />
          <el-option label="费用报销" value="expense" />
          <el-option label="付款审批" value="payment" />
          <el-option label="订单变更" value="order_change" />
        </el-select>
        <el-select v-model="queryParams.status" placeholder="审批状态" clearable @change="handleSearch">
          <el-option label="待审批" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
        <el-button type="primary" @click="handleAdd">提交申请</el-button>
      </div>
    </div>

    <!-- 审批列表 -->
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="type_text" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)">{{ row.type_text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="applicant_name" label="申请人" width="100" />
      <el-table-column prop="approver_name" label="审批人" width="100" />
      <el-table-column prop="status_text" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">{{ row.status_text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="申请时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleView(row)">查看</el-button>
          <el-button link type="primary" @click="handleApprove(row)" v-if="row.status === 'pending' && activeTab === 'todo'">审批</el-button>
          <el-button link type="danger" @click="handleDelete(row)" v-if="row.status === 'pending' && activeTab === 'my'">删除</el-button>
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

    <!-- 新增/查看对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" @closed="handleDialogClosed">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="审批类型" prop="type" v-if="dialogMode === 'add'">
          <el-select v-model="form.type" placeholder="请选择审批类型" style="width: 100%">
            <el-option label="采购审批" value="purchase" />
            <el-option label="费用报销" value="expense" />
            <el-option label="付款审批" value="payment" />
            <el-option label="订单变更" value="order_change" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" :disabled="dialogMode === 'view'" />
        </el-form-item>
        <el-form-item label="审批人" prop="approver_name">
          <el-input v-model="form.approver_name" placeholder="请输入审批人" :disabled="dialogMode === 'view'" />
        </el-form-item>
        <el-form-item label="审批方式" prop="sign_type" v-if="dialogMode === 'add'">
          <el-radio-group v-model="form.sign_type">
            <el-radio label="single">单签</el-radio>
            <el-radio label="all">会签</el-radio>
            <el-radio label="any">或签</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="申请内容" prop="content" v-if="dialogMode !== 'view'">
          <el-input v-model="form.contentText" type="textarea" :rows="4" placeholder="请输入申请内容（JSON格式）" />
        </el-form-item>
        <el-form-item label="申请内容" v-if="dialogMode === 'view'">
          <pre class="content-pre">{{ detailData.content ? JSON.stringify(detailData.content, null, 2) : '' }}</pre>
        </el-form-item>
        <el-form-item label="审批意见" prop="opinion" v-if="dialogMode === 'approve'">
          <el-input v-model="form.opinion" type="textarea" :rows="3" placeholder="请输入审批意见" />
        </el-form-item>
        <el-form-item label="状态" v-if="dialogMode === 'view'">
          <el-tag :type="getStatusTagType(detailData.status)">{{ detailData.status_text }}</el-tag>
        </el-form-item>
        <el-form-item label="申请时间" v-if="dialogMode === 'view'">
          {{ formatDate(detailData.created_at) }}
        </el-form-item>
        <el-form-item label="审批历史" v-if="dialogMode === 'view' && detailData.history?.length">
          <el-timeline>
            <el-timeline-item v-for="item in detailData.history" :key="item.id" :type="item.action === 'approve' ? 'success' : 'danger'">
              <p>{{ item.approver_name }} {{ item.action_text }}</p>
              <p class="timeline-time">{{ formatDate(item.created_at) }}</p>
              <p v-if="item.opinion">{{ item.opinion }}</p>
            </el-timeline-item>
          </el-timeline>
        </el-form-item>
      </el-form>
      <template #footer v-if="dialogMode !== 'view'">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approval as approvalApi } from '@/api'

const activeTab = ref('all')
const loading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const dialogMode = ref('add') // add, view, approve
const dialogTitle = ref('提交申请')
const submitting = ref(false)
const formRef = ref(null)
const detailData = ref({})

const queryParams = reactive({
  type: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const form = reactive({
  type: '',
  title: '',
  approver_name: '',
  sign_type: 'single',
  contentText: '',
  opinion: ''
})

const formRules = {
  type: [{ required: true, message: '请选择审批类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  approver_name: [{ required: true, message: '请输入审批人', trigger: 'blur' }]
}

const getTypeTagType = (type) => {
  const map = {
    purchase: 'success',
    expense: 'warning',
    payment: 'danger',
    order_change: 'info'
  }
  return map[type] || ''
}

const getStatusTagType = (status) => {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status] || ''
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const handleTabChange = () => {
  pagination.page = 1
  fetchData()
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    let res
    if (activeTab.value === 'todo') {
      res = await approvalApi.todo({ page: pagination.page, pageSize: pagination.pageSize })
    } else if (activeTab.value === 'my') {
      res = await approvalApi.my({ page: pagination.page, pageSize: pagination.pageSize })
    } else {
      res = await approvalApi.list({ ...queryParams, page: pagination.page, pageSize: pagination.pageSize })
    }
    
    if (res.code === 0) {
      tableData.value = res.data.list || []
      pagination.total = res.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取审批列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogMode.value = 'add'
  dialogTitle.value = '提交申请'
  resetForm()
  dialogVisible.value = true
}

const handleView = async (row) => {
  try {
    const res = await approvalApi.detail(row.id)
    if (res.code === 0) {
      detailData.value = res.data
      dialogMode.value = 'view'
      dialogTitle.value = '审批详情'
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取审批详情失败:', error)
  }
}

const handleApprove = (row) => {
  detailData.value = { ...row }
  dialogMode.value = 'approve'
  dialogTitle.value = '审批'
  resetForm()
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条申请吗？', '提示', {
      type: 'warning'
    })
    const res = await approvalApi.delete(row.id)
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
    type: '',
    title: '',
    approver_name: '',
    sign_type: 'single',
    contentText: '',
    opinion: ''
  })
  formRef.value?.clearValidate()
}

const handleDialogClosed = () => {
  resetForm()
}

const handleSubmit = async () => {
  if (dialogMode.value === 'add') {
    try {
      await formRef.value.validate()
      submitting.value = true
      let content = null
      if (form.contentText) {
        try {
          content = JSON.parse(form.contentText)
        } catch {
          content = { text: form.contentText }
        }
      }
      const res = await approvalApi.create({
        type: form.type,
        title: form.title,
        content,
        approver_name: form.approver_name,
        sign_type: form.sign_type,
        applicant_id: 'current-user-id',
        applicant_name: '当前用户'
      })
      if (res.code === 0) {
        ElMessage.success('提交成功')
        dialogVisible.value = false
        fetchData()
      }
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      submitting.value = false
    }
  } else if (dialogMode.value === 'approve') {
    try {
      const res = await approvalApi.approve(detailData.value.id, {
        approver_id: 'current-user-id',
        approver_name: '当前用户',
        opinion: form.opinion
      })
      if (res.code === 0) {
        ElMessage.success('审批通过')
        dialogVisible.value = false
        fetchData()
      }
    } catch (error) {
      console.error('审批失败:', error)
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.approval-container {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.content-pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.timeline-time {
  font-size: 12px;
  color: #999;
  margin: 4px 0;
}
</style>
