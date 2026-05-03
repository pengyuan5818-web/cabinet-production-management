// 深度问题检查
const { Client } = require('pg');
const client = new Client({
  host: 'localhost', port: 5432, database: 'cabinet_factory',
  user: 'postgres', password: 'postgres'
});

async function getColumns(table) {
  const res = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position
  `, [table]);
  return res.rows.map(r => ({ name: r.column_name, type: r.data_type }));
}

async function checkTable(table) {
  const res = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name=$1 AND table_schema='public'`, [table]);
  return res.rows.length > 0;
}

async function run() {
  await client.connect();

  // 1. 检查 alpha.js 引用的 "set" 表
  console.log('=== alpha.js 引用 "set" 表 ===');
  const alphaContent = require('fs').readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/alpha.js', 'utf8');
  const setRefs = alphaContent.match(/['"`]set['"`]/g);
  console.log(`  "set" references: ${setRefs ? setRefs.length : 0}`);
  // 找具体用法
  const setMatches = [...alphaContent.matchAll(/['"`](\w+set\w*)['"`]/gi)];
  console.log('  Possible set table refs:', setMatches.map(m => m[1]));
  const setExists = await checkTable('set');
  console.log(`  Table "set" exists: ${setExists}`);

  // 2. 检查 supplier.js 引用的 evaluation_date
  console.log('\n=== supplier.js 引用 evaluation_date ===');
  const suppContent = require('fs').readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/supplier.js', 'utf8');
  const evalMatch = suppContent.match(/evaluation_date/gi);
  console.log(`  evaluation_date references: ${evalMatch ? evalMatch.length : 0}`);
  // 找具体用法
  const evalLines = suppContent.split('\n').filter(l => l.includes('evaluation_date'));
  evalLines.forEach((l, i) => console.log(`    Line ${i}: ${l.trim().substring(0, 100)}`));
  const evalExists = await checkTable('evaluation_date');
  console.log(`  Table "evaluation_date" exists: ${evalExists}`);
  // 尝试找相似名
  const allTables = (await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(r => r.tablename);
  const similarEval = allTables.filter(t => t.includes('evaluat') || t.includes('supplier'));
  console.log(`  Similar tables: ${similarEval.join(', ')}`);

  // 3. 检查 receivable vs receivables 两个后端路由
  console.log('\n=== receivable/receivables 双路由 ===');
  const receivableRoutes = allTables.filter(t => t.includes('receivable'));
  console.log(`  DB tables: ${receivableRoutes.join(', ')}`);
  // 前端API路径
  const feApiContent = require('fs').readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/frontend/web/src/api/index.js', 'utf8');
  const feReceivablePaths = feApiContent.match(/\/receivable[a-z]*\/?/gi);
  console.log(`  Frontend API paths: ${[...new Set(feReceivablePaths)].join(', ')}`);

  // 4. 检查 payable 表字段
  console.log('\n=== payable 表字段 ===');
  const payableCols = await getColumns('payable');
  payableCols.forEach(c => console.log(`  ${c.name}: ${c.type}`));

  // 5. 检查 receivable 表字段
  console.log('\n=== receivable 表字段 ===');
  const receivableCols = await getColumns('receivable');
  receivableCols.forEach(c => console.log(`  ${c.name}: ${c.type}`));

  // 6. fund_flow 表全部字段
  console.log('\n=== fund_flow 表字段 ===');
  const fundCols = await getColumns('fund_flow');
  fundCols.forEach(c => console.log(`  ${c.name}: ${c.type}`));

  // 7. warehouse vs warehouse_location
  console.log('\n=== warehouse / warehouse_location 区分 ===');
  const whCols = await getColumns('warehouse');
  const whLocCols = await getColumns('warehouse_location');
  console.log(`  warehouse: ${whCols.length} cols`);
  console.log(`  warehouse_location: ${whLocCols.length} cols`);
  // order_master 用的是哪个
  const omCols = await getColumns('order_master');
  const whRef = omCols.filter(c => c.name.includes('warehouse'));
  console.log(`  order_master warehouse refs: ${whRef.map(c => c.name).join(', ')}`);

  // 8. 检查 receivable.status 类型
  console.log('\n=== receivable.status 枚举值 ===');
  const recStatusRes = await client.query(`SELECT DISTINCT status FROM receivable LIMIT 10`);
  console.log(`  Values: ${recStatusRes.rows.map(r => r.status).join(', ')}`);
  const recCol = receivableCols.find(c => c.name === 'status');
  console.log(`  Type: ${recCol ? recCol.type : 'N/A'}`);

  // 9. 检查 payable.status 类型
  console.log('\n=== payable.status 枚举值 ===');
  const payStatusRes = await client.query(`SELECT DISTINCT status FROM payable LIMIT 10`);
  console.log(`  Values: ${payStatusRes.rows.map(r => r.status).join(', ')}`);
  const payCol = payableCols.find(c => c.name === 'status');
  console.log(`  Type: ${payCol ? payCol.type : 'N/A'}`);

  // 10. 检查 invoice 表
  console.log('\n=== invoice 表字段 ===');
  const invoiceCols = await getColumns('invoice');
  invoiceCols.forEach(c => console.log(`  ${c.name}: ${c.type}`));

  // 11. 检查 collection_record / payment_record
  console.log('\n=== collection_record 表字段 ===');
  const collCols = await getColumns('collection_record');
  collCols.forEach(c => console.log(`  ${c.name}: ${c.type}`));

  // 12. 检查 stock_in/stock_out 是否有 currency + _cny
  console.log('\n=== stock_in 关键字段 ===');
  const siCols = await getColumns('stock_in');
  const siMoney = siCols.filter(c => ['currency', 'total_amount', 'total_amount_cny'].includes(c.name));
  console.log(`  ${siMoney.map(c => `${c.name}:${c.type}`).join(', ')}`);

  // 13. 检查 installation_task vs order_installation
  console.log('\n=== installation_task vs order_installation ===');
  const itCols = await getColumns('installation_task');
  const oiCols = await getColumns('order_installation');
  console.log(`  installation_task: ${itCols.length} cols`);
  console.log(`  order_installation: ${oiCols.length} cols`);
  const itName = itCols.find(c => c.name === 'task_name' || c.name === 'name');
  const oiName = oiCols.find(c => c.name === 'task_name' || c.name === 'name');
  console.log(`  installation_task name field: ${itName ? itName.name : 'N/A'}`);
  console.log(`  order_installation name field: ${oiName ? oiName.name : 'N/A'}`);

  await client.end();
  console.log('\nDone.');
}

run().catch(e => { console.error(e.message); process.exit(1); });
