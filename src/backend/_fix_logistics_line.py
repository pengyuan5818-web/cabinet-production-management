path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Line 201 (0-indexed: 200) - the late logistics
# Fix: remove estimate_arrive from INSERT, keep params consistent
# Original: 17 columns, 15 $N, 16 params
# Fix: 16 columns (remove estimate_arrive), 15 $N, 15 params (remove ovDate string)

new_line201 = (
    '        if (orders.length > 1) { var lateId = uuid(); var ovDate = new Date(); ovDate.setDate(ovDate.getDate() - 3); '
    'await client.query("INSERT INTO logistics_record(id,logistics_no,order_id,logistics_company,driver_name,driver_phone,'
    'freight,status,receive_province,receive_city,receive_district,receive_address,receive_contact,receive_phone,'
    'remark,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())", '
    '[lateId, "LF" + ts().slice(-6) + "LATE", orders[1].id, "韵达快递", "司机赵", "13800004444", 300, '
    '"in_transit", "广东省", "广州市", "天河区", "客户地址", "客户", "13800000001", '
    '"边界-已超期3天仍未到达"]); '
    'console.log("OK 边界物流: 超期未到达 [in_transit, 超期3天]"); }'
)

lines[200] = new_line201

new_content = '\n'.join(lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')
print('New line 201:')
print(lines[200][:200])
