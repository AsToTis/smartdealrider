const fs = require('fs');
let code = fs.readFileSync('C:/smartdeal/server.js', 'utf8');

// Dashboard endpoints use: order_status = 'completed' OR order_status = 'paid'
code = code.replace(/order_status = 'completed' OR order_status = 'paid'/g, "order_status IN ('completed', 'paid', 'delivered')");

// Also replace: order_status IN ('completed', 'paid')
code = code.replace(/order_status IN \('completed', 'paid'\)/g, "order_status IN ('completed', 'paid', 'delivered')");

fs.writeFileSync('C:/smartdeal/server.js', code);
console.log('Dashboard stats patched for delivered status');
