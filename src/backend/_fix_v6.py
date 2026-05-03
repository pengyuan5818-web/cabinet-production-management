path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_direct_v6.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: createCustomers loop var 'c' shadows client 'c'
# Change outer loop variable and inner refs
content = content.replace(
    "for (const c of custs) {\n            const id = uuid();\n            await c.query(\n                `INSERT INTO customer (id,customer_no,customer_name,phone,address,status,source,created_at) VALUES ($1,$2,$3,$4,$5,'following','测试',NOW())`,\n                [id, 'C' + Date.now() + ri(100, 999), c.n, c.p, c.a]\n            );",
    "for (const cust of custs) {\n            const id = uuid();\n            await c.query(\n                `INSERT INTO customer (id,customer_no,customer_name,phone,address,status,source,created_at) VALUES ($1,$2,$3,$4,$5,'following','测试',NOW())`,\n                [id, 'C' + Date.now() + ri(100, 999), cust.n, cust.p, cust.a]\n            );"
)

# Fix 2: material codes must be unique across runs - add T suffix
content = content.replace("'MAT-SS-001'", "'MAT-SS-001T'")
content = content.replace("'MAT-SS-002'", "'MAT-SS-002T'")
content = content.replace("'MAT-AC-001'", "'MAT-AC-001T'")
content = content.replace("'MAT-GL-001'", "'MAT-GL-001T'")
content = content.replace("'MAT-HW-001'", "'MAT-HW-001T'")
content = content.replace("'MAT-HW-002'", "'MAT-HW-002T'")

# Fix 3: warehouse codes must be unique - add ts to code
content = content.replace("code: 'WH001T'", "code: 'WH001T'")
content = content.replace("code: 'WH002T'", "code: 'WH002T'")
# Actually these are already unique but previous run may have left them
# The problem is the DELETE doesn't clean them properly if code has no T suffix filter
# Since we already use LIKE '%T%', let's just ensure they get unique codes via ts
# Change to use ts in warehouse codes
content = content.replace(
    "const ws = [{ n: '广州总仓T', code: 'WH001T' }, { n: '佛山分仓T', code: 'WH002T' }];",
    "const ws = [{ n: '广州总仓T', code: 'WH001T' }, { n: '佛山分仓T', code: 'WH002T' }];"
)
# That won't help. Let's append ts to the actual code values at INSERT time
content = content.replace(
    "[id, w.code, w.n]",
    "[id, w.code + '" + "', // ts fix\n            w.n]"
)

# Actually the simplest fix: append ts to warehouse_code in the INSERT
# Replace the INSERT line for warehouse
old_wh = "await c.query(\n                `INSERT INTO warehouse (id,warehouse_code,warehouse_name,warehouse_type,province,city,district,address,status,created_at) VALUES ($1,$2,$3,'main','广东省','广州市','白云区','广州市白云区钟落潭','active',NOW())`,\n                [id, w.code, w.n]\n            );"
new_wh = "await c.query(\n                `INSERT INTO warehouse (id,warehouse_code,warehouse_name,warehouse_type,province,city,district,address,status,created_at) VALUES ($1,$2,$3,'main','广东省','广州市','白云区','广州市白云区钟落潭','active',NOW())`,\n                [id, w.code + '" + "', w.n]\n            );"
content = content.replace(old_wh, new_wh)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
