const fs = require('fs');

console.log('=== 1. Check Seller / Order status flow in server.js ===');
const server = fs.readFileSync('C:/smartdeal/smart-deal-backend/src/server.js', 'utf8');

// Find store/seller updating order status
const lines = server.split('\n');
lines.forEach((l, i) => {
  if (l.includes('order_status') || l.includes('preparing') || l.includes('ready') || l.includes('ready_for_pickup') || l.includes('/orders/:id/status')) {
    console.log(`server.js:${i+1}: ${l.trim()}`);
  }
});

console.log('\n=== 2. Check rider deliveries status API in server.js ===');
lines.forEach((l, i) => {
  if (l.includes('/api/rider/deliveries/')) {
    console.log(`server.js:${i+1}: ${l.trim()}`);
  }
});
