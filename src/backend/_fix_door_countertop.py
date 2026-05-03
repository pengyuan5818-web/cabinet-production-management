path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# =====================================================================
# FIX door_panel_production INSERT (line 154 and 161)
# =====================================================================
# door_panel_production columns (43 total):
# id, order_id, order_detail_id, door_no, door_type, length, width, thickness, weight, quantity,
# material, color, finish, has_handle, handle_type, handle_position, has_hinge, hinge_count,
# coating_type, coating_color, coating_brand, coating_thickness, baking_temp, baking_time,
# status, cutting_start, cutting_complete, pretreat_start, pretreat_complete,
# coating_start, coating_complete, baking_start, baking_complete,
# quality_start, quality_complete, quality_result, quality_photos, quality_remark,
# package_type, edge_protection, current_location, created_at, updated_at
#
# For normal case (completed):
# $1=id, $2=order_id, $3=order_detail_id(null), $4=door_no, $5=door_type, $6=length, $7=width,
# $8=thickness, $9=weight, $10=quantity, $11=material, $12=color, $13=finish,
# $14=has_handle, $15=handle_type, $16=handle_position, $17=has_hinge, $18=hinge_count,
# $19=coating_type, $20=coating_color, $21=coating_brand, $22=coating_thickness,
# $23=baking_temp, $24=baking_time, $25=status, $26=CUT, $27=CUT_COMPLETE,
# $28=PRETRET_START, $29=PRETRET_COMPLETE, $30=COATING_START, $31=COATING_COMPLETE,
# $32=BAKING_START, $33=BAKING_COMPLETE, $34=QUALITY_START, $35=QUALITY_COMPLETE,
# $36=quality_result, $37=quality_photos(null), $38=quality_remark(null),
# $39=package_type, $40=edge_protection, $41=current_location, $42=created_at, $43=updated_at
#
# For rejected case:
# Same but with quality_result='rejected', quality_remark, status='rejected'

# =====================================================================
# FIX countertop_production INSERT (line 156 and 162)
# =====================================================================
# countertop_production columns (27 total):
# id, order_id, production_no, countertop_type, material, length, width, thickness,
# color, edge_style, has_sink_hole, has_faucet_hole, sink_size, faucet_type,
# quantity, status, cutting_start, cutting_complete, polishing_start, polishing_complete,
# quality_start, quality_complete, quality_result, package_type, current_location, created_at, updated_at

# Line 154 - normal door_panel (completed)
new_line154 = (
    "await client.query('INSERT INTO door_panel_production(id,order_id,order_detail_id,door_no,door_type,"
    "length,width,thickness,weight,quantity,material,color,finish,has_handle,handle_type,handle_position,"
    "has_hinge,hinge_count,coating_type,coating_color,coating_brand,coating_thickness,"
    "baking_temp,baking_time,status,cutting_start,cutting_complete,pretreat_start,pretreat_complete,"
    "coating_start,coating_complete,baking_start,baking_complete,quality_start,quality_complete,"
    "quality_result,quality_photos,quality_remark,package_type,edge_protection,current_location,created_at,updated_at) "
    "VALUES($1,$2,null,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,null,null,$9,6,$10,$11,null,null,180,30,"
    "$12,"
    "CURRENT_TIMESTAMP-INTERVAL \\ '2 hours\\ ',CURRENT_TIMESTAMP-INTERVAL \\ '1 hour\\ ',"
    "CURRENT_TIMESTAMP-INTERVAL \\ '90 min\\ ',CURRENT_TIMESTAMP-INTERVAL \\ '45 min\\ ',"
    "CURRENT_TIMESTAMP-INTERVAL \\ '30 min\\ ',CURRENT_TIMESTAMP-INTERVAL \\ '15 min\\ ',"
    "CURRENT_TIMESTAMP-INTERVAL \\ '10 min\\ ',CURRENT_TIMESTAMP-INTERVAL \\ '5 min\\ ',"
    "CURRENT_TIMESTAMP-INTERVAL \\ '2 min\\ ',CURRENT_TIMESTAMP,"
    "'passed',null,null,'carton','foam',$13,NOW(),NOW())', "
    "[doorId, order.id, 'D' + ts().slice(-6) + ri(100,999), '标准门板', "
    "'304不锈钢','银色','拉丝',true,'液压','粉末喷涂','银色','completed','仓库A'])"
)

# Wait, the INTERVAL syntax in single-quoted JS string is problematic.
# Use ($1::text)::interval approach instead.
# New plan: use explicit timestamp strings instead of INTERVAL arithmetic.

