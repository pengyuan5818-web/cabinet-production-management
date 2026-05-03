<template>
  <div class="cost-page">
    <div class="page-header">
      <h2>成本核算</h2>
      <div class="header-actions">
        <el-button type="primary" @click="collectOverhead">归集本月费用</el-button>
        <el-button type="success" @click="allocateCosts">分配制造费用</el-button>
        <el-button type="warning" @click="recalculateAll">重算订单成本</el-button>
      </div>
    </div>

    <!-- 月份选择 -->
    <div class="month-selector">
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        placeholder="选择月份"
        value-format="YYYY-MM"
        style="width: 160px"
        @change="loadSummary"
      />
      <el-button type="primary" @click="loadSummary">查询</el-button>
    </div>

    <!-- 月度汇总卡片 -->
    <el-row :gutter="16" class="stat-cards" v-loading="summaryLoading">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value">{{ formatMoney(stats.order?.total_sales || 0) }}</div>
          <div class="stat-label">销售收入</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value danger">{{ formatMoney(stats.order?.total_cost || 0) }}</div>
          <div class="stat-label">总成本</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value success">{{ formatMoney(stats.order?.total_profit || 0) }}</div>
          <div class="stat-label">毛利润</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-value" :style="{ color: marginColor }">
            {{ (stats.order?.avg_margin || 0).toFixed(1) }}%
          </div>
          <div class="stat-label">平均毛利率</div>
        </div>
      </el-col>
    </el-row>

    <!-- 成本结构分析 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <div class="panel">
          <h3>📊 成本结构（料/工/费）</h3>
          <div v-if="ratioData.total > 0">
            <div class="ratio-bar">
              <div class="ratio-item material" :style="{ width: ratioData.material + '%' }">
                材料 {{ ratioData.material }}%
              </div>
              <div class="ratio-item labor" :style="{ width: ratioData.labor + '%' }">
                人工 {{ ratioData.labor }}%
              </div>
              <div class="ratio-item overhead" :style="{ width: ratioData.overhead + '%' }">
                费用 {{ ratioData.overhead }}%
              </div>
            </div>
            <div class="ratio-legend">
              <span><i class="dot material"></i>材料 {{ formatMoney(stats.order?.total_material || 0) }} 元</span>
              <span><i class="dot labor"></i>人工 {{ formatMoney(stats.order?.total_labor || 0) }} 元</span>
              <span><i class="dot overhead"></i>制造费用 {{ formatMoney(stats.order?.total_overhead || 0) }} 元</span>
            </div>
          </div>
          <div v-else class="empty-tip">暂无成本数据</div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="panel">
          <h3>👷 人工成本汇总</h3>
          <div class="labor-summary">
            <div class="summary-item">
              <span class="label">生产人数</span>
              <span class="value">{{ stats.labor?.worker_count || 0 }} 人</span>
            </div>
            <div class="summary-item">
              <span class="label">总工时</span>
              <span class="value">{{ (stats.labor?.total_hours || 0).toFixed(1) }} h</span>
            </div>
            <div class="summary-item">
              <span class="label">人工总成本</span>
              <span class="value danger">{{ formatMoney(stats.labor?.total_labor_cost || 0) }} 元</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" style="margin-top: 16px" class="cost-tabs">
      <!-- 成本明细表 -->
      <el-tab-pane label="成本明细表" name="detail">
        <div class="search-bar">
          <el-input v-model="searchForm.orderNo" placeholder="订单号" style="width: 180px" clearable />
          <el-button @click="loadDetail(1)">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </div>
        <el-table :data="detailList" v-loading="detailLoading" stripe>
          <el-table-column prop="order_no" label="订单号" width="160" />
          <el-table-column label="材料成本" width="120">
            <template #default="{ row }">{{ formatMoney(row.material_cost) }}</template>
          </el-table-column>
          <el-table-column label="人工成本" width="120">
            <template #default="{ row }">{{ formatMoney(row.labor_cost) }}</template>
          </el-table-column>
          <el-table-column label="制造费用" width="120">
            <template #default="{ row }">{{ formatMoney(row.manufacturing_overhead) }}</template>
          </el-table-column>
          <el-table-column label="总成本" width="120">
            <template #default="{ row }" class="danger">{{ formatMoney(row.total_cost) }}</template>
          </el-table-column>
          <el-table-column label="售价" width="120">
            <template #default="{ row }">{{ formatMoney(row.order_amount) }}</template>
          </el-table-column>
          <el-table-column label="毛利" width="100">
            <template #default="{ row }">
              <span :style="{ color: row.gross_profit >= 0 ? '#67c23a' : '#f56c6c', fontWeight: 'bold' }">
                {{ formatMoney(row.gross_profit) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="毛利率" width="90">
            <template #default="{ row }">
              <span :style="{ color: row.gross_margin >= 30 ? '#67c23a' : row.gross_margin >= 15 ? '#e6a23c' : '#f56c6c' }">
                {{ (row.gross_margin || 0).toFixed(1) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="cost_period" label="月份" width="90" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewCostDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination">
          <el-pagination
            v-model:current-page="detailPage"
            :page-size="detailPageSize"
            :total="detailTotal"
            layout="total, prev, pager, next"
            @current-change="loadDetail"
          />
        </div>
      </el-tab-pane>

      <!-- 毛利率排行 -->
      <el-tab-pane label="毛利率排行" name="ranking">
        <el-table :data="rankingList" stripe v-loading="rankingLoading">
          <el-table-column type="index" label="排名" width="60" />
          <el-table-column prop="order_no" label="订单号" width="160" />
          <el-table-column label="总成本" width="120">
            <template #default="{ row }">{{ formatMoney(row.total_cost) }}</template>
          </el-table-column>
          <el-table-column label="售价" width="120">
            <template #default="{ row }">{{ formatMoney(row.order_amount) }}</template>
          </el-table-column>
          <el-table-column label="毛利" width="120">
            <template #default="{ row }">{{ formatMoney(row.gross_profit) }}</template>
          </el-table-column>
          <el-table-column label="毛利率" width="100">
            <template #default="{ row }">
              <el-tag :type="row.gross_margin >= 30 ? 'success' : row.gross_margin >= 15 ? 'warning' : 'danger'">
                {{ (row.gross_margin || 0).toFixed(1) }}%
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 费用项目池 -->
      <el-tab-pane label="费用项目池" name="pools">
        <div class="category-filter">
          <el-radio-group v-model="poolCategory" @change="loadPools">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="manufacturing">制造费用</el-radio-button>
            <el-radio-button label="management">管理费用</el-radio-button>
            <el-radio-button label="sales">销售费用</el-radio-button>
          </el-radio-group>
        </div>
        <el-table :data="poolList" stripe>
          <el-table-column prop="pool_code" label="项目代码" width="120" />
          <el-table-column prop="pool_name" label="项目名称" />
          <el-table-column prop="pool_category" label="类别" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ categoryMap[row.pool_category] || row.pool_category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="allocation_base" label="分配基准" width="120">
            <template #default="{ row }">{{ baseMap[row.allocation_base] || row.allocation_base }}</template>
          </el-table-column>
          <el-table-column prop="is_active" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'" size="small">{{ row.is_active ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 工时记录 -->
      <el-tab-pane label="工时记录" name="workhours">
        <div class="search-bar">
          <el-select v-model="whForm.employeeId" placeholder="选择员工" style="width: 160px" clearable>
            <el-option v-for="e in employees" :key="e.id" :label="e.real_name" :value="e.id" />
          </el-select>
          <el-date-picker v-model="whForm.month" type="month" placeholder="月份" value-format="YYYY-MM" style="width: 150px" />
          <el-button @click="loadWorkHours">查询</el-button>
          <el-button type="primary" @click="showAddHours = true">+ 记工时</el-button>
        </div>
        <el-table :data="workHoursList" stripe>
          <el-table-column prop="record_no" label="记录号" width="160" />
          <el-table-column prop="employee_name" label="员工" width="100" />
          <el-table-column prop="order_no" label="订单号" width="150" />
          <el-table-column prop="production_stage" label="阶段" width="100" />
          <el-table-column prop="work_date" label="日期" width="120" />
          <el-table-column prop="hours" label="工时(h)" width="80" />
          <el-table-column prop="work_type" label="工时类型" width="80" />
          <el-table-column prop="station" label="工位" width="100" />
          <el-table-column prop="labor_cost" label="人工成本" width="100">
            <template #default="{ row }">{{ formatMoney(row.labor_cost) }}</template>
          </el-table-column>
        </el-table>
        <div class="pagination">
          <el-pagination
            v-model:current-page="whPage"
            :page-size="whPageSize"
            :total="whTotal"
            layout="total, prev, pager, next"
            @current-change="loadWorkHours"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加工时对话框 -->
    <el-dialog v-model="showAddHours" title="记录工时" width="500px">
      <el-form :model="hoursForm" label-width="100px">
        <el-form-item label="员工" required>
          <el-select v-model="hoursForm.employee_id" placeholder="选择员工" style="width:100%">
            <el-option v-for="e in employees" :key="e.id" :label="e.real_name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="hoursForm.order_no" placeholder="可留空" />
        </el-form-item>
        <el-form-item label="生产阶段">
          <el-input v-model="hoursForm.production_stage" placeholder="如：切割/组装/喷涂" />
        </el-form-item>
        <el-form-item label="工作日期" required>
          <el-date-picker v-model="hoursForm.work_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="工时" required>
          <el-input-number v-model="hoursForm.hours" :min="0.5" :max="24" :step="0.5" style="width:100%" />
        </el-form-item>
        <el-form-item label="工时类型">
          <el-select v-model="hoursForm.work_type" style="width:100%">
            <el-option label="正常" value="正常" />
            <el-option label="加班" value="加班" />
            <el-option label="调休" value="调休" />
          </el-select>
        </el-form-item>
        <el-form-item label="工位">
          <el-input v-model="hoursForm.station" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="hoursForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddHours = false">取消</el-button>
        <el-button type="primary" :loading="submittingHours" @click="submitHours">保存</el-button>
      </template>
    </el-dialog>

    <!-- 成本详情对话框 -->
    <el-dialog v-model="showCostDetail" title="订单成本详情" width="700px">
      <div v-if="costDetail">
        <el-descriptions :column="2" border style="margin-bottom: 16px">
          <el-descriptions-item label="订单号">{{ costDetail.order_no }}</el-descriptions-item>
          <el-descriptions-item label="成本月份">{{ costDetail.cost_period }}</el-descriptions-item>
          <el-descriptions-item label="材料成本">{{ formatMoney(costDetail.material_cost) }}</el-descriptions-item>
          <el-descriptions-item label="人工成本">{{ formatMoney(costDetail.labor_cost) }}</el-descriptions-item>
          <el-descriptions-item label="制造费用">{{ formatMoney(costDetail.manufacturing_overhead) }}</el-descriptions-item>
          <el-descriptions-item label="总成本">{{ formatMoney(costDetail.total_cost) }}</el-descriptions-item>
          <el-descriptions-item label="订单售价">{{ formatMoney(costDetail.order_amount) }}</el-descriptions-item>
          <el-descriptions-item label="毛利率">{{ (costDetail.gross_margin || 0).toFixed(1) }}%</el-descriptions-item>
        </el-descriptions>

        <h4 v-if="costDetail.material_details?.length">材料明细</h4>
        <el-table v-if="costDetail.material_details?.length" :data="costDetail.material_details" size="small">
          <el-table-column prop="material_name" label="物料" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit_price" label="单价" width="100">
            <template #default="{ row }">{{ formatMoney(row.unit_price) }}</template>
          </el-table-column>
          <el-table-column prop="total" label="金额" width="100">
            <template #default="{ row }">{{ formatMoney(row.total) }}</template>
          </el-table-column>
        </el-table>

        <h4 v-if="costDetail.labor_details?.length" style="margin-top:16px">人工明细</h4>
        <el-table v-if="costDetail.labor_details?.length" :data="costDetail.labor_details" size="small">
          <el-table-column prop="employee_name" label="员工" />
          <el-table-column prop="hours" label="工时" width="80" />
          <el-table-column prop="cost" label="成本" width="100">
            <template #default="{ row }">{{ formatMoney(row.cost) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showCostDetail = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const api = axios.create({ baseURL: '/' })

const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const activeTab = ref('detail')
const summaryLoading = ref(false)
const detailLoading = ref(false)
const rankingLoading = ref(false)
const submittingHours = ref(false)

const stats = ref({ labor: {}, overhead: [], order: {} })
const ratioData = ref({ material: 0, labor: 0, overhead: 0, total: 0 })
const detailList = ref([])
const detailPage = ref(1)
const detailPageSize = ref(20)
const detailTotal = ref(0)
const rankingList = ref([])
const poolList = ref([])
const poolCategory = ref('')
const workHoursList = ref([])
const whPage = ref(1)
const whPageSize = ref(50)
const whTotal = ref(0)
const employees = ref([])
const showAddHours = ref(false)
const showCostDetail = ref(false)
const costDetail = ref(null)

const hoursForm = reactive({
  employee_id: null, order_no: '', production_stage: '', work_date: '', hours: 8, work_type: '正常', station: '', remark: ''
})
const whForm = reactive({ employeeId: '', month: '' })
const searchForm = reactive({ orderNo: '' })

const categoryMap = { manufacturing: '制造费用', management: '管理费用', sales: '销售费用' }
const baseMap = { labor_hours: '人工工时', machine_hours: '机时', quantity: '产量', weight: '重量', area: '面积' }

const marginColor = computed(() => {
  const m = stats.value.order?.avg_margin || 0
  if (m >= 30) return '#67c23a'
  if (m >= 15) return '#e6a23c'
  return '#f56c6c'
})

function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }
function auth() { return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } } }

async function loadSummary() {
  if (!selectedMonth.value) return
  summaryLoading.value = true
  try {
    const [monthRes, ratioRes, laborRes] = await Promise.all([
      api.get(`/api/cost/report/monthly-summary?cost_month=${selectedMonth.value}`, auth()),
      api.get(`/api/cost/report/ratio?cost_month=${selectedMonth.value}`, auth()),
      api.get(`/api/cost/work-hours?cost_month=${selectedMonth.value}`, auth())
    ])
    if (monthRes.data.success) {
      stats.value = monthRes.data.data
      const t = stats.value.order
      if (t) {
        stats.value.order.total_profit = (parseFloat(t.total_sales || 0) - parseFloat(t.total_cost || 0)).toFixed(2)
      }
    }
    if (ratioRes.data.success) ratioData.value = ratioRes.data.data
  } catch { console.error('加载汇总失败') }
  finally { summaryLoading.value = false }
}

async function loadDetail(p = 1) {
  detailPage.value = p
  detailLoading.value = true
  try {
    const params = { page: p, page_size: detailPageSize.value }
    if (searchForm.orderNo) params.order_no = searchForm.orderNo
    if (selectedMonth.value) params.cost_month = selectedMonth.value
    const res = await api.get('/api/cost/report/detail', { params, ...auth() })
    if (res.data.success) {
      detailList.value = res.data.data.list || []
      detailTotal.value = res.data.data.total || 0
    }
  } catch { ElMessage.error('加载失败') }
  finally { detailLoading.value = false }
}

function resetSearch() {
  searchForm.orderNo = ''
  loadDetail(1)
}

async function loadRanking() {
  rankingLoading.value = true
  try {
    const res = await api.get(`/api/cost/report/margin-ranking?cost_month=${selectedMonth.value}`, auth())
    if (res.data.success) rankingList.value = res.data.data || []
  } catch {}
  finally { rankingLoading.value = false }
}

async function loadPools() {
  const params = {}
  if (poolCategory.value) params.category = poolCategory.value
  const res = await api.get('/api/cost/overhead-pool', { params, ...auth() })
  if (res.data.success) poolList.value = res.data.data || []
}

async function loadWorkHours(p = 1) {
  whPage.value = p
  const params = { page: p, page_size: whPageSize.value }
  if (whForm.employeeId) params.employee_id = whForm.employeeId
  if (whForm.month) params.cost_month = whForm.month
  const res = await api.get('/api/cost/work-hours', { params, ...auth() })
  if (res.data.success) {
    workHoursList.value = res.data.data?.list || []
    whTotal.value = res.data.data?.total || 0
  }
}

async function loadEmployees() {
  const res = await api.get('/api/employees?page=1&page_size=200', auth())
  if (res.data.success) employees.value = res.data.data?.list || []
}

async function submitHours() {
  if (!hoursForm.employee_id || !hoursForm.work_date || !hoursForm.hours) {
    return ElMessage.warning('请填写必填项')
  }
  const emp = employees.value.find(e => e.id === hoursForm.employee_id)
  submittingHours.value = true
  try {
    const res = await api.post('/api/cost/work-hours', {
      ...hoursForm,
      employee_name: emp?.real_name || '',
      hours: parseFloat(hoursForm.hours)
    }, auth())
    if (res.data.success) {
      ElMessage.success('工时已记录')
      showAddHours.value = false
      Object.assign(hoursForm, { employee_id: null, order_no: '', production_stage: '', work_date: '', hours: 8, work_type: '正常', station: '', remark: '' })
      loadWorkHours()
    }
  } catch { ElMessage.error('保存失败') }
  finally { submittingHours.value = false }
}

async function viewCostDetail(row) {
  const res = await api.get(`/api/cost/order-cost/${row.order_id}`, auth())
  if (res.data.success) {
    costDetail.value = res.data.data
    showCostDetail.value = true
  }
}

async function collectOverhead() {
  if (!selectedMonth.value) return ElMessage.warning('请先选择月份')
  await ElMessageBox.confirm(`归集 ${selectedMonth.value} 的制造费用？`, '确认')
  try {
    const res = await api.post(`/api/cost/collect-overhead/${selectedMonth.value}`, {}, auth())
    if (res.data.success) { ElMessage.success('归集完成'); loadSummary() }
  } catch (e) { ElMessage.error(e.response?.data?.message || '归集失败') }
}

async function allocateCosts() {
  if (!selectedMonth.value) return ElMessage.warning('请先选择月份')
  await ElMessageBox.confirm(`将 ${selectedMonth.value} 的制造费用分配到订单？`, '确认')
  try {
    const res = await api.post(`/api/cost/allocate/${selectedMonth.value}`, {}, auth())
    if (res.data.success) { ElMessage.success('分配完成'); loadSummary() }
  } catch (e) { ElMessage.error(e.response?.data?.message || '分配失败') }
}

async function recalculateAll() {
  if (!selectedMonth.value) return ElMessage.warning('请先选择月份')
  await ElMessageBox.confirm(`重算 ${selectedMonth.value} 所有订单成本？`, '确认')
  try {
    const res = await api.post(`/api/cost/calculate/batch?cost_month=${selectedMonth.value}`, {}, auth())
    if (res.data.success) { ElMessage.success('重算完成'); loadDetail() }
  } catch (e) { ElMessage.error(e.response?.data?.message || '重算失败') }
}

onMounted(async () => {
  loadSummary()
  loadDetail()
  loadRanking()
  loadPools()
  loadEmployees()
})
</script>

<style scoped>
.cost-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 20px; }
.header-actions { display: flex; gap: 8px; }
.month-selector { background: #fff; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; gap: 10px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-cards { }
.stat-card { background: #fff; border-radius: 10px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-value { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
.stat-value.danger { color: #f56c6c; }
.stat-value.success { color: #67c23a; }
.stat-label { font-size: 13px; color: #888; }
.panel { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.panel h3 { font-size: 15px; margin-bottom: 16px; color: #333; }
.ratio-bar { display: flex; height: 36px; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.ratio-item { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: bold; transition: width 0.3s; }
.ratio-item.material { background: #409eff; }
.ratio-item.labor { background: #e6a23c; }
.ratio-item.overhead { background: #909399; }
.ratio-legend { display: flex; gap: 16px; font-size: 13px; }
.ratio-legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
.ratio-legend .dot.material { background: #409eff; }
.ratio-legend .dot.labor { background: #e6a23c; }
.ratio-legend .dot.overhead { background: #909399; }
.empty-tip { color: #999; text-align: center; padding: 20px; }
.labor-summary { display: flex; flex-direction: column; gap: 10px; }
.summary-item { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.summary-item:last-child { border-bottom: none; }
.summary-item .label { color: #888; }
.summary-item .value.danger { color: #f56c6c; font-weight: bold; }
.search-bar { background: #fff; border-radius: 10px; padding: 12px 16px; margin-bottom: 12px; display: flex; gap: 10px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.category-filter { margin-bottom: 12px; }
.cost-tabs { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.pagination { display: flex; justify-content: flex-end; margin-top: 12px; }
h4 { font-size: 14px; margin-bottom: 8px; color: #333; }
</style>
