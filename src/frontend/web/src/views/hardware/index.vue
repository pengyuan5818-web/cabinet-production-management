<template>
  <div class="hardware-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>硬件设备管理</h2>
      <p class="subtitle">扫码枪监听 / 语音播报测试</p>
    </div>

    <!-- 扫码枪管理 -->
    <el-card class="section-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📡 扫码枪控制</span>
          <el-tag :type="scanConnected ? 'success' : 'info'" size="small">
            {{ scanConnected ? '已连接 ' + currentPort : '未连接' }}
          </el-tag>
        </div>
      </template>

      <!-- 端口选择 -->
      <div class="control-row">
        <el-select
          v-model="selectedPort"
          placeholder="选择COM端口"
          :disabled="scanConnected"
          filterable
          style="width: 220px"
        >
          <el-option
            v-for="port in portList"
            :key="port.path"
            :label="`${port.path} ${port.manufacturer ? '(' + port.manufacturer + ')' : ''}`"
            :value="port.path"
          />
        </el-select>

        <el-input-number
          v-model="baudRate"
          :min="1200"
          :max="115200"
          :step="9600"
          :disabled="scanConnected"
          style="width: 150px"
          controls-position="right"
        />

        <el-button
          type="primary"
          :icon="scanConnected ? 'CircleClose' : 'Connection'"
          :disabled="!scanConnected && !selectedPort"
          @click="toggleScan"
        >
          {{ scanConnected ? '断开' : '连接' }}
        </el-button>

        <el-button @click="refreshPorts" :icon="Refresh" :loading="refreshingPorts">
          刷新端口
        </el-button>
      </div>

      <!-- 扫码结果显示 -->
      <div class="scan-result-area">
        <div class="result-label">扫码结果：</div>
        <div class="result-display" :class="{ 'has-data': lastScan }">
          <template v-if="lastScan">
            <div class="barcode-text">{{ lastScan.barcode }}</div>
            <div class="barcode-meta">
              <span>端口: {{ lastScan.port }}</span>
              <span>时间: {{ formatTime(lastScan.timestamp) }}</span>
            </div>
          </template>
          <template v-else>
            <span class="placeholder">等待扫码...</span>
          </template>
        </div>
      </div>

      <!-- 扫码历史 -->
      <div class="history-area">
        <div class="history-label">扫码历史：</div>
        <el-table :data="scanHistory" size="small" max-height="200" style="width: 100%">
          <el-table-column prop="barcode" label="条码" min-width="160" />
          <el-table-column prop="port" label="端口" width="80" />
          <el-table-column prop="timestamp" label="时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 语音播报 -->
    <el-card class="section-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>🔊 语音播报测试</span>
          <el-tag type="info" size="small">edge-tts</el-tag>
        </div>
      </template>

      <!-- 音色选择 -->
      <div class="control-row">
        <el-select v-model="selectedVoice" placeholder="选择音色" style="width: 260px">
          <el-option-group label="中文女声">
            <el-option
              v-for="v in zhFemaleVoices"
              :key="v.id"
              :label="`${v.name} (${v.id})`"
              :value="v.id"
            />
          </el-option-group>
          <el-option-group label="中文男声">
            <el-option
              v-for="v in zhMaleVoices"
              :key="v.id"
              :label="`${v.name} (${v.id})`"
              :value="v.id"
            />
          </el-option-group>
          <el-option-group label="英文">
            <el-option
              v-for="v in enVoices"
              :key="v.id"
              :label="`${v.name} (${v.id})`"
              :value="v.id"
            />
          </el-option-group>
        </el-select>

        <el-button @click="loadVoices" :icon="Refresh" :loading="loadingVoices">
          刷新音色
        </el-button>
      </div>

      <!-- 语速/音量 -->
      <div class="control-row" style="margin-top: 12px">
        <span style="width: 60px; color: #666">语速:</span>
        <el-slider
          v-model="voiceRate"
          :min="-50"
          :max="100"
          :format-tooltip="v => (v >= 0 ? '+' + v : v) + '%'"
          style="width: 160px"
        />
        <span style="width: 60px; color: #666; text-align: right">{{ voiceRate >= 0 ? '+' : '' }}{{ voiceRate }}%</span>

        <span style="width: 60px; color: #666; margin-left: 24px">音量:</span>
        <el-slider
          v-model="voiceVolume"
          :min="-50"
          :max="50"
          :format-tooltip="v => (v >= 0 ? '+' : v) + '%'"
          style="width: 160px"
        />
        <span style="width: 50px; color: #666">{{ voiceVolume >= 0 ? '+' : '' }}{{ voiceVolume }}%</span>
      </div>

      <!-- 文字输入 -->
      <div class="voice-input-area">
        <el-input
          v-model="voiceText"
          type="textarea"
          :rows="3"
          placeholder="输入要播报的文本，例如：订单10001，请到分拣区"
          maxlength="200"
          show-word-limit
        />
      </div>

      <!-- 快捷短语 -->
      <div class="quick-phrases">
        <span style="color: #666; font-size: 13px; margin-right: 8px">快捷:</span>
        <el-tag
          v-for="phrase in quickPhrases"
          :key="phrase"
          class="phrase-tag"
          @click="voiceText = phrase"
        >
          {{ phrase }}
        </el-tag>
      </div>

      <!-- 播放按钮 -->
      <div class="voice-action">
        <el-button
          type="primary"
          size="large"
          :icon="Playing ? 'VideoPause' : 'VideoPlay'"
          :loading="speaking"
          @click="playVoice"
        >
          {{ speaking ? '播放中...' : '播放语音' }}
        </el-button>
      </div>

      <!-- 播报历史 -->
      <div class="voice-history">
        <div class="history-label">播报历史：</div>
        <el-table :data="voiceHistory" size="small" max-height="160" style="width: 100%">
          <el-table-column prop="text" label="内容" min-width="200" show-overflow-tooltip />
          <el-table-column prop="voice" label="音色" width="160" show-overflow-tooltip />
          <el-table-column prop="timestamp" label="时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { hardware } from '../../api'

