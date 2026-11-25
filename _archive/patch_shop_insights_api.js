const fs = require('fs');
let content = fs.readFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', 'utf8');

const targetFunction = `app.get('/api/admin/shops/:id/insights', async (req, res) => {
    const shopId = req.params.id;
    try {
      const [shopInfo] = await db.execute('SELECT s.*, COALESCE(ROUND((SELECT AVG(r.rating) FROM reviews r WHERE r.shop_id = s.shop_id), 1), s.rating, 0.0) AS rating, u.full_name AS owner_name, u.phone AS owner_phone, u.email AS owner_email FROM shops s LEFT JOIN users u ON s.owner_id = u.user_id WHERE s.shop_id = ?', [shopId]);
      
      if (shopInfo.length === 0) {
        return res.status(404).json({ error: 'Shop not found' });
      }
  
      const [salesKpi] = await db.execute('SELECT COUNT(order_id) AS total_orders, SUM(total_amount) AS total_revenue FROM orders WHERE shop_id = ? AND order_status IN (\\'completed\\', \\'paid\\', \\'delivered\\')', [shopId]);
      
      const [products] = await db.execute('SELECT product_id, name, description, original_price, discount_price AS price, stock_quantity AS stock, image_url, expiry_time AS expiration_date, category_id FROM products WHERE shop_id = ? ORDER BY product_id DESC LIMIT 10', [shopId]);
      
      const [weeklyChart] = await db.execute('SELECT DATE_FORMAT(created_at, \\'%d %b\\') AS date, SUM(total_amount) AS total FROM orders WHERE shop_id = ? AND order_status IN (\\'completed\\', \\'paid\\', \\'delivered\\') AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)', [shopId]);
  
      res.json({
        shop: shopInfo[0],
        kpi: {
          total_orders: salesKpi[0].total_orders || 0,
          total_revenue: salesKpi[0].total_revenue || 0
        },
        products: products || [],
        weekly_sales: weeklyChart || []
      });
    } catch (error) {
      console.error('API /api/admin/shops/:id/insights Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });`;

const newFunction = `app.get('/api/admin/shops/:id/insights', async (req, res) => {
    const shopId = req.params.id;
    try {
      const [shopInfo] = await db.execute('SELECT s.*, COALESCE(ROUND((SELECT AVG(r.rating) FROM reviews r WHERE r.shop_id = s.shop_id), 1), s.rating, 0.0) AS rating, u.full_name AS owner_name, u.phone AS owner_phone, u.email AS owner_email FROM shops s LEFT JOIN users u ON s.owner_id = u.user_id WHERE s.shop_id = ?', [shopId]);
      
      if (shopInfo.length === 0) {
        return res.status(404).json({ error: 'Shop not found' });
      }
  
      const [salesKpi] = await db.execute('SELECT COUNT(order_id) AS total_orders, SUM(total_amount) AS total_revenue FROM orders WHERE shop_id = ? AND order_status IN (\\'completed\\', \\'paid\\', \\'delivered\\')', [shopId]);
      
      const [products] = await db.execute('SELECT product_id, name, description, original_price, discount_price AS price, stock_quantity AS stock, image_url, expiry_time AS expiration_date, category_id FROM products WHERE shop_id = ? ORDER BY product_id DESC LIMIT 10', [shopId]);
      
      const [weeklyChart] = await db.execute('SELECT DATE_FORMAT(created_at, \\'%d %b\\') AS date, SUM(total_amount) AS total FROM orders WHERE shop_id = ? AND order_status IN (\\'completed\\', \\'paid\\', \\'delivered\\') AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)', [shopId]);
  
      const [recentOrders] = await db.execute(\`SELECT DISTINCT o.order_id, o.total_amount, o.order_status, o.created_at, u.full_name as buyer_name FROM orders o LEFT JOIN order_items oi ON o.order_id = oi.order_id LEFT JOIN products p ON oi.product_id = p.product_id LEFT JOIN users u ON o.user_id = u.user_id WHERE COALESCE(oi.shop_id, p.shop_id, o.shop_id) = ? ORDER BY o.created_at DESC LIMIT 5\`, [shopId]);

      const [reviews] = await db.execute('SELECT r.*, u.full_name as customer_name FROM reviews r LEFT JOIN users u ON r.user_id = u.user_id WHERE r.shop_id = ? ORDER BY r.created_at DESC LIMIT 5', [shopId]);

      res.json({
        shop: shopInfo[0],
        kpi: {
          total_orders: salesKpi[0].total_orders || 0,
          total_revenue: salesKpi[0].total_revenue || 0
        },
        products: products || [],
        weekly_sales: weeklyChart || [],
        recent_orders: recentOrders || [],
        reviews: reviews || []
      });
    } catch (error) {
      console.error('API /api/admin/shops/:id/insights Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });`;

// Because of possible whitespace differences, we'll replace manually:
let success = false;
if (content.includes("app.get('/api/admin/shops/:id/insights'")) {
    const startIndex = content.indexOf("app.get('/api/admin/shops/:id/insights'");
    const nextEndpoint = content.indexOf("app.put('/api/admin/shops/:id/suspend'", startIndex);
    
    if (startIndex !== -1 && nextEndpoint !== -1) {
        const oldCode = content.substring(startIndex, nextEndpoint);
        content = content.replace(oldCode, newFunction + '\\n  \\n  ');
        fs.writeFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', content);
        console.log('Fixed API!');
        success = true;
    }
}
if (!success) console.log('Failed to patch!');
