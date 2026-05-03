path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\orders\index.vue'
content = open(path, encoding='utf-8').read()
checks = [
    ('customer import', "import { orders, production, customer }" in content),
    ('customerList ref', 'const customerList = ref([])' in content),
    ('loadCustomerList fn', 'const loadCustomerList' in content),
    ('el-select filterable', 'filterable' in content),
    ('customer_id in createForm', 'customer_id: null' in content),
    ('customer_id in payload', 'customer_id: createForm.customer_id' in content),
    ('page_size=999', 'page_size: 999' in content),
]
all_ok = True
for name, ok in checks:
    status = 'OK' if ok else 'MISSING'
    if not ok:
        all_ok = False
    print(f'  orders/index.vue - {name}: {status}')

if all_ok:
    print('All checks passed')
else:
    print('Some checks FAILED')
