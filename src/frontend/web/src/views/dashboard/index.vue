<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon orders"><el-icon><Document /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.orders.total }}</div>
              <div class="stat-label">总订单</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon producing"><el-icon><Loading /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.orders.producing }}</div>
              <div class="stat-label">生产中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon customers"><el-icon><User /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.customers.total }}</div>
              <div class="stat-label">客户数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon pending"><el-icon><Money /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">¥{{ stats.orders.pending || 0 }}</div>
              <div class="stat-label">应收款</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card>
          <template #header><span>近期订单</span></template>
          <el-table :data="recentOrders" style="width: 100%">
            <el-table-column prop="order_no" label="订单号" width="150" />
            <el-table-column prop="customer_name" label="客户" />
            <el-table-column prop="total_amount" label="金额" width="100">
              <template #default="{ row }">¥{{ row.total_amount }}</template>
            </el-table-column>
            <el-table-column prop="order_status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.order_status)">{{ row.order_status_text }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><span>快捷操作</span></template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/orders')">新建订单</el-button>
            <el-button type="success" @click="$router.push('/warehouse')">入库操作</el-button>
            <el-button type="warning" @click="$router.push('/production')">生产扫描</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { dashboard } from '../../api'
import { Document, Loading, User, Money } from '@element-plus/icons-vue'

const stats = reactive({
  orders: { total: 0, producing: 0, pending: 0 },
  customers: { total: 0 }
})
const recentOrders = ref([])

onMounted(async () => {
  const res = await dashboard.summary()
  if (res.success) {
    Object.assign(stats, res.data)
    recentOrders.value = res.data.recent_orders || []
  }
})

const getStatusType = (status) => {
  const map = { pending: 'info', producing: 'warning', completed: 'success' }
  return map[status] || 'info'
}
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
}
.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}
.stat-icon.orders { background: #409eff; }
.stat-icon.producing { background: #e6a23c; }
.stat-icon.customers { background: #67c23a; }
.stat-icon.pending { background: #f56c6c; }
.stat-value {
  font-size: 28px;
  font-weight: bold;
}
.stat-label {
  color: #909399;
  font-size: 14px;
}
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quick-actions .el-button {
  width: 100%;
}
</style>
