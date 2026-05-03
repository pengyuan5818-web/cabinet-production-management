<template>
  <div class="sort-page">
    <!-- 扫码工具栏 -->
    <el-card class="scan-toolbar" shadow="never">
      <div class="toolbar-row">
        <div class="quick-scan">
          <el-icon class="scan-icon"><Search /></el-icon>
          <el-input
            v-model="quickBarcode"
            placeholder="扫描板件条码..."
            class="quick-scan-input"
            @keyup.enter="handleQuickScan"
            clearable
          >
            <template #append>
              <el-button @click="handleQuickScan" :loading="scanLoading">扫码</el-button>
            </template>
          </el-input>
          <el-tag v-if="currentTask" type="info" class="current-task-tag">
            当前: {{ currentTask.order_no }} ({{ currentTask.sorted_count }}/{{ currentTask.board_count }})
          </el-tag>
        </div>
        <div class="toolbar-actions">
          <el-button type="success" @click="openCreateDialog">
            <el-icon><Plus /></el-icon> 新建分拣任务
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <el-card class="stat-card pending" shadow="hover" @click="activeTab = 'pending'">
        <div class="stat-num">{{ stats.pending }}</div>
        <div class="stat-label">待分拣</div>
      </el-card>
      <el-card class="stat-card in-progress" shadow="hover" @click="activeTab = 'in_progress'">
        <div class="stat-num">{{ stats.in_progress }}</div>
        <div class="stat-label">进行中</div>
      </el-card>
      <el-card class="stat-card completed" shadow="hover" @click="activeTab = 'completed'">
        <div class="stat-num">{{ stats.completed }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
    </div>

    <!-- 标签页 -->
    <el-card>
      <template #header>
        <el-tabs v-model="activeTab" @tab-change="loadTasks">
          <el-tab-pane label="待分拣" name="pending" />
          <el-tab-pane label="进行中" name="in_progress" />
          <el-tab-pane label="已完成" name="completed" />
        </el-tabs>
      </template>

      <!-- 任务列表 -->
      <div v-if="tasks.length === 0 && !loading" class="empty-tip">
        <el-empty description="暂无分拣任务" />
      </div>

      <div v-else class="task-list">
        <el-card
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
          :class="task.status"
          shadow="hover"
          @click="openTaskDetail(task)"
        >
          <template #header>
            <div class="task-header">
              <span class="order-no">{{ task.order_no }}</span>
              <el-tag size="small" :type="statusTagType(task.status)">
                {{ statusLabel(task.status) }}
              </el-tag>
            </div>
          </template>
          <div class="task-body">
            <div class="task-info-row">
              <span class="label">客户:</span>
              <span class="value">{{ task.customer_name || '-' }}</span>
            </div>
            <div class="task-info-row">
              <span class="label">板件:</span>
              <span class="value">
                <span class="sorted-count">{{ task.sorted_count }}</span>
                <span class="sep">/</span>
                <span class="total-count">{{ task.board_count }}</span>
              </span>
            </div>
            <div class="task-info-row">
              <span class="label">库位:</span>
              <span class="value location-code">{{ task.location_code || '待分配' }}</span>
            </div>
            <div class="progress-bar-wrap">
              <el-progress
                :percentage="task.board_count > 0 ? Math.round(task.sorted_count / task.board_count * 100) : 0"
                :color="task.status === 'completed' ? '#67c23a' : '#409eff'"
                :show-text="true"
              />
            </div>
            <div class="task-info-row">
              <span class="label">创建:</span>
              <span class="value time">{{ formatDate(task.created_at) }}</span>
            </div>
            <div v-if="task.assigned_name" class="task-info-row">
              <span class="label">操作员:</span>
              <span class="value">{{ task.assigned_name }}</span>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 分页 -->
      <el-pagination
        v-if="total > 0"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadTasks"
      />
    </el-card>

    <!-- 任务详情抽屉 -->
    <el-drawer v-model="showDetail" title="分拣任务详情" size="600px" direction="rtl">
      <template v-if="detailTask">
        <div class="detail-header">
          <div class="detail-info">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="订单号">{{ detailTask.order_no }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag size="small" :type="statusTagType(detailTask.status)">
                  {{ statusLabel(detailTask.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="客户">{{ detailTask.customer_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="推荐库位">
                <span class="location-code">{{ detailTask.location_code }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="进度" :span="2">
                <el-progress
                  :percentage="detailTask.board_count > 0 ? Math.round(detailTask.sorted_count / detailTask.board_count * 100) : 0"
                  :color="detailTask.status === 'completed' ? '#67c23a' : '#409eff'"
                />
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 扫码区 -->
        <div v-if="detailTask.status !== 'completed'" class="scan-area">
          <el-input
            v-model="scanInput"
            placeholder="扫描板件条码确认入库..."
            size="large"
            @keyup.enter="handleDetailScan"
            clearable
          >
            <template #append>
              <el-button type="primary" @click="handleDetailScan" :loading="detailScanLoading">
                确认入库
              </el-button>
            </template>
          </el-input>
          <div class="scan-tip">扫描板件上的条码，逐件确认入库</div>
        </div>

        <!-- 操作员信息 -->
        <div v-if="detailTask.status !== 'completed'" class="operator-row">
          <el-input v-model="operatorName" placeholder="请输入操作员姓名" style="width: 200px" size="default" />
        </div>

        <!-- 板件清单 -->
        <div class="items-section">
          <div class="items-header">
            <span class="items-title">板件清单 ({{ detailItems.length }}件)</span>
            <span class="items-status">
              <span class="sorted">{{ sortedCount }}</span> / <span>{{ detailItems.length }}</span> 已分拣
            </span>
          </div>
          <el-table :data="detailItems" stripe size="small" max-height="400">
            <el-table-column type="index" width="60" label="#" />
            <el-table-column prop="barcode" label="条码" min-width="160" show-overflow-tooltip />
            <el-table-column prop="board_name" label="板件名" min-width="140" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'sorted'" type="success" size="small">已入库</el-tag>
                <el-tag v-else type="info" size="small">待分拣</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sorted_at" label="入库时间" width="150">
              <template #default="{ row }">
                {{ row.sorted_at ? formatDate(row.sorted_at) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="sorted_by_name" label="操作员" width="100">
              <template #default="{ row }">{{ row.sorted_by_name || '-' }}</template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 全部完成提示 -->
        <div v-if="detailTask.status === 'completed'" class="completed-tip">
          <el-result
            icon="success"
            title="分拣完成！"
            sub-title="所有板件已入库，可进行发货操作"
          >
            <template #extra>
              <el-button type="primary" @click="viewOrderBoards(detailTask.order_id)">
                查看订单板件
              </el-button>
            </template>
          </el-result>
        </div>
      </template>
    </el-drawer>

    <!-- 新建分拣任务对话框 -->
    <el-dialog v-model="showCreate" title="新建分拣任务" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="选择订单">
          <el-select
            v-model="createForm.order_id"
            placeholder="请选择订单"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="o in pendingOrders"
              :key="o.id"
              :label="`${o.order_no} - ${o.customer_name || '未知客户'} (${o.board_count}件)`"
              :value="o.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="success" :loading="creating" @click="handleCreate">
          创建分拣任务
        </el-button>
      </template>
    </el-dialog>

    <!-- 订单板件清单对话框 -->
    <el-dialog v-model="showOrderBoards" title="订单板件清单" width="700px">
      <template v-if="orderBoardsData">
        <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
          <el-descriptions-item label="订单号">{{ orderBoardsData.order_no }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ orderBoardsData.customer_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="总板件">{{ orderBoardsData.total }}件</el-descriptions-item>
          <el-descriptions-item label="已入库">{{ orderBoardsData.sorted_count }}件</el-descriptions-item>
          <el-descriptions-item label="待分拣">
            <span style="color: #e6a23c">{{ orderBoardsData.pending_count }}件</span>
          </el-descriptions-item>
        </el-descriptions>
        <el-table :data="orderBoardsData.boards" stripe size="small" max-height="400">
          <el-table-column type="index" width="50" label="#" />
          <el-table-column prop="barcode" label="条码" min-width="150" show-overflow-tooltip />
          <el-table-column prop="board_name" label="板件名" min-width="130" show-overflow-tooltip />
          <el-table-column prop="current_location" label="当前库位" width="160" show-overflow-tooltip />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.sort_status === 'sorted'" type="success" size="small">在库</el-tag>
              <el-tag v-else type="info" size="small">缺失</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { sort } from '../../api'
import { ElMessage } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const scanLoading = ref(false)
const detailScanLoading = ref(false)
const creating = ref(false)

// 统计
const stats = ref({ pending: 0, in_progress: 0, completed: 0 })

// 列表
const tasks = ref([])
const activeTab = ref('pending')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 当前活跃任务（用于快速扫码）
const currentTask = ref(null)

// 扫码
const quickBarcode = ref('')
const scanInput = ref('')
const operatorName = ref('')

// 详情
const showDetail = ref(false)
const detailTask = ref(null)
const detailItems = ref([])

// 新建
const showCreate = ref(false)
const pendingOrders = ref([])
const createForm = ref({ order_id: '' })

// 订单板件
const showOrderBoards = ref(false)
const orderBoardsData = ref(null)

const sortedCount = computed(() => detailItems.value.filter(i => i.status === 'sorted').length)

const statusLabel = (s) => ({ pending: '待分拣', in_progress: '进行中', completed: '已完成' }[s] || s)
const statusTagType = (s) => ({ pending: 'info', in_progress: 'warning', completed: 'success' }[s] || 'info')

const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN') : '-'

const loadTasks = async () => {
  loading.value = true
  try {
    const res = await sort.tasks({ status: activeTab.value, page: page.value, page_size: pageSize.value })
    if (res.success) {
      tasks.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const loadStats = async () => {
  try {
    const [pending, inProgress, completed] = await Promise.all([
      sort.tasks({ status: 'pending', page: 1, page_size: 1 }),
      sort.tasks({ status: 'in_progress', page: 1, page_size: 1 }),
      sort.tasks({ status: 'completed', page: 1, page_size: 1 })
    ])
    stats.value = {
      pending: pending.data?.total || 0,
      in_progress: inProgress.data?.total || 0,
      completed: completed.data?.total || 0
    }
  } catch (e) { console.error(e) }
}

const loadPendingOrders = async () => {
  try {
    const res = await sort.pendingOrders()
    if (res.success) pendingOrders.value = res.data || []
  } catch (e) { console.error(e) }
}

const openTaskDetail = async (task) => {
  detailTask.value = task
  operatorName.value = ''
  try {
    const res = await sort.taskDetail(task.id)
    if (res.success) {
      detailTask.value = res.data.task
      detailItems.value = res.data.items || []
      currentTask.value = res.data.task
    }
  } catch (e) { ElMessage.error('加载详情失败') }
  showDetail.value = true
}

const handleQuickScan = async () => {
  if (!quickBarcode.value || !currentTask.value) {
    ElMessage.warning('请先选择一个任务或扫描条码')
    return
  }
  await doScan(currentTask.value.id, quickBarcode.value)
  quickBarcode.value = ''
}

const handleDetailScan = async () => {
  if (!scanInput.value) return
  if (!operatorName.value) {
    ElMessage.warning('请输入操作员姓名')
    return
  }
  await doScan(detailTask.value.id, scanInput.value)
  scanInput.value = ''
}

const doScan = async (taskId, barcode) => {
  detailScanLoading.value = true
  try {
    const res = await sort.scanBarcode(taskId, {
      barcode,
      operator_name: operatorName.value || '操作员'
    })
    if (res.success) {
      ElMessage.success(res.message)
      // 刷新详情
      const detailRes = await sort.taskDetail(taskId)
      if (detailRes.success) {
        detailTask.value = detailRes.data.task
        detailItems.value = detailRes.data.items || []
        currentTask.value = detailRes.data.task
      }
      // 更新任务列表
      loadTasks()
      loadStats()
    } else {
      ElMessage.warning(res.message)
    }
  } catch (e) { ElMessage.error('扫码入库失败') }
  detailScanLoading.value = false
}

const openCreateDialog = async () => {
  createForm.value = { order_id: '' }
  await loadPendingOrders()
  showCreate.value = true
}

const handleCreate = async () => {
  if (!createForm.value.order_id) {
    ElMessage.warning('请选择订单')
    return
  }
  creating.value = true
  try {
    const res = await sort.createTask({ order_id: createForm.value.order_id })
    if (res.success) {
      ElMessage.success('分拣任务创建成功')
      showCreate.value = false
      loadTasks()
      loadStats()
    } else {
      ElMessage.error(res.message || '创建失败')
    }
  } catch (e) { ElMessage.error('创建失败') }
  creating.value = false
}

const viewOrderBoards = async (orderId) => {
  try {
    const res = await sort.orderBoards(orderId)
    if (res.success) {
      orderBoardsData.value = res.data
      showOrderBoards.value = true
    }
  } catch (e) { ElMessage.error('加载失败') }
}

onMounted(() => {
  loadTasks()
  loadStats()
})
</script>

<style scoped>
.sort-page {
  padding: 16px;
}
.scan-toolbar {
  margin-bottom: 16px;
}
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.quick-scan {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.scan-icon {
  font-size: 20px;
  color: #409eff;
}
.quick-scan-input {
  max-width: 360px;
}
.current-task-tag {
  font-size: 13px;
}
.toolbar-actions {
  display: flex;
  gap: 8px;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  text-align: center;
  cursor: pointer;
}
.stat-num {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.stat-card.pending .stat-num { color: #909399; }
.stat-card.in-progress .stat-num { color: #e6a23c; }
.stat-card.completed .stat-num { color: #67c23a; }
.empty-tip {
  padding: 40px 0;
}
.task-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.task-card {
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.task-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.task-card.completed {
  opacity: 0.8;
}
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-no {
  font-weight: bold;
  font-size: 15px;
  color: #303133;
}
.task-body {
  padding: 4px 0;
}
.task-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 6px;
}
.task-info-row .label {
  color: #909399;
  flex-shrink: 0;
}
.task-info-row .value {
  color: #303133;
}
.task-info-row .sorted-count {
  color: #67c23a;
  font-weight: bold;
}
.task-info-row .sep {
  color: #909399;
}
.task-info-row .total-count {
  color: #303133;
}
.location-code {
  font-family: monospace;
  color: #409eff;
  font-weight: bold;
}
.task-info-row .time {
  color: #c0c4cc;
  font-size: 12px;
}
.progress-bar-wrap {
  margin: 8px 0;
}
.detail-header {
  margin-bottom: 16px;
}
.scan-area {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}
.scan-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  text-align: center;
}
.operator-row {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.items-section {
  margin-top: 8px;
}
.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.items-title {
  font-weight: bold;
  font-size: 14px;
}
.items-status {
  font-size: 13px;
  color: #909399;
}
.items-status .sorted {
  color: #67c23a;
  font-weight: bold;
}
.completed-tip {
  margin-top: 16px;
}
</style>
