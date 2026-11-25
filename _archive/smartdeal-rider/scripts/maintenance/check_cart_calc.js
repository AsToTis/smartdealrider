const fs = require('fs');

try {
  const cart = fs.readFileSync('C:/smartdeal/smart-deal-app/src/app/cart.tsx', 'utf8');
  console.log(cart.slice(0, 2500));
} catch (e) {
  console.log(e.message);
}
