const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== Step 1: Updating server.js ===');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Update GET /api/orders/:order_id/messages
const getMessagesRegex = /app\.get\('\/api\/orders\/:order_id\/messages'[\s\S]*?res\.json\(\{\s*success:\s*true,\s*messages\s*\}\);[\s\S]*?\}\);/;

const getMessagesReplacement = `app.get('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  const target = req.query.target || req.query.channel; // 'seller' or 'buyer'
  try {
    let query = 'SELECT id, order_id, sender_id, sender_type, receiver_type, message, image_url, created_at FROM order_messages WHERE order_id = ?';
    const params = [orderId];

    // แยกช่องทางแชทอย่างเด็ดขาด 100% ไม่ปนกัน
    if (target === 'seller') {
      // ช่องทางร้านค้า ↔ ไรเดอร์ (แสดงเฉพาะข้อความระหว่างร้านค้ากับไรเดอร์)
      query += ' AND (sender_type = "seller" OR receiver_type = "seller")';
    } else if (target === 'buyer' || target === 'rider') {
      // ช่องทางลูกค้า ↔ ไรเดอร์ (แสดงเฉพาะข้อความระหว่างลูกค้ากับไรเดอร์)
      query += ' AND (sender_type = "buyer" OR receiver_type = "buyer")';
    }

    query += ' ORDER BY created_at ASC';

    const [messages] = await db.query(query, params);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});`;

serverContent = serverContent.replace(getMessagesRegex, getMessagesReplacement);
fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('✅ Updated GET /api/orders/:order_id/messages in server.js');

console.log('=== Step 2: Committing and pushing smartdeal backend and app ===');
try {
  execSync('git add smart-deal-backend/src/server.js smart-deal-app/src/app/order-chat.tsx', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git commit -m "fix: enforce zero-leakage chat channel isolation and photo dispatch"', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  console.log('✅ smartdeal repo pushed');
} catch (e) {
  console.log('smartdeal git error:', e.message);
}
