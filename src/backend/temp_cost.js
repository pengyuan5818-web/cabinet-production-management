const db = require('./src/db');
async function main() {
  // Check cost_record structure
  const t1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='cost_record' ORDER BY ordinal_position");
  console.log('=== cost_record ===');
  console.log(JSON.stringify(t1.rows, null, 2));

  // Check material
  const t2 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='material' ORDER BY ordinal_position");
  console.log('\n=== material ===');
  console.log(JSON.stringify(t2.rows, null, 2));

  // Check material_bom
  const t3 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='material_bom' ORDER BY ordinal_position");
  console.log('\n=== material_bom ===');
  console.log(JSON.stringify(t3.rows, null, 2));

  // Check order_bom
  const t4 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='order_bom' ORDER BY ordinal_position");
  console.log('\n=== order_bom ===');
  console.log(JSON.stringify(t4.rows, null, 2));

  // Sample data from cost_record
  const s1 = await db.query("SELECT * FROM cost_record LIMIT 3");
  console.log('\n=== cost_record sample ===');
  console.log(JSON.stringify(s1.rows, null, 2));

  // Sample from material
  const s2 = await db.query("SELECT * FROM material LIMIT 3");
  console.log('\n=== material sample ===');
  console.log(JSON.stringify(s2.rows, null, 2));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
