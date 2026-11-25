const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    const [descShops] = await connection.query("DESCRIBE shops");
    console.log('shops columns:', descShops.map(c => c.Field));

    const [shops] = await connection.query("SELECT * FROM shops LIMIT 5");
    console.log('shops:', shops);

    const [riders] = await connection.query("SELECT * FROM riders");
    console.log('riders:', riders);

    const [users] = await connection.query("SELECT user_id, full_name, email, phone FROM users LIMIT 5");
    console.log('users:', users);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

check();
