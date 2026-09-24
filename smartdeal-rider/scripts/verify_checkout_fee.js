const fs = require('fs');

const content = fs.readFileSync('C:/smartdeal/smart-deal-app/src/app/checkout.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(85, 105).join('\n'));
