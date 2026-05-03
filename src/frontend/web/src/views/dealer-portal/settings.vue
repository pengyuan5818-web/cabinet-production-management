<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-title">账户设置</h2>
    </div>

    <el-tabs v-model="activeTab" class="settings-tabs">
      <!-- API Key 管理 -->
      <el-tab-pane label="API Key" name="apikey">
        <div class="tab-content">
          <div class="section-header">
            <h3>API 凭证</h3>
            <el-button type="primary" size="small" @click="generateApiKey">生成新 Key</el-button>
          </div>

          <el-table :data="apiKeys" stripe>
            <el-table-column prop="api_key" label="API Key" min-width="300">
              <template #default="{ row }">
                <code class="api-key">{{ row.api_key }}</code>
              </template>
            </el-table-column>
            <el-table-column prop="secret_key" label="Secret Key" min-width="200">
              <template #default="{ row }">
                <span v-if="!row.showSecret">{{ row.secret_key_masked }}</span>
                <code v-else>{{ row.secret_key }}</code>
                <el-button link size="small" @click="toggleSecret(row)">{{ row.showSecret ? '隐藏' : '显示' }}</el-button>
              </template>
            </el-table-column>
            <el-table-column prop="role_name" label="角色" width="120" />
            <el-table-column prop="created_at" label="创建时间" width="160" />
            <el-table-column prop="last_used_at" label="最后使用" width="160" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" link size="small" @click="revokeKey(row)">吊销</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="api-docs">
            <h4>API 调用说明</h4>
            <p>使用 API Key 访问经销商 Open API，请携带以下 Header：</p>
            <pre>Authorization: Bearer {api_key}
