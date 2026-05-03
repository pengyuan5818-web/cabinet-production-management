<template>
  <div class="production-page">
    <!-- 扫码区 -->
    <el-card class="scan-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="16">
          <el-input
            v-model="scanBarcode"
            placeholder="扫描或输入条码（订单号/板件条码）"
            size="large"
            @keyup.enter="handleScan"
          >
            <template #prepend>条码</template>
          </el-input>
        </el-col>
        <el-col :span="3">
          <el-button type="primary" size="large" style="width:100%" @click="handleScan" :loading="scanning">
            {{ scanning ? '处理中...' : '扫码' }}
          </el-button>
        </el-col>
        <el-col :span="2">
          <el-button type="success" size="large" style="width:100%" @click="speakLastResult" :disabled="!lastScanResult?.success" title="语音播报">
            🔊播报
          </el-button>
        </el-col>
        <el-col :span="5">
          <el-select v-model="currentOperator" placeholder="选择操作员" size="large" style="width:100%">
            <el-option v-for="op in operators" :key="op.id" :label="op.name" :value="op.id" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 扫码结果提示 -->
    <el-alert v-if="lastScanResult" :title="lastScanResult.message" :type="lastScanResult.success ? 'success' : 'error'"
      show-icon style="margin-bottom:12px" closable @close="lastScanResult=null" />

    <el-row :gutter="12" style="margin-bottom:12px">
      <!-- 待处理任务 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>待处理任务</span>
              <el-tag type="warning">{{ pendingStats.in_progress }} 进行中 / {{ pendingStats.pending }} 待处理</el-tag>
            </div>
          </template>
          <el-table :data="pendingTasks" v-loading="loading" style="height:400px;overflow-y:auto" row-key="order_id">
            <el-table-column prop="order_no" label="订单号" width="120" fixed />
            <el-table-column prop="stage_name" label="阶段" width="100">
              <template #default="{row}">
                <el-tag :type="row.stage_status==='in_progress'?'warning':'info'" size="small">
                  {{ row.stage_name }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="customer_name" label="客户" />
            <el-table-column prop="board_count" label="板件数" width="70" align="center" />
            <el-table-column prop="waiting_since" label="等待开始" width="140">
              <template #default="{row}">
                {{ formatTime(row.waiting_since) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{row}">
                <el-button type="primary" link size="small" @click="openDetail(row.order_id)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="pendingTotal > pageSize"
            :total="pendingTotal"
            v-model:current-page="currentPage"
            :page-size="pageSize"
            layout="prev,pager,next"
            style="margin-top:8px"
            @current-change="loadPending"
          />
        </el-card>
      </el-col>

      <!-- 右侧：阶段定义 + 快捷操作 -->
      <el-col :span="10">
        <!-- 阶段进度总览 -->
        <el-card style="margin-bottom:12px">
          <template #header><span>生产阶段总览</span></template>
          <div class="stage-overview">
            <div
              v-for="(s, i) in stageDefinitions"
              :key="s.stage"
              class="stage-dot-row"
            >
              <span class="stage-index">{{ i + 1 }}</span>
              <span
                class="stage-name"
                :class="{ 'stage-done': getStageStatus(s.stage) === 'completed',
                          'stage-active': getStageStatus(s.stage) === 'in_progress',
                          'stage-pending': getStageStatus(s.stage) === 'pending' }"
              >{{ s.stage_name }}</span>
              <el-tag v-if="getStageStatus(s.stage) === 'completed'" type="success" size="small">完成</el-tag>
              <el-tag v-else-if="getStageStatus(s.stage) === 'in_progress'" type="warning" size="small">进行中</el-tag>
            </div>
          </div>
        </el-card>

        <!-- 快捷扫码 -->
        <el-card>
          <template #header><span>快速扫码</span></template>
          <p style="color:#888;font-size:12px;margin-bottom:8px">
            支持扫描订单二维码或板件条码，自动推进生产阶段
          </p>
          <el-input v-model="quickBarcode" placeholder="ORDER:订单号 或 板件条码" @keyup.enter="handleScan">
            <template #append>
              <el-button @click="handleScan">扫码</el-button>
            </template>
          </el-input>
        </el-card>
      </el-col>
    </el-row>

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="detailDrawer" :title="`订单详情: ${currentOrder?.order_no}`" size="60%" direction="rtl">
      <div v-if="currentOrder">
        <el-descriptions :column="2" border style="margin-bottom:16px">
          <el-descriptions-item label="订单号">{{ currentOrder.order_no }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customer_name }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ currentOrder.customer_phone }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="currentOrder.order_status==='completed'?'success':'primary'">
              {{ currentOrder.order_status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="预计交付">{{ currentOrder.expected_delivery }}</el-descriptions-item>
          <el-descriptions-item label="当前阶段">
            <el-tag type="warning">{{ currentOrder.current_stage_name || '未开始' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 阶段时间线 -->
        <el-steps :space="60" direction="vertical" finish-status="success" style="margin:16px 0">
          <el-step
            v-for="(s, i) in currentOrder.stages"
            :key="s.stage"
            :title="s.stage_name"
            :description="getStepDesc(s)"
            :status="getStepStatus(s.status)"
          />
        </el-steps>

        <!-- 手动更新阶段 -->
        <el-divider>手动更新阶段</el-divider>
        <el-row :gutter="12" align="middle">
          <el-col :span="8">
            <el-select v-model="manualStage" placeholder="选择阶段" style="width:100%">
              <el-option v-for="s in stageDefinitions" :key="s.stage" :label="s.stage_name" :value="s.stage" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="manualStatus" style="width:100%">
              <el-option label="进行中" value="in_progress" />
              <el-option label="完成" value="completed" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-input v-model="manualRemark" placeholder="备注" />
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="handleManualUpdate" :loading="updatingStage">
              更新
            </el-button>
          </el-col>
        </el-row>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { production, hardware } from '../../api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const scanning = ref(false)
const updatingStage = ref(false)
const tasks = ref([])
const pendingTasks = ref([])
const pendingTotal = ref(0)
const currentPage = ref(1)
const pageSize = 20
const scanBarcode = ref('')
const quickBarcode = ref('')
const lastScanResult = ref(null)
const detailDrawer = ref(false)
const currentOrder = ref(null)
const stageDefinitions = ref([])
const currentOperator = ref(null)
const operators = ref([])

const pendingStats = reactive({ in_progress: 0, pending: 0 })

// 加载阶段定义
const loadStages = async () => {
  try {
    const res = await production.stages()
    if (res.success) {
      stageDefinitions.value = res.data || []
    }
  } catch (e) { console.error(e) }
}

// 加载待处理任务
const loadPending = async () => {
  loading.value = true
  try {
    const res = await production.pending({ page: currentPage.value, page_size: pageSize })
    if (res.success) {
      pendingTasks.value = res.data?.list || []
      pendingTotal.value = res.data?.total || 0
      // 统计
      pendingStats.in_progress = pendingTasks.value.filter(t => t.stage_status === 'in_progress').length
      pendingStats.pending = pendingTasks.value.filter(t => t.stage_status === 'pending').length
    }
  } catch (e) {
    ElMessage.error('加载待处理任务失败')
  }
  loading.value = false
}

// 扫码
const handleScan = async () => {
  const barcode = scanBarcode.value.trim() || quickBarcode.value.trim()
  if (!barcode) return
  scanning.value = true
  lastScanResult.value = null
  try {
    const res = await production.scan({
      barcode,
      operator_id: currentOperator.value || undefined,
      operator_name: operators.value.find(o => o.id === currentOperator.value)?.name || '系统'
    })
    lastScanResult.value = res
    if (res.success) {
      ElMessage.success(res.message || '扫码成功')
      scanBarcode.value = ''
      quickBarcode.value = ''
      loadPending()
      // 如果当前打开了详情抽屉，刷新详情
      if (detailDrawer.value && currentOrder.value) {
        openDetail(currentOrder.value.order_id)
      }
    } else {
      ElMessage.error(res.message || '扫码失败')
    }
  } catch (e) {
    lastScanResult.value = { success: false, message: '扫码请求失败: ' + (e.message || e) }
    ElMessage.error('扫码失败')
  }
  scanning.value = false
}

// 语音播报扫码结果
const speakLastResult = async () => {
  if (!lastScanResult.value?.success) return
  const msg = lastScanResult.value.message || '扫码成功'
  try {
    const res = await hardware.playVoice({ text: msg })
    if (!res.success) ElMessage.warning('语音播放失败')
  } catch (e) { console.error(e) }
}

// 打开订单详情
const openDetail = async (orderId) => {
  try {
    const res = await production.track(orderId)
    if (res.success) {
      currentOrder.value = res.data
      detailDrawer.value = true
    } else {
      ElMessage.error(res.message || '加载订单详情失败')
    }
  } catch (e) {
    ElMessage.error('加载订单详情失败')
  }
}

// 手动更新阶段
const handleManualUpdate = async () => {
  if (!currentOrder.value || !manualStage.value) {
    ElMessage.warning('请选择阶段')
    return
  }
  updatingStage.value = true
  try {
    const res = await production.updateStage({
      order_id: currentOrder.value.order_id,
      stage: manualStage.value,
      stage_status: manualStatus.value,
      operator_id: currentOperator.value || undefined,
      operator_name: operators.value.find(o => o.id === currentOperator.value)?.name || '系统',
      remark: manualRemark.value
    })
    if (res.success) {
      ElMessage.success(res.message || '更新成功')
      openDetail(currentOrder.value.order_id)
      loadPending()
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } catch (e) {
    ElMessage.error('更新失败')
  }
  updatingStage.value = false
}

const getStageStatus = (stage) => {
  if (!currentOrder.value) return 'pending'
  const s = currentOrder.value.stages?.find(s => s.stage === stage)
  return s?.status || 'pending'
}

const getStepStatus = (status) => {
  const map = { completed: 'success', in_progress: 'process', pending: 'wait' }
  return map[status] || 'wait'
}

const getStepDesc = (s) => {
  if (s.status === 'completed' && s.completed_at) return `完成于: ${formatTime(s.completed_at)}`
  if (s.status === 'in_progress' && s.started_at) return `开始于: ${formatTime(s.started_at)}`
  if (s.operator_name) return `操作员: ${s.operator_name}`
  return ''
}

const formatTime = (t) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

const manualStage = ref('')
const manualStatus = ref('in_progress')
const manualRemark = ref('')

onMounted(() => {
  loadStages()
  loadPending()
  // 加载员工列表作为操作员
  import('../../api').then(m => {
    m.employee.list({ page_size: 100 }).then(r => {
      if (r.success) operators.value = r.data || []
    })
  })
})
</script>

<style scoped>
.scan-card { margin-bottom: 12px; }
.stage-overview { max-height: 500px; overflow-y: auto; }
.stage-dot-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 0; font-size: 13px;
}
.stage-index {
  width: 20px; height: 20px; border-radius: 50%;
  background: #ddd; color: #666; font-size: 11px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stage-done .stage-index { background: #67c23a; color: #fff; }
.stage-active .stage-index { background: #e6a23c; color: #fff; }
.stage-name { flex: 1; }
.stage-done .stage-name { color: #67c23a; text-decoration: line-through; }
.stage-active .stage-name { color: #e6a23c; font-weight: bold; }
.stage-pending .stage-name { color: #999; }
</style>
