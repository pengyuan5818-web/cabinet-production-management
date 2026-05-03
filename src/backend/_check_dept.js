const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'department' ORDER BY ordinal_position", [], function(err, res) {
    if (err) { console.error(err.message); pool.end(); return; }
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
});