# Actually, let me use a simpler approach: just use CURRENT_TIMESTAMP for all timestamps
# and cast to the right type. PostgreSQL will handle it.

# For simplicity, use CURRENT_TIMESTAMP for all non-key timestamps and let DB apply defaults.

# Line 154 - normal door_panel (completed) - minimal correct version
new_line154 = (
    "await client.query(`INSERT INTO door_panel_production(id,order_id,order_detail_id,door_no,door_type,"
    "length,width,thickness,weight,quantity,material,color,finish,has_handle,handle_type,handle_position,"
    "has_hinge,hinge_count,coating_type,coating_color,coating_brand,coating_thickness,"
    "baking_temp,baking_time,status,cutting_start,cutting_complete,pretreat_start,pretreat_complete,"
    "coating_start,coating_complete,baking_start,baking_complete,quality_start,quality_complete,"
    "quality_result,quality_photos,quality_remark,package_type,edge_protection,current_location,created_at,updated_at) "
    "VALUES($1,$2,null,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,null,null,$9,6,$10,$11,null,null,180,30,"
    "$12,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "'passed',null,null,'carton','foam',$13,NOW(),NOW())`, "
    "[doorId, order.id, 'D' + ts().slice(-6) + ri(100,999), '标准门板', "
    "'304不锈钢','银色','拉丝',true,'液压','粉末喷涂','银色','completed','仓库A'])"
)

# Line 156 - normal countertop (completed)
new_line156 = (
    "await client.query(`INSERT INTO countertop_production(id,order_id,production_no,countertop_type,"
    "material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,"
    "sink_size,faucet_type,quantity,status,cutting_start,cutting_complete,"
    "polishing_start,polishing_complete,quality_start,quality_complete,quality_result,"
    "package_type,current_location,created_at,updated_at) "
    "VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,null,null,1,$10,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "'passed','carton',$11,NOW(),NOW())`, "
    "[ctId, order.id, 'CT' + ts().slice(-6) + ri(100,999), '石英石台面', '石英石', "
    "'白色','直角边',true,true,'completed','仓库B'])"
)

# Line 161 - rejected door_panel
new_line161 = (
    "if (orders[0]) { var doorId2 = uuid(); "
    "await client.query(`INSERT INTO door_panel_production(id,order_id,order_detail_id,door_no,door_type,"
    "length,width,thickness,weight,quantity,material,color,finish,has_handle,handle_type,handle_position,"
    "has_hinge,hinge_count,coating_type,coating_color,coating_brand,coating_thickness,"
    "baking_temp,baking_time,status,cutting_start,cutting_complete,pretreat_start,pretreat_complete,"
    "coating_start,coating_complete,baking_start,baking_complete,quality_start,quality_complete,"
    "quality_result,quality_photos,quality_remark,package_type,edge_protection,current_location,created_at,updated_at) "
    "VALUES($1,$2,null,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,null,null,$9,6,$10,$11,null,null,180,30,"
    "$12,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "'rejected',null,'质量数据超期，已返工2次','carton','foam','仓库A',NOW(),NOW())`, "
    "[doorId2, orders[0].id, 'D' + ts().slice(-6) + 'BAD', '标准门板', "
    "'304不锈钢','银色','拉丝',true,'液压','粉末喷涂','银色','rejected']); "
    "console.log('OK 边界: 门板质量不合格 [rejected]'); }"
)

# Line 162 - scrapped countertop
new_line162 = (
    "if (orders[1]) { var ctId2 = uuid(); "
    "await client.query(`INSERT INTO countertop_production(id,order_id,production_no,countertop_type,"
    "material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,"
    "sink_size,faucet_type,quantity,status,cutting_start,cutting_complete,"
    "polishing_start,polishing_complete,quality_start,quality_complete,quality_result,"
    "package_type,current_location,created_at,updated_at) "
    "VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,null,null,1,$10,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,"
    "'scrapped','carton','仓库B',NOW(),NOW())`, "
    "[ctId2, orders[1].id, 'CT' + ts().slice(-6) + 'SCRP', '石英石台面', '石英石', "
    "'白色','直角边',true,true,'scrapped']); "
    "console.log('OK 边界: 台面报废 [scrapped]'); }"
)

# Apply
lines[153] = "            " + new_line154
lines[155] = "            " + new_line156
lines[160] = "        " + new_line161
lines[161] = "        " + new_line162

new_content = '\n'.join(lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')
print('Total lines:', new_content.count('\n'))
