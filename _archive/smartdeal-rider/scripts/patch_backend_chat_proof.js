const fs = require('fs');

console.log('=== PATCHING BACKEND CHAT & SEQUENTIAL PROOF SYSTEM ===');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Ensure Table Schema Updates for order_messages and deliveries
const schemaUpdates = `
// Initialize & update order_messages and deliveries columns
const initExtendedChatAndProofTables = async () => {
  try {
    // 1. order_messages table
    await db.execute(\`
      CREATE TABLE IF NOT EXISTS order_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_type VARCHAR(50) NOT NULL,
        receiver_type VARCHAR(50) DEFAULT 'all',
        message TEXT NULL,
        image_url LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
    try { await db.execute('ALTER TABLE order_messages MODIFY sender_type VARCHAR(50)'); } catch(e) {}
    try { await db.execute('ALTER TABLE order_messages ADD COLUMN receiver_type VARCHAR(50) DEFAULT "all"'); } catch(e) {}
    try { await db.execute('ALTER TABLE order_messages ADD COLUMN image_url LONGTEXT NULL'); } catch(e) {}

    // 2. deliveries table proof columns
    try { await db.execute('ALTER TABLE deliveries ADD COLUMN pickup_proof_image LONGTEXT NULL'); } catch(e) {}
    try { await db.execute('ALTER TABLE deliveries MODIFY proof_image LONGTEXT NULL'); } catch(e) {}
    try { await db.execute('ALTER TABLE deliveries ADD COLUMN pickup_at DATETIME NULL'); } catch(e) {}
    console.log('✅ Extended chat and proof tables initialized successfully');
  } catch (err) {
    console.error('Table init error:', err.message);
  }
};
initExtendedChatAndProofTables();
`;

if (!content.includes('initExtendedChatAndProofTables')) {
  content = content.replace('initOrderMessagesTable();', 'initOrderMessagesTable();\n' + schemaUpdates);
  console.log('✅ Added initExtendedChatAndProofTables to server.js');
}

// 2. Update /api/orders/:order_id/messages GET & POST
const oldChatRoutes = `// ==========================================
// ORDER CHAT APIs
// ==========================================
app.get('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  try {
    const [messages] = await db.query(
      'SELECT * FROM order_messages WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});

app.post('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  const { sender_id, sender_type, message } = req.body;
  
  if (!sender_id || !sender_type || !message) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }
  
  try {
    const [result] = await db.query(
      'INSERT INTO order_messages (order_id, sender_id, sender_type, message) VALUES (?, ?, ?, ?)',
      [orderId, sender_id, sender_type, message]
    );
    res.json({ success: true, message: 'ส่งข้อความสำเร็จ', message_id: result.insertId });
  } catch (error) {
    console.error('Error sending order message:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถส่งข้อความได้' });
  }
});`;

const newChatRoutes = `// ==========================================
// ORDER CHAT APIs (Support Buyer, Seller, Rider & Photo Messages)
// ==========================================
app.get('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  try {
    const [messages] = await db.query(
      'SELECT id, order_id, sender_id, sender_type, receiver_type, message, image_url, created_at FROM order_messages WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});

app.post('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  const { sender_id, sender_type, receiver_type, message, image_url } = req.body;
  
  if (!sender_id || !sender_type || (!message && !image_url)) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อความหรือแนบรูปภาพ' });
  }
  
  try {
    const [result] = await db.query(
      'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [orderId, sender_id, sender_type, receiver_type || 'all', message || '', image_url || null]
    );
    res.json({ success: true, message: 'ส่งข้อความสำเร็จ', message_id: result.insertId });
  } catch (error) {
    console.error('Error sending order message:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถส่งข้อความได้' });
  }
});`;

if (content.includes(oldChatRoutes)) {
  content = content.replace(oldChatRoutes, newChatRoutes);
  console.log('✅ Updated Order Chat APIs with photo and multi-role messaging');
}

