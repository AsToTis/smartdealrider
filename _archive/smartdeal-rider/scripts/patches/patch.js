const fs = require('fs');
let code = fs.readFileSync('C:/smartdeal/server.js', 'utf8');

const targetStr = `SELECT user_id, full_name, email, phone, role, status, avatar_url, created_at FROM users ORDER BY created_at DESC`;

const replacementStr = `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.status, u.avatar_url, u.created_at, 
      CASE 
        WHEN u.role = 'seller' THEN (SELECT COUNT(*) FROM orders o WHERE o.shop_id = (SELECT shop_id FROM shops s WHERE s.owner_id = u.user_id LIMIT 1) AND o.order_status = 'delivered')
        WHEN u.role = 'driver' THEN (SELECT COUNT(*) FROM deliveries d JOIN riders r ON d.rider_id = r.rider_id WHERE r.user_id = u.user_id AND d.status = 'delivered')
        WHEN u.role = 'buyer'  THEN (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.user_id)
        ELSE 0
      END as performance_score
      FROM users u 
      ORDER BY u.created_at DESC`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('C:/smartdeal/server.js', code);
console.log('patched');
