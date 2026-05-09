<template>
  <div class="warehouse-page">
    <!-- 扫码输入区 -->
    <el-card class="scan-bar-card" shadow="never">
      <div class="scan-bar">
        <el-icon class="scan-icon"><Search /></el-icon>
        <el-input
          v-model="scanInput"
          placeholder="扫描或输入条码..."
          class="scan-input"
          @keyup.enter="handleScan"
          clearable
        >
          <template #append>
            <el-button @click="handleScan" :loading="scanLoading">查询</el-button>
          </template>
        </el-input>
        <CameraScanner @scan-success="handleCameraScan" />
        <el-select v-model="scanType" placeholder="类型" style="width: 120px">
          <el-option label="板件" value="board" />
          <el-option label="原材料" value="material" />
        </el-select>
        <el-button type="primary" @click="openScanInDialog">扫码入库</el-button>
        <el-button type="warning" @click="openScanOutDialog">扫码出库</el-button>
        <el-button type="success" @click="goToSort">分拣入库</el-button>
      </div>
    </el-card>

    <!-- 概览卡片 -->
    <div class="overview-cards">
      <el-card class="overview-card" shadow="hover">
        <div class="stat-item">
          <el-icon class="stat-icon" style="color: #409eff"><Box /></el-icon>
          <div>
            <div class="stat-label">总板件数</div>
            <div class="stat-value">{{ summary.total_boards || 0 }}</div>
          </div>
        </div>
      </el-card>
      <el-card class="overview-card" shadow="hover">
        <div class="stat-item">
          <el-icon class="stat-icon" style="color: #67c23a"><Grid /></el-icon>
          <div>
            <div class="stat-label">原材料种类</div>
            <div class="stat-value">{{ summary.total_materials || 0 }}</div>
          </div>
        </div>
      </el-card>
      <el-card class="overview-card" shadow="hover">
        <div class="stat-item">
          <el-icon class="stat-icon" style="color: #e6a23c"><Bottom /></el-icon>
          <div>
            <div class="stat-label">今日入库</div>
            <div class="stat-value">{{ summary.today_in || 0 }}</div>
          </div>
        </div>
      </el-card>
      <el-card class="overview-card" shadow="hover">
        <div class="stat-item">
          <el-icon class="stat-icon" style="color: #f56c6c"><Top /></el-icon>
          <div>
            <div class="stat-label">今日出库</div>
            <div class="stat-value">{{ summary.today_out || 0 }}</div>
          </div>
        </div>
      </el-card>
      <el-card class="overview-card" shadow="hover" @click="activeTab = 'alerts'">
        <div class="stat-item clickable">
          <el-icon class="stat-icon" style="color: #f56c6c"><Warning /></el-icon>
          <div>
            <div class="stat-label">库存预警</div>
            <div class="stat-value">{{ summary.alert_count || 0 }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 主内容区 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>仓库管理</span>
          <div>
            <el-button type="success" @click="showStockInDialog = true">入库</el-button>
            <el-button type="warning" @click="showStockOutDialog = true">出库</el-button>
            <el-button type="danger" @click="goToShipment">发货出库</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 库存列表 -->
        <el-tab-pane label="库存列表" name="inventory">
          <div class="filter-bar">
            <el-input v-model="invSearch" placeholder="搜索品名/条码/库位" clearable style="width: 240px" />
            <el-button type="primary" @click="loadInventory">搜索</el-button>
          </div>
          <el-table :data="inventory" v-loading="loading" style="margin-top: 16px" stripe>
            <el-table-column prop="material_name" label="物料名称" min-width="140" />
            <el-table-column prop="material_code" label="物料编码" width="150" />
            <el-table-column prop="category" label="类别" width="100" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="quantity" label="库存数量" width="110">
              <template #default="{ row }">
                <span :class="{ 'low-stock': row.quantity < row.min_stock }">{{ row.quantity }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="locked_quantity" label="锁定数量" width="100" />
            <el-table-column prop="warehouse_name" label="仓库" width="120" />
            <el-table-column prop="location_code" label="库位" width="100" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="handleAdjust(row)">调整</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="invPage"
            v-model:page-size="invPageSize"
            :total="invTotal"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
          />
        </el-tab-pane>

        <!-- 入库记录 -->
        <el-tab-pane label="入库记录" name="stockIn">
          <el-table :data="inRecords" v-loading="inLoading" style="margin-top: 16px" stripe>
            <el-table-column prop="created_at" label="入库时间" width="160">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="material_name" label="物料名称" min-width="140" />
            <el-table-column prop="material_code" label="物料编码" width="150" />
            <el-table-column prop="warehouse_name" label="仓库" width="120" />
            <el-table-column prop="location_code" label="库位" width="100" />
            <el-table-column prop="quantity" label="入库数量" width="100" />
            <el-table-column prop="counterparty" label="供应商" min-width="120" />
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          </el-table>
          <el-pagination
            v-model:current-page="inPage"
            v-model:page-size="inPageSize"
            :total="inTotal"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="loadInRecords"
          />
        </el-tab-pane>

        <!-- 出库记录 -->
        <el-tab-pane label="出库记录" name="stockOut">
          <el-table :data="outRecords" v-loading="outLoading" style="margin-top: 16px" stripe>
            <el-table-column prop="created_at" label="出库时间" width="160">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="material_name" label="物料名称" min-width="140" />
            <el-table-column prop="material_code" label="物料编码" width="150" />
            <el-table-column prop="warehouse_name" label="仓库" width="120" />
            <el-table-column prop="location_code" label="库位" width="100" />
            <el-table-column prop="quantity" label="出库数量" width="100" />
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          </el-table>
          <el-pagination
            v-model:current-page="outPage"
            v-model:page-size="outPageSize"
            :total="outTotal"
            layout="total, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="loadOutRecords"
          />
        </el-tab-pane>

        <!-- 成品库位 -->
        <el-tab-pane label="成品库位" name="finishedLocations">
          <div class="finished-loc-header">
            <span class="loc-summary">共 {{ finishedLocations.length }} 个库位　空闲 {{ finishedLocations.filter(l => l.status === 'empty').length }} 个　已占用 {{ finishedLocations.filter(l => l.status === 'occupied').length }} 个</span>
            <el-button type="primary" size="small" @click="showAddLocDialog = true">+ 新增库位</el-button>
          </div>
          <div class="location-grid">
            <el-card
              v-for="loc in finishedLocations"
              :key="loc.id"
              class="location-card"
              :class="{ 'location-occupied': loc.status === 'occupied', 'location-empty': loc.status === 'empty' }"
              shadow="hover"
            >
              <template #header>
                <div class="loc-header">
                  <span class="location-name">{{ loc.location_name }}</span>
                  <el-tag size="small" :type="loc.status === 'occupied' ? 'danger' : 'success'">
                    {{ loc.status === 'occupied' ? '已占用' : '空闲' }}
                  </el-tag>
                </div>
              </template>
              <div v-if="loc.status === 'occupied'" class="loc-order-info">
                <div class="order-no">📦 {{ loc.order_no }}</div>
                <div class="customer-name">{{ loc.customer_name || '-' }}</div>
                <div class="order-amount">¥{{ Number(loc.total_amount || 0).toLocaleString() }}</div>
                <div class="delivery-date" v-if="loc.actual_delivery">交货: {{ loc.actual_delivery }}</div>
                <div class="delivery-addr" v-if="loc.delivery_address">地址: {{ loc.delivery_address }}</div>
              </div>
              <div v-else class="loc-empty-hint">
                <span>等待订单入库</span>
              </div>
              <div class="loc-actions">
                <el-button
                  v-if="loc.status === 'occupied'"
                  type="warning"
                  size="small"
                  link
                  @click="resetLocation(loc)"
                >释放库位</el-button>
                <el-button
                  v-else
                  type="danger"
                  size="small"
                  link
                  @click="deleteLocation(loc)"
                >删除</el-button>
              </div>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 库位管理 -->
        <el-tab-pane label="库位管理" name="locations">
          <div style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <el-select v-model="locFilterWh" placeholder="筛选仓库" clearable style="width:160px">
              <el-option v-for="wh in warehouseList" :key="wh.id" :label="wh.warehouse_name" :value="wh.id" />
            </el-select>
            <el-button type="primary" size="small" @click="showAddLocDialog2 = true">+ 新增库位</el-button>
          </div>
          <el-table :data="allLocations" v-loading="locLoading" stripe size="small">
            <el-table-column prop="location_code" label="库位编码" width="140" />
            <el-table-column prop="location_name" label="库位名称" min-width="140" />
            <el-table-column prop="warehouse_name" label="所属仓库" width="140" />
            <el-table-column prop="zone" label="区域" width="100" />
            <el-table-column prop="shelf" label="货架" width="100" />
            <el-table-column prop="layer" label="层" width="60" align="center" />
            <el-table-column prop="position" label="位" width="60" align="center" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }"><el-tag size="small" :type="row.status==='active'?'success':'info'">{{ row.status==='active'?'启用':'禁用' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditLoc(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteLoc(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 仓库设置 -->
        <el-tab-pane label="仓库设置" name="warehouseSettings">
          <div style="margin-bottom:12px">
            <el-button type="primary" size="small" @click="openAddWhDialog">+ 新增仓库</el-button>
          </div>
          <el-table :data="warehouseList" stripe size="small">
            <el-table-column prop="warehouse_code" label="仓库编码" width="140" />
            <el-table-column prop="warehouse_name" label="仓库名称" min-width="160">
              <template #default="{ row }">
                <span v-if="editingWhId !== row.id">{{ row.warehouse_name }}</span>
                <el-input v-else v-model="editWhForm.warehouse_name" size="small" style="width:140px" />
              </template>
            </el-table-column>
            <el-table-column prop="warehouse_type" label="类型" width="120">
              <template #default="{ row }">
                <span v-if="editingWhId !== row.id">{{ row.warehouse_type }}</span>
                <el-select v-else v-model="editWhForm.warehouse_type" size="small" style="width:100px">
                  <el-option label="原材料仓" value="raw" /><el-option label="成品仓" value="finished" /><el-option label="配件仓" value="accessories" /><el-option label="其他" value="other" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="address" label="地址" min-width="160">
              <template #default="{ row }">
                <span v-if="editingWhId !== row.id">{{ row.address || '-' }}</span>
                <el-input v-else v-model="editWhForm.address" size="small" style="width:160px" />
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="联系电话" width="130">
              <template #default="{ row }">
                <span v-if="editingWhId !== row.id">{{ row.phone || '-' }}</span>
                <el-input v-else v-model="editWhForm.phone" size="small" style="width:110px" />
              </template>
            </el-table-column>
            <el-table-column prop="manager_name" label="负责人" width="110">
              <template #default="{ row }">
                <span v-if="editingWhId !== row.id">{{ row.manager_name || '-' }}</span>
                <el-input v-else v-model="editWhForm.manager_name" size="small" style="width:90px" />
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <span v-if="editingWhId !== row.id"><el-tag size="small" :type="row.status==='active'?'success':'info'">{{ row.status==='active'?'启用':'禁用' }}</el-tag></span>
                <el-select v-else v-model="editWhForm.status" size="small" style="width:70px">
                  <el-option label="启用" value="active" /><el-option label="禁用" value="inactive" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <template v-if="editingWhId !== row.id">
                  <el-button type="primary" link size="small" @click="openEditWh(row)">编辑</el-button>
                  <el-button type="warning" link size="small" @click="saveWh(row.id)">保存</el-button>
                </template>
                <template v-else>
                  <el-button type="success" link size="small" @click="saveWh(row.id)">保存</el-button>
                  <el-button link size="small" @click="editingWhId = null">取消</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 库存预警 -->
        <el-tab-pane label="库存预警" name="alerts">
          <el-table :data="alerts" v-loading="alertLoading" style="margin-top: 16px" stripe>
            <el-table-column prop="material_name" label="物料名称" min-width="140" />
            <el-table-column prop="material_code" label="编码" width="150" />
            <el-table-column prop="category" label="类别" width="100" />
            <el-table-column prop="current_quantity" label="当前库存" width="100">
              <template #default="{ row }">
                <span :class="row.alert_level === 'critical' ? 'low-stock' : 'warn-stock'">
                  {{ row.current_quantity }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="safe_stock" label="安全库存" width="100" />
            <el-table-column prop="min_stock" label="最低库存" width="100" />
            <el-table-column prop="warehouse_name" label="仓库" width="120" />
            <el-table-column label="预警等级" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.alert_level === 'critical' ? 'danger' : 'warning'">
                  {{ row.alert_level === 'critical' ? '紧急' : '警告' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 扫码结果弹窗 -->
    <el-dialog v-model="showScanResult" title="扫码结果" width="480px">
      <el-descriptions :column="2" border v-if="scanResult">
        <el-descriptions-item label="条码">{{ scanResult.barcode }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ scanResult.type === 'board' ? '板件' : '原材料' }}</el-descriptions-item>
        <el-descriptions-item label="品名" :span="2">{{ scanResult.info?.material_name || scanResult.info?.board_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前库存">{{ scanResult.info?.stock_quantity ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="库位">{{ scanResult.info?.location_code || scanResult.info?.warehouse_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规格" v-if="scanResult.info?.specification" :span="2">{{ scanResult.info.specification }}</el-descriptions-item>
        <el-descriptions-item label="订单号" v-if="scanResult.info?.order_no" :span="2">{{ scanResult.info.order_no }}</el-descriptions-item>
        <el-descriptions-item label="客户" v-if="scanResult.info?.customer_name" :span="2">{{ scanResult.info.customer_name }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showScanResult = false">关闭</el-button>
        <el-button v-if="scanResult?.type === 'material'" type="success" @click="quickIn(scanResult)">入库</el-button>
        <el-button v-if="scanResult?.type === 'material'" type="warning" @click="quickOut(scanResult)">出库</el-button>
      </template>
    </el-dialog>

    <!-- 扫码入库弹窗 -->
    <el-dialog v-model="showScanInDialog" title="扫码入库" width="500px">
      <el-form :model="scanInForm" label-width="100px">
        <el-form-item label="条码">
          <el-input v-model="scanInForm.barcode" placeholder="扫描或输入条码" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="scanInForm.type" style="width: 100%">
            <el-option label="板件" value="board" />
            <el-option label="原材料" value="material" />
          </el-select>
        </el-form-item>
        <el-form-item label="库位">
          <el-select v-model="scanInForm.location" placeholder="选择库位" style="width: 100%" filterable allow-create>
            <el-option v-for="loc in locations" :key="loc.id" :label="loc.location_code" :value="loc.location_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="scanInForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="scanInForm.remark" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showScanInDialog = false">取消</el-button>
        <el-button type="success" :loading="scanSubmitting" @click="submitScanIn">确认入库</el-button>
      </template>
    </el-dialog>

    <!-- 扫码出库弹窗 -->
    <el-dialog v-model="showScanOutDialog" title="扫码出库" width="500px">
      <el-form :model="scanOutForm" label-width="100px">
        <el-form-item label="条码">
          <el-input v-model="scanOutForm.barcode" placeholder="扫描或输入条码" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="scanOutForm.type" style="width: 100%">
            <el-option label="板件" value="board" />
            <el-option label="原材料" value="material" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联订单">
          <el-input v-model="scanOutForm.order_id" placeholder="成品出库时填写订单ID" />
        </el-form-item>
        <el-form-item label="库位">
          <el-select v-model="scanOutForm.location" placeholder="选择库位" style="width: 100%" filterable allow-create>
            <el-option v-for="loc in locations" :key="loc.id" :label="loc.location_code" :value="loc.location_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="scanOutForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="scanOutForm.remark" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showScanOutDialog = false">取消</el-button>
        <el-button type="warning" :loading="scanSubmitting" @click="submitScanOut">确认出库</el-button>
      </template>
    </el-dialog>

    <!-- 库存调整弹窗 -->
    <el-dialog v-model="showAdjustDialog" title="调整库存" width="400px">
      <el-form :model="adjustForm" label-width="90px">
        <el-form-item label="物料">{{ adjustForm.material_name }}</el-form-item>
        <el-form-item label="当前库存">{{ adjustForm.current_qty }}</el-form-item>
        <el-form-item label="调整数量">
          <el-input-number v-model="adjustForm.adjust_qty" :min="0" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="adjustForm.reason" placeholder="调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdjustDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust">确认</el-button>
      </template>
    </el-dialog>

    <!-- 新增库位对话框（成品库位专用） -->
    <el-dialog v-model="showAddLocDialog" title="新增库位" width="400px">
      <el-form :model="addLocForm" label-width="90px">
        <el-form-item label="库位编码" required>
          <el-input v-model="addLocForm.location_code" placeholder="例如：B-2" style="margin-bottom:8px" />
        </el-form-item>
        <el-form-item label="库位名称">
          <el-input v-model="addLocForm.location_name" placeholder="可选，如：区域B-库位2号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddLocDialog = false">取消</el-button>
        <el-button type="primary" :loading="addLocLoading" @click="submitAddLoc">确认</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑库位对话框（通用） -->
    <el-dialog v-model="showAddLocDialog2" :title="editLocId ? '编辑库位' : '新增库位'" width="420px">
      <el-form :model="editLocForm" label-width="90px">
        <el-form-item label="所属仓库" required>
          <el-select v-model="editLocForm.warehouse_id" placeholder="选择仓库" style="width:100%">
            <el-option v-for="wh in warehouseList" :key="wh.id" :label="wh.warehouse_name" :value="wh.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="库位编码" required>
          <el-input v-model="editLocForm.location_code" placeholder="例如：FIN-01-01" :disabled="!!editLocId" />
        </el-form-item>
        <el-form-item label="库位名称">
          <el-input v-model="editLocForm.location_name" placeholder="可选" />
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="editLocForm.zone" placeholder="例如：A区" />
        </el-form-item>
        <el-form-item label="货架">
          <el-input v-model="editLocForm.shelf" placeholder="例如：A排" />
        </el-form-item>
        <el-form-item label="层/位">
          <el-input-number v-model="editLocForm.layer" :min="1" placeholder="层" style="width:45%" />
          <el-input-number v-model="editLocForm.position" :min="1" placeholder="位" style="width:45%;margin-left:10px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editLocForm.status" style="width:100%">
            <el-option label="启用" value="active" /><el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddLocDialog2 = false; editLocId = null">取消</el-button>
        <el-button type="primary" :loading="addLocLoading" @click="submitLocEdit">确认</el-button>
      </template>
    </el-dialog>

    <!-- 新增仓库对话框 -->
    <el-dialog v-model="showAddWhDialog" title="新增仓库" width="420px">
      <el-form :model="addWhForm" label-width="90px">
        <el-form-item label="仓库编码" required>
          <el-input v-model="addWhForm.warehouse_code" placeholder="例如：WH004T" />
        </el-form-item>
        <el-form-item label="仓库名称" required>
          <el-input v-model="addWhForm.warehouse_name" placeholder="例如：工厂原材料仓" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="addWhForm.warehouse_type" style="width:100%">
            <el-option label="原材料仓" value="raw" /><el-option label="成品仓" value="finished" /><el-option label="配件仓" value="accessories" /><el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="addWhForm.address" placeholder="工厂内地址" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="addWhForm.phone" placeholder="可选" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="addWhForm.manager_name" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddWhDialog = false">取消</el-button>
        <el-button type="primary" :loading="saveWhLoading" @click="submitAddWh">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, shallowRef, watch } from 'vue'
import { warehouse } from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Box, Grid, Bottom, Top, Warning, Search } from '@element-plus/icons-vue'
import CameraScanner from '../../components/CameraScanner.vue'

const loading = ref(false)
const scanLoading = ref(false)
const scanSubmitting = ref(false)
const inLoading = ref(false)
const outLoading = ref(false)
const alertLoading = ref(false)

// 概览
const summary = ref({})

// 列表数据
const inventory = ref([])
const inRecords = ref([])
const outRecords = ref([])
const alerts = ref([])
const locations = ref([])
const finishedLocations = ref([])

// 分页
const invPage = ref(1)
const invPageSize = ref(50)
const invTotal = ref(0)
const invSearch = ref('')
const inPage = ref(1)
const inPageSize = ref(20)
const inTotal = ref(0)
const outPage = ref(1)
const outPageSize = ref(20)
const outTotal = ref(0)

// 标签页
const activeTab = ref('inventory')

// 扫码
const scanInput = ref('')
const scanType = ref('material')
const showScanResult = ref(false)
const scanResult = ref(null)
const showScanInDialog = ref(false)
const showScanOutDialog = ref(false)
const scanInForm = ref({ barcode: '', type: 'material', location: '', quantity: 1, remark: '' })
const scanOutForm = ref({ barcode: '', type: 'material', order_id: '', location: '', quantity: 1, remark: '' })

// 库存调整
const showAdjustDialog = ref(false)
const adjustForm = ref({ material_name: '', current_qty: 0, adjust_qty: 0, reason: '' })

// 常规入库/出库
const showStockInDialog = ref(false)
const showStockOutDialog = ref(false)
const showAddLocDialog = ref(false)
const showAddLocDialog2 = ref(false)
const addLocLoading = ref(false)
const addLocForm = ref({ location_code: '', location_name: '' })

// 通用库位
const allLocations = ref([])
const locLoading = ref(false)
const locFilterWh = ref('')
const editLocId = ref(null)
const editLocForm = ref({ warehouse_id: '', location_code: '', location_name: '', zone: '', shelf: '', layer: null, position: null, status: 'active' })

// 仓库
const warehouseList = ref([])
const editingWhId = ref(null)
const editWhForm = ref({ warehouse_name: '', warehouse_type: '', address: '', phone: '', manager_name: '', status: 'active' })
const showAddWhDialog = ref(false)
const saveWhLoading = ref(false)
const addWhForm = ref({ warehouse_code: '', warehouse_name: '', warehouse_type: 'raw', address: '', phone: '', manager_name: '' })

const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN') : '-'

const loadSummary = async () => {
  try {
    const res = await warehouse.summary()
    if (res.success) summary.value = res.data
  } catch (e) { console.error(e) }
}

const loadInventory = async () => {
  loading.value = true
  try {
    const res = await warehouse.list({ page: invPage.value, page_size: invPageSize.value, search: invSearch.value })
    if (res.success) {
      inventory.value = res.data.list || []
      invTotal.value = res.data.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const loadInRecords = async () => {
  inLoading.value = true
  try {
    const res = await warehouse.stockRecords({ page: inPage.value, page_size: inPageSize.value, type: 'in' })
    if (res.success) {
      inRecords.value = res.data.list || []
      inTotal.value = res.data.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  inLoading.value = false
}

const loadOutRecords = async () => {
  outLoading.value = true
  try {
    const res = await warehouse.stockRecords({ page: outPage.value, page_size: outPageSize.value, type: 'out' })
    if (res.success) {
      outRecords.value = res.data.list || []
      outTotal.value = res.data.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  outLoading.value = false
}

const loadLocations = async () => {
  try {
    const res = await warehouse.locations()
    if (res.success) locations.value = res.data
  } catch (e) { console.error(e) }
}

const loadAllLocations = async () => {
  locLoading.value = true
  try {
    const res = await warehouse.getAllLocations({ warehouse_id: locFilterWh.value || undefined })
    if (res.success) allLocations.value = res.data
  } catch (e) { console.error(e) }
  locLoading.value = false
}

const loadWarehouseList = async () => {
  try {
    const res = await warehouse.getWarehouses()
    if (res.success) warehouseList.value = res.data
  } catch (e) { console.error(e) }
}

const openEditLoc = (row) => {
  editLocId.value = row.id
  editLocForm.value = {
    warehouse_id: row.warehouse_id,
    location_code: row.location_code,
    location_name: row.location_name || '',
    zone: row.zone || '',
    shelf: row.shelf || '',
    layer: row.layer,
    position: row.position,
    status: row.status || 'active',
  }
  showAddLocDialog2.value = true
}

const submitLocEdit = async () => {
  if (!editLocForm.value.warehouse_id) { ElMessage.warning('请选择仓库'); return }
  if (!editLocForm.value.location_code) { ElMessage.warning('请输入库位编码'); return }
  addLocLoading.value = true
  try {
    let res
    if (editLocId.value) {
      res = await warehouse.updateLocation(editLocId.value, editLocForm.value)
    } else {
      res = await warehouse.createLocation(editLocForm.value)
    }
    if (res.success) {
      ElMessage.success('保存成功')
      showAddLocDialog2.value = false
      editLocId.value = null
      loadAllLocations()
      loadWarehouseList()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) { ElMessage.error('保存失败') }
  addLocLoading.value = false
}

const handleDeleteLoc = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除库位"${row.location_name || row.location_code}"？`, '提示', { type: 'warning' })
    const res = await warehouse.deleteLocation(row.id)
    if (res.success) {
      ElMessage.success('已删除')
      loadAllLocations()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

const openEditWh = (row) => {
  if (editingWhId.value === row.id) return
  editingWhId.value = row.id
  editWhForm.value = {
    warehouse_name: row.warehouse_name,
    warehouse_type: row.warehouse_type || '',
    address: row.address || '',
    phone: row.phone || '',
    manager_name: row.manager_name || '',
    status: row.status || 'active',
  }
}

const saveWh = async (id) => {
  if (!editWhForm.value.warehouse_name) { ElMessage.warning('仓库名称不能为空'); return }
  saveWhLoading.value = true
  try {
    const res = await warehouse.updateWarehouse(id, editWhForm.value)
    if (res.success) {
      ElMessage.success('保存成功')
      editingWhId.value = null
      loadWarehouseList()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) { ElMessage.error('保存失败') }
  saveWhLoading.value = false
}

const openAddWhDialog = () => {
  addWhForm.value = { warehouse_code: '', warehouse_name: '', warehouse_type: 'raw', address: '', phone: '', manager_name: '' }
  showAddWhDialog.value = true
}

const submitAddWh = async () => {
  if (!addWhForm.value.warehouse_name) { ElMessage.warning('仓库名称不能为空'); return }
  saveWhLoading.value = true
  try {
    const res = await warehouse.createWarehouse(addWhForm.value)
    if (res.success) {
      ElMessage.success('新增成功')
      showAddWhDialog.value = false
      loadWarehouseList()
    } else {
      ElMessage.error(res.message || '新增失败')
    }
  } catch (e) { ElMessage.error('新增失败') }
  saveWhLoading.value = false
}

const loadFinishedLocations = async () => {
  try {
    const res = await warehouse.finishedLocations()
    if (res.success) finishedLocations.value = res.data
  } catch (e) { console.error(e) }
}

const submitAddLoc = async () => {
  if (!addLocForm.value.location_code) { ElMessage.warning('请输入库位编码'); return }
  addLocLoading.value = true
  try {
    const res = await warehouse.addFinishedLocation({ location_code: addLocForm.value.location_code, location_name: addLocForm.value.location_name })
    if (res.success) {
      ElMessage.success('新增成功')
      showAddLocDialog.value = false
      addLocForm.value.location_code = ''
      addLocForm.value.location_name = ''
      loadFinishedLocations()
    } else {
      ElMessage.error(res.message || '新增失败')
    }
  } catch (e) { ElMessage.error('新增失败') }
  addLocLoading.value = false
}

const deleteLocation = async (loc) => {
  try {
    await ElMessageBox.confirm(`确认删除"${loc.location_name}"？`, '提示', { type: 'warning' })
    const res = await warehouse.deleteFinishedLocation(loc.id)
    if (res.success) {
      ElMessage.success('已删除')
      loadFinishedLocations()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

const resetLocation = async (loc) => {
  try {
    await ElMessageBox.confirm(`确认释放"${loc.location_name}"（订单将解除绑定）？`, '提示', { type: 'warning' })
    const res = await warehouse.resetFinishedLocation(loc.id)
    if (res.success) {
      ElMessage.success('已释放')
      loadFinishedLocations()
    } else {
      ElMessage.error(res.message || '释放失败')
    }
  } catch (e) { if (e !== 'cancel') ElMessage.error('释放失败') }
}

const loadAlerts = async () => {
  alertLoading.value = true
  try {
    const res = await warehouse.alerts()
    if (res.success) alerts.value = res.data
  } catch (e) { ElMessage.error('加载失败') }
  alertLoading.value = false
}

const handleScan = async () => {
  if (!scanInput.value) return
  scanLoading.value = true
  try {
    const res = await warehouse.scan(scanInput.value)
    if (res.success) {
      scanResult.value = res.data
      showScanResult.value = true
    } else {
      ElMessage.warning(res.message || '条码不存在')
    }
  } catch (e) { ElMessage.error('查询失败') }
  scanLoading.value = false
}

const handleCameraScan = (barcode) => {
  scanInput.value = barcode
  handleScan()
}

const openScanInDialog = () => {
  scanInForm.value = { barcode: scanInput.value, type: scanType.value, location: '', quantity: 1, remark: '' }
  showScanInDialog.value = true
}

const openScanOutDialog = () => {
  scanOutForm.value = { barcode: scanInput.value, type: scanType.value, order_id: '', location: '', quantity: 1, remark: '' }
  showScanOutDialog.value = true
}

const submitScanIn = async () => {
  scanSubmitting.value = true
  try {
    const res = await warehouse.scanIn(scanInForm.value)
    if (res.success) {
      ElMessage.success('入库成功')
      showScanInDialog.value = false
      loadSummary()
      loadInventory()
    } else {
      ElMessage.error(res.message || '入库失败')
    }
  } catch (e) { ElMessage.error('入库失败') }
  scanSubmitting.value = false
}

const submitScanOut = async () => {
  scanSubmitting.value = true
  try {
    const res = await warehouse.scanOut(scanOutForm.value)
    if (res.success) {
      ElMessage.success('出库成功')
      showScanOutDialog.value = false
      loadSummary()
      loadInventory()
    } else {
      ElMessage.error(res.message || '出库失败')
    }
  } catch (e) { ElMessage.error('出库失败') }
  scanSubmitting.value = false
}

const quickIn = (result) => {
  showScanResult.value = false
  scanInForm.value = {
    barcode: result.barcode,
    type: result.type,
    location: result.info?.location_code || '',
    quantity: 1,
    remark: ''
  }
  showScanInDialog.value = true
}

const quickOut = (result) => {
  showScanResult.value = false
  scanOutForm.value = {
    barcode: result.barcode,
    type: result.type,
    location: result.info?.location_code || '',
    quantity: 1,
    remark: ''
  }
  showScanOutDialog.value = true
}

const handleAdjust = (row) => {
  adjustForm.value = {
    material_name: row.material_name,
    current_qty: row.quantity,
    adjust_qty: row.quantity,
    reason: '',
    id: row.id
  }
  showAdjustDialog.value = true
}

const submitAdjust = async () => {
  if (!adjustForm.value.adjust_qty) { ElMessage.warning('请输入调整数量'); return }
  try {
    const res = await warehouse.adjust({
      id: adjustForm.value.id,
      quantity: adjustForm.value.adjust_qty,
      reason: adjustForm.value.reason
    })
    if (res.success) {
      ElMessage.success('库存调整成功')
      showAdjustDialog.value = false
      loadInventory()
    } else {
      ElMessage.error(res.message || '调整失败')
    }
  } catch (e) { ElMessage.error('调整失败') }
}

const goToSort = () => {
  window.location.hash = '#/sort'
}

const goToShipment = () => {
  window.location.hash = '#/shipment'
}

onMounted(() => {
  loadSummary()
  loadInventory()
  loadLocations()
  loadFinishedLocations()
})

watch(() => activeTab.value, (tab) => {
  if (tab === 'finishedLocations') loadFinishedLocations()
  if (tab === 'locations') { loadLocations(); loadAllLocations() }
  if (tab === 'alerts') loadAlerts()
  if (tab === 'warehouseSettings') loadWarehouseList()
})

watch(locFilterWh, () => loadAllLocations())
watch(invPageSize, () => loadInventory())
watch(inPageSize, () => loadInRecords())
watch(outPageSize, () => loadOutRecords())
</script>

<style scoped>
.warehouse-page {
  padding: 16px;
}
.scan-bar-card {
  margin-bottom: 16px;
}
.scan-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.scan-icon {
  font-size: 20px;
  color: #409eff;
}
.scan-input {
  flex: 1;
  max-width: 400px;
}
.overview-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.overview-card {
  cursor: pointer;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-item.clickable {
  cursor: pointer;
}
.stat-icon {
  font-size: 28px;
}
.stat-label {
  font-size: 12px;
  color: #909399;
}
.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}
.low-stock {
  color: #f56c6c;
  font-weight: bold;
}
.warn-stock {
  color: #e6a23c;
  font-weight: bold;
}
.location-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.location-card {
  cursor: pointer;
}
.location-occupied {
  border-left: 4px solid #f56c6c;
}
.location-empty {
  border-left: 4px solid #67c23a;
}
.loc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.location-name {
  font-weight: bold;
}
.location-info {
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
}
.loc-order-info {
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
}
.loc-order-info .order-no {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.loc-order-info .customer-name {
  color: #409eff;
}
.loc-order-info .order-amount {
  font-size: 16px;
  font-weight: bold;
  color: #e6a23c;
}
.loc-empty-hint {
  text-align: center;
  color: #909399;
  padding: 20px 0;
  font-size: 13px;
}
</style>
