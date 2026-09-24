const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function seedFreshJobs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    console.log('--- Cleaning up orphan/inconsistent delivery states ---');
    // Ensure shop addresses and approved status
    await connection.execute(`
      UPDATE shops 
      SET address = '123/45 ถนนสุขุมวิท 21 อโศก แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110', 
          status = 'approved',
          latitude = 13.738260,
          longitude = 100.560140
      WHERE shop_id = 1
    `);

    await connection.execute(`
      UPDATE shops 
      SET address = '88/1 ถนนสุขุมวิท 55 (ทองหล่อ) แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110', 
          status = 'approved',
          latitude = 13.731450,
          longitude = 100.581290
      WHERE shop_id = 2
    `);

    await connection.execute(`
      UPDATE shops 
      SET address = '55 อาคารสมาร์ททาวเวอร์ ชั้น G ถนนพระราม 4 เขตคลองเตย กรุงเทพฯ 10110', 
          status = 'approved',
          latitude = 13.725109,
          longitude = 100.569109
      WHERE shop_id = 3
    `);

    await connection.execute(`
      UPDATE shops 
      SET address = '999/9 ศูนย์การค้าเซ็นทรัลเวิลด์ ชั้น 6 ถนนพระราม 1 เขตปทุมวัน กรุงเทพฯ 10330', 
          status = 'approved',
          latitude = 13.746970,
          longitude = 100.539360
      WHERE shop_id = 4
    `);

    // Clean up old completed/accepted test deliveries that conflicted
    await connection.execute(`UPDATE orders SET order_status = 'delivered' WHERE order_id IN (44, 50)`);

    console.log('--- Inserting Fresh Ready Delivery Orders ---');

    const testOrders = [
      {
        user_id: 2,
        shop_id: 1, // Zen Japanese Restaurant
        subtotal: 320.00,
        delivery_fee: 45.00,
        discount: 0.00,
        total_amount: 365.00,
        order_status: 'ready',
        delivery_type: 'delivery',
        payment_method: 'promptpay',
        receiver_name: 'คุณสมชาย ใจดี',
        receiver_phone: '0812345678',
        shipping_address: 'คอนโด Rhythm อโศก ชั้น 18 ห้อง 1804 ถนนอโศก-ดินแดง แขวงมักกะสัน เขตราชเทวี กรุงเทพฯ 10400',
        latitude: 13.754120,
        longitude: 100.564280,
        note_for_rider: 'ฝากไว้ที่ล็อบบี้ชั้น 1 โทรแจ้งเมื่อถึง',
        order_type: 'normal'
      },
      {
        user_id: 1,
        shop_id: 2, // Paul's French Bakery
        subtotal: 280.00,
        delivery_fee: 55.00,
        discount: 20.00,
        total_amount: 315.00,
        order_status: 'ready',
        delivery_type: 'delivery',
        payment_method: 'promptpay',
        receiver_name: 'คุณอรวรรณ รักษ์เจริญ',
        receiver_phone: '0891234567',
        shipping_address: 'อาคาร Interchange 21 ชั้น 25 ถนนสุขุมวิท เขตวัฒนา กรุงเทพฯ 10110',
        latitude: 13.737110,
        longitude: 100.561230,
        note_for_rider: 'ระวังขนมเค้กกล่องคว่ำ ขอบคุณครับ',
        order_type: 'normal'
      },
      {
        user_id: 2,
        shop_id: 3, // 30 Healthy Food
        subtotal: 195.00,
        delivery_fee: 40.00,
        discount: 0.00,
        total_amount: 235.00,
        order_status: 'ready',
        delivery_type: 'delivery',
        payment_method: 'promptpay',
        receiver_name: 'คุณยุติธรรม ปั่นกลาง',
        receiver_phone: '0647151855',
        shipping_address: 'ลาวัณย์ปาร์ควิลล์ 577 ตึก A ห้อง 302 ตำบลท่าขอนยาง อำเภอกันทรวิชัย มหาสารคาม 44150',
        latitude: 16.246826,
        longitude: 103.251992,
        note_for_rider: 'วางไว้หน้าห้องได้เลยครับ',
        order_type: 'normal'
      },
      {
        user_id: 1,
        shop_id: 4, // Sushiro Central World
        subtotal: 450.00,
        delivery_fee: 65.00,
        discount: 50.00,
        total_amount: 465.00,
        order_status: 'ready',
        delivery_type: 'delivery',
        payment_method: 'promptpay',
        receiver_name: 'คุณณัฐพล วงศ์สว่าง',
        receiver_phone: '0845556789',
        shipping_address: 'หมู่บ้านพาร์ควิลล์ ซอย 4 บ้านเลขที่ 124/8 แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
        latitude: 13.719830,
        longitude: 100.575410,
        note_for_rider: 'แยกน้ำจิ้มและวาซาบิไว้ให้ด้วยครับ',
        order_type: 'normal'
      }
    ];

    for (const order of testOrders) {
      const [res] = await connection.execute(`
        INSERT INTO orders (
          user_id, shop_id, subtotal, delivery_fee, discount, total_amount,
          order_status, delivery_type, payment_method, receiver_name, receiver_phone,
          shipping_address, latitude, longitude, note_for_rider, order_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        order.user_id,
        order.shop_id,
        order.subtotal,
        order.delivery_fee,
        order.discount,
        order.total_amount,
        order.order_status,
        order.delivery_type,
        order.payment_method,
        order.receiver_name,
        order.receiver_phone,
        order.shipping_address,
        order.latitude,
        order.longitude,
        order.note_for_rider,
        order.order_type
      ]);
      console.log(`✅ เพิ่มออเดอร์ใหม่สำเร็จ Order ID #${res.insertId} (${order.receiver_name} - ค่าส่ง ฿${order.delivery_fee})`);
    }

    console.log('\n🎉 ข้อมูลออเดอร์ใหม่พร้อมสำหรับการทดสอบรับงานในแอพไรเดอร์แล้ว!');

  } catch (err) {
    console.error('❌ Error seeding jobs:', err);
  } finally {
    await connection.end();
  }
}

seedFreshJobs();
