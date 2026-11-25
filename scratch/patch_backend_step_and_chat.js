const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== Step 1: Patching Backend server.js ===');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let server = fs.readFileSync(serverPath, 'utf8');

// 1.1 Update pickup endpoint in server.js to validate that order_status is 'ready'
const oldPickupEndpointRegex = /app\.post\('\/api\/rider\/deliveries\/:order_id\/pickup'[\s\S]*?res\.json\(\{\s*success:\s*true,\s*message:\s*'ยืนยันการรับสินค้าสำเร็จ'\s*\}\);[\s\S]*?\}\);/;

const newPickupEndpoint = `app.post('/api/rider/deliveries/:order_id/pickup', upload.single('pickup_image'), async (req, res) => {
  const orderId = req.params.order_id;
  const { rider_id, pickup_proof_image } = req.body;
  const uploadedImage = req.file ? \`/uploads/\${req.file.filename}\` : (pickup_proof_image || '');

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 🔒 ตรวจสอบว่าร้านค้ากดยืนยันพร้อมส่งสินค้าแล้วหรือยัง (Step 1 -> Step 2)
    const [orderRows] = await connection.query('SELECT order_status FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคำสั่งซื้อ' });
    }

    const currentOrderStatus = orderRows[0].order_status;
    if (currentOrderStatus !== 'ready' && currentOrderStatus !== 'delivering') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'ร้านค้ายังเตรียมสินค้าไม่เสร็จ หรือยังไม่ได้กดยืนยันพร้อมส่งสินค้า กรุณารอสักครู่' 
      });
    }

    await connection.query(
      'UPDATE deliveries SET status = "delivering", pickup_proof_image = ?, pickup_at = NOW() WHERE order_id = ? AND rider_id = ?',
      [uploadedImage, orderId, rider_id]
    );

    await connection.query(
      'UPDATE orders SET order_status = "delivering" WHERE order_id = ?',
      [orderId]
    );

    // Auto post separate chat messages & photos to Shop and Buyer
    try {
      // 1. ส่งรูปและแจ้งเตือนเข้าช่องแชทร้านค้า
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "seller", ?, ?)',
        [orderId, rider_id, '🛵 [ยืนยันรับสินค้าแล้ว] ไรเดอร์ได้รับสินค้าจากทางร้านเรียบร้อยแล้ว กำลังเดินทางไปส่งลูกค้าครับ', uploadedImage || null]
      );

      // 2. ส่งรูปและแจ้งเตือนเข้าช่องแชทลูกค้า
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "buyer", ?, ?)',
        [orderId, rider_id, '🍱 [ร้านเตรียมสินค้าเสร็จแล้ว] ไรเดอร์รับสินค้าจากร้านค้าเรียบร้อยแล้ว กำลังเดินทางไปส่งให้คุณครับ', uploadedImage || null]
      );
    } catch(e) {
      console.error('Error auto-posting pickup proof to chat:', e);
    }

    await connection.commit();
    res.json({ success: true, message: 'ยืนยันการรับสินค้าสำเร็จ' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Pickup error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  } finally {
    if (connection) connection.release();
  }
});`;

if (oldPickupEndpointRegex.test(server)) {
  server = server.replace(oldPickupEndpointRegex, newPickupEndpoint);
  console.log('✅ Updated /api/rider/deliveries/:order_id/pickup with ready validation');
} else {
  console.log('⚠️ Warning: pickup endpoint regex did not match');
}

// 1.2 Update GET /api/orders/:order_id/messages with strict zero-cross leakage
const getMessagesRegex = /app\.get\('\/api\/orders\/:order_id\/messages'[\s\S]*?res\.json\(\{\s*success:\s*true,\s*messages\s*\}\);[\s\S]*?\}\);/;

const newGetMessagesEndpoint = `app.get('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  const target = req.query.target || req.query.channel; // 'seller' or 'buyer'
  try {
    let query = 'SELECT id, order_id, sender_id, sender_type, receiver_type, message, image_url, created_at FROM order_messages WHERE order_id = ?';
    const params = [orderId];

    // แยกช่องทางแชทอย่างเด็ดขาด 100% ไม่ปะปนกัน
    if (target === 'seller') {
      // ช่องทางร้านค้า ↔ ไรเดอร์ (แสดงเฉพาะข้อความระหว่างร้านค้ากับไรเดอร์เท่านั้น)
      query += ' AND ((sender_type = "seller" AND receiver_type != "buyer") OR (sender_type = "rider" AND receiver_type = "seller") OR (receiver_type = "seller" AND sender_type != "buyer"))';
    } else if (target === 'buyer' || target === 'rider') {
      // ช่องทางลูกค้า ↔ ไรเดอร์ (แสดงเฉพาะข้อความระหว่างลูกค้ากับไรเดอร์เท่านั้น)
      query += ' AND ((sender_type = "buyer" AND receiver_type != "seller") OR (sender_type = "rider" AND receiver_type IN ("buyer", "rider", "all")) OR (receiver_type = "buyer" AND sender_type != "seller"))';
    }

    query += ' ORDER BY created_at ASC';

    const [messages] = await db.query(query, params);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});`;

if (getMessagesRegex.test(server)) {
  server = server.replace(getMessagesRegex, newGetMessagesEndpoint);
  console.log('✅ Updated GET /api/orders/:order_id/messages with zero-cross leakage');
}

fs.writeFileSync(serverPath, server, 'utf8');

console.log('=== Backend changes completed successfully ===');
