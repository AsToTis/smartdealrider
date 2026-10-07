const fs = require('fs');
const db = require('C:/smartdeal/smart-deal-backend/src/db.js');

async function check() {
  try {
    const serverJs = fs.readFileSync('C:/smartdeal/smart-deal-backend/src/server.js', 'utf8');
    const lines = serverJs.split('\n');

    console.log('=== SEARCHING SERVER.JS ===');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('/rider/jobs') || line.includes('/rider/wallet') || line.includes('/admin/settings') || line.includes('system_settings') || line.includes('delivery_fee')) {
        console.log(`L${i+1}: ${line.trim().slice(0, 100)}`);
      }
    }

    console.log('\n=== DB TABLES & SETTINGS ===');
    const [tables] = await db.query('SHOW TABLES');
    console.log('Tables in DB:', tables.map(t => Object.values(t)[0]));

    for (const t of tables.map(t => Object.values(t)[0])) {
      if (t.includes('setting') || t.includes('config') || t.includes('delivery') || t.includes('admin') || t.includes('fare')) {
        console.log(`\n--- TABLE: ${t} ---`);
        const [rows] = await db.query(`SELECT * FROM ${t}`);
        console.log(rows);
      }
    }

    console.log('\n=== RECENT ORDERS ===');
    const [orders] = await db.query('SELECT order_id, user_id, restaurant_id, total_amount, delivery_fee, status, created_at FROM orders ORDER BY order_id DESC LIMIT 5');
    console.log(orders);

    console.log('\n=== RECENT DELIVERIES ===');
    const [deliveries] = await db.query('SELECT * FROM deliveries ORDER BY delivery_id DESC LIMIT 5');
    console.log(deliveries);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

check();
