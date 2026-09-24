const fs = require('fs');
let code = fs.readFileSync('C:/smartdeal/server.js', 'utf8');

// The single quote version: order_status IN ('completed', 'paid')
// It's escaped in the code string as: order_status IN (\\'completed\\', \\'paid\\')
code = code.replace(/'SELECT COUNT\(order_id\) AS total_orders, SUM\(total_amount\) AS total_revenue FROM orders WHERE shop_id = \? AND order_status IN \('completed', 'paid', 'delivered'\)'/g, 
                    "'SELECT COUNT(order_id) AS total_orders, SUM(total_amount) AS total_revenue FROM orders WHERE shop_id = ? AND order_status IN (\\'completed\\', \\'paid\\', \\'delivered\\')'");

code = code.replace(/'SELECT DATE_FORMAT\(created_at, \\'%d %b\\'\) AS date, SUM\(total_amount\) AS total FROM orders WHERE shop_id = \? AND order_status IN \('completed', 'paid', 'delivered'\) AND created_at >= DATE_SUB\(NOW\(\), INTERVAL 7 DAY\) GROUP BY DATE\(created_at\) ORDER BY DATE\(created_at\)'/g, 
                    "'SELECT DATE_FORMAT(created_at, \\'%d %b\\') AS date, SUM(total_amount) AS total FROM orders WHERE shop_id = ? AND order_status IN (\\'completed\\', \\'paid\\', \\'delivered\\') AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)'");

fs.writeFileSync('C:/smartdeal/server.js', code);
console.log('Fixed syntax error in server.js');
