const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== 1. PATCHING BACKEND SERVER.JS FOR STRICT CHAT SEPARATION & PHOTO DISPATCH ===');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Replace /api/orders/:order_id/messages endpoint
const oldGetMessages = `app.get('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  const target = req.query.target; // 'seller' or 'rider'
  try {
    let query = 'SELECT * FROM order_messages WHERE order_id = ?';
    const params = [orderId];

    if (target === 'seller') {
      query += ' AND (receiver_type IN ("seller", "all") OR sender_type IN ("buyer", "seller"))';
    } else if (target === 'rider') {
      query += ' AND (receiver_type IN ("rider", "all") OR sender_type IN ("buyer", "rider"))';
    }

    query += ' ORDER BY created_at ASC';

    const [messages] = await db.query(query, params);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});`;

const newGetMessages = `app.get('/api/orders/:order_id/messages', async (req, res) => {
  const orderId = req.params.order_id;
  const target = req.query.target || req.query.channel; // 'seller' or 'buyer'
  try {
    let query = 'SELECT id, order_id, sender_id, sender_type, receiver_type, message, image_url, created_at FROM order_messages WHERE order_id = ?';
    const params = [orderId];

    // แยกช่องทางแชทอย่างเด็ดขาด 100%
    if (target === 'seller') {
      // ช่องทางร้านค้า ↔ ไรเดอร์: แสดงเฉพาะข้อความระหว่างร้านค้าและไรเดอร์เท่านั้น (ไม่ปนกับลูกค้า)
      query += ' AND (receiver_type = "seller" OR sender_type = "seller")';
    } else if (target === 'buyer' || target === 'rider') {
      // ช่องทางลูกค้า ↔ ไรเดอร์: แสดงเฉพาะข้อความระหว่างลูกค้าและไรเดอร์เท่านั้น (ไม่ปนกับร้านค้า)
      query += ' AND (receiver_type = "buyer" OR sender_type = "buyer" OR receiver_type = "rider")';
    }

    query += ' ORDER BY created_at ASC';

    const [messages] = await db.query(query, params);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อความได้' });
  }
});`;

if (serverContent.includes(oldGetMessages)) {
  serverContent = serverContent.replace(oldGetMessages, newGetMessages);
  console.log('✅ Updated GET /api/orders/:order_id/messages with strict channel separation');
} else {
  // Regex fallback
  serverContent = serverContent.replace(
    /app\.get\('\/api\/orders\/:order_id\/messages'[\s\S]*?res\.json\(\{\s*success:\s*true,\s*messages\s*\}\);[\s\S]*?\}\);/,
    newGetMessages
  );
  console.log('✅ Replaced GET /api/orders/:order_id/messages using regex');
}

// Update /api/rider/deliveries/:order_id/pickup to post photo to BOTH seller and buyer channels
const oldPickupPost = `    // Auto post system chat message notifying shop and buyer that food is picked up
    try {
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "all", ?, ?)',
        [orderId, rider_id, '🛵 [ยืนยันรับสินค้าแล้ว] ไรเดอร์ได้รับสินค้าจากร้านค้าเรียบร้อยแล้ว กำลังเดินทางไปส่งครับ', uploadedImage || null]
      );
    } catch(e) {}`;

const newPickupPost = `    // Auto post separate chat messages & photos to Shop and Buyer
    try {
      // 1. ส่งรูปและแจ้งเตือนเข้าช่องแชทร้านค้า
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "seller", ?, ?)',
        [orderId, rider_id, '🛵 [ยืนยันรับสินค้าแล้ว] ไรเดอร์ได้รับสินค้าจากทางร้านเรียบร้อยแล้ว กำลังเดินทางไปส่งลูกค้าครับ', uploadedImage || null]
      );

      // 2. ส่งรูปและแจ้งเตือนเข้าช่องแชทลูกค้า
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "buyer", ?, ?)',
        [orderId, rider_id, '🍱 [ร้านเตรียมสินค้าเสร็จแล้ว] ไรเดอร์รับสินค้าจากร้านค้าเรียบร้อยแล้ว กำลังเดินทางไปส่งให้คุณครับ', uploadedImage || null]
      );
    } catch(e) {}`;

if (serverContent.includes(oldPickupPost)) {
  serverContent = serverContent.replace(oldPickupPost, newPickupPost);
  console.log('✅ Updated pickup endpoint to post photo to both seller and buyer chat channels');
}

// Update /api/rider/deliveries/:order_id/complete to post photo to BOTH buyer and seller channels
const oldCompletePost = `    // Auto post delivery proof message to chat
    try {
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "all", ?, ?)',
        [orderId, rider_id, '📸 [ส่งมอบสำเร็จ] ไรเดอร์ได้นำส่งสินค้าให้ลูกค้าเรียบร้อยแล้วครับ', proof_image || null]
      );
    } catch(e) {}`;

