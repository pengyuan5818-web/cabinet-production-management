<template>
  <div class="supplier-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>供应商管理</span>
          <el-button type="primary" @click="openForm(null)">新建供应商</el-button>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input v-model="filter.search" placeholder="搜索供应商名称/联系人" clearable style="width: 220px" @clear="loadSuppliers" />
        <el-select v-model="filter.status" placeholder="状态" clearable style="width: 120px" @change="loadSuppliers">
          <el-option label="合作中" value="active" />
          <el-option label="已停止" value="inactive" />
        </el-select>
        <el-select v-model="filter.rating" placeholder="评级" clearable style="width: 120px" @change="loadSuppliers">
          <el-option v-for="n in 5" :key="n" :label="`${n}星`" :value="n" />
        </el-select>
        <el-button type="primary" @click="page.current = 1; loadSuppliers()">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <!-- 列表 -->
      <el-table :data="suppliers" v-loading="loading" style="margin-top: 16px" stripe>
        <el-table-column prop="supplier_name" label="供应商名称" min-width="160" />
        <el-table-column prop="contact_person" label="联系人" min-width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="category" label="供应类别" width="120" />
        <el-table-column prop="rating" label="评级" width="120">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled show-text text-color="#ff9900">
              <template #text="{ value }">{{ value }}星</template>
            </el-rate>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '合作中' : '已停止' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">详情</el-button>
            <el-button type="warning" link @click="openForm(row)">编辑</el-button>
            <el-button type="info" link @click="openEvaluations(row)">评估</el-button>
            <el-button type="success" link @click="openAccount(row)">对账</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page.current"
        v-model:page-size="page.size"
        :total="page.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="loadSuppliers"
        @current-change="loadSuppliers"
      />
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新建供应商' : '编辑供应商'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="供应商名称" prop="supplier_name">
          <el-input v-model="form.supplier_name" placeholder="请输入供应商名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact_person">
          <el-input v-model="form.contact_person" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="供应类别" prop="category">
          <el-select v-model="form.category" placeholder="请选择供应类别" style="width: 100%">
            <el-option label="板材" value="板材" />
            <el-option label="五金" value="五金" />
            <el-option label="门板" value="门板" />
            <el-option label="台面" value="台面" />
            <el-option label="包装材料" value="包装材料" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="评级" prop="rating">
          <el-rate v-model="form.rating" show-text>
            <template #text="{ value }">{{ value }}星</template>
          </el-rate>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">合作中</el-radio>
            <el-radio value="inactive">已停止</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 供应商详情抽屉 -->
    <el-drawer v-model="detailVisible" title="供应商详情" size="480px" direction="rtl" destroy-on-close>
      <el-descriptions :column="1" border v-if="currentRow">
        <el-descriptions-item label="供应商名称">{{ currentRow.supplier_name }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ currentRow.contact_person }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentRow.phone }}</el-descriptions-item>
        <el-descriptions-item label="地址">{{ currentRow.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="供应类别">{{ currentRow.category }}</el-descriptions-item>
        <el-descriptions-item label="评级">
          <el-rate v-model="currentRow.rating" disabled show-text>
            <template #text="{ value }">{{ value }}星</template>
          </el-rate>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentRow.status === 'active' ? 'success' : 'info'" size="small">
            {{ currentRow.status === 'active' ? '合作中' : '已停止' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ currentRow.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>

    <!-- 评估记录抽屉 -->
    <el-drawer v-model="evalVisible" title="供应商评估记录" size="560px" direction="rtl" destroy-on-close>
      <div v-if="currentRow" style="margin-bottom: 16px">
        <b>{{ currentRow.supplier_name }}</b> — 当前评级：
        <el-rate v-model="currentRow.rating" disabled style="display: inline-block; vertical-align: middle" />
      </div>
      <el-table :data="evalList" v-loading="evalLoading" stripe size="small">
        <el-table-column prop="eval_date" label="评估日期" width="120" />
        <el-table-column prop="quality_score" label="质量评分" width="90" />
        <el-table-column prop="delivery_score" label="交货评分" width="90" />
        <el-table-column prop="price_score" label="价格评分" width="90" />
        <el-table-column prop="overall_score" label="综合评分" width="90">
          <template #default="{ row }">
            <span :style="{ color: row.overall_score >= 4 ? '#67c23a' : row.overall_score >= 3 ? '#e6a23c' : '#f56c6c' }">
              {{ row.overall_score }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="evaluator" label="评估人" width="90" />
        <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="!evalLoading && evalList.length === 0" description="暂无评估记录" />
    </el-drawer>

    <!-- 对账与付款抽屉 -->
    <el-drawer v-model="accountVisible" :title="`对账与付款 — ${currentRow?.supplier_name || ''}`" size="640px" direction="rtl" destroy-on-close>
      <el-tabs v-if="currentRow" v-model="accountTab">
        <!-- 对账记录 -->
        <el-tab-pane label="对账记录" name="reconciliation">
          <div style="margin-bottom: 12px; display: flex; justify-content: flex-end">
            <el-button type="primary" size="small" @click="openReconcile">发起对账</el-button>
          </div>
          <el-table :data="reconList" v-loading="reconLoading" stripe size="small">
            <el-table-column prop="bill_no" label="账单号" width="150" />
            <el-table-column prop="payable_amount" label="应付金额" width="100">
              <template #default="{ row }">{{ row.payable_amount != null ? `¥${row.payable_amount.toFixed(2)}` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="paid_amount" label="已付金额" width="100">
              <template #default="{ row }">{{ row.paid_amount != null ? `¥${row.paid_amount.toFixed(2)}` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="balance" label="余额" width="100">
              <template #default="{ row }">{{ row.balance != null ? `¥${row.balance.toFixed(2)}` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'settled' ? 'success' : row.status === 'partial' ? 'warning' : 'info'" size="small">
                  {{ row.status === 'settled' ? '已结清' : row.status === 'partial' ? '部分付款' : '待付款' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
          </el-table>
          <el-empty v-if="!reconLoading && reconList.length === 0" description="暂无对账记录" />
        </el-tab-pane>

        <!-- 付款记录 -->
        <el-tab-pane label="付款记录" name="payment">
          <div style="margin-bottom: 12px; display: flex; justify-content: flex-end">
            <el-button type="primary" size="small" @click="openPayment">发起付款</el-button>
          </div>
          <el-table :data="paymentList" v-loading="paymentLoading" stripe size="small">
            <el-table-column prop="payment_date" label="付款日期" width="120" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">{{ row.amount != null ? `¥${row.amount.toFixed(2)}` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="payment_method" label="付款方式" width="100">
              <template #default="{ row }">
                {{ { bank: '银行转账', cash: '现金', wx: '微信', ali: '支付宝' }[row.payment_method] || row.payment_method || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="payer" label="付款人" width="90" />
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          </el-table>
          <el-empty v-if="!paymentLoading && paymentList.length === 0" description="暂无付款记录" />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <!-- 对账弹窗 -->
    <el-dialog v-model="reconcileVisible" title="发起对账" width="420px" destroy-on-close>
      <el-form ref="reconcileRef" :model="reconcileForm" :rules="reconcileRules" label-width="100px">
        <el-form-item label="应付金额" prop="payable_amount">
          <el-input-number v-model="reconcileForm.payable_amount" :min="0" :precision="2" style="width: 100%" placeholder="请输入应付金额" />
        </el-form-item>
        <el-form-item label="已付金额" prop="paid_amount">
          <el-input-number v-model="reconcileForm.paid_amount" :min="0" :precision="2" style="width: 100%" placeholder="请输入已付金额" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="reconcileForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reconcileVisible = false">取消</el-button>
        <el-button type="primary" :loading="reconcileSubmitting" @click="submitReconcile">确认</el-button>
      </template>
    </el-dialog>

    <!-- 付款弹窗 -->
    <el-dialog v-model="paymentDialogVisible" title="发起付款" width="420px" destroy-on-close>
      <el-form ref="paymentFormRef" :model="paymentForm" :rules="paymentFormRules" label-width="100px">
        <el-form-item label="付款金额" prop="amount">
          <el-input-number v-model="paymentForm.amount" :min="0" :precision="2" style="width: 100%" placeholder="请输入付款金额" />
        </el-form-item>
        <el-form-item label="付款方式" prop="payment_method">
          <el-select v-model="paymentForm.payment_method" placeholder="请选择付款方式" style="width: 100%">
            <el-option label="银行转账" value="bank" />
            <el-option label="现金" value="cash" />
            <el-option label="微信" value="wx" />
            <el-option label="支付宝" value="ali" />
          </el-select>
        </el-form-item>
        <el-form-item label="付款人" prop="payer">
          <el-input v-model="paymentForm.payer" placeholder="请输入付款人" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="paymentForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="paymentSubmitting" @click="submitPayment">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supplier } from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const suppliers = ref([])
const filter = reactive({ search: '', status: '', rating: '' })
const page = reactive({ current: 1, size: 10, total: 0 })

// 新建/编辑
const formVisible = ref(false)
const formMode = ref('create')
const formRef = ref(null)
const form = ref({ supplier_name: '', contact_person: '', phone: '', address: '', category: '', rating: 5, status: 'active', remark: '' })
const formRules = {
  supplier_name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  contact_person: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  category: [{ required: true, message: '请选择供应类别', trigger: 'change' }]
}

// 详情
const detailVisible = ref(false)
const currentRow = ref(null)

// 评估
const evalVisible = ref(false)
const evalLoading = ref(false)
const evalList = ref([])

// 对账与付款
const accountVisible = ref(false)
const accountTab = ref('reconciliation')
const reconList = ref([])
const reconLoading = ref(false)
const paymentList = ref([])
const paymentLoading = ref(false)

// 对账弹窗
const reconcileVisible = ref(false)
const reconcileSubmitting = ref(false)
const reconcileRef = ref(null)
const reconcileForm = ref({ payable_amount: 0, paid_amount: 0, remark: '' })
const reconcileRules = {
  payable_amount: [{ required: true, message: '请输入应付金额', trigger: 'blur' }]
}

// 付款弹窗
const paymentDialogVisible = ref(false)
const paymentSubmitting = ref(false)
const paymentFormRef = ref(null)
const paymentForm = ref({ amount: 0, payment_method: '', payer: '', remark: '' })
const paymentFormRules = {
  amount: [{ required: true, message: '请输入付款金额', trigger: 'blur' }],
  payment_method: [{ required: true, message: '请选择付款方式', trigger: 'change' }],
  payer: [{ required: true, message: '请输入付款人', trigger: 'blur' }]
}

const loadSuppliers = async () => {
  loading.value = true
  try {
    const params = { page: page.current, page_size: page.size }
    if (filter.search) params.search = filter.search
    if (filter.status) params.status = filter.status
    if (filter.rating) params.rating = filter.rating
    const res = await supplier.list(params)
    if (res.success) {
      suppliers.value = res.data.list || []
      page.total = res.data.total || 0
    }
  } catch {
    ElMessage.error('加载供应商列表失败')
  }
  loading.value = false
}

const resetFilters = () => {
  filter.search = ''
  filter.status = ''
  filter.rating = ''
  page.current = 1
  loadSuppliers()
}

const openForm = (row) => {
  if (row) {
    formMode.value = 'update'
    form.value = { ...row }
  } else {
    formMode.value = 'create'
    form.value = { supplier_name: '', contact_person: '', phone: '', address: '', category: '', rating: 5, status: 'active', remark: '' }
  }
  formVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      let res
      if (formMode.value === 'create') {
        res = await supplier.create(form.value)
      } else {
        res = await supplier.update(form.value.id, form.value)
      }
      if (res.success) {
        ElMessage.success(formMode.value === 'create' ? '创建成功' : '更新成功')
        formVisible.value = false
        loadSuppliers()
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } catch {
      ElMessage.error('操作失败')
    }
    submitting.value = false
  })
}

const openDetail = (row) => {
  currentRow.value = { ...row }
  detailVisible.value = true
}

const openEvaluations = async (row) => {
  currentRow.value = { ...row }
  evalVisible.value = true
  evalList.value = []
  evalLoading.value = true
  try {
    const res = await supplier.evaluations(row.id)
    if (res.success) {
      evalList.value = res.data || []
    }
  } catch {
    ElMessage.error('加载评估记录失败')
  }
  evalLoading.value = false
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除供应商「${row.supplier_name}」？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await supplier.delete(row.id)
      if (res.success) {
        ElMessage.success('删除成功')
        loadSuppliers()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 对账与付款
const openAccount = async (row) => {
  currentRow.value = { ...row }
  accountTab.value = 'reconciliation'
  accountVisible.value = true
  reconList.value = []
  paymentList.value = []
  await Promise.all([loadReconciliations(row.id), loadPayments(row.id)])
}

const loadReconciliations = async (id) => {
  reconLoading.value = true
  try {
    const res = await supplier.reconciliations(id)
    if (res.success) reconList.value = res.data || []
  } catch { ElMessage.error('加载对账记录失败') }
  reconLoading.value = false
}

const loadPayments = async (id) => {
  paymentLoading.value = true
  try {
    const res = await supplier.payments(id)
    if (res.success) paymentList.value = res.data || []
  } catch { ElMessage.error('加载付款记录失败') }
  paymentLoading.value = false
}

const openReconcile = () => {
  reconcileForm.value = { payable_amount: 0, paid_amount: 0, remark: '' }
  reconcileVisible.value = true
}

const submitReconcile = async () => {
  if (!reconcileRef.value) return
  await reconcileRef.value.validate(async (valid) => {
    if (!valid) return
    reconcileSubmitting.value = true
    try {
      const res = await supplier.createReconciliation(currentRow.value.id, {
        payable_amount: reconcileForm.value.payable_amount,
        paid_amount: reconcileForm.value.paid_amount,
        remark: reconcileForm.value.remark
      })
      if (res.success) {
        ElMessage.success('对账发起成功')
        reconcileVisible.value = false
        await loadReconciliations(currentRow.value.id)
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } catch { ElMessage.error('操作失败') }
    reconcileSubmitting.value = false
  })
}

const openPayment = () => {
  paymentForm.value = { amount: 0, payment_method: '', payer: '', remark: '' }
  paymentDialogVisible.value = true
}

const submitPayment = async () => {
  if (!paymentFormRef.value) return
  await paymentFormRef.value.validate(async (valid) => {
    if (!valid) return
    paymentSubmitting.value = true
    try {
      const res = await supplier.createPayment(currentRow.value.id, {
        amount: paymentForm.value.amount,
        payment_method: paymentForm.value.payment_method,
        payer: paymentForm.value.payer,
        remark: paymentForm.value.remark
      })
      if (res.success) {
        ElMessage.success('付款记录创建成功')
        paymentDialogVisible.value = false
        await Promise.all([loadReconciliations(currentRow.value.id), loadPayments(currentRow.value.id)])
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } catch { ElMessage.error('操作失败') }
    paymentSubmitting.value = false
  })
}

onMounted(() => loadSuppliers())
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
