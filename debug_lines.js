const fs = require('fs');
const path = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/src/routes/order.js';

let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

console.log('Total lines:', lines.length);
console.log('Line 115 (0-idx 114):', JSON.stringify(lines[114]));
console.log('Line 116 (0-idx 115):', JSON.stringify(lines[115]));
console.log('Line 117 (0-idx 116):', JSON.stringify(lines[116]));

// Check for broken pattern
const l115 = lines[114];
const l116 = lines[115];

console.log('\nl115 === "    c"?', l115 === '    c');
console.log('l115 includes "SELECT"?', l115 && l115.includes('SELECT'));
console.log('l116 starts with backtick?', l116 && l116.trim().startsWith('`SELECT'));
