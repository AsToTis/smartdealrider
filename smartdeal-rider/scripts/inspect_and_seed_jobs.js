const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    console.log('--- TABLES ---');
    const [tables] = await connection.query("SHOW TABLES");
    console.log(tables);

    console.log('\n--- DESCRIBE orders ---');
    try {
      const [descOrders] = await connection.query("DESCRIBE orders");
      console.log(descOrders.map(c => `${c.Field} (${c.Type})`));
    } catch(e) { console.log(e.message); }

    console.log('\n--- DESCRIBE deliveries ---');
    try {
      const [descDel] = await connection.query("DESCRIBE deliveries");
      console.log(descDel.map(c => `${c.Field} (${c.Type})`));
    } catch(e) { console.log(e.message); }

    console.log('\n--- EXISTING ORDERS RECENT ---');
    const [orders] = await connection.query("SELECT * FROM orders ORDER BY order_id DESC LIMIT 5");
    console.log(orders);

    console.log('\n--- EXISTING DELIVERIES ---');
    const [deliveries] = await connection.query("SELECT * FROM deliveries ORDER BY delivery_id DESC LIMIT 5");
    console.log(deliveries);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

run();
