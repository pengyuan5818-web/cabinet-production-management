const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/cabinet_factory' });

async function main() {
  // 获取所有表
  const allTables = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const tableSet = new Set(allTables.rows.map(r => r.tablename));
  console.log('=== 数据库所有表 (共', allTables.rows.length, ') ===');
  allTables.rows.forEach(r => console.log(' ', r.tablename));

  // 所有路由文件
  const routesDir = path.join(__dirname, 'src', 'routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  console.log('\n=== 后端路由文件 (共', routeFiles.length, ') ===');
  
  // 路由对应的表（从代码中推断）
  const routeMap = {
    'alpha.js': 'alpha_order',
    'auth.js': null,
    'cost.js': 'order_cost',
    'customer.js': 'customer',
    'dashboard.js': null,
    'dealer-openapi.js': 'dealer',
    'dealer.js': 'dealer',
    'design.js': 'design_drawing',
    'employee.js': 'employee',
    'exchange_rate.js': 'exchange_rates',
    'finance.js': 'receivable,collection_record,invoice',
    'hardware-driver.js': 'hardware_driver',
    'hardware.js': 'hardware',
    'installation.js': 'installation',
    'order.js': 'order_master,order_detail,order_bom',
    'package.js': 'package',
    'payables.js': 'payable',
    'production.js': 'production_flow',
    'purchase.js': 'purchase_order',
    'quality.js': 'quality_inspection',
    'quote.js': 'quote',
    'receivable.js': 'receivable',
    'report.js': null,
    'shipment.js': 'shipment',
    'sort.js': null,
    'supplier.js': 'supplier',
    'system.js': 'system_config',
    'upload.js': null,
    'warehouse.js': 'warehouse',
    'warehouse2.js': null,
  };

  console.log('\n=== 模块 vs 数据库表 ===');
  let missing = [];
  for (const [file, expectedTables] of Object.entries(routeMap)) {
    if (!expectedTables) {
      console.log(`${file}: 无直接表/需运行时检查`);
      continue;
    }
    const tables = expectedTables.split(',');
    const missingTables = tables.filter(t => !tableSet.has(t));
    if (missingTables.length > 0) {
      console.log(`❌ ${file}: 缺失表 ${missingTables.join(', ')}`);
      missing.push(...missingTables);
    } else {
      console.log(`✅ ${file}: 表 ${tables.join(', ')} 存在`);
    }
  }

  console.log('\n=== 缺失的表汇总 ===');
  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length === 0) {
    console.log('无缺失！');
  } else {
    uniqueMissing.forEach(t => console.log(' ❌', t));
  }

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
