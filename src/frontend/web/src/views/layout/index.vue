<template>
  <el-container class="layout-container">
    <el-aside width="220px">
      <div class="logo">🏭 橱柜工厂</div>
      <el-menu :default-active="$route.path" router class="sidebar-menu" :collapse="false">
        <!-- 核心业务 -->
        <div class="menu-group-title">核心业务</div>
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><Document /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/production">
          <el-icon><Setting /></el-icon>
          <span>生产追踪</span>
        </el-menu-item>
        <el-menu-item index="/warehouse">
          <el-icon><Box /></el-icon>
          <span>仓库管理</span>
        </el-menu-item>
        <el-menu-item index="/installation">
          <el-icon><Tools /></el-icon>
          <span>安装管理</span>
        </el-menu-item>
        <el-menu-item index="/shipment">
          <el-icon><Van /></el-icon>
          <span>发货管理</span>
        </el-menu-item>

        <!-- 客户与经销商 -->
        <div class="menu-group-title">客户与渠道</div>
        <el-menu-item index="/customer">
          <el-icon><User /></el-icon>
          <span>客户管理</span>
        </el-menu-item>
        <el-menu-item index="/dealer">
          <el-icon><Shop /></el-icon>
          <span>经销商</span>
        </el-menu-item>

        <!-- 设计与报价 -->
        <div class="menu-group-title">设计与报价</div>
        <el-menu-item index="/design">
          <el-icon><Edit /></el-icon>
          <span>设计管理</span>
        </el-menu-item>
        <el-menu-item index="/quote">
          <el-icon><PriceTag /></el-icon>
          <span>报价管理</span>
        </el-menu-item>

        <!-- 运营支持 -->
        <div class="menu-group-title">运营支持</div>
        <el-menu-item index="/finance">
          <el-icon><Money /></el-icon>
          <span>财务管理</span>
        </el-menu-item>
        <el-menu-item index="/purchase">
          <el-icon><ShoppingCart /></el-icon>
          <span>采购管理</span>
        </el-menu-item>
        <el-menu-item index="/quality">
          <el-icon><CircleCheck /></el-icon>
          <span>质检管理</span>
        </el-menu-item>
        <el-menu-item index="/sort">
          <el-icon><Sort /></el-icon>
          <span>分拣管理</span>
        </el-menu-item>
        <el-menu-item index="/package">
          <el-icon><Box /></el-icon>
          <span>包装管理</span>
        </el-menu-item>
        <el-menu-item index="/scanner">
          <el-icon><Connection /></el-icon>
          <span>扫码枪管理</span>
        </el-menu-item>

        <!-- 基础数据 -->
        <div class="menu-group-title">基础数据</div>
        <el-menu-item index="/employee">
          <el-icon><UserFilled /></el-icon>
          <span>员工管理</span>
        </el-menu-item>
        <el-menu-item index="/supplier">
          <el-icon><Van /></el-icon>
          <span>供应商</span>
        </el-menu-item>
        <el-menu-item index="/report">
          <el-icon><DataAnalysis /></el-icon>
          <span>报表统计</span>
        </el-menu-item>
        <el-menu-item index="/system">
          <el-icon><Tools /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-title">{{ getPageTitle }}</div>
        <div class="header-user">
          <el-tag type="success">admin</el-tag>
          <el-button type="danger" size="small" @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import {
  Odometer, Document, Setting, Box, Tools, Van, User, Shop,
  Edit, PriceTag, Money, ShoppingCart, CircleCheck, Sort,
  UserFilled, DataAnalysis, Connection
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const getPageTitle = computed(() => {
  const map = {
    '/dashboard': '仪表盘',
    '/orders': '订单管理',
    '/production': '生产追踪',
    '/warehouse': '仓库管理',
    '/installation': '安装管理',
    '/shipment': '发货管理',
    '/customer': '客户管理',
    '/dealer': '经销商管理',
    '/design': '设计管理',
    '/quote': '报价管理',
    '/finance': '财务管理',
    '/purchase': '采购管理',
    '/quality': '质检管理',
    '/sort': '分拣管理',
    '/package': '包装管理',
    '/employee': '员工管理',
    '/supplier': '供应商管理',
    '/report': '报表统计',
    '/system': '系统设置',
    '/scanner': '扫码枪管理'
  }
  return map[route.path] || '橱柜工厂管理系统'
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  background: #1a1a2e;
  color: #e0e0e0;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}
.sidebar-menu {
  height: calc(100vh - 60px);
  border-right: none;
  background: #1a1a2e;
  overflow-y: auto;
}
.sidebar-menu::-webkit-scrollbar {
  width: 4px;
}
.sidebar-menu::-webkit-scrollbar-thumb {
  background: #3a3a5e;
  border-radius: 2px;
}
.menu-group-title {
  padding: 12px 20px 4px 20px;
  font-size: 11px;
  font-weight: 600;
  color: #606266;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 6px;
}
.sidebar-menu .el-menu-item {
  color: #b8b8c8;
  height: 44px;
  line-height: 44px;
  margin: 0 8px;
  border-radius: 8px;
  transition: all 0.2s;
}
.sidebar-menu .el-menu-item:hover {
  background: #2a2a4e !important;
  color: #ffffff;
}
.sidebar-menu .el-menu-item.is-active {
  background: #409eff !important;
  color: #ffffff;
}
.el-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}
.header-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.header-user {
  display: flex;
  align-items: center;
  gap: 15px;
}
.el-main {
  background: #f0f2f5;
  padding: 20px;
}
</style>
