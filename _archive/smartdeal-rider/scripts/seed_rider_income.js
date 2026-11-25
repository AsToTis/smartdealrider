const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    const [riders] = await connection.query("SELECT rider_id FROM riders");
    console.log(`Found ${riders.length} riders.`);

    for (const rider of riders) {
      console.log(`Seeding data for rider ${rider.rider_id}...`);
      
      const ordersData = [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Current month (around 10k-12k baht -> ~600 jobs at 15-20 baht)
      const currentMonthJobs = Math.floor(Math.random() * 100) + 600; // 600-700
      for (let i = 0; i < currentMonthJobs; i++) {
        const fee = Math.floor(Math.random() * 6) + 15; // 15 to 20
        const date = new Date(currentYear, currentMonth, Math.floor(Math.random() * 28) + 1, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        ordersData.push([
          1, 1, 100, fee, 0, 100 + fee, 'completed', 'delivery', 'promptpay',
          'Mock User', '0000000', 'Mock Address', date, date, rider.rider_id, 'paid'
        ]);
      }
      
      // Prev month
      const prevMonthJobs = Math.floor(Math.random() * 100) + 550; // 550-650
      for (let i = 0; i < prevMonthJobs; i++) {
        const fee = Math.floor(Math.random() * 6) + 15; // 15 to 20
        const date = new Date(prevYear, prevMonth, Math.floor(Math.random() * 28) + 1, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        ordersData.push([
          1, 1, 100, fee, 0, 100 + fee, 'completed', 'delivery', 'promptpay',
          'Mock User', '0000000', 'Mock Address', date, date, rider.rider_id, 'paid'
        ]);
      }

      const batchSize = 200;
      for (let b = 0; b < ordersData.length; b += batchSize) {
        const batch = ordersData.slice(b, b + batchSize);
        const [result] = await connection.query(
          `INSERT INTO orders (
            user_id, shop_id, subtotal, delivery_fee, discount, total_amount, order_status, 
            delivery_type, payment_method, receiver_name, receiver_phone, shipping_address, 
            created_at, delivered_at, rider_id, payment_status
          ) VALUES ?`,
          [batch]
        );
        
        const firstInsertId = result.insertId;
        const delivBatch = [];
        for (let j = 0; j < batch.length; j++) {
          const orderId = firstInsertId + j;
          const date = batch[j][12];
          delivBatch.push([orderId, rider.rider_id, 'delivered', date, date]);
        }
        
        await connection.query(
          `INSERT INTO deliveries (order_id, rider_id, status, assigned_at, completed_at) VALUES ?`,
          [delivBatch]
        );
      }
      
      // Ensure wallet exists
      const [wallet] = await connection.query("SELECT * FROM rider_wallets WHERE rider_id = ?", [rider.rider_id]);
      const balance = Math.floor(Math.random() * 2000) + 10000;
      if (wallet.length > 0) {
        await connection.query("UPDATE rider_wallets SET balance = ? WHERE rider_id = ?", [balance, rider.rider_id]);
      } else {
        await connection.query("INSERT INTO rider_wallets (rider_id, balance) VALUES (?, ?)", [rider.rider_id, balance]);
      }
    }
    
    console.log("Seeding complete!");

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

run();