X-API-Secret: {secret_key}
X-Timestamp: {unix_timestamp}
X-Signature: {hmac_sha256_signature}</pre>
            <p>签名计算方式：<code>HMAC-SHA256(api_key + timestamp + request_body, secret_key)</code></p>
          </div>
        </div>
      </el-tab-pane>

      <!-- Webhook 配置 -->
      <el-tab-pane label="Webhook" name="webhooks">
        <div class="tab-content">
          <div class="section-header">
            <h3>Webhook 订阅</h3>
            <el-button type="primary" size="small" @click="showAddWebhook = true">+ 添加 Webhook</el-button>
          </div>

          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            工厂会在以下事件发生时主动推送通知到您的 URL。请确保您的服务器能接收并返回 200。
          </el-alert>

          <el-table :data="webhooks" stripe>
            <el-table-column prop="target_url" label="回调地址" min-width="250" />
            <el-table-column prop="event_type" label="事件类型" width="200">
              <template #default="{ row }">
                <el-tag size="small">{{ row.event_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="secret" label="加密密钥" width="150">
              <template #default="{ row }">
                <span v-if="!row.showSecret">••••••••</span>
                <code v-else>{{ row.secret }}</code>
                <el-button link size="small" @click="toggleWebhookSecret(row)">{{ row.showSecret ? '隐藏' : '显示' }}</el-button>
              </template>
            </el-table-column>
            <el-table-column prop="is_active" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                  {{ row.is_active ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="toggleWebhook(row)">
                  {{ row.is_active ? '停用' : '启用' }}
                </el-button>
                <el-button type="danger" link size="small" @click="deleteWebhook(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- Webhook 日志 -->
          <div style="margin-top: 24px">
            <h4>最近投递日志</h4>
            <el-table :data="webhookLogs" size="small">
              <el-table-column prop="event_type" label="事件" width="160" />
              <el-table-column prop="target_url" label="地址" min-width="200" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'info'" size="small">
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="response_code" label="HTTP 状态" width="100" />
              <el-table-column prop="attempt_count" label="重试次数" width="80" />
              <el-table-column prop="created_at" label="时间" width="160" />
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- 账户信息 -->
      <el-tab-pane label="账户信息" name="info">
        <div class="tab-content">
          <el-descriptions title="经销商信息" :column="2" border>
            <el-descriptions-item label="经销商代码">{{ dealerInfo?.dealer_code }}</el-descriptions-item>
            <el-descriptions-item label="经销商名称">{{ dealerInfo?.dealer_name }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ dealerInfo?.contact_person }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ dealerInfo?.phone }}</el-descriptions-item>
            <el-descriptions-item label="地址" :span="2">{{ dealerInfo?.fullAddress }}</el-descriptions-item>
            <el-descriptions-item label="佣金比例">{{ dealerInfo?.commission_rate }}%</el-descriptions-item>
            <el-descriptions-item label="信用等级">{{ dealerInfo?.credit_level }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加 Webhook 对话框 -->
    <el-dialog v-model="showAddWebhook" title="添加 Webhook" width="500px">
      <el-form :model="webhookForm" label-width="100px">
        <el-form-item label="回调地址" required>
          <el-input v-model="webhookForm.target_url" placeholder="https://your-server.com/webhook" />
        </el-form-item>
        <el-form-item label="事件类型" required>
          <el-select v-model="webhookForm.event_type" style="width: 100%">
            <el-option label="订单状态变更" value="order.status_changed" />
            <el-option label="生产阶段更新" value="order.production_stage" />
            <el-option label="订单已发货" value="order.shipped" />
            <el-option label="收款确认" value="payment.confirmed" />
            <el-option label="佣金结算" value="commission.settled" />
            <el-option label="发票创建" value="invoice.created" />
          </el-select>
        </el-form-item>
        <el-form-item label="加密密钥">
          <el-input v-model="webhookForm.secret" placeholder="留空则自动生成" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddWebhook = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="addWebhook">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const activeTab = ref('apikey')
const dealerInfo = ref(JSON.parse(localStorage.getItem('dealer_info') || '{}'))
const apiKeys = ref([])
const webhooks = ref([])
const webhookLogs = ref([])
const showAddWebhook = ref(false)
const submitting = ref(false)
const webhookForm = reactive({ target_url: '', event_type: '', secret: '' })

function formatMoney(v) { return v ? parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }
function getHeaders() { return { Authorization: `Bearer ${localStorage.getItem('dealer_token')}` } }

async function loadApiKeys() {
  try {
    const res = await axios.get(`/dealer/v1/api-keys`, { headers: getHeaders() })
    if (res.data.success) {
      apiKeys.value = (res.data.data || []).map(k => ({
        ...k,
        showSecret: false,
        secret_key_masked: k.secret_key ? k.secret_key.slice(0, 8) + '••••••••' + k.secret_key.slice(-4) : ''
      }))
    }
  } catch {}
}

function toggleSecret(row) {
  row.showSecret = !row.showSecret
}

async function generateApiKey() {
  try {
    await ElMessageBox.confirm('确定要生成新的 API Key 吗？旧 Key 将保留但建议尽快更新。', '生成新 Key')
    const res = await axios.post(`/dealer/v1/api-keys`, {}, { headers: getHeaders() })
    if (res.data.success) {
      ElMessage.success('新 Key 已生成')
      loadApiKeys()
    }
  } catch {}
}

async function revokeKey(row) {
  try {
    await ElMessageBox.confirm('吊销后该 Key 将立即失效，确定吗？', '确认吊销')
    await axios.delete(`/dealer/v1/api-keys/${row.id}`, { headers: getHeaders() })
    ElMessage.success('已吊销')
    loadApiKeys()
  } catch {}
}

async function loadWebhooks() {
  try {
    const res = await axios.get(`/dealer/v1/webhooks`, { headers: getHeaders() })
    if (res.data.success) {
      webhooks.value = (res.data.data || []).map(w => ({ ...w, showSecret: false }))
    }
  } catch {}
}

async function loadWebhookLogs() {
  try {
    const res = await axios.get(`/dealer/v1/webhook-logs`, { params: { page: 1, page_size: 20 }, headers: getHeaders() })
    if (res.data.success) webhookLogs.value = res.data.data?.list || []
  } catch {}
}

function toggleWebhookSecret(row) {
  row.showSecret = !row.showSecret
}

async function addWebhook() {
  if (!webhookForm.target_url) return ElMessage.warning('请填写回调地址')
  submitting.value = true
  try {
    const res = await axios.post(`/dealer/v1/webhooks`, webhookForm, { headers: getHeaders() })
    if (res.data.success) {
      ElMessage.success('Webhook 已添加')
      showAddWebhook.value = false
      loadWebhooks()
      Object.assign(webhookForm, { target_url: '', event_type: '', secret: '' })
    }
  } catch (err) { ElMessage.error(err.response?.data?.message || '添加失败') }
  finally { submitting.value = false }
}

async function toggleWebhook(row) {
  const action = row.is_active ? '停用' : '启用'
  await axios.put(`/dealer/v1/webhooks/${row.id}`, { is_active: !row.is_active }, { headers: getHeaders() })
  ElMessage.success(`Webhook 已${action}`)
  loadWebhooks()
}

async function deleteWebhook(row) {
  try {
    await ElMessageBox.confirm('删除后无法恢复，确定吗？', '确认删除')
    await axios.delete(`/dealer/v1/webhooks/${row.id}`, { headers: getHeaders() })
    ElMessage.success('已删除')
    loadWebhooks()
  } catch {}
}

onMounted(() => {
  loadApiKeys()
  loadWebhooks()
  loadWebhookLogs()
})
</script>

<style scoped>
.settings-page { padding: 0; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 22px; color: #333; }
.settings-tabs { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.tab-content { padding: 8px 0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { font-size: 16px; }
.api-key { font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; word-break: break-all; }
.api-docs { margin-top: 24px; background: #f9f9f9; border-radius: 8px; padding: 16px; }
.api-docs h4 { margin-bottom: 8px; }
.api-docs p { font-size: 13px; color: #666; margin-bottom: 8px; }
.api-docs pre { background: #1a1a2e; color: #a0ffcc; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; }
</style>
