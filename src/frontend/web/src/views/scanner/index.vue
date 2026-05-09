<template>
  <div class="scanner-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>📡 扫码枪设备管理</h2>
      <p class="subtitle">管理车间扫码枪，每把扫码枪对应不同工序和库位</p>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 设备列表 -->
      <el-tab-pane label="设备列表" name="list">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索编号、名称"
              style="width: 200px"
              clearable
              @clear="loadDevices"
              @keyup.enter="loadDevices"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="filterStatus" placeholder="状态" style="width: 120px" clearable @change="loadDevices">
              <el-option label="启用" value="active" />
              <el-option label="停用" value="inactive" />
            </el-select>
            <el-select v-model="filterProcess" placeholder="工序" style="width: 140px" clearable @change="loadDevices">
              <el-option
                v-for="p in processTypeList"
                :key="p.value"
                :label="p.label"
                :value="p.value"
              />
            </el-select>
          </div>
          <div class="toolbar-right">
            <el-button type="primary" @click="openAddDialog">
              <el-icon><Plus /></el-icon> 添加扫码枪
            </el-button>
          </div>
        </div>

        <!-- 设备卡片列表 -->
        <div class="device-grid">
          <el-card
            v-for="device in deviceList"
            :key="device.id"
            class="device-card"
            :class="{ 'is-online': device.is_online, 'is-offline': !device.is_online }"
            shadow="hover"
          >
            <template #header>
              <div class="card-header">
                <div class="device-code">
                  <span class="code-text">{{ device.code }}</span>
                  <el-tag :type="device.is_online ? 'success' : 'info'" size="small">
                    {{ device.is_online ? '在线' : '离线' }}
                  </el-tag>
                </div>
                <el-dropdown trigger="click">
                  <el-button text size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="openEditDialog(device)">编辑</el-dropdown-item>
                      <el-dropdown-item @click="toggleStatus(device)">
                        {{ device.status === 'active' ? '停用' : '启用' }}
                      </el-dropdown-item>
                      <el-dropdown-item divided @click="confirmDelete(device)" style="color: #f56c6c">
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>

            <div class="device-info">
              <div class="info-row">
                <span class="label">名称：</span>
                <span class="value">{{ device.name }}</span>
              </div>
              <div class="info-row">
                <span class="label">工序：</span>
                <el-tag size="small" type="primary">{{ getProcessLabel(device.process_type) }}</el-tag>
              </div>
              <div class="info-row">
                <span class="label">端口：</span>
                <span class="value mono">{{ device.com_port || '未配置' }}</span>
              </div>
              <div class="info-row">
                <span class="label">波特率：</span>
                <span class="value mono">{{ device.baud_rate || 9600 }}</span>
              </div>
              <div class="info-row" v-if="device.last_scan_time">
                <span class="label">最后扫码：</span>
                <span class="value time">{{ formatTime(device.last_scan_time) }}</span>
              </div>
              <div class="info-row" v-if="device.last_scan_barcode">
                <span class="label">最后条码：</span>
                <span class="value barcode">{{ device.last_scan_barcode }}</span>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 空状态 -->
        <el-empty v-if="deviceList.length === 0 && !loading" description="暂无扫码枪设备，点击上方添加">
          <el-button type="primary" @click="openAddDialog">添加扫码枪</el-button>
        </el-empty>
      </el-tab-pane>

      <!-- 扫码记录 -->
      <el-tab-pane label="扫码记录" name="records">
        <div class="toolbar">
          <div class="toolbar-left">
            <el-date-picker
              v-model="recordDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 260px"
            />
            <el-button @click="loadRecords">查询</el-button>
          </div>
        </div>

        <el-table :data="recordList" v-loading="recordsLoading" stripe style="width: 100%">
          <el-table-column prop="scanner_code" label="扫码枪" width="100" />
          <el-table-column prop="process_type" label="工序" width="100">
            <template #default="{ row }">
              {{ getProcessLabel(row.process_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="barcode" label="条码" min-width="160">
            <template #default="{ row }">
              <span class="mono">{{ row.barcode }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="barcode_type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.barcode_type === 'order' ? 'success' : 'default'">
                {{ row.barcode_type === 'order' ? '订单' : '板件' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="order_no" label="订单号" width="140" />
          <el-table-column prop="scan_time" label="扫码时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.scan_time) }}
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="recordPage"
          v-model:page-size="recordPageSize"
          :total="recordTotal"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          style="margin-top: 16px; justify-content: flex-end"
          @size-change="loadRecords"
          @current-change="loadRecords"
        />
      </el-tab-pane>

      <!-- 实时扫码 -->
      <el-tab-pane label="实时扫码" name="realtime">
        <div class="realtime-info">
          <el-alert type="info" :closable="false">
            当前有 <strong>{{ onlineCount }}</strong> 把扫码枪在线，等待扫码数据推送...
          </el-alert>
        </div>

        <div class="realtime-feed">
          <div v-if="realtimeScans.length === 0" class="no-data">
            <el-icon size="48" color="#c0c4cc"><Aim /></el-icon>
            <p>暂无扫码数据</p>
          </div>
          <div v-else class="scan-feed">
            <div
              v-for="scan in realtimeScans"
              :key="scan.id"
              class="scan-item"
              :class="scan.barcode_type"
            >
              <div class="scan-header">
                <span class="scanner-badge">{{ scan.scanner_code }}</span>
                <span class="process-badge">{{ getProcessLabel(scan.process_type) }}</span>
                <span class="scan-time">{{ formatTime(scan.scan_time) }}</span>
              </div>
              <div class="scan-barcode">{{ scan.barcode }}</div>
              <div class="scan-order" v-if="scan.order_no">订单: {{ scan.order_no }}</div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '添加扫码枪' : '编辑扫码枪'"
      width="520px"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="位置编号" prop="code">
          <el-input v-model="formData.code" placeholder="如 SCAN-01" :disabled="dialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="位置名称" prop="name">
          <el-input v-model="formData.name" placeholder="如 开料工序入口" />
        </el-form-item>
        <el-form-item label="工序类型" prop="process_type">
          <el-select v-model="formData.process_type" placeholder="选择工序" style="width: 100%">
            <el-option
              v-for="p in processTypeList"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="COM端口" prop="com_port">
          <el-select v-model="formData.com_port" placeholder="选择端口" style="width: 100%" clearable>
            <el-option
              v-for="port in portList"
              :key="port.path"
              :label="`${port.path} ${port.manufacturer ? '(' + port.manufacturer + ')' : ''}`"
              :value="port.path"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="波特率">
          <el-select v-model="formData.baud_rate" style="width: 100%">
            <el-option :value="9600" label="9600" />
            <el-option :value="19200" label="19200" />
            <el-option :value="38400" label="38400" />
            <el-option :value="115200" label="115200" />
          </el-select>
        </el-form-item>
        <el-form-item label="终止符">
          <el-select v-model="formData.terminator" style="width: 100%">
            <el-option value="\r\n" label="CRLF (\\r\\n)" />
            <el-option value="\n" label="LF (\\n)" />
            <el-option value="\r" label="CR (\\r)" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDevice">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, MoreFilled, Aim } from '@element-plus/icons-vue'
import { scanner as scannerApi, hardware } from '../../api'

// ==================== 状态 ====================
const activeTab = ref('list')
const loading = ref(false)
const saving = ref(false)
const recordsLoading = ref(false)

// ==================== 设备列表 ====================
const deviceList = ref([])
const searchKeyword = ref('')
const filterStatus = ref('')
const filterProcess = ref('')

// ==================== 工序类型 ====================
const processTypeList = ref([
  { value: 'cutting', label: '开料' },
  { value: 'punching', label: '冲孔' },
  { value: 'welding', label: '焊接' },
  { value: 'assembly', label: '组装' },
  { value: 'polishing', label: '打磨/抛光' },
  { value: 'quality', label: '质检' },
  { value: 'packing', label: '包装' },
  { value: 'warehouse', label: '仓库/入库' },
  { value: 'shipping', label: '出货' },
  { value: 'installation', label: '安装' },
  { value: 'return', label: '退料/返工' }
])

function getProcessLabel(value) {
  return processTypeList.value.find(p => p.value === value)?.label || value || '-'
}

// ==================== 扫码记录 ====================
const recordList = ref([])
const recordDateRange = ref([])
const recordPage = ref(1)
const recordPageSize = ref(50)
const recordTotal = ref(0)

// ==================== 实时扫码 ====================
const realtimeScans = ref([])
const onlineCount = computed(() => deviceList.value.filter(d => d.is_online).length)
let realtimeTimer = null

// ==================== 对话框 ====================
const dialogVisible = ref(false)
const dialogMode = ref('add')
const formRef = ref()
const formData = reactive({
  code: '',
  name: '',
  process_type: '',
  com_port: '',
  baud_rate: 9600,
  terminator: '\r\n',
  remark: ''
})

const formRules = {
  code: [{ required: true, message: '请输入位置编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入位置名称', trigger: 'blur' }],
  process_type: [{ required: true, message: '请选择工序类型', trigger: 'change' }]
}

const portList = ref([])

// ==================== 方法 ====================
async function loadDevices() {
  loading.value = true
  try {
    const params = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (filterProcess.value) params.process_type = filterProcess.value

    const res = await scannerApi.list(params)
    let list = res.data || []

    // 前端过滤关键词
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      list = list.filter(d =>
        d.code.toLowerCase().includes(kw) ||
        d.name.toLowerCase().includes(kw)
      )
    }

    deviceList.value = list
  } catch (err) {
    ElMessage.error('加载设备列表失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

async function loadPorts() {
  try {
    const res = await hardware.listPorts()
    portList.value = res.data || []
  } catch (err) {
    portList.value = []
  }
}

function openAddDialog() {
  dialogMode.value = 'add'
  Object.assign(formData, {
    code: '',
    name: '',
    process_type: '',
    com_port: '',
    baud_rate: 9600,
    terminator: '\r\n',
    remark: ''
  })
  loadPorts()
  dialogVisible.value = true
}

function openEditDialog(device) {
  dialogMode.value = 'edit'
  Object.assign(formData, {
    id: device.id,
    code: device.code,
    name: device.name,
    process_type: device.process_type,
    process_name: device.process_name,
    com_port: device.com_port,
    baud_rate: device.baud_rate,
    terminator: device.terminator || '\r\n',
    remark: device.remark
  })
  loadPorts()
  dialogVisible.value = true
}

async function saveDevice() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (dialogMode.value === 'add') {
      await scannerApi.create(formData)
      ElMessage.success('添加成功')
    } else {
      await scannerApi.update(formData.id, formData)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    loadDevices()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(device) {
  const newStatus = device.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '停用'
  try {
    await scannerApi.update(device.id, { status: newStatus })
    ElMessage.success(`${action}成功`)
    loadDevices()
  } catch (err) {
    ElMessage.error(`${action}失败: ` + err.message)
  }
}

async function confirmDelete(device) {
  try {
    await ElMessageBox.confirm(`确定删除扫码枪 "${device.name}" 吗？此操作不可恢复。`, '删除确认', {
      type: 'warning'
    })
    await scannerApi.delete(device.id)
    ElMessage.success('删除成功')
    loadDevices()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败: ' + err.message)
    }
  }
}

async function loadRecords() {
  recordsLoading.value = true
  try {
    // 随便选一个设备查记录，或者查所有
    const params = {
      page: recordPage.value,
      page_size: recordPageSize.value
    }
    if (recordDateRange.value?.length === 2) {
      params.start_date = recordDateRange.value[0]
      params.end_date = recordDateRange.value[1]
    }

    // 查第一个设备作为示例
    if (deviceList.value.length > 0) {
      const res = await scannerApi.records(deviceList.value[0].id, params)
      recordList.value = res.data?.list || []
      recordTotal.value = res.data?.total || 0
    }
  } catch (err) {
    ElMessage.error('加载记录失败: ' + err.message)
  } finally {
    recordsLoading.value = false
  }
}

function startRealtimePolling() {
  realtimeTimer = setInterval(async () => {
    if (activeTab.value !== 'realtime') return
    try {
      // 查最新扫码记录
      if (deviceList.value.length > 0) {
        const res = await scannerApi.records(deviceList.value[0].id, {
          page: 1,
          page_size: 20
        })
        if (res.data?.list) {
          realtimeScans.value = res.data.list.slice(0, 50)
        }
      }
    } catch (e) { /* ignore */ }
  }, 3000)
}

function formatTime(isoString) {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadDevices()
  startRealtimePolling()
})

onBeforeUnmount(() => {
  if (realtimeTimer) clearInterval(realtimeTimer)
})
</script>

<style scoped>
.scanner-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.main-tabs {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

/* 设备卡片 */
.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.device-card {
  border-left: 4px solid #409eff;
  transition: all 0.3s;
}

.device-card.is-online {
  border-left-color: #67c23a;
}

.device-card.is-offline {
  border-left-color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-code {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-text {
  font-weight: 700;
  font-size: 16px;
  font-family: monospace;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.info-row .label {
  color: #909399;
  min-width: 70px;
}

.info-row .value {
  color: #303133;
}

.info-row .value.mono {
  font-family: monospace;
}

.info-row .value.time {
  font-size: 12px;
  color: #606266;
}

.info-row .value.barcode {
  font-family: monospace;
  color: #409eff;
}

/* 实时扫码 */
.realtime-info {
  margin-bottom: 16px;
}

.realtime-feed {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 360px;
  color: #c0c4cc;
  gap: 12px;
}

.scan-feed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.scan-item {
  background: #fff;
  border-radius: 6px;
  padding: 12px 16px;
  border-left: 3px solid #409eff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.scan-item.order {
  border-left-color: #67c23a;
}

.scan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.scanner-badge {
  background: #ecf5ff;
  color: #409eff;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-family: monospace;
}

.process-badge {
  background: #f0f9eb;
  color: #67c23a;
  padding: 2px 8px;
  border-radius: 4px;
}

.scan-time {
  color: #909399;
  margin-left: auto;
}

.scan-barcode {
  font-family: monospace;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 1px;
}

.scan-order {
  font-size: 12px;
  color: #606266;
  margin-top: 4px;
}
</style>
