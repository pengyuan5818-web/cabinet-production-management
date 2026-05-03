const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
pool.query("SELECT tc.table_name, ccu.table_name AS foreign_table_name FROM information_schema.table_constraints AS tc JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' ORDER BY tc.table_name", [], function(err, res) {
    if (err) { console.error(err.message); pool.end(); return; }
    const rows = res.rows;
    const grouped = {};
    for (const r of rows) {
        if (!grouped[r.table_name]) grouped[r.table_name] = [];
        grouped[r.table_name].push(r.foreign_table_name);
    }
    for (const [tbl, parents] of Object.entries(grouped)) {
        console.log(tbl + ' -> ' + parents.join(', '));
    }
    pool.end();
});
