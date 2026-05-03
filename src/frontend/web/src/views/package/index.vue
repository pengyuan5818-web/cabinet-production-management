<template>
  <div class="package-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>包装管理</span>
          <div>
            <el-button type="primary" @click="openCreateDialog">新建包装清单</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 包装清单 -->
        <el-tab-pane label="包装清单" name="list">
          <div class="filter-bar">
            <el-input v-model="filter.keyword" placeholder="清单号/订单号" clearable style="width: 200px" />
            <el-select v-model="filter.status" placeholder="状态" clearable style="width: 130px">
              <el-option label="待包装" value="pending" />
              <el-option label="包装中" value="packing" />
              <el-option label="已完成" value="completed" />
            </el-select>
            <el-date-picker v-model="filter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
            <el-button type="primary" @click="loadPackages">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </div>

          <el-table :data="packages" v-loading="loading" stripe style="margin-top: 16px">
            <el-table-column prop="package_no" label="包装单号" width="170" />
            <el-table-column prop="order_no" label="订单号" width="150" />
            <el-table-column prop="customer_name" label="客户" min-width="140" />
            <el-table-column prop="box_count" label="箱数" width="80" align="center" />
            <el-table-column prop="total_volume" label="总体积(m³)" width="110" align="right">
              <template #default="{ row }">
                {{ (row.total_volume || 0).toFixed(3) }}
              </template>
            </el-table-column>
            <el-table-column prop="total_weight" label="总重量(kg)" width="110" align="right">
              <template #default="{ row }">
                {{ (row.total_weight || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="packer_name" label="包装员" width="90" />
            <el-table-column prop="packed_at" label="完成时间" width="110" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewPackage(row)">查看</el-button>
                <el-button link type="warning" size="small" @click="printPackage(row)">打印</el-button>
                <el-button link type="success" size="small" v-if="row.status === 'pending'" @click="startPacking(row)">开始包装</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="page"
            :page-size="20"
            :total="total"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="loadPackages"
          />
        </el-tab-pane>

        <!-- 包装材料库存 -->
        <el-tab-pane label="包材库存" name="materials">
          <div class="filter-bar">
            <el-input v-model="filterMat.keyword" placeholder="材料名称/编码" clearable style="width: 200px" />
            <el-button type="primary" @click="loadMaterials">搜索</el-button>
            <el-button type="success" @click="openMaterialDialog">新增材料</el-button>
          </div>
          <el-table :data="materials" v-loading="loadingMat" stripe style="margin-top: 16px">
            <el-table-column prop="material_code" label="材料编码" width="130" />
            <el-table-column prop="material_name" label="材料名称" min-width="160" />
            <el-table-column prop="specification" label="规格" min-width="120" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="stock_quantity" label="库存数量" width="100" align="right">
              <template #default="{ row }">
                <span :style="{ color: row.stock_quantity < row.min_stock ? '#f56c6c' : '#67c23a', fontWeight: 'bold' }">
                  {{ row.stock_quantity }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="min_stock" label="最低库存" width="100" align="right" />
            <el-table-column prop="unit_cost" label="单位成本" width="100" align="right">
              <template #default="{ row }">
                ¥{{ (row.unit_cost || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="warehouse_location" label="存放位置" min-width="100" />
            <el-table-column label="操作" width="130">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="editMaterial(row)">编辑</el-button>
                <el-button link type="info" size="small" @click="stockInMaterial(row)">入库</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 包装记录 -->
        <el-tab-pane label="包装记录" name="logs">
          <div class="filter-bar">
            <el-input v-model="filterLog.keyword" placeholder="包装单号/订单号" clearable style="width: 200px" />
            <el-date-picker v-model="filterLog.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 240px" />
            <el-button type="primary" @click="loadLogs">搜索</el-button>
          </div>
          <el-table :data="logs" v-loading="loadingLog" stripe style="margin-top: 16px">
            <el-table-column prop="package_no" label="包装单号" width="170" />
            <el-table-column prop="order_no" label="订单号" width="150" />
            <el-table-column prop="action" label="操作" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.action === 'start' ? 'warning' : 'success'">
                  {{ row.action === 'start' ? '开始' : '完成' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operator_name" label="操作员" width="100" />
            <el-table-column prop="created_at" label="操作时间" width="160" />
            <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 包装清单详情 -->
    <el-dialog v-model="detailDialogVisible" title="包装清单详情" width="800px">
      <el-descriptions :column="3" border size="small" v-if="currentPkg">
        <el-descriptions-item label="包装单号">{{ currentPkg.package_no }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ currentPkg.order_no }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ currentPkg.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="箱数">{{ currentPkg.box_count }}</el-descriptions-item>
        <el-descriptions-item label="总体积">{{ currentPkg.total_volume }} m³</el-descriptions-item>
        <el-descriptions-item label="总重量">{{ currentPkg.total_weight }} kg</el-descriptions-item>
        <el-descriptions-item label="包装员">{{ currentPkg.packer_name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(currentPkg.status)" size="small">{{ statusLabel(currentPkg.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ currentPkg.packed_at }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>箱明细</el-divider>
      <el-table :data="currentPkgItems" stripe size="small">
        <el-table-column prop="box_no" label="箱号" width="100" />
        <el-table-column prop="box_type" label="箱型" width="100" />
        <el-table-column prop="dimensions" label="尺寸(cm)" min-width="120" />
        <el-table-column prop="volume" label="体积(m³)" width="100" align="right" />
        <el-table-column prop="weight" label="重量(kg)" width="100" align="right" />
        <el-table-column prop="description" label="内含物品" min-width="200" />
      </el-table>
    </el-dialog>

    <!-- 新建包装清单 -->
    <el-dialog v-model="createDialogVisible" title="新建包装清单" width="700px" :close-on-click-modal="false">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="订单" prop="order_id">
              <el-select v-model="createForm.order_id" placeholder="选择订单" filterable style="width: 100%" @change="onOrderChange">
                <el-option v-for="o in orderOptions" :key="o.id" :label="o.order_no + ' - ' + o.customer_name" :value="o.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="包装员" prop="packer_name">
              <el-input v-model="createForm.packer_name" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-divider>箱明细</el-divider>
      <el-table :data="createItems" stripe size="small" style="margin-bottom: 12px">
        <el-table-column prop="box_no" label="箱号" width="100">
          <template #default="{ row, $index }">
            <el-input v-model="row.box_no" placeholder="箱号" />
          </template>
        </el-table-column>
        <el-table-column prop="box_type" label="箱型" width="120">
          <template #default="{ row }">
            <el-select v-model="row.box_type" style="width: 100%">
              <el-option label="纸箱-S" value="纸箱-S" />
              <el-option label="纸箱-M" value="纸箱-M" />
              <el-option label="纸箱-L" value="纸箱-L" />
              <el-option label="木箱" value="木箱" />
              <el-option label="托盘" value="托盘" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="dimensions" label="尺寸(cm)" width="130">
          <template #default="{ row }">
            <el-input v-model="row.dimensions" placeholder="长x宽x高" />
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="重量(kg)" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.weight" :min="0" :precision="2" size="small" style="width: 80px" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="内含物品" min-width="150">
          <template #default="{ row }">
            <el-input v-model="row.description" placeholder="内含物品" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60">
          <template #default="{ row, $index }">
            <el-button link type="danger" size="small" @click="removeCreateItem($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button type="primary" plain @click="addCreateItem">+ 添加箱子</el-button>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPackage" :loading="submitting">创建</el-button>
      </template>
    </el-dialog>

    <!-- 包材入库 -->
    <el-dialog v-model="stockInDialogVisible" title="包材入库" width="400px">
      <el-form :model="stockInForm" label-width="100px">
        <el-form-item label="材料">
          <span>{{ stockInForm.material_name }}</span>
        </el-form-item>
        <el-form-item label="入库数量">
          <el-input-number v-model="stockInForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockInForm.remark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockInDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStockIn">确认入库</el-button>
      </template>
    </el-dialog>

    <!-- 新增包材 -->
    <el-dialog v-model="materialDialogVisible" :title="materialEditMode ? '编辑包材' : '新增包材'" width="500px">
      <el-form :model="materialForm" label-width="110px">
        <el-form-item label="材料编码">
          <el-input v-model="materialForm.material_code" />
        </el-form-item>
        <el-form-item label="材料名称">
          <el-input v-model="materialForm.material_name" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="materialForm.specification" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="materialForm.unit" />
        </el-form-item>
        <el-form-item label="库存数量">
          <el-input-number v-model="materialForm.stock_quantity" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最低库存">
          <el-input-number v-model="materialForm.min_stock" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位成本">
          <el-input-number v-model="materialForm.unit_cost" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="存放位置">
          <el-input v-model="materialForm.warehouse_location" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="materialDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMaterial">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { packageApi, orders as orderApi } from '../../api'

const activeTab = ref('list')
const loading = ref(false)
const submitting = ref(false)
const packages = ref([])
const total = ref(0)
const page = ref(1)
const orderOptions = ref([])
const filter = reactive({ keyword: '', status: '', dateRange: null })

// Detail
const detailDialogVisible = ref(false)
const currentPkg = ref(null)
const currentPkgItems = ref([])

// Create
const createDialogVisible = ref(false)
const createFormRef = ref()
const createForm = reactive({ order_id: null, packer_name: '' })
const createRules = { order_id: [{ required: true, message: '请选择订单', trigger: 'change' }] }
const createItems = ref([])

// Materials
const materials = ref([])
const loadingMat = ref(false)
const materialDialogVisible = ref(false)
const materialEditMode = ref(false)
const materialForm = reactive({ id: null, material_code: '', material_name: '', specification: '', unit: '个', stock_quantity: 0, min_stock: 10, unit_cost: 0, warehouse_location: '' })
const stockInDialogVisible = ref(false)
const stockInForm = reactive({ material_id: null, material_name: '', quantity: 1, remark: '' })

// Logs
const logs = ref([])
const loadingLog = ref(false)
const filterLog = reactive({ keyword: '', dateRange: null })

function statusType(s) { return { pending: 'info', packing: 'warning', completed: 'success' }[s] || 'info' }
function statusLabel(s) { return { pending: '待包装', packing: '包装中', completed: '已完成' }[s] || s }

async function loadPackages() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: 20 }
    if (filter.keyword) params.keyword = filter.keyword
    if (filter.status) params.status = filter.status
    if (filter.dateRange) { params.start_date = filter.dateRange[0]; params.end_date = filter.dateRange[1] }
    const res = await packageApi.list(params)
    packages.value = res.data.list || []
    total.value = res.data.total || packages.value.length
  } catch (e) { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

async function loadMaterials() {
  loadingMat.value = true
  try {
    const res = await packageApi.materials({ keyword: filterMat ? filterMat.keyword : '' })
    materials.value = res.data || []
  } catch (e) { ElMessage.error('加载失败') }
  finally { loadingMat.value = false }
}

async function loadLogs() {
  loadingLog.value = true
  try {
    const params = {}
    if (filterLog.keyword) params.keyword = filterLog.keyword
    if (filterLog.dateRange) { params.start_date = filterLog.dateRange[0]; params.end_date = filterLog.dateRange[1] }
    const res = await packageApi.logs(params)
    logs.value = res.data || []
  } catch (e) { ElMessage.error('加载失败') }
  finally { loadingLog.value = false }
}

async function viewPackage(row) {
  try {
    const res = await packageApi.detail(row.id)
    currentPkg.value = res.data
    currentPkgItems.value = res.data.items || []
    detailDialogVisible.value = true
  } catch (e) { ElMessage.error('加载详情失败') }
}

function printPackage(row) {
  ElMessage.info('打印功能开发中...')
}

async function startPacking(row) {
  try {
    await packageApi.updateStatus(row.id, { status: 'packing' })
    ElMessage.success('已开始包装')
    loadPackages()
  } catch (e) { ElMessage.error('操作失败') }
}

function onOrderChange(oid) {
  if (!oid) return
  const o = orderOptions.value.find(x => x.id === oid)
  if (o) createForm.packer_name = createForm.packer_name || ''
}

function addCreateItem() {
  createItems.value.push({ box_no: '', box_type: '纸箱-M', dimensions: '', weight: 0, description: '' })
}

function removeCreateItem(idx) { createItems.value.splice(idx, 1) }

function openCreateDialog() {
  createItems.value = [{ box_no: '', box_type: '纸箱-M', dimensions: '', weight: 0, description: '' }]
  Object.assign(createForm, { order_id: null, packer_name: '' })
  createDialogVisible.value = true
}

async function submitPackage() {
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await packageApi.create({ ...createForm, items: createItems.value })
    ElMessage.success('创建成功')
    createDialogVisible.value = false
    loadPackages()
  } catch (e) { ElMessage.error('创建失败') }
  finally { submitting.value = false }
}

function editMaterial(row) {
  materialEditMode.value = true
  Object.assign(materialForm, row)
  materialDialogVisible.value = true
}

function openMaterialDialog() {
  materialEditMode.value = false
  Object.assign(materialForm, { id: null, material_code: '', material_name: '', specification: '', unit: '个', stock_quantity: 0, min_stock: 10, unit_cost: 0, warehouse_location: '' })
  materialDialogVisible.value = true
}

async function submitMaterial() {
  try {
    if (materialEditMode.value) {
      await packageApi.updateMaterial(materialForm.id, materialForm)
    } else {
      await packageApi.createMaterial(materialForm)
    }
    ElMessage.success('保存成功')
    materialDialogVisible.value = false
    loadMaterials()
  } catch (e) { ElMessage.error('保存失败') }
}

function stockInMaterial(row) {
  Object.assign(stockInForm, { material_id: row.id, material_name: row.material_name, quantity: 1, remark: '' })
  stockInDialogVisible.value = true
}

async function submitStockIn() {
  try {
    await packageApi.stockInMaterial(stockInForm.material_id, { quantity: stockInForm.quantity, remark: stockInForm.remark })
    ElMessage.success('入库成功')
    stockInDialogVisible.value = false
    loadMaterials()
  } catch (e) { ElMessage.error('入库失败') }
}

function resetFilter() { filter.keyword = ''; filter.status = ''; filter.dateRange = null; loadPackages() }

onMounted(async () => {
  try {
    const o = await orderApi.list({ page_size: 200 })
    orderOptions.value = o.data.list || []
  } catch {}
  loadPackages()
})
</script>

<style scoped>
.package-page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
