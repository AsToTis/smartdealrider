import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Vibration, 
  Alert, 
  ActivityIndicator, 
  Animated, 
  Easing,
  Platform,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface Job {
  order_id: number;
  shop_name: string;
  shop_address: string;
  customer_address: string;
  customer_name?: string;
  delivery_fee: string | number;
  distance?: string;
  order_status?: string;
}

export default function RiderHomeScreen() {
  const router = useRouter();
  const { token, rider } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [wallet, setWallet] = useState({ todayIncome: 0, todayJobs: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  
  const prevJobsCountRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for online indicator
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      radarAnim.setValue(0);
    }
  }, [isOnline]);

  const fetchJobs = async () => {
    if (!isOnline) {
      setJobs([]);
      return;
    }
    try {
      const response = await api.get('/rider/jobs');
      if (response.data?.success) {
        const newJobs = response.data.data || [];
        setJobs(newJobs);

        if (newJobs.length > prevJobsCountRef.current) {
          Vibration.vibrate([0, 400, 150, 400]);
        }
        prevJobsCountRef.current = newJobs.length;
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const riderId = rider?.id || (rider as any)?.rider_id;
      if (!riderId) return;
      const res = await api.get(`/rider/wallet?rider_id=${riderId}`);
      if (res.data?.success) {
        setWallet({
          todayIncome: Number(res.data.todayIncome) || 0,
          todayJobs: Number(res.data.todayJobs) || 0,
        });
      }
    } catch (error) {
      console.error('Fetch wallet error:', error);
    }
  };

  // Check if rider already has an active accepted job
  const checkActiveDelivery = async () => {
    try {
      const riderId = rider?.id || (rider as any)?.rider_id;
      if (!riderId) return;
      const res = await api.get(`/rider/${riderId}/history`);
      if (res.data?.success && res.data?.data?.deliveries) {
        const ongoing = res.data.data.deliveries.find(
          (d: any) => d.status && d.status !== 'delivered' && d.status !== 'completed' && d.status !== 'cancelled'
        );
        setActiveJob(ongoing || null);
      }
    } catch (e) {
      // ignore
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchJobs(), fetchWallet(), checkActiveDelivery()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
      fetchWallet();
      checkActiveDelivery();
      const interval = setInterval(() => {
        if (isOnline) {
          fetchJobs();
          fetchWallet();
          checkActiveDelivery();
        }
      }, 5000);
      return () => clearInterval(interval);
    }, [rider, isOnline])
  );

  const acceptJob = async (job: Job) => {
    const riderId = rider?.id || (rider as any)?.rider_id;
    if (!riderId) {
      Alert.alert('ไม่พบข้อมูลไรเดอร์', 'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่');
      return;
    }
    setAcceptingId(job.order_id);
    try {
      const response = await api.put(`/rider/deliveries/${job.order_id}/status`, {
        rider_id: riderId,
        status: 'accepted',
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'รับงานไม่สำเร็จ');
      
      Vibration.vibrate(200);
      router.push(`/delivery/${job.order_id}` as any);
    } catch (error: any) {
      Alert.alert('รับงานไม่สำเร็จ', error.response?.data?.message || error.message || 'งานนี้อาจมีผู้รับไปแล้ว');
      fetchJobs();
    } finally {
      setAcceptingId(null);
    }
  };

  const radarScale = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.2],
  });

  const radarOpacity = radarAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0],
  });

  return (
    <View style={styles.container}>
      {/* Top Professional Header */}
      <View style={styles.header}>
        <View style={styles.riderProfileBox}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="motorbike" size={24} color="#059669" />
            </View>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10b981' : '#94a3b8' }]} />
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderGreeting}>สวัสดีไรเดอร์</Text>
            <Text style={styles.riderPlate}>
              {rider?.vehicle_plate || 'Smart Deal Rider'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/wallet')}
          >
            <Ionicons name="notifications-outline" size={22} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >
        {/* Modern Online / Offline Master Switch Card */}
        <View style={[styles.masterSwitchCard, isOnline ? styles.switchCardOnline : styles.switchCardOffline]}>
          <View style={styles.switchHeader}>
            <View style={styles.switchLeft}>
              <Animated.View style={[styles.statusGlow, isOnline && { transform: [{ scale: pulseAnim }] }]}>
                <View style={[styles.statusBulb, { backgroundColor: isOnline ? '#10b981' : '#64748b' }]} />
              </Animated.View>
              <View>
                <Text style={styles.switchStatusTitle}>
                  {isOnline ? 'พร้อมรับงาน (Online)' : 'พักรับงาน (Offline)'}
                </Text>
                <Text style={styles.switchStatusSub}>
                  {isOnline ? 'ระบบกำลังสแกนค้นหางานใกล้คุณอัตโนมัติ' : 'แตะเพื่อเปิดระบบและเริ่มรับงาน'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.togglePill, isOnline ? styles.togglePillActive : styles.togglePillInactive]}
              onPress={() => setIsOnline(!isOnline)}
            >
              <Text style={[styles.togglePillText, isOnline ? styles.toggleTextActive : styles.toggleTextInactive]}>
                {isOnline ? 'เปิดอยู่' : 'ปิดอยู่'}
              </Text>
              <View style={[styles.toggleCircle, isOnline ? styles.toggleCircleRight : styles.toggleCircleLeft]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Performance Metrics Bar */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="wallet" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.metricLabel}>รายได้วันนี้</Text>
              <Text style={styles.metricValue}>฿{wallet.todayIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <MaterialCommunityIcons name="check-decagram" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.metricLabel}>งานสำเร็จ</Text>
              <Text style={styles.metricValue}>{wallet.todayJobs} <Text style={styles.metricUnit}>งาน</Text></Text>
            </View>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#fffbeb' }]}>
              <Ionicons name="star" size={18} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.metricLabel}>คะแนน</Text>
              <Text style={styles.metricValue}>5.0 <Text style={styles.metricUnit}>⭐</Text></Text>
            </View>
          </View>
        </View>

        {/* Active Delivery Banner (If rider has an ongoing task) */}
        {activeJob && (
          <TouchableOpacity 
            style={styles.activeDeliveryCard}
            activeOpacity={0.9}
            onPress={() => router.push(`/delivery/${activeJob.order_id || activeJob.id}` as any)}
          >
            <View style={styles.activeDeliveryHeader}>
              <View style={styles.activeBadge}>
                <MaterialCommunityIcons name="moped" size={16} color="#fff" />
                <Text style={styles.activeBadgeText}>กำลังส่งงาน #{activeJob.order_id || activeJob.id}</Text>
              </View>
              <View style={styles.activeActionLink}>
                <Text style={styles.activeActionText}>เปิดแผนที่นำทาง</Text>
                <Ionicons name="chevron-forward" size={16} color="#059669" />
              </View>
            </View>
            <Text style={styles.activeStoreName} numberOfLines={1}>
              {activeJob.restaurant_name || activeJob.shop_name || 'ร้านค้าพาร์ทเนอร์'}
            </Text>
            <Text style={styles.activeAddress} numberOfLines={1}>
              📍 ส่งที่: {activeJob.delivery_address || activeJob.customer_address}
            </Text>
          </TouchableOpacity>
        )}

        {/* Dispatch Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.radarDot, { backgroundColor: isOnline ? '#10b981' : '#94a3b8' }]} />
            <Text style={styles.sectionTitle}>
              {isOnline ? `งานใหม่ที่พร้อมรับ (${jobs.length})` : 'สถานะระบบ'}
            </Text>
          </View>
          {isOnline && jobs.length > 0 && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>ด่วน</Text>
            </View>
          )}
        </View>

        {/* Radar State / Jobs Feed */}
        {!isOnline ? (
          <View style={styles.offlinePlaceholder}>
            <View style={styles.offlineIconBox}>
              <MaterialCommunityIcons name="power-standby" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.offlineTitle}>คุณปิดระบบรับงานอยู่</Text>
            <Text style={styles.offlineSubtitle}>
              เปิดระบบออนไลน์เพื่อเริ่มรับงานจัดส่งและสร้างรายได้ทันที
            </Text>
            <TouchableOpacity 
              style={styles.startDutyBtn}
              onPress={() => setIsOnline(true)}
            >
              <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.startDutyBtnText}>เปิดระบบเพื่อรับงาน</Text>
            </TouchableOpacity>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.radarContainer}>
            {/* Animated Radar Ripples */}
            <View style={styles.radarVisualBox}>
              <Animated.View 
                style={[
                  styles.radarCircle, 
                  { 
                    transform: [{ scale: radarScale }],
                    opacity: radarOpacity
                  }
                ]} 
              />
              <View style={styles.radarCenterIcon}>
                <MaterialCommunityIcons name="radar" size={40} color="#059669" />
              </View>
            </View>
            <Text style={styles.radarSearchingText}>กำลังค้นหางานรอบตัวคุณ...</Text>
            <Text style={styles.radarSubText}>
              อยู่ในจุดที่มีร้านค้าหนาแน่นเพื่อรับงานได้เร็วยิ่งขึ้น 🔥
            </Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {jobs.map((job) => (
              <View key={job.order_id} style={styles.jobCard}>
                {/* Store Header & Fee */}
                <View style={styles.jobCardHeader}>
                  <View style={styles.shopMeta}>
                    <View style={styles.shopIconBg}>
                      <MaterialCommunityIcons name="storefront-outline" size={22} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopName} numberOfLines={1}>{job.shop_name}</Text>
                      <View style={styles.orderIdTag}>
                        <Text style={styles.orderIdText}>ออเดอร์ #{job.order_id}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.feeBox}>
                    <Text style={styles.feeAmount}>฿{Number(job.delivery_fee).toFixed(2)}</Text>
                    <Text style={styles.feeLabel}>ค่ารอบรวมทิป</Text>
                  </View>
                </View>

                {/* Route Visualizer (Pickup -> Dropoff) */}
                <View style={styles.routeBox}>
                  {/* Pickup */}
                  <View style={styles.routeStop}>
                    <View style={styles.pickupPinBox}>
                      <View style={styles.pickupPin} />
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopType}>จุดรับ (ร้านค้า)</Text>
                      <Text style={styles.stopAddress} numberOfLines={1}>{job.shop_address}</Text>
                    </View>
                  </View>

                  {/* Connecting Line */}
                  <View style={styles.routeConnector}>
                    <View style={styles.dashLine} />
                    <View style={styles.distanceChip}>
                      <MaterialCommunityIcons name="map-marker-distance" size={13} color="#059669" />
                      <Text style={styles.distanceText}>{job.distance || '2.5 กม.'}</Text>
                    </View>
                  </View>

                  {/* Dropoff */}
                  <View style={styles.routeStop}>
                    <View style={styles.dropoffPinBox}>
                      <Ionicons name="location" size={16} color="#ef4444" />
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopType}>จุดส่ง (ลูกค้า)</Text>
                      <Text style={styles.stopAddress} numberOfLines={1}>{job.customer_address}</Text>
                    </View>
                  </View>
                </View>

                {/* Action CTA Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={acceptingId === job.order_id}
                  style={[styles.acceptBtn, acceptingId === job.order_id && styles.btnDisabled]}
                  onPress={() => acceptJob(job)}
                >
                  {acceptingId === job.order_id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.acceptBtnText}>รับงานนี้ทันที</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  riderProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  riderInfo: {
    justifyContent: 'center',
  },
  riderGreeting: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  riderPlate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  masterSwitchCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  switchCardOnline: {
    backgroundColor: '#064e3b', // Deep emerald luxury
  },
  switchCardOffline: {
    backgroundColor: '#1e293b',
  },
  switchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  statusGlow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusBulb: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  switchStatusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  switchStatusSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  togglePill: {
    width: 76,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  togglePillActive: {
    backgroundColor: '#10b981',
  },
  togglePillInactive: {
    backgroundColor: '#475569',
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  toggleTextInactive: {
    color: '#cbd5e1',
  },
  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  toggleCircleRight: {},
  toggleCircleLeft: {},
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  metricDivider: {
    width: 1,
    height: '70%',
    alignSelf: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 4,
  },
  activeDeliveryCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  activeDeliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  activeActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginRight: 2,
  },
  activeStoreName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064e3b',
    marginBottom: 4,
  },
  activeAddress: {
    fontSize: 12,
    color: '#047857',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  liveBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
  },
  radarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  radarVisualBox: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  radarCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#a7f3d0',
  },
  radarCenterIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  radarSearchingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  radarSubText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  offlinePlaceholder: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  offlineIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  offlineTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  offlineSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },
  startDutyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  startDutyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  jobsList: {
    gap: 14,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  shopIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  orderIdTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  feeBox: {
    alignItems: 'flex-end',
  },
  feeAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
  },
  feeLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 1,
  },
  routeBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupPinBox: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  pickupPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  dropoffPinBox: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  stopInfo: {
    flex: 1,
  },
  stopType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingLeft: 9,
  },
  dashLine: {
    width: 2,
    height: 24,
    backgroundColor: '#cbd5e1',
    marginRight: 14,
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
