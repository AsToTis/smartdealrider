const fs = require('fs');

try {
  const tracking = fs.readFileSync('C:/smartdeal/smart-deal-app/src/app/tracking.tsx', 'utf8');
  const lines = tracking.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('delivery_fee') || line.includes('ค่าส่ง') || line.includes('ค่าจัดส่ง') || line.includes('fee')) {
      console.log(`Tracking Line ${idx + 1}: ${line}`);
    }
  });
} catch (e) {
  console.log(e.message);
}
