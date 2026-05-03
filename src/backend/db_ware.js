const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres', max: 5 });
pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%ware%' OR table_name LIKE '%location%' OR table_name LIKE '%stock%') ORDER BY table_name`).
  then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); }).
  catch(e => { console.error(e.message); pool.end(); });
