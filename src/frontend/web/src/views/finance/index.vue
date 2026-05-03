<template>
  <div class="finance-page">
    <el-row :gutter="12" style="margin-bottom: 12px">
      <el-col :span="6">
        <el-card shadow="hover"><div class="stat-item"><el-icon style="font-size:24px;color:#409eff"><Wallet/></el-icon><div><div class="stat-label">应收账款</div><div class="stat-value" style="color:#409eff">¥{{ formatNum(summary.receivable?.total) }}</div><div class="stat-sub">已收:¥{{ formatNum(summary.receivable?.received) }}|应收:¥{{ formatNum(summary.receivable?.unreceived) }}</div></div></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover"><div class="stat-item"><el-icon style="font-size:24px;color:#e6a23c"><Coin/></el-icon><div><div class="stat-label">应付账款</div><div class="stat-value" style="color:#e6a23c">¥{{ formatNum(summary.payable?.total) }}</div><div class="stat-sub">已付:¥{{ formatNum(summary.payable?.paid) }}|应付:¥{{ formatNum(summary.payable?.unpaid) }}</div></div></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover"><div class="stat-item"><el-icon style="font-size:24px;color:#67c23a"><Money/></el-icon><div><div class="stat-label">本月收入</div><div class="stat-value" style="color:#67c23a">¥{{ formatNum(summary.monthlyIncome) }}</div><div class="stat-sub">收款笔数:{{ summary.incomeCount||0 }}</div></div></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover"><div class="stat-item"><el-icon style="font-size:24px;color:#f56c6c"><TrendCharts/></el-icon><div><div class="stat-label">本月支出</div><div class="stat-value" style="color:#f56c6c">¥{{ formatNum(summary.monthlyExpense) }}</div><div class="stat-sub">付款笔数:{{ summary.expenseCount||0 }}</div></div></div></el-card>
      </el-col>
    </el-row>
    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="应收款" name="receivable">
          <div class="filter-bar">
            <el-select v-model="receivableFilter.status" placeholder="状态" clearable style="width:130px"><el-option label="未收款" value="unpaid"/><el-option label="部分收款" value="partial"/><el-option label="已收完" value="paid"/></el-select>
            <el-button type="primary" @click="loadReceivables">搜索</el-button>
            <el-button @click="receivableFilter.status='';loadReceivables()">重置</el-button>
            <el-button type="primary" @click="openReceivableDialog">新增应收款</el-button>
          </div>
          <el-table :data="receivables" v-loading="receivableLoading" stripe style="margin-top:16px">
            <el-table-column prop="order_no" label="订单号" width="150"/>
            <el-table-column prop="customer_name" label="客户" min-width="120"/>
            <el-table-column prop="amount" label="应收金额" width="120" align="right"><template #default="{row}"><span style="color:#f56c6c;font-weight:bold">¥{{(row.amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="received" label="已收金额" width="120" align="right"><template #default="{row}"><span style="color:#67c23a">¥{{(row.received||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="unreceived" label="未收金额" width="120" align="right"><template #default="{row}"><span style="color:#e6a23c;font-weight:bold">¥{{((row.amount||0)-(row.received||0)).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="due_date" label="到期日期" width="110"/>
            <el-table-column prop="status" label="状态" width="100"><template #default="{row}"><el-tag :type="getReceivableStatusType(row)" size="small">{{getReceivableStatus(row)}}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="150" fixed="right"><template #default="{row}"><el-button link type="primary" size="small" @click="collectReceivable(row)">收款</el-button><el-button link type="info" size="small" @click="viewReceivableDetail(row)">详情</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="应付款" name="payable">
          <div class="filter-bar">
            <el-select v-model="payableFilter.status" placeholder="状态" clearable style="width:130px"><el-option label="未付款" value="unpaid"/><el-option label="部分付款" value="partial"/><el-option label="已付完" value="paid"/></el-select>
            <el-button type="primary" @click="loadPayables">搜索</el-button>
            <el-button @click="payableFilter.status='';loadPayables()">重置</el-button>
            <el-button type="primary" @click="openPayableDialog">新增应付款</el-button>
          </div>
          <el-table :data="payables" v-loading="payableLoading" stripe style="margin-top:16px">
            <el-table-column prop="supplier_name" label="供应商" min-width="120"/>
            <el-table-column prop="category" label="费用类别" width="100"/>
            <el-table-column prop="amount" label="应付金额" width="120" align="right"><template #default="{row}"><span style="color:#f56c6c;font-weight:bold">¥{{(row.amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="paid" label="已付金额" width="120" align="right"><template #default="{row}"><span style="color:#67c23a">¥{{(row.paid||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="unpaid" label="未付金额" width="120" align="right"><template #default="{row}"><span style="color:#e6a23c;font-weight:bold">¥{{((row.amount||0)-(row.paid||0)).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="due_date" label="到期日期" width="110"/>
            <el-table-column prop="status" label="状态" width="100"><template #default="{row}"><el-tag :type="getPayableStatusType(row)" size="small">{{getPayableStatus(row)}}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="150" fixed="right"><template #default="{row}"><el-button link type="warning" size="small" @click="payPayable(row)">付款</el-button><el-button link type="info" size="small" @click="viewPayableDetail(row)">详情</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="资金流水" name="flow">
          <div class="filter-bar">
            <el-date-picker v-model="flowFilter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:260px"/>
            <el-select v-model="flowFilter.type" placeholder="类型" clearable style="width:100px"><el-option label="收入" value="income"/><el-option label="支出" value="expense"/></el-select>
            <el-button type="primary" @click="loadFundFlow">搜索</el-button>
            <el-button @click="flowFilter.dateRange=null;flowFilter.type='';loadFundFlow()">重置</el-button>
          </div>
          <el-table :data="fundFlows" v-loading="flowLoading" stripe style="margin-top:16px">
            <el-table-column prop="created_at" label="时间" width="160"/>
            <el-table-column prop="type" label="类型" width="80"><template #default="{row}"><el-tag :type="row.type==='income'?'success':'danger'" size="small">{{row.type==='income'?'收入':'支出'}}</el-tag></template></el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right"><template #default="{row}"><span :style="{color:row.type==='income'?'#67c23a':'#f56c6c',fontWeight:'bold'}">{{row.type==='income'?'+':'-'}}¥{{(row.amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="category" label="类别" width="100"/>
            <el-table-column prop="customer_name" label="客户/供应商" min-width="120"/>
            <el-table-column prop="order_no" label="关联订单" width="150"/>
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip/>
          </el-table>
          <el-pagination v-model:current-page="flowPage" :page-size="20" :total="flowTotal" layout="total,prev,pager,next" style="margin-top:16px;justify-content:flex-end" @current-change="loadFundFlow"/>
        </el-tab-pane>
        <el-tab-pane label="发票管理" name="invoice">
          <div class="filter-bar">
            <el-date-picker v-model="invoiceFilter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:260px"/>
            <el-select v-model="invoiceFilter.type" placeholder="发票类型" clearable style="width:120px"><el-option label="增值税专用" value="special"/><el-option label="增值税普通" value="normal"/><el-option label="电子发票" value="electronic"/></el-select>
            <el-button type="primary" @click="loadInvoices">搜索</el-button>
            <el-button @click="invoiceFilter.dateRange=null;invoiceFilter.type='';loadInvoices()">重置</el-button>
            <el-button type="primary" @click="openInvoiceDialog">开票</el-button>
          </div>
          <el-table :data="invoices" v-loading="invoiceLoading" stripe style="margin-top:16px">
            <el-table-column prop="invoice_no" label="发票号" width="160"/>
            <el-table-column prop="customer_name" label="客户" min-width="120"/>
            <el-table-column prop="type" label="发票类型" width="100"><template #default="{row}"><el-tag size="small">{{invoiceTypeLabel(row.type)}}</el-tag></template></el-table-column>
            <el-table-column prop="amount" label="发票金额" width="120" align="right"><template #default="{row}"><span style="color:#f56c6c;font-weight:bold">¥{{(row.amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="tax_rate" label="税率" width="80" align="right"><template #default="{row}">{{((row.tax_rate||0)*100).toFixed(0)}}%</template></el-table-column>
            <el-table-column prop="tax_amount" label="税额" width="100" align="right"><template #default="{row}">¥{{(row.tax_amount||0).toFixed(2)}}</template></el-table-column>
            <el-table-column prop="invoice_date" label="开票日期" width="110"/>
            <el-table-column prop="status" label="状态" width="90"><template #default="{row}"><el-tag :type="row.status==='issued'?'primary':'info'" size="small">{{row.status==='issued'?'已开票':'作废'}}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="100" fixed="right"><template #default="{row}"><el-button link type="info" size="small" @click="viewInvoiceDetail(row)">详情</el-button></template></el-table-column>
          </el-table>
          <el-pagination v-model:current-page="invoicePage" :page-size="20" :total="invoiceTotal" layout="total,prev,pager,next" style="margin-top:16px;justify-content:flex-end" @current-change="loadInvoices"/>
        </el-tab-pane>
        <el-tab-pane label="客户欠款" name="customerArrears">
          <div class="filter-bar"><el-input v-model="customerArrearsFilter.keyword" placeholder="客户名称/订单号" clearable style="width:200px"/><el-button type="primary" @click="loadCustomerArrears">搜索</el-button><el-button @click="customerArrearsFilter.keyword='';loadCustomerArrears()">重置</el-button></div>
          <el-table :data="customerArrearsList" v-loading="customerArrearsLoading" stripe style="margin-top:16px">
            <el-table-column prop="customer_name" label="客户" min-width="150"/>
            <el-table-column prop="order_no" label="订单号" width="150"/>
            <el-table-column prop="total_amount" label="订单总额" width="120" align="right"><template #default="{row}">¥{{(row.total_amount||0).toFixed(2)}}</template></el-table-column>
            <el-table-column prop="paid_amount" label="已付款" width="120" align="right"><template #default="{row}"><span style="color:#67c23a">¥{{(row.paid_amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="arrears_amount" label="欠款金额" width="120" align="right"><template #default="{row}"><span style="color:#f56c6c;font-weight:bold">¥{{(row.arrears_amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="overdue_days" label="逾期天数" width="100"><template #default="{row}"><span :style="{color:(row.overdue_days||0)>30?'#f56c6c':(row.overdue_days||0)>0?'#e6a23c':'#67c23a'}">{{row.overdue_days||0}}天</span></template></el-table-column>
            <el-table-column prop="last_payment_date" label="最后付款日" width="110"/>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="经销商欠款" name="dealerArrears">
          <div class="filter-bar"><el-input v-model="dealerArrearsFilter.keyword" placeholder="经销商名称" clearable style="width:200px"/><el-button type="primary" @click="loadDealerArrears">搜索</el-button><el-button @click="dealerArrearsFilter.keyword='';loadDealerArrears()">重置</el-button></div>
          <el-table :data="dealerArrearsList" v-loading="dealerArrearsLoading" stripe style="margin-top:16px">
            <el-table-column prop="dealer_name" label="经销商" min-width="150"/>
            <el-table-column prop="store_name" label="门店" min-width="120"/>
            <el-table-column prop="total_amount" label="订单总额" width="120" align="right"><template #default="{row}">¥{{(row.total_amount||0).toFixed(2)}}</template></el-table-column>
            <el-table-column prop="paid_amount" label="已付款" width="120" align="right"><template #default="{row}"><span style="color:#67c23a">¥{{(row.paid_amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="arrears_amount" label="欠款金额" width="120" align="right"><template #default="{row}"><span style="color:#f56c6c;font-weight:bold">¥{{(row.arrears_amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="credit_limit" label="信用额度" width="120" align="right"><template #default="{row}">¥{{(row.credit_limit||0).toFixed(2)}}</template></el-table-column>
            <el-table-column prop="overdue_days" label="逾期天数" width="100"><template #default="{row}"><span :style="{color:(row.overdue_days||0)>30?'#f56c6c':'#e6a23c'}">{{row.overdue_days||0}}天</span></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="供应商欠款" name="supplierArrears">
          <div class="filter-bar"><el-input v-model="supplierArrearsFilter.keyword" placeholder="供应商名称" clearable style="width:200px"/><el-button type="primary" @click="loadSupplierArrears">搜索</el-button><el-button @click="supplierArrearsFilter.keyword='';loadSupplierArrears()">重置</el-button></div>
          <el-table :data="supplierArrearsList" v-loading="supplierArrearsLoading" stripe style="margin-top:16px">
            <el-table-column prop="supplier_name" label="供应商" min-width="150"/>
            <el-table-column prop="purchase_no" label="采购单号" width="150"/>
            <el-table-column prop="total_amount" label="采购总额" width="120" align="right"><template #default="{row}">¥{{(row.total_amount||0).toFixed(2)}}</template></el-table-column>
            <el-table-column prop="paid_amount" label="已付款" width="120" align="right"><template #default="{row}"><span style="color:#67c23a">¥{{(row.paid_amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="arrears_amount" label="欠款金额" width="120" align="right"><template #default="{row}"><span style="color:#f56c6c;font-weight:bold">¥{{(row.arrears_amount||0).toFixed(2)}}</span></template></el-table-column>
            <el-table-column prop="due_date" label="到期日期" width="110"/>
            <el-table-column prop="overdue_days" label="逾期天数" width="100"><template #default="{row}"><span :style="{color:(row.overdue_days||0)>30?'#f56c6c':'#e6a23c'}">{{row.overdue_days||0}}天</span></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="对账管理" name="reconciliation">
          <el-alert type="info" :closable="false" style="margin-bottom:16px">选择对账对象和日期范围，系统将自动生成对账报表</el-alert>
          <el-form :model="reconciliationForm" label-width="100px" style="max-width:600px">
            <el-form-item label="对账对象"><el-select v-model="reconciliationForm.type" style="width:100%"><el-option label="客户" value="customer"/><el-option label="经销商" value="dealer"/><el-option label="供应商" value="supplier"/></el-select></el-form-item>
            <el-form-item label="对象名称"><el-input v-model="reconciliationForm.name" placeholder="请输入客户/经销商/供应商名称"/></el-form-item>
            <el-form-item label="对账期间"><el-date-picker v-model="reconciliationForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item>
            <el-form-item><el-button type="primary" @click="generateReconciliation">生成对账单</el-button></el-form-item>
          </el-form>
          <el-divider v-if="reconciliationData"/>
          <div v-if="reconciliationData" class="reconciliation-result">
            <el-descriptions title="对账汇总" :column="2" border>
              <el-descriptions-item label="对账对象">{{reconciliationForm.name}}</el-descriptions-item>
              <el-descriptions-item label="对账期间">{{reconciliationForm.dateRange?reconciliationForm.dateRange.join(' 至 '):''}}</el-descriptions-item>
              <el-descriptions-item label="应收/应付总额">¥{{(reconciliationData.total||0).toFixed(2)}}</el-descriptions-item>
              <el-descriptions-item label="已收/已付">¥{{(reconciliationData.paid||0).toFixed(2)}}</el-descriptions-item>
              <el-descriptions-item label="未收/未付">¥{{(reconciliationData.unpaid||0).toFixed(2)}}</el-descriptions-item>
              <el-descriptions-item label="单据数量">{{reconciliationData.count||0}}</el-descriptions-item>
            </el-descriptions>
            <el-divider>明细</el-divider>
            <el-table :data="reconciliationData.items||[]" stripe size="small">
              <el-table-column prop="date" label="日期" width="110"/>
              <el-table-column prop="order_no" label="单据号" width="150"/>
              <el-table-column prop="type" label="类型" width="80"><template #default="{row}">{{row.type==='receivable'?'应收':'应付'}}</template></el-table-column>
              <el-table-column prop="amount" label="金额" width="110" align="right"><template #default="{row}">¥{{(row.amount||0).toFixed(2)}}</template></el-table-column>
              <el-table-column prop="paid" label="已收/付" width="110" align="right"><template #default="{row}">¥{{(row.paid||0).toFixed(2)}}</template></el-table-column>
              <el-table-column prop="unpaid" label="未收/付" width="110" align="right"><template #default="{row}">¥{{((row.amount||0)-(row.paid||0)).toFixed(2)}}</template></el-table-column>
              <el-table-column prop="remark" label="备注" min-width="120"/>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 收款对话框 -->
    <el-dialog v-model="collectDialogVisible" title="收款" width="500px">
      <el-form :model="collectForm" label-width="100px">
        <el-form-item label="客户"><el-input :model-value="currentReceivable?.customer_name" disabled/></el-form-item>
        <el-form-item label="应收金额"><el-input :model-value="'¥'+(currentReceivable?.amount||0).toFixed(2)" disabled/></el-form-item>
        <el-form-item label="已收金额"><el-input :model-value="'¥'+(currentReceivable?.received||0).toFixed(2)" disabled/></el-form-item>
        <el-form-item label="本次收款" required><el-input-number v-model="collectForm.amount" :min="0" :max="(currentReceivable?.amount||0)-(currentReceivable?.received||0)" :precision="2" style="width:100%"/></el-form-item>
        <el-form-item label="收款方式"><el-select v-model="collectForm.method" style="width:100%"><el-option label="银行转账" value="bank"/><el-option label="现金" value="cash"/><el-option label="微信" value="wechat"/><el-option label="支付宝" value="alipay"/></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="collectForm.remark" type="textarea" :rows="2" placeholder="备注信息"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="collectDialogVisible=false">取消</el-button><el-button type="primary" @click="submitCollect">确认收款</el-button></template>
    </el-dialog>

    <!-- 付款对话框 -->
    <el-dialog v-model="paymentDialogVisible" title="付款" width="500px">
      <el-form :model="paymentForm" label-width="100px">
        <el-form-item label="供应商"><el-input :model-value="currentPayable?.supplier_name" disabled/></el-form-item>
        <el-form-item label="应付金额"><el-input :model-value="'¥'+(currentPayable?.amount||0).toFixed(2)" disabled/></el-form-item>
        <el-form-item label="已付金额"><el-input :model-value="'¥'+(currentPayable?.paid||0).toFixed(2)" disabled/></el-form-item>
        <el-form-item label="本次付款" required><el-input-number v-model="paymentForm.amount" :min="0" :max="(currentPayable?.amount||0)-(currentPayable?.paid||0)" :precision="2" style="width:100%"/></el-form-item>
        <el-form-item label="付款方式"><el-select v-model="paymentForm.method" style="width:100%"><el-option label="银行转账" value="bank"/><el-option label="现金" value="cash"/><el-option label="微信" value="wechat"/><el-option label="支付宝" value="alipay"/></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="paymentForm.remark" type="textarea" :rows="2" placeholder="备注信息"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="paymentDialogVisible=false">取消</el-button><el-button type="primary" @click="submitPayment">确认付款</el-button></template>
    </el-dialog>

    <!-- 新增应收款对话框 -->
    <el-dialog v-model="receivableDialogVisible" title="新增应收款" width="500px">
      <el-form :model="receivableForm" :rules="receivableRules" ref="receivableFormRef" label-width="100px">
        <el-form-item label="客户名称" prop="customer_name"><el-input v-model="receivableForm.customer_name" placeholder="请输入客户名称"/></el-form-item>
        <el-form-item label="订单号"><el-input v-model="receivableForm.order_no" placeholder="请输入订单号"/></el-form-item>
        <el-form-item label="应收金额" prop="amount"><el-input-number v-model="receivableForm.amount" :min="0" :precision="2" style="width:100%"/></el-form-item>
        <el-form-item label="到期日期"><el-date-picker v-model="receivableForm.due_date" type="date" value-format="YYYY-MM-DD" style="width:100%" placeholder="选择日期"/></el-form-item>
        <el-form-item label="备注"><el-input v-model="receivableForm.remark" type="textarea" :rows="2" placeholder="备注信息"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="receivableDialogVisible=false">取消</el-button><el-button type="primary" @click="submitReceivable">保存</el-button></template>
    </el-dialog>

    <!-- 新增应付款对话框 -->
    <el-dialog v-model="payableDialogVisible" title="新增应付款" width="500px">
      <el-form :model="payableForm" :rules="payableRules" ref="payableFormRef" label-width="100px">
        <el-form-item label="供应商" prop="supplier_name"><el-input v-model="payableForm.supplier_name" placeholder="请输入供应商名称"/></el-form-item>
        <el-form-item label="费用类别" prop="category"><el-select v-model="payableForm.category" style="width:100%"><el-option label="原材料采购" value="material"/><el-option label="设备采购" value="equipment"/><el-option label="运输费" value="shipping"/><el-option label="水电费" value="utility"/><el-option label="人工费" value="labor"/><el-option label="其他" value="other"/></el-select></el-form-item>
        <el-form-item label="应付金额" prop="amount"><el-input-number v-model="payableForm.amount" :min="0" :precision="2" style="width:100%"/></el-form-item>
        <el-form-item label="到期日期"><el-date-picker v-model="payableForm.due_date" type="date" value-format="YYYY-MM-DD" style="width:100%" placeholder="选择日期"/></el-form-item>
        <el-form-item label="备注"><el-input v-model="payableForm.remark" type="textarea" :rows="2" placeholder="备注信息"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="payableDialogVisible=false">取消</el-button><el-button type="primary" @click="submitPayable">保存</el-button></template>
    </el-dialog>

    <!-- 开票对话框 -->
    <el-dialog v-model="invoiceDialogVisible" title="开票" width="500px">
      <el-form :model="invoiceForm" :rules="invoiceRules" ref="invoiceFormRef" label-width="100px">
        <el-form-item label="客户名称" prop="customer_name"><el-input v-model="invoiceForm.customer_name" placeholder="请输入客户名称"/></el-form-item>
        <el-form-item label="发票类型" prop="type"><el-select v-model="invoiceForm.type" style="width:100%"><el-option label="增值税专用发票" value="special"/><el-option label="增值税普通发票" value="normal"/><el-option label="电子发票" value="electronic"/></el-select></el-form-item>
        <el-form-item label="发票金额" prop="amount"><el-input-number v-model="invoiceForm.amount" :min="0" :precision="2" style="width:100%"/></el-form-item>
        <el-form-item label="税率"><el-select v-model="invoiceForm.tax_rate" style="width:100%"><el-option label="3%" :value="0.03"/><el-option label="6%" :value="0.06"/><el-option label="9%" :value="0.09"/><el-option label="13%" :value="0.13"/></el-select></el-form-item>
        <el-form-item label="开票日期"><el-date-picker v-model="invoiceForm.invoice_date" type="date" value-format="YYYY-MM-DD" style="width:100%" placeholder="选择日期"/></el-form-item>
        <el-form-item label="备注"><el-input v-model="invoiceForm.remark" type="textarea" :rows="2" placeholder="备注信息"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="invoiceDialogVisible=false">取消</el-button><el-button type="primary" @click="submitInvoice">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { finance } from '@/api'
