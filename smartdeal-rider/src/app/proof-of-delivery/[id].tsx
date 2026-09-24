import React, { useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Image, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function ProofOfDelivery() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rider } = useAuth();
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องอนุญาตกล้อง', 'กรุณาอนุญาตการใช้กล้องเพื่อถ่ายหลักฐานการส่งสินค้า');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: [4, 3], 
      quality: 0.8 
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProofImage(result.assets[0].uri);
    }
  };

  const handleConfirm = async () => {
    const riderId = rider?.id || (rider as any)?.rider_id;
    if (!proofImage) { 
      Alert.alert('ยังไม่มีหลักฐาน', 'กรุณาถ่ายรูปหลักฐานการส่งก่อนยืนยัน'); 
      return; 
    }
    if (!riderId || !id) { 
      Alert.alert('ข้อมูลไม่ครบ', 'ไม่พบข้อมูลไรเดอร์หรือหมายเลขคำสั่งซื้อ'); 
      return; 
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('rider_id', String(riderId));
      formData.append('proof_image', { 
        uri: proofImage, 
        name: `delivery-${id}.jpg`, 
        type: 'image/jpeg' 
      } as any);
      
      const response = await api.post(`/rider/deliveries/${id}/complete`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'บันทึกหลักฐานไม่สำเร็จ');
      
      Alert.alert('จัดส่งสำเร็จแล้ว 🎉', 'ระบบบันทึกหลักฐานและโอนรายได้เข้ากระเป๋าเงินของคุณเรียบร้อยแล้ว', [
        { text: 'ยอดเยี่ยม', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      Alert.alert('ยืนยันการส่งไม่สำเร็จ', error.response?.data?.message || error.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ยืนยันการจัดส่งสินค้า</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Identifier Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderIconBox}>
            <MaterialCommunityIcons name="receipt-text-check" size={24} color="#059669" />
          </View>
          <View>
            <Text style={styles.orderLabel}>หมายเลขคำสั่งซื้อ</Text>
            <Text style={styles.orderNumber}>#{id}</Text>
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.sectionTitle}>ถ่ายภาพหลักฐานการส่งมอบสินค้า</Text>
        <Text style={styles.sectionSubtitle}>ถ่ายภาพสินค้า ณ จุดส่ง หรือขณะส่งมอบให้ลูกค้าเพื่อเป็นหลักฐาน</Text>

        {/* Upload Container */}
        <TouchableOpacity 
          style={[styles.uploadArea, proofImage && styles.uploadAreaFilled]} 
          activeOpacity={0.9}
          onPress={pickImage}
        >
          {proofImage ? (
            <Image source={{ uri: proofImage }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.cameraIconCircle}>
                <MaterialCommunityIcons name="camera-plus" size={36} color="#059669" />
              </View>
              <Text style={styles.placeholderTitle}>แตะเพื่อเปิดกล้องถ่ายรูป</Text>
              <Text style={styles.placeholderText}>ภาพถ่ายควรคมชัด มองเห็นสินค้าและสถานที่ชัดเจน</Text>
            </View>
          )}
        </TouchableOpacity>

        {proofImage && (
          <TouchableOpacity style={styles.retakeBtn} onPress={pickImage}>
            <Ionicons name="camera-reverse-outline" size={18} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.retakeText}>ถ่ายภาพใหม่</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer Confirm */}
      <View style={styles.footer}>
        <TouchableOpacity 
          disabled={submitting || !proofImage} 
          style={[styles.confirmBtn, (submitting || !proofImage) && styles.disabledBtn]} 
          onPress={handleConfirm}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-decagram" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmText}>ยืนยันและจบงานนี้</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 54 : 44, 
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#0f172a' 
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { 
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    borderRadius: 18, 
    padding: 16, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderLabel: { 
    fontSize: 12, 
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  orderNumber: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0f172a' 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0f172a', 
    marginBottom: 4 
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  uploadArea: { 
    height: 290, 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    borderColor: '#6ee7b7', 
    backgroundColor: '#f0fdf4', 
    borderRadius: 22, 
    overflow: 'hidden', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadAreaFilled: {
    borderStyle: 'solid',
    borderColor: '#059669',
  },
  placeholder: { 
    alignItems: 'center', 
    padding: 24 
  },
  cameraIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  placeholderTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0f172a',
    marginBottom: 6,
  },
  placeholderText: { 
    textAlign: 'center', 
    color: '#64748b', 
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 220,
  },
  image: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  retakeBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center', 
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
  },
  retakeText: { 
    color: '#059669', 
    fontWeight: '800',
    fontSize: 13,
  },
  footer: { 
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16, 
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  confirmBtn: { 
    minHeight: 52, 
    borderRadius: 16, 
    backgroundColor: '#059669', 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexDirection: 'row', 
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '800' 
  },
  disabledBtn: { 
    opacity: 0.5,
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
});
