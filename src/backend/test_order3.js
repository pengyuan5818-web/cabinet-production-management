const db = require('./src/db');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
            const balAmt = Number((totalAmount - depositAmount).toFixed(2));
            const custId = custResult.rows[i].id;
            
            console.log(`Order ${i}: total=${totalAmount} (${typeof totalAmount}), deposit=${depositAmount}, balance=${balAmt}`);
            
            // Order master
            const r1 = await client.query(
                `INSERT INTO order_master (id, order_no, customer_id, order_status, 
                 total_amount, deposit_amount, balance_amount, expected_delivery, created_at)
                 VALUES ($1, $2, $3, 'producing', $4, $5, $6, CURRENT_DATE + INTERVAL '15 days', NOW())`,
                [orderId, `O${Date.now()}${i}`, custId, totalAmount, depositAmount, balAmt]
            );
            console.log(`  Master inserted: ${r1.rowCount}`);
            
            // Order detail
            const cabinetCount = randomInt(2, 5);
            for (let j = 0; j < cabinetCount; j++) {
                const unitPrice = randomFloat(2000, 5000);
                const qty = randomInt(1, 3);
                const amount = Number((unitPrice * qty).toFixed(2));
                
                const r2 = await client.query(
                    `INSERT INTO order_detail (id, order_id, product_name, product_type, cabinet_count, 
                     material, color, length, width, height, unit_price, quantity, amount)
                     VALUES ($1, $2, $3, '橱柜', $4::int, '不锈钢', '银色', 1000::int, 600::int, 2000::int, $5::numeric, $6::int, $7::numeric)`,
                    [uuid(), orderId, `橱柜${j + 1}`, randomInt(1, 3), unitPrice, qty, amount]
                );
                console.log(`  Detail ${j} inserted: ${r2.rowCount}`);
            }
        }
        
        await client.query('COMMIT');
        console.log('SUCCESS!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('FAILED:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        client.release();
        process.exit();
    }
}
test();
