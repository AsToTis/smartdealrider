const fs = require('fs');

console.log('=== 1. Patching server.js ===');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let server = fs.readFileSync(serverPath, 'utf8');

const oldGetMessagesRegex = /app\.get\('\/api\/orders\/:order_id\/messages'[\s\S]*?res\.json\(\{\s*success:\s*true,\s*messages\s*\}\);[\s\S]*?\}\);/;

const newGetMessages = `app.get('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  const target = req.query.target || req.query.channel; // 'seller' | 'rider' | 'buyer'
  const role = req.query.role; // 'seller' | 'rider' | 'buyer'
  try {
    let query = \`SELECT id, order_id, sender_id, sender_type, receiver_type, message, image_url, 
                        DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') as created_at 
                 FROM order_messages 
                 WHERE order_id = ?\`;
    const params = [orderId];

    // 1. ช่องทาง: ร้านค้า ↔ ไรเดอร์ (Shop <-> Rider) - แสดงเฉพาะข้อความระหว่างร้านค้ากับไรเดอร์เท่านั้น
    if (target === 'seller' || (role === 'rider' && target === 'seller') || (role === 'seller' && target === 'rider')) {
      query += ' AND ((sender_type = "seller" AND receiver_type = "rider") OR (sender_type = "rider" AND receiver_type = "seller"))';
    } 
    // 2. ช่องทาง: ลูกค้า ↔ ไรเดอร์ (Customer <-> Rider) - แสดงเฉพาะข้อความระหว่างลูกค้ากับไรเดอร์เท่านั้น
    else if (target === 'buyer' || (role === 'rider' && target === 'buyer') || (role === 'buyer' && target === 'rider') || target === 'rider') {
      query += ' AND ((sender_type = "buyer" AND receiver_type = "rider") OR (sender_type = "rider" AND receiver_type = "buyer"))';
    } 
    // 3. ช่องทาง: ลูกค้า ↔ ร้านค้า (Customer <-> Shop) - แสดงเฉพาะเมื่อระบุชัดเจนจากแอปลูกค้า/ร้านค้า
    else if (target === 'shop_direct' || (role === 'buyer' && target === 'seller_direct') || (role === 'seller' && target === 'buyer_direct')) {
      query += ' AND ((sender_type = "buyer" AND receiver_type = "seller") OR (sender_type = "seller" AND receiver_type = "buyer"))';
    }
    // ป้องกันการหลุดของแชทคู่อื่นอย่างเด็ดขาด 100%
    else {
      query += ' AND 1 = 0';
    }

    query += ' ORDER BY id ASC';

    const [messages] = await db.query(query, params);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});`;

if (oldGetMessagesRegex.test(server)) {
  server = server.replace(oldGetMessagesRegex, newGetMessages);
  fs.writeFileSync(serverPath, server, 'utf8');
  console.log('✅ Successfully patched GET messages in server.js');
} else {
  console.log('❌ oldGetMessagesRegex did not match in server.js');
}

console.log('=== 2. Patching Rider chat/[id].tsx ===');
const riderChatPath = 'C:/smartdealrider/smartdeal-rider/src/app/chat/[id].tsx';
let riderChat = fs.readFileSync(riderChatPath, 'utf8');

// Update fetchMessages to pass role=rider
riderChat = riderChat.replace(
  "const res = await api.get(`/orders/${orderId}/messages?target=${activeChannel}`);",
  "const res = await api.get(`/orders/${orderId}/messages?role=rider&target=${activeChannel}`);"
);

// Add safe formatTime function to eliminate "Invalid Date"
const oldTimeStr = `    const timeStr = item.created_at
      ? new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : '';`;

const newTimeStr = `    const formatTime = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
          const parts = dateStr.split(/[- :T]/);
          if (parts.length >= 5) return \`\${parts[3]}:\${parts[4]}\`;
          return '';
        }
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return '';
      }
    };
    const timeStr = formatTime(item.created_at);`;

if (riderChat.includes(oldTimeStr)) {
  riderChat = riderChat.replace(oldTimeStr, newTimeStr);
  console.log('✅ Updated formatTime in chat/[id].tsx');
}

fs.writeFileSync(riderChatPath, riderChat, 'utf8');
console.log('✅ Successfully patched Rider chat/[id].tsx');
