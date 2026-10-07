const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== 1. FIXING RIDER DELIVERY SCREEN ICONS & STATUS FLOW ===');
const riderDeliveryPath = 'c:/smartdealrider/smartdeal-rider/src/app/delivery/[id].tsx';
let riderContent = fs.readFileSync(riderDeliveryPath, 'utf8');

// Replace any invalid icon names and improve the button layout
const oldButtonCode = `        ) : status === 'delivering' ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
            onPress={() => openProofModal('dropoff')}
          >
            <MaterialCommunityIcons name="camera-check" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>ถ่ายรูปส่งมอบ & จบงาน</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>งานจัดส่งสำเร็จแล้ว</Text>
          </TouchableOpacity>
        )}`;

const newButtonCode = `        ) : status === 'delivering' ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
            onPress={() => openProofModal('dropoff')}
          >
            <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>ถ่ายรูปส่งมอบสินค้า</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="checkmark-done-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>ส่งมอบแล้ว (รอลูกค้ายืนยัน)</Text>
          </TouchableOpacity>
        )}`;

if (riderContent.includes(oldButtonCode)) {
  riderContent = riderContent.replace(oldButtonCode, newButtonCode);
  console.log('✅ Fixed button icon and text in delivery/[id].tsx');
} else {
  // Regex fallback
  riderContent = riderContent.replace(
    /<MaterialCommunityIcons name="camera-check"[^>]*\/>\s*<Text style=\{styles\.primaryActionBtnText\}>ถ่ายรูปส่งมอบ & จบงาน<\/Text>/,
    `<Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />\n            <Text style={styles.primaryActionBtnText}>ถ่ายรูปส่งมอบสินค้า</Text>`
  );
  console.log('✅ Replaced icon using regex in delivery/[id].tsx');
}

// Ensure valid icon names in modal header
riderContent = riderContent.replace(
  `name={photoType === 'pickup' ? 'bag-personal-plus' : 'hand-heart'}`,
  `name={photoType === 'pickup' ? 'storefront' : 'home'}`
);

fs.writeFileSync(riderDeliveryPath, riderContent, 'utf8');

console.log('\n=== 2. ENHANCING BACKEND TRACKING ROUTE WITH PROOF IMAGES ===');
const backendPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let backendContent = fs.readFileSync(backendPath, 'utf8');

const oldTrackingSelect = `        del.status,
        del.assigned_at,
        del.delivered_at,`;

const newTrackingSelect = `        del.status,
        del.assigned_at,
        del.delivered_at,
        del.proof_image,
        del.pickup_proof_image,`;

if (backendContent.includes(oldTrackingSelect)) {
  backendContent = backendContent.replace(oldTrackingSelect, newTrackingSelect);
}

const oldTrackingObj = `      shipping_address: order.shipping_address,`;
const newTrackingObj = `      shipping_address: order.shipping_address,
      proof_image: order.proof_image || null,
      pickup_proof_image: order.pickup_proof_image || null,`;

if (backendContent.includes(oldTrackingObj) && !backendContent.includes('proof_image: order.proof_image')) {
  backendContent = backendContent.replace(oldTrackingObj, newTrackingObj);
  console.log('✅ Added proof_image and pickup_proof_image to tracking endpoint');
}

fs.writeFileSync(backendPath, backendContent, 'utf8');

console.log('\n=== 3. ENHANCING BUYER ORDER-TRACKING.TSX WITH CUSTOMER RECEIPT CONFIRMATION ===');
const buyerTrackingPath = 'C:/smartdeal/smart-deal-app/src/app/order-tracking.tsx';
let buyerTrackingContent = fs.readFileSync(buyerTrackingPath, 'utf8');

