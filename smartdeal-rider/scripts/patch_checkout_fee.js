const fs = require('fs');

const checkoutPath = 'C:/smartdeal/smart-deal-app/src/app/checkout.tsx';
let content = fs.readFileSync(checkoutPath, 'utf8');

// Replace the hardcoded 0 with 15
const oldCalc = `  const deliveryFee = deliveryMethod === 'delivery' ? 0 : 0;
  const discount = 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);
  const deliveryFeeText = deliveryFee === 0 ? 'ฟรี' : '฿' + Number(deliveryFee).toFixed(2);`;

const newCalc = `  // ค่าส่งราคาประหยัดและสมเหตุสมผล ฿15 (เมื่อเลือกแบบจัดส่ง)
  const deliveryFee = deliveryMethod === 'delivery' ? 15 : 0;
  const discount = 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);
  const deliveryFeeText = deliveryMethod === 'delivery' ? '฿15.00' : 'ฟรี (รับเองที่ร้าน)';`;

if (content.includes(oldCalc)) {
  content = content.replace(oldCalc, newCalc);
  fs.writeFileSync(checkoutPath, content, 'utf8');
  console.log('✅ Updated checkout.tsx delivery fee calculation to ฿15.00');
} else {
  console.log('⚠️ Could not find exact oldCalc string, checking alternatives...');
  content = content.replace(
    /const deliveryFee\s*=\s*deliveryMethod\s*===\s*'delivery'\s*\?\s*0\s*:\s*0;/,
    "const deliveryFee = deliveryMethod === 'delivery' ? 15 : 0;"
  );
  content = content.replace(
    /const deliveryFeeText\s*=\s*deliveryFee\s*===\s*0\s*\?\s*'ฟรี'\s*:\s*'฿'\s*\+\s*Number\(deliveryFee\)\.toFixed\(2\);/,
    "const deliveryFeeText = deliveryMethod === 'delivery' ? '฿15.00' : 'ฟรี (รับเองที่ร้าน)';"
  );
  fs.writeFileSync(checkoutPath, content, 'utf8');
  console.log('✅ Replaced with regex fallback');
}
