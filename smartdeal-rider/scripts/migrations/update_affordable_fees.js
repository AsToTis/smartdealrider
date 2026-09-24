const fs = require('fs');
const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function updateAll() {
  // 1. Patch server.js
  let serverCode = fs.readFileSync('C:/smartdeal/server.js', 'utf8');
  
  const oldOrderInsert = `        subtotal || 0,
        delivery_fee || 0,
        discount || 0,`;

  const newOrderInsert = `        subtotal || 0,
        delivery_type === 'delivery' ? (parseFloat(delivery_fee) > 0 ? parseFloat(delivery_fee) : 15.00) : 0,
        discount || 0,`;

  if (serverCode.includes(oldOrderInsert)) {
    serverCode = serverCode.replace(oldOrderInsert, newOrderInsert);
    fs.writeFileSync('C:/smartdeal/server.js', serverCode, 'utf8');
    console.log('✅ Patched server.js default delivery fee');
  }

  // 2. Update Database orders to affordable fees (฿15 - ฿25)
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    await connection.execute(`UPDATE orders SET delivery_fee = 15.00 WHERE order_id = 51`);
    await connection.execute(`UPDATE orders SET delivery_fee = 20.00 WHERE order_id = 52`);
    await connection.execute(`UPDATE orders SET delivery_fee = 15.00 WHERE order_id = 53`);
    await connection.execute(`UPDATE orders SET delivery_fee = 20.00 WHERE order_id = 54`);
    console.log('✅ Updated database delivery fees to affordable rates (฿15.00 - ฿20.00)');
  } catch (e) {
    console.error('DB Error:', e);
  } finally {
    await connection.end();
  }
}

updateAll();
