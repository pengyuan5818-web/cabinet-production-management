path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\orders\index.vue'
content = open(path, encoding='utf-8').read()

old_hc = """const handleCreate = () => {
  createFormRef.value?.resetFields()
  Object.assign(createForm, {
    customer_name: '', customer_phone: '', city: '', district: '', address: '',
    expected_delivery: '', cabinet_size: '', door_color: '', door_material: '',
    countertop_material: '', total_price: 0, deposit_paid: 0, remark: '',
    installation_required: false
  })
  createVisible.value = true
}"""

new_hc = """const handleCreate = () => {
  createFormRef.value?.resetFields()
  Object.assign(createForm, {
    customer_id: null, customer_name: '', customer_phone: '', city: '', district: '', address: '',
    expected_delivery: '', cabinet_size: '', door_color: '', door_material: '',
    countertop_material: '', total_price: 0, deposit_paid: 0, remark: '',
    installation_required: false
  })
  createVisible.value = true
}"""

if old_hc in content:
    content = content.replace(old_hc, new_hc)
    open(path, 'w', encoding='utf-8').write(content)
    print('handleCreate fixed')
else:
    print('ERROR: handleCreate not found')
