const db = require('./src/db');

async function test() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Get a customer id
        const cust = await client.query('SELECT id FROM customer LIMIT 1');
        if (cust.rows.length === 0) {
            console.log('No customers found');
            return;
        }
        const custId = cust.rows[0].id;
        
        // Test simple insert
        const orderId = 'a0000000-0000-0000-0000-000000000001';
        const total = 25000.50;
        const deposit = 7500.15;
        const balance = 17499.35;
        
        console.log('Testing with:', { orderId, custId, total, deposit, balance });
        
        const r = await client.query(
            `INSERT INTO order_master (id, order_no, customer_id, order_status, 
             total_amount, deposit_amount, balance_amount, expected_delivery, created_at)
             VALUES ($1::uuid, $2, $3::uuid, 'producing', $4::numeric, $5::numeric, $6::numeric, CURRENT_DATE + INTERVAL '15 days', NOW())`,
            [orderId, 'TEST001', custId, total, deposit, balance]
        );
        console.log('Insert result:', r);
        
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
