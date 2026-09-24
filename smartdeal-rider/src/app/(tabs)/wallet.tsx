import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

type Transaction = {
  id: string | number;
  description?: string;
  amount: number | string;
  type: 'credit' | 'debit';
  created_at: string;
};

type WalletData = {
  balance: number;
  todayIncome: number;
  todayJobs: number;
  history: Transaction[];
};

export default function WalletScreen() {
  const router = useRouter();
  const { rider } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const fetchWallet = async () => {
    try {
      const riderId = rider?.id || (rider as any)?.rider_id;
      if (!riderId) return;
      const res = await api.get(`/rider/wallet?rider_id=${riderId}`);
      if (res.data?.success) {
        setWalletData({
          balance: Number(res.data.balance) || 0,
          todayIncome: Number(res.data.todayIncome) || 0,
          todayJobs: Number(res.data.todayJobs) || 0,
          history: res.data.history || [],
        });
      }
    } catch (e) {
      console.error('Fetch wallet error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [rider]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }
    const amountNum = Number(withdrawAmount);
    if (walletData && amountNum > walletData.balance) {
      Alert.alert('ข้อผิดพลาด', 'ยอดเงินคงเหลือไม่เพียงพอ');
      return;
    }
    
    try {
      setIsWithdrawing(true);
      const riderId = rider?.id || (rider as any)?.rider_id;
      const res = await api.post('/rider/wallet/withdraw', {
        rider_id: riderId,
        amount: amountNum
      });
      if (res.data?.success) {
        Alert.alert('สำเร็จ', 'ถอนเงินสำเร็จ');
        setWithdrawModalVisible(false);
        setWithdrawAmount('');
        fetchWallet();
      } else {
        Alert.alert('ข้อผิดพลาด', res.data?.message || 'ไม่สามารถถอนเงินได้');
      }
    } catch (e: any) {
      console.error('Withdraw error:', e);
      Alert.alert('ข้อผิดพลาด', e.response?.data?.message || 'เกิดข้อผิดพลาดในการถอนเงิน');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!walletData) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>กระเป๋าเงิน & รายได้</Text>
        <TouchableOpacity 
          style={styles.incomeReportBtn}
          onPress={() => router.push('/income' as any)}
        >
          <MaterialCommunityIcons name="chart-box-outline" size={20} color="#059669" />
          <Text style={styles.incomeReportText}>สถิติ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >
        {/* Fintech Balance Card */}
        <View style={styles.balanceMasterCard}>
          <View style={styles.balanceTopRow}>
            <View>
              <Text style={styles.balanceLabel}>ยอดเงินพร้อมถอน (Balance)</Text>
              <Text style={styles.balanceValue}>
                ฿{walletData.balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet" size={24} color="#059669" />
            </View>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceStatsRow}>
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniLabel}>รายได้วันนี้</Text>
              <Text style={styles.statMiniValue}>
                ฿{walletData.todayIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statMiniDivider} />
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniLabel}>จำนวนงานที่เสร็จ</Text>
              <Text style={styles.statMiniValue}>{walletData.todayJobs} งาน</Text>
            </View>
          </View>
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity 
          style={styles.withdrawButton}
          activeOpacity={0.85}
          onPress={() => setWithdrawModalVisible(true)}
        >
          <Ionicons name="card" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.withdrawButtonText}>ถอนเงินเข้าบัญชีธนาคาร</Text>
        </TouchableOpacity>

        {/* Transaction History Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ประวัติรายการเดินบัญชี</Text>
          <Text style={styles.txCountBadge}>{walletData.history.length} รายการ</Text>
        </View>

        {walletData.history.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="history" size={40} color="#94a3b8" />
            <Text style={styles.emptyText}>ยังไม่มีรายการเคลื่อนไหว</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {walletData.history.map((tx, idx) => {
              const date = new Date(tx.created_at);
              const dateStr = date.toLocaleDateString('th-TH', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              const isWithdraw = tx.type === 'debit';
              
              return (
                <View key={tx.id || idx} style={styles.transactionCard}>
                  <View style={[styles.txIconBox, isWithdraw ? styles.txIconBoxWithdraw : styles.txIconBoxDelivery]}>
                    {isWithdraw ? (
                      <MaterialCommunityIcons name="bank-transfer-out" size={22} color="#dc2626" />
                    ) : (
                      <MaterialCommunityIcons name="moped" size={22} color="#059669" />
                    )}
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {isWithdraw ? 'ถอนเงินเข้าบัญชี' : `ค่ารอบจัดส่ง ${tx.description || ''}`}
                    </Text>
                    <Text style={styles.txTime}>{dateStr}</Text>
                  </View>
                  <View style={styles.txAmountContainer}>
                    <Text style={[styles.txAmount, isWithdraw ? styles.txAmountNegative : styles.txAmountPositive]}>
                      {isWithdraw ? '- ฿' : '+ ฿'}{Number(tx.amount).toFixed(2)}
                    </Text>
                    <Text style={styles.txSubtext}>{isWithdraw ? 'โอนออก' : 'รับเงิน'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ระบุจำนวนเงินที่ต้องการถอน</Text>
                <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.modalBalanceLabel}>ยอดเงินคงเหลือ: ฿{walletData.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencyPrefix}>฿</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    autoFocus
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.confirmWithdrawBtn, isWithdrawing && styles.confirmWithdrawBtnDisabled]}
                  onPress={handleWithdraw}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmWithdrawBtnText}>ยืนยันการถอนเงิน</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
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
  incomeReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  incomeReportText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceMasterCard: {
    backgroundColor: '#064e3b', // Deep emerald luxury
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#064e3b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#a7f3d0',
    fontWeight: '600',
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
  },
  walletIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 16,
  },
  balanceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statMiniCol: {
    flex: 1,
  },
  statMiniLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 3,
  },
  statMiniValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  statMiniDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 12,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  withdrawButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  txCountBadge: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  txList: {
    gap: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconBoxDelivery: {
    backgroundColor: '#ecfdf5',
  },
  txIconBoxWithdraw: {
    backgroundColor: '#fee2e2',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  txTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  txAmountPositive: {
    color: '#059669',
  },
  txAmountNegative: {
    color: '#dc2626',
  },
  txSubtext: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalBody: {
    gap: 16,
  },
  modalBalanceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  confirmWithdrawBtn: {
    backgroundColor: '#059669',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmWithdrawBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  confirmWithdrawBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
