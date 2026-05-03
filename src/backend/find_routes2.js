const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'src', 'routes', 'hardware-driver.js'), 'utf8');
const routes = content.match(/router\.(get|post|put|delete)\s*\(\s*['"`][^'"`]*['"`]/g) || [];
console.log('hardware-driver.js routes:');
routes.forEach(r => console.log(' ', r));

// Also check index.js mount point
const indexContent = fs.readFileSync(path.join(__dirname, 'src', 'index.js'), 'utf8');
const mountPoint = indexContent.match(/hardware.*require.*hardware-driver/);
console.log('\nMount point:', mountPoint);
