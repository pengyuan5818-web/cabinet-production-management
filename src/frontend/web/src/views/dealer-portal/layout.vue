<template>
  <div class="dealer-layout">
    <!-- 顶部导航 -->
    <div class="dealer-nav">
      <div class="nav-left">
        <span class="logo">🏭 橱柜工厂</span>
        <span class="divider">|</span>
        <span class="portal-name">经销商服务门户</span>
      </div>
      <div class="nav-right">
        <span class="dealer-name">{{ dealerInfo?.dealer_name || '经销商' }}</span>
        <el-dropdown @command="handleCommand">
          <span class="user-avatar">
            {{ (dealerInfo?.dealer_name || 'D')[0] }}
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="settings">账户设置</el-dropdown-item>
              <el-dropdown-item command="webhooks">Webhook 配置</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主体 -->
    <div class="dealer-body">
      <!-- 侧边栏 -->
      <div class="dealer-sidebar">
        <el-menu
          :default-active="activeMenu"
          :router="true"
          background-color="#1a1a2e"
          text-color="#a0a0b0"
          active-text-color="#409eff"
        >
          <el-menu-item index="/dealer-portal/dashboard">
            <span>📊</span><span>工作台</span>
          </el-menu-item>
          <el-menu-item index="/dealer-portal/orders">
            <span>📦</span><span>我的订单</span>
          </el-menu-item>
          <el-menu-item index="/dealer-portal/track">
            <span>🔍</span><span>订单追踪</span>
          </el-menu-item>
          <el-menu-item index="/dealer-portal/customers">
            <span>👥</span><span>我的客户</span>
          </el-menu-item>
          <el-menu-item index="/dealer-portal/commissions">
            <span>💰</span><span>佣金查询</span>
          </el-menu-item>
          <el-menu-item index="/dealer-portal/finance">
            <span>💳</span><span>账务明细</span>
          </el-menu-item>
          <el-menu-item index="/dealer-portal/settings">
            <span>⚙️</span><span>账户设置</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 内容 -->
      <div class="dealer-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const dealerInfo = ref(null)

onMounted(() => {
  const stored = localStorage.getItem('dealer_info')
  if (stored) {
    dealerInfo.value = JSON.parse(stored)
  }
})

const activeMenu = computed(() => route.path)

function handleCommand(cmd) {
  if (cmd === 'logout') {
    localStorage.removeItem('dealer_token')
    localStorage.removeItem('dealer_info')
    router.push('/dealer-portal/login')
  } else if (cmd === 'settings') {
    router.push('/dealer-portal/settings')
  } else if (cmd === 'webhooks') {
    router.push('/dealer-portal/settings?tab=webhooks')
  }
}
</script>

<style scoped>
.dealer-layout {
  min-height: 100vh;
  background: #f0f2f5;
}

.dealer-nav {
  height: 56px;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.divider {
  color: #555;
}

.portal-name {
  color: #888;
  font-size: 13px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dealer-name {
  color: #ccc;
  font-size: 14px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
}

.dealer-body {
  display: flex;
  padding-top: 56px;
  min-height: calc(100vh - 56px);
}

.dealer-sidebar {
  width: 200px;
  background: #1a1a2e;
  position: fixed;
  top: 56px;
  left: 0;
  bottom: 0;
  overflow-y: auto;
}

.dealer-sidebar .el-menu {
  border-right: none;
}

.dealer-sidebar .el-menu-item {
  height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  padding-left: 20px !important;
}

.dealer-sidebar .el-menu-item span:first-child {
  font-size: 16px;
}

.dealer-content {
  flex: 1;
  margin-left: 200px;
  padding: 20px;
  min-height: calc(100vh - 56px);
}
</style>
