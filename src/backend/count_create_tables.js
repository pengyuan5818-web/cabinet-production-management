const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/Desktop/橱柜工厂管理系统/scripts/init_database.sql', 'utf8');
const matches = content.match(/CREATE TABLE IF NOT EXISTS \w+/g);
console.log('CREATE TABLE count:', matches ? matches.length : 0);
if (matches) {
  console.log('Tables:');
  matches.forEach((m, i) => {
    const tableName = m.replace('CREATE TABLE IF NOT EXISTS ', '');
    console.log((i+1) + '. ' + tableName);
  });
}
