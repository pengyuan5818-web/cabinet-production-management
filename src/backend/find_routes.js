const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = ['purchase.js', 'warehouse.js', 'finance.js', 'quality.js', 'design.js', 'production.js', 'hardware.js', 'alpha.js', 'cost.js', 'dashboard.js', 'report.js'];

for (const file of files) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) { console.log(`${file}: FILE NOT FOUND`); continue; }
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`][^'"`]*['"`]/g) || [];
  console.log(`\n=== ${file} ===`);
  routes.forEach(r => console.log(' ', r));
}
