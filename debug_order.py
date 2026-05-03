f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8-sig') as fh:
    lines = fh.readlines()

print('total lines:', len(lines))

# Show lines 34-42
with open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\debug_order.txt', 'w', encoding='utf-8') as out:
    for i in range(33, 43):
        out.write(f'{i+1}: {lines[i]}\n')

print('done')
