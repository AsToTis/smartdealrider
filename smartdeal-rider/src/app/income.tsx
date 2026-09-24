import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function IncomeSummaryScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
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
        <Text style={styles.monthTitle}>กรกฎาคม 2566</Text>

        <View style={styles.totalIncomeCard}>
          <Text style={styles.totalIncomeLabel}>รายได้รวมทั้งหมด</Text>
          <Text style={styles.totalIncomeValue}>฿24,500.00</Text>
          <View style={styles.trendBadge}>
            <Ionicons name="trending-up" size={14} color="#fff" />
            <Text style={styles.trendText}>+15% จากเดือนที่แล้ว</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>รายละเอียดรายได้</Text>

        <View style={styles.detailCard}>
          <View style={styles.detailIconBox}>
            <MaterialCommunityIcons name="moped" size={24} color="#2e7d32" />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailTitle}>ค่าธรรมเนียมการส่ง</Text>
            <Text style={styles.detailSubtitle}>214 งาน</Text>
          </View>
          <Text style={styles.detailAmount}>฿18,200.00</Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIconBox}>
            <MaterialCommunityIcons name="hand-heart" size={24} color="#2e7d32" />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailTitle}>ทิปจากลูกค้า</Text>
            <Text style={styles.detailSubtitle}>รวมจากใจลูกค้า</Text>
          </View>
          <Text style={styles.detailAmount}>฿3,850.00</Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIconBox}>
            <Ionicons name="location" size={24} color="#2e7d32" />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailTitle}>โบนัสระยะทาง</Text>
            <Text style={styles.detailSubtitle}>มากกว่า 5 กม.</Text>
          </View>
          <Text style={styles.detailAmount}>฿2,450.00</Text>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>การเปรียบเทียบรายได้</Text>
          <Text style={styles.chartValue}>฿24,500.00</Text>
          <Text style={styles.chartDiff}>มิ.ย. VS ก.ค. <Text style={styles.chartDiffHighlight}>+฿3,200</Text></Text>

          <View style={styles.chartArea}>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { height: 80, backgroundColor: '#e0e0e0' }]} />
              <Text style={styles.barLabel}>มิถุนายน</Text>
            </View>
            <View style={styles.barContainer}>
              <Text style={styles.barValueTop}>สูงสุด</Text>
              <View style={[styles.bar, { height: 120, backgroundColor: '#2e7d32' }]} />
              <Text style={[styles.barLabel, { color: '#2e7d32', fontWeight: 'bold' }]}>กรกฎาคม</Text>
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
  },
  barLabel: {
    fontSize: 13,
    color: '#666',
  },
});
