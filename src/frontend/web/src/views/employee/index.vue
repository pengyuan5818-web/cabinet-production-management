<template>
  <div class="employee-page">
    <el-card style="margin-bottom:12px">
      <el-form :inline="true">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/工号/电话" clearable style="width:180px" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="searchForm.dept_id" placeholder="全部" clearable style="width:150px">
            <el-option v-for="d in depts" :key="d.id" :label="d.dept_name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="在职状态">
          <el-select v-model="searchForm.is_active" placeholder="全部" clearable style="width:120px">
            <el-option label="在职" :value="true" />
            <el-option label="离职" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadEmployees(1)">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="primary" @click="openFormDialog()">新增员工</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="employees" v-loading="loading" stripe>
        <el-table-column prop="employee_code" label="工号" width="100" fixed />
        <el-table-column prop="employee_name" label="姓名" width="100" fixed />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="id_card" label="身份证" width="170" />
        <el-table-column prop="dept_name" label="部门" width="120" />
        <el-table-column prop="position" label="岗位" width="100" />
        <el-table-column prop="hire_date" label="入职日期" width="110" />
        <el-table-column prop="salary" label="月薪" width="110" align="right">
          <template #default="{row}">¥{{ formatNum(row.salary) }}</template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{row}">
            <el-tag :type="row.is_active?'success':'info'" size="small">{{ row.is_active?'在职':'离职' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{row}">
            <el-button type="success" link size="small" @click="handleCheckIn(row)" :disabled="!row.is_active">签到</el-button>
            <el-button type="warning" link size="small" @click="handleCheckOut(row)" :disabled="!row.is_active">签退</el-button>
            <el-button type="primary" link size="small" @click="openFormDialog(row)">编辑</el-button>
            <el-button type="info" link size="small" @click="openAttendance(row)">考勤</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :total="total"
        v-model:current-page="page"
        :page-size="pageSize"
        layout="total,prev,pager,next"
        style="margin-top:12px"
        @current-change="loadEmployees"
      />
    </el-card>

    <el-dialog v-model="formVisible" :title="form.id?'编辑员工':'新增员工'" width="620px">
      <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="工号" prop="employee_code">
              <el-input v-model="form.employee_code" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="employee_name">
              <el-input v-model="form.employee_name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="form.phone" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证">
              <el-input v-model="form.id_card" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="部门">
              <el-select v-model="form.dept_id" placeholder="选择部门" style="width:100%">
                <el-option v-for="d in depts" :key="d.id" :label="d.dept_name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位">
              <el-input v-model="form.position" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="入职日期">
              <el-date-picker v-model="form.hire_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月薪">
              <el-input-number v-model="form.salary" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible=false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="attendanceVisible" title="考勤记录" width="680px">
      <el-form :inline="true" style="margin-bottom:12px">
        <el-form-item label="月份">
          <el-date-picker v-model="attMonth" type="month" value-format="YYYY-MM" style="width:130px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAttendance">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="attRecords" stripe max-height="400">
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="check_in_time" label="签到时间" width="160">
          <template #default="{row}">{{ row.check_in_time || '-' }}</template>
        </el-table-column>
        <el-table-column prop="check_out_time" label="签退时间" width="160">
          <template #default="{row}">{{ row.check_out_time || '-' }}</template>
        </el-table-column>
        <el-table-column prop="work_hours" label="工时" width="80" align="center">
          <template #default="{row}">{{ row.work_hours ? row.work_hours+'h' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{row}">
            <el-tag :type="attStatusMap[row.status]" size="small">{{ attStatusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { employee } from '../../api'
import { ElMessage } from 'element-plus'

const attStatusMap = { normal: '正常', late: '迟到', early: '早退', absent: '缺勤', leave: '请假' }

const loading = ref(false)
const submitting = ref(false)
const employees = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const depts = ref([])

const searchForm = reactive({ keyword: '', dept_id: '', is_active: '' })

const formVisible = ref(false)
const formRef = ref(null)
const form = ref({})

const attendanceVisible = ref(false)
const attMonth = ref(new Date().toISOString().slice(0, 7))
const attRecords = ref([])
const attEmployeeId = ref('')

const formRules = {
  employee_code: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  employee_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误', trigger: 'blur' }]
}

const loadEmployees = async (p = 1) => {
  loading.value = true
  page.value = p
  try {
    const params = { page: p, page_size: pageSize, ...searchForm }
    const res = await employee.list(params)
    if (res.success) {
      employees.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const loadDepts = async () => {
  try {
    const res = await employee.departments()
    if (res.success) depts.value = res.data || []
  } catch (e) { console.error(e) }
}

const resetSearch = () => {
  Object.assign(searchForm, { keyword: '', dept_id: '', is_active: '' })
  loadEmployees(1)
}

const openFormDialog = (row) => {
  form.value = row ? { ...row } : { is_active: true, salary: 0 }
  formVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const id = form.value.id
    const api = id ? employee.update(id, form.value) : employee.create(form.value)
    const res = await api
    if (res.success) {
      ElMessage.success('保存成功')
      formVisible.value = false
      loadEmployees(page.value)
    } else { ElMessage.error(res.message || '保存失败') }
  } catch (e) { ElMessage.error('保存失败') }
  submitting.value = false
}

const handleCheckIn = async (row) => {
  try {
    const res = await employee.checkIn({ employee_id: row.id, employee_name: row.employee_name })
    if (res.success) ElMessage.success(`签到成功：${row.employee_name}`)
    else ElMessage.error(res.message || '签到失败')
  } catch (e) { ElMessage.error('签到失败') }
}

const handleCheckOut = async (row) => {
  try {
    const res = await employee.checkOut({ employee_id: row.id, employee_name: row.employee_name })
    if (res.success) ElMessage.success(`签退成功：${row.employee_name}`)
    else ElMessage.error(res.message || '签退失败')
  } catch (e) { ElMessage.error('签退失败') }
}

const openAttendance = (row) => {
  attEmployeeId.value = row.id
  attMonth.value = new Date().toISOString().slice(0, 7)
  loadAttendance()
  attendanceVisible.value = true
}

const loadAttendance = async () => {
  if (!attEmployeeId.value) return
  try {
    const res = await employee.attendance(attEmployeeId.value, { month: attMonth.value })
    if (res.success) attRecords.value = res.data || []
  } catch (e) { ElMessage.error('加载考勤记录失败') }
}

const formatNum = (v) => v == null ? '0.00' : parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

onMounted(() => { loadEmployees(); loadDepts() })
</script>
