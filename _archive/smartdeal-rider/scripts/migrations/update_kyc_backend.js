const fs = require('fs');
const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function runUpdate() {
  // 1. Update Database
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    console.log('Connected to DB. Altering riders table...');
    const columnsToAdd = [
      "real_name VARCHAR(255) NULL",
      "vehicle_detail VARCHAR(255) NULL",
      "vehicle_doc_image TEXT NULL",
      "license_number VARCHAR(100) NULL",
      "reject_reason TEXT NULL"
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE riders ADD COLUMN ${col}`);
        console.log(`Added column: ${col}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${col.split(' ')[0]} already exists.`);
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await connection.end();
  }

  // 2. Update server.js
  const serverJsPath = 'C:\\smartdeal\\server.js';
  let serverCode = fs.readFileSync(serverJsPath, 'utf8');

  // Replace /api/rider/register
  const registerRegex = /app\.post\('\/api\/rider\/register', upload\.single\('license_image'\), async \(req, res\) => \{[\s\S]*?\}\);/g;

  const newRegisterRoute = `app.post('/api/rider/register', upload.fields([
    { name: 'id_card_image', maxCount: 1 },
    { name: 'vehicle_doc_image', maxCount: 1 },
    { name: 'license_image', maxCount: 1 }
  ]), async (req, res) => {
    const { full_name, phone, password, real_name, vehicle_detail, vehicle_plate, license_number } = req.body;
    if (!full_name || !phone || !vehicle_plate || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }
  
    const id_card_image = req.files && req.files['id_card_image'] ? '/uploads/' + req.files['id_card_image'][0].filename : '';
    const vehicle_doc_image = req.files && req.files['vehicle_doc_image'] ? '/uploads/' + req.files['vehicle_doc_image'][0].filename : '';
    const license_image = req.files && req.files['license_image'] ? '/uploads/' + req.files['license_image'][0].filename : '';
  
    try {
      const [existing] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' });
      }
  
      const [userResult] = await db.query(
        'INSERT INTO users (full_name, phone, password, role) VALUES (?, ?, ?, "rider")',
        [full_name, phone, password]
      );
      const userId = userResult.insertId;
  
      await db.query(
        'INSERT INTO riders (user_id, real_name, vehicle_detail, vehicle_plate, id_card_image, vehicle_doc_image, license_number, license_image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "pending")',
        [userId, real_name, vehicle_detail, vehicle_plate, id_card_image, vehicle_doc_image, license_number, license_image]
      );
  
      res.json({ success: true, message: 'สมัครสมาชิกสำเร็จ รอการตรวจสอบจากแอดมิน' });
    } catch (error) {
      console.error('Rider register error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสมัคร' });
    }
  });`;

  if (registerRegex.test(serverCode)) {
    serverCode = serverCode.replace(registerRegex, newRegisterRoute);
    console.log('Replaced /api/rider/register route.');
  } else {
    // If upload.single not found, try replacing upload.fields in case it was already replaced
    console.log('Could not find the exact old register route. Skipping replacement (might be already updated).');
  }

  // Add Admin API routes
  if (!serverCode.includes('/api/admin/riders/pending')) {
    const adminRoutes = `
// ====== ADMIN KYC ROUTES ======
// Get all pending riders
app.get('/api/admin/riders/pending', async (req, res) => {
  try {
    const [riders] = await db.query(\`
      SELECT r.*, u.full_name, u.phone 
      FROM riders r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    \`);
    res.json({ success: true, riders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get rider details
app.get('/api/admin/riders/:id', async (req, res) => {
  try {
    const [riders] = await db.query(\`
      SELECT r.*, u.full_name, u.phone 
      FROM riders r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.id = ?
    \`, [req.params.id]);
    if (riders.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, rider: riders[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve rider
app.put('/api/admin/riders/:id/approve', async (req, res) => {
  try {
    await db.query('UPDATE riders SET status = "approved", reject_reason = NULL WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Rider approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject rider
app.put('/api/admin/riders/:id/reject', async (req, res) => {
  const { reason } = req.body;
  try {
    await db.query('UPDATE riders SET status = "rejected", reject_reason = ? WHERE id = ?', [reason || 'ไม่ระบุเหตุผล', req.params.id]);
    res.json({ success: true, message: 'Rider rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// ===============================
`;
    // Insert at the bottom of the file (before app.listen if possible, or just append)
    // Find app.listen
    const listenIndex = serverCode.lastIndexOf('app.listen(');
    if (listenIndex !== -1) {
      serverCode = serverCode.slice(0, listenIndex) + adminRoutes + '\n' + serverCode.slice(listenIndex);
    } else {
      serverCode += '\n' + adminRoutes;
    }
    console.log('Added Admin KYC routes.');
  } else {
    console.log('Admin KYC routes already exist.');
  }

  // Also add id_card_image if it doesn't exist in riders table via regex check just to be sure
  // Wait, I already altered the DB above.

  fs.writeFileSync(serverJsPath, serverCode, 'utf8');
  console.log('server.js updated successfully!');
}

runUpdate();
