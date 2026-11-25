const fs = require('fs');
let content = fs.readFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', 'utf8');

const oldSql = "\`SELECT shops.name AS shop_name, SUM(orders.total_amount) AS total_sales FROM orders JOIN shops ON orders.shop_id = shops.shop_id GROUP BY shops.shop_id ORDER BY total_sales DESC LIMIT 5\`";

const newSql = "\`SELECT s.name AS shop_name, SUM(oi.price * oi.quantity) AS total_sales FROM order_items oi LEFT JOIN products p ON oi.product_id = p.product_id JOIN shops s ON s.shop_id = COALESCE(oi.shop_id, p.shop_id) JOIN orders o ON oi.order_id = o.order_id WHERE o.order_status IN ('completed', 'paid', 'delivered') GROUP BY s.shop_id ORDER BY total_sales DESC LIMIT 5\`";

if (content.includes(oldSql)) {
    content = content.replace(oldSql, newSql);
    fs.writeFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', content);
    console.log('Fixed top_shops SQL in dashboard API!');
} else {
    console.log('Could not find the top_shops SQL to replace!');
}
