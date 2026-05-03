<template>
  <div class="quality-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>质检管理</span>
          <div>
            <el-button type="primary" @click="openIqcDialog">来料质检</el-button>
            <el-button type="success" @click="openOqcDialog">出货质检</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- IQC 来料质检 -->
        <el-tab-pane label="来料质检 (IQC)" name="iqc">
          <div class="filter-bar">
            <el-select v-model="filter.iqcStatus" placeholder="状态" clearable style="width: 130px">
              <el-option label="待检" value="pending" />
              <el-option label="合格" value="pass" />
              <el-option label="不合格" value="fail" />
              <el-option label="让步接受" value="accepted" />
            </el-select>
            <el-select v-model="filter.iqcSupplier" placeholder="供应商" clearable filterable style="width: 180px">
              <el-option v-for="s in supplierOptions" :key="s.id" :label="s.supplier_name" :value="s.id" />
            </el-select>
            <el-date-picker v-model="filter.iqcDate" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
            <el-button type="primary" @click="loadIqc">搜索</el-button>
            <el-button @click="resetIqcFilter">重置</el-button>
          </div>
          <el-table :data="iqcList" v-loading="loading" stripe style="margin-top: 16px">
            <el-table-column prop="inspect_no" label="质检单号" width="160" />
            <el-table-column prop="inspect_type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag size="small" type="info">来料</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="supplier_name" label="供应商" min-width="140" />
            <el-table-column prop="material_name" label="物料名称" min-width="160" />
            <el-table-column prop="material_code" label="物料编码" width="130" />
            <el-table-column prop="quantity" label="送检数量" width="90" align="right" />
            <el-table-column prop="sample_size" label="抽样数" width="70" align="right" />
            <el-table-column prop="defect_count" label="缺陷数" width="70" align="right">
              <template #default="{ row }">
                <span v-if="row.defect_count > 0" style="color: #f56c6c">{{ row.defect_count }}</span>
                <span v-else>0</span>
              </template>
            </el-table-column>
            <el-table-column prop="result" label="结果" width="90">
              <template #default="{ row }">
                <el-tag :type="iqcResultType(row.result)" size="small">{{ iqcResultLabel(row.result) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="inspector" label="质检员" width="90" />
            <el-table-column prop="inspect_date" label="质检日期" width="110" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewIqc(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="iqcPage"
            :page-size="20"
            :total="iqcTotal"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="loadIqc"
          />
        </el-tab-pane>

        <!-- OQC 出货质检 -->
        <el-tab-pane label="出货质检 (OQC)" name="oqc">
          <div class="filter-bar">
            <el-select v-model="filter.oqcStatus" placeholder="状态" clearable style="width: 130px">
              <el-option label="待检" value="pending" />
              <el-option label="合格" value="pass" />
              <el-option label="不合格" value="fail" />
            </el-select>
            <el-input v-model="filter.oqcKeyword" placeholder="订单号/客户" clearable style="width: 180px" />
            <el-button type="primary" @click="loadOqc">搜索</el-button>
            <el-button @click="resetOqcFilter">重置</el-button>
          </div>
          <el-table :data="oqcList" v-loading="loading" stripe style="margin-top: 16px">
            <el-table-column prop="inspect_no" label="质检单号" width="160" />
            <el-table-column prop="inspect_type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag size="small" type="warning">出货</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="customer_name" label="客户" min-width="140" />
            <el-table-column prop="quantity" label="出货数量" width="90" align="right" />
            <el-table-column prop="sample_size" label="抽样数" width="70" align="right" />
            <el-table-column prop="defect_count" label="缺陷数" width="70" align="right">
              <template #default="{ row }">
                <span v-if="row.defect_count > 0" style="color: #f56c6c">{{ row.defect_count }}</span>
                <span v-else>0</span>
              </template>
            </el-table-column>
            <el-table-column prop="result" label="结果" width="90">
              <template #default="{ row }">
                <el-tag :type="iqcResultType(row.result)" size="small">{{ iqcResultLabel(row.result) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="inspector" label="质检员" width="90" />
            <el-table-column prop="inspect_date" label="质检日期" width="110" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewOqc(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="oqcPage"
            :page-size="20"
            :total="oqcTotal"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="loadOqc"
          />
        </el-tab-pane>

        <!-- 质检标准 -->
        <el-tab-pane label="质检标准" name="standards">
          <div class="filter-bar">
            <el-input v-model="filter.stdKeyword" placeholder="标准名称" clearable style="width: 200px" />
            <el-select v-model="filter.stdType" placeholder="类型" clearable style="width: 130px">
              <el-option label="来料检验" value="iqc" />
              <el-option label="过程检验" value="pqc" />
              <el-option label="出货检验" value="oqc" />
            </el-select>
            <el-button type="primary" @click="loadStandards">搜索</el-button>
            <el-button type="success" @click="openStdDialog">新增标准</el-button>
          </div>
          <el-table :data="standardsList" v-loading="loading" stripe style="margin-top: 16px">
            <el-table-column prop="standard_code" label="标准编号" width="130" />
            <el-table-column prop="standard_name" label="标准名称" min-width="180" />
            <el-table-column prop="inspect_type" label="检验类型" width="110">
              <template #default="{ row }">
                <el-tag size="small">{{ inspectTypeLabel(row.inspect_type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="check_items" label="检查项目" min-width="200" show-overflow-tooltip />
            <el-table-column prop="aql" label="AQL" width="70" align="center" />
            <el-table-column prop="sample_plan" label="抽样方案" min-width="120" />
            <el-table-column prop="update_user" label="更新人" width="90" />
            <el-table-column prop="updated_at" label="更新时间" width="110" />
            <el-table-column label="操作" width="130" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="editStandard(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="deleteStandard(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- IQC 来料质检对话框 -->
    <el-dialog v-model="iqcDialogVisible" title="来料质检" width="700px" :close-on-click-modal="false">
      <el-form :model="iqcForm" :rules="iqcRules" ref="iqcFormRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier_id">
              <el-select v-model="iqcForm.supplier_id" placeholder="选择供应商" filterable style="width: 100%" @change="onSupplierChange">
                <el-option v-for="s in supplierOptions" :key="s.id" :label="s.supplier_name" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="质检日期" prop="inspect_date">
              <el-date-picker v-model="iqcForm.inspect_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料" prop="material_id">
              <el-select v-model="iqcForm.material_id" placeholder="选择物料" filterable style="width: 100%">
                <el-option v-for="m in materialOptions" :key="m.id" :label="m.material_name + ' (' + m.material_code + ')'" :value="m.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送检数量" prop="quantity">
              <el-input-number v-model="iqcForm.quantity" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="抽样数" prop="sample_size">
              <el-input-number v-model="iqcForm.sample_size" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="缺陷数" prop="defect_count">
              <el-input-number v-model="iqcForm.defect_count" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="检验结果" prop="result">
              <el-radio-group v-model="iqcForm.result">
                <el-radio value="pass">合格</el-radio>
                <el-radio value="fail">不合格</el-radio>
                <el-radio value="accepted">让步接受</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="iqcForm.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="iqcDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitIqc" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- OQC 出货质检对话框 -->
    <el-dialog v-model="oqcDialogVisible" title="出货质检" width="700px" :close-on-click-modal="false">
      <el-form :model="oqcForm" :rules="oqcRules" ref="oqcFormRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="订单" prop="order_id">
              <el-select v-model="oqcForm.order_id" placeholder="选择订单" filterable style="width: 100%" @change="onOrderChange">
                <el-option v-for="o in orderOptions" :key="o.id" :label="o.order_no + ' - ' + o.customer_name" :value="o.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="质检日期" prop="inspect_date">
              <el-date-picker v-model="oqcForm.inspect_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出货数量" prop="quantity">
              <el-input-number v-model="oqcForm.quantity" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="抽样数" prop="sample_size">
              <el-input-number v-model="oqcForm.sample_size" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="缺陷数" prop="defect_count">
              <el-input-number v-model="oqcForm.defect_count" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验结果" prop="result">
              <el-radio-group v-model="oqcForm.result">
                <el-radio value="pass">合格</el-radio>
                <el-radio value="fail">不合格</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="oqcForm.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="oqcDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOqc" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 质检标准对话框 -->
    <el-dialog v-model="stdDialogVisible" :title="stdEditMode ? '编辑质检标准' : '新增质检标准'" width="600px" :close-on-click-modal="false">
      <el-form :model="stdForm" :rules="stdRules" ref="stdFormRef" label-width="120px">
        <el-form-item label="标准编号" prop="standard_code">
          <el-input v-model="stdForm.standard_code" :disabled="stdEditMode" />
        </el-form-item>
        <el-form-item label="标准名称" prop="standard_name">
          <el-input v-model="stdForm.standard_name" />
        </el-form-item>
        <el-form-item label="检验类型" prop="inspect_type">
          <el-select v-model="stdForm.inspect_type" style="width: 100%">
            <el-option label="来料检验 (IQC)" value="iqc" />
            <el-option label="过程检验 (PQC)" value="pqc" />
            <el-option label="出货检验 (OQC)" value="oqc" />
          </el-select>
        </el-form-item>
        <el-form-item label="检查项目" prop="check_items">
          <el-input v-model="stdForm.check_items" type="textarea" :rows="3" placeholder="外观检查,尺寸测量,功能测试,..." />
        </el-form-item>
        <el-form-item label="AQL" prop="aql">
          <el-input v-model="stdForm.aql" placeholder="如: 1.0" />
        </el-form-item>
        <el-form-item label="抽样方案" prop="sample_plan">
          <el-input v-model="stdForm.sample_plan" placeholder="如: GB/T 2828.1 正常检验 一次抽样" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStandard" :loading="submitting">{{ stdEditMode ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { quality as qualityApi, supplier as supplierApi, warehouse, orders as orderApi } from '../../api'

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('iqc')

// IQC
const iqcList = ref([])
const iqcTotal = ref(0)
const iqcPage = ref(1)
const iqcDialogVisible = ref(false)
const iqcFormRef = ref()
const iqcForm = reactive({
  supplier_id: null, material_id: null, inspect_date: '', quantity: 1,
  sample_size: 1, defect_count: 0, result: 'pass', remark: ''
})
const iqcRules = {
  supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  material_id: [{ required: true, message: '请选择物料', trigger: 'change' }],
  inspect_date: [{ required: true, message: '请选择质检日期', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入送检数量', trigger: 'blur' }],
  result: [{ required: true, message: '请选择检验结果', trigger: 'change' }]
}

// OQC
const oqcList = ref([])
const oqcTotal = ref(0)
const oqcPage = ref(1)
const oqcDialogVisible = ref(false)
const oqcFormRef = ref()
const oqcForm = reactive({
  order_id: null, inspect_date: '', quantity: 1,
  sample_size: 1, defect_count: 0, result: 'pass', remark: ''
})
const oqcRules = {
  order_id: [{ required: true, message: '请选择订单', trigger: 'change' }],
  inspect_date: [{ required: true, message: '请选择质检日期', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入出货数量', trigger: 'blur' }],
  result: [{ required: true, message: '请选择检验结果', trigger: 'change' }]
}

// Standards
const standardsList = ref([])
const stdDialogVisible = ref(false)
const stdEditMode = ref(false)
const stdFormRef = ref()
const stdForm = reactive({
  id: null, standard_code: '', standard_name: '', inspect_type: 'iqc',
  check_items: '', aql: '1.0', sample_plan: ''
})
const stdRules = {
  standard_code: [{ required: true, message: '请输入标准编号', trigger: 'blur' }],
  standard_name: [{ required: true, message: '请输入标准名称', trigger: 'blur' }],
  inspect_type: [{ required: true, message: '请选择检验类型', trigger: 'change' }]
}

// Options
const supplierOptions = ref([])
const materialOptions = ref([])
const orderOptions = ref([])
const filter = reactive({
  iqcStatus: '', iqcSupplier: '', iqcDate: null,
  oqcStatus: '', oqcKeyword: '',
  stdKeyword: '', stdType: ''
})

function iqcResultType(r) { return r === 'pass' ? 'success' : r === 'fail' ? 'danger' : 'warning' }
function iqcResultLabel(r) { return { pass: '合格', fail: '不合格', accepted: '让步接受', pending: '待检' }[r] || r }
function inspectTypeLabel(t) { return { iqc: '来料检验', pqc: '过程检验', oqc: '出货检验' }[t] || t }

async function loadIqc() {
  loading.value = true
  try {
    const params = { page: iqcPage.value, page_size: 20 }
    if (filter.iqcStatus) params.status = filter.iqcStatus
    if (filter.iqcSupplier) params.supplier_id = filter.iqcSupplier
    if (filter.iqcDate) { params.start_date = filter.iqcDate[0]; params.end_date = filter.iqcDate[1] }
    const res = await qualityApi.list(params)
    iqcList.value = res.data.list || res.data || []
    iqcTotal.value = res.data.total || iqcList.value.length
  } catch (e) { ElMessage.error('加载来料质检失败') }
  finally { loading.value = false }
}

async function loadOqc() {
  loading.value = true
  try {
    const params = { page: oqcPage.value, page_size: 20, inspect_type: 'oqc' }
    if (filter.oqcStatus) params.status = filter.oqcStatus
    if (filter.oqcKeyword) params.keyword = filter.oqcKeyword
    const res = await qualityApi.list(params)
    oqcList.value = res.data.list || res.data || []
    oqcTotal.value = res.data.total || oqcList.value.length
  } catch (e) { ElMessage.error('加载出货质检失败') }
  finally { loading.value = false }
}

async function loadStandards() {
  loading.value = true
  try {
    const params = {}
    if (filter.stdKeyword) params.keyword = filter.stdKeyword
    if (filter.stdType) params.inspect_type = filter.stdType
    const res = await qualityApi.standards(params)
    standardsList.value = res.data || []
  } catch (e) { ElMessage.error('加载质检标准失败') }
  finally { loading.value = false }
}

function openIqcDialog() {
  Object.assign(iqcForm, { id: null, supplier_id: null, material_id: null, inspect_date: '', quantity: 1, sample_size: 1, defect_count: 0, result: 'pass', remark: '' })
  iqcDialogVisible.value = true
}
function openOqcDialog() {
  Object.assign(oqcForm, { id: null, order_id: null, inspect_date: '', quantity: 1, sample_size: 1, defect_count: 0, result: 'pass', remark: '' })
  oqcDialogVisible.value = true
}
async function onSupplierChange(sid) {
  if (!sid) return
  try {
    const res = await warehouse.list({ supplier_id: sid })
    materialOptions.value = res.data?.list || res.data || []
  } catch {}
}
async function onOrderChange(oid) {
  if (!oid) return
  const o = orderOptions.value.find(x => x.id === oid)
  if (o) oqcForm.quantity = o.quantity || 1
}

async function submitIqc() {
  const valid = await iqcFormRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await qualityApi.create({ ...iqcForm, inspect_type: 'iqc', inspect_no: 'IQC' + Date.now() })
    ElMessage.success('提交成功')
    iqcDialogVisible.value = false
    loadIqc()
  } catch (e) { ElMessage.error('提交失败') }
  finally { submitting.value = false }
}

async function submitOqc() {
  const valid = await oqcFormRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await qualityApi.create({ ...oqcForm, inspect_type: 'oqc', inspect_no: 'OQC' + Date.now() })
    ElMessage.success('提交成功')
    oqcDialogVisible.value = false
    loadOqc()
  } catch (e) { ElMessage.error('提交失败') }
  finally { submitting.value = false }
}

function viewIqc(row) {
  ElMessageBox.alert(
    `质检单号: ${row.inspect_no}\n供应商: ${row.supplier_name}\n物料: ${row.material_name}\n送检数: ${row.quantity}\n抽样数: ${row.sample_size}\n缺陷数: ${row.defect_count}\n结果: ${iqcResultLabel(row.result)}\n质检员: ${row.inspector}\n日期: ${row.inspect_date}\n备注: ${row.remark || '无'}`,
    '来料质检详情', { confirmButtonText: '确定' }
  )
}
function viewOqc(row) {
  ElMessageBox.alert(
    `质检单号: ${row.inspect_no}\n订单: ${row.order_no}\n客户: ${row.customer_name}\n数量: ${row.quantity}\n抽样数: ${row.sample_size}\n缺陷数: ${row.defect_count}\n结果: ${iqcResultLabel(row.result)}\n质检员: ${row.inspector}\n日期: ${row.inspect_date}`,
    '出货质检详情', { confirmButtonText: '确定' }
  )
}

function openStdDialog() {
  stdEditMode.value = false
  Object.assign(stdForm, { id: null, standard_code: '', standard_name: '', inspect_type: 'iqc', check_items: '', aql: '1.0', sample_plan: '' })
  stdDialogVisible.value = true
}
function editStandard(row) {
  stdEditMode.value = true
  Object.assign(stdForm, row)
  stdDialogVisible.value = true
}
async function submitStandard() {
  const valid = await stdFormRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (stdEditMode.value) {
      await qualityApi.updateStandard(stdForm.id, stdForm)
    } else {
      await qualityApi.createStandard(stdForm)
    }
    ElMessage.success(stdEditMode.value ? '保存成功' : '创建成功')
    stdDialogVisible.value = false
    loadStandards()
  } catch (e) { ElMessage.error('操作失败') }
  finally { submitting.value = false }
}
async function deleteStandard(row) {
  await ElMessageBox.confirm(`确认删除标准 "${row.standard_name}"？`, '删除确认', { type: 'warning' })
  try {
    await qualityApi.deleteStandard(row.id)
    ElMessage.success('删除成功')
    loadStandards()
  } catch { ElMessage.error('删除失败') }
}

function resetIqcFilter() { filter.iqcStatus = ''; filter.iqcSupplier = ''; filter.iqcDate = null; loadIqc() }
function resetOqcFilter() { filter.oqcStatus = ''; filter.oqcKeyword = ''; loadOqc() }

onMounted(async () => {
  try {
    const s = await supplierApi.list({ page_size: 200 })
    supplierOptions.value = s.data.list || []
    const o = await orderApi.list({ page_size: 200, status: 'completed' })
    orderOptions.value = o.data.list || []
  } catch {}
  loadIqc()
})
</script>

<style scoped>
.quality-page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
