const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'cabinet_factory',
  user: 'postgres',
  password: 'postgres'
});

async function test() {
  // Test 1: movement SQL
  const sql = `
    SELECT * FROM (
      SELECT 
        'in' as type,
        sr.id,
        sr.material_id,
        sr.in_quantity as quantity,
        sr.created_at,
        m.material_name,
        m.material_code,
        w.warehouse_name,
        sr.biz_type,
        sr.remark as ref_name
      FROM stock_record sr
      LEFT JOIN material m ON sr.material_id = m.id
      LEFT JOIN warehouse w ON sr.warehouse_id = w.id
      WHERE sr.biz_type = 'stock_in'
        AND 1=1
      UNION ALL
      SELECT 
        'out' as type,
        sr.id,
        sr.material_id,
        sr.out_quantity as quantity,
        sr.created_at,
        m.material_name,
        m.material_code,
        w.warehouse_name,
        sr.biz_type,
        sr.remark as ref_name
      FROM stock_record sr
      LEFT JOIN material m ON sr.material_id = m.id
      LEFT JOIN warehouse w ON sr.warehouse_id = w.id
      WHERE sr.biz_type = 'stock_out'
        AND 1=1
    ) t
    ORDER BY created_at DESC LIMIT 5
  `;
  try {
    const r = await pool.query(sql);
    console.log('movement OK:', r.rows.length, 'rows');
  } catch(e) {
    console.log('movement ERROR:', e.message);
  }

  // Test 2: current inventory SQL
  const sql2 = `
    SELECT m.id, m.material_code, m.unit as unit_name
    FROM material m
    LEFT JOIN stock_inventory si ON m.id::uuid = si.material_id
    WHERE m.status = 'active'
    LIMIT 3
  `;
  try {
    const r2 = await pool.query(sql2);
    console.log('current OK:', r2.rows.length, 'rows');
  } catch(e2) {
    console.log('current ERROR:', e2.message);
  }

  await pool.end();
}

test();
