const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    const [del50] = await connection.query("SELECT * FROM deliveries WHERE order_id = 50");
    console.log('deliveries for order 50:', del50);

    const [allDel] = await connection.query("SELECT * FROM deliveries ORDER BY id DESC LIMIT 10");
    console.log('all deliveries:', allDel);

    const [shops] = await connection.query("SELECT shop_id, shop_name, address, latitude, longitude FROM shops");
    console.log('shops:', shops);

    const [riders] = await connection.query("SELECT * FROM riders");
    console.log('riders:', riders);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

check();
