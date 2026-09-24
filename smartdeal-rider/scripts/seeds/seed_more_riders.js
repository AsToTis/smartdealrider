const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    console.log('Connected to DB');

    // Images
    const idCardImg = 'https://images.unsplash.com/photo-1621252179027-94459d278660?q=80&w=600&auto=format&fit=crop';
    const vehicleImg = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600&auto=format&fit=crop';
    const licenseImg = 'https://images.unsplash.com/photo-1563260797-cb9cd70254c8?q=80&w=600&auto=format&fit=crop';

    // 1. Update existing rider 5
    await conn.query(`
      UPDATE riders 
      SET id_card_image = ?, vehicle_doc_image = ?, license_image = ? 
      WHERE rider_id = 5
    `, [idCardImg, vehicleImg, licenseImg]);
    console.log('Updated Rider #5 images');

    // 2. Insert 4 new users and riders
    const newRidersData = [
      { name: 'สมชาย ขยันส่ง', phone: '081' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'), status: 'approved', vehicle_type: 'Motorcycle', plate: 'กทม 111', rider_status: 'offline' },
      { name: 'วิชัย สายซิ่ง', phone: '082' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'), status: 'approved', vehicle_type: 'Motorcycle', plate: 'ชบ 222', rider_status: 'online' },
      { name: 'มานะ อดทน', phone: '083' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'), status: 'pending', vehicle_type: 'Motorcycle', plate: 'ชม 333', rider_status: 'offline' },
      { name: 'ปิติ ดีเสมอ', phone: '084' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'), status: 'pending', vehicle_type: 'Motorcycle', plate: 'นบ 444', rider_status: 'offline' }
    ];

    let insertedRiders = [];

    for (let i = 0; i < newRidersData.length; i++) {
      const data = newRidersData[i];
      const email = `rider_new_${Date.now()}_${i}@test.com`;
      
      const [userRes] = await conn.query(`
        INSERT INTO users (email, phone, password_hash, full_name, role, status)
        VALUES (?, ?, 'hashed_pass', ?, 'driver', 'active')
      `, [email, data.phone, data.name]);
      const userId = userRes.insertId;

      const [riderRes] = await conn.query(`
        INSERT INTO riders (user_id, vehicle_type, license_plate, rider_status, name, phone, real_name, status, id_card_image, vehicle_doc_image, license_image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, data.vehicle_type, data.plate, data.rider_status, data.name, data.phone, data.name, data.status, idCardImg, vehicleImg, licenseImg]);
      
      insertedRiders.push(riderRes.insertId);
      console.log(`Inserted Rider ${data.name} (ID: ${riderRes.insertId})`);
    }

    // 3. Create dummy orders and reviews for Rider #5 and the first new approved rider
    const [buyerRes] = await conn.query("SELECT user_id FROM users WHERE role='buyer' LIMIT 1");
    const buyerId = buyerRes.length > 0 ? buyerRes[0].user_id : 1;
    
    const [shopRes] = await conn.query("SELECT shop_id FROM shops LIMIT 1");
    const shopId = shopRes.length > 0 ? shopRes[0].shop_id : 1;

    const reviewTargets = [5, insertedRiders[0], insertedRiders[1]]; // Rider 5, Somchai, Wichai
    const mockReviews = [
      { rating: 5, comment: 'ส่งไวมากครับ บริการดีเยี่ยม' },
      { rating: 4, comment: 'สุภาพเรียบร้อย แต่หลงทางนิดหน่อย' },
      { rating: 5, comment: 'ยอดเยี่ยมครับ รวดเร็วทันใจ' }
    ];

    for (let i = 0; i < reviewTargets.length; i++) {
      const riderId = reviewTargets[i];
      
      // create 2 orders per rider
      for (let j = 0; j < 2; j++) {
        const [orderRes] = await conn.query(`
          INSERT INTO orders (user_id, shop_id, total_amount, order_status, rider_id, delivery_fee, delivery_type)
          VALUES (?, ?, 150.00, 'delivered', ?, 15.00, 'delivery')
        `, [buyerId, shopId, riderId]);
        const orderId = orderRes.insertId;

        // add delivery
        await conn.query(`
          INSERT INTO deliveries (order_id, rider_id, status, assigned_at, completed_at)
          VALUES (?, ?, 'delivered', NOW() - INTERVAL 1 HOUR, NOW())
        `, [orderId, riderId]);

        // add review
        const review = mockReviews[(i + j) % mockReviews.length];
        await conn.query(`
          INSERT INTO reviews (order_id, user_id, shop_id, rating, comment)
          VALUES (?, ?, ?, ?, ?)
        `, [orderId, buyerId, shopId, review.rating, review.comment]);
        
        console.log(`Added Order #${orderId} and Review for Rider #${riderId}`);
      }
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seed();
