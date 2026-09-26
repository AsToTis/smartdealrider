import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function IncomeSummaryScreen() {
  const router = useRouter();
  const { rider } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0);
  const [prevMonthIncome, setPrevMonthIncome] = useState(0);
  const [currentMonthJobs, setCurrentMonthJobs] = useState(0);
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  
  useEffect(() => {
    fetchIncomeData();
  }, [rider]);

  const fetchIncomeData = async () => {
    try {
      const riderId = rider?.id || (rider as any)?.rider_id;
      if (!riderId) {
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/rider/${riderId}/history`);
      if (response.data?.success && response.data?.data?.deliveries) {
        const deliveries = response.data.data.deliveries;
        
        let currIncome = 0;
        let currJobs = 0;
        let prevIncome = 0;
        
        deliveries.forEach((d: any) => {
          if (d.status === 'delivered' || d.status === 'completed' || d.completed_at) {
            const date = new Date(d.completed_at || d.created_at || Date.now());
            const m = date.getMonth();
            const y = date.getFullYear();
            const fee = Number(d.delivery_fee) || 0;
            
            if (m === currentMonth && y === currentYear) {
              currIncome += fee;
              currJobs++;
            } else if (m === prevMonth && (y === currentYear || (currentMonth === 0 && y === currentYear - 1))) {
              prevIncome += fee;
            }
          }
        });
        
        setCurrentMonthIncome(currIncome);
        setCurrentMonthJobs(currJobs);
        setPrevMonthIncome(prevIncome);
      }
    } catch (error) {
      console.error('Error fetching income:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  const diff = currentMonthIncome - prevMonthIncome;
  const percentChange = prevMonthIncome > 0 
    ? Math.round((diff / prevMonthIncome) * 100) 
    : (currentMonthIncome > 0 ? 100 : 0);
    
  const isPositive = diff >= 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สรุปรายได้รายเดือน</Text>
        <TouchableOpacity>
          <Ionicons name="share-social-outline" size={24} color="#2e7d32" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.appName}>แอปพลิเคชัน SMART DEAL</Text>
        <Text style={styles.monthTitle}>{MONTH_NAMES[currentMonth]} {currentYear + 543}</Text>

        <View style={styles.totalIncomeCard}>
          <Text style={styles.totalIncomeLabel}>รายได้รวมทั้งหมด</Text>
          <Text style={styles.totalIncomeValue}>฿{currentMonthIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
          
          <View style={[styles.trendBadge, !isPositive && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <Ionicons name={isPositive ? "trending-up" : "trending-down"} size={14} color={isPositive ? "#fff" : "#fca5a5"} />
            <Text style={[styles.trendText, !isPositive && { color: '#fca5a5' }]}>
              {isPositive ? '+' : ''}{percentChange}% จากเดือนที่แล้ว
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>รายละเอียดรายได้</Text>

        <View style={styles.detailCard}>
          <View style={styles.detailIconBox}>
            <MaterialCommunityIcons name="moped" size={24} color="#2e7d32" />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailTitle}>ค่าธรรมเนียมการส่ง</Text>
            <Text style={styles.detailSubtitle}>{currentMonthJobs} งาน</Text>
          </View>
          <Text style={styles.detailAmount}>฿{currentMonthIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIconBox}>
            <MaterialCommunityIcons name="hand-heart" size={24} color="#2e7d32" />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailTitle}>ทิปจากลูกค้า</Text>
            <Text style={styles.detailSubtitle}>รวมจากใจลูกค้า</Text>
          </View>
          <Text style={styles.detailAmount}>฿0.00</Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIconBox}>
            <Ionicons name="location" size={24} color="#2e7d32" />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailTitle}>โบนัสระยะทาง</Text>
            <Text style={styles.detailSubtitle}>มากกว่า 5 กม.</Text>
          </View>
          <Text style={styles.detailAmount}>฿0.00</Text>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>การเปรียบเทียบรายได้</Text>
          <Text style={styles.chartValue}>฿{currentMonthIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.chartDiff}>
            {MONTH_NAMES[prevMonth].substring(0, 2)}. VS {MONTH_NAMES[currentMonth].substring(0, 2)}. 
            <Text style={[styles.chartDiffHighlight, !isPositive && { color: '#ef4444' }]}>
              {' '}{isPositive ? '+' : '-'}฿{Math.abs(diff).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </Text>
          </Text>

          <View style={styles.chartArea}>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { height: prevMonthIncome > 0 ? (prevMonthIncome / Math.max(prevMonthIncome, currentMonthIncome)) * 120 : 20, backgroundColor: '#e0e0e0' }]} />
              <Text style={styles.barLabel}>{MONTH_NAMES[prevMonth]}</Text>
            </View>
            <View style={styles.barContainer}>
              {currentMonthIncome >= prevMonthIncome && currentMonthIncome > 0 && (
                <Text style={styles.barValueTop}>สูงสุด</Text>
              )}
              <View style={[styles.bar, { height: currentMonthIncome > 0 ? (currentMonthIncome / Math.max(prevMonthIncome, currentMonthIncome)) * 120 : 20, backgroundColor: '#2e7d32' }]} />
              <Text style={[styles.barLabel, { color: '#2e7d32', fontWeight: 'bold' }]}>{MONTH_NAMES[currentMonth]}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginTop: 10,
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0a192f',
    marginBottom: 20,
  },
  totalIncomeCard: {
    backgroundColor: '#2e7d32',
    borderRadius: 32,
    padding: 30,
    marginBottom: 32,
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  totalIncomeLabel: {
    color: '#a5d6a7',
    fontSize: 15,
    marginBottom: 8,
  },
  totalIncomeValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  chartValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  chartDiff: {
    fontSize: 13,
    color: '#666',
    marginBottom: 32,
  },
  chartDiffHighlight: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20,
  },
  barContainer: {
    alignItems: 'center',
  },
  barValueTop: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bar: {
    width: 60,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 13,
    color: '#666',
  },
});
