import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const router = useRouter();
  const [selectedNotif, setSelectedNotif] = useState<any>(null);

  // Mock data for notifications
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'มีงานใหม่ใกล้คุณ!',
      message: 'ร้านข้าวมันไก่เจ๊อ้วน (ระยะทาง 1.2 กม.) ต้องการไรเดอร์ไปส่งอาหารที่หอพัก A',
      time: '2 นาทีที่แล้ว',
      type: 'system',
      read: false,
    },
    {
      id: '2',
      title: 'ข้อความจากลูกค้า: คุณสมชาย',
      message: 'รบกวนฝากซื้อน้ำแข็งเปล่า 1 ถุงด้วยนะครับ เดี๋ยวผมจ่ายเงินสดเพิ่มให้ตอนมาถึงครับ ขอบคุณมากครับ',
      time: '15 นาทีที่แล้ว',
      type: 'customer',
      read: true,
    },
    {
      id: '3',
      title: 'ออเดอร์พร้อมรับแล้ว',
      message: 'ร้านก๋วยเตี๋ยวเรืออยุธยา เตรียมอาหารเสร็จแล้ว มารับได้เลย',
      time: '1 ชั่วโมงที่แล้ว',
      type: 'store',
      read: true,
    },
    {
      id: '4',
      title: 'โอนเงินค่ารอบสำเร็จ',
      message: 'ระบบได้โอนเงินค่ารอบจำนวน ฿45.00 เข้ากระเป๋าเงินของคุณแล้ว',
      time: '2 ชั่วโมงที่แล้ว',
      type: 'system',
      read: true,
    },
  ]);

  const handlePressNotification = (item: any) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === item.id ? { ...n, read: true } : n)
    );
    
    // Open modal to view details
    setSelectedNotif(item);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <MaterialCommunityIcons name="bell-ring" size={24} color="#059669" />;
      case 'customer':
        return <Ionicons name="chatbubble-ellipses" size={24} color="#3b82f6" />;
      case 'store':
        return <MaterialCommunityIcons name="storefront" size={24} color="#f59e0b" />;
      default:
        return <Ionicons name="notifications" size={24} color="#64748b" />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handlePressNotification(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, !item.read && styles.unreadIconContainer]}>
        {getIcon(item.type)}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selectedNotif}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotif(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                {selectedNotif && getIcon(selectedNotif.type)}
              </View>
              <TouchableOpacity onPress={() => setSelectedNotif(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalTitle}>{selectedNotif?.title}</Text>
              <Text style={styles.modalTime}>{selectedNotif?.time}</Text>
              
              <View style={styles.messageBox}>
                <Text style={styles.modalMessageText}>{selectedNotif?.message}</Text>
              </View>
              
              {selectedNotif?.type === 'customer' && (
                <TouchableOpacity style={styles.replyBtn} onPress={() => setSelectedNotif(null)}>
                  <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.replyBtnText}>ตอบกลับลูกค้า</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 44,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unreadIconContainer: {
    backgroundColor: '#ffffff',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#064e3b',
    fontWeight: '900',
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
    alignSelf: 'center',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 24,
    paddingTop: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalTime: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 20,
  },
  messageBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  modalMessageText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  replyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
