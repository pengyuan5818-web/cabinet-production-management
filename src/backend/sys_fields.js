// 字段一致性检查 - 核心金额表
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'cabinet_factory',
  user: 'postgres',
  password: 'postgres'
});

async function getColumns(table) {
  try {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [table]);
    return res.rows.map(r => ({ name: r.column_name, type: r.data_type, nullable: r.is_nullable, default: r.column_default }));
  } catch (e) {
    return [{ name: 'ERROR', type: e.message }];
  }
}

async function check() {
  await client.connect();
  console.log('Connected to DB\n');

  // 1. 多币种字段检查
  console.log('=== 多币种字段检查 ===');
  const currencyTables = [
    'order_master', 'order_detail', 'receivable', 'payable', 
    'collection_record', 'payment_record', 'invoice',
    'fund_flow', 'stock_in', 'stock_out'
  ];
  for (const tbl of currencyTables) {
    const cols = await getColumns(tbl);
    const hasCurrency = cols.some(c => c.name === 'currency');
    const hasCNY = cols.filter(c => c.name.endsWith('_cny')).map(c => c.name);
    const status = hasCurrency ? 'OK' : 'MISSING_currency';
    console.log(`  [${status}] ${tbl}: currency=${hasCurrency}, _cny=${hasCNY.length > 0 ? hasCNY.join(',') : 'none'}`);
  }

  // 2. 金额字段类型检查
  console.log('\n=== 金额字段类型检查 ===');
  const moneyTables = ['order_master', 'order_detail', 'receivable', 'payable', 'fund_flow', 'invoice'];
  for (const tbl of moneyTables) {
    const cols = await getColumns(tbl);
    const moneyCols = cols.filter(c => 
      ['amount', 'price', 'total', 'balance', 'deposit', 'fee', 'cost', 'payment', 'receivable', 'payable'].some(k => c.name.includes(k))
      && c.type !== 'USER-DEFINED'
    );
    const bad = moneyCols.filter(c => !['numeric','decimal','double precision'].includes(c.type));
    console.log(`\n  [${tbl}]`);
    for (const c of moneyCols) {
      const ok = ['numeric','decimal','double precision'].includes(c.type);
      console.log(`    ${ok ? 'OK' : 'BAD'} ${c.name}: ${c.type}`);
    }
  }

  // 3. 外键约束检查（主要表）
  console.log('\n=== 外键约束检查 ===');
  const fkRes = await client.query(`
    SELECT conname, conrelid::regclass AS table_from, confrelid::regclass AS table_to, pg_get_constraintdef(oid)
    FROM pg_constraint WHERE contype = 'f' ORDER BY conrelid::text
  `);
  console.log(`  Total FK constraints: ${fkRes.rows.length}`);
  for (const r of fkRes.rows.slice(0, 30)) {
    console.log(`  ${r.table_from} -> ${r.table_to} (${r.conname})`);
  }

  // 4. ENUM 类型检查
  console.log('\n=== ENUM 类型列表 ===');
  const enumRes = await client.query(`SELECT typname, string_agg(enumlabel, ', ') as labels FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY typname`);
  for (const r of enumRes.rows) {
    console.log(`  ${r.typname}: ${r.labels}`);
  }

  // 5. 主要表的时间/审计字段一致性
  console.log('\n=== 时间/审计字段一致性 ===');
  const keyTables = ['order_master', 'employee', 'customer', 'dealer', 'supplier', 'production_schedule'];
  for (const tbl of keyTables) {
    const cols = await getColumns(tbl);
    const timeCols = cols.filter(c => ['created_at','updated_at','create_time','update_time','create_date'].includes(c.name));
    console.log(`  [${tbl}]: ${timeCols.map(c => c.name).join(', ') || 'NO_TIME_COLUMNS'}`);
  }

  // 6. 外键引用 order_master 情况
  console.log('\n=== 引用 order_master 的外键 ===');
  const omFks = fkRes.rows.filter(r => r.table_to === 'order_master');
  console.log(`  Count: ${omFks.length}`);
  for (const r of omFks) {
    console.log(`  ${r.table_from} -> order_master (${r.conname})`);
  }

  // 7. 检查 cabinet_board length/width 类型
  console.log('\n=== cabinet_board length/width 类型 ===');
  const cbCols = await getColumns('cabinet_board');
  for (const c of cbCols) {
    if (['length','width','height','thickness'].includes(c.name)) {
      console.log(`  ${c.name}: ${c.type}`);
    }
  }

  // 8. 检查缺失的表
  console.log('\n=== 缺失表: evaluation_date ===');
  const evalRes = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name='evaluation_date' AND table_schema='public'`);
  console.log(`  evaluation_date exists: ${evalRes.rows.length > 0}`);

  await client.end();
  console.log('\nDone.');
}

check().catch(e => { console.error(e); process.exit(1); });
