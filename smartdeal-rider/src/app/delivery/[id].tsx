import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

type DeliveryStatus = 'accepted' | 'arriving_shop' | 'picked_up' | 'delivering' | 'delivered';

type Job = {
  order_id: number;
  delivery_fee: number | string;
  delivery_status?: DeliveryStatus;
  shop_name: string;
  shop_address: string;
  shop_phone?: string;
  shop_lat?: number | string;
  shop_lng?: number | string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number | string;
  customer_lng?: number | string;
  distance?: string;
};

const steps: { key: DeliveryStatus; label: string; icon: string }[] = [
  { key: 'accepted', label: 'ไปร้านค้า', icon: 'store' },
  { key: 'arriving_shop', label: 'ถึงร้านแล้ว', icon: 'storefront' },
  { key: 'picked_up', label: 'รับสินค้าแล้ว', icon: 'bag-personal' },
  { key: 'delivering', label: 'กำลังไปส่ง', icon: 'moped' },
  { key: 'delivered', label: 'ส่งสำเร็จ', icon: 'check-circle' },
];

export default function DeliveryRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rider } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<DeliveryStatus>('accepted');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Photo Verification Modals State
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'dropoff'>('pickup');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const orderId = Number(id);
  const riderId = rider?.id || (rider as any)?.rider_id || 1;

  const fetchJob = async () => {
    if (!Number.isInteger(orderId)) { setLoading(false); return; }
    try {
      const response = await api.get(`/rider/jobs/${orderId}`);
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
  }, [id]);

  // Coords & Map Calculations
  const shopCoords = useMemo(() => {
    const sLat = parseFloat(String(job?.shop_lat));
    const sLng = parseFloat(String(job?.shop_lng));
    if (!isNaN(sLat) && !isNaN(sLng) && sLat !== 0 && sLng !== 0) {
      return { latitude: sLat, longitude: sLng };
    }
    return { latitude: 16.2354, longitude: 103.2515 }; // Default Mahasarakham
  }, [job]);

  const customerCoords = useMemo(() => {
    const cLat = parseFloat(String(job?.customer_lat));
    const cLng = parseFloat(String(job?.customer_lng));
    if (!isNaN(cLat) && !isNaN(cLng) && cLat !== 0 && cLng !== 0) {
      return { latitude: cLat, longitude: cLng };
    }
    return { latitude: shopCoords.latitude + 0.0108, longitude: shopCoords.longitude + 0.0084 };
  }, [job, shopCoords]);

  // Intermediate rider position depending on status
  const riderCoords = useMemo(() => {
    if (status === 'accepted' || status === 'arriving_shop') {
      return {
        latitude: shopCoords.latitude - 0.003,
        longitude: shopCoords.longitude - 0.002,
      };
    }
    if (status === 'delivering') {
      return {
        latitude: (shopCoords.latitude + customerCoords.latitude) / 2,
        longitude: (shopCoords.longitude + customerCoords.longitude) / 2,
      };
    }
    return customerCoords;
  }, [status, shopCoords, customerCoords]);

  const mapRegion = useMemo(() => {
    const midLat = (shopCoords.latitude + customerCoords.latitude) / 2;
    const midLng = (shopCoords.longitude + customerCoords.longitude) / 2;
    const latDelta = Math.max(0.02, Math.abs(shopCoords.latitude - customerCoords.latitude) * 2.2);
    const lngDelta = Math.max(0.02, Math.abs(shopCoords.longitude - customerCoords.longitude) * 2.2);
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [shopCoords, customerCoords]);

  // Center map on update
  useEffect(() => {
    if (job && mapRef.current) {
      try {
        mapRef.current.animateToRegion(mapRegion, 800);
      } catch (e) {}
    }
  }, [job, mapRegion]);

  const recenterMap = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(mapRegion, 600);
    }
  };

  // Handle standard status advance (e.g. arriving_shop)
  const updateStatusSimple = async (nextStatus: DeliveryStatus) => {
    if (!riderId) {
      Alert.alert('ไม่พบข้อมูลไรเดอร์', 'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่');
      return;
    }
    setUpdating(true);
    try {
      const response = await api.put(`/rider/deliveries/${orderId}/status`, {
        rider_id: riderId,
        status: nextStatus
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'อัปเดตสถานะไม่สำเร็จ');
      setStatus(nextStatus);
    } catch (error: any) {
      Alert.alert('อัปเดตสถานะไม่สำเร็จ', error.response?.data?.message || error.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setUpdating(false);
    }
  };

  // Open photo modal for pickup or dropoff
  const openProofModal = (type: 'pickup' | 'dropoff') => {
    setPhotoType(type);
    setCapturedPhoto(null);
    setPhotoModalVisible(true);
  };

  const handleTakeOrPickPhoto = async (useCamera: boolean = true) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('ต้องอนุญาตกล้อง', 'กรุณาอนุญาตการเข้าถึงกล้องเพื่อถ่ายรูปหลักฐาน');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('ต้องอนุญาตแกลเลอรี', 'กรุณาอนุญาตการเข้าถึงคลังรูปภาพ');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setCapturedPhoto(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setCapturedPhoto(asset.uri);
        }
      }
    } catch (e: any) {
      Alert.alert('ข้อผิดพลาด', e.message || 'ไม่สามารถถ่ายรูปได้');
    }
  };

  // Submit Photo Verification to Server
  const submitProofVerification = async () => {
    if (!capturedPhoto) {
      Alert.alert('กรุณาถ่ายรูป', 'ต้องถ่ายรูปหลักฐานก่อนกดยืนยัน');
      return;
    }

    try {
      setUploadingPhoto(true);
      if (photoType === 'pickup') {
        const res = await api.post(`/rider/deliveries/${orderId}/pickup`, {
          rider_id: riderId,
          pickup_proof_image: capturedPhoto,
        });
        if (res.data?.success) {
          setStatus('delivering');
          setPhotoModalVisible(false);
          Alert.alert('รับสินค้าเรียบร้อย 🎉', 'ระบบแจ้งเตือนร้านค้าและลูกค้าแล้ว ตอนนี้กำลังเดินทางไปส่งสินค้าครับ');
          fetchJob();
        } else {
          throw new Error(res.data?.message || 'บันทึกรูปรับสินค้าไม่สำเร็จ');
        }
      } else {
        const res = await api.post(`/rider/deliveries/${orderId}/complete`, {
          rider_id: riderId,
          proof_image_base64: capturedPhoto,
        });
        if (res.data?.success) {
          setStatus('delivered');
          setPhotoModalVisible(false);
          Alert.alert('ส่งมอบสินค้าเรียบร้อย 📦', 'ระบบได้บันทึกรูปหลักฐานและส่งแจ้งเตือนให้ลูกค้าตรวจสอบแล้ว\n\n💰 เงินค่ารอบจะถูกโอนเข้ากระเป๋าของคุณทันทีที่ลูกค้ายืนยันการรับสินค้าในระบบครับ', [
            { text: 'กลับหน้ารวมงาน', onPress: () => router.replace('/(tabs)') }
          ]);
        } else {
          throw new Error(res.data?.message || 'บันทึกรูปส่งสินค้าไม่สำเร็จ');
        }
      }
    } catch (error: any) {
      Alert.alert('ยืนยันไม่สำเร็จ', error.response?.data?.message || error.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openNavigation = async () => {
    if (!job) return;
    const toShop = status === 'accepted' || status === 'arriving_shop';
    const lat = toShop ? shopCoords.latitude : customerCoords.latitude;
    const lng = toShop ? shopCoords.longitude : customerCoords.longitude;
    const destination = `${lat},${lng}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(toShop ? job.shop_name : job.customer_name)}@${destination}`,
      android: `google.navigation:q=${destination}&mode=d`,
    }) || `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
      }
    } catch (e) {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    }
  };

  const makePhoneCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('แจ้งเตือน', 'ไม่มีหมายเลขโทรศัพท์ในระบบ');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const openChatWith = (target: 'seller' | 'buyer') => {
    router.push(`/chat/${orderId}?target=${target}` as any);
  };

  const currentStepIndex = useMemo(() => {
    if (status === 'delivered') return 4;
    if (status === 'delivering') return 3;
    if (status === 'picked_up') return 2;
    if (status === 'arriving_shop') return 1;
    return 0;
  }, [status]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>กำลังโหลดข้อมูลการจัดส่ง...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>ไม่พบข้อมูลงานนี้</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>กลับหน้ารวมงาน</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>ออเดอร์ #{job.order_id}</Text>
          <Text style={styles.headerSubtitle}>ระยะทางประมาณ {job.distance || '2.5 กม.'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerChatBtn} 
          onPress={() => router.push(`/chat/${job.order_id}` as any)}
        >
          <Ionicons name="chatbubbles" size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step Progress Bar */}
        <View style={styles.stepProgressBar}>
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent
                  ]}>
                    <MaterialCommunityIcons
                      name={step.icon as any}
                      size={14}
                      color={isCompleted || isCurrent ? '#fff' : '#94a3b8'}
                    />
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    (isCompleted || isCurrent) && styles.stepLabelActive
                  ]}>
                    {step.label}
                  </Text>
                </View>
                {idx < steps.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    idx < currentStepIndex && styles.stepLineActive
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Dynamic Route Map View with Native & Visual Fallback */}
        <View style={styles.mapContainer}>
          <MapView 
            ref={mapRef}
            style={styles.map} 
            provider={PROVIDER_DEFAULT}
            initialRegion={mapRegion}
            region={mapRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            toolbarEnabled={false}
          >
            {/* Route Line connecting Shop -> Customer */}
            <Polyline
              coordinates={[shopCoords, riderCoords, customerCoords]}
              strokeColor="#059669"
              strokeWidth={4}
              lineDashPattern={[6, 4]}
            />

            {/* Shop Marker */}
            <Marker coordinate={shopCoords} title={job.shop_name} description={job.shop_address}>
              <View style={styles.shopPinWrapper}>
                <View style={styles.shopPinCircle}>
                  <MaterialCommunityIcons name="storefront" size={16} color="#fff" />
                </View>
                <View style={styles.pinLabelBox}>
                  <Text style={styles.pinLabelText} numberOfLines={1}>{job.shop_name}</Text>
                </View>
              </View>
            </Marker>

            {/* Customer Marker */}
            <Marker coordinate={customerCoords} title={job.customer_name} description={job.customer_address}>
              <View style={styles.customerPinWrapper}>
                <View style={styles.customerPinCircle}>
                  <Ionicons name="location" size={16} color="#fff" />
                </View>
                <View style={[styles.pinLabelBox, { borderColor: '#fca5a5' }]}>
                  <Text style={[styles.pinLabelText, { color: '#ef4444' }]} numberOfLines={1}>จุดส่งลูกค้า</Text>
                </View>
              </View>
            </Marker>

            {/* Rider Animated Marker */}
            <Marker coordinate={riderCoords} title="ตำแหน่งของคุณ">
              <View style={styles.riderPinCircle}>
                <MaterialCommunityIcons name="motorbike" size={18} color="#fff" />
              </View>
            </Marker>
          </MapView>

          {/* Quick Map Action Floating Chips */}
          <View style={styles.mapFloatingActions}>
            <TouchableOpacity style={styles.recenterBtn} onPress={recenterMap}>
              <Ionicons name="locate" size={18} color="#059669" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.floatingNavBtn} onPress={openNavigation}>
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.floatingNavText}>เปิดแผนที่นำทาง</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Earnings Banner */}
        <View style={styles.feeBanner}>
          <View>
            <Text style={styles.feeBannerLabel}>ค่ารอบที่คุณจะได้รับ (รวมทิป)</Text>
            <Text style={styles.feeBannerAmount}>฿{Number(job.delivery_fee).toFixed(2)}</Text>
          </View>
          <View style={styles.directionTag}>
            <Text style={styles.directionTagText}>
              {status === 'delivering' ? '🛵 นำส่งให้ลูกค้า' : status === 'arriving_shop' ? '🏪 อยู่ที่ร้านค้า' : '📍 เดินทางไปร้าน'}
            </Text>
          </View>
        </View>

        {/* Store Card (Pickup) with Live Chat & Call */}
        <View style={[styles.card, (status === 'accepted' || status === 'arriving_shop') && styles.cardActiveTarget]}>
          <View style={styles.cardHeader}>
            <View style={styles.pickupPin}>
              <MaterialCommunityIcons name="storefront" size={16} color="#059669" />
            </View>
            <Text style={styles.cardTargetTitle}>จุดรับสินค้า (ร้านค้า)</Text>
            {(status === 'accepted' || status === 'arriving_shop') && (
              <View style={styles.currentStageBadge}>
                <Text style={styles.currentStageText}>ขั้นตอนปัจจุบัน</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardPrimaryText}>{job.shop_name}</Text>
          <Text style={styles.cardSubText}>{job.shop_address}</Text>

          {/* Action Row: Chat with Shop & Call Shop */}
          <View style={styles.contactRow}>
            <TouchableOpacity 
              style={styles.chatStoreBtn}
              onPress={() => openChatWith('seller')}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#0284c7" />
              <Text style={styles.chatStoreBtnText}>แชทกับร้านค้า</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.callStoreBtn}
              onPress={() => makePhoneCall(job.shop_phone || '021234567')}
            >
              <Ionicons name="call" size={16} color="#059669" />
              <Text style={styles.callStoreBtnText}>โทรหาร้าน</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Card (Dropoff) with Live Chat & Call */}
        <View style={[styles.card, status === 'delivering' && styles.cardActiveTarget]}>
          <View style={styles.cardHeader}>
            <View style={styles.dropoffPin}>
              <Ionicons name="location" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.cardTargetTitle, { color: '#ef4444' }]}>จุดส่งสินค้า (ลูกค้า)</Text>
            {status === 'delivering' && (
              <View style={[styles.currentStageBadge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.currentStageText, { color: '#ef4444' }]}>ขั้นตอนปัจจุบัน</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardPrimaryText}>{job.customer_name || 'ลูกค้า Smart Deal'}</Text>
          <Text style={styles.cardSubText}>{job.customer_address}</Text>

          {/* Action Row: Chat with Customer & Call Customer */}
          <View style={styles.contactRow}>
            <TouchableOpacity 
              style={styles.chatCustomerBtn}
              onPress={() => openChatWith('buyer')}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#059669" />
              <Text style={styles.chatCustomerBtnText}>แชทกับลูกค้า</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.callCustomerBtn}
              onPress={() => makePhoneCall(job.customer_phone)}
            >
              <Ionicons name="call" size={16} color="#059669" />
              <Text style={styles.callCustomerBtnText}>โทรหาลูกค้า</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sequential Sticky Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.navigationSecondaryBtn} onPress={openNavigation}>
          <MaterialCommunityIcons name="navigation-variant" size={20} color="#059669" />
          <Text style={styles.navigationSecondaryText}>นำทาง</Text>
        </TouchableOpacity>

        {status === 'accepted' ? (
          <TouchableOpacity
            disabled={updating}
            style={[styles.primaryActionBtn, updating && styles.btnDisabled]}
            onPress={() => updateStatusSimple('arriving_shop')}
          >
            {updating ? <ActivityIndicator color="#fff" /> : (
              <>
                <MaterialCommunityIcons name="storefront-check" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>ฉันมาถึงร้านแล้ว</Text>
              </>
            )}
          </TouchableOpacity>
        ) : status === 'arriving_shop' ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#0284c7' }]}
            onPress={() => openProofModal('pickup')}
          >
            <MaterialCommunityIcons name="camera" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>ถ่ายรูปยืนยันรับสินค้า</Text>
          </TouchableOpacity>
        ) : status === 'delivering' ? (
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
        )}
      </View>

      {/* Interactive Photo Confirmation Modal (Sequential Proof Verification) */}
      <Modal visible={photoModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <MaterialCommunityIcons 
                  name={photoType === 'pickup' ? 'storefront' : 'home'} 
                  size={24} 
                  color={photoType === 'pickup' ? '#0284c7' : '#059669'} 
                />
                <Text style={styles.modalTitle}>
                  {photoType === 'pickup' ? 'ถ่ายรูปยืนยันรับสินค้าจากร้าน' : 'ถ่ายรูปยืนยันส่งมอบสินค้าให้ลูกค้า'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstruction}>
              {photoType === 'pickup' 
                ? 'กรุณาถ่ายรูปอาหาร/ถุงสินค้าหรือใบเสร็จรับเงินที่ได้รับจากร้านค้า เพื่อยืนยันความถูกต้อง'
                : 'กรุณาถ่ายรูปสินค้า ณ จุดส่งมอบ หรือวางหน้าบ้านให้เห็นชัดเจนเพื่อเป็นหลักฐาน'}
            </Text>

            {/* Photo Capture / Preview Box */}
            <View style={styles.modalImageBox}>
              {capturedPhoto ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: capturedPhoto }} style={styles.capturedImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.retakeFloatingBtn} onPress={() => handleTakeOrPickPhoto(true)}>
                    <Ionicons name="camera-reverse" size={16} color="#fff" />
                    <Text style={styles.retakeFloatingText}>ถ่ายใหม่</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.captureOptions}>
                  <TouchableOpacity 
                    style={styles.cameraBtnLarge} 
                    onPress={() => handleTakeOrPickPhoto(true)}
                  >
                    <View style={styles.cameraIconBg}>
                      <Ionicons name="camera" size={32} color="#fff" />
                    </View>
                    <Text style={styles.cameraBtnTitle}>เปิดกล้องถ่ายรูป</Text>
                    <Text style={styles.cameraBtnSub}>ถ่ายรูปหลักฐานทันที</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.galleryBtnSmall} 
                    onPress={() => handleTakeOrPickPhoto(false)}
                  >
                    <Ionicons name="images-outline" size={18} color="#64748b" />
                    <Text style={styles.galleryBtnText}>เลือกรูปจากคลังภาพ</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Modal Confirm Button */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setPhotoModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                disabled={!capturedPhoto || uploadingPhoto}
                style={[
                  styles.confirmProofBtn, 
                  (!capturedPhoto || uploadingPhoto) && styles.confirmProofDisabled,
                  photoType === 'pickup' && { backgroundColor: '#0284c7' }
                ]}
                onPress={submitProofVerification}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmProofText}>
                      {photoType === 'pickup' ? 'ยืนยันรับสินค้า & เริ่มจัดส่ง' : 'ยืนยันจัดส่งสำเร็จ & รับเงิน'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 1,
  },
  headerChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  stepProgressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  stepItem: {
    alignItems: 'center',
    width: 54,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleCompleted: {
    backgroundColor: '#059669',
  },
  stepCircleCurrent: {
    backgroundColor: '#0284c7',
    transform: [{ scale: 1.1 }],
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginTop: -16,
  },
  stepLineActive: {
    backgroundColor: '#059669',
  },
  mapContainer: {
    width: '100%',
    height: 230,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e8f0',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  shopPinWrapper: {
    alignItems: 'center',
  },
  shopPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  customerPinWrapper: {
    alignItems: 'center',
  },
  customerPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  riderPinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  pinLabelBox: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginTop: 2,
    maxWidth: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'center',
  },
  mapFloatingActions: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recenterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingNavBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingNavText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  feeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  feeBannerLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  feeBannerAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
  },
  directionTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  directionTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  cardActiveTarget: {
    borderColor: '#059669',
    backgroundColor: '#fcfdfd',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pickupPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTargetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    flex: 1,
  },
  currentStageBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currentStageText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  cardPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  chatStoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  chatStoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  callStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  callStoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  chatCustomerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  chatCustomerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  callCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  callCustomerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  navigationSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 6,
  },
  navigationSecondaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalInstruction: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalImageBox: {
    height: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  retakeFloatingBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  retakeFloatingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  captureOptions: {
    alignItems: 'center',
    width: '100%',
    padding: 16,
  },
  cameraBtnLarge: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cameraBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cameraBtnSub: {
    fontSize: 11,
    color: '#64748b',
  },
  galleryBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  galleryBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  confirmProofBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmProofDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  confirmProofText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
