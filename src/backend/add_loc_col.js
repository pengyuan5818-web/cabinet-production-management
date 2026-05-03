const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres', max: 5 });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 给 order_master 加仓库库位字段
    await client.query(`ALTER TABLE order_master ADD COLUMN IF NOT EXISTS warehouse_location_id UUID REFERENCES warehouse_location(id)`);
    await client.query(`ALTER TABLE order_master ADD COLUMN IF NOT EXISTS warehouse_location_name VARCHAR(50)`);
    console.log('order_master 添加 warehouse_location_id 字段成功');

    // 2. 更新 warehouse_location 状态枚举（如果需要）
    // 确保 status 字段有 'empty' 和 'occupied' 值
    await client.query(`UPDATE warehouse_location SET status = 'empty' WHERE status IS NULL OR status = ''`);
    console.log('库位状态初始化完成');

    await client.query('COMMIT');
    console.log('MIGRATION SUCCESS');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERROR:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