import { ElMessage } from 'element-plus'
import { Wallet, Coin, Money, TrendCharts } from '@element-plus/icons-vue'

const loading = ref(false)
const activeTab = ref('receivable')

// 财务摘要
const summary = reactive({
  receivable: { total: 0, received: 0, unreceived: 0 },
  payable: { total: 0, paid: 0, unpaid: 0 },
  monthlyIncome: 0,
  monthlyExpense: 0,
  incomeCount: 0,
  expenseCount: 0
})

// 应收款
const receivables = ref([])
const receivableLoading = ref(false)
const receivableFilter = reactive({ status: '' })
const collectDialogVisible = ref(false)
const receivableDialogVisible = ref(false)
const currentReceivable = ref(null)
const collectForm = reactive({ amount: 0, method: 'bank', remark: '' })
const receivableFormRef = ref(null)
const receivableForm = reactive({ customer_name: '', order_no: '', amount: 0, due_date: '', remark: '' })
const receivableRules = {
  customer_name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

// 应付款
const payables = ref([])
const payableLoading = ref(false)
const payableFilter = reactive({ status: '' })
const paymentDialogVisible = ref(false)
const payableDialogVisible = ref(false)
const currentPayable = ref(null)
const paymentForm = reactive({ amount: 0, method: 'bank', remark: '' })
const payableFormRef = ref(null)
const payableForm = reactive({ supplier_name: '', category: 'material', amount: 0, due_date: '', remark: '' })
const payableRules = {
  supplier_name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择费用类别', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

// 资金流水
const fundFlows = ref([])
const flowLoading = ref(false)
const flowPage = ref(1)
const flowTotal = ref(0)
const flowFilter = reactive({ dateRange: null, type: '' })

// 发票
const invoices = ref([])
const invoiceLoading = ref(false)
const invoicePage = ref(1)
const invoiceTotal = ref(0)
const invoiceFilter = reactive({ dateRange: null, type: '' })
const invoiceDialogVisible = ref(false)
const invoiceFormRef = ref(null)
const invoiceForm = reactive({ customer_name: '', type: 'special', amount: 0, tax_rate: 0.13, invoice_date: '', remark: '' })
const invoiceRules = {
  customer_name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择发票类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入发票金额', trigger: 'blur' }]
}

// 客户欠款
const customerArrearsList = ref([])
const customerArrearsLoading = ref(false)
const customerArrearsFilter = reactive({ keyword: '' })

// 经销商欠款
const dealerArrearsList = ref([])
const dealerArrearsLoading = ref(false)
const dealerArrearsFilter = reactive({ keyword: '' })

// 供应商欠款
const supplierArrearsList = ref([])
const supplierArrearsLoading = ref(false)
const supplierArrearsFilter = reactive({ keyword: '' })

// 对账
const reconciliationForm = reactive({ type: 'customer', name: '', dateRange: null })
const reconciliationData = ref(null)

// 工具函数
const formatNum = (num) => {
  return (num || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getReceivableStatus = (row) => {
  const received = row.received || 0
  const amount = row.amount || 0
  if (received >= amount) return '已收完'
  if (received > 0) return '部分收款'
  return '未收款'
}

const getReceivableStatusType = (row) => {
  const received = row.received || 0
  const amount = row.amount || 0
  if (received >= amount) return 'success'
  if (received > 0) return 'warning'
  return 'danger'
}

const getPayableStatus = (row) => {
  const paid = row.paid || 0
  const amount = row.amount || 0
  if (paid >= amount) return '已付完'
  if (paid > 0) return '部分付款'
  return '未付款'
}

const getPayableStatusType = (row) => {
  const paid = row.paid || 0
  const amount = row.amount || 0
  if (paid >= amount) return 'success'
  if (paid > 0) return 'warning'
  return 'danger'
}

const invoiceTypeLabel = (type) => {
  const map = { special: '增值税专用', normal: '增值税普通', electronic: '电子发票' }
  return map[type] || type
}

// ===== 8个load函数 =====
async function loadSummary() {
  try {
    const res = await finance.summary()
    if (res && res.data) {
      Object.assign(summary, res.data)
    }
  } catch (e) {
    console.error('loadSummary error', e)
  }
}

async function loadReceivables() {
  receivableLoading.value = true
  try {
    const res = await finance.receivables({ status: receivableFilter.status })
    receivables.value = res?.data?.list || res?.data || []
  } catch (e) {
    console.error('loadReceivables error', e)
  } finally {
    receivableLoading.value = false
  }
}

async function loadPayables() {
  payableLoading.value = true
  try {
    const res = await finance.payables({ status: payableFilter.status })
    payables.value = res?.data?.list || res?.data || []
  } catch (e) {
    console.error('loadPayables error', e)
  } finally {
    payableLoading.value = false
  }
}

async function loadFundFlow() {
  flowLoading.value = true
  try {
    const params = { page: flowPage.value, page_size: 20 }
    if (flowFilter.dateRange && flowFilter.dateRange.length === 2) {
      params.start_date = flowFilter.dateRange[0]
      params.end_date = flowFilter.dateRange[1]
    }
    if (flowFilter.type) params.type = flowFilter.type
    const res = await finance.fundFlow(params)
    fundFlows.value = res?.data?.list || res?.data || []
    flowTotal.value = res?.data?.total || 0
  } catch (e) {
    console.error('loadFundFlow error', e)
  } finally {
    flowLoading.value = false
  }
}

async function loadInvoices() {
  invoiceLoading.value = true
  try {
    const params = { page: invoicePage.value, page_size: 20 }
    if (invoiceFilter.dateRange && invoiceFilter.dateRange.length === 2) {
      params.start_date = invoiceFilter.dateRange[0]
      params.end_date = invoiceFilter.dateRange[1]
    }
    if (invoiceFilter.type) params.type = invoiceFilter.type
    const res = await finance.invoices(params)
    invoices.value = res?.data?.list || res?.data || []
    invoiceTotal.value = res?.data?.total || 0
  } catch (e) {
    console.error('loadInvoices error', e)
  } finally {
    invoiceLoading.value = false
  }
}

async function loadCustomerArrears() {
  customerArrearsLoading.value = true
  try {
    const res = await finance.customerArrears({ keyword: customerArrearsFilter.keyword })
    customerArrearsList.value = res?.data?.list || res?.data || []
  } catch (e) {
    console.error('loadCustomerArrears error', e)
  } finally {
    customerArrearsLoading.value = false
  }
}

async function loadDealerArrears() {
  dealerArrearsLoading.value = true
  try {
    const res = await finance.dealerArrears({ keyword: dealerArrearsFilter.keyword })
    dealerArrearsList.value = res?.data?.list || res?.data || []
  } catch (e) {
    console.error('loadDealerArrears error', e)
  } finally {
    dealerArrearsLoading.value = false
  }
}

async function loadSupplierArrears() {
  supplierArrearsLoading.value = true
  try {
    const res = await finance.supplierArrears({ keyword: supplierArrearsFilter.keyword })
    supplierArrearsList.value = res?.data?.list || res?.data || []
  } catch (e) {
    console.error('loadSupplierArrears error', e)
  } finally {
    supplierArrearsLoading.value = false
  }
}

// ===== 对话框操作 =====
function collectReceivable(row) {
  currentReceivable.value = row
  collectForm.amount = 0
  collectForm.method = 'bank'
  collectForm.remark = ''
  collectDialogVisible.value = true
}

function viewReceivableDetail(row) {
  ElMessage.info('详情: ' + (row.remark || '无'))
}

function openReceivableDialog() {
  receivableForm.customer_name = ''
  receivableForm.order_no = ''
  receivableForm.amount = 0
  receivableForm.due_date = ''
  receivableForm.remark = ''
  receivableDialogVisible.value = true
}

function payPayable(row) {
  currentPayable.value = row
  paymentForm.amount = 0
  paymentForm.method = 'bank'
  paymentForm.remark = ''
  paymentDialogVisible.value = true
}

function viewPayableDetail(row) {
  ElMessage.info('详情: ' + (row.remark || '无'))
}

function openPayableDialog() {
  payableForm.supplier_name = ''
  payableForm.category = 'material'
  payableForm.amount = 0
  payableForm.due_date = ''
  payableForm.remark = ''
  payableDialogVisible.value = true
}

function openInvoiceDialog() {
  invoiceForm.customer_name = ''
  invoiceForm.type = 'special'
  invoiceForm.amount = 0
  invoiceForm.tax_rate = 0.13
  invoiceForm.invoice_date = ''
  invoiceForm.remark = ''
  invoiceDialogVisible.value = true
}

function viewInvoiceDetail(row) {
  ElMessage.info('发票详情: ' + (row.remark || '无'))
}

// ===== 提交函数 =====
async function submitCollect() {
  if (!collectForm.amount || collectForm.amount <= 0) {
    ElMessage.warning('请输入正确的收款金额')
    return
  }
  try {
    await finance.collectReceivable(currentReceivable.value.id, {
      amount: collectForm.amount,
      method: collectForm.method,
      remark: collectForm.remark
    })
    ElMessage.success('收款成功')
    collectDialogVisible.value = false
    loadReceivables()
    loadSummary()
  } catch (e) {
    ElMessage.error('收款失败: ' + (e.message || ''))
  }
}

async function submitPayment() {
  if (!paymentForm.amount || paymentForm.amount <= 0) {
    ElMessage.warning('请输入正确的付款金额')
    return
  }
  try {
    await finance.payPayable(currentPayable.value.id, {
      amount: paymentForm.amount,
      method: paymentForm.method,
      remark: paymentForm.remark
    })
    ElMessage.success('付款成功')
    paymentDialogVisible.value = false
    loadPayables()
    loadSummary()
  } catch (e) {
    ElMessage.error('付款失败: ' + (e.message || ''))
  }
}

async function submitReceivable() {
  if (!receivableFormRef.value) return
  await receivableFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      await finance.createReceivable({ ...receivableForm })
      ElMessage.success('新增应收款成功')
      receivableDialogVisible.value = false
      loadReceivables()
      loadSummary()
    } catch (e) {
      ElMessage.error('新增失败: ' + (e.message || ''))
    }
  })
}

async function submitPayable() {
  if (!payableFormRef.value) return
  await payableFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      await finance.createPayable({ ...payableForm })
      ElMessage.success('新增应付款成功')
      payableDialogVisible.value = false
      loadPayables()
      loadSummary()
    } catch (e) {
      ElMessage.error('新增失败: ' + (e.message || ''))
    }
  })
}

