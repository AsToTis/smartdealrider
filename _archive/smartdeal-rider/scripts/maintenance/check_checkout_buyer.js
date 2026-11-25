const fs = require('fs');

try {
  console.log('--- CHECKOUT.TSX ---');
  const checkout = fs.readFileSync('C:/smartdeal/smart-deal-app/src/app/checkout.tsx', 'utf8');
  console.log(checkout.slice(0, 1500));
} catch (e) {
  console.log(e.message);
}
