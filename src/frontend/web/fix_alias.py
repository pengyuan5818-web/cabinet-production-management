import os

paths = [
    r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\hardware\index.vue',
    r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\views\shipment\index.vue'
]

for p in paths:
    with open(p, 'rb') as f:
        content = f.read().decode('utf-8', errors='ignore')
    if "@/api" in content:
        content = content.replace("from '@/api'", "from '../../api'")
        with open(p, 'wb') as f:
            f.write(content.encode('utf-8'))
        print('Fixed:', p[-30:])
    else:
        print('No @/api found in:', p[-30:])
