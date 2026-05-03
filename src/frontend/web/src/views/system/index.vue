<template>
  <div class="system-page">
    <el-card>
      <template #header>
        <span>系统设置</span>
      </template>

      <el-tabs v-model="activeTab" class="system-tabs">
        <!-- Tab 1: 基本设置 -->
        <el-tab-pane label="基本设置" name="basic">
          <el-form ref="settingsFormRef" :model="settingsForm" label-width="120px" style="max-width: 700px">
            <el-form-item label="系统名称" prop="system_name">
              <el-input v-model="settingsForm.system_name" placeholder="请输入系统名称" />
            </el-form-item>
            <el-form-item label="公司名称" prop="company_name">
              <el-input v-model="settingsForm.company_name" placeholder="请输入公司名称" />
            </el-form-item>
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="settingsForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="地址" prop="address">
              <el-input v-model="settingsForm.address" type="textarea" :rows="2" placeholder="请输入公司地址" />
            </el-form-item>
            <el-form-item label="订单前缀" prop="order_prefix">
              <el-input v-model="settingsForm.order_prefix" placeholder="如: CF" style="width: 200px" />
            </el-form-item>
            <el-form-item label="生产看板刷新" prop="board_refresh_interval">
              <el-select v-model="settingsForm.board_refresh_interval" style="width: 200px">
                <el-option label="10秒" :value="10" />
                <el-option label="30秒" :value="30" />
                <el-option label="60秒" :value="60" />
                <el-option label="关闭自动刷新" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item label="启用短信通知" prop="sms_enabled">
              <el-switch v-model="settingsForm.sms_enabled" />
            </el-form-item>
            <el-form-item label="启用邮件通知" prop="email_enabled">
              <el-switch v-model="settingsForm.email_enabled" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="settingsSaving" @click="saveSettings">保存设置</el-button>
              <el-button @click="loadSettings">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab 2: 汇率管理 -->
        <el-tab-pane label="汇率管理" name="exchange">
          <div style="padding: 20px">
            <p style="color: #909399; margin-bottom: 16px">
              管理系统内所有金额的币种和汇率。
              <el-button type="primary" size="small" style="margin-left: 12px" @click="$router.push('/system/exchange-rate')">
                打开汇率管理 →
              </el-button>
            </p>
            <el-alert type="info" :closable="false" style="max-width: 600px">
              支持 8 种主流货币（CNY/USD/HKD/EUR/GBP/JPY/KRW/AUD），可按汇率折算为人民币统一记账。
            </el-alert>
          </div>
        </el-tab-pane>

        <!-- Tab 3: 用户管理 -->
        <el-tab-pane label="用户管理" name="users">
          <!-- 工具栏 -->
          <div class="toolbar">
            <el-button type="primary" @click="openUserDialog('create')">新增用户</el-button>
            <el-input
              v-model="userKeyword"
              placeholder="搜索用户名/姓名"
              style="width: 200px; margin-left: 12px"
              clearable
              @clear="loadUsers"
              @keyup.enter="loadUsers"
            >
              <template #append>
                <el-button icon="Search" @click="loadUsers" />
              </template>
            </el-input>
          </div>

          <!-- 用户列表 -->
          <el-table :data="userList" v-loading="userLoading" style="width: 100%; margin-top: 12px" stripe>
            <el-table-column prop="username" label="用户名" width="140" />
            <el-table-column prop="real_name" label="姓名" width="120" />
            <el-table-column prop="phone" label="手机" width="130" />
            <el-table-column prop="email" label="邮箱" min-width="180" />
            <el-table-column prop="role" label="角色" width="100">
              <template #default="{ row }">
                <el-tag :type="roleTagType(row.role)">{{ row.role || '普通用户' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="dept_name" label="部门" width="100" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-switch
                  v-model="row.status"
                  active-value="active"
                  inactive-value="disabled"
                  size="small"
                  @change="handleStatusChange(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="last_login" label="最后登录" width="160">
              <template #default="{ row }">
                {{ row.last_login ? formatDate(row.last_login) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="warning" link size="small" @click="openUserDialog('edit', row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteUser(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 用户分页 -->
          <el-pagination
            v-model:current-page="userPage"
            v-model:page-size="userPageSize"
            :total="userTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @size-change="loadUsers"
            @current-change="loadUsers"
          />
        </el-tab-pane>

        <!-- Tab 3: 操作日志 -->
        <el-tab-pane label="操作日志" name="logs">
          <!-- 筛选工具栏 -->
          <div class="toolbar" style="flex-wrap: wrap; gap: 10px">
            <el-date-picker
              v-model="logDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 260px"
              @change="loadLogs"
            />
            <el-input
              v-model="logOperator"
              placeholder="操作人"
              style="width: 140px"
              clearable
              @clear="loadLogs"
              @keyup.enter="loadLogs"
            />
            <el-select v-model="logModule" placeholder="模块" clearable style="width: 140px" @change="loadLogs">
              <el-option label="客户" value="customer" />
              <el-option label="订单" value="order" />
              <el-option label="生产" value="production" />
              <el-option label="仓库" value="warehouse" />
              <el-option label="财务" value="finance" />
              <el-option label="系统" value="system" />
            </el-select>
            <el-button icon="Search" type="primary" @click="loadLogs">查询</el-button>
            <el-button icon="Refresh" @click="resetLogs">重置</el-button>
          </div>

          <!-- 日志列表 -->
          <el-table :data="logList" v-loading="logLoading" style="width: 100%; margin-top: 12px" stripe>
            <el-table-column prop="created_at" label="时间" width="170">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column prop="operator_name" label="操作人" width="120" />
            <el-table-column prop="module" label="模块" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.module }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="action" label="操作" min-width="120" />
            <el-table-column prop="ip_address" label="IP地址" width="150" />
            <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
          </el-table>

          <!-- 日志分页 -->
          <el-pagination
            v-model:current-page="logPage"
            v-model:page-size="logPageSize"
            :total="logTotal"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @size-change="loadLogs"
            @current-change="loadLogs"
          />
        </el-tab-pane>

        <!-- Tab 5: 数据字典 -->
        <el-tab-pane label="数据字典" name="dict">
          <!-- 工具栏 -->
          <div class="toolbar">
            <el-button type="primary" @click="openDictDialog('create')">新增字典项</el-button>
            <el-select
              v-model="dictTypeFilter"
              placeholder="按类型筛选"
              clearable
              style="width: 160px; margin-left: 12px"
              @change="loadDictionaries"
            >
              <el-option
                v-for="type in dictTypes"
                :key="type"
                :label="type"
                :value="type"
              />
            </el-select>
          </div>

          <!-- 字典列表 -->
          <el-table :data="dictList" v-loading="dictLoading" style="width: 100%; margin-top: 12px" stripe>
            <el-table-column prop="dict_type" label="类型" width="150">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.dict_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="dict_code" label="编码" width="150" />
            <el-table-column prop="dict_name" label="名称" min-width="200" />
            <el-table-column prop="sort_order" label="排序" width="80" align="center" />
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="warning" link size="small" @click="openDictDialog('edit', row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteDict(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 字典分页 -->
          <el-pagination
            v-model:current-page="dictPage"
            v-model:page-size="dictPageSize"
            :total="dictTotal"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @size-change="loadDictionaries"
            @current-change="loadDictionaries"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 用户编辑弹窗 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="userDialogTitle"
      width="500px"
      @close="userDialogVisible = false"
    >
      <el-form ref="userFormRef" :model="userForm" :rules="userRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="userDialogMode === 'edit'" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item v-if="userDialogMode === 'create'" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" show-password placeholder="初始密码" />
        </el-form-item>
        <el-form-item label="姓名" prop="real_name">
          <el-input v-model="userForm.real_name" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="手机" prop="phone">
          <el-input v-model="userForm.phone" placeholder="手机号码" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="电子邮箱" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="经理" value="manager" />
            <el-option label="普通用户" value="user" />
            <el-option label="只读用户" value="readonly" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门" prop="dept_name">
          <el-select v-model="userForm.dept_name" style="width: 100%">
            <el-option label="总经办" value="总经办" />
            <el-option label="营销部" value="营销部" />
            <el-option label="设计部" value="设计部" />
            <el-option label="生产部" value="生产部" />
            <el-option label="行政部" value="行政部" />
            <el-option label="财务部" value="财务部" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="userDialogMode === 'edit'" label="状态" prop="status">
          <el-select v-model="userForm.status" style="width: 100%">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="userSaving" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 字典编辑弹窗 -->
    <el-dialog
      v-model="dictDialogVisible"
      :title="dictDialogTitle"
      width="480px"
      @close="dictDialogVisible = false"
    >
      <el-form ref="dictFormRef" :model="dictForm" :rules="dictRules" label-width="80px">
        <el-form-item label="类型" prop="dict_type">
          <el-select v-model="dictForm.dict_type" style="width: 100%" allow-create filterable placeholder="选择或输入类型">
            <el-option v-for="type in dictTypes" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="编码" prop="dict_code">
          <el-input v-model="dictForm.dict_code" placeholder="字典编码" />
        </el-form-item>
        <el-form-item label="名称" prop="dict_name">
          <el-input v-model="dictForm.dict_name" placeholder="字典名称" />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="dictForm.sort_order" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="dictForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dictSaving" @click="saveDict">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { system } from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'

// ======================== Tab 状态 ========================
const activeTab = ref('basic')

// ======================== Tab 1: 基本设置 ========================
const settingsFormRef = ref(null)
const settingsForm = reactive({
  system_name: '橱柜工厂管理系统',
  company_name: '',
  phone: '',
  address: '',
  order_prefix: 'CF',
  board_refresh_interval: 30,
  sms_enabled: false,
  email_enabled: false
})
const settingsSaving = ref(false)

const loadSettings = async () => {
  try {
    const res = await system.settings()
    if (res.success && res.data) {
      Object.assign(settingsForm, res.data)
    }
  } catch (e) {
    console.error('加载设置失败', e)
  }
}

const saveSettings = async () => {
  settingsSaving.value = true
  try {
    const res = await system.updateSettings(settingsForm)
    if (res.success) {
      ElMessage.success('设置保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    settingsSaving.value = false
  }
}

// ======================== Tab 2: 用户管理 ========================
const userList = ref([])
const userLoading = ref(false)
const userPage = ref(1)
const userPageSize = ref(20)
const userTotal = ref(0)
const userKeyword = ref('')
const userDialogVisible = ref(false)
const userDialogMode = ref('create')
const userDialogTitle = ref('新增用户')
const userFormRef = ref(null)
const userSaving = ref(false)
const userForm = reactive({
  id: null,
  username: '',
  password: '',
  real_name: '',
  phone: '',
  email: '',
  role: 'user',
  dept_name: '',
  status: 'active'
})
const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  real_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const loadUsers = async () => {
  userLoading.value = true
  try {
    const params = {
      page: userPage.value,
      page_size: userPageSize.value
    }
    if (userKeyword.value) params.keyword = userKeyword.value
    const res = await system.users(params)
    if (res.success) {
      userList.value = res.data.list || []
      userTotal.value = res.data.total || 0
    }
  } catch (e) {
    ElMessage.error('加载用户失败')
  } finally {
    userLoading.value = false
  }
}

const openUserDialog = (mode, row = null) => {
  userDialogMode.value = mode
  userDialogTitle.value = mode === 'create' ? '新增用户' : '编辑用户'
  if (mode === 'create') {
    Object.assign(userForm, {
      id: null, username: '', password: '', real_name: '',
      phone: '', email: '', role: 'user', dept_name: '', status: 'active'
    })
  } else {
    Object.assign(userForm, {
      id: row.id,
      username: row.username,
      password: '',
      real_name: row.real_name || '',
      phone: row.phone || '',
      email: row.email || '',
      role: row.role || 'user',
      dept_name: row.dept_name || '',
      status: row.status || 'active'
    })
  }
  userDialogVisible.value = true
}

const saveUser = async () => {
  if (!userFormRef.value) return
  await userFormRef.value.validate(async (valid) => {
    if (!valid) return
    userSaving.value = true
    try {
      let res
      if (userDialogMode.value === 'create') {
        res = await system.createUser(userForm)
      } else {
        res = await system.updateUser(userForm.id, userForm)
      }
      if (res.success) {
        ElMessage.success(userDialogMode.value === 'create' ? '用户创建成功' : '用户更新成功')
        userDialogVisible.value = false
        loadUsers()
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } catch (e) {
      ElMessage.error('操作失败')
    } finally {
      userSaving.value = false
    }
  })
}

const handleStatusChange = async (row) => {
  try {
    const res = await system.updateUser(row.id, { status: row.status })
    if (res.success) {
      ElMessage.success(`用户已${row.status === 'active' ? '启用' : '禁用'}`)
    } else {
      ElMessage.error(res.message || '状态更新失败')
      loadUsers()
    }
  } catch (e) {
    ElMessage.error('状态更新失败')
    loadUsers()
  }
}

const handleDeleteUser = (row) => {
  ElMessageBox.confirm(`确定删除用户「${row.username}」吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await system.deleteUser(row.id)
      if (res.success) {
        ElMessage.success('删除成功')
        loadUsers()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (e) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const roleTagType = (role) => {
  const map = { admin: 'danger', manager: 'warning', user: '', readonly: 'info' }
  return map[role] || ''
}

// ======================== Tab 3: 操作日志 ========================
const logList = ref([])
const logLoading = ref(false)
const logPage = ref(1)
const logPageSize = ref(50)
const logTotal = ref(0)
const logDateRange = ref(null)
const logOperator = ref('')
const logModule = ref('')

const loadLogs = async () => {
  logLoading.value = true
  try {
    const params = {
      page: logPage.value,
      page_size: logPageSize.value
    }
    if (logDateRange.value && logDateRange.value.length === 2) {
      params.start_date = logDateRange.value[0]
      params.end_date = logDateRange.value[1]
    }
    if (logOperator.value) params.operator = logOperator.value
    if (logModule.value) params.module = logModule.value
    const res = await system.logs(params)
    if (res.success) {
      logList.value = res.data.list || []
      logTotal.value = res.data.total || 0
    }
  } catch (e) {
    ElMessage.error('加载日志失败')
  } finally {
    logLoading.value = false
  }
}

const resetLogs = () => {
  logDateRange.value = null
  logOperator.value = ''
  logModule.value = ''
  logPage.value = 1
  loadLogs()
}

// ======================== Tab 4: 数据字典 ========================
const dictList = ref([])
const dictTypes = ref([])
const dictLoading = ref(false)
const dictPage = ref(1)
const dictPageSize = ref(50)
const dictTotal = ref(0)
const dictTypeFilter = ref('')
const dictDialogVisible = ref(false)
const dictDialogMode = ref('create')
const dictDialogTitle = ref('新增字典项')
const dictFormRef = ref(null)
const dictSaving = ref(false)
const dictForm = reactive({
  id: null,
  dict_type: '',
  dict_code: '',
  dict_name: '',
  sort_order: 0,
  remark: ''
})
const dictRules = {
  dict_type: [{ required: true, message: '请输入类型', trigger: 'blur' }],
  dict_code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  dict_name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
}

const loadDictionaries = async () => {
  dictLoading.value = true
  try {
    const params = { page: dictPage.value, page_size: dictPageSize.value }
    if (dictTypeFilter.value) params.type = dictTypeFilter.value
    const res = await system.dictionaries(params)
    if (res.success) {
      // 后端返回 grouped 格式：{ type1: [{code, name, sort}], type2: [...] }
      // 需要转换为一维数组
      const grouped = res.data || {}
      const flat = []
      for (const [type, items] of Object.entries(grouped)) {
        for (const item of items) {
          flat.push({
            dict_type: type,
            dict_code: item.code,
            dict_name: item.name,
            sort_order: item.sort
          })
        }
      }
      dictList.value = flat
      dictTotal.value = flat.length
      // 收集所有类型
      dictTypes.value = Object.keys(grouped)
    }
  } catch (e) {
    ElMessage.error('加载字典失败')
  } finally {
    dictLoading.value = false
  }
}

const openDictDialog = (mode, row = null) => {
  dictDialogMode.value = mode
  dictDialogTitle.value = mode === 'create' ? '新增字典项' : '编辑字典项'
  if (mode === 'create') {
    Object.assign(dictForm, { id: null, dict_type: '', dict_code: '', dict_name: '', sort_order: 0, remark: '' })
  } else {
    Object.assign(dictForm, {
      id: row.id || null,
      dict_type: row.dict_type,
      dict_code: row.dict_code,
      dict_name: row.dict_name,
      sort_order: row.sort_order || 0,
      remark: row.remark || ''
    })
  }
  dictDialogVisible.value = true
}

const saveDict = async () => {
  if (!dictFormRef.value) return
  await dictFormRef.value.validate(async (valid) => {
    if (!valid) return
    dictSaving.value = true
    try {
      const res = await system.createDictionary({
        dict_type: dictForm.dict_type,
        dict_code: dictForm.dict_code,
        dict_name: dictForm.dict_name,
        sort_order: dictForm.sort_order,
        remark: dictForm.remark
      })
      if (res.success) {
        ElMessage.success('保存成功')
        dictDialogVisible.value = false
        loadDictionaries()
      } else {
        ElMessage.error(res.message || '保存失败')
      }
    } catch (e) {
      ElMessage.error('保存失败')
    } finally {
      dictSaving.value = false
    }
  })
}

const handleDeleteDict = (row) => {
  ElMessageBox.confirm(`确定删除字典「${row.dict_name}」吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await system.deleteDictionary(row.id || row.dict_code)
      if (res.success) {
        ElMessage.success('删除成功')
        loadDictionaries()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (e) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// ======================== 通用工具函数 ========================
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ======================== 初始化 ========================
onMounted(() => {
  loadSettings()
  loadUsers()
  loadLogs()
  loadDictionaries()
})
</script>

<style scoped>
.system-page {
  padding: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}
</style>
