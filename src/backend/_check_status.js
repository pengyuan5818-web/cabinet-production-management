const db = require('./src/db');
async function main() {
    const r = await db.query("SELECT DISTINCT status FROM door_panel_production UNION ALL SELECT DISTINCT status FROM countertop_production UNION ALL SELECT DISTINCT status FROM production_schedule");
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit();
}
main();
