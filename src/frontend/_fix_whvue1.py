path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\warehouse\index.vue'
content = open(path, encoding='utf-8').read()

old_dialog = """    <el-dialog v-model="showAddLocDialog" title="新增库位" width="400px">
      <el-form :model="addLocForm" label-width="90px">
        <el-form-item label="库位名称" required>
          <el-input v-model="addLocForm.location_name" placeholder="例如：7号库位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddLocDialog = false">取消</el-button>
        <el-button type="primary" :loading="addLocLoading" @click="submitAddLoc">确认</el-button>
      </template>
    </el-dialog>"""

new_dialog = """    <el-dialog v-model="showAddLocDialog" title="新增库位" width="400px">
      <el-form :model="addLocForm" label-width="90px">
        <el-form-item label="库位编码" required>
          <el-input v-model="addLocForm.location_code" placeholder="例如：B-2" style="margin-bottom:8px" />
        </el-form-item>
        <el-form-item label="库位名称">
          <el-input v-model="addLocForm.location_name" placeholder="可选，如：区域B-库位2号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddLocDialog = false">取消</el-button>
        <el-button type="primary" :loading="addLocLoading" @click="submitAddLoc">确认</el-button>
      </template>
    </el-dialog>"""

if old_dialog in content:
    content = content.replace(old_dialog, new_dialog)
    print('Dialog fixed')
else:
    print('ERROR: dialog not found')
    idx = content.find('showAddLocDialog')
    if idx >= 0:
        print(repr(content[idx-50:idx+400]))

open(path, 'w', encoding='utf-8').write(content)
