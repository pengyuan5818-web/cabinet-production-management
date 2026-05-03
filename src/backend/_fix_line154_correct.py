path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# door_panel_production columns:
# 1 id, 2 order_id, 3 order_detail_id, 4 door_no, 5 door_type, 6 length, 7 width, 8 thickness,
# 9 weight, 10 quantity, 11 material, 12 color, 13 finish, 14 has_handle, 15 handle_type,
# 16 handle_position, 17 has_hinge, 18 hinge_count, 19 coating_type, 20 coating_color,
# 21 coating_brand, 22 coating_thickness, 23 baking_temp, 24 baking_time, 25 status,
# 26 cutting_start, 27 cutting_complete, 28 pretreat_start, 29 pretreat_complete,
# 30 coating_start, 31 coating_complete, 32 baking_start, 33 baking_complete,
# 34 quality_start, 35 quality_complete, 36 quality_result, 37 quality_photos,
# 38 quality_remark, 39 package_type, 40 edge_protection, 41 current_location,
# 42 created_at, 43 updated_at

# Params for normal door panel (13 params -> fills up to current_location):
# $1=id, $2=order_id, $3=order_detail_id, $4=door_no, $5=door_type, $6=length=800,
# $7=width=600, $8=thickness=18, $9=weight=25.5, $10=quantity=2,
# $11=material, $12=color, $13=finish, $14=has_handle, $15=handle_type, $16=handle_position,
# $17=has_hinge, $18=hinge_count=6, $19=coating_type, $20=coating_color,
# $21=coating_brand=null, $22=coating_thickness=null, $23=baking_temp=180, $24=baking_time=30,
# $25=status, $26-35=timestamps, $36=quality_result, $37=quality_photos=null,
# $38=quality_remark=null, $39=package_type, $40=edge_protection, $41=current_location

# But we can only pass a reasonable number of params. Let's use 14 params:
# $1=id, $2=order_id, $3=door_no, $4=door_type, $5=material, $6=color, $7=finish,
# $8=has_handle, $9=handle_type, $10=has_hinge, $11=coating_type, $12=coating_color,
# $13=status, $14=current_location
# All other columns use literals (800, 600, 18, 25.5, 2, null, 6, 180, 30, CURRENT_TIMESTAMP, 'passed', 'carton', 'foam')

# Let me rewrite line 154 properly with all 41 columns mapped to params

# Simpler approach: use FEWER columns, only the required/important ones.
# PostgreSQL allows omitting nullable columns.
# Let's try with just the essential columns + params

new_line154 = (
    "await client.query(`INSERT INTO door_panel_production"
    "(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,"
    "material,color,finish,has_handle,has_hinge,hinge_count,"
    "coating_type,coating_color,baking_temp,baking_time,status,"
    "quality_result,current_location,created_at,updated_at) "
    "VALUES($1,$2,$3,$4,800,600,18,25.5,2,"
    "$5,$6,$7,$8,$9,6,"
    "$10,$11,180,30,$12,"
    "'passed',$13,NOW(),NOW())`, "
    "[doorId, order.id, 'D' + ts().slice(-6) + ri(100,999), '标准门板',"
    "'304不锈钢','银色','拉丝',true,true,"
    "'粉末喷涂','银色','completed','仓库A'])"
)

# Line 156 - countertop - same approach
# countertop columns: id,order_id,production_no,countertop_type,material,length,width,thickness,
# color,edge_style,has_sink_hole,has_faucet_hole,sink_size,faucet_type,quantity,status,
# quality_result,current_location,created_at,updated_at
new_line156 = (
    "await client.query(`INSERT INTO countertop_production"
    "(id,order_id,production_no,countertop_type,material,length,width,thickness,"
    "color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,"
    "quality_result,current_location,created_at,updated_at) "
    "VALUES($1,$2,$3,$4,$5,2000,600,15,"
    "$6,$7,$8,$9,1,$10,"
    "'passed',$11,NOW(),NOW())`, "
    "[ctId, order.id, 'CT' + ts().slice(-6) + ri(100,999), '石英石台面','石英石',"
    "'白色','直角边',true,true,'completed','仓库B'])"
)

# Line 161 - rejected door
new_line161 = (
    "if (orders[0]) { var doorId2 = uuid(); "
    "await client.query(`INSERT INTO door_panel_production"
    "(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,"
    "material,color,finish,has_handle,has_hinge,hinge_count,"
    "coating_type,coating_color,baking_temp,baking_time,status,"
    "quality_result,quality_remark,current_location,created_at,updated_at) "
    "VALUES($1,$2,$3,$4,800,600,18,25.5,2,"
    "$5,$6,$7,$8,$9,6,"
    "$10,$11,180,30,$12,"
    "'rejected',$13,$14,NOW(),NOW())`, "
    "[doorId2, orders[0].id, 'D' + ts().slice(-6) + 'BAD', '标准门板',"
    "'304不锈钢','银色','拉丝',true,true,"
    "'粉末喷涂','银色','rejected','质量不合格，已返工','仓库A']); "
    "console.log('OK 边界: 门板质量不合格 [rejected]'); }"
)

# Line 162 - scrapped countertop
new_line162 = (
    "if (orders[1]) { var ctId2 = uuid(); "
    "await client.query(`INSERT INTO countertop_production"
    "(id,order_id,production_no,countertop_type,material,length,width,thickness,"
    "color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,"
    "quality_result,current_location,created_at,updated_at) "
    "VALUES($1,$2,$3,$4,$5,2000,600,15,"
    "$6,$7,$8,$9,1,$10,"
    "'scrapped',$11,NOW(),NOW())`, "
    "[ctId2, orders[1].id, 'CT' + ts().slice(-6) + 'SCRP', '石英石台面','石英石',"
    "'白色','直角边',true,true,'scrapped','仓库B']); "
    "console.log('OK 边界: 台面报废 [scrapped]'); }"
)

# Apply changes (line numbers are 1-indexed, arrays 0-indexed)
lines[153] = "            " + new_line154
lines[155] = "            " + new_line156
lines[160] = "        " + new_line161
lines[161] = "        " + new_line162

new_content = '\n'.join(lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')

# Quick param count check
import re
for i, l in [(154, lines[153]), (156, lines[155])]:
    params = re.findall(r'\\$aram', l)  # This won't work, let me just count
    # Count $N occurrences
    dollar_n = re.findall(r'\$(\d+)', l)
    max_p = max(int(d) for d in dollar_n) if dollar_n else 0
    # Count array items (rough)
    arr_start = l.find('[doorId') if 'doorId' in l else l.find('[ctId')
    arr_end = l.rfind('])')
    arr = l[arr_start:arr_end+2] if arr_start >= 0 else 'NOT FOUND'
    item_count = arr.count(',') + 1
    print(f"Line {i}: max param=${max_p}, array items~{item_count}")
