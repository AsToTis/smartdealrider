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

export interface ShopItem {
  name: string;
  quantity: number;
  price?: number;
}

export interface ShopStop {
  shop_id: number | string;
  shop_name: string;
  shop_address: string;
  shop_phone?: string;
  shop_lat?: number | string;
  shop_lng?: number | string;
  is_ready?: boolean;
  is_picked_up?: boolean;
  picked_up_at?: string;
  proof_image?: string;
  items?: ShopItem[];
}

export type Job = {
  order_id: number;
  delivery_fee: number | string;
  delivery_status?: DeliveryStatus;
  order_status?: string;
  shop_name?: string;
  shop_address?: string;
  shop_phone?: string;
  shop_lat?: number | string;
  shop_lng?: number | string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number | string;
  customer_lng?: number | string;
  distance?: string;
  shops?: ShopStop[];
  items?: any[];
};

const steps: { key: DeliveryStatus | string; label: string; icon: string }[] = [
  { key: 'accepted', label: 'ไปร้านค้า', icon: 'store' },
  { key: 'picked_up', label: 'รับสินค้าแล้ว', icon: 'bag-personal' },
  { key: 'delivering', label: 'กำลังไปส่ง', icon: 'moped' },
  { key: 'delivered', label: 'ส่งสำเร็จ', icon: 'check-circle' },
];

