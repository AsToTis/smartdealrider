import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: number;
  order_id: number;
  sender_id: number;
  sender_type: 'rider' | 'buyer' | 'seller' | 'system';
  receiver_type?: string;
  message: string;
  image_url?: string;
  created_at: string;
}

const quickReplies = [
  'กำลังเดินทางไปครับ 🛵',
  'ถึงหน้าร้านแล้วครับ 🏪',
  'รับอาหารแล้ว กำลังไปส่งครับ 🍱',
  'ถึงจุดส่งสินค้าแล้วครับ 📍',
  'วางสินค้าไว้เรียบร้อยแล้วครับ 📦',
  'รบกวนรับโทรศัพท์ด้วยครับ 📞',
];

export default function OrderChatScreen() {
  const router = useRouter();
  const { id, target } = useLocalSearchParams<{ id: string; target?: string }>();
  const { rider } = useAuth();
  const orderId = Number(id);
  const riderId = rider?.id || (rider as any)?.rider_id || 1;

  const [activeTab, setActiveTab] = useState<'all' | 'seller' | 'buyer'>(
    target === 'seller' ? 'seller' : target === 'buyer' ? 'buyer' : 'all'
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async (showLoading = false) => {
    if (!orderId) return;
    try {
      if (showLoading) setLoading(true);
      const res = await api.get(`/orders/${orderId}/messages`);
      if (res.data?.success && Array.isArray(res.data.messages)) {
        setMessages(res.data.messages);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchMessages(true);
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const pickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('ต้องอนุญาตกล้อง', 'กรุณาอนุญาตการเข้าถึงกล้องถ่ายรูป');
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
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('ต้องอนุญาตแกลเลอรี', 'กรุณาอนุญาตการเข้าถึงคลังภาพ');
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
          setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setSelectedImage(asset.uri);
        }
      }
    } catch (e: any) {
      Alert.alert('ข้อผิดพลาด', e.message || 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !selectedImage) return;

    try {
      setSending(true);
      const receiverType = activeTab === 'all' ? 'all' : activeTab;
      const payload = {
        sender_id: riderId,
        sender_type: 'rider',
        receiver_type: receiverType,
        message: textToSend,
        image_url: selectedImage || null,
      };

      const res = await api.post(`/orders/${orderId}/messages`, payload);
      if (res.data?.success) {
        setInputText('');
        setSelectedImage(null);
        await fetchMessages(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } else {
        throw new Error(res.data?.message || 'ส่งข้อความไม่สำเร็จ');
      }
    } catch (error: any) {
      Alert.alert('ส่งข้อความไม่สำเร็จ', error.response?.data?.message || error.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    if (activeTab === 'all') return true;
    if (m.sender_type === 'rider') {
      return m.receiver_type === activeTab || m.receiver_type === 'all' || !m.receiver_type;
    }
    return m.sender_type === activeTab;
  });

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_type === 'rider';
    const isSystem = item.sender_type === 'system';
    const isSeller = item.sender_type === 'seller';
    const isBuyer = item.sender_type === 'buyer';

    if (isSystem) {
      return (
        <View style={styles.systemMsgWrap}>
          <View style={styles.systemBadge}>
            <Text style={styles.systemText}>{item.message}</Text>
          </View>
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.chatImageSystem} />
          )}
        </View>
      );
    }

    const roleTag = isSeller ? '🏪 ร้านค้า' : isBuyer ? '👤 ลูกค้า' : '🛵 ไรเดอร์ (คุณ)';
    const timeStr = item.created_at
      ? new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && (
          <View style={[styles.avatarCircle, isSeller ? styles.avatarSeller : styles.avatarBuyer]}>
            <MaterialCommunityIcons 
              name={isSeller ? 'storefront' : 'account'} 
              size={16} 
              color="#fff" 
            />
          </View>
        )}

        <View style={[styles.bubbleContainer, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
          {/* Header role & time */}
          <View style={styles.bubbleMeta}>
            <Text style={[styles.roleTagText, isMe ? styles.roleTagMe : isSeller ? styles.roleTagSeller : styles.roleTagBuyer]}>
              {roleTag}
            </Text>
            <Text style={styles.msgTime}>{timeStr}</Text>
          </View>

          {/* Photo if present */}
          {item.image_url && (
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.chatImage} 
              resizeMode="cover"
            />
          )}

          {/* Text Message */}
          {!!item.message && (
            <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
              {item.message}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>แชทประจำออเดอร์ #{orderId}</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'seller' ? 'สนทนากับ ร้านค้า 🏪' : activeTab === 'buyer' ? 'สนทนากับ ลูกค้า 👤' : 'ข้อความทั้งหมด (รวมร้านค้า & ลูกค้า)'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchMessages(true)}>
          <Ionicons name="refresh" size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>ทั้งหมด</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'seller' && styles.tabBtnActiveSeller]} 
          onPress={() => setActiveTab('seller')}
        >
          <MaterialCommunityIcons name="storefront-outline" size={14} color={activeTab === 'seller' ? '#0284c7' : '#64748b'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, activeTab === 'seller' && styles.tabTextActiveSeller]}>ร้านค้า</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'buyer' && styles.tabBtnActiveBuyer]} 
          onPress={() => setActiveTab('buyer')}
        >
          <MaterialCommunityIcons name="account-outline" size={14} color={activeTab === 'buyer' ? '#059669' : '#64748b'} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, activeTab === 'buyer' && styles.tabTextActiveBuyer]}>ลูกค้า</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>กำลังโหลดข้อความแชท...</Text>
          </View>
        ) : filteredMessages.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBg}>
              <MaterialCommunityIcons name="chat-processing-outline" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>ยังไม่มีข้อความสนทนา</Text>
            <Text style={styles.emptySub}>
              คุณสามารถส่งข้อความสอบถามทางร้าน หรือแจ้งความคืบหน้าให้ลูกค้าทราบได้ที่นี่
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item) => String(item.id || Math.random())}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Quick Reply Presets */}
        <View style={styles.quickReplyContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={quickReplies}
            keyExtractor={(item, index) => String(index)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleSend(item)}
              >
                <Text style={styles.quickChipText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.quickList}
          />
        </View>

        {/* Image Attachment Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewBar}>
            <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
            <Text style={styles.previewLabel}>แนบรูปถ่ายพร้อมส่ง</Text>
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => pickImage(true)}>
            <Ionicons name="camera" size={22} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => pickImage(false)}>
            <Ionicons name="image" size={22} color="#0284c7" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder={`พิมพ์ข้อความถึง${activeTab === 'seller' ? 'ร้านค้า' : activeTab === 'buyer' ? 'ลูกค้า' : 'ทุกคน'}...`}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity
            disabled={sending || (!inputText.trim() && !selectedImage)}
            style={[
              styles.sendBtn,
              (sending || (!inputText.trim() && !selectedImage)) && styles.sendBtnDisabled
            ]}
            onPress={() => handleSend()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 44,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnActiveSeller: {
    backgroundColor: '#e0f2fe',
  },
  tabBtnActiveBuyer: {
    backgroundColor: '#ecfdf5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  tabTextActiveSeller: {
    color: '#0284c7',
  },
  tabTextActiveBuyer: {
    color: '#059669',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarSeller: {
    backgroundColor: '#0284c7',
  },
  avatarBuyer: {
    backgroundColor: '#10b981',
  },
  bubbleContainer: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleRight: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  roleTagMe: {
    color: '#d1fae5',
  },
  roleTagSeller: {
    color: '#0284c7',
  },
  roleTagBuyer: {
    color: '#059669',
  },
  msgTime: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextMe: {
    color: '#ffffff',
    fontWeight: '500',
  },
  msgTextOther: {
    color: '#0f172a',
    fontWeight: '500',
  },
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginVertical: 4,
  },
  systemMsgWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  systemText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '700',
    textAlign: 'center',
  },
  chatImageSystem: {
    width: 160,
    height: 110,
    borderRadius: 10,
    marginTop: 6,
  },
  quickReplyContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 6,
  },
  quickList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  previewLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  removeImageBtn: {
    padding: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  mediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
});
