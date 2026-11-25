const fs = require('fs');
let code = fs.readFileSync('C:/smartdeal/server.js', 'utf8');

// The single quote version: order_status IN ('completed', 'paid')
// It's escaped in the code string as: order_status IN (\\'completed\\', \\'paid\\')
code = code.replace(/order_status IN \\\('completed\\', \\'paid\\'\\\)/g, "order_status IN ('completed', 'paid', 'delivered')");
code = code.replace(/order_status IN \('completed', 'paid'\)/g, "order_status IN ('completed', 'paid', 'delivered')");
code = code.replace(/order_status IN \(\\'completed\\', \\'paid\\'\)/g, "order_status IN ('completed', 'paid', 'delivered')");

fs.writeFileSync('C:/smartdeal/server.js', code);
console.log('Shop insights API patched for delivered status');
