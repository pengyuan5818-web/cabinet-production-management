<template>
  <div class="installation-page">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>安装管理</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 待安装 -->
        <el-tab-pane label="待安装" name="pending">
          <div class="filter-bar">
            <el-input v-model="searchKeyword" placeholder="订单号/客户名" clearable style="width: 220px" />
            <el-button type="primary" @click="loadPending">搜索</el-button>
          </div>
          <el-table :data="pendingOrders" v-loading="loading" style="margin-top: 16px" stripe>
            <el-table-column prop="order_no" label="订单号" width="160" />
            <el-table-column prop="customer_name" label="客户" min-width="140" />
            <el-table-column prop="delivery_address" label="安装地址" min-width="180" show-overflow-tooltip />
            <el-table-column prop="delivery_contact" label="联系人" width="100" />
            <el-table-column prop="delivery_phone" label="联系电话" width="120" />
            <el-table-column prop="warehouse_location_name" label="库位" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.warehouse_location_name" type="warning" size="small">{{ row.warehouse_location_name }}</el-tag>
                <span v-else style="color:#999">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="expected_delivery" label="期望交货" width="110" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="openScheduleDialog(row)">安排安装</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 已安排 -->
        <el-tab-pane label="已安排" name="scheduled">
          <el-table :data="scheduledOrders" v-loading="schedLoading" style="margin-top: 16px" stripe>
            <el-table-column prop="order_no" label="订单号" width="160" />
            <el-table-column prop="customer_name" label="客户" min-width="140" />
            <el-table-column prop="address" label="安装地址" min-width="180" show-overflow-tooltip />
            <el-table-column prop="contact_phone" label="联系电话" width="120" />
            <el-table-column prop="scheduled_date" label="预约日期" width="110" />
            <el-table-column prop="installer_name" label="安装工人" width="100" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 'completed' ? 'success' : 'warning'">
                  {{ row.status === 'completed' ? '已完成' : '待安装' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status !== 'completed'" type="success" size="small" @click="confirmInstallation(row)">确认完成</el-button>
                <span v-else style="color:#67c23a">已完成</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 安排安装对话框 -->
    <el-dialog v-model="showScheduleDialog" title="安排安装" width="500px">
      <el-form :model="scheduleForm" label-width="100px">
        <el-form-item label="订单号">
          <el-input v-model="scheduleForm.order_no" disabled />
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="scheduleForm.customer_name" disabled />
        </el-form-item>
        <el-form-item label="预约日期" required>
          <el-date-picker v-model="scheduleForm.scheduled_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="安装工人">
          <el-select v-model="scheduleForm.installer_id" placeholder="选择工人" style="width: 100%" filterable>
            <el-option v-for="emp in employees" :key="emp.id" :label="emp.name" :value="emp.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="安装地址">
          <el-input v-model="scheduleForm.address" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="scheduleForm.contact_phone" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="scheduleForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showScheduleDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitSchedule">确认安排</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { orders as orderApi } from '../../api'
import { employee } from '../../api'

const activeTab = ref('pending')
const searchKeyword = ref('')
const loading = ref(false)
const schedLoading = ref(false)
const submitting = ref(false)
const showScheduleDialog = ref(false)

const pendingOrders = ref([])
const scheduledOrders = ref([])
const employees = ref([])

const scheduleForm = ref({
  order_id: '', order_no: '', customer_name: '',
  scheduled_date: '', installer_id: '', installer_name: '',
  address: '', contact_phone: '', remark: ''
})

const loadPending = async () => {
  loading.value = true
  try {
    const res = await orderApi.list({ status: 'completed', search: searchKeyword.value, page: 1, page_size: 100 })
    if (res.success) {
      // 过滤出需要安装的
      pendingOrders.value = (res.data.list || []).filter(o => o.installation_required)
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const loadScheduled = async () => {
  schedLoading.value = true
  try {
    const res = await orderApi.list({ status: 'completed', search: '', page: 1, page_size: 100 })
    if (res.success) {
      // 查找有 installation 记录的订单
      const all = res.data.list || []
      const results = []
      for (const o of all) {
        try {
          const r = await orderApi.detail(o.id)
          if (r.success && r.data.installation) {
            results.push({ ...o, ...r.data.installation })
          }
        } catch (e) {}
      }
      scheduledOrders.value = results
    }
  } catch (e) { ElMessage.error('加载失败') }
  schedLoading.value = false
}

const loadEmployees = async () => {
  try {
    const res = await employee.list({ page: 1, page_size: 100 })
    if (res.success) employees.value = res.data.list || []
  } catch (e) {}
}

const openScheduleDialog = (row) => {
  scheduleForm.value = {
    order_id: row.id, order_no: row.order_no, customer_name: row.customer_name,
    scheduled_date: '', installer_id: '', installer_name: '',
    address: row.delivery_address || '', contact_phone: row.delivery_phone || '', remark: ''
  }
  showScheduleDialog.value = true
}

const submitSchedule = async () => {
  if (!scheduleForm.value.scheduled_date) { ElMessage.warning('请选择预约日期'); return }
  submitting.value = true
  try {
    const emp = employees.value.find(e => e.id === scheduleForm.value.installer_id)
    scheduleForm.value.installer_name = emp?.name || ''
    const res = await orderApi.createInstallation(scheduleForm.value.order_id, {
      scheduled_date: scheduleForm.value.scheduled_date,
      installer_id: scheduleForm.value.installer_id,
      installer_name: scheduleForm.value.installer_name,
      address: scheduleForm.value.address,
      contact_phone: scheduleForm.value.contact_phone,
      remark: scheduleForm.value.remark
    })
    if (res.success) {
      ElMessage.success('安装安排成功')
      showScheduleDialog.value = false
      loadPending()
      loadScheduled()
    } else {
      ElMessage.error(res.message || '安排失败')
    }
  } catch (e) { ElMessage.error('安排失败') }
  submitting.value = false
}

const confirmInstallation = async (row) => {
  try {
    const res = await orderApi.confirmInstallation(row.order_id, {
      installation_result: 'completed', remark: ''
    })
    if (res.success) {
      ElMessage.success('安装已完成')
      loadScheduled()
    } else {
      ElMessage.error(res.message || '确认失败')
    }
  } catch (e) { ElMessage.error('确认失败') }
}

onMounted(() => {
  loadPending()
  loadScheduled()
  loadEmployees()
})
</script>

<style scoped>
.installation-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 10px; align-items: center; }
</style>
