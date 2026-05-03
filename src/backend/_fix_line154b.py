path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Problem: In line 154, $13 is used BOTH for the interval param ($13::text) AND as quality_complete column ref.
# Fix: Change interval to $14, and shift quality_complete, current_location from $13 to $14, $15
# Then add interval value '3 days' as new param $14 (old $14), and shift others.

# Line 154: fix the $13 collision
old154 = lines[153]
new154 = old154
new154 = new154.replace('($13::text)::interval', '($14::text)::interval', 1)
# Shift $13 (quality_complete) to $15, and current_location $14 to $15
new154 = new154.replace(',$13,NOW())', ',$15,NOW())')  # quality_complete: $13 -> $15
new154 = new154.replace('$14,NOW())', '$15,NOW())')  # current_location: $14 -> $15  (this won't match since it's $13 first...)

# Actually the SQL is: VALUES(..., $12, $13, CURRENT_TIMESTAMP - $14::interval, CURRENT_TIMESTAMP, $13, NOW())
# Wait let me just check the actual current state first

print("Line 154 SQL section:")
# Find CURRENT_TIMESTAMP part
idx = new154.find('CURRENT_TIMESTAMP')
print(new154[idx-5:idx+100])
print()

# Fix: use string replacement more carefully
# Current broken: CURRENT_TIMESTAMP - ($13::text)::interval
# Fix: CURRENT_TIMESTAMP - ($14::text)::interval
# Current quality_complete = $13, current_location = $13 (COLLISION!)
# Fix: quality_complete = $14, current_location = $15, add '3 days' = $13

# Let me just rebuild line 154 entirely
# Params after fix: [doorId, order.id, door_no, door_type, material, color, finish, has_handle, has_hinge, coating_type, coating_color, status, '3 days', quality_complete_val, current_location_val]
# That's 14 params total ($1-$14)

# The VALUES columns:
# $1=id, $2=order_id, $3=door_no, $4=door_type, $5=length, $6=width, $7=thickness, $8=weight, $9=quantity
# $10=material, $11=color, $12=finish, $13=has_handle, $14=has_hinge, $15=hinge_count, $16=coating_type, $17=coating_color
# $18=baking_temp, $19=baking_time, $20=status, $21=cutting_complete, $22=quality_complete, $23=current_location, $24=created_at

# Wait, there are already fixed numbers like 800, 600, 18, 25.5, 2, 6, 180, 30, CURRENT_TIMESTAMP, NOW() as non-param values.
# The param positions in VALUES: $1,$2,$3,$4,$5(material),$6(color),$7(finish),$8(has_handle),$9(has_hinge),$10(hinge_count),
# $11(coating_type),$12(coating_color), $13(status), $14(quality_complete), $15(current_location)

# The problematic SQL: VALUES(..., $12, $13(quality_complete), CURRENT_TIMESTAMP-($13::text)::interval, $13(current_location)...)
# So $13 is used twice.

# Fix: 
# - change the interval's $13 to $14
# - keep quality_complete=$13, current_location=$14  
# - add '3 days' interval string as a new param at the end, renumber current_location to $15

# But actually: cutting_complete and quality_complete use CURRENT_TIMESTAMP (no param).
# Let me just rebuild the line with correct params.

# The params in original line 154:
# [doorId, order.id, 'D'+ts+ri, '标准门板', '304不锈钢', '银色', '拉丝', true, '液压', '粉末喷涂', '银色', 'completed', '仓库A']
# That's 13 items: doorId, order.id, door_no, door_type, material, color, finish, has_handle, has_hinge, coating_type, coating_color, status, current_location
# $1=doorId, $2=order.id, $3=door_no, $4=door_type, $5=material, $6=color, $7=finish, $8=has_handle, $9=has_hinge, $10=coating_type, $11=coating_color, $12=status, $13=current_location

# The SQL has CURRENT_TIMESTAMP-($1::text)::interval using $1 (doorId) -> PROBLEM!
# The fix: use $14 for interval, shift current_location to $15, add '3 days' as $14

# Original SQL snippet: VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,CURRENT_TIMESTAMP-($1::text)::interval,CURRENT_TIMESTAMP,$13,NOW())
# Wait, the interval was originally $1, then the fix changed it to $13.
# But quality_complete column = $13 too (CURRENT_TIMESTAMP = no param). Let me re-read.

# The SQL VALUES part of line 154:
# VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,
#   CURRENT_TIMESTAMP - ($13::text)::interval,  -- quality_complete uses $13!
#   CURRENT_TIMESTAMP,                         -- quality_complete value (no param)
#   $13,                                       -- current_location! ANOTHER $13!
#   NOW())

# So there are TWO $13 references:
# 1. ($13::text)::interval - the INTERVAL param (should be $14)
# 2. $13 - current_location value param (should be $15)
# And quality_complete = CURRENT_TIMESTAMP (no param)

# Fix: ($13::text) -> ($14::text), current_location $13 -> $15, add '3 days' as $13

# Build new line 154:
# New params: [doorId, order.id, door_no, door_type, material, color, finish, has_handle, has_hinge, coating_type, coating_color, status, '3 days', current_location]
# $1=doorId, $2=order.id, $3=door_no, $4=door_type, $5=material, $6=color, $7=finish, $8=has_handle, $9=has_hinge, $10=coating_type, $11=coating_color, $12=status, $13='3 days', $14=current_location

new_line154 = """            await client.query('INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,CURRENT_TIMESTAMP-($13::text)::interval,CURRENT_TIMESTAMP,$14,NOW())', [doorId, order.id, 'D' + ts().slice(-6) + ri(100,999), '标准门板', '304不锈钢', '银色', '拉丝', true, '液压', '粉末喷涂', '银色', 'completed', '3 days', '仓库A']);"""

# Line 156: similar issue - $11 used for both interval and quality_complete? Let me check
# Line 156: ...CURRENT_TIMESTAMP-($11::text)::interval,CURRENT_TIMESTAMP,$11,NOW())
# Params before fix: [ctId, order.id, 'CT'+ts+ri, '石英石台面', '石英石', '白色', ' Edge', true, true, 'completed', '仓库B']
# $1=ctId, $2=order.id, $3=production_no, $4=countertop_type, $5=material, $6=color, $7=edge_style, $8=has_sink_hole, $9=has_faucet_hole, $10=status, $11=current_location
# SQL: ...$10,CURRENT_TIMESTAMP-($11::text)::interval,CURRENT_TIMESTAMP,$11...
# $11 is used for interval AND current_location -> collision!
# Fix: interval -> $12, current_location -> $12, add '2 days' as $11

# Build new line 156:
new_line156 = """            await client.query('INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_complete,current_location,created_at) VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,1,$10,CURRENT_TIMESTAMP-($11::text)::interval,CURRENT_TIMESTAMP,$12,NOW())', [ctId, order.id, 'CT' + ts().slice(-6) + ri(100,999), '石英石台面', '石英石', '白色', '直角边', true, true, 'completed', '2 days', '仓库B']);"""

# Line 161: double-quoted SQL, two intervals
# Params: [doorId2, orders[0].id, D_BAD, door_type, material, color, finish, has_handle, has_hinge, coating_type, coating_color, in_production, rejected, quality_remark1, quality_remark2]
# That's 15 items. $1-doorId2, $2-order.id, $3-door_no, $4-door_type, $5-material, $6-color, $7-finish, $8-has_handle, $9-has_hinge, $10-coating_type, $11-coating_color, $12-in_production, $13-rejected, $14-remark1, $15-remark2
# SQL has: CURRENT_TIMESTAMP-($15::text)::interval, CURRENT_TIMESTAMP-($16::text)::interval, $13, $14 (wait...)

# Let me just use a different approach for line 161 and 162:
# Replace the whole query with properly structured one.

new_line161 = """        if (orders[0]) { var doorId2 = uuid(); await client.query("INSERT INTO door_panel_production(id,order_id,door_no,door_type,length,width,thickness,weight,quantity,material,color,finish,has_handle,has_hinge,hinge_count,coating_type,coating_color,baking_temp,baking_time,status,cutting_complete,quality_start,quality_complete,quality_result,quality_remark,current_location,created_at) VALUES($1,$2,$3,$4,800,600,18,25.5,2,$5,$6,$7,$8,$9,6,$10,$11,180,30,$12,CURRENT_TIMESTAMP-($13::text)::interval,CURRENT_TIMESTAMP-($14::text)::interval,CURRENT_TIMESTAMP,$15,$16,NOW())", [doorId2, orders[0].id, 'D' + ts().slice(-6) + 'BAD', '标准门板', '304不锈钢', '银色', '拉丝', true, '液压', '粉末喷涂', '银色', 'in_production', 'rejected', '质量数据超期，已返工2次', '板材开裂报废', '5 days', '1 day']); console.log('OK 边界: 门板质量不合格 [rejected]'); }"""

new_line162 = """        if (orders[1]) { var ctId2 = uuid(); await client.query("INSERT INTO countertop_production(id,order_id,production_no,countertop_type,material,length,width,thickness,color,edge_style,has_sink_hole,has_faucet_hole,quantity,status,cutting_complete,quality_start,quality_complete,quality_result,current_location,created_at) VALUES($1,$2,$3,$4,$5,2000,600,15,$6,$7,$8,$9,1,$10,CURRENT_TIMESTAMP-($11::text)::interval,CURRENT_TIMESTAMP-($12::text)::interval,CURRENT_TIMESTAMP,$13,$14,NOW())", [ctId2, orders[1].id, 'CT' + ts().slice(-6) + 'SCRP', '石英石台面', '石英石', '白色', '直角边', true, true, 'in_production', 'scrapped', '质量问题', '4 days', '1 day']); console.log('OK 边界: 台面报废 [scrapped]'); }"""

# Apply changes
lines[153] = new_line154
lines[155] = new_line156
lines[160] = new_line161
lines[161] = new_line162

new_content = '\n'.join(lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')

# Verify
print('\nLine 154 check:')
idx = lines[153].find('CURRENT_TIMESTAMP')
print(lines[153][idx-10:idx+80])
print('\nLine 156 check:')
idx = lines[155].find('CURRENT_TIMESTAMP')
print(lines[155][idx-10:idx+80])
