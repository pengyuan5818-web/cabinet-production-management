from subprocess import run

r = run(['node', '-e', """
const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'cabinet_factory', user: 'postgres', password: 'postgres' });
pool.query("SELECT tc.table_name, ccu.table_name AS foreign_table_name FROM information_schema.table_constraints AS tc JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' ORDER BY tc.table_name", [], function(err, res) { if (err) console.error(err.message); else console.log(JSON.stringify(res.rows)); pool.end(); });
"""], capture_output=True, timeout=15, shell=True)

print(r.stdout.decode('utf-8', errors='replace'))
print(r.stderr.decode('utf-8', errors='replace')[:200])
