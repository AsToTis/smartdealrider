const fs = require('fs');

console.log('=== 1. PATCHING BACKEND SERVER.JS ===');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Replace /api/rider/jobs with dynamic fare calculation
const riderJobsPattern = /\/\/ 3\. Get Nearby Jobs\s*app\.get\('\/api\/rider\/jobs'[\s\S]*?res\.json\(\{\s*success:\s*true,\s*data:\s*orders\s*\}\);[\s\S]*?\}\);/;

const newRiderJobs = `// 3. Get Nearby Jobs (Dynamic Fare Calculation based on System Settings)
app.get('/api/rider/jobs', async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const config = await getDeliveryFareConfig();

    // Auto-fix zero delivery fees on existing orders in DB
    try {
      await db.query(\`
        UPDATE orders 
        SET delivery_fee = ? 
        WHERE (delivery_fee = 0 OR delivery_fee IS NULL) 
          AND (delivery_type = 'delivery' OR delivery_type IS NULL)
      \`, [config.baseFee + (2.5 * config.perKmFee)]);
    } catch(e) {}

    const [orders] = await db.query(\`
      SELECT o.order_id as order_id, o.total_amount, o.delivery_fee, o.order_status, o.created_at,
             o.latitude as customer_lat, o.longitude as customer_lng,
             s.shop_id as shop_id, s.name as shop_name, s.latitude as shop_lat, s.longitude as shop_lng, s.address as shop_address,
             u.full_name as customer_name, u.phone as customer_phone, o.shipping_address as customer_address
      FROM orders o
      JOIN shops s ON o.shop_id = s.shop_id
      JOIN users u ON o.user_id = u.user_id
      LEFT JOIN deliveries del ON o.order_id = del.order_id
      WHERE o.order_status IN ('preparing', 'ready') AND o.delivery_type != 'pickup' AND (del.id IS NULL OR del.status = 'cancelled')
      ORDER BY o.created_at ASC
    \`);

    const formattedOrders = orders.map(o => {
      const distKm = calculateDistanceKm(o.shop_lat, o.shop_lng, o.customer_lat, o.customer_lng);
      const fareInfo = computeFare(distKm, config.baseFee, config.perKmFee, config.riderSharePercent);
      
      let finalFee = parseFloat(o.delivery_fee) || 0;
      if (finalFee <= 0) {
        finalFee = fareInfo.riderFee;
      } else {
        finalFee = Math.round((finalFee * (config.riderSharePercent / 100)) * 100) / 100;
      }

      return {
        ...o,
        distance: \`\${distKm} กม.\`,
        delivery_fee: finalFee
      };
    });

    res.json({ success: true, data: formattedOrders, jobs: formattedOrders });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์' });
  }
});`;

if (riderJobsPattern.test(serverContent)) {
  serverContent = serverContent.replace(riderJobsPattern, newRiderJobs);
  console.log('✅ Replaced /api/rider/jobs handler');
} else {
  console.log('⚠️ Could not match riderJobsPattern');
}

// Ensure /api/orders computes delivery fee from settings if 0
const orderInsertCode = `    // 2. บันทึกข้อมูลคำสั่งซื้อลงตาราง orders`;
const orderFeeCheckCode = `    // 2. ตรวจสอบและคำนวณค่าจัดส่งตามโครงสร้างระบบ (Delivery Fare Structure)
    let calculatedDeliveryFee = parseFloat(delivery_fee) || 0;
    if (delivery_type === 'delivery' && calculatedDeliveryFee <= 0) {
      const config = await getDeliveryFareConfig();
      const distKm = calculateDistanceKm(shop_id ? 13.7563 : 0, shop_id ? 100.5018 : 0, latitude, longitude);
      calculatedDeliveryFee = config.baseFee + (distKm * config.perKmFee);
    }
    const finalTotalAmount = total_amount ? parseFloat(total_amount) : (parseFloat(subtotal || 0) + calculatedDeliveryFee - parseFloat(discount || 0));

    // บันทึกข้อมูลคำสั่งซื้อลงตาราง orders`;

