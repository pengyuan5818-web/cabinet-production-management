const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres', max: 5 });
pool.query(`SELECT w.id, w.warehouse_name, w.warehouse_type, wl.id as loc_id, wl.location_code, wl.location_name, wl.zone, wl.status
FROM warehouse w LEFT JOIN warehouse_location wl ON w.id = wl.warehouse_id ORDER BY w.warehouse_name, wl.location_code`).
  then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); }).
  catch(e => { console.error(e.message); pool.end(); });
