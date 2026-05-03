const { Client } = require('pg');
async function main() {
  const c = new Client({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
  await c.connect();

  // 检查 design_drawing 是否存在
  const t = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_name IN ('design_drawing','design_record','warehouse_location','sort_task','quality_record','package_record','installation_record')"
  );
  console.log('Tables found:', JSON.stringify(t.rows));

  // 检查 installation 相关路由是否存在（文件）
  const fs = require('fs');
  const routes = ['installation','sort','quality','package','design','receivable','quote'];
  for (const r of routes) {
    const p = `src/routes/${r}.js`;
    console.log(`${r}: ${fs.existsSync(p) ? 'EXISTS' : 'MISSING'}`);
  }

  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
