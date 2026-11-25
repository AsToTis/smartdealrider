const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

const addresses = [
  '55 อาคารสมาร์ททาวเวอร์ ชั้น G ถนนพระราม 4 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร',
  '999/9 ศูนย์การค้าเซ็นทรัลเวิลด์ ชั้น 6 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร',
  '123 ถนนสุขุมวิท ซอย 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร',
  '456 ถนนสีลม แขวงสุริยวงศ์ เขตบางรัก กรุงเทพมหานคร',
  '789 ถนนสาทรใต้ แขวงยานนาวา เขตสาทร กรุงเทพมหานคร',
  '12/34 หมู่บ้านสุขสันต์ ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร',
  '88 อาคารพญาไทพลาซ่า ชั้น 10 ถนนพญาไท แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร',
  '567 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพมหานคร'
];

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'smart_deal_db'
  });

  const [orders] = await conn.query("SELECT order_id FROM orders WHERE shipping_address = 'กทม.' OR shipping_address = 'กทม' OR shipping_address = 'กรุงเทพมหานคร'");
  
  let count = 0;
  for (let order of orders) {
    const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
    await conn.query("UPDATE orders SET shipping_address = ? WHERE order_id = ?", [randomAddress, order.order_id]);
    count++;
  }

  console.log(`Updated ${count} orders with new shipping addresses.`);
  process.exit(0);
}

run();
