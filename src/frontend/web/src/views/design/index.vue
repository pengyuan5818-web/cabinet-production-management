<template>
  <div class="design-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设计图纸管理</span>
          <el-button type="primary" @click="openUploadDialog">上传图纸</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 图纸列表 -->
        <el-tab-pane label="图纸列表" name="list">
          <div class="filter-bar">
            <el-input v-model="filter.keyword" placeholder="图纸名称/订单号" clearable style="width: 200px" />
            <el-select v-model="filter.order_id" placeholder="关联订单" clearable filterable style="width: 200px">
              <el-option v-for="o in orderOptions" :key="o.id" :label="o.order_no + ' - ' + o.customer_name" :value="o.id" />
            </el-select>
            <el-select v-model="filter.drawing_type" placeholder="图纸类型" clearable style="width: 150px">
              <el-option label="三视图" value="三视图" />
              <el-option label="效果图" value="效果图" />
              <el-option label="施工图" value="施工图" />
              <el-option label="水电图" value="水电图" />
              <el-option label="结构图" value="结构图" />
            </el-select>
            <el-select v-model="filter.status" placeholder="状态" clearable style="width: 130px">
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
            <el-button type="primary" @click="loadDrawings">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </div>

          <el-table :data="drawings" v-loading="loading" stripe style="margin-top: 16px">
            <el-table-column prop="drawing_no" label="图纸编号" width="160" />
            <el-table-column prop="drawing_name" label="图纸名称" min-width="180" />
            <el-table-column prop="drawing_type" label="类型" width="90">
              <template #default="{ row }">
                <el-tag size="small">{{ row.drawing_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_no" label="关联订单" width="150" />
            <el-table-column prop="customer_name" label="客户" min-width="140" />
            <el-table-column prop="designer" label="设计师" width="100" />
            <el-table-column prop="file_size" label="文件大小" width="100">
              <template #default="{ row }">
                {{ formatSize(row.file_size) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="上传时间" width="110" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="previewDrawing(row)">预览</el-button>
                <el-button link type="success" size="small" @click="downloadDrawing(row)">下载</el-button>
                <el-button link type="warning" size="small" @click="auditDrawing(row)">审核</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="page"
            :page-size="20"
            :total="total"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="loadDrawings"
          />
        </el-tab-pane>

        <!-- BOM展开 -->
        <el-tab-pane label="BOM配置" name="bom">
          <div class="filter-bar">
            <el-select v-model="bomFilter.order_id" placeholder="选择订单" clearable filterable style="width: 260px" @change="onBomOrderChange">
              <el-option v-for="o in orderOptions" :key="o.id" :label="o.order_no + ' - ' + o.customer_name" :value="o.id" />
            </el-select>
            <el-button type="primary" @click="loadBom">加载BOM</el-button>
            <el-button type="success" @click="saveBom" :loading="saving">保存BOM</el-button>
            <el-button type="warning" @click="openAlphaImportDialog">从阿尔法导入</el-button>
          </div>

          <el-alert v-if="bomFilter.order_id" type="info" style="margin-top: 12px" :closable="false">
            订单: {{ currentBomOrder ? currentBomOrder.order_no : '' }} | 客户: {{ currentBomOrder ? currentBomOrder.customer_name : '' }}
          </el-alert>

          <el-table :data="bomItems" v-loading="loadingBom" stripe style="margin-top: 16px" @selection-change="handleBomSelection">
            <el-table-column type="selection" width="40" />
            <el-table-column prop="material_code" label="物料编码" width="130" />
            <el-table-column prop="material_name" label="物料名称" min-width="180" />
            <el-table-column prop="category" label="类别" width="100" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="quantity" label="数量" width="90" align="right">
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="0" :precision="2" size="small" style="width: 80px" />
              </template>
            </el-table-column>
            <el-table-column prop="unit_price" label="单价" width="100" align="right">
              <template #default="{ row }">
                ¥{{ (row.unit_price || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="supplier_name" label="供应商" min-width="140" />
            <el-table-column label="操作" width="80">
              <template #default="{ row, $index }">
                <el-button link type="danger" size="small" @click="removeBomItem($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 16px; display: flex; gap: 16px; align-items: center">
            <el-button type="primary" @click="addBomItem">+ 添加物料</el-button>
            <span style="margin-left: auto; font-size: 16px; font-weight: bold">
              合计: ¥{{ bomTotal.toFixed(2) }}
            </span>
          </div>
        </el-tab-pane>

    <!-- 阿尔法家BOM导入对话框 -->
    <el-dialog v-model="alphaImportVisible" title="从阿尔法家导入BOM" width="680px" :close-on-click-modal="false">
      <el-steps :active="alphaStep" finish-status="success" style="margin-bottom: 24px">
        <el-step title="选择订单" />
        <el-step title="上传文件" />
        <el-step title="确认导入" />
      </el-steps>

      <!-- 步骤1：选择订单 -->
      <div v-if="alphaStep === 0">
        <el-form-item label="目标订单" required>
          <el-select v-model="alphaForm.order_id" placeholder="请先在BOM配置区选择订单，或在此选择" filterable style="width: 100%">
            <el-option v-for="o in orderOptions" :key="o.id" :label="o.order_no + ' - ' + o.customer_name" :value="o.id" />
          </el-select>
        </el-form-item>
        <div style="text-align: right; margin-top: 16px">
          <el-button type="primary" @click="alphaNextStep" :disabled="!alphaForm.order_id">下一步</el-button>
        </div>
      </div>

      <!-- 步骤2：上传文件 -->
      <div v-if="alphaStep === 1">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          支持阿尔法家导出的 <b>.xlsx / .xls / .csv / .json</b> 格式文件
        </el-alert>
        <el-upload
          ref="alphaUploadRef"
          class="upload-demo"
          drag
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls,.csv,.json"
          :on-change="onAlphaFileChange"
          :file-list="alphaFileList"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">拖拽文件到此处 或 <em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">请上传阿尔法家拆单软件导出的Excel/CSV/JSON文件</div>
          </template>
        </el-upload>
        <div v-if="alphaValidateResult" style="margin-top: 12px">
          <el-alert type="success" :closable="false">
            解析成功，共 {{ alphaValidateResult.total_records }} 条记录
          </el-alert>
        </div>
        <div style="text-align: right; margin-top: 16px">
          <el-button @click="alphaStep = 0">上一步</el-button>
          <el-button type="primary" @click="alphaValidateFile" :loading="alphaUploading" :disabled="!alphaForm.file">验证文件</el-button>
        </div>
      </div>

      <!-- 步骤3：确认导入 -->
      <div v-if="alphaStep === 2">
        <el-alert type="info" :closable="false" style="margin-bottom: 12px">
          文件验证通过，确认将数据导入到订单 <b>{{ alphaForm.order_no }}</b>
        </el-alert>
        <el-table :data="alphaPreview" stripe size="small" max-height="280">
          <el-table-column prop="board_name" label="板件名称" min-width="120" />
          <el-table-column prop="length" label="长(mm)" width="80" align="right" />
          <el-table-column prop="width" label="宽(mm)" width="80" align="right" />
          <el-table-column prop="thickness" label="厚(mm)" width="80" align="right" />
          <el-table-column prop="quantity" label="数量" width="60" align="right" />
          <el-table-column prop="edge_left" label="封边(L)" width="70" align="right" />
          <el-table-column prop="edge_right" label="封边(R)" width="70" align="right" />
        </el-table>
        <div style="text-align: right; margin-top: 16px">
          <el-button @click="alphaStep = 1">上一步</el-button>
          <el-button type="success" @click="alphaDoImport" :loading="alphaImporting">确认导入</el-button>
        </div>
      </div>
    </el-dialog>

        <!-- 图纸审核 -->
        <el-tab-pane label="待审核" name="pending">
          <el-table :data="pendingDrawings" v-loading="loading" stripe>
            <el-table-column prop="drawing_no" label="图纸编号" width="160" />
            <el-table-column prop="drawing_name" label="图纸名称" min-width="180" />
            <el-table-column prop="drawing_type" label="类型" width="90" />
            <el-table-column prop="order_no" label="关联订单" width="150" />
            <el-table-column prop="designer" label="设计师" width="100" />
            <el-table-column prop="created_at" label="上传时间" width="110" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="success" size="small" @click="doAudit(row, 'approved')">通过</el-button>
                <el-button type="danger" size="small" @click="doAudit(row, 'rejected')">驳回</el-button>
                <el-button link type="primary" size="small" @click="previewDrawing(row)">预览</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传图纸" width="600px" :close-on-click-modal="false">
      <el-form :model="uploadForm" :rules="uploadRules" ref="uploadFormRef" label-width="110px">
        <el-form-item label="图纸名称" prop="drawing_name">
          <el-input v-model="uploadForm.drawing_name" />
        </el-form-item>
        <el-form-item label="图纸类型" prop="drawing_type">
          <el-select v-model="uploadForm.drawing_type" style="width: 100%">
            <el-option label="三视图" value="三视图" />
            <el-option label="效果图" value="效果图" />
            <el-option label="施工图" value="施工图" />
            <el-option label="水电图" value="水电图" />
            <el-option label="结构图" value="结构图" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联订单" prop="order_id">
          <el-select v-model="uploadForm.order_id" placeholder="选择订单" filterable style="width: 100%">
            <el-option v-for="o in orderOptions" :key="o.id" :label="o.order_no + ' - ' + o.customer_name" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="设计师" prop="designer">
          <el-input v-model="uploadForm.designer" />
        </el-form-item>
        <el-form-item label="上传文件" prop="file_url">
          <el-input v-model="uploadForm.file_url" placeholder="文件URL或本地路径" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="uploadForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload" :loading="submitting">上传</el-button>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog v-model="previewDialogVisible" :title="previewDrawingData ? previewDrawingData.drawing_name : ''" width="800px">
      <div v-if="previewDrawingData" style="text-align: center">
        <p>图纸编号: {{ previewDrawingData.drawing_no }}</p>
        <p>类型: {{ previewDrawingData.drawing_type }} | 订单: {{ previewDrawingData.order_no }}</p>
        <p>设计师: {{ previewDrawingData.designer }} | 上传时间: {{ previewDrawingData.created_at }}</p>
        <p v-if="previewDrawingData.remark">备注: {{ previewDrawingData.remark }}</p>
        <el-alert type="info" :closable="false" style="margin-top: 12px">
          图纸文件: {{ previewDrawingData.file_url || '未上传' }}
        </el-alert>
      </div>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditDialogVisible" title="审核图纸" width="500px">
      <el-form :model="auditForm" label-width="80px">
        <el-form-item label="图纸">
          <span>{{ auditDrawingData ? auditDrawingData.drawing_name : '' }}</span>
        </el-form-item>
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.status">
            <el-radio value="approved">通过</el-radio>
            <el-radio value="rejected">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="意见">
          <el-input v-model="auditForm.remark" type="textarea" :rows="3" placeholder="请输入审核意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAudit" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 添加BOM物料对话框 -->
    <el-dialog v-model="addBomDialogVisible" title="添加物料" width="600px">
      <el-form :model="bomMaterialForm" label-width="100px">
        <el-form-item label="物料">
          <el-select v-model="bomMaterialForm.material_id" filterable style="width: 100%">
            <el-option v-for="m in materialOptions" :key="m.id" :label="m.material_name + ' (' + m.material_code + ')'" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="bomMaterialForm.quantity" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addBomDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddBomItem">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { design as designApi, orderApi, warehouse, alpha as alphaApi } from '../../api'

const activeTab = ref('list')
const loading = ref(false)
const submitting = ref(false)
const saving = ref(false)
const drawings = ref([])
const pendingDrawings = ref([])
const total = ref(0)
const page = ref(1)
const orderOptions = ref([])
const materialOptions = ref([])

const filter = reactive({ keyword: '', order_id: '', drawing_type: '', status: '' })
const bomFilter = reactive({ order_id: '' })
const currentBomOrder = ref(null)
const bomItems = ref([])
const loadingBom = ref(false)
const addBomDialogVisible = ref(false)
const bomMaterialForm = reactive({ material_id: null, quantity: 1 })

// 阿尔法导入
const alphaImportVisible = ref(false)
const alphaStep = ref(0)
const alphaUploading = ref(false)
const alphaImporting = ref(false)
const alphaForm = reactive({ order_id: '', order_no: '', file: null })
const alphaFileList = ref([])
const alphaUploadRef = ref()
const alphaValidateResult = ref(null)
const alphaPreview = ref([])

// Dialogs
const uploadDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const auditDialogVisible = ref(false)
const uploadFormRef = ref()
const previewDrawingData = ref(null)
const auditDrawingData = ref(null)
const uploadForm = reactive({
  drawing_name: '', drawing_type: '效果图', order_id: null, designer: '', file_url: '', remark: ''
})
const auditForm = reactive({ status: 'approved', remark: '' })
const uploadRules = {
  drawing_name: [{ required: true, message: '请输入图纸名称', trigger: 'blur' }],
  drawing_type: [{ required: true, message: '请选择图纸类型', trigger: 'change' }],
  designer: [{ required: true, message: '请输入设计师', trigger: 'blur' }]
}

const bomTotal = computed(() => {
  return bomItems.value.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0)
  }, 0)
})

function statusType(s) { return { approved: 'success', rejected: 'danger', pending: 'warning' }[s] || 'info' }
function statusLabel(s) { return { approved: '已通过', rejected: '已驳回', pending: '待审核' }[s] || s }
function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

async function loadDrawings() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: 20 }
    if (filter.keyword) params.keyword = filter.keyword
    if (filter.order_id) params.order_id = filter.order_id
    if (filter.drawing_type) params.drawing_type = filter.drawing_type
    if (filter.status) params.status = filter.status
    const res = await designApi.list(params)
    drawings.value = res.data.list || []
    total.value = res.data.total || drawings.value.length
    // pending
    const pRes = await designApi.pending()
    pendingDrawings.value = pRes.data || []
  } catch (e) { ElMessage.error('加载图纸失败') }
  finally { loading.value = false }
}

async function loadBom() {
  if (!bomFilter.order_id) { ElMessage.warning('请先选择订单'); return }
  loadingBom.value = true
  try {
    const res = await designApi.bom(bomFilter.order_id)
    bomItems.value = res.data || []
    const o = orderOptions.value.find(x => x.id === bomFilter.order_id)
    currentBomOrder.value = o || null
  } catch (e) { ElMessage.error('加载BOM失败') }
  finally { loadingBom.value = false }
}

function openAlphaImportDialog() {
  if (!bomFilter.order_id) {
    ElMessage.warning('请先在BOM配置区选择一个订单')
    return
  }
  alphaForm.order_id = bomFilter.order_id
  const o = orderOptions.value.find(x => x.id === bomFilter.order_id)
  alphaForm.order_no = o ? o.order_no : ''
  alphaStep.value = 0
  alphaValidateResult.value = null
  alphaPreview.value = []
  alphaFileList.value = []
  alphaForm.file = null
  alphaImportVisible.value = true
}

function alphaNextStep() {
  if (!alphaForm.order_id) { ElMessage.warning('请选择目标订单'); return }
  alphaStep.value = 1
}

function onAlphaFileChange(file, fileList) {
  alphaForm.file = file.raw
  alphaFileList.value = fileList.slice(-1)
  alphaValidateResult.value = null
  alphaPreview.value = []
}

async function alphaValidateFile() {
  if (!alphaForm.file) { ElMessage.warning('请先上传文件'); return }
  alphaUploading.value = true
  try {
    const res = await alphaApi.validate(alphaForm.file)
    if (res.success) {
      alphaValidateResult.value = res.data
      alphaPreview.value = res.data.preview || []
      ElMessage.success('文件解析成功')
    } else {
      ElMessage.error(res.message || '文件解析失败')
    }
  } catch (e) {
    ElMessage.error('验证文件失败')
  } finally { alphaUploading.value = false }
}

async function alphaDoImport() {
  if (!alphaForm.order_id || !alphaForm.file) return
  alphaImporting.value = true
  try {
    const res = await alphaApi.import(alphaForm.file, alphaForm.order_id)
    if (res.success) {
      ElMessage.success(`导入成功！共导入 ${res.data?.total || 0} 条板件数据到 BOM`)
      alphaImportVisible.value = false
      loadBom()
    } else {
      ElMessage.error(res.message || '导入失败')
    }
  } catch (e) { ElMessage.error('导入失败')
  } finally { alphaImporting.value = false }
}

function onBomOrderChange(oid) {
  if (!oid) { bomItems.value = []; currentBomOrder.value = null }
}

async function saveBom() {
  if (!bomFilter.order_id) { ElMessage.warning('请先选择订单'); return }
  saving.value = true
  try {
    await designApi.saveBom(bomFilter.order_id, { items: bomItems.value })
    ElMessage.success('BOM保存成功')
  } catch (e) { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

function handleBomSelection() {}
function removeBomItem(idx) { bomItems.value.splice(idx, 1) }

function addBomItem() {
  addBomDialogVisible.value = true
  bomMaterialForm.material_id = null
  bomMaterialForm.quantity = 1
}

async function confirmAddBomItem() {
  if (!bomMaterialForm.material_id) { ElMessage.warning('请选择物料'); return }
  const m = materialOptions.value.find(x => x.id === bomMaterialForm.material_id)
  if (m) {
    bomItems.value.push({ ...m, quantity: bomMaterialForm.quantity })
  }
  addBomDialogVisible.value = false
}

function openUploadDialog() {
  Object.assign(uploadForm, { drawing_name: '', drawing_type: '效果图', order_id: null, designer: '', file_url: '', remark: '' })
  uploadDialogVisible.value = true
}

async function submitUpload() {
  const valid = await uploadFormRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await designApi.upload({ ...uploadForm, drawing_no: 'D' + Date.now() })
    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    loadDrawings()
  } catch (e) { ElMessage.error('上传失败') }
  finally { submitting.value = false }
}

function previewDrawing(row) {
  previewDrawingData.value = row
  previewDialogVisible.value = true
}

function downloadDrawing(row) {
  if (row.file_url) {
    window.open(row.file_url, '_blank')
  } else {
    ElMessage.warning('无下载链接')
  }
}

function auditDrawing(row) {
  auditDrawingData.value = row
  auditForm.status = 'approved'
  auditForm.remark = ''
  auditDialogVisible.value = true
}

async function submitAudit() {
  if (!auditForm.status) { ElMessage.warning('请选择审核结果'); return }
  submitting.value = true
  try {
    await designApi.audit(auditDrawingData.value.id, auditForm)
    ElMessage.success('审核提交成功')
    auditDialogVisible.value = false
    loadDrawings()
  } catch (e) { ElMessage.error('审核失败') }
  finally { submitting.value = false }
}

async function doAudit(row, status) {
  const action = status === 'approved' ? '通过' : '驳回'
  try {
    await ElMessageBox.confirm(`确认${action}该图纸？`, '审核确认', { type: 'warning' })
    await designApi.audit(row.id, { status, remark: '' })
    ElMessage.success('审核成功')
    loadDrawings()
  } catch (e) { if (e !== 'cancel') ElMessage.error('审核失败') }
}

function resetFilter() { filter.keyword = ''; filter.order_id = ''; filter.drawing_type = ''; filter.status = ''; loadDrawings() }

onMounted(async () => {
  try {
    const o = await orderApi.list({ page_size: 200 })
    orderOptions.value = o.data.list || []
    try {
      const m = await warehouse.list({ page_size: 500 })
      materialOptions.value = m.data.list || m.data || []
    } catch {}
  } catch {}
  loadDrawings()
})
</script>

<style scoped>
.design-page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
