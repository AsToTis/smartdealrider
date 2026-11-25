const fs = require('fs');

const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let server = fs.readFileSync(serverPath, 'utf8');

const startStr = "app.post('/api/rider/deliveries/:order_id/pickup'";
const endStr = "app.post('/api/rider/deliveries/:order_id/complete'";

const startIdx = server.indexOf(startStr);
const endIdx = server.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const newPickupCode = `app.post('/api/rider/deliveries/:order_id/pickup', upload.single('pickup_image'), async (req, res) => {
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
});

// 6. Rider Complete & Confirm (Complete Delivery)
`;

  server = server.substring(0, startIdx) + newPickupCode + server.substring(endIdx);
  fs.writeFileSync(serverPath, server, 'utf8');
  console.log('✅ Successfully replaced pickup endpoint in server.js');
} else {
  console.log('❌ Could not locate startIdx or endIdx');
}
