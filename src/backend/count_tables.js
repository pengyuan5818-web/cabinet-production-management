const db = require('./src/db');
db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name").then(r=>{
  console.log('Total tables:', r.rows.length);
  r.rows.forEach(t => console.log(t.table_name));
  db.pool.end();
});
