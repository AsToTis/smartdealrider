const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== 1. PATCHING BACKEND ESCROW & RIDER EARNINGS RELEASE FLOW ===');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Update /api/orders/:orderId/complete to release both shop and rider funds
const oldOrderComplete = `    // 1. อัปเดตสถานะเป็น completed
    await connection.query('UPDATE orders SET order_status = "completed", delivered_at = NOW() WHERE order_id = ?', [orderId]);

    // 2. คำนวณยอดเงินร้านค้าและโอนเข้า Wallet
    const shopId = order.shop_id;
    const totalAmount = parseFloat(order.total_amount) || 0;
    const deliveryFee = parseFloat(order.delivery_fee) || 0;
    const shopAmount = totalAmount - deliveryFee;

    if (shopId && shopAmount > 0) {
      await connection.query(\`
        INSERT INTO shop_wallets (shop_id, balance) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)
      \`, [shopId, shopAmount]);

      await connection.query(\`
        INSERT INTO wallet_transactions (user_type, target_id, order_id, amount, type, description)
        VALUES ('shop', ?, ?, ?, 'credit', ?)
      \`, [shopId, orderId, shopAmount, \`รายรับจากออเดอร์ #\${orderId}\`]);
    }`;

const newOrderComplete = `    // 1. อัปเดตสถานะคำสั่งซื้อและการจัดส่งเป็น completed (เสร็จสมบูรณ์ 100%)
    await connection.query('UPDATE orders SET order_status = "completed", delivered_at = NOW() WHERE order_id = ?', [orderId]);
    await connection.query('UPDATE deliveries SET status = "completed", completed_at = NOW() WHERE order_id = ?', [orderId]);

    // 2. คำนวณและโอนเงินเข้ากระเป๋าร้านค้า (Merchant Escrow Release)
    const shopId = order.shop_id;
    const totalAmount = parseFloat(order.total_amount) || 0;
    const deliveryFee = parseFloat(order.delivery_fee) || 0;
    const shopAmount = totalAmount - deliveryFee;

    if (shopId && shopAmount > 0) {
      await connection.query(\`
        INSERT INTO shop_wallets (shop_id, balance) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)
      \`, [shopId, shopAmount]);

      await connection.query(\`
        INSERT INTO wallet_transactions (user_type, target_id, order_id, amount, type, description)
        VALUES ('shop', ?, ?, ?, 'credit', ?)
      \`, [shopId, orderId, shopAmount, \`รายรับจากออเดอร์ #\${orderId}\`]);
    }

    // 3. ปล่อยเงินค่ารอบเข้ากระเป๋าไรเดอร์เมื่อลูกค้ายืนยันรับสินค้าแล้วเท่านั้น (Rider Escrow Release)
    const [delRows] = await connection.query('SELECT rider_id FROM deliveries WHERE order_id = ?', [orderId]);
    if (delRows.length > 0 && delRows[0].rider_id && deliveryFee > 0) {
      const riderId = delRows[0].rider_id;
      await connection.query(\`
        INSERT INTO rider_wallets (rider_id, balance) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)
      \`, [riderId, deliveryFee]);

      await connection.query(\`
        INSERT INTO wallet_transactions (user_type, target_id, order_id, amount, type, description)
        VALUES ('rider', ?, ?, ?, 'credit', ?)
      \`, [riderId, orderId, deliveryFee, \`ค่ารอบจัดส่งออเดอร์ #\${orderId} (ลูกค้ายืนยันรับสินค้าแล้ว)\`]);
    }`;

if (serverContent.includes(oldOrderComplete)) {
  serverContent = serverContent.replace(oldOrderComplete, newOrderComplete);
  console.log('✅ Updated /api/orders/:orderId/complete with Rider Escrow Release');
}

// Update /api/rider/wallet to calculate earnings strictly from completed orders
const oldWalletRoute = `    } else {
      const [delivs] = await db.query("SELECT SUM(o.delivery_fee) as earned FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? AND d.status = 'delivered'", [riderId]);
      const [withdraws] = await db.query("SELECT SUM(amount) as withdrawn FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? AND type = 'debit'", [riderId]);
      const [pendingW] = await db.query("SELECT SUM(amount) as p_amount FROM withdrawals WHERE user_type = 'rider' AND rider_id = ? AND status = 'pending'", [riderId]);
      const pendingWithdrawn = pendingW[0]?.p_amount || 0;
      
      const earned = delivs[0].earned || 0;
      const withdrawn = withdraws[0].withdrawn || 0;
      balance = Number(earned) - Number(withdrawn);
    }

    const [todayStats] = await db.query("SELECT COUNT(d.id) as jobs, SUM(o.delivery_fee) as income FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? AND d.status = 'delivered' AND DATE(d.completed_at) = CURRENT_DATE()", [riderId]);
    const todayJobs = todayStats[0].jobs || 0;
    const todayIncome = todayStats[0].income || 0;

    const [deliveries] = await db.query("SELECT d.id, d.completed_at as created_at, o.delivery_fee as amount, 'credit' as type, s.name as description FROM deliveries d JOIN orders o ON d.order_id = o.order_id JOIN shops s ON o.shop_id = s.shop_id WHERE d.rider_id = ? AND d.status = 'delivered' ORDER BY d.completed_at DESC LIMIT 15", [riderId]);`;

