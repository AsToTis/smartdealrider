const fs = require('fs');

try {
  const content = fs.readFileSync('C:/smartdeal/server.js', 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('delivery_fee') || line.includes('/orders') || line.includes('/checkout')) {
      console.log(`Line ${idx + 1}: ${line}`);
    }
  });
} catch (e) {
  console.log(e.message);
}