async function submitInvoice() {
  if (!invoiceFormRef.value) return
  await invoiceFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      await finance.createInvoice({ ...invoiceForm })
      ElMessage.success('开票成功')
      invoiceDialogVisible.value = false
      loadInvoices()
    } catch (e) {
      ElMessage.error('开票失败: ' + (e.message || ''))
    }
  })
}

async function generateReconciliation() {
  if (!reconciliationForm.name) {
    ElMessage.warning('请输入对象名称')
    return
  }
  if (!reconciliationForm.dateRange || reconciliationForm.dateRange.length !== 2) {
    ElMessage.warning('请选择对账期间')
    return
  }
  try {
    const res = await finance.reconciliation({
      type: reconciliationForm.type,
      name: reconciliationForm.name,
      start_date: reconciliationForm.dateRange[0],
      end_date: reconciliationForm.dateRange[1]
    })
    reconciliationData.value = res?.data || res
    ElMessage.success('对账单生成成功')
  } catch (e) {
    ElMessage.error('对账失败: ' + (e.message || ''))
  }
}

// ===== 初始化 =====
onMounted(() => {
  loadSummary()
})
</script>

<style scoped>
.finance-page { padding: 0; }
.stat-item { display: flex; align-items: center; gap: 12px; }
.stat-label { font-size: 13px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: bold; margin-bottom: 2px; }
.stat-sub { font-size: 12px; color: #909399; }
.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
</style>