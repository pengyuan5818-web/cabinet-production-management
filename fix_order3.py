f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Find the tracking insert block after // 4.
marker = "// 4. 璁板綍杩借釜\n    await client.query(\n      `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, stage_remark, created_at)\n       VALUES ($1,'installation',"
idx = c.find(marker)
print('marker at:', idx)

if idx >= 0:
    # Find end of this block: the ');' that closes this query
    end_marker = ");\n\n    await client.query('COMMIT');"
    end_idx = c.find(end_marker, idx)
    print('end at:', end_idx)
    
    if end_idx >= 0:
        end_idx += len(end_marker)  # include the whole closing part
        
        old_block = c[idx:end_idx]
        new_block = """// 4. 濡傛灉闇€瑕佸畨瑁咃紝璁板綍杩借釜
    if (order.installation_required) {
      await client.query(
        `INSERT INTO order_tracking (order_id, current_stage, stage_name, stage_status, stage_remark, created_at)
         VALUES ($1,'installation','涓婇棬瀹夎€咃紝'pending'锛岀墿娴佸凡绛炬敹锛岀瓑寰呭畨瑁呭笀鎷呭綍',NOW())`,
        [id]
      );
    }

    """
        c = c[:idx] + new_block + c[end_idx:]
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(c)
        print('done, replaced', len(old_block), 'chars with', len(new_block), 'chars')
    else:
        print('end marker not found')
else:
    print('marker not found')
