const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employee' ORDER BY ordinal_position", [], function(err, res) {
    if (err) { console.error(err.message); pool.end(); return; }
    console.log('employee:', JSON.stringify(res.rows.map(r => r.column_name)));
    pool.end();
});
