import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

type DeliveryStatus = 'accepted' | 'arriving_shop' | 'picked_up' | 'delivering';
type Job = {
  order_id: number;
  delivery_fee: number | string;
  delivery_status?: DeliveryStatus;
  shop_name: string;
  shop_address: string;
  shop_lat?: number | string;
  shop_lng?: number | string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number | string;
  customer_lng?: number | string
};

const steps: { key: DeliveryStatus; label: string; icon: string }[] = [
  { key: 'accepted', label: 'ไปร้านค้า', icon: 'store' },
  { key: 'arriving_shop', label: 'ถึงร้านแล้ว', icon: 'storefront' },
  { key: 'picked_up', label: 'รับอาหารแล้ว', icon: 'bag-personal' },
  { key: 'delivering', label: 'กำลังส่ง', icon: 'moped' },
];

export default function DeliveryRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rider } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<DeliveryStatus>('accepted');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const orderId = Number(id);
  const riderId = rider?.id || (rider as any)?.rider_id;

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

  const updateStatus = async (nextStatus: DeliveryStatus) => {
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

  const openNavigation = async () => {
    if (!job) return;
    const toShop = status === 'accepted' || status === 'arriving_shop';
    const lat = toShop ? job.shop_lat : job.customer_lat;
    const lng = toShop ? job.shop_lng : job.customer_lng;
    const destination = lat && lng ? `${lat},${lng}` : encodeURIComponent(toShop ? job.shop_address : job.customer_address);
    await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
  };

  const makePhoneCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('แจ้งเตือน', 'ไม่มีหมายเลขโทรศัพท์');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const currentStepIndex = useMemo(() => {
    return steps.findIndex(s => s.key === status);
  }, [status]);

  const region = useMemo(() => ({
    latitude: Number(job?.shop_lat) || 13.7563,
    longitude: Number(job?.shop_lng) || 100.5018,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04
  }), [job]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
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

  const next = status === 'accepted'
    ? { label: 'ฉันมาถึงร้านแล้ว', value: 'arriving_shop' as DeliveryStatus }
    : status === 'arriving_shop'
      ? { label: 'ยืนยันรับสินค้าแล้ว', value: 'picked_up' as DeliveryStatus }
      : status === 'picked_up'
        ? { label: 'เริ่มออกจัดส่งให้ลูกค้า', value: 'delivering' as DeliveryStatus }
        : null;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ออเดอร์ #{job.order_id}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={fetchJob}>
          <Ionicons name="refresh" size={22} color="#0f172a" />
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

        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <MapView style={styles.map} initialRegion={region}>
            <Marker
              coordinate={{
                latitude: Number(job.shop_lat) || region.latitude,
                longitude: Number(job.shop_lng) || region.longitude
              }}
              title={job.shop_name}
              pinColor="#059669"
            />
            {job.customer_lat && job.customer_lng && (
              <Marker
                coordinate={{
                  latitude: Number(job.customer_lat),
                  longitude: Number(job.customer_lng)
                }}
                title={job.customer_name}
                pinColor="#ef4444"
              />
            )}
          </MapView>
          <TouchableOpacity style={styles.floatingNavBtn} onPress={openNavigation}>
            <MaterialCommunityIcons name="google-maps" size={18} color="#fff" />
            <Text style={styles.floatingNavText}>เปิดแผนที่นำทาง</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings & Target Info Banner */}
        <View style={styles.feeBanner}>
          <View>
            <Text style={styles.feeBannerLabel}>ค่ารอบที่คุณจะได้รับ</Text>
            <Text style={styles.feeBannerAmount}>฿{Number(job.delivery_fee).toFixed(2)}</Text>
          </View>
          <View style={styles.directionTag}>
            <Text style={styles.directionTagText}>
              {status === 'delivering' ? '🚗 กำลังส่งให้ลูกค้า' : '🛵 กำลังไปที่ร้าน'}
            </Text>
          </View>
        </View>

        {/* Store Card (Pickup) */}
        <View style={[styles.card, (status === 'accepted' || status === 'arriving_shop') && styles.cardActiveTarget]}>
          <View style={styles.cardHeader}>
            <View style={styles.pickupPin}>
              <MaterialCommunityIcons name="storefront" size={16} color="#059669" />
            </View>
            <Text style={styles.cardTargetTitle}>จุดรับสินค้า (ร้านค้า)</Text>
          </View>
          <Text style={styles.cardPrimaryText}>{job.shop_name}</Text>
          <Text style={styles.cardSubText}>{job.shop_address}</Text>
        </View>

        {/* Customer Card (Dropoff) */}
        <View style={[styles.card, status === 'delivering' && styles.cardActiveTarget]}>
          <View style={styles.cardHeader}>
            <View style={styles.dropoffPin}>
              <Ionicons name="location" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.cardTargetTitle, { color: '#ef4444' }]}>จุดส่งสินค้า (ลูกค้า)</Text>
          </View>

          <View style={styles.customerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPrimaryText}>{job.customer_name || 'ลูกค้า Smart Deal'}</Text>
              <Text style={styles.cardSubText}>{job.customer_address}</Text>
            </View>
            {job.customer_phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => makePhoneCall(job.customer_phone)}
              >
                <Ionicons name="call" size={18} color="#059669" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.navigationSecondaryBtn} onPress={openNavigation}>
          <MaterialCommunityIcons name="navigation-variant" size={20} color="#059669" />
          <Text style={styles.navigationSecondaryText}>นำทาง</Text>
        </TouchableOpacity>

        {next ? (
          <TouchableOpacity
            disabled={updating}
            style={[styles.primaryActionBtn, updating && styles.btnDisabled]}
            onPress={() => updateStatus(next.value)}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryActionBtnText}>{next.label}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push(`/proof-of-delivery/${job.order_id}` as any)}
          >
            <MaterialCommunityIcons name="camera-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>ถ่ายรูป & จบงาน</Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 160
  },
  stepProgressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleCompleted: {
    backgroundColor: '#10b981',
  },
  stepCircleCurrent: {
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  stepLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepLineActive: {
    backgroundColor: '#10b981',
  },
  mapContainer: {
    position: 'relative',
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  map: {
    width: '100%',
    height: '100%'
  },
  floatingNavBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  floatingNavText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  feeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  feeBannerLabel: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  feeBannerAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#064e3b',
    marginTop: 2,
  },
  directionTag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardActiveTarget: {
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  pickupPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTargetTitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '800',
  },
  cardPrimaryText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '800',
    marginBottom: 4
  },
  cardSubText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navigationSecondaryBtn: {
    borderColor: '#059669',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  navigationSecondaryText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 15,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  btnDisabled: {
    opacity: 0.7
  },
});
