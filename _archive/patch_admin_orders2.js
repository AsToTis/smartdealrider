const fs = require('fs');
let content = fs.readFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', 'utf8');
const startIdx = content.indexOf("app.get('/api/admin/orders'");
const endIdx = content.indexOf("app.listen(PORT, '0.0.0.0'");
if (startIdx !== -1 && endIdx !== -1) {
    const newBlock = `app.get('/api/admin/orders', async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(\`
        SELECT o.*, 
               u.full_name as buyer_name, 
               s.name as shop_name 
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN shops s ON o.shop_id = s.shop_id
        ORDER BY o.created_at DESC
      \`);
      res.json({ success: true, orders: rows });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('API /api/admin/orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

`;
    content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
    fs.writeFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', content);
    console.log('Fixed API block!');
} else {
    console.log('Could not find indices!');
}
