path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\orders\index.vue'
content = open(path, encoding='utf-8').read()

# ==========================================
# 1. Fix template: customer_name input → el-select
# ==========================================
old_tpl = """        <el-form-item label="客户名" prop="customer_name">
          <el-input v-model="createForm.customer_name" placeholder="请输入客户姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="customer_phone">
          <el-input v-model="createForm.customer_phone" placeholder="请输入手机号" />
        </el-form-item>"""

new_tpl = """        <el-form-item label="客户名" prop="customer_name">
          <el-select
            v-model="createForm.customer_id"
            placeholder="选择或搜索客户"
            filterable
            allow-create
            :default-first-option="true"
            style="width:100%"
            :loading="customerLoading"
            @visible-change="onCustomerDropdown"
          >
            <el-option
              v-for="c in customerList"
              :key="c.id"
              :label="c.customer_name + ' - ' + c.phone"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="联系电话" prop="customer_phone">
          <el-input v-model="createForm.customer_phone" placeholder="请输入手机号" />
        </el-form-item>"""

if old_tpl in content:
    content = content.replace(old_tpl, new_tpl)
    print('Template fixed')
else:
    print('ERROR: template not found')

# ==========================================
# 2. Fix createForm reactive: add customer_id
# ==========================================
old_form = """const createForm = reactive({
  customer_name: '',
  customer_phone: '',
  city: '',
  district: '',
  address: '',
  expected_delivery: '',
  cabinet_size: '',
  door_color: '',
  door_material: '',
  countertop_material: '',
  total_price: 0,
  deposit_paid: 0,
  remark: ''
})"""

new_form = """const createForm = reactive({
  customer_id: null,
  customer_name: '',
  customer_phone: '',
  city: '',
  district: '',
  address: '',
  expected_delivery: '',
  cabinet_size: '',
  door_color: '',
  door_material: '',
  countertop_material: '',
  total_price: 0,
  deposit_paid: 0,
  remark: ''
})"""

if old_form in content:
    content = content.replace(old_form, new_form)
    print('createForm fixed')
else:
    print('ERROR: createForm not found')

# ==========================================
# 3. Add customerList ref and loadCustomerList after createRules
# ==========================================
old_rules = """const createRules = {
  customer_name: [{ required: true, message: '请输入客户名', trigger: 'blur' }]
}"""

new_rules = """const createRules = {
  customer_name: [{ required: true, message: '请选择或输入客户名', trigger: 'blur' }]
}

const customerList = ref([])
const customerLoading = ref(false)

const onCustomerDropdown = (open) => {
  if (open && customerList.value.length === 0) loadCustomerList()
}

const loadCustomerList = async () => {
  customerLoading.value = true
  try {
    const res = await customer.list()
    if (res.success) customerList.value = res.data.list || res.data || []
  } catch (e) { console.error(e) }
  customerLoading.value = false
}"""

if old_rules in content:
    content = content.replace(old_rules, new_rules)
    print('customerList added')
else:
    print('ERROR: createRules not found')

# ==========================================
# 4. Fix handleSaveCreate: send customer_id优先
# ==========================================
old_save = """      const res = await orders.create({
        customer_name: createForm.customer_name,
        customer_phone: createForm.customer_phone,"""

new_save = """      const payload = {
        customer_id: createForm.customer_id || undefined,
        customer_name: createForm.customer_id ? undefined : createForm.customer_name,
        customer_phone: createForm.customer_phone,"""

if old_save in content:
    content = content.replace(old_save, new_save)
    print('handleSaveCreate fixed')
else:
    print('ERROR: handleSaveCreate not found')

# ==========================================
# 5. Fix reset createForm: add customer_id
# ==========================================
old_reset = """const resetCreateForm = () => {
  createForm.customer_name = ''
  createForm.customer_phone = ''
  createForm.city = ''
  createForm.district = ''
  createForm.address = ''
  createForm.expected_delivery = ''
  createForm.cabinet_size = ''
  createForm.door_color = ''
  createForm.door_material = ''
  createForm.countertop_material = ''
  createForm.total_price = 0
  createForm.deposit_paid = 0
  createForm.remark = ''
}"""

new_reset = """const resetCreateForm = () => {
  createForm.customer_id = null
  createForm.customer_name = ''
  createForm.customer_phone = ''
  createForm.city = ''
  createForm.district = ''
  createForm.address = ''
  createForm.expected_delivery = ''
  createForm.cabinet_size = ''
  createForm.door_color = ''
  createForm.door_material = ''
  createForm.countertop_material = ''
  createForm.total_price = 0
  createForm.deposit_paid = 0
  createForm.remark = ''
}"""

if old_reset in content:
    content = content.replace(old_reset, new_reset)
    print('resetCreateForm fixed')
else:
    print('ERROR: resetCreateForm not found')

# ==========================================
# 6. Add customer import
# ==========================================
old_import = "import { orders, production } from '../../api'"
new_import = "import { orders, production, customer } from '../../api'"

if old_import in content:
    content = content.replace(old_import, new_import)
    print('customer import fixed')
else:
    print('ERROR: customer import not found')

open(path, 'w', encoding='utf-8').write(content)
print('All done')
