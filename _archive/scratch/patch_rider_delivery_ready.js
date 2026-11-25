const fs = require('fs');

const deliveryPath = 'C:/smartdealrider/smartdeal-rider/src/app/delivery/[id].tsx';
let code = fs.readFileSync(deliveryPath, 'utf8');

// 1. Add order_status to Job interface
code = code.replace(
  `type Job = {
  order_id: number;
  delivery_fee: number | string;
  delivery_status?: DeliveryStatus;`,
  `type Job = {
  order_id: number;
  delivery_fee: number | string;
  delivery_status?: DeliveryStatus;
  order_status?: string;`
);

// 2. Update fetchJob and polling
const oldFetchJob = `  const fetchJob = async () => {
    if (!Number.isInteger(orderId)) { setLoading(false); return; }
    try {
      const response = await api.get(\`/rider/jobs/\${orderId}\`);
      if (!response.data?.success) throw new Error(response.data?.message || 'ไม่พบข้อมูลงาน');
      const data = response.data.data as Job;
      
      // โครงสร้างค่าจัดส่งตาม System Control Panel (เริ่มต้น ฿35 + ฿8/กม. สำหรับ 2.5 กม. = ฿55.00)
      const baseFare = 35;
      const perKm = 8;
      const distNum = parseFloat((data as any).distance) || 2.5;
      const calculatedFare = Math.round(baseFare + (distNum * perKm));
      const feeNum = parseFloat(data.delivery_fee as any) || 0;
      data.delivery_fee = feeNum > 0 ? feeNum : calculatedFare;

      setJob(data);
      if (data.delivery_status) setStatus(data.delivery_status);
    } catch (error: any) {
      Alert.alert('โหลดงานไม่สำเร็จ', error.response?.data?.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);`;

const newFetchJob = `  const fetchJob = async (showLoading = false) => {
    if (!Number.isInteger(orderId)) { setLoading(false); return; }
    try {
      if (showLoading) setLoading(true);
      const response = await api.get(\`/rider/jobs/\${orderId}\`);
      if (!response.data?.success) throw new Error(response.data?.message || 'ไม่พบข้อมูลงาน');
      const data = response.data.data as Job;
      
      // โครงสร้างค่าจัดส่งตาม System Control Panel (เริ่มต้น ฿35 + ฿8/กม. สำหรับ 2.5 กม. = ฿55.00)
      const baseFare = 35;
      const perKm = 8;
      const distNum = parseFloat((data as any).distance) || 2.5;
      const calculatedFare = Math.round(baseFare + (distNum * perKm));
      const feeNum = parseFloat(data.delivery_fee as any) || 0;
      data.delivery_fee = feeNum > 0 ? feeNum : calculatedFare;

      setJob(data);
      if (data.delivery_status) setStatus(data.delivery_status);
    } catch (error: any) {
      if (showLoading) {
        Alert.alert('โหลดงานไม่สำเร็จ', error.response?.data?.message || 'กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob(true);
    // อัปเดตสถานะอัตโนมัติทุกๆ 3 วินาที เพื่อรับรู้ทันทีที่ร้านกดยืนยันพร้อมส่ง
    const interval = setInterval(() => {
      fetchJob(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);`;

if (code.includes(oldFetchJob)) {
  code = code.replace(oldFetchJob, newFetchJob);
  console.log('✅ Updated fetchJob with background polling');
}

// 3. Add isShopReady helper & check in openProofModal
const oldOpenProofModal = `  // Open photo modal for pickup or dropoff
  const openProofModal = (type: 'pickup' | 'dropoff') => {
    setPhotoType(type);
    setCapturedPhoto(null);
    setPhotoModalVisible(true);
  };`;

const newOpenProofModal = `  // Check if shop is ready with the food/items
  const isShopReady = job?.order_status === 'ready' || job?.order_status === 'delivering' || job?.order_status === 'delivered';

  // Open photo modal for pickup or dropoff (Strict Step 1 -> Step 2)
  const openProofModal = (type: 'pickup' | 'dropoff') => {
    if (type === 'pickup' && !isShopReady) {
      Alert.alert(
        'ร้านค้ายังเตรียมสินค้าไม่เสร็จ',
        'ร้านค้ายังไม่ได้กดยืนยันว่าอาหาร/สินค้าพร้อมส่ง กรุณารอทางร้านกดยืนยันในระบบ หรือติดต่อสอบถามทางแชทร้านค้าครับ',
        [
          { text: 'แชทกับร้านค้า', onPress: () => openChatWith('seller') },
          { text: 'เข้าใจแล้ว', style: 'cancel' }
        ]
      );
      return;
    }
    setPhotoType(type);
    setCapturedPhoto(null);
    setPhotoModalVisible(true);
  };`;