const newCompletePost = `    // Auto post separate dropoff proof messages & photos to Buyer and Shop
    try {
      // 1. ส่งรูปหลักฐานเข้าช่องแชทลูกค้าเพื่อให้ตรวจสอบและกดยืนยันรับของ
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "buyer", ?, ?)',
        [orderId, rider_id, '📸 [ส่งมอบสินค้าแล้ว] ไรเดอร์ได้นำส่งสินค้าถึงจุดส่งเรียบร้อยแล้ว รบกวนตรวจสอบและกดยืนยันการรับสินค้าในระบบครับ', proof_image || null]
      );

      // 2. ส่งรูปหลักฐานเข้าช่องแชทร้านค้าเพื่อแจ้งว่าสินค้าส่งถึงลูกค้าแล้ว
      await connection.query(
        'INSERT INTO order_messages (order_id, sender_id, sender_type, receiver_type, message, image_url) VALUES (?, ?, "rider", "seller", ?, ?)',
        [orderId, rider_id, '🎉 [ส่งมอบถึงลูกค้าแล้ว] ไรเดอร์จัดส่งสินค้าถึงมือลูกค้าเรียบร้อยแล้วครับ', proof_image || null]
      );
    } catch(e) {}`;

if (serverContent.includes(oldCompletePost)) {
  serverContent = serverContent.replace(oldCompletePost, newCompletePost);
  console.log('✅ Updated complete endpoint to post dropoff photo to both buyer and seller chat channels');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('\n=== 2. PATCHING RIDER ORDER-CHAT SCREEN WITH STRICT 2-CHANNEL TABS ===');
const riderChatPath = 'c:/smartdealrider/smartdeal-rider/src/app/chat/[id].tsx';
const riderChatCode = `import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const quickRepliesSeller = [
  'กำลังเดินทางไปที่ร้านครับ 🛵',
  'ถึงหน้าร้านแล้วครับ 🏪',
  'อาหารใกล้เสร็จหรือยังครับ? ⏳',
  'รับสินค้าเรียบร้อยแล้วครับ 🍱',
  'ขอบคุณครับ 🙏',
];

const quickRepliesBuyer = [
  'กำลังเดินทางไปส่งสินค้าครับ 🛵',
  'อาหารรับจากร้านแล้ว กำลังไปส่งครับ 🍱',
  'ถึงจุดส่งสินค้าแล้วครับ 📍',
  'วางสินค้าไว้หน้าบ้านเรียบร้อยครับ 📦',
  'รบกวนรับโทรศัพท์สักครู่นะครับ 📞',
  'ขอบคุณที่ใช้บริการครับ 🙏',
];

export default function OrderChatScreen() {
  const router = useRouter();
  const { id, target } = useLocalSearchParams<{ id: string; target?: string }>();
  const { rider } = useAuth();
  const orderId = Number(id);
  const riderId = rider?.id || (rider as any)?.rider_id || 1;

  // 2 Distinct Channels: 'seller' (ร้านค้า) and 'buyer' (ลูกค้า)
  const [activeChannel, setActiveChannel] = useState<'seller' | 'buyer'>(
    target === 'seller' ? 'seller' : 'buyer'
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
      const res = await api.get(\`/orders/\${orderId}/messages?target=\${activeChannel}\`);
      if (res.data?.success && Array.isArray(res.data.messages)) {
        setMessages(res.data.messages);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [orderId, activeChannel]);

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
          setSelectedImage(\`data:image/jpeg;base64,\${asset.base64}\`);
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
      const payload = {
        sender_id: riderId,
        sender_type: 'rider',
        receiver_type: activeChannel, // Strictly 'seller' or 'buyer'
        message: textToSend,
        image_url: selectedImage || null,
      };

      const res = await api.post(\`/orders/\${orderId}/messages\`, payload);
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

  const currentQuickReplies = activeChannel === 'seller' ? quickRepliesSeller : quickRepliesBuyer;

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_type === 'rider';
    const isSeller = item.sender_type === 'seller';
    const isBuyer = item.sender_type === 'buyer';

    const roleTag = isMe 
      ? '🛵 ไรเดอร์ (คุณ)' 
      : isSeller 
        ? '🏪 ร้านค้า' 
        : '👤 ลูกค้า';

    const timeStr = item.created_at
      ? new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : '';

    const imageUrl = item.image_url 
      ? (item.image_url.startsWith('http') || item.image_url.startsWith('data:') 
          ? item.image_url 
          : \`https://smartdeal-backend-vhjo.onrender.com\${item.image_url}\`)
      : null;

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
          <View style={styles.bubbleMeta}>
            <Text style={[styles.roleTagText, isMe ? styles.roleTagMe : isSeller ? styles.roleTagSeller : styles.roleTagBuyer]}>
              {roleTag}
            </Text>
            <Text style={[styles.msgTime, isMe && { color: '#bbf7d0' }]}>{timeStr}</Text>
          </View>

          {imageUrl && (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.chatImage} 
              resizeMode="cover"
            />
          )}

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
          <Text style={styles.headerTitle}>แชทออเดอร์ #{orderId}</Text>
          <Text style={styles.headerSubtitle}>
            {activeChannel === 'seller' ? 'ห้องสนทนากับ ร้านค้า 🏪' : 'ห้องสนทนากับ ลูกค้า 👤'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchMessages(true)}>
          <Ionicons name="refresh" size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      {/* 2-Channel Strict Segregated Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeChannel === 'seller' && styles.tabBtnActiveSeller]} 
          onPress={() => setActiveChannel('seller')}
        >
          <MaterialCommunityIcons 
            name="storefront" 
            size={16} 
            color={activeChannel === 'seller' ? '#0284c7' : '#64748b'} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[styles.tabText, activeChannel === 'seller' && styles.tabTextActiveSeller]}>
            แชทกับร้านค้า
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeChannel === 'buyer' && styles.tabBtnActiveBuyer]} 
          onPress={() => setActiveChannel('buyer')}
        >
          <MaterialCommunityIcons 
            name="account" 
            size={16} 
            color={activeChannel === 'buyer' ? '#059669' : '#64748b'} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[styles.tabText, activeChannel === 'buyer' && styles.tabTextActiveBuyer]}>
            แชทกับลูกค้า
          </Text>
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
            <Text style={styles.loadingText}>กำลังโหลดข้อความ...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBg}>
              <MaterialCommunityIcons 
                name={activeChannel === 'seller' ? 'storefront-outline' : 'account-outline'} 
                size={48} 
                color="#94a3b8" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeChannel === 'seller' ? 'ยังไม่มีข้อความกับร้านค้า' : 'ยังไม่มีข้อความกับลูกค้า'}
            </Text>
            <Text style={styles.emptySub}>
              {activeChannel === 'seller' 
                ? 'สอบถามสถานะอาหาร หรือส่งรูปภาพให้ทางร้านค้าได้ที่นี่' 
                : 'แจ้งสถานะการส่ง หรือส่งรูปภาพให้ลูกค้าได้ที่นี่'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
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
            data={currentQuickReplies}
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
            placeholder={activeChannel === 'seller' ? 'พิมพ์ข้อความถึงร้านค้า...' : 'พิมพ์ข้อความถึงลูกค้า...'}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity
            disabled={sending || (!inputText.trim() && !selectedImage)}
            style={[
              styles.sendBtn,
              (sending || (!inputText.trim() && !selectedImage)) && styles.sendBtnDisabled,
              activeChannel === 'seller' && { backgroundColor: '#0284c7' }
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
    fontWeight: '700',
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
    borderRadius: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabBtnActiveSeller: {
    backgroundColor: '#ffffff',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnActiveBuyer: {
    backgroundColor: '#ffffff',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActiveSeller: {
    color: '#0284c7',
    fontWeight: '800',
  },
  tabTextActiveBuyer: {
    color: '#059669',
    fontWeight: '800',
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
    color: '#94a3b8',
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
    width: 220,
    height: 160,
    borderRadius: 12,
    marginVertical: 6,
    backgroundColor: '#e2e8f0',
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
`;

fs.writeFileSync(riderChatPath, riderChatCode, 'utf8');
console.log('✅ Updated rider OrderChatScreen with strictly separated Seller and Buyer channels');

console.log('\n=== 3. PATCHING BUYER / SELLER ORDER-CHAT.TSX ===');
const buyerChatPath = 'C:/smartdeal/smart-deal-app/src/app/order-chat.tsx';
let buyerChatContent = fs.readFileSync(buyerChatPath, 'utf8');

// Ensure buyer app passes ?target=buyer or ?target=seller
buyerChatContent = buyerChatContent.replace(
  "const targetParam = target ? `?target=${target}` : '';",
  "const targetParam = target ? `?target=${target}` : (role === 'seller' ? '?target=seller' : '?target=buyer');"
);

fs.writeFileSync(buyerChatPath, buyerChatContent, 'utf8');
console.log('✅ Updated buyer order-chat.tsx target filtering');

console.log('\n=== 4. COMMITTING AND PUSHING TO GITHUB ===');
try {
  execSync('git add smart-deal-backend/src/server.js smart-deal-app/src/app/order-chat.tsx', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git commit -m "fix: strictly separate shop and customer chat channels and dispatch photos to both parties"', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  console.log('✅ smartdeal pushed successfully');
} catch (e) {
  console.log('smartdeal push error:', e.message);
}

try {
  execSync('git add smartdeal-rider/src/app/chat/[id].tsx', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git commit -m "fix: separate store and customer chat tabs and photo rendering in rider app"', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  console.log('✅ smartdealrider pushed successfully');
} catch (e) {
  console.log('smartdealrider push error:', e.message);
}