const newWalletRoute = `    } else {
      // รายได้ที่เงินเข้ากระเป๋าใช้ได้จริง: นับเฉพาะออเดอร์ที่ลูกค้ายืนยันรับของแล้วเท่านั้น (completed)
      const [delivs] = await db.query("SELECT SUM(o.delivery_fee) as earned FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? AND (d.status = 'completed' OR o.order_status = 'completed')", [riderId]);
      const [withdraws] = await db.query("SELECT SUM(amount) as withdrawn FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? AND type = 'debit'", [riderId]);
      const [pendingW] = await db.query("SELECT SUM(amount) as p_amount FROM withdrawals WHERE user_type = 'rider' AND rider_id = ? AND status = 'pending'", [riderId]);
      const pendingWithdrawn = pendingW[0]?.p_amount || 0;
      
      const earned = delivs[0].earned || 0;
      const withdrawn = withdraws[0].withdrawn || 0;
      balance = Number(earned) - Number(withdrawn);
    }

    // ยอดเงินที่ส่งมอบแล้วแต่รอลูกค้ายืนยัน (Pending Customer Confirmation)
    const [pendingDelivs] = await db.query("SELECT SUM(o.delivery_fee) as pending_income, COUNT(d.id) as pending_jobs FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? AND d.status = 'delivered' AND o.order_status = 'delivered'", [riderId]);
    const pendingIncome = pendingDelivs[0]?.pending_income || 0;

    const [todayStats] = await db.query("SELECT COUNT(d.id) as jobs, SUM(o.delivery_fee) as income FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? AND (d.status = 'completed' OR o.order_status = 'completed') AND DATE(d.completed_at) = CURRENT_DATE()", [riderId]);
    const todayJobs = todayStats[0].jobs || 0;
    const todayIncome = todayStats[0].income || 0;

    const [deliveries] = await db.query("SELECT d.id, d.completed_at as created_at, o.delivery_fee as amount, 'credit' as type, s.name as description, d.status as delivery_status, o.order_status FROM deliveries d JOIN orders o ON d.order_id = o.order_id JOIN shops s ON o.shop_id = s.shop_id WHERE d.rider_id = ? AND (d.status = 'delivered' OR d.status = 'completed') ORDER BY d.completed_at DESC LIMIT 15", [riderId]);`;

if (serverContent.includes(oldWalletRoute)) {
  serverContent = serverContent.replace(oldWalletRoute, newWalletRoute);
  serverContent = serverContent.replace('res.json({ success: true, balance, todayIncome, todayJobs, history });', 'res.json({ success: true, balance, todayIncome, todayJobs, pendingIncome, history });');
  console.log('✅ Updated /api/rider/wallet to only credit confirmed completed orders');
}

// Update withdraw endpoint check
serverContent = serverContent.replace(
  "WHERE d.rider_id = ? AND d.status = 'delivered'",
  "WHERE d.rider_id = ? AND (d.status = 'completed' OR o.order_status = 'completed')"
);

fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('\n=== 2. PATCHING RIDER DELIVERY SCREEN SUCCESS MESSAGE ===');
const riderDeliveryPath = 'c:/smartdealrider/smartdeal-rider/src/app/delivery/[id].tsx';
let riderDeliveryContent = fs.readFileSync(riderDeliveryPath, 'utf8');

// Alert text in submitProofVerification for dropoff
const oldDropoffAlert = `Alert.alert('จัดส่งสำเร็จแล้ว 🎉', 'ระบบบันทึกหลักฐานและโอนเงินค่ารอบเข้ากระเป๋าเงินของคุณเรียบร้อยแล้ว', [
            { text: 'กลับหน้ารวมงาน', onPress: () => router.replace('/(tabs)') }
          ]);`;

const newDropoffAlert = `Alert.alert('ส่งมอบสินค้าเรียบร้อย 📦', 'ระบบได้บันทึกรูปหลักฐานและส่งแจ้งเตือนให้ลูกค้าตรวจสอบแล้ว\\n\\n💰 เงินค่ารอบจะถูกโอนเข้ากระเป๋าของคุณทันทีที่ลูกค้ายืนยันการรับสินค้าในระบบครับ', [
            { text: 'กลับหน้ารวมงาน', onPress: () => router.replace('/(tabs)') }
          ]);`;

if (riderDeliveryContent.includes(oldDropoffAlert)) {
  riderDeliveryContent = riderDeliveryContent.replace(oldDropoffAlert, newDropoffAlert);
  console.log('✅ Updated dropoff alert in delivery/[id].tsx');
}

fs.writeFileSync(riderDeliveryPath, riderDeliveryContent, 'utf8');

console.log('\n=== 3. COMMITTING AND PUSHING UPDATES ===');
try {
  execSync('git add smart-deal-backend/src/server.js', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git commit -m "feat: rider earnings strictly released upon customer receipt confirmation"', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  console.log('✅ smartdeal pushed successfully');
} catch (e) {
  console.log('smartdeal push error:', e.message);
}

try {
  execSync('git add smartdeal-rider/src/app/delivery/[id].tsx', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git commit -m "feat: update delivery completion message to indicate customer confirmation pending"', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  console.log('✅ smartdealrider pushed successfully');
} catch (e) {
  console.log('smartdealrider push error:', e.message);
}
