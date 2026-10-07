import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type HistoryItem = {
  id: number;
  order_id: number;
  restaurant_name: string;
  delivery_address: string;
  customer_name: string;
  delivery_fee: number;
  completed_at: string;
};

type Summary = {
  total_jobs: number;
  total_earnings: number;
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_jobs: 0, total_earnings: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { rider, logout } = useAuth();

  const fetchHistory = async () => {
    try {
      const riderId = rider?.id || (rider as any)?.rider_id;
      if (!riderId) {
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/rider/${riderId}/history`);
      if (response.data?.success) {
        const data = response.data.data || {};
        const baseFare = 35;
        const perKm = 8;
        const deliveries: HistoryItem[] = (data.deliveries || []).map((d: any) => {
          const distNum = parseFloat(d.distance) || 2.5;
          const calculatedFare = Math.round(baseFare + (distNum * perKm));
          const feeNum = parseFloat(d.delivery_fee) || 0;
          return {
            ...d,
            delivery_fee: feeNum > 0 ? feeNum : calculatedFare,
          };
        });
        const totalEarned = deliveries
          .filter((d: any) => d.status === 'delivered' || d.status === 'completed')
          .reduce((sum, d) => sum + Number(d.delivery_fee || 0), 0);
        setHistory(deliveries);
        setSummary({
          total_jobs: deliveries.length,
          total_earnings: totalEarned > 0 ? totalEarned : (Number(data.total_earnings) || 0),
        });
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [rider]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const dateStr = item.completed_at 
      ? new Date(item.completed_at).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'วันนี้';

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.storeRow}>
            <View style={styles.storeIconBg}>
              <MaterialCommunityIcons name="storefront" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {item.restaurant_name || 'ร้านค้าพาร์ทเนอร์'}
              </Text>
              <Text style={styles.orderIdSubtitle}>ออเดอร์ #{item.order_id || item.id}</Text>
            </View>
          </View>

          <View style={styles.feeBox}>
            <Text style={styles.feeText}>+฿{Number(item.delivery_fee || 0).toFixed(2)}</Text>
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>สำเร็จ</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.detailText}>{dateStr}</Text>
        </View>

        <View style={[styles.detailRow, { marginTop: 4 }]}>
          <Ionicons name="location-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.detailText} numberOfLines={1}>
            ส่งที่: {item.delivery_address || '-'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ประวัติงาน & สถิติ</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Performance Banner */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconBox, { backgroundColor: '#ecfdf5' }]}>
              <MaterialCommunityIcons name="check-circle" size={22} color="#059669" />
            </View>
            <View>
              <Text style={styles.summaryLabel}>งานสำเร็จสะสม</Text>
              <Text style={styles.summaryValue}>{summary.total_jobs} <Text style={styles.unitText}>งาน</Text></Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="cash" size={22} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.summaryLabel}>รายได้รวมสะสม</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>
                ฿{summary.total_earnings.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => (item.id || item.order_id || index).toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-clock-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>ยังไม่มีประวัติการจัดส่ง</Text>
              <Text style={styles.emptySubtitle}>
                เมื่อคุณจัดส่งออเดอร์สำเร็จ รายการจะถูกบันทึกไว้ที่นี่
              </Text>
            </View>
          }
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#f1f5f9',
    alignSelf: 'center',
    marginHorizontal: 10,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  storeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  orderIdSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  feeBox: {
    alignItems: 'flex-end',
  },
  feeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    marginBottom: 4,
  },
  doneBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  doneBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