// ==================== 扫码枪 ====================
const portList = ref([])
const selectedPort = ref('')
const baudRate = ref(9600)
const scanConnected = ref(false)
const currentPort = ref('')
const refreshingPorts = ref(false)
const lastScan = ref(null)
const scanHistory = ref([])
let eventSource = null

// ==================== 语音 ====================
const voiceList = ref([])
const selectedVoice = ref('zh-CN-XiaoxiaoNeural')
const loadingVoices = ref(false)
const voiceText = ref('订单10001，请到分拣区，板件分拣')
const voiceRate = ref(0)
const voiceVolume = ref(0)
const speaking = ref(false)
const voiceHistory = ref([])

// 快捷短语
const quickPhrases = [
  '订单10001，请到分拣区',
  '请注意，产品已下线',
  '原材料不足，请及时补料',
  '质检发现异常，请处理'
]

// 按类型分组音色
const zhFemaleVoices = computed(() => voiceList.value.filter(v => v.lang === 'zh-CN' && v.gender === 'Female'))
const zhMaleVoices = computed(() => voiceList.value.filter(v => v.lang === 'zh-CN' && v.gender === 'Male'))
const enVoices = computed(() => voiceList.value.filter(v => v.lang.startsWith('en')))

// ==================== 扫码枪操作 ====================
async function refreshPorts() {
  refreshingPorts.value = true
  try {
    const res = await hardware.listPorts()
    portList.value = res.data
  } catch (err) {
    ElMessage.error('刷新端口列表失败: ' + err.message)
  } finally {
    refreshingPorts.value = false
  }
}

async function toggleScan() {
  if (scanConnected.value) {
    await stopScan()
  } else {
    await startScan()
  }
}

async function startScan() {
  try {
    await hardware.startScan({ port: selectedPort.value, baudRate: baudRate.value })
    scanConnected.value = true
    currentPort.value = selectedPort.value
    ElMessage.success(`扫码枪已连接到 ${selectedPort.value}`)
    startSSE()
  } catch (err) {
    ElMessage.error('连接失败: ' + err.message)
  }
}

