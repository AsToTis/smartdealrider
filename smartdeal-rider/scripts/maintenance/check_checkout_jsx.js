const fs = require('fs');

try {
  const checkout = fs.readFileSync('C:/smartdeal/smart-deal-app/src/app/checkout.tsx', 'utf8');
  const lines = checkout.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('deliveryFee') || line.includes('ค่าจัดส่ง') || line.includes('ค่าส่ง') || line.includes('สรุป') || line.includes('grandTotal')) {
      console.log(`Line ${idx + 1}: ${line}`);
    }
  });
} catch (e) {
  console.log(e.message);
}
