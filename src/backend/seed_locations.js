/**
 * 成品仓库库位初始化脚本
 * 给成品仓库（warehouse_type='finished'）预置 6 个固定库位
 */
const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres', max: 5 });

async function seedLocations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 找到成品仓库 ID
    const whResult = await client.query(`SELECT id FROM warehouse WHERE warehouse_type = 'finished' LIMIT 1`);
    if (whResult.rows.length === 0) {
      console.log('ERROR: 没有找到成品仓库（warehouse_type=finished）');
      await client.query('ROLLBACK');
      return;
    }
    const warehouseId = whResult.rows[0].id;
    console.log('成品仓库 ID:', warehouseId);

    // 删除旧库位
    await client.query(`DELETE FROM warehouse_location WHERE warehouse_id = $1`, [warehouseId]);
    console.log('已清空旧库位');

    // 插入 6 个固定库位
    const locations = [];
    for (let i = 1; i <= 6; i++) {
      const locNo = String(i);
      const r = await client.query(
        `INSERT INTO warehouse_location (id, warehouse_id, location_code, location_name, zone, shelf, layer, position, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'A区', NULL, NULL, NULL, 'empty', NOW())
         RETURNING id, location_code, location_name`,
        [warehouseId, locNo, `${locNo}号库位`]
      );
      locations.push(r.rows[0]);
      console.log(`已创建库位: ${locNo}号库位`);
    }

    await client.query('COMMIT');
    console.log('SUCCESS: 6个库位创建完成', JSON.stringify(locations));
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERROR:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

seedLocations();