async function stopScan() {
  try {
    await hardware.stopScan()
    scanConnected.value = false
    currentPort.value = ''
    stopSSE()
    ElMessage.success('扫码监听已停止')
  } catch (err) {
    ElMessage.error('停止失败: ' + err.message)
  }
}

function startSSE() {
  // 通过轮询获取扫码结果（SSE需要单独的服务，这里用轮询代替）
  // 实际生产中建议用 ws 或 SSE
  window.scanPollTimer = setInterval(async () => {
    if (!scanConnected.value) return
    try {
      const res = await hardware.scanStatus()
      // 如果后端推送扫码结果，前端可以在这里处理
    } catch (e) { /* ignore poll errors */ }
  }, 2000)
}

function stopSSE() {
  if (window.scanPollTimer) {
    clearInterval(window.scanPollTimer)
    window.scanPollTimer = null
  }
}

function handleScanResult(barcode, port, timestamp) {
  const record = { barcode, port, timestamp }
  lastScan.value = record
  scanHistory.value.unshift(record)
  if (scanHistory.value.length > 50) {
    scanHistory.value.pop()
  }
  // 自动播报扫码结果
  handleAutoVoice(barcode)
}

async function handleAutoVoice(barcode) {
  try {
    await hardware.playVoice({
      text: `条码${barcode}，扫码成功`,
      voice: selectedVoice.value,
      rate: `${voiceRate.value >= 0 ? '+' : ''}${voiceRate.value}%`,
      volume: `${voiceVolume.value >= 0 ? '+' : ''}${voiceVolume.value}%`
    })
  } catch (e) { /* ignore voice errors */ }
}

// ==================== 语音操作 ====================
async function loadVoices() {
  loadingVoices.value = true
  try {
    const res = await hardware.listVoices()
    voiceList.value = res.data
  } catch (err) {
    ElMessage.error('加载音色列表失败: ' + err.message)
    // 使用默认音色
    voiceList.value = [
      { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', lang: 'zh-CN', gender: 'Female' },
      { id: 'zh-CN-YunxiNeural', name: '云希', lang: 'zh-CN', gender: 'Male' },
      { id: 'en-US-JennyNeural', name: 'Jenny', lang: 'en-US', gender: 'Female' }
    ]
  } finally {
    loadingVoices.value = false
  }
}

async function playVoice() {
  if (!voiceText.value.trim()) {
    ElMessage.warning('请输入要播报的文本')
    return
  }

  speaking.value = true
  try {
    await hardware.playVoice({
      text: voiceText.value,
      voice: selectedVoice.value,
      rate: `${voiceRate.value >= 0 ? '+' : ''}${voiceRate.value}%`,
      volume: `${voiceVolume.value >= 0 ? '+' : ''}${voiceVolume.value}%`
    })

    // 记录历史
    voiceHistory.value.unshift({
      text: voiceText.value,
      voice: selectedVoice.value,
      timestamp: new Date().toISOString()
    })
    if (voiceHistory.value.length > 30) {
      voiceHistory.value.pop()
    }

    ElMessage.success('语音播报完成')
  } catch (err) {
    ElMessage.error('播放失败: ' + err.message)
  } finally {
    speaking.value = false
  }
}

// ==================== 工具 ====================
function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString('zh-CN', { hour12: false })
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await refreshPorts()
  await loadVoices()
})

onBeforeUnmount(() => {
  stopSSE()
})
</script>

<style scoped>
.hardware-container {
  padding: 20px;
  max-width: 900px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.section-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.scan-result-area {
  margin-top: 16px;
}

.result-label,
.history-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.result-display {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: background 0.3s;
}

.result-display.has-data {
  background: #ecf5ff;
  border-color: #409eff;
}

.barcode-text {
  font-size: 20px;
  font-weight: 700;
  font-family: monospace;
  color: #303133;
  letter-spacing: 1px;
}

.barcode-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: flex;
  gap: 16px;
}

.placeholder {
  color: #c0c4cc;
  font-size: 14px;
}

.history-area {
  margin-top: 12px;
}

.voice-input-area {
  margin-top: 12px;
}

.quick-phrases {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.phrase-tag {
  cursor: pointer;
}

.voice-action {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.voice-history {
  margin-top: 12px;
}
</style>
