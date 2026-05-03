<template>
  <div class="customer-page">
    <!-- 搜索栏 -->
    <el-card style="margin-bottom:12px">
      <el-form :inline="true">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="客户名/联系人/电话" clearable style="width:200px" />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="searchForm.source" placeholder="全部" clearable style="width:130px">
            <el-option label="自然进店" value="walk_in" />
            <el-option label="电话咨询" value="phone" />
            <el-option label="网络推广" value="online" />
            <el-option label="经销商介绍" value="dealer" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width:120px">
            <el-option label="活跃" value="active" />
            <el-option label="非活跃" value="inactive" />
            <el-option label="已成交" value="converted" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCustomers(1)">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="primary" @click="openFormDialog()">新建客户</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card>
      <el-table :data="customers" v-loading="loading" stripe>
        <el-table-column prop="customer_name" label="客户名称" min-width="140" fixed />
        <el-table-column prop="contact_person" label="联系人" width="120" />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="source" label="来源" width="100">
          <template #default="{row}">{{ sourceMap[row.source] || row.source }}</template>
        </el-table-column>
        <el-table-column prop="budget" label="预算" width="110" align="right">
          <template #default="{row}">¥{{ formatNum(row.budget) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{row}">
            <el-tag :type="statusTypeMap[row.status]" size="small">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_follow_date" label="最近跟进" width="110">
          <template #default="{row}">{{ row.last_follow_date || '-' }}</template>
        </el-table-column>
        <el-table-column prop="employee_name" label="业务员" width="100" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="openDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="openFormDialog(row)">编辑</el-button>
            <el-button type="success" link size="small" @click="openFollowDialog(row)">跟进</el-button>
            <el-button type="info" link size="small" @click="openFollowHistory(row)">历史</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :total="total"
        v-model:current-page="page"
        :page-size="pageSize"
        layout="total,prev,pager,next"
        style="margin-top:12px"
        @current-change="loadCustomers"
      />
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="form.id?'编辑客户':'新建客户'" width="580px">
      <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item label="客户名称" prop="customer_name">
          <el-input v-model="form.customer_name" placeholder="必填" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="form.contact_person" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="form.phone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="客户来源">
              <el-select v-model="form.source" style="width:100%">
                <el-option v-for="(v,k) in sourceMap" :key="k" :label="v" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预算金额">
              <el-input-number v-model="form.budget" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="需求描述">
          <el-input v-model="form.requirements" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible=false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 跟进记录弹窗 -->
    <el-dialog v-model="followVisible" title="客户跟进" width="500px">
      <el-form :model="followForm" label-width="100px">
        <el-form-item label="跟进方式">
          <el-select v-model="followForm.follow_type" style="width:100%">
            <el-option label="电话" value="phone" />
            <el-option label="上门" value="visit" />
            <el-option label="微信" value="wechat" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容">
          <el-input v-model="followForm.content" type="textarea" :rows="4" placeholder="描述本次跟进内容..." />
        </el-form-item>
        <el-form-item label="下次跟进">
          <el-date-picker v-model="followForm.next_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followVisible=false">取消</el-button>
        <el-button type="primary" @click="submitFollow" :loading="followSubmitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 跟进历史 -->
    <el-dialog v-model="followHistoryVisible" title="跟进历史" width="680px">
      <el-table :data="followHistory" v-loading="followHistoryLoading" stripe max-height="450">
        <el-table-column prop="created_at" label="跟进时间" width="160">
          <template #default="{row}">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="follow_type" label="方式" width="90">
          <template #default="{row}">{{ followTypeMap[row.follow_type] }}</template>
        </el-table-column>
        <el-table-column prop="follow_content" label="跟进内容" show-overflow-tooltip />
        <el-table-column prop="creator_name" label="操作人" width="100" />
        <el-table-column prop="next_plan" label="下次计划" width="110" show-overflow-tooltip />
        <el-table-column prop="next_follow_date" label="下次跟进" width="110" />
      </el-table>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="客户详情" size="460px">
      <el-descriptions :column="1" border v-if="detail">
        <el-descriptions-item label="客户名称">{{ detail.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.contact_person }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ detail.phone }}</el-descriptions-item>
        <el-descriptions-item label="地址">{{ detail.address }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ sourceMap[detail.source] }}</el-descriptions-item>
        <el-descriptions-item label="预算">¥{{ formatNum(detail.budget) }}</el-descriptions-item>
        <el-descriptions-item label="需求">{{ detail.requirements }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTypeMap[detail.status]">{{ statusMap[detail.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="业务员">{{ detail.employee_name }}</el-descriptions-item>
        <el-descriptions-item label="最近跟进">{{ detail.last_follow_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { customer } from '../../api'
import { ElMessage } from 'element-plus'

const statusMap = { active: '活跃', inactive: '非活跃', converted: '已成交' }
const statusTypeMap = { active: 'success', inactive: 'info', converted: 'warning' }
const sourceMap = { walk_in: '自然进店', phone: '电话咨询', online: '网络推广', dealer: '经销商介绍', other: '其他' }

const loading = ref(false)
const submitting = ref(false)
const customers = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const searchForm = reactive({ keyword: '', source: '', status: '' })

const formVisible = ref(false)
const formRef = ref(null)
const form = ref({})

const followVisible = ref(false)
const followSubmitting = ref(false)
const followForm = ref({ customer_id: '', follow_type: 'phone', content: '', next_date: '' })
const followHistoryVisible = ref(false)
const followHistoryLoading = ref(false)
const followHistory = ref([])
const followHistoryCustomerId = ref('')
const followTypeMap = { phone: '电话', visit: '上门', wechat: '微信', other: '其他' }

const detailVisible = ref(false)
const detail = ref({})

const formRules = {
  customer_name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误', trigger: 'blur' }]
}

const loadCustomers = async (p = 1) => {
  loading.value = true
  page.value = p
  try {
    const params = { page: p, page_size: pageSize, ...searchForm }
    const res = await customer.list(params)
    if (res.success) {
      customers.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const resetSearch = () => {
  Object.assign(searchForm, { keyword: '', source: '', status: '' })
  loadCustomers(1)
}

const openFormDialog = (row) => {
  form.value = row ? { ...row } : { status: 'active', source: 'other', budget: 0 }
  formVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const id = form.value.id
    const api = id ? customer.update(id, form.value) : customer.create(form.value)
    const res = await api
    if (res.success) {
      ElMessage.success('保存成功')
      formVisible.value = false
      loadCustomers(page.value)
    } else { ElMessage.error(res.message || '保存失败') }
  } catch (e) { ElMessage.error('保存失败') }
  submitting.value = false
}

const openDetail = (row) => { detail.value = row; detailVisible.value = true }

const openFollowDialog = (row) => {
  followForm.value = { customer_id: row.id, follow_type: 'phone', content: '', next_date: '' }
  followVisible.value = true
}

const openFollowHistory = async (row) => {
  followHistoryCustomerId.value = row.id
  followHistory.value = []
  followHistoryVisible.value = true
  followHistoryLoading.value = true
  try {
    const res = await customer.follows(row.id)
    if (res.success) followHistory.value = res.data || []
    else ElMessage.error(res.message || '加载失败')
  } catch (e) { ElMessage.error('加载跟进历史失败') }
  followHistoryLoading.value = false
}

const submitFollow = async () => {
  if (!followForm.value.content) return ElMessage.warning('请输入跟进内容')
  followSubmitting.value = true
  try {
    const res = await customer.createFollow(followForm.value)
    if (res.success) {
      ElMessage.success('跟进记录已保存')
      followVisible.value = false
      loadCustomers(page.value)
    } else { ElMessage.error(res.message || '保存失败') }
  } catch (e) { ElMessage.error('保存失败') }
  followSubmitting.value = false
}

const formatNum = (v) => v == null ? '0.00' : parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatTime = (t) => t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-'

onMounted(() => loadCustomers())
</script>
