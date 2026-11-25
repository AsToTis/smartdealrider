import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Modal, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// แปลงประเภทแจ้งเตือนจากฐานข้อมูลให้ตรงกับไอคอนเดิมของหน้าจอ
const mapType = (t: string) => {
  if (!t) return 'system';
  if (t === 'message' || t.includes('chat')) return 'customer';
  if (t.includes('shop') || t === 'store') return 'store';
  return 'system';
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { rider } = useAuth();
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // การแจ้งเตือนจริงจากฐานข้อมูล (ตาราง notifications)
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = useCallback(async () => {
    const userId = (rider as any)?.user_id;
    if (!userId) return;
    try {
      const res = await api.get(`/notifications/${userId}`);
      if (res.data?.success && Array.isArray(res.data.notifications)) {
        setNotifications(res.data.notifications.map((n: any) => ({
          id: String(n.notification_id),
          notification_id: n.notification_id,
          title: n.title,
          message: n.message,
          time: n.time_ago,
          type: mapType(n.type),
          read: !!n.is_read,
        })));
      }
    } catch (e) {
      console.error('Fetch rider notifications error:', e);
    }
  }, [rider]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handlePressNotification = (item: any) => {
    // Mark as read (บันทึกลงฐานข้อมูล)
    setNotifications(prev =>
      prev.map(n => n.id === item.id ? { ...n, read: true } : n)
    );
    if (!item.read && item.notification_id) {
      api.put(`/notifications/${item.notification_id}/read`).catch(() => {});
    }

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
        ListEmptyComponent={
          <Text style={[styles.message, { textAlign: 'center', marginTop: 40 }]}>ยังไม่มีการแจ้งเตือน</Text>
        }
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
