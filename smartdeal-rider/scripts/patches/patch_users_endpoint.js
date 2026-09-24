const fs = require('fs');
const filePath = 'C:/smartdeal/server.js';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `    const [stats] = await db.execute(\`SELECT COUNT(order_id) AS total_orders, SUM(total_amount) AS total_spent, AVG(total_amount) AS avg_order_value FROM orders WHERE user_id = ? AND (order_status = 'completed' OR order_status = 'paid')\`, [userId]);
    
    const [recent_orders] = await db.execute(\`SELECT order_id, total_amount, order_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5\`, [userId]);`;

const replacementStr = `    let stats = { total_orders: 0, total_spent: 0, avg_order_value: 0 };
    let recent_orders = [];
    const role = user[0].role;
    
    if (role === 'buyer') {
      const [s] = await db.execute(\`SELECT COUNT(order_id) AS total_orders, SUM(total_amount) AS total_spent, AVG(total_amount) AS avg_order_value FROM orders WHERE user_id = ? AND (order_status = 'completed' OR order_status = 'paid' OR order_status = 'delivered')\`, [userId]);
      stats = { total_orders: s[0].total_orders || 0, total_spent: s[0].total_spent || 0, avg_order_value: s[0].avg_order_value || 0 };
      const [ro] = await db.execute(\`SELECT order_id, total_amount, order_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5\`, [userId]);
      recent_orders = ro;
    } else if (role === 'seller') {
      const [shopRows] = await db.execute(\`SELECT shop_id FROM shops WHERE owner_id = ? LIMIT 1\`, [userId]);
      if (shopRows.length > 0) {
        const shopId = shopRows[0].shop_id;
        const [s] = await db.execute(\`SELECT COUNT(order_id) AS total_orders, SUM(total_amount) AS total_spent, AVG(total_amount) AS avg_order_value FROM orders WHERE shop_id = ? AND (order_status = 'completed' OR order_status = 'delivered')\`, [shopId]);
        stats = { total_orders: s[0].total_orders || 0, total_spent: s[0].total_spent || 0, avg_order_value: s[0].avg_order_value || 0 };
        const [ro] = await db.execute(\`SELECT order_id, total_amount, order_status, created_at FROM orders WHERE shop_id = ? ORDER BY created_at DESC LIMIT 5\`, [shopId]);
        recent_orders = ro;
      }
    } else if (role === 'driver') {
      const [riderRows] = await db.execute(\`SELECT rider_id FROM riders WHERE user_id = ? LIMIT 1\`, [userId]);
      if (riderRows.length > 0) {
        const riderId = riderRows[0].rider_id;
        const [s] = await db.execute(\`SELECT COUNT(d.id) AS total_orders, SUM(o.delivery_fee) AS total_spent, AVG(o.delivery_fee) AS avg_order_value FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? AND d.status = 'delivered'\`, [riderId]);
        stats = { total_orders: s[0].total_orders || 0, total_spent: s[0].total_spent || 0, avg_order_value: s[0].avg_order_value || 0 };
        const [ro] = await db.execute(\`SELECT o.order_id, o.delivery_fee as total_amount, d.status as order_status, d.completed_at as created_at FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? ORDER BY d.completed_at DESC LIMIT 5\`, [riderId]);
        recent_orders = ro;
      }
    } else {
      // Admin or others
      const [s] = await db.execute(\`SELECT COUNT(order_id) AS total_orders, SUM(total_amount) AS total_spent, AVG(total_amount) AS avg_order_value FROM orders WHERE user_id = ? AND (order_status = 'completed' OR order_status = 'paid')\`, [userId]);
      stats = { total_orders: s[0].total_orders || 0, total_spent: s[0].total_spent || 0, avg_order_value: s[0].avg_order_value || 0 };
      const [ro] = await db.execute(\`SELECT order_id, total_amount, order_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5\`, [userId]);
      recent_orders = ro;
    }`;

code = code.replace(targetStr, replacementStr);

const targetStatsStr = `      stats: {
        total_orders: stats[0].total_orders || 0,
        total_spent: stats[0].total_spent || 0,
        avg_order_value: stats[0].avg_order_value || 0
      },`;

const replaceStatsStr = `      stats: stats,`;

code = code.replace(targetStatsStr, replaceStatsStr);
fs.writeFileSync(filePath, code);
console.log('patched users endpoint');
