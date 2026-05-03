<template>
  <el-button type="primary" plain @click="openCamera">
    <el-icon style="margin-right:4px"><Camera /></el-icon>摄像头扫码
  </el-button>

  <el-dialog
    v-model="dialogVisible"
    title="摄像头扫码"
    width="420px"
    :close-on-click-modal="false"
    @close="stopScanner"
  >
    <div v-if="!cameraAuthorized" style="text-align:center;padding:20px;">
      <el-icon size="48" color="#909399"><VideoCamera /></el-icon>
      <p style="margin-top:12px;color:#606266;">正在请求摄像头权限...</p>
    </div>
    <div v-else>
      <div id="qr-reader" ref="readerRef" style="width:100%;border:none;"></div>
    </div>
    <template #footer>
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
        <el-button v-if="cameraAuthorized" @click="switchCamera">
          <el-icon style="margin-right:4px"><Switch /></el-icon>切换摄像头
        </el-button>
        <el-button @click="closeDialog">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { ElMessage } from 'element-plus'
import { Camera, VideoCamera, Switch } from '@element-plus/icons-vue'

const emit = defineEmits(['scan-success'])

const dialogVisible = ref(false)
const readerRef = ref(null)
const cameraAuthorized = ref(false)

let scanner = null
let currentCamera = 'environment'
let audioCtx = null
let beepBuffer = null

// 生成提示音
const ensureBeep = () => {
  if (!beepBuffer) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      // 短促的蜂鸣声
      const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(2 * Math.PI * 880 * i / audioCtx.sampleRate) * (1 - i / data.length)
      }
      beepBuffer = buffer
    } catch (e) {
      console.warn('Audio not available:', e)
    }
  }
}

const playBeep = () => {
  try {
    if (!audioCtx) ensureBeep()
    if (audioCtx && beepBuffer) {
      const source = audioCtx.createBufferSource()
      source.buffer = beepBuffer
      source.connect(audioCtx.destination)
      source.start()
    }
  } catch (e) {
    console.warn('Beep failed:', e)
  }
}

const openCamera = async () => {
  dialogVisible.value = true
  cameraAuthorized.value = false

  // 等待 DOM 更新后再初始化
  setTimeout(async () => {
    try {
      await initScanner()
      cameraAuthorized.value = true
    } catch (e) {
      ElMessage.error('无法访问摄像头: ' + (e.message || '请检查权限设置'))
      dialogVisible.value = false
    }
  }, 200)
}

const initScanner = async () => {
  const elementId = 'qr-reader'
  scanner = new Html5Qrcode(elementId)

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  }

  await scanner.start(
    { facingMode: currentCamera },
    config,
    (decodedText) => {
      playBeep()
      emit('scan-success', decodedText)
      stopScanner()
      dialogVisible.value = false
    },
    () => {} // ignore errors
  )
}

const stopScanner = async () => {
  if (scanner) {
    try {
      await scanner.stop()
    } catch (e) {
      // ignore
    }
    scanner = null
  }
}

const switchCamera = async () => {
  if (!scanner) return
  currentCamera = currentCamera === 'environment' ? 'user' : 'environment'
  await stopScanner()
  try {
    await initScanner()
  } catch (e) {
    ElMessage.warning('切换摄像头失败')
    // 切回原来的
    currentCamera = currentCamera === 'environment' ? 'user' : 'environment'
  }
}

const closeDialog = () => {
  stopScanner()
  dialogVisible.value = false
}

onUnmounted(() => {
  stopScanner()
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
})
</script>
