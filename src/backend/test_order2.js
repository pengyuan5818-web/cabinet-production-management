const db = require('./src/db');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function randomFloat(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}

async function test() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const custResult = await client.query('SELECT id FROM customer LIMIT 3');
        if (custResult.rows.length === 0) {
            console.log('No customers');
            return;
        }
        
        for (let i = 0; i < custResult.rows.length; i++) {
            const orderId = uuid();
            const totalAmount = randomFloat(15000, 45000);
            const depositAmount = totalAmount * 0.3;
            const balAmt = totalAmount - depositAmount;
            const custId = custResult.rows[i].id;
            
            console.log(`Order ${i}: total=${totalAmount}, deposit=${depositAmount}, balance=${balAmt}, type=${typeof totalAmount}`);
            
            const r = await client.query(
                `INSERT INTO order_master (id, order_no, customer_id, order_status, 
                 total_amount, deposit_amount, balance_amount, expected_delivery, created_at)
                 VALUES ($1, $2, $3, 'producing', $4, $5, $6, CURRENT_DATE + INTERVAL '15 days', NOW())`,
                [orderId, `O${Date.now()}${i}`, custId, totalAmount, depositAmount, balAmt]
            );
            console.log(`  Inserted: ${r.rowCount}`);
        }
        
        await client.query('COMMIT');
        console.log('SUCCESS!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('FAILED:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}
test();