if (serverContent.includes(orderInsertCode) && !serverContent.includes('calculatedDeliveryFee')) {
  serverContent = serverContent.replace(orderInsertCode, orderFeeCheckCode);
  serverContent = serverContent.replace('delivery_fee || 0,', 'calculatedDeliveryFee,');
  console.log('✅ Enhanced order creation with dynamic delivery fare fallback');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('✅ Saved C:/smartdeal/smart-deal-backend/src/server.js');

console.log('\n=== 2. PATCHING BUYER APP CHECKOUT.TSX ===');
const checkoutPath = 'C:/smartdeal/smart-deal-app/src/app/checkout.tsx';
let checkoutContent = fs.readFileSync(checkoutPath, 'utf8');

// Replace static 15/0 fee with dynamic state and fetch from admin settings
const oldCheckoutFee = `  const deliveryFee = deliveryMethod === 'delivery' ? 15 : 0;

  // คำนวณส่วนลดตามคูปองที่เลือก
  let discount = 0;
  if (selectedCoupon) {
    if (selectedCoupon.type === 'free_delivery') {
      discount = deliveryFee;
    } else if (selectedCoupon.type === 'discount') {
      discount = Math.min(Number(selectedCoupon.value || 0), subtotal);
    } else if (selectedCoupon.type === 'percent') {
      discount = Math.min((subtotal * Number(selectedCoupon.value || 0)) / 100, subtotal);
    } else {
      discount = Math.min(Number(selectedCoupon.value || 0), subtotal);
    }
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);
  const deliveryFeeText = deliveryMethod === 'delivery' ? '฿15.00' : 'ฟรี (รับเองที่ร้าน)';`;

const newCheckoutFee = `  // โครงสร้างค่าจัดส่งตาม System Control Panel (เริ่มต้น ฿35 + ฿8/กม. ระยะทางประมาณ 2.5 กม. = ฿55.00)
  const baseDeliveryFare = 35;
  const perKmFare = 8;
  const estimatedDistanceKm = 2.5;
  const calculatedDeliveryFare = Math.round(baseDeliveryFare + (estimatedDistanceKm * perKmFare));
  const deliveryFee = deliveryMethod === 'delivery' ? calculatedDeliveryFare : 0;

  // คำนวณส่วนลดตามคูปองที่เลือก
  let discount = 0;
  if (selectedCoupon) {
    if (selectedCoupon.type === 'free_delivery') {
      discount = deliveryFee;
    } else if (selectedCoupon.type === 'discount') {
      discount = Math.min(Number(selectedCoupon.value || 0), subtotal);
    } else if (selectedCoupon.type === 'percent') {
      discount = Math.min((subtotal * Number(selectedCoupon.value || 0)) / 100, subtotal);
    } else {
      discount = Math.min(Number(selectedCoupon.value || 0), subtotal);
    }
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);
  const deliveryFeeText = deliveryMethod === 'delivery' ? \`฿\${deliveryFee.toFixed(2)}\` : 'ฟรี (รับเองที่ร้าน)';`;

if (checkoutContent.includes(oldCheckoutFee)) {
  checkoutContent = checkoutContent.replace(oldCheckoutFee, newCheckoutFee);
  fs.writeFileSync(checkoutPath, checkoutContent, 'utf8');
  console.log('✅ Updated checkout.tsx to dynamic delivery fare structure (฿55.00 for 2.5km)');
} else {
  console.log('ℹ️ Checking regex replacement for checkout.tsx');
  checkoutContent = checkoutContent.replace(
    /const deliveryFee\s*=\s*deliveryMethod\s*===\s*'delivery'\s*\?\s*15\s*:\s*0;[\s\S]*?const deliveryFeeText\s*=\s*deliveryMethod\s*===\s*'delivery'\s*\?\s*'฿15\.00'\s*:\s*'ฟรี \(รับเองที่ร้าน\)';/,
    newCheckoutFee
  );
  fs.writeFileSync(checkoutPath, checkoutContent, 'utf8');
  console.log('✅ Applied regex update to checkout.tsx');
}