// 3. Add /api/rider/deliveries/:order_id/pickup endpoint (Proof of Pickup)
const pickupRouteCode = `
// 4.1 Proof of Pickup (Rider receives food from Shop with photo verification)
app.post('/api/rider/deliveries/:order_id/pickup', upload.single('pickup_image'), async (req, res) => {
  const orderId = req.params.order_id;
  const { rider_id, pickup_proof_image } = req.body;
  const uploadedImage = req.file ? \`/uploads/\${req.file.filename}\` : (pickup_proof_image || '');

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      'UPDATE deliveries SET status = "delivering", pickup_proof_image = ?, pickup_at = NOW() WHERE order_id = ? AND rider_id = ?',
      [uploadedImage, orderId, rider_id]
    );

    await connection.query(
      'UPDATE orders SET order_status = "delivering" WHERE order_id = ?',
      [orderId]
    );

    // Auto post system chat message notifying shop and buyer that food is picked up
    try {
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "all", ?, ?)',
        [orderId, rider_id, '🛵 [ยืนยันรับสินค้าแล้ว] ไรเดอร์ได้รับสินค้าจากร้านค้าเรียบร้อยแล้ว กำลังเดินทางไปส่งครับ', uploadedImage || null]
      );
    } catch(e) {}

    await connection.commit();
    res.json({ success: true, message: 'ยืนยันรับสินค้าเรียบร้อย กำลังเริ่มจัดส่ง' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Pickup delivery error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการรับสินค้า' });
  } finally {
    if (connection) connection.release();
  }
});
`;

if (!content.includes('/api/rider/deliveries/:order_id/pickup')) {
  content = content.replace(
    '// 5. Proof & Confirm (Complete Delivery)',
    pickupRouteCode + '\n// 5. Proof & Confirm (Complete Delivery)'
  );
  console.log('✅ Added /api/rider/deliveries/:order_id/pickup endpoint');
}

// 4. Enhance /api/rider/deliveries/:order_id/complete
const oldCompleteRoute = `app.post('/api/rider/deliveries/:order_id/complete', upload.single('proof_image'), async (req, res) => {
  const orderId = req.params.order_id;
  const { rider_id } = req.body;
  const proof_image = req.file ? \`/uploads/\${req.file.filename}\` : '';

  try {
    await db.query(
      'UPDATE deliveries SET status = "delivered", proof_image = ?, completed_at = NOW() WHERE order_id = ? AND rider_id = ?',
      [proof_image, orderId, rider_id]
    );

    // Don't mark order as completed yet, wait for user to confirm receipt via escrow, or auto complete it?
    // Based on food delivery standard, rider delivers -> status = delivered/shipped. User confirms -> completed.
    await db.query('UPDATE orders SET order_status = "delivered", delivered_at = CURRENT_TIMESTAMP WHERE order_id = ?', [orderId]);

    res.json({ success: true, message: 'ยืนยันการจัดส่งสำเร็จ' });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  }
});`;

const newCompleteRoute = `app.post('/api/rider/deliveries/:order_id/complete', upload.single('proof_image'), async (req, res) => {
  const orderId = req.params.order_id;
  const { rider_id, proof_image_base64 } = req.body;
  const proof_image = req.file ? \`/uploads/\${req.file.filename}\` : (proof_image_base64 || req.body.proof_image || '');

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      'UPDATE deliveries SET status = "delivered", proof_image = ?, completed_at = NOW() WHERE order_id = ? AND rider_id = ?',
      [proof_image, orderId, rider_id]
    );

    await connection.query(
      'UPDATE orders SET order_status = "delivered", delivered_at = CURRENT_TIMESTAMP WHERE order_id = ?',
      [orderId]
    );

    // Auto post system chat message notifying that delivery is completed with proof photo
    try {
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "all", ?, ?)',
        [orderId, rider_id, '🎉 [จัดส่งสำเร็จ] ไรเดอร์ได้ส่งมอบสินค้าถึงมือลูกค้าเรียบร้อยแล้ว ขอบคุณที่ใช้บริการครับ', proof_image || null]
      );
    } catch(e) {}

    await connection.commit();
    res.json({ success: true, message: 'ยืนยันการจัดส่งสำเร็จ' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Complete delivery error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  } finally {
    if (connection) connection.release();
  }
});`;

if (content.includes(oldCompleteRoute)) {
  content = content.replace(oldCompleteRoute, newCompleteRoute);
  console.log('✅ Enhanced complete delivery endpoint with chat notification and robust image support');
}

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Backend server.js successfully updated');
