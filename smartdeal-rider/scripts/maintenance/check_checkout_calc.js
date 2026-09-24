const fs = require('fs');

try {
  const checkout = fs.readFileSync('C:/smartdeal/smart-deal-app/src/app/checkout.tsx', 'utf8');
  console.log(checkout.slice(1500, 3500));
} catch (e) {
  console.log(e.message);
}
