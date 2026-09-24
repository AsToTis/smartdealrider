const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      search(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('delivery_fee') || content.includes('deliveryFee') || content.includes('ค่าส่ง') || content.includes('ค่าจัดส่ง') || content.includes('checkout') || content.includes('cart')) {
        console.log(`Found match in: ${full}`);
      }
    }
  }
}

search('C:/smartdeal/smart-deal-app/src');
