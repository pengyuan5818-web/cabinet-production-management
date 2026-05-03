path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\report\index.vue'

template = '''<template>
  <div class="report-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">报表统计</span>
          <el-radio-group v-model="activeTab" size="default">
            <el-radio-button value="production">生产报表</el-radio-button>
            <el-radio-button value="sales">销售报表</el-radio-button>
            <el-radio-button value="warehouse">库存报表</el-radio-button>
            <el-radio-button value="finance">财务报表</el-radio-button>
            <el-radio-button value="attendance">考勤报表</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 生产报表 -->
      <div v-show="activeTab === 'production'" class="tab-content">
        <el-radio-group v-model="productionSub" size="small" style="margin-bottom: 16px">
          <el-radio-button value="daily">日报表</el-radio-button>
          <el-radio-button value="stages">阶段统计</el-radio-button>
        </el-radio-group>

        <div v-if="productionSub === 'daily'">
          <el-form :inline="true" class="filter-form">
            <el-form-item label="日期范围">
              <el-date-picker v-model="prodDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 260px" />
            </el-form-item>
            <el-form-item label="生产车间">
              <el-select v-model="prodWorkshop" placeholder="全部" clearable style="width: 140px">
                <el-option label="一车间" value="workshop_1" />
                <el-option label="二车间" value="workshop_2" />
                <el-option label="三车间" value="workshop_3" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadProdDaily">查询</el-button>
              <el-button @click="resetProdDaily">重置</el-button>
              <el-button type="success" @click="exportProdDaily">导出</el-button>
            </el-form-item>
          </el-form>
          <el-row :gutter="16" class="summary-cards">
            <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">完成数量</div><div class="stat-value primary">{{ prodSummary.completed_count || 0 }}</div></div></el-card></el-col>
            <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">进行中</div><div class="stat-value warning">{{ prodSummary.in_progress_count || 0 }}</div></div></el-card></el-col>
            <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">合格率</div><div class="stat-value success">{{ prodSummary.pass_rate || 0 }}%</div></div></el-card></el-col>
            <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">日均产量</div><div class="stat-value">{{ prodSummary.daily_avg || 0 }}</div></div></el-card></el-col>
          </el-row>
          <el-table v-loading="prodLoading" :data="prodDaily" stripe border class="mt-16">
            <el-table-column prop="date" label="日期" width="120" fixed />
            <el-table-column prop="workshop" label="车间" width="100" />
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="product_name" label="产品名称" min-width="160" />
            <el-table-column prop="planned_count" label="计划数量" width="100" align="right" />
            <el-table-column prop="completed_count" label="完成数量" width="100" align="right" />
            <el-table-column prop="in_progress_count" label="进行中" width="100" align="right" />
            <el-table-column prop="defect_count" label="不良数" width="90" align="right" />
            <el-table-column prop="pass_rate" label="合格率" width="90">
              <template #default="{ row }"><el-tag :type="row.pass_rate >= 95 ? 'success' : row.pass_rate >= 85 ? 'warning' : 'danger'" size="small">{{ row.pass_rate }}%</el-tag></template>
            </el-table-column>
            <el-table-column prop="operator" label="操作员" width="100" />
          </el-table>
          <el-pagination v-if="prodTotal > 0" v-model:current-page="prodPage" v-model:page-size="prodPageSize" :total="prodTotal" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" class="mt-16" @size-change="loadProdDaily" @current-change="loadProdDaily" />
        </div>

        <div v-if="productionSub === 'stages'">
          <el-form :inline="true" class="filter-form">
            <el-form-item label="统计周期">
              <el-date-picker v-model="stageDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 260px" />
            </el-form-item>
            <el-form-item label="订单阶段">
              <el-select v-model="stageType" placeholder="全部" clearable style="width: 140px">
                <el-option label="下料" value="cutting" />
                <el-option label="封边" value="edge" />
                <el-option label="打孔" value="drilling" />
                <el-option label="组装" value="assembly" />
                <el-option label="质检" value="qc" />
                <el-option label="包装" value="packaging" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadProdStages">查询</el-button>
              <el-button @click="resetProdStages">重置</el-button>
            </el-form-item>
          </el-form>
          <el-table v-loading="stageLoading" :data="prodStages" stripe border class="mt-16">
            <el-table-column prop="stage" label="生产阶段" width="120" fixed />
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="product_name" label="产品名称" min-width="160" />
            <el-table-column prop="total_count" label="总数量" width="100" align="right" />
            <el-table-column prop="completed_count" label="已完成" width="100" align="right" />
            <el-table-column prop="in_progress_count" label="进行中" width="100" align="right" />
            <el-table-column prop="pending_count" label="待处理" width="100" align="right" />
            <el-table-column prop="completion_rate" label="完成率" width="120">
              <template #default="{ row }"><el-progress :percentage="parseFloat(row.completion_rate) || 0" :color="progressColor(row.completion_rate)" /></template>
            </el-table-column>
            <el-table-column prop="avg_duration" label="平均耗时(小时)" width="130" align="right" />
            <el-table-column prop="defect_rate" label="不良率" width="90">
              <template #default="{ row }"><span :style="{ color: parseFloat(row.defect_rate) > 5 ? '#f56c6c' : '#67c23a' }">{{ row.defect_rate }}%</span></template>
            </el-table-column>
          </el-table>
          <el-pagination v-if="stageTotal > 0" v-model:current-page="stagePage" v-model:page-size="stagePageSize" :total="stageTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" class="mt-16" @size-change="loadProdStages" @current-change="loadProdStages" />
        </div>
      </div>

      <!-- 销售报表 -->
      <div v-show="activeTab === 'sales'" class="tab-content">
        <el-form :inline="true" class="filter-form">
          <el-form-item label="统计周期">
            <el-date-picker v-model="salesDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 260px" />
          </el-form-item>
          <el-form-item label="经销商">
            <el-select v-model="salesDealer" placeholder="全部" clearable filterable style="width: 160px">
              <el-option v-for="d in dealerList" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="产品分类">
            <el-select v-model="salesCategory" placeholder="全部" clearable style="width: 140px">
              <el-option label="橱柜" value="cabinet" />
              <el-option label="衣柜" value="wardrobe" />
              <el-option label="榻榻米" value="tatami" />
              <el-option label="护墙板" value="wall_panel" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadSalesSummary">查询</el-button>
            <el-button @click="resetSales">重置</el-button>
            <el-button type="success" @click="exportSales">导出</el-button>
          </el-form-item>
        </el-form>
        <el-row :gutter="16" class="summary-cards">
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">订单总数</div><div class="stat-value primary">{{ salesSum.order_count || 0 }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">销售总额</div><div class="stat-value success">¥{{ fmtNum(salesSum.total_amount) }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">已完成</div><div class="stat-value">{{ salesSum.completed_count || 0 }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">进行中</div><div class="stat-value warning">{{ salesSum.in_progress_count || 0 }}</div></div></el-card></el-col>
        </el-row>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">销售汇总</span></template>
          <el-table v-loading="salesLoading" :data="salesSummary" stripe border>
            <el-table-column prop="dealer_name" label="经销商" width="160" fixed />
            <el-table-column prop="region" label="区域" width="100" />
            <el-table-column prop="order_count" label="订单数" width="100" align="right" />
            <el-table-column prop="product_count" label="产品数量" width="100" align="right" />
            <el-table-column prop="total_amount" label="销售总额" width="140" align="right"><template #default="{ row }">¥{{ fmtNum(row.total_amount) }}</template></el-table-column>
            <el-table-column prop="completed_amount" label="已完成金额" width="140" align="right"><template #default="{ row }">¥{{ fmtNum(row.completed_amount) }}</template></el-table-column>
            <el-table-column prop="in_progress_amount" label="进行中金额" width="140" align="right"><template #default="{ row }">¥{{ fmtNum(row.in_progress_amount) }}</template></el-table-column>
            <el-table-column prop="avg_amount" label="单均金额" width="120" align="right"><template #default="{ row }">¥{{ fmtNum(row.avg_amount) }}</template></el-table-column>
          </el-table>
        </el-card>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">产品销售排行</span></template>
          <el-table v-loading="salesLoading" :data="salesByProduct" stripe border>
            <el-table-column label="排名" width="80" align="center" fixed><template #default="{ $index }">{{ $index + 1 }}</template></el-table-column>
            <el-table-column prop="product_name" label="产品名称" min-width="180" fixed />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="sales_count" label="销售数量" width="110" align="right" sortable />
            <el-table-column prop="sales_amount" label="销售金额" width="130" align="right" sortable><template #default="{ row }">¥{{ fmtNum(row.sales_amount) }}</template></el-table-column>
            <el-table-column prop="order_count" label="订单数" width="100" align="right" />
            <el-table-column prop="avg_price" label="均价" width="110" align="right"><template #default="{ row }">¥{{ fmtNum(row.avg_price) }}</template></el-table-column>
            <el-table-column prop="trend" label="趋势" width="100" align="center">
              <template #default="{ row }"><el-tag :type="row.trend === 'up' ? 'success' : row.trend === 'down' ? 'danger' : 'info'" size="small">{{ row.trend === 'up' ? '↑ 上升' : row.trend === 'down' ? '↓ 下降' : '持平' }}</el-tag></template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- 库存报表 -->
      <div v-show="activeTab === 'warehouse'" class="tab-content">
        <el-form :inline="true" class="filter-form">
          <el-form-item label="物料分类">
            <el-select v-model="whCategory" placeholder="全部" clearable style="width: 140px">
              <el-option label="板材" value="board" />
              <el-option label="五金" value="hardware" />
              <el-option label="包材" value="packaging" />
              <el-option label="成品" value="finished" />
            </el-select>
          </el-form-item>
          <el-form-item label="仓库">
            <el-select v-model="whWarehouse" placeholder="全部" clearable style="width: 140px">
              <el-option label="原材料仓" value="raw" />
              <el-option label="成品仓" value="finished" />
              <el-option label="五金仓" value="hardware" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="whStatus" placeholder="全部" clearable style="width: 120px">
              <el-option label="正常" value="normal" />
              <el-option label="预警" value="warning" />
              <el-option label="不足" value="low" />
              <el-option label="呆滞" value="dead" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadWarehouse">查询</el-button>
            <el-button @click="resetWarehouse">重置</el-button>
            <el-button type="success" @click="exportWarehouse">导出</el-button>
          </el-form-item>
        </el-form>
        <el-row :gutter="16" class="summary-cards">
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">物料种类</div><div class="stat-value primary">{{ whSummary.category_count || 0 }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">库存总量</div><div class="stat-value">{{ fmtNum(whSummary.total_quantity) }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">预警数量</div><div class="stat-value warning">{{ whSummary.warning_count || 0 }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">呆滞料数量</div><div class="stat-value danger">{{ whSummary.dead_count || 0 }}</div></div></el-card></el-col>
        </el-row>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">库存汇总</span></template>
          <el-table v-loading="whLoading" :data="whSummaryList" stripe border>
            <el-table-column prop="material_name" label="物料名称" min-width="180" fixed />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="warehouse" label="仓库" width="100" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="stock_quantity" label="库存数量" width="110" align="right" />
            <el-table-column prop="min_stock" label="最低库存" width="110" align="right" />
            <el-table-column prop="max_stock" label="最高库存" width="110" align="right" />
            <el-table-column prop="available_quantity" label="可用数量" width="110" align="right" />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'low'" type="danger" size="small">库存不足</el-tag>
                <el-tag v-else-if="row.status === 'warning'" type="warning" size="small">预警</el-tag>
                <el-tag v-else-if="row.status === 'dead'" type="info" size="small">呆滞</el-tag>
                <el-tag v-else type="success" size="small">正常</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="frozen_quantity" label="冻结数量" width="100" align="right" />
            <el-table-column prop="last_in_date" label="最后入库" width="120" />
            <el-table-column prop="last_out_date" label="最后出库" width="120" />
          </el-table>
          <el-pagination v-if="whTotal > 0" v-model:current-page="whPage" v-model:page-size="whPageSize" :total="whTotal" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next" class="mt-16" @size-change="loadWarehouse" @current-change="loadWarehouse" />
        </el-card>
        <el-card v-if="whAlertList.length > 0" shadow="never" class="mt-16">
          <template #header><span class="section-title">库存预警</span></template>
          <el-alert v-for="(item, idx) in whAlertList" :key="idx" :title="item.message" :type="item.type || 'warning'" show-icon :closable="false" class="mb-8" />
        </el-card>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">呆滞料明细</span></template>
          <el-table v-loading="whLoading" :data="whDeadList" stripe border>
            <el-table-column prop="material_name" label="物料名称" min-width="180" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="stock_quantity" label="库存数量" width="110" align="right" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="idle_days" label="闲置天数" width="110" align="right" />
            <el-table-column prop="idle_reason" label="呆滞原因" min-width="160" />
            <el-table-column prop="estimated_loss" label="预计损失" width="120" align="right"><template #default="{ row }">¥{{ fmtNum(row.estimated_loss) }}</template></el-table-column>
            <el-table-column prop="proposal" label="处理建议" min-width="140" />
          </el-table>
        </el-card>
      </div>

      <!-- 财务报表 -->
      <div v-show="activeTab === 'finance'" class="tab-content">
        <el-form :inline="true" class="filter-form">
          <el-form-item label="统计周期">
            <el-date-picker v-model="finDateRange" type="monthrange" range-separator="至" start-placeholder="开始月份" end-placeholder="结束月份" format="YYYY-MM" value-format="YYYY-MM" style="width: 220px" />
          </el-form-item>
          <el-form-item label="部门">
            <el-select v-model="finDept" placeholder="全部" clearable style="width: 140px">
              <el-option label="销售部" value="sales" />
              <el-option label="生产部" value="production" />
              <el-option label="采购部" value="procurement" />
              <el-option label="管理部" value="admin" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadFinance">查询</el-button>
            <el-button @click="resetFinance">重置</el-button>
            <el-button type="success" @click="exportFinance">导出</el-button>
          </el-form-item>
        </el-form>
        <el-row :gutter="16" class="summary-cards">
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">本月收入</div><div class="stat-value success">¥{{ fmtNum(finSummary.income || 0) }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">本月支出</div><div class="stat-value danger">¥{{ fmtNum(finSummary.expense || 0) }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">应收账款</div><div class="stat-value warning">¥{{ fmtNum(finSummary.receivables || 0) }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">应付账款</div><div class="stat-value">{{ fmtNum(finSummary.payables || 0) }}</div></div></el-card></el-col>
        </el-row>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">财务摘要</span></template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="本期收入">{{ fmtCurrency(finSummary.income) }}</el-descriptions-item>
            <el-descriptions-item label="上期收入">{{ fmtCurrency(finSummary.last_income) }}</el-descriptions-item>
            <el-descriptions-item label="收入同比"><span :style="{ color: (finSummary.income_yoy || 0) >= 0 ? '#67c23a' : '#f56c6c' }">{{ finSummary.income_yoy >= 0 ? '+' : '' }}{{ finSummary.income_yoy || 0 }}%</span></el-descriptions-item>
            <el-descriptions-item label="本期支出">{{ fmtCurrency(finSummary.expense) }}</el-descriptions-item>
            <el-descriptions-item label="上期支出">{{ fmtCurrency(finSummary.last_expense) }}</el-descriptions-item>
            <el-descriptions-item label="支出同比"><span :style="{ color: (finSummary.expense_yoy || 0) <= 0 ? '#67c23a' : '#f56c6c' }">{{ finSummary.expense_yoy >= 0 ? '+' : '' }}{{ finSummary.expense_yoy || 0 }}%</span></el-descriptions-item>
            <el-descriptions-item label="本期利润">{{ fmtCurrency(finSummary.profit) }}</el-descriptions-item>
            <el-descriptions-item label="利润率">{{ finSummary.profit_rate || 0 }}%</el-descriptions-item>
            <el-descriptions-item label="净资产收益率">{{ finSummary.roe || 0 }}%</el-descriptions-item>
          </el-descriptions>
        </el-card>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">应收应付明细</span></template>
          <el-tabs>
            <el-tab-pane label="应收账款">
              <el-table v-loading="finLoading" :data="finReceivable" stripe border>
                <el-table-column prop="customer_name" label="客户" min-width="160" fixed />
                <el-table-column prop="order_no" label="订单号" width="140" />
                <el-table-column prop="amount" label="应收金额" width="130" align="right"><template #default="{ row }">¥{{ fmtNum(row.amount) }}</template></el-table-column>
                <el-table-column prop="received_amount" label="已收金额" width="130" align="right"><template #default="{ row }">¥{{ fmtNum(row.received_amount) }}</template></el-table-column>
                <el-table-column prop="outstanding_amount" label="未收金额" width="130" align="right"><template #default="{ row }">¥{{ fmtNum(row.outstanding_amount) }}</template></el-table-column>
                <el-table-column prop="due_date" label="到期日" width="120" />
                <el-table-column prop="aging" label="账龄" width="120" align="center">
                  <template #default="{ row }"><el-tag :type="row.aging_days > 90 ? 'danger' : row.aging_days > 60 ? 'warning' : 'success'" size="small">{{ row.aging }} ({{ row.aging_days }}天)</el-tag></template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100" align="center">
                  <template #default="{ row }"><el-tag :type="row.status === 'overdue' ? 'danger' : row.status === 'partial' ? 'warning' : 'success'" size="small">{{ row.status === 'overdue' ? '已逾期' : row.status === 'partial' ? '部分收回' : '正常' }}</el-tag></template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="应付账款">
              <el-table v-loading="finLoading" :data="finPayable" stripe border>
                <el-table-column prop="supplier_name" label="供应商" min-width="160" fixed />
                <el-table-column prop="order_no" label="订单号" width="140" />
                <el-table-column prop="amount" label="应付金额" width="130" align="right"><template #default="{ row }">¥{{ fmtNum(row.amount) }}</template></el-table-column>
                <el-table-column prop="paid_amount" label="已付金额" width="130" align="right"><template #default="{ row }">¥{{ fmtNum(row.paid_amount) }}</template></el-table-column>
                <el-table-column prop="outstanding_amount" label="未付金额" width="130" align="right"><template #default="{ row }">¥{{ fmtNum(row.outstanding_amount) }}</template></el-table-column>
                <el-table-column prop="due_date" label="到期日" width="120" />
                <el-table-column prop="status" label="状态" width="100" align="center">
                  <template #default="{ row }"><el-tag :type="row.status === 'overdue' ? 'danger' : row.status === 'partial' ? 'warning' : 'success'" size="small">{{ row.status === 'overdue' ? '已逾期' : row.status === 'partial' ? '部分支付' : '正常' }}</el-tag></template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-card>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">应收账款账龄分析</span></template>
          <el-table v-loading="finLoading" :data="finAging" stripe border>
            <el-table-column prop="aging_bucket" label="账龄区间" width="160" fixed />
            <el-table-column prop="customer_count" label="客户数" width="100" align="right" />
            <el-table-column prop="order_count" label="订单数" width="100" align="right" />
            <el-table-column prop="total_amount" label="金额" width="140" align="right"><template #default="{ row }">¥{{ fmtNum(row.total_amount) }}</template></el-table-column>
            <el-table-column prop="percentage" label="占比" width="120" align="center"><template #default="{ row }">{{ row.percentage || 0 }}%</template></el-table-column>
            <el-table-column label="金额占比" min-width="200"><template #default="{ row }"><el-progress :percentage="parseFloat(row.percentage) || 0" :color="agingColor(row.aging_bucket)" /></template></el-table-column>
            <el-table-column prop="risk_level" label="风险等级" width="120" align="center">
              <template #default="{ row }"><el-tag :type="row.risk_level === 'high' ? 'danger' : row.risk_level === 'medium' ? 'warning' : 'success'" size="small">{{ row.risk_level === 'high' ? '高风险' : row.risk_level === 'medium' ? '中风险' : '低风险' }}</el-tag></template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <!-- 考勤报表 -->
      <div v-show="activeTab === 'attendance'" class="tab-content">
        <el-form :inline="true" class="filter-form">
          <el-form-item label="统计月份">
            <el-date-picker v-model="attMonth" type="month" format="YYYY-MM" value-format="YYYY-MM" placeholder="选择月份" style="width: 140px" />
          </el-form-item>
          <el-form-item label="部门">
            <el-select v-model="attDept" placeholder="全部" clearable style="width: 140px">
              <el-option label="生产部" value="production" />
              <el-option label="销售部" value="sales" />
              <el-option label="采购部" value="procurement" />
              <el-option label="财务部" value="finance" />
              <el-option label="行政部" value="admin" />
            </el-select>
          </el-form-item>
          <el-form-item label="员工">
            <el-select v-model="attEmployee" placeholder="全部" clearable filterable style="width: 160px">
              <el-option v-for="e in employeeList" :key="e.id" :label="e.name" :value="e.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadAttendance">查询</el-button>
            <el-button @click="resetAttendance">重置</el-button>
            <el-button type="success" @click="exportAttendance">导出</el-button>
          </el-form-item>
        </el-form>
        <el-row :gutter="16" class="summary-cards">
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">应到人数</div><div class="stat-value primary">{{ attSummary.should_attend || 0 }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">实到人数</div><div class="stat-value success">{{ attSummary.actual_attend || 0 }}</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">出勤率</div><div class="stat-value">{{ attSummary.attendance_rate || 0 }}%</div></div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-item"><div class="stat-label">迟到次数</div><div class="stat-value danger">{{ attSummary.late_count || 0 }}</div></div></el-card></el-col>
        </el-row>
        <el-card shadow="never" class="mt-16">
          <template #header><span class="section-title">月报统计</span></template>
          <el-table v-loading="attLoading" :data="attMonthly" stripe border>
            <el-table-column prop="department" label="部门" width="120" fixed />
            <el-table-column prop="employee_name" label="员工姓名" width="120" fixed />
            <el-table-column prop="normal_count" label="正常" width="80" align="right" />
            <el-table-column prop="late_count" label="迟到" width="80" align="right" />
            <el-table-column prop="early_leave_count" label="早退" width="80" align="right" />
            <el-table-column prop="absent_count" label="缺勤" width="80" align="right" />
            <el-table-column prop="overtime_hours" label="加班(小时)" width="110" align="right" />
            <el-table-column prop="work_hours" label="工时" width="100" align="right" />
            <el-table-column prop="leave_days" label="请假(天)" width="100" align="right" />
            <el-table-column prop="attendance_rate" label="出勤率" width="100">
              <template #default="{ row }"><el-tag :type="row.attendance_rate >= 95 ? 'success' : row.attendance_rate >= 85 ? 'warning' : 'danger'" size="small">{{ row.attendance_rate }}%</el-tag></template>
            </el-table-column>
          </el-table>
          <el-pagination v-if="attTotal > 0" v-model:current-page="attPage" v-model:page-size="attPageSize" :total="attTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" class="mt-16" @size-change="loadAttendance" @current-change="loadAttendance" />
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { report } from '../../api'

const fmtNum = (val