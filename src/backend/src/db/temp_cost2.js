const db = require('./src/db');
async function main() {
  // Check process_output
  const t1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='process_output' ORDER BY ordinal_position");
  console.log('=== process_output ===');
  console.log(JSON.stringify(t1.rows, null, 2));
  const s1 = await db.query("SELECT * FROM process_output LIMIT 3");
  console.log(JSON.stringify(s1.rows, null, 2));

  // Check material_consumption
  const t2 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='material_consumption' ORDER BY ordinal_position");
  console.log('\n=== material_consumption ===');
  console.log(JSON.stringify(t2.rows, null, 2));
  const s2 = await db.query("SELECT * FROM material_consumption LIMIT 3");
  console.log(JSON.stringify(s2.rows, null, 2));

  // Check order_master to see what fields exist for cost
  const t3 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='order_master' ORDER BY ordinal_position");
  console.log('\n=== order_master ===');
  console.log(JSON.stringify(t3.rows, null, 2));

  // Check employee / salary
  const t4 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='salary_record' ORDER BY ordinal_position");
  console.log('\n=== salary_record ===');
  console.log(JSON.stringify(t4.rows, null, 2));
  const s4 = await db.query("SELECT * FROM salary_record LIMIT 3");
  console.log(JSON.stringify(s4.rows, null, 2));

  // Check expense table
  const t5 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='expense' ORDER BY ordinal_position");
  console.log('\n=== expense ===');
  console.log(JSON.stringify(t5.rows, null, 2));
  const s5 = await db.query("SELECT * FROM expense LIMIT 3");
  console.log(JSON.stringify(s5.rows, null, 2));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
