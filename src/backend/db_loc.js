const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres', max: 5 });
pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'warehouse_location' ORDER BY ordinal_position`).
  then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); }).
  catch(e => { console.error(e.message); pool.end(); });