if (code.includes(oldOpenProofModal)) {
  code = code.replace(oldOpenProofModal, newOpenProofModal);
  console.log('✅ Updated openProofModal with isShopReady check');
}

// 4. Update top header chat button to pass target parameter
code = code.replace(
  `onPress={() => router.push(\`/chat/\${job.order_id}\` as any)}`,
  `onPress={() => {
          const activeTarget = (status === 'accepted' || status === 'arriving_shop') ? 'seller' : 'buyer';
          router.push(\`/chat/\${job.order_id}?target=\${activeTarget}\` as any);
        }}`
);
console.log('✅ Updated top header chat button target');

// 5. Update Store Card to show preparation status banner
const oldStoreCardEnd = `          <Text style={styles.cardPrimaryText}>{job.shop_name}</Text>
          <Text style={styles.cardSubText}>{job.shop_address}</Text>`;

const newStoreCardEnd = `          <Text style={styles.cardPrimaryText}>{job.shop_name}</Text>
          <Text style={styles.cardSubText}>{job.shop_address}</Text>

          {/* Shop Preparation Status Alert Banner */}
          {!isShopReady && (status === 'accepted' || status === 'arriving_shop') && (
            <View style={styles.shopStatusAlert}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#d97706" />
              <Text style={styles.shopStatusAlertText}>ร้านค้ากำลังจัดเตรียมสินค้า (ยังไม่พร้อมส่ง)</Text>
            </View>
          )}
          {isShopReady && (status === 'accepted' || status === 'arriving_shop') && (
            <View style={[styles.shopStatusAlert, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#059669" />
              <Text style={[styles.shopStatusAlertText, { color: '#059669' }]}>ร้านค้ากดยืนยันพร้อมส่งแล้ว ✅</Text>
            </View>
          )}`;

if (code.includes(oldStoreCardEnd)) {
  code = code.replace(oldStoreCardEnd, newStoreCardEnd);
  console.log('✅ Added shop preparation status banner to Store Card');
}

// 6. Update footer buttons for arriving_shop
const oldFooterArriving = `        ) : status === 'arriving_shop' ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#0284c7' }]}
            onPress={() => openProofModal('pickup')}
          >
            <MaterialCommunityIcons name="camera" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>ถ่ายรูปยืนยันรับสินค้า</Text>
          </TouchableOpacity>`;

const newFooterArriving = `        ) : status === 'arriving_shop' ? (
          isShopReady ? (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#0284c7' }]}
              onPress={() => openProofModal('pickup')}
            >
              <MaterialCommunityIcons name="camera" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionBtnText}>ถ่ายรูปยืนยันรับสินค้า</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#94a3b8' }]}
              onPress={() => {
                Alert.alert(
                  'ร้านค้ายังเตรียมสินค้าไม่เสร็จ',
                  'กรุณารอทางร้านกดยืนยัน "พร้อมส่งสินค้า" ในระบบก่อน คุณจึงจะสามารถกดยืนยันรับสินค้าได้ครับ\\n\\n(คุณสามารถกดแชทถามร้านค้าได้)',
                  [
                    { text: 'แชทถามร้านค้า', onPress: () => openChatWith('seller') },
                    { text: 'ตกลง', style: 'cancel' }
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="clock-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionBtnText}>⏳ รอร้านค้ากดพร้อมส่ง</Text>
            </TouchableOpacity>
          )`;

if (code.includes(oldFooterArriving)) {
  code = code.replace(oldFooterArriving, newFooterArriving);
  console.log('✅ Updated footer arriving_shop button with isShopReady condition');
}

// 7. Add styles for shopStatusAlert
if (!code.includes('shopStatusAlert:')) {
  code = code.replace(
    `const styles = StyleSheet.create({`,
    `const styles = StyleSheet.create({
  shopStatusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  shopStatusAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },`
  );
  console.log('✅ Added shopStatusAlert styles');
}

fs.writeFileSync(deliveryPath, code, 'utf8');
console.log('✅ Successfully patched smartdeal-rider delivery/[id].tsx');
