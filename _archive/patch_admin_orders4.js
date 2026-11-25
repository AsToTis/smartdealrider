const fs = require('fs');
let content = fs.readFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', 'utf8');

const oldSql = `                   SELECT GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ')
                   FROM order_items oi
                   JOIN shops s ON oi.shop_id = s.shop_id
                   WHERE oi.order_id = o.order_id`;

const newSql = `                   SELECT GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ')
                   FROM order_items oi
                   LEFT JOIN products p ON oi.product_id = p.product_id
                   JOIN shops s ON s.shop_id = COALESCE(oi.shop_id, p.shop_id)
                   WHERE oi.order_id = o.order_id`;

if (content.includes(oldSql)) {
    content = content.replace(oldSql, newSql);
    fs.writeFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', content);
    console.log('Fixed SQL to fallback to products.shop_id!');
} else {
    console.log('Could not find the SQL to replace!');
}
