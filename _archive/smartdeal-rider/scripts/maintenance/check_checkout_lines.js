const fs = require('fs');

try {
  const checkout = fs.readFileSync('C:/smartdeal/smart-deal-app/src/app/checkout.tsx', 'utf8');
  const lines = checkout.split('\n');
  console.log(lines.slice(55, 120).join('\n'));
} catch (e) {
  console.log(e.message);
}
