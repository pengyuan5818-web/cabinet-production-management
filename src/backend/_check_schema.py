const { Pool } = require("pg");
const pool = new Pool({host:"localhost", port:5432, database:"cabinet_factory", user:"postgres", password:"postgres"});
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", ["door_panel_production"]).then(r => { console.log(JSON.stringify(r.rows)); pool.end(); }).catch(e => console.error(e.message));