export default function DeliveryRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rider } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [shopsList, setShopsList] = useState<ShopStop[]>([]);
  const [status, setStatus] = useState<DeliveryStatus>('accepted');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Photo Verification Modals State
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'dropoff'>('pickup');
  const [targetShopForPickup, setTargetShopForPickup] = useState<ShopStop | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const orderId = Number(id);
  const riderId = rider?.id || (rider as any)?.rider_id || 1;

  // Normalize shops from raw order data
  const parseShopsFromJob = (data: any): ShopStop[] => {
    if (Array.isArray(data.shops) && data.shops.length > 0) {
      return data.shops.map((s: any, idx: number) => ({
        shop_id: s.shop_id || `shop_${idx + 1}`,
        shop_name: s.shop_name || `ร้านค้าที่ ${idx + 1}`,
        shop_address: s.shop_address || data.shop_address || 'ที่อยู่ร้านค้า',
        shop_phone: s.shop_phone || data.shop_phone || '021234567',
        shop_lat: s.shop_lat || s.latitude || data.shop_lat,
        shop_lng: s.shop_lng || s.longitude || data.shop_lng,
        is_ready: s.is_ready ?? (data.order_status === 'ready' || data.order_status === 'delivering' || data.order_status === 'delivered'),
        is_picked_up: s.is_picked_up ?? (data.delivery_status === 'delivering' || data.delivery_status === 'delivered'),
        items: Array.isArray(s.items) ? s.items : [],
      }));
    }

    // Parse from items if items contain shop info
    if (Array.isArray(data.items) && data.items.length > 0) {
      const map: { [key: string]: ShopStop } = {};
      data.items.forEach((item: any, idx: number) => {
        const sKey = String(item.shop_id || item.shop_name || data.shop_id || 'main_shop');
        if (!map[sKey]) {
          map[sKey] = {
            shop_id: item.shop_id || data.shop_id || idx + 1,
            shop_name: item.shop_name || data.shop_name || `ร้านค้าที่ ${Object.keys(map).length + 1}`,
            shop_address: item.shop_address || data.shop_address || 'ที่อยู่ร้านค้า',
            shop_phone: item.shop_phone || data.shop_phone || '021234567',
            shop_lat: item.shop_lat || item.latitude || data.shop_lat,
            shop_lng: item.shop_lng || item.longitude || data.shop_lng,
            is_ready: data.order_status === 'ready' || data.order_status === 'delivering' || data.order_status === 'delivered',
            is_picked_up: data.delivery_status === 'delivering' || data.delivery_status === 'delivered',
            items: [],
          };
        }
        map[sKey].items!.push({
          name: item.product_name || item.name || 'สินค้า',
          quantity: item.quantity || 1,
          price: item.price,
        });
      });
      const res = Object.values(map);
      if (res.length > 0) return res;
    }

    // Default fallback single shop
    return [
      {
        shop_id: data.shop_id || 1,
        shop_name: data.shop_name || 'ร้านค้าพาร์ทเนอร์',
        shop_address: data.shop_address || 'ที่อยู่ร้านค้า',
        shop_phone: data.shop_phone || '021234567',
        shop_lat: data.shop_lat,
        shop_lng: data.shop_lng,
        is_ready: data.order_status === 'ready' || data.order_status === 'delivering' || data.order_status === 'delivered',
        is_picked_up: data.delivery_status === 'delivering' || data.delivery_status === 'delivered',
        items: Array.isArray(data.items) ? data.items : [],
      }
    ];
  };

  const fetchJob = async (showLoading = false) => {
    if (!Number.isInteger(orderId)) { setLoading(false); return; }
    try {
      if (showLoading) setLoading(true);
      const response = await api.get(`/rider/jobs/${orderId}`);
      if (!response.data?.success) throw new Error(response.data?.message || 'ไม่พบข้อมูลงาน');
      const data = response.data.data as Job;
      
      const baseFare = 35;
      const perKm = 8;
      const distNum = parseFloat((data as any).distance) || 2.5;
      const parsedShops = parseShopsFromJob(data);
      const extraStopFee = parsedShops.length > 1 ? (parsedShops.length - 1) * 15 : 0;
      const calculatedFare = Math.round(baseFare + (distNum * perKm) + extraStopFee);
      const feeNum = parseFloat(data.delivery_fee as any) || 0;
      data.delivery_fee = feeNum > 0 ? feeNum : calculatedFare;

      setJob(data);
      setShopsList(prev => {
        // Keep local pickup checklist states if updated locally
        if (prev.length === parsedShops.length && prev.length > 0) {
          return parsedShops.map((ps, i) => ({
            ...ps,
            is_picked_up: prev[i]?.is_picked_up || ps.is_picked_up,
          }));
        }
        return parsedShops;
      });

      if (data.delivery_status) {
        setStatus(data.delivery_status);
      }
    } catch (error: any) {
      // Robust Fallback: Try to fetch from active deliveries in rider history
      try {
        const rId = rider?.id || (rider as any)?.rider_id || 1;
        const histRes = await api.get(`/rider/${rId}/history`);
        if (histRes.data?.success && Array.isArray(histRes.data?.data?.deliveries)) {
          const matched = histRes.data.data.deliveries.find((d: any) => Number(d.order_id) === orderId);
          if (matched) {
            const fallbackJob: Job = {
              order_id: Number(matched.order_id),
              delivery_fee: matched.delivery_fee || 35,
              delivery_status: matched.status,
              order_status: matched.order_status,
              shop_name: matched.shop_name || matched.restaurant_name || 'ร้านค้า',
              shop_address: matched.shop_address || 'ที่อยู่ร้านค้า',
              shop_phone: matched.shop_phone || '021234567',
              shop_lat: matched.shop_lat,
              shop_lng: matched.shop_lng,
              customer_name: matched.customer_name || 'ลูกค้า',
              customer_phone: matched.customer_phone || '0800000000',
              customer_address: matched.customer_address || matched.delivery_address || 'ที่อยู่ลูกค้า',
              customer_lat: matched.customer_lat,
              customer_lng: matched.customer_lng,
              distance: matched.distance || '2.5 กม.',
              items: []
            };
            setJob(fallbackJob);
            setShopsList(parseShopsFromJob(fallbackJob));
            if (matched.status) setStatus(matched.status);
            return;
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback fetch failed:', fallbackErr);
      }

      if (showLoading) {
        Alert.alert('โหลดงานไม่สำเร็จ', error.response?.data?.message || 'กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob(true);
    const interval = setInterval(() => {
      fetchJob(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [id]);

  // Coordinates & Multi-marker Calculations
  const shopCoordinatesList = useMemo(() => {
    const baseLat = 16.2354;
    const baseLng = 103.2515;
    return shopsList.map((shop, idx) => {
      const sLat = parseFloat(String(shop.shop_lat));
      const sLng = parseFloat(String(shop.shop_lng));
      if (!isNaN(sLat) && !isNaN(sLng) && sLat !== 0 && sLng !== 0) {
        return { shop, latitude: sLat, longitude: sLng };
      }
      // Offset slightly for visual separation if coordinates missing
      return { 
        shop, 
        latitude: baseLat + (idx * 0.0035), 
        longitude: baseLng + (idx * 0.0035) 
      };
    });
  }, [shopsList]);

  const primaryShopCoord = useMemo(() => {
    if (shopCoordinatesList.length > 0) {
      return { latitude: shopCoordinatesList[0].latitude, longitude: shopCoordinatesList[0].longitude };
    }
    return { latitude: 16.2354, longitude: 103.2515 };
  }, [shopCoordinatesList]);

  const customerCoords = useMemo(() => {
    const cLat = parseFloat(String(job?.customer_lat));
    const cLng = parseFloat(String(job?.customer_lng));
    if (!isNaN(cLat) && !isNaN(cLng) && cLat !== 0 && cLng !== 0) {
      return { latitude: cLat, longitude: cLng };
    }
    return { latitude: primaryShopCoord.latitude + 0.012, longitude: primaryShopCoord.longitude + 0.009 };
  }, [job, primaryShopCoord]);

  // Intermediate rider position
  const riderCoords = useMemo(() => {
    if (status === 'accepted' || status === 'arriving_shop') {
      return {
        latitude: primaryShopCoord.latitude - 0.003,
        longitude: primaryShopCoord.longitude - 0.002,
      };
    }
    if (status === 'delivering') {
      const lastShop = shopCoordinatesList[shopCoordinatesList.length - 1] || primaryShopCoord;
      return {
        latitude: (lastShop.latitude + customerCoords.latitude) / 2,
        longitude: (lastShop.longitude + customerCoords.longitude) / 2,
      };
    }
    return customerCoords;
  }, [status, primaryShopCoord, customerCoords, shopCoordinatesList]);

  // Map Region bounding box covering all shops and customer
  const mapRegion = useMemo(() => {
    const allLats = [...shopCoordinatesList.map(s => s.latitude), customerCoords.latitude, riderCoords.latitude];
    const allLngs = [...shopCoordinatesList.map(s => s.longitude), customerCoords.longitude, riderCoords.longitude];
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const latDelta = Math.max(0.025, (maxLat - minLat) * 1.8);
    const lngDelta = Math.max(0.025, (maxLng - minLng) * 1.8);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [shopCoordinatesList, customerCoords, riderCoords]);

  // Polyline points connecting Rider -> Shop 1 -> Shop 2 -> Customer
  const polylineCoords = useMemo(() => {
    const coords: { latitude: number; longitude: number }[] = [];
    coords.push(riderCoords);
    shopCoordinatesList.forEach(s => {
      coords.push({ latitude: s.latitude, longitude: s.longitude });
    });
    coords.push(customerCoords);
    return coords;
  }, [riderCoords, shopCoordinatesList, customerCoords]);

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

  // Next shop to visit (first shop not yet picked up)
  const nextShopToPickup = useMemo(() => {
    return shopsList.find(s => !s.is_picked_up) || shopsList[0] || null;
  }, [shopsList]);

  const pickedUpShopsCount = useMemo(() => {
    return shopsList.filter(s => s.is_picked_up).length;
  }, [shopsList]);

  const isAllShopsPickedUp = useMemo(() => {
    return shopsList.length > 0 && shopsList.every(s => s.is_picked_up);
  }, [shopsList]);

  // Open photo modal for pickup (specific shop) or dropoff
  const openProofModal = (type: 'pickup' | 'dropoff', shop?: ShopStop) => {
    setPhotoType(type);
    setTargetShopForPickup(shop || nextShopToPickup);
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
        const currentTargetShop = targetShopForPickup || nextShopToPickup;
        
        // Update the target shop pickup state
        const updatedShops = shopsList.map(s => {
          if (s.shop_id === currentTargetShop?.shop_id || (shopsList.length === 1)) {
            return { ...s, is_picked_up: true, proof_image: capturedPhoto };
          }
          return s;
        });
        setShopsList(updatedShops);

        const remainingShops = updatedShops.filter(s => !s.is_picked_up);
        const isCompletedAllPickups = remainingShops.length === 0;

        // Call backend API
        try {
          await api.post(`/rider/deliveries/${orderId}/pickup`, {
            rider_id: riderId,
            shop_id: currentTargetShop?.shop_id,
            pickup_proof_image: capturedPhoto,
            is_all_picked_up: isCompletedAllPickups
          });
        } catch (apiErr) {
          console.log('Pickup API note:', apiErr);
        }

        setPhotoModalVisible(false);

        if (isCompletedAllPickups) {
          setStatus('delivering');
          Alert.alert(
            'รับสินค้าครบทุกร้านแล้ว 🎉',
            `คุณได้รับสินค้าครบทั้ง ${updatedShops.length} ร้านค้าเรียบร้อยแล้ว ตอนนี้กำลังมุ่งหน้าไปส่งให้ลูกค้าครับ`
          );
        } else {
          Alert.alert(
            `รับของจาก "${currentTargetShop?.shop_name}" เรียบร้อย ✅`,
            `ยังเหลือสินค้าอีก ${remainingShops.length} ร้านค้า กรุณาเดินทางไปรับที่: ${remainingShops[0]?.shop_name}`
          );
        }
        fetchJob();
      } else {
        // Dropoff complete
        const res = await api.post(`/rider/deliveries/${orderId}/complete`, {
          rider_id: riderId,
          proof_image_base64: capturedPhoto,
        });
        if (res.data?.success) {
          setStatus('delivered');
          setPhotoModalVisible(false);
          Alert.alert(
            'ส่งมอบสินค้าเรียบร้อย 📦',
            'ระบบได้บันทึกรูปหลักฐานและส่งแจ้งเตือนให้ลูกค้าตรวจสอบแล้ว\n\n💰 เงินค่ารอบจะถูกโอนเข้ากระเป๋าของคุณทันทีที่ลูกค้ายืนยันการรับสินค้าในระบบครับ',
            [{ text: 'กลับหน้ารวมงาน', onPress: () => router.replace('/(tabs)') }]
          );
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

  const openNavigationTo = async (destinationType: 'shop' | 'customer', targetShop?: ShopStop) => {
    let lat: number, lng: number, title: string;
    if (destinationType === 'customer') {
      lat = customerCoords.latitude;
      lng = customerCoords.longitude;
      title = job?.customer_name || 'ลูกค้า';
    } else {
      const activeShop = targetShop || nextShopToPickup || shopsList[0];
      const matchCoord = shopCoordinatesList.find(s => s.shop.shop_id === activeShop?.shop_id);
      lat = matchCoord?.latitude || primaryShopCoord.latitude;
      lng = matchCoord?.longitude || primaryShopCoord.longitude;
      title = activeShop?.shop_name || 'ร้านค้า';
    }

    const destination = `${lat},${lng}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(title)}@${destination}`,
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

  const openChatWith = (target: 'seller' | 'buyer', shopId?: number | string) => {
    const shopQuery = shopId ? `&shop_id=${shopId}` : '';
    router.push(`/chat/${orderId}?target=${target}${shopQuery}` as any);
  };

  const currentStepIndex = useMemo(() => {
    if (status === 'delivered') return 3;
    if (status === 'delivering') return 2;
    if (status === 'picked_up' || isAllShopsPickedUp) return 1;
    return 0;
  }, [status, isAllShopsPickedUp]);

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

  const isMultiShop = shopsList.length > 1;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>ออเดอร์ #{job.order_id}</Text>
          <Text style={styles.headerSubtitle}>
            {isMultiShop 
              ? `แวะรับ ${shopsList.length} ร้านค้า • ระยะทาง ${job.distance || '2.5 กม.'}`
              : `ระยะทางประมาณ ${job.distance || '2.5 กม.'}`}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.headerChatBtn} 
          onPress={() => {
            const activeTarget = isAllShopsPickedUp ? 'buyer' : 'seller';
            openChatWith(activeTarget);
          }}
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

        {/* Dynamic Route Map View with Multi-Shop Markers */}
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
            {/* Route Line connecting Rider -> Shop 1 -> Shop 2 -> Customer */}
            <Polyline
              coordinates={polylineCoords}
              strokeColor="#059669"
              strokeWidth={4}
              lineDashPattern={[6, 4]}
            />

            {/* Multiple Shop Markers */}
            {shopCoordinatesList.map((item, idx) => {
              const isShopDone = item.shop.is_picked_up;
              return (
                <Marker 
                  key={`marker_shop_${item.shop.shop_id || idx}`}
                  coordinate={{ latitude: item.latitude, longitude: item.longitude }} 
                  title={item.shop.shop_name} 
                  description={item.shop.shop_address}
                >
                  <View style={styles.shopPinWrapper}>
                    <View style={[
                      styles.shopPinCircle,
                      isShopDone && { backgroundColor: '#10b981', borderColor: '#d1fae5' },
                      !isShopDone && isMultiShop && { backgroundColor: '#0284c7' }
                    ]}>
                      {isShopDone ? (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      ) : isMultiShop ? (
                        <Text style={styles.shopPinNumber}>{idx + 1}</Text>
                      ) : (
                        <MaterialCommunityIcons name="storefront" size={16} color="#fff" />
                      )}
                    </View>
                    <View style={[
                      styles.pinLabelBox,
                      isShopDone && { borderColor: '#a7f3d0' },
                      !isShopDone && isMultiShop && { borderColor: '#bae6fd' }
                    ]}>
                      <Text 
                        style={[
                          styles.pinLabelText,
                          isShopDone && { color: '#059669' },
                          !isShopDone && isMultiShop && { color: '#0284c7' }
                        ]} 
                        numberOfLines={1}
                      >
                        {isMultiShop ? `${idx + 1}. ${item.shop.shop_name}` : item.shop.shop_name}
                      </Text>
                    </View>
                  </View>
                </Marker>
              );
            })}

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

            {/* Rider Position Marker */}
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

            <TouchableOpacity 
              style={styles.floatingNavBtn} 
              onPress={() => openNavigationTo(isAllShopsPickedUp ? 'customer' : 'shop')}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.floatingNavText}>
                {isAllShopsPickedUp 
                  ? 'นำทางไปส่งลูกค้า' 
                  : isMultiShop 
                    ? `นำทางไปร้านที่ ${shopsList.findIndex(s => !s.is_picked_up) + 1 || 1}`
                    : 'นำทางไปร้านค้า'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Earnings Banner */}
        <View style={styles.feeBanner}>
          <View>
            <Text style={styles.feeBannerLabel}>
              ค่ารอบที่คุณจะได้รับ {isMultiShop ? `(รวมรับ ${shopsList.length} ร้านค้า)` : '(รวมทิป)'}
            </Text>
            <Text style={styles.feeBannerAmount}>฿{Number(job.delivery_fee).toFixed(2)}</Text>
          </View>
          <View style={[styles.directionTag, isMultiShop && { backgroundColor: '#e0f2fe' }]}>
            <Text style={[styles.directionTagText, isMultiShop && { color: '#0369a1' }]}>
              {isAllShopsPickedUp 
                ? '🛵 นำส่งให้ลูกค้า' 
                : isMultiShop 
                  ? `📍 รับสินค้า (${pickedUpShopsCount}/${shopsList.length} ร้าน)` 
                  : '📍 เดินทางไปรับสินค้าที่ร้าน'}
            </Text>
          </View>
        </View>

        {/* Multi-Shop Pickup Progress Tracker */}
        {isMultiShop && (
          <View style={styles.multiShopProgressCard}>
            <View style={styles.multiShopProgressHeader}>
              <View style={styles.multiShopProgressTitleBox}>
                <MaterialCommunityIcons name="store-clock-outline" size={18} color="#0284c7" />
                <Text style={styles.multiShopProgressTitle}>
                  จุดแวะรับสินค้าทั้งหมด ({shopsList.length} ร้านค้า)
                </Text>
              </View>
              <Text style={styles.multiShopProgressCounter}>
                รับแล้ว {pickedUpShopsCount}/{shopsList.length}
              </Text>
            </View>
            
            {/* Mini Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${(pickedUpShopsCount / Math.max(1, shopsList.length)) * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Interactive Store Cards List (Multi-Shop Support) */}
        {shopsList.map((shop, idx) => {
          const isCurrentActiveStop = !isAllShopsPickedUp && nextShopToPickup?.shop_id === shop.shop_id;
          const isDone = shop.is_picked_up;

          return (
            <View 
              key={`shop_card_${shop.shop_id || idx}`}
              style={[
                styles.card,
                isCurrentActiveStop && styles.cardActiveTarget,
                isDone && styles.cardCompletedShop
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[
                  styles.pickupPin,
                  isDone && { backgroundColor: '#10b981' },
                  isCurrentActiveStop && { backgroundColor: '#0284c7' }
                ]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : isMultiShop ? (
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{idx + 1}</Text>
                  ) : (
                    <MaterialCommunityIcons name="storefront" size={14} color="#fff" />
                  )}
                </View>
                <Text style={[styles.cardTargetTitle, isDone && { color: '#059669' }]}>
                  {isMultiShop ? `จุดรับที่ ${idx + 1} (${shop.shop_name})` : 'จุดรับสินค้า (ร้านค้า)'}
                </Text>
                
                {isDone ? (
                  <View style={[styles.currentStageBadge, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.currentStageText, { color: '#16a34a' }]}>รับแล้ว ✅</Text>
                  </View>
                ) : isCurrentActiveStop ? (
                  <View style={styles.currentStageBadge}>
                    <Text style={styles.currentStageText}>แวะรับร้านนี้ 🛵</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.cardPrimaryText}>{shop.shop_name}</Text>
              <Text style={styles.cardSubText}>{shop.shop_address}</Text>

              {/* Items in this shop */}
              {Array.isArray(shop.items) && shop.items.length > 0 && (
                <View style={styles.shopItemsBox}>
                  <Text style={styles.shopItemsHeader}>รายการที่ต้องรับจากร้านนี้:</Text>
                  {shop.items.map((it, itIdx) => (
                    <View key={`it_${itIdx}`} style={styles.shopItemRow}>
                      <MaterialCommunityIcons name="circle-medium" size={16} color="#0284c7" />
                      <Text style={styles.shopItemName}>{it.name}</Text>
                      <Text style={styles.shopItemQty}>x{it.quantity || 1}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Shop Preparation Status */}
              {!isDone && (
                <View style={[
                  styles.shopStatusAlert,
                  shop.is_ready && { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }
                ]}>
                  <MaterialCommunityIcons 
                    name={shop.is_ready ? "check-circle" : "clock-outline"} 
                    size={16} 
                    color={shop.is_ready ? "#059669" : "#d97706"} 
                  />
                  <Text style={[
                    styles.shopStatusAlertText,
                    shop.is_ready && { color: '#059669' }
                  ]}>
                    {shop.is_ready ? 'ร้านค้ากดยืนยันพร้อมส่งแล้ว ✅' : 'ร้านค้ากำลังจัดเตรียมสินค้า'}
                  </Text>
                </View>
              )}

              {/* Action Row: Chat, Call & Navigate per shop */}
              <View style={styles.contactRow}>
                <TouchableOpacity 
                  style={styles.chatStoreBtn}
                  onPress={() => openChatWith('seller', shop.shop_id)}
                >
                  <Ionicons name="chatbubble-ellipses" size={15} color="#0284c7" />
                  <Text style={styles.chatStoreBtnText}>แชท</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.callStoreBtn}
                  onPress={() => makePhoneCall(shop.shop_phone)}
                >
                  <Ionicons name="call" size={15} color="#059669" />
                  <Text style={styles.callStoreBtnText}>โทร</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navStoreBtn}
                  onPress={() => openNavigationTo('shop', shop)}
                >
                  <Ionicons name="navigate-outline" size={15} color="#7c3aed" />
                  <Text style={styles.navStoreBtnText}>นำทาง</Text>
                </TouchableOpacity>

                {!isDone && (
                  <TouchableOpacity 
                    style={styles.pickupIndividualBtn}
                    onPress={() => openProofModal('pickup', shop)}
                  >
                    <MaterialCommunityIcons name="camera-plus" size={15} color="#fff" />
                    <Text style={styles.pickupIndividualBtnText}>ถ่ายรูปรับ</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Customer Card (Dropoff) with Live Chat & Call */}
        <View style={[styles.card, isAllShopsPickedUp && styles.cardActiveTarget]}>
          <View style={styles.cardHeader}>
            <View style={styles.dropoffPin}>
              <Ionicons name="location" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.cardTargetTitle, { color: '#ef4444' }]}>จุดส่งสินค้า (ลูกค้า)</Text>
            {isAllShopsPickedUp && status !== 'delivered' && (
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
        <TouchableOpacity 
          style={styles.navigationSecondaryBtn} 
          onPress={() => openNavigationTo(isAllShopsPickedUp ? 'customer' : 'shop')}
        >
          <MaterialCommunityIcons name="navigation-variant" size={20} color="#059669" />
          <Text style={styles.navigationSecondaryText}>นำทาง</Text>
        </TouchableOpacity>

        {!isAllShopsPickedUp ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#0284c7' }]}
            onPress={() => openProofModal('pickup', nextShopToPickup || undefined)}
          >
            <MaterialCommunityIcons name="camera" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>
              {isMultiShop 
                ? `ถ่ายรูปรับของ (${nextShopToPickup?.shop_name || 'ร้านถัดไป'})`
                : 'ถ่ายรูปยืนยันรับสินค้า'}
            </Text>
          </TouchableOpacity>
        ) : status !== 'delivered' ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
            onPress={() => openProofModal('dropoff')}
          >
            <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>ถ่ายรูปส่งมอบสินค้าให้ลูกค้า</Text>
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

      {/* Interactive Photo Confirmation Modal */}
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
                  {photoType === 'pickup' 
                    ? `ถ่ายรูปรับสินค้า (${targetShopForPickup?.shop_name || 'ร้านค้า'})`
                    : 'ถ่ายรูปยืนยันส่งมอบสินค้าให้ลูกค้า'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstruction}>
              {photoType === 'pickup' 
                ? `กรุณาถ่ายรูปถุงสินค้า/อาหารหรือใบเสร็จที่ได้รับจาก "${targetShopForPickup?.shop_name || 'ร้านค้า'}" เพื่อยืนยันความถูกต้อง`
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
                      {photoType === 'pickup' ? 'ยืนยันรับสินค้าร้านนี้' : 'ยืนยันจัดส่งสำเร็จ & รับเงิน'}
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
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    paddingBottom: 120,
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
    height: 240,
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
  shopPinNumber: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
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
    maxWidth: 120,
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
  multiShopProgressCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  multiShopProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  multiShopProgressTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  multiShopProgressTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
  },
  multiShopProgressCounter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e0f2fe',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 3,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  cardActiveTarget: {
    borderColor: '#0284c7',
    backgroundColor: '#fcfdfd',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCompletedShop: {
    borderColor: '#dcfce7',
    backgroundColor: '#fafefc',
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
    backgroundColor: '#059669',
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
    color: '#0f172a',
    flex: 1,
  },
  currentStageBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currentStageText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
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
    marginBottom: 8,
  },
  shopItemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  shopItemsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  shopItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  shopItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  shopItemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  shopStatusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 6,
  },
  shopStatusAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chatStoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  chatStoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  callStoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  callStoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  navStoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f3ff',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  navStoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  pickupIndividualBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  pickupIndividualBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
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
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
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
