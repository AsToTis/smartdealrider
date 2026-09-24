const fs = require('fs');
let code = fs.readFileSync('C:/smartdeal/server.js', 'utf8');

const newEndpoints = `
// ==========================================
// System Settings (God Mode)
// ==========================================
app.get('/api/admin/settings', async (req, res) => {
  try {
    const [settings] = await db.execute('SELECT * FROM system_settings');
    res.json({ success: true, settings });
  } catch (error) {
    console.error('API /api/admin/settings Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/admin/settings', async (req, res) => {
  const { settings } = req.body; // Expect array of { setting_key, setting_value }
  
  if (!Array.isArray(settings)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const setting of settings) {
      await connection.execute(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
        [setting.setting_value, setting.setting_key]
      );
    }
    await connection.commit();
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('API PUT /api/admin/settings Error:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});
`;

if (!code.includes('/api/admin/settings')) {
  code = code.replace(/app\.listen\(/, newEndpoints + '\napp.listen(');
  fs.writeFileSync('C:/smartdeal/server.js', code);
  console.log('Added Settings APIs to server.js');
} else {
  console.log('Settings APIs already exist');
}
