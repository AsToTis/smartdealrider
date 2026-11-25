const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== 1. PATCHING BUYER ORDER-TRACKING.TSX ===');
const trackingPath = 'C:/smartdeal/smart-deal-app/src/app/order-tracking.tsx';
let trackingContent = fs.readFileSync(trackingPath, 'utf8');

const oldHandleChat = `  const handleChat = () => {
    Alert.alert('แชทกับคนขับ', 'ระบบแชทสดกำลังเปิดให้บริการกับไรเดอร์ของคุณ');
  };`;

const newHandleChat = `  const handleChat = () => {
    router.push({
      pathname: '/order-chat',
      params: {
        order_id: orderId,
        role: 'buyer',
        user_id: tracking?.user_id || 2,
        target: 'rider'
      }
    });
  };`;

if (trackingContent.includes(oldHandleChat)) {
  trackingContent = trackingContent.replace(oldHandleChat, newHandleChat);
  fs.writeFileSync(trackingPath, trackingContent, 'utf8');
  console.log('✅ Connected buyer handleChat to live /order-chat');
}

console.log('\n=== 2. ENHANCING BUYER ORDER-CHAT.TSX WITH RIDER ROLE & PHOTOS ===');
const chatPath = 'C:/smartdeal/smart-deal-app/src/app/order-chat.tsx';
let chatContent = fs.readFileSync(chatPath, 'utf8');

const oldRender = `  const renderMessage = ({ item }: { item: any }) => {
    // Determine if message is from self
    const isSelf = item.sender_type === role;

    return (
      <View style={[styles.messageRow, isSelf ? styles.messageRowSelf : styles.messageRowOther]}>
        <View style={[styles.messageBubble, isSelf ? styles.messageBubbleSelf : styles.messageBubbleOther]}>
          <Text style={[styles.messageText, isSelf ? styles.messageTextSelf : styles.messageTextOther]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isSelf ? styles.messageTimeSelf : styles.messageTimeOther]}>
            {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };`;

const newRender = `  const renderMessage = ({ item }: { item: any }) => {
    const isSelf = item.sender_type === role;
    const isRider = item.sender_type === 'rider';
    const isSeller = item.sender_type === 'seller';
    const isBuyer = item.sender_type === 'buyer';

    const roleTag = isRider ? '🛵 ไรเดอร์' : isSeller ? '🏪 ร้านค้า' : '👤 ลูกค้า';

    return (
      <View style={[styles.messageRow, isSelf ? styles.messageRowSelf : styles.messageRowOther]}>
        <View style={[
          styles.messageBubble, 
          isSelf ? styles.messageBubbleSelf : isRider ? styles.messageBubbleRider : styles.messageBubbleOther
        ]}>
          <Text style={[styles.senderRoleText, isSelf ? styles.senderRoleSelf : isRider ? styles.senderRoleRider : styles.senderRoleOther]}>
            {isSelf ? 'คุณ' : roleTag}
          </Text>

          {item.image_url && (
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.attachedImage} 
              resizeMode="cover" 
            />
          )}

          {!!item.message && (
            <Text style={[styles.messageText, isSelf ? styles.messageTextSelf : isRider ? styles.messageTextRider : styles.messageTextOther]}>
              {item.message}
            </Text>
          )}

          <Text style={[styles.messageTime, isSelf ? styles.messageTimeSelf : isRider ? styles.messageTimeRider : styles.messageTimeOther]}>
            {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };`;

if (chatContent.includes(oldRender)) {
  chatContent = chatContent.replace(oldRender, newRender);
  
  if (!chatContent.includes('import { \n  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image \n}')) {
    chatContent = chatContent.replace(
      "import { \n  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator \n}",
      "import { \n  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image \n}"
    );
  }

  // Add styling for rider bubble and image
  const extraStyles = `  messageBubbleRider: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    borderBottomLeftRadius: 4,
  },
  senderRoleText: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  senderRoleSelf: { color: '#bbf7d0' },
  senderRoleRider: { color: '#059669' },
  senderRoleOther: { color: '#0284c7' },
  messageTextRider: { color: '#064e3b', fontWeight: '500' },
  messageTimeRider: { color: '#059669', fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  attachedImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginVertical: 4,
  },`;

  chatContent = chatContent.replace('  messageBubbleSelf: {', extraStyles + '\n  messageBubbleSelf: {');
  fs.writeFileSync(chatPath, chatContent, 'utf8');
  console.log('✅ Updated buyer order-chat.tsx with multi-role and photo support');
}
