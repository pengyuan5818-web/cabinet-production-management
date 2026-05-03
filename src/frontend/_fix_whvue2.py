path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\warehouse\index.vue'
content = open(path, encoding='utf-8').read()

# Fix addLocForm ref
old1 = "const addLocForm = ref({ location_name: '' })"
new1 = "const addLocForm = ref({ location_code: '', location_name: '' })"
if old1 in content:
    content = content.replace(old1, new1)
    print('addLocForm fixed')
else:
    print('ERROR: addLocForm not found')

# Fix submitAddLoc
old2 = """const submitAddLoc = async () => {
  if (!addLocForm.value.location_name) { ElMessage.warning('请输入库位名称'); return }
  addLocLoading.value = true
  try {
    const res = await warehouse.addFinishedLocation({ location_name: addLocForm.value.location_name })
    if (res.success) {
      ElMessage.success('新增成功')
      showAddLocDialog.value = false
      addLocForm.value.location_name = ''
      loadFinishedLocations()
    } else {
      ElMessage.error(res.message || '新增失败')
    }
  } catch (e) { ElMessage.error('新增失败') }
  addLocLoading.value = false
}"""

new2 = """const submitAddLoc = async () => {
  if (!addLocForm.value.location_code) { ElMessage.warning('请输入库位编码'); return }
  addLocLoading.value = true
  try {
    const res = await warehouse.addFinishedLocation({ location_code: addLocForm.value.location_code, location_name: addLocForm.value.location_name })
    if (res.success) {
      ElMessage.success('新增成功')
      showAddLocDialog.value = false
      addLocForm.value.location_code = ''
      addLocForm.value.location_name = ''
      loadFinishedLocations()
    } else {
      ElMessage.error(res.message || '新增失败')
    }
  } catch (e) { ElMessage.error('新增失败') }
  addLocLoading.value = false
}"""

if old2 in content:
    content = content.replace(old2, new2)
    print('submitAddLoc fixed')
else:
    print('ERROR: submitAddLoc block not found')

open(path, 'w', encoding='utf-8').write(content)
