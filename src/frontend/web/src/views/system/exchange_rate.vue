<template>
  <div class="exchange-rate-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>汇率管理</span>
          <el-button icon="Refresh" @click="loadRates">刷新汇率</el-button>
        </div>
      </template>

      <!-- 换算工具 -->
      <div class="converter-box">
        <span style="font-weight: 600; margin-right: 8px">快速换算</span>
        <el-input-number v-model="convertForm.amount" :min="0" :precision="2" style="width: 140px" />
        <el-select v-model="convertForm.from" style="width: 110px; margin-left: 8px">
          <el-option v-for="r in rates" :key="r.currency" :label="r.currency + ' ' + r.currency_name" :value="r.currency" />
        </el-select>
        <span style="margin: 0 8px; color: #999">→</span>
        <el-select v-model="convertForm.to" style="width: 110px">
          <el-option v-for="r in rates" :key="r.currency" :label="r.currency + ' ' + r.currency_name" :value="r.currency" />
        </el-select>
        <el-button type="primary" style="margin-left: 8px" :loading="converting" @click="doConvert">换算</el-button>
        <span v-if="convertResult !== null" class="convert-result">
          {{ convertForm.amount }} {{ convertForm.from }} =
          <strong>{{ convertResult }} {{ convertForm.to }}</strong>
        </span>
      </div>

      <!-- 汇率列表 -->
      <el-table :data="rates" v-loading="loading" style="margin-top: 20px" stripe>
        <el-table-column prop="currency" label="货币代码" width="120">
          <template #default="{ row }">
            <strong>{{ row.currency }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="currency_name" label="货币名称" width="120" />
        <el-table-column prop="symbol" label="符号" width="80">
          <template #default="{ row }">
            <span style="font-size: 18px">{{ row.symbol }}</span>
          </template>
        </el-table-column>
        <el-table-column label="汇率（对人民币）" min-width="200">
          <template #default="{ row }">
            <span>1 {{ row.currency }} = {{ row.rate_to_cny }} CNY</span>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openEditDialog(row)">编辑汇率</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑汇率对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑汇率" width="400px">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="货币">
          <el-input v-model="editForm.currency" disabled />
        </el-form-item>
        <el-form-item label="货币名称">
          <el-input v-model="editForm.currency_name" disabled />
        </el-form-item>
        <el-form-item label="符号">
          <el-input v-model="editForm.symbol" disabled />
        </el-form-item>
        <el-form-item label="1外币= ? CNY" required>
          <el-input-number
            v-model="editForm.rate_to_cny"
            :min="0.000001"
            :precision="6"
            style="width: 100%"
          />
          <div style="color: #999; font-size: 12px; margin-top: 4px">
            例如：USD = 7.250000 表示 1 美元 = 7.25 元人民币
          </div>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="editForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { exchangeRate } from '@/api'

const rates = ref([])
const loading = ref(false)
const saving = ref(false)
const converting = ref(false)
const convertResult = ref(null)

const convertForm = reactive({
  amount: 1000,
  from: 'USD',
  to: 'CNY'
})

const editDialogVisible = ref(false)
const editForm = reactive({
  currency: '',
  currency_name: '',
  symbol: '',
  rate_to_cny: 1,
  is_active: true
})

async function loadRates() {
  loading.value = true
  try {
    const res = await exchangeRate.list()
    if (res.success) {
      rates.value = res.data
    }
  } catch (e) {
    ElMessage.error('加载汇率失败')
  } finally {
    loading.value = false
  }
}

async function doConvert() {
  converting.value = true
  try {
    const res = await exchangeRate.convert({
      amount: convertForm.amount,
      from_currency: convertForm.from,
      to_currency: convertForm.to
    })
    if (res.success) {
      convertResult.value = res.converted
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('换算失败')
  } finally {
    converting.value = false
  }
}

function openEditDialog(row) {
  editForm.currency = row.currency
  editForm.currency_name = row.currency_name
  editForm.symbol = row.symbol
  editForm.rate_to_cny = parseFloat(row.rate_to_cny)
  editForm.is_active = row.is_active
  editDialogVisible.value = true
}

async function saveRate() {
  if (!editForm.rate_to_cny || editForm.rate_to_cny <= 0) {
    ElMessage.warning('请输入正确的汇率')
    return
  }
  saving.value = true
  try {
    const res = await exchangeRate.update(editForm.currency, {
      rate_to_cny: editForm.rate_to_cny,
      is_active: editForm.is_active
    })
    if (res.success) {
      ElMessage.success('汇率更新成功')
      editDialogVisible.value = false
      await loadRates()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

onMounted(() => {
  loadRates()
})
</script>

<style scoped>
.exchange-rate-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.converter-box {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
}
.convert-result {
  margin-left: 16px;
  font-size: 16px;
  color: #409eff;
}
</style>
