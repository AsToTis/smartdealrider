const fs = require('fs');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

const regex = /app\.post\('\/api\/rider\/deliveries\/:order_id\/complete'[\s\S]*?res\.json\(\{\s*success:\s*true,\s*message:\s*'ยืนยันการจัดส่งสำเร็จ'\s*\}\);[\s\S]*?\}\);/;

const replacement = `app.post('/api/rider/deliveries/:order_id/complete', upload.single('proof_image'), async (req, res) => {
  const orderId = req.params.order_id;
  const { rider_id, proof_image_base64 } = req.body;
  const proof_image = req.file ? \`/uploads/\${req.file.filename}\` : (proof_image_base64 || req.body.proof_image || '');

  try {
    await db.query(
      'UPDATE deliveries SET status = "delivered", proof_image = ?, completed_at = NOW() WHERE order_id = ? AND rider_id = ?',
      [proof_image, orderId, rider_id]
    );

    await db.query('UPDATE orders SET order_status = "delivered", delivered_at = CURRENT_TIMESTAMP WHERE order_id = ?', [orderId]);

    // Auto post separate dropoff proof messages & photos to Buyer and Shop
    try {
      // 1. ส่งรูปหลักฐานเข้าช่องแชทลูกค้าเพื่อให้ตรวจสอบและกดยืนยันรับของ
      await db.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "buyer", ?, ?)',
        [orderId, rider_id, '📸 [ส่งมอบสินค้าแล้ว] ไรเดอร์ได้นำส่งสินค้าถึงจุดส่งเรียบร้อยแล้ว รบกวนตรวจสอบและกดยืนยันการรับสินค้าในระบบครับ', proof_image || null]
      );

      // 2. ส่งรูปหลักฐานเข้าช่องแชทร้านค้าเพื่อแจ้งว่าสินค้าส่งถึงลูกค้าแล้ว
      await db.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "seller", ?, ?)',
        [orderId, rider_id, '🎉 [ส่งมอบถึงลูกค้าแล้ว] ไรเดอร์จัดส่งสินค้าถึงมือลูกค้าเรียบร้อยแล้วครับ', proof_image || null]
      );
    } catch(e) {
      console.error('Error auto-posting dropoff proof to chat:', e);
    }

    res.json({ success: true, message: 'ยืนยันการจัดส่งสำเร็จ' });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  }
});`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log('✅ Successfully patched /api/rider/deliveries/:order_id/complete in server.js');
} else {
  console.log('❌ Regex did not match');
}