// Add handleConfirmReceipt function if not present
if (!buyerTrackingContent.includes('handleConfirmReceipt')) {
  const confirmReceiptFn = `  const [confirming, setConfirming] = useState(false);

  const handleConfirmReceipt = async () => {
    try {
      setConfirming(true);
      const res = await axios.put(\`\${BASE_URL}/orders/\${orderId}/complete\`);
      if (res.data?.success) {
        Alert.alert('ยินดีด้วย 🎉', 'คุณได้ยืนยันการรับสินค้าเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ Smart Deal ครับ', [
          { text: 'ให้คะแนนความพึงพอใจ', onPress: () => router.push({
            pathname: '/review',
            params: {
              order_id: orderId,
              shop_name: tracking?.shop_name,
              product_name: tracking?.items?.[0]?.product_name || 'อาหารจานโปรด'
            }
          }) }
        ]);
        fetchTrackingData();
      } else {
        throw new Error(res.data?.message || 'ยืนยันไม่สำเร็จ');
      }
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e.response?.data?.message || e.message || 'ไม่สามารถยืนยันรับสินค้าได้');
    } finally {
      setConfirming(false);
    }
  };
`;

  buyerTrackingContent = buyerTrackingContent.replace(
    '  const fetchTrackingData = async () => {',
    confirmReceiptFn + '\n  const fetchTrackingData = async () => {'
  );

  // Add the confirmation card before rider card
  const proofCardUI = `
          {/* Customer Confirmation Card when Delivered */}
          {((tracking?.order_status === 'delivered' || tracking?.order_status === 'completed' || tracking?.proof_image)) && (
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 18,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: tracking?.order_status === 'completed' ? '#86efac' : '#16a34a',
              shadowColor: '#16a34a',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <MaterialIcons name="verified" size={22} color="#16a34a" />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>
                  {tracking?.order_status === 'completed' ? 'คำสั่งซื้อเสร็จสมบูรณ์' : 'ไรเดอร์ส่งมอบสินค้าเรียบร้อยแล้ว'}
                </Text>
              </View>

              {tracking?.proof_image && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>หลักฐานรูปถ่ายส่งมอบสินค้าจากไรเดอร์:</Text>
                  <Image 
                    source={{ uri: tracking.proof_image.startsWith('http') || tracking.proof_image.startsWith('data:') ? tracking.proof_image : \`https://smartdeal-backend-vhjo.onrender.com\${tracking.proof_image}\` }} 
                    style={{ width: '100%', height: 180, borderRadius: 14 }} 
                    resizeMode="cover"
                  />
                </View>
              )}

              {tracking?.order_status === 'delivered' && (
                <TouchableOpacity
                  disabled={confirming}
                  style={{
                    backgroundColor: '#16a34a',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 14,
                    borderRadius: 14,
                    gap: 8
                  }}
                  onPress={handleConfirmReceipt}
                >
                  {confirming ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                        ฉันได้รับสินค้าเรียบร้อยแล้ว (ยืนยันรับสินค้า)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
`;

  buyerTrackingContent = buyerTrackingContent.replace(
    '{/* 4. Rider Profile Card */}',
    proofCardUI + '\n          {/* 4. Rider Profile Card */}'
  );

  fs.writeFileSync(buyerTrackingPath, buyerTrackingContent, 'utf8');
  console.log('✅ Added customer confirmation and delivery proof photo card to buyer order-tracking.tsx');
}

console.log('\n=== 4. COMMITTING AND PUSHING UPDATES ===');
try {
  execSync('git add smart-deal-backend/src/server.js smart-deal-app/src/app/order-tracking.tsx', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git commit -m "feat: customer confirmation flow with delivery proof photo"', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  console.log('✅ smartdeal pushed successfully');
} catch (e) {
  console.log('smartdeal push result:', e.message);
}

try {
  execSync('git add smartdeal-rider/src/app/delivery/[id].tsx', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git commit -m "fix: resolve button icon bug and improve customer confirmation status flow"', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  console.log('✅ smartdealrider pushed successfully');
} catch (e) {
  console.log('smartdealrider push result:', e.message);
}
