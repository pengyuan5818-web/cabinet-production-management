const sqlite = require('better-sqlite3');
const dbPath = 'C:/Users/Administrator/Desktop/橱柜工厂管理系统/src/backend/data/cabinet.db';

try {
    const db = new sqlite(dbPath);
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("=== Tables ===");
    tables.forEach(t => console.log(t.name));
    
    try {
        const count = db.prepare("SELECT COUNT(*) as cnt FROM orders").get();
        console.log("\nOrders count:", count.cnt);
    } catch(e) { console.log("orders table error:", e.message); }
    
    try {
        const wl = db.prepare("SELECT * FROM webhook_logs LIMIT 3").all();
        console.log("\nwebhook_logs sample:", JSON.stringify(wl));
    } catch(e) { console.log("webhook_logs error:", e.message); }
    
    try {
        const sh = db.prepare("SELECT * FROM shipments LIMIT 3").all();
        console.log("\nshipments sample:", JSON.stringify(sh));
    } catch(e) { console.log("shipments error:", e.message); }
    
    db.close();
} catch(e) {
    console.error("DB Error:", e.message);
}
