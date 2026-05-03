<template>
  <div class="track-page">
    <div class="page-header">
      <h2 class="page-title">订单追踪</h2>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-input
        v-model="orderNo"
        placeholder="请输入订单号"
        style="width: 260px"
        clearable
        @keyup.enter="loadTrack"
      />
      <el-button type="primary" @click="loadTrack">查询</el-button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon> 加载中...
    </div>

    <!-- 追踪结果 -->
    <div v-else-if="trackData" class="track-result">
      <!-- 订单信息 -->
      <div class="order-info-card">
        <div class="order-info-header">
          <span class="order-no">{{ trackData.order_no }}</span>
          <el-tag :type="statusMap[trackData.order_status]?.type">
            {{ statusMap[trackData.order_status]?.text }}
          </el-tag>
        </div>
        <div class="order-info-body">
          <div class="info-item">
            <span class="label">客户：</span><span>{{ trackData.customer_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">金额：</span><span>¥{{ formatMoney(trackData.total_amount) }}</span>
          </div>
          <div class="info-item">
            <span class="label">创建时间：</span><span>{{ trackData.created_at }}</span>
          </div>
          <div class="info-item">
            <span class="label">预计交付：</span><span>{{ trackData.expected_delivery }}</span>
          </div>
        </div>
      </div>

      <!-- 生产阶段时间线 -->
      <div class="timeline-section">
        <h3>生产进度</h3>
        <el-steps :active="activeStepIndex" align-center finish-status="success" class="production-steps">
          <el-step
            v-for="(stage, idx) in trackData.stages"
            :key="stage.stage"
            :title="stage.stage_name"
            :description="stage.completed_at ? stage.completed_at.slice(0, 10) : ''"
          />
        </el-steps>
      </div>

      <!-- 阶段详情 -->
      <div class="stages-detail">
        <h3>阶段详情</h3>
        <el-table :data="trackData.stages" stripe>
          <el-table-column prop="stage_name" label="阶段" width="140" />
          <el-table-column prop="stage_status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.stage_status === 'completed' ? 'success' : row.stage_status === 'in_progress' ? 'primary' : 'info'" size="small">
                {{ row.stage_status === 'completed' ? '已完成' : row.stage_status === 'in_progress' ? '进行中' : '待开始' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="started_at" label="开始时间" width="160" />
          <el-table-column prop="completed_at" label="完成时间" width="160" />
          <el-table-column prop="operator_name" label="操作人" />
        </el-table>
      </div>

      <!-- 物流信息 -->
      <div v-if="trackData.shipments?.length" class="shipments-section">
        <h3>物流信息</h3>
        <el-table :data="trackData.shipments" stripe>
          <el-table-column prop="shipment_no" label="发货单号" width="180" />
          <el-table-column prop="carrier" label="物流商" width="120" />
          <el-table-column prop="tracking_no" label="运单号" width="180" />
          <el-table-column prop="shipped_at" label="发货时间" width="160" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="searched" class="empty-state">
      <p>未找到订单信息</p>
    </div>

    <!-- 默认提示 -->
    <div v-else class="empty-state">
      <p>输入订单号查询生产进度</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const orderNo = ref(route.query.orderNo || '')
const trackData = ref(null)
const loading = ref(false)
const searched = ref(false)

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待确认', type: 'warning' },
  producing: { text: '生产中', type: '' },
  shipped: { text: '已发货', type: 'primary' },
  installed: { text: '已安装', type: '' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' }
}

function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }
function getHeaders() { return { Authorization: `Bearer ${localStorage.getItem('dealer_token')}` } }

const activeStepIndex = computed(() => {
  if (!trackData.value?.stages) return 0
  const stages = trackData.value.stages
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].stage_status === 'completed') return i + 1
    if (stages[i].stage_status === 'in_progress') return i
  }
  return 0
})

async function loadTrack() {
  if (!orderNo.value.trim()) return ElMessage.warning('请输入订单号')
  loading.value = true
  searched.value = true
  trackData.value = null
  try {
    const res = await axios.get(`/dealer/v1/orders/${orderNo.value}/track`, { headers: getHeaders() })
    if (res.data.success) {
      trackData.value = res.data.data
    } else {
      ElMessage.warning(res.data.message || '未找到订单')
    }
  } catch (err) {
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (orderNo.value) loadTrack()
})
</script>

<style scoped>
.track-page { padding: 0; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 22px; color: #333; }
.search-bar { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 10px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.loading-state, .empty-state { background: #fff; border-radius: 10px; padding: 60px; text-align: center; color: #888; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.order-info-card { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.order-info-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.order-no { font-size: 18px; font-weight: bold; color: #333; }
.order-info-body { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }
.info-item .label { color: #888; }
.timeline-section, .stages-detail, .shipments-section { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
h3 { font-size: 16px; margin-bottom: 16px; color: #333; }
.production-steps { margin: 20px 0; }
</style>
