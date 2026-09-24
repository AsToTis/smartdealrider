import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type DeliveryOrder = {
  id?: number;
  order_id: number;
  shop_name?: string;
  restaurant_name?: string;
  customer_address?: string;
  delivery_address?: string;
  customer_name?: string;
  delivery_fee?: number | string;
  status?: string;
  created_at?: string;
  completed_at?: string;
};

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  accepted: { label: 'กำลังเดินทางไปร้านค้า', color: '#0284c7', bg: '#e0f2fe', icon: 'store' },
  arriving_shop: { label: 'ถึงร้านค้าแล้ว', color: '#7c3aed', bg: '#ede9fe', icon: 'storefront' },
  picked_up: { label: 'รับสินค้าเรียบร้อย', color: '#d97706', bg: '#fef3c7', icon: 'package-variant-closed' },
  delivering: { label: 'กำลังนำส่งให้ลูกค้า', color: '#059669', bg: '#ecfdf5', icon: 'moped' },
  delivered: { label: 'จัดส่งสำเร็จแล้ว', color: '#16a34a', bg: '#dcfce7', icon: 'check-circle' },
  completed: { label: 'จัดส่งสำเร็จแล้ว', color: '#16a34a', bg: '#dcfce7', icon: 'check-circle' },
};

export default function MyDeliveriesScreen() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryOrder[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<DeliveryOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { rider } = useAuth();

  const fetchOrders = async () => {
    try {
      const riderId = rider?.id || (rider as any)?.rider_id;
      if (!riderId) {
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/rider/${riderId}/history`);
      if (response.data?.success && response.data?.data) {
        const all: DeliveryOrder[] = response.data.data.deliveries || [];
        
        const active = all.filter(d => 
          d.status && d.status !== 'delivered' && d.status !== 'completed' && d.status !== 'cancelled'
        );
        const finished = all.filter(d => 
          d.status === 'delivered' || d.status === 'completed'
        );

        setActiveDeliveries(active);
        setCompletedDeliveries(finished);
      }
    } catch (error) {
      console.error('Error fetching rider deliveries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      const interval = setInterval(fetchOrders, 4000);
      return () => clearInterval(interval);
    }, [rider])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderActiveItem = ({ item }: { item: DeliveryOrder }) => {
    const orderId = item.order_id || item.id;
    const currentStatus = item.status || 'accepted';
    const meta = statusMeta[currentStatus] || statusMeta.accepted;
    const storeTitle = item.restaurant_name || item.shop_name || 'ร้านค้าพาร์ทเนอร์';
    const dropoffAddress = item.delivery_address || item.customer_address || '-';

    return (
      <View style={styles.activeOrderCard}>
        {/* Top Header with Order ID and Status Pill */}
        <View style={styles.orderCardHeader}>
          <View style={styles.orderIdBadge}>
            <MaterialCommunityIcons name="receipt" size={16} color="#059669" />
            <Text style={styles.orderIdText}>ออเดอร์ #{orderId}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={14} color={meta.color} />
            <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Store & Customer Info */}
        <View style={styles.storeRow}>
          <View style={styles.storeIconWrap}>
            <Ionicons name="restaurant" size={18} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{storeTitle}</Text>
            <Text style={styles.customerName}>ลูกค้า: {item.customer_name || 'ลูกค้า Smart Deal'}</Text>
          </View>
        </View>

        <View style={styles.locationDivider} />

        <View style={styles.destinationRow}>
          <Ionicons name="location" size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.destinationText} numberOfLines={2}>{dropoffAddress}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.continueButton}
          activeOpacity={0.85}
          onPress={() => router.push(`/delivery/${orderId}` as any)}
        >
          <MaterialCommunityIcons name="navigation-variant" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.continueButtonText}>ดำเนินการจัดส่งต่อ</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCompletedItem = ({ item }: { item: DeliveryOrder }) => {
    const orderId = item.order_id || item.id;
    const storeTitle = item.restaurant_name || item.shop_name || 'ร้านค้าพาร์ทเนอร์';
    const dropoffAddress = item.delivery_address || item.customer_address || '-';
    const dateStr = item.completed_at 
      ? new Date(item.completed_at).toLocaleDateString('th-TH', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : 'วันนี้';

    return (
      <View style={styles.completedCard}>
        <View style={styles.completedHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.completedStoreName}>{storeTitle}</Text>
            <Text style={styles.completedDate}>ออเดอร์ #{orderId} • {dateStr}</Text>
          </View>
          <View style={styles.completedFeeBox}>
            <Text style={styles.completedFee}>+฿{Number(item.delivery_fee || 0).toFixed(2)}</Text>
            <Text style={styles.completedFeeSub}>สำเร็จ</Text>
          </View>
        </View>

        <View style={styles.completedAddressRow}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginRight: 6 }} />
          <Text style={styles.completedAddressText} numberOfLines={1}>{dropoffAddress}</Text>
        </View>
      </View>
    );
  };

  const currentList = activeTab === 'active' ? activeDeliveries : completedDeliveries;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ออเดอร์ของฉัน</Text>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Modern Segmented Control */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity 
          style={[styles.segmentBtn, activeTab === 'active' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.segmentText, activeTab === 'active' && styles.segmentTextActive]}>
            กำลังดำเนินการ ({activeDeliveries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentBtn, activeTab === 'completed' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.segmentText, activeTab === 'completed' && styles.segmentTextActive]}>
            ส่งสำเร็จแล้ว ({completedDeliveries.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            {activeTab === 'active' ? (
              <MaterialCommunityIcons name="moped" size={48} color="#94a3b8" />
            ) : (
              <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#94a3b8" />
            )}
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'active' ? 'ไม่มีงานที่กำลังจัดส่ง' : 'ยังไม่มีประวัติงานที่สำเร็จ'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active' 
              ? 'เปิดหน้าเรดาร์เพื่อค้นหาและกดรับงานใหม่ใกล้คุณได้เลย' 
              : 'งานที่คุณจัดส่งสำเร็จจะแสดงบันทึกไว้ที่นี่'}
          </Text>
          {activeTab === 'active' && (
            <TouchableOpacity 
              style={styles.goRadarBtn}
              onPress={() => router.push('/(tabs)')}
            >
              <MaterialCommunityIcons name="radar" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.goRadarBtnText}>ไปที่เรดาร์รับงาน</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => (item.order_id || item.id || Math.random()).toString()}
          renderItem={activeTab === 'active' ? renderActiveItem : renderCompletedItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
        />
      )}
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
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#059669',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  activeOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  storeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
    color: '#64748b',
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  destinationText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 14,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  completedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  completedStoreName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  completedDate: {
    fontSize: 12,
    color: '#64748b',
  },
  completedFeeBox: {
    alignItems: 'flex-end',
  },
  completedFee: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  completedFeeSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  completedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedAddressText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  goRadarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  goRadarBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
