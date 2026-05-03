<template>
  <div class="dealer-login">
    <div class="login-card">
      <div class="login-header">
        <h2>🏭 橱柜工厂</h2>
        <p>经销商服务门户</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="经销商代码" prop="dealerCode">
          <el-input
            v-model="form.dealerCode"
            placeholder="请输入经销商代码"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            placeholder="请输入 API Key"
            prefix-icon="Key"
            size="large"
            type="password"
            show-password
          />
        </el-form-item>

        <el-form-item label="API Secret" prop="apiSecret">
          <el-input
            v-model="form.apiSecret"
            placeholder="请输入 API Secret"
            prefix-icon="Lock"
            size="large"
            type="password"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>还不是经销商？联系工厂申请开通</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  dealerCode: '',
  apiKey: '',
  apiSecret: ''
})

const rules = {
  dealerCode: [{ required: true, message: '请输入经销商代码', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
  apiSecret: [{ required: true, message: '请输入 API Secret', trigger: 'blur' }]
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 调用工厂后端验证 Dealer API Key
    const res = await axios.post('/api/dealers/portal-login', {
      dealerCode: form.dealerCode,
      apiKey: form.apiKey,
      apiSecret: form.apiSecret
    })

    if (res.data.success) {
      // 存储登录信息
      localStorage.setItem('dealer_token', res.data.data.token)
      localStorage.setItem('dealer_info', JSON.stringify(res.data.data.dealer))
      ElMessage.success('登录成功')
      router.push('/dealer-portal/dashboard')
    } else {
      ElMessage.error(res.data.message || '登录失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '登录失败，请检查凭证')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dealer-login {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h2 {
  font-size: 28px;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.login-header p {
  color: #666;
  font-size: 14px;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
  color: #999;
  font-size: 13px;
}
</style>
