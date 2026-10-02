const fs = require('fs');
const path = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Expo Server SDK require
if (!content.includes("const { Expo }")) {
  content = content.replace(
    "const express = require('express');",
    "const express = require('express');\nconst { Expo } = require('expo-server-sdk');\nlet expo = new Expo();"
  );
}

// 2. Add DB migration for push_token
if (!content.includes("ADD COLUMN push_token")) {
  const initDbCode = `
const initPushTokenColumn = async () => {
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'push_token'");
    if (rows.length === 0) {
      await db.execute("ALTER TABLE users ADD COLUMN push_token VARCHAR(255) NULL");
      console.log('✅ Added push_token column to users table');
    }
  } catch (err) {
    console.error('❌ Error adding push_token column:', err.message);
  }
};
initPushTokenColumn();
`;
  content = content.replace(
    "initAddressesTable();",
    "initAddressesTable();\n" + initDbCode
  );
}

// 3. Add API to save push token
if (!content.includes("/api/users/push-token")) {
  const pushTokenApi = `
app.post('/api/users/push-token', async (req, res) => {
  const { user_id, push_token } = req.body;
  if (!user_id || !push_token) return res.status(400).json({ error: 'Missing data' });
  try {
    await db.execute('UPDATE users SET push_token = ? WHERE user_id = ?', [push_token, user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;
  content = content.replace(
    "// ==========================================\n// 1. AUTHENTICATION APIs",
    "// ==========================================\n// 1. AUTHENTICATION APIs\n" + pushTokenApi
  );
}

// 4. Update Shop Reject API
// Using regex to replace the existing shop reject API
const shopRejectRegex = /app\.put\('\/api\/admin\/shops\/:id\/reject', async \(req, res\) => {[\s\S]*?res\.status\(500\)\.json\({ error: 'Database error' }\);\s*}\s*}\);/g;
const newShopReject = `app.put('/api/admin/shops/:id/reject', async (req, res) => {
  const { reason } = req.body;
  try {
    const [result] = await db.execute('UPDATE shops SET status = "rejected", reject_reason = ? WHERE shop_id = ?', [reason || null, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบร้านค้า' });

    const [shopData] = await db.execute('SELECT owner_id FROM shops WHERE shop_id = ?', [req.params.id]);
    if (shopData.length > 0) {
      const ownerId = shopData[0].owner_id;
      await db.execute('INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)', 
        [ownerId, 'คำขอเปิดร้านไม่ผ่านการอนุมัติ', \`เหตุผล: \${reason || 'ไม่ระบุ'}\`, 'shop_rejected', req.params.id]);
      
      const [userRows] = await db.execute('SELECT push_token FROM users WHERE user_id = ?', [ownerId]);
      if (userRows.length > 0 && userRows[0].push_token && Expo.isExpoPushToken(userRows[0].push_token)) {
        expo.sendPushNotificationsAsync([{
          to: userRows[0].push_token,
          sound: 'default',
          title: 'คำขอของคุณไม่ผ่านการอนุมัติ ❌',
          body: \`เหตุผล: \${reason || 'ไม่ระบุ'}\`,
          data: { type: 'REGISTRATION_REJECTED', status: 'rejected', reason: reason }
        }]).catch(console.error);
      }
    }

    res.json({ success: true, message: 'ปฏิเสธร้านค้าสำเร็จ' });
  } catch (error) {
    console.error('API /api/admin/shops/:id/reject Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});`;
content = content.replace(shopRejectRegex, newShopReject);

// 5. Update Rider Reject API
const riderRejectRegex = /app\.put\('\/api\/admin\/riders\/:id\/reject', async \(req, res\) => {[\s\S]*?res\.status\(500\)\.json\({ success: false, message: 'Database error' }\);\s*?}\s*}\);/g;
// Wait, the rider reject in server.js doesn't have JSON message 'Database error', it's just console.error(err) in the catch block. Let's use a simpler replace.
const riderRejectRegex2 = /app\.put\('\/api\/admin\/riders\/:id\/reject', async \(req, res\) => {[\s\S]*?res\.json\({ success: true, message: 'Rider rejected successfully' }\);\s*\} catch \(err\) \{\s*console\.error\(err\);\s*\}\s*}\);/g;

const newRiderReject = `app.put('/api/admin/riders/:id/reject', async (req, res) => {
  const { reason } = req.body;
  try {
    const [result] = await db.query('UPDATE riders SET status = "rejected", reject_reason = ? WHERE rider_id = ?', [reason || 'ไม่ระบุเหตุผล', req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Rider not found' });

    const [riderData] = await db.query('SELECT user_id FROM riders WHERE rider_id = ?', [req.params.id]);
    if (riderData.length > 0) {
      const ownerId = riderData[0].user_id;
      await db.execute('INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)', 
        [ownerId, 'คำขอสมัครไรเดอร์ไม่ผ่านการอนุมัติ', \`เหตุผล: \${reason || 'ไม่ระบุ'}\`, 'rider_rejected', req.params.id]);
      
      const [userRows] = await db.execute('SELECT push_token FROM users WHERE user_id = ?', [ownerId]);
      if (userRows.length > 0 && userRows[0].push_token && Expo.isExpoPushToken(userRows[0].push_token)) {
        expo.sendPushNotificationsAsync([{
          to: userRows[0].push_token,
          sound: 'default',
          title: 'คำขอสมัครไรเดอร์ไม่ผ่านการอนุมัติ ❌',
          body: \`เหตุผล: \${reason || 'ไม่ระบุ'}\`,
          data: { type: 'REGISTRATION_REJECTED', status: 'rejected', reason: reason }
        }]).catch(console.error);
      }
    }

    res.json({ success: true, message: 'Rider rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});`;
content = content.replace(riderRejectRegex2, newRiderReject);

fs.writeFileSync(path, content);
console.log('Successfully patched server.js!');
