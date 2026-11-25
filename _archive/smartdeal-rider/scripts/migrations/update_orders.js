const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'smart_deal_db'
  });

  const [res] = await conn.query("UPDATE orders SET order_status = 'finding_rider' WHERE order_status = 'preparing'");
  console.log(res);
  process.exit(0);
}

run();
