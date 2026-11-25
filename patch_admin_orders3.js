const fs = require('fs');
let content = fs.readFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', 'utf8');

const oldSql = `SELECT o.*, 
               u.full_name as buyer_name, 
               s.name as shop_name 
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN shops s ON o.shop_id = s.shop_id
        ORDER BY o.created_at DESC`;

const newSql = `SELECT o.*, 
               u.full_name as buyer_name, 
               COALESCE(
                 (
                   SELECT GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ')
                   FROM order_items oi
                   JOIN shops s ON oi.shop_id = s.shop_id
                   WHERE oi.order_id = o.order_id
                 ),
                 s_fallback.name
               ) as shop_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN shops s_fallback ON o.shop_id = s_fallback.shop_id
        ORDER BY o.created_at DESC`;

if (content.includes('s.name as shop_name')) {
    content = content.replace(oldSql, newSql);
    fs.writeFileSync('C:\\smartdeal\\smart-deal-backend\\src\\server.js', content);
    console.log('Fixed SQL for multi-shop orders!');
} else {
    console.log('Could not find the SQL to replace!');
}
