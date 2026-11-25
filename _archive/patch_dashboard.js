const fs = require('fs');
let content = fs.readFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', 'utf8');

const oldSql = "`SELECT orders.order_id, shops.name AS shop_name, orders.total_amount FROM orders JOIN shops ON orders.shop_id = shops.shop_id ORDER BY orders.created_at DESC LIMIT 5`";

const newSql = "`SELECT orders.order_id, COALESCE((SELECT GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ') FROM order_items oi LEFT JOIN products p ON oi.product_id = p.product_id JOIN shops s ON s.shop_id = COALESCE(oi.shop_id, p.shop_id) WHERE oi.order_id = orders.order_id), shops_fallback.name) as shop_name, orders.total_amount FROM orders LEFT JOIN shops shops_fallback ON orders.shop_id = shops_fallback.shop_id ORDER BY orders.created_at DESC LIMIT 5`";

if (content.includes(oldSql)) {
    content = content.replace(oldSql, newSql);
    fs.writeFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', content);
    console.log('Fixed recent_orders SQL in dashboard API!');
} else {
    console.log('Could not find the recent_orders SQL to replace!');
}
