path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\orders\index.vue'
content = open(path, encoding='utf-8').read()

old_load = "    const res = await customer.list()"
new_load = "    const res = await customer.list({ page_size: 999 })"

if old_load in content:
    content = content.replace(old_load, new_load)
    open(path, 'w', encoding='utf-8').write(content)
    print('loadCustomerList updated to page_size=999')
else:
    print('ERROR: customer.list call not found')
