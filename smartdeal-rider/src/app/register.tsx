import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../utils/api';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const isRejectedParam = params.isRejected === 'true';
  const rejectReasonParam = params.reason as string || 'ไม่ระบุเหตุผล';
  const riderData = params.riderData ? JSON.parse(params.riderData as string) : {};
  const userData = params.userData ? JSON.parse(params.userData as string) : {};
  
  const [isRejectedScreen, setIsRejectedScreen] = useState(isRejectedParam);
  
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('file://')) return null; // Force re-upload
    return `${api.defaults.baseURL?.replace('/api', '')}${path}`;
  };

  // Step 1: Account Info
  const [email, setEmail] = useState(userData.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(userData.phone || '');

  // Step 2: Personal Info
  const [realName, setRealName] = useState(riderData.real_name || '');
  const [idCardImage, setIdCardImage] = useState<string | null>(getImageUrl(riderData.id_card_image));

  // Step 3: Vehicle Info
  const [vehicleType, setVehicleType] = useState(riderData.vehicle_type || 'motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState(riderData.vehicle_plate || '');
  const [licenseNumber, setLicenseNumber] = useState(riderData.license_number || '');
  const [vehicleDocImage, setVehicleDocImage] = useState<string | null>(getImageUrl(riderData.vehicle_doc_image));
  const [licenseImage, setLicenseImage] = useState<string | null>(getImageUrl(riderData.license_image));
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async (setImageFunc: (uri: string) => void) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageFunc(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!email.trim() || !password || !confirmPassword || !phone.trim()) return Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลบัญชีให้ครบถ้วน');
      if (password !== confirmPassword) return Alert.alert('ข้อผิดพลาด', 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      if (password.length < 6) return Alert.alert('ข้อผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      if (phone.length < 9) return Alert.alert('ข้อผิดพลาด', 'เบอร์โทรศัพท์ไม่ถูกต้อง');
    } else if (step === 2) {
      if (!realName.trim()) return Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อ-นามสกุลจริง');
      if (!idCardImage) return Alert.alert('ข้อผิดพลาด', 'กรุณาถ่ายรูปหรืออัปโหลดรูปบัตรประชาชน');
    }
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!vehiclePlate.trim()) return Alert.alert('ข้อผิดพลาด', 'กรุณากรอกป้ายทะเบียนรถ');
    if (!licenseNumber.trim()) return Alert.alert('ข้อผิดพลาด', 'กรุณากรอกเลขที่ใบอนุญาตขับขี่');
    if (!vehicleDocImage) return Alert.alert('ข้อผิดพลาด', 'กรุณาถ่ายรูปหรืออัปโหลดรูปป้ายวงกลม/เล่มทะเบียนรถ');
    if (!licenseImage) return Alert.alert('ข้อผิดพลาด', 'กรุณาถ่ายรูปหรืออัปโหลดรูปใบอนุญาตขับขี่');
    if (!termsAccepted) return Alert.alert('ข้อผิดพลาด', 'กรุณายอมรับเงื่อนไขและการตรวจสอบประวัติ');

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phone', phone);
      // We use realName for both 'name' and 'real_name' since they want to simplify it
      formData.append('name', realName);
      formData.append('real_name', realName);
      formData.append('vehicle_type', vehicleType);
      formData.append('vehicle_plate', vehiclePlate);
      formData.append('license_number', licenseNumber);

      if (idCardImage && !idCardImage.startsWith('http')) {
        const filename = idCardImage.split('/').pop() || 'idcard.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        formData.append('id_card_image', {
          uri: idCardImage,
          name: filename,
          type: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        } as any);
      }
      
      if (licenseImage && !licenseImage.startsWith('http')) {
        const filename = licenseImage.split('/').pop() || 'license.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        formData.append('license_image', {
          uri: licenseImage,
          name: filename,
          type: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        } as any);
      }
      
      if (vehicleDocImage && !vehicleDocImage.startsWith('http')) {
        const filename = vehicleDocImage.split('/').pop() || 'vehicledoc.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        formData.append('vehicle_doc_image', {
          uri: vehicleDocImage,
          name: filename,
          type: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
        } as any);
      }

      const responseData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${api.defaults.baseURL}/rider/register`);
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data);
            } else {
              reject(new Error(data.message || data.error || 'เซิร์ฟเวอร์แจ้งข้อผิดพลาด'));
            }
          } catch (e) {
            reject(new Error('เซิร์ฟเวอร์ส่งข้อมูลกลับมาผิดพลาด (อาจเป็น 500 HTML Error)'));
          }
        };
        xhr.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย'));
        xhr.send(formData);
      });

      Alert.alert(
        'สมัครสำเร็จ!',
        'สมัครสำเร็จ กรุณารอแอดมินอนุมัติ',
        [
          { text: 'ตกลง', onPress: () => router.replace('/login') }
        ]
      );
    } catch (error: any) {
      // Check if it's a duplicate email/phone error
      const errorMsg = error.message || 'ไม่สามารถสมัครสมาชิกได้';
      if (errorMsg.includes('อีเมลหรือเบอร์โทรศัพท์นี้ถูกใช้งานแล้ว')) {
        Alert.alert('ข้อมูลซ้ำ', 'อีเมลหรือเบอร์โทรศัพท์นี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ หรือใช้ข้อมูลอื่น');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----- Render Helpers -----

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>ขั้นตอนที่ {step} จาก {totalSteps}</Text>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="mail-outline" size={28} color="#2e7d32" />
        <Text style={styles.sectionTitle}>ข้อมูลบัญชีผู้ใช้</Text>
      </View>
      
      <Text style={styles.label}>อีเมล (Email)</Text>
      <TextInput
        style={styles.input}
        placeholder="example@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>รหัสผ่าน (Password)</Text>
      <TextInput
        style={styles.input}
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>ยืนยันรหัสผ่าน (Confirm Password)</Text>
      <TextInput
        style={styles.input}
        placeholder="••••••••"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>เบอร์โทรศัพท์</Text>
      <TextInput
        style={styles.input}
        placeholder="08X-XXX-XXXX"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>ถัดไป</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="person-circle-outline" size={28} color="#2e7d32" />
        <Text style={styles.sectionTitle}>ข้อมูลส่วนตัวและการยืนยันตัวตน</Text>
      </View>
      
      <Text style={styles.label}>ชื่อ-นามสกุลจริง (ตามบัตรประชาชน)</Text>
      <TextInput
        style={styles.input}
        placeholder="สมชาย ใจดี"
        value={realName}
        onChangeText={setRealName}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>รูปถ่ายบัตรประชาชน</Text>
      <TouchableOpacity style={styles.uploadArea} onPress={() => pickImage(setIdCardImage)}>
        {idCardImage ? (
          <Image source={{ uri: idCardImage }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <View style={styles.cameraIconBg}>
              <Ionicons name="camera" size={28} color="#fff" />
            </View>
            <Text style={styles.uploadTextTitle}>ถ่ายรูปหรืออัปโหลด</Text>
            <Text style={styles.uploadTextSubtitle}>รูปถ่ายบัตรประชาชน</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handlePrev}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={styles.secondaryButtonText}>ย้อนกลับ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginLeft: 12, marginTop: 0 }]} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>ถัดไป</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="bike" size={28} color="#2e7d32" />
        <Text style={styles.sectionTitle}>ข้อมูลพาหนะและใบขับขี่</Text>
      </View>
      
      <Text style={styles.label}>ประเภทยานพาหนะ</Text>
      <View style={styles.vehicleTypeContainer}>
        <TouchableOpacity 
          style={[styles.vehicleTypeBtn, vehicleType === 'motorcycle' && styles.vehicleTypeBtnActive]}
          onPress={() => setVehicleType('motorcycle')}
        >
          <MaterialCommunityIcons name="motorbike" size={32} color={vehicleType === 'motorcycle' ? '#2e7d32' : '#666'} />
          <Text style={[styles.vehicleTypeText, vehicleType === 'motorcycle' && styles.vehicleTypeTextActive]}>มอเตอร์ไซค์</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.vehicleTypeBtn, vehicleType === 'car' && styles.vehicleTypeBtnActive]}
          onPress={() => setVehicleType('car')}
        >
          <MaterialCommunityIcons name="car" size={32} color={vehicleType === 'car' ? '#2e7d32' : '#666'} />
          <Text style={[styles.vehicleTypeText, vehicleType === 'car' && styles.vehicleTypeTextActive]}>รถยนต์</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>ป้ายทะเบียนรถ</Text>
      <TextInput
        style={styles.input}
        placeholder="เช่น 1กข 1234 กทม"
        value={vehiclePlate}
        onChangeText={setVehiclePlate}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>เลขที่ใบอนุญาตขับขี่</Text>
      <TextInput
        style={styles.input}
        placeholder="เช่น 12345678"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>รูปป้ายวงกลม / เล่มทะเบียนรถ</Text>
      <TouchableOpacity style={styles.uploadArea} onPress={() => pickImage(setVehicleDocImage)}>
        {vehicleDocImage ? (
          <Image source={{ uri: vehicleDocImage }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <View style={styles.cameraIconBg}>
              <Ionicons name="camera" size={28} color="#fff" />
            </View>
            <Text style={styles.uploadTextTitle}>ถ่ายรูปหรืออัปโหลด</Text>
            <Text style={styles.uploadTextSubtitle}>รูปรถหรือป้ายวงกลม</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>รูปถ่ายใบอนุญาตขับขี่</Text>
      <TouchableOpacity style={styles.uploadArea} onPress={() => pickImage(setLicenseImage)}>
        {licenseImage ? (
          <Image source={{ uri: licenseImage }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <View style={styles.cameraIconBg}>
              <Ionicons name="camera" size={28} color="#fff" />
            </View>
            <Text style={styles.uploadTextTitle}>ถ่ายรูปหรืออัปโหลด</Text>
            <Text style={styles.uploadTextSubtitle}>รูปถ่ายใบอนุญาตขับขี่</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.checkboxContainer} 
        onPress={() => setTermsAccepted(!termsAccepted)}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={styles.checkboxLabel}>ข้าพเจ้ายอมรับเงื่อนไขและการตรวจสอบประวัติ</Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handlePrev} disabled={isSubmitting}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={styles.secondaryButtonText}>ย้อนกลับ</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitButton, { flex: 1, marginLeft: 12, marginBottom: 0 }]} 
          onPress={handleSubmit} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>บันทึกและสมัครสมาชิก</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isRejectedScreen) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialIcons name="error-outline" size={80} color="#ef4444" />
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20, color: '#0f172a', textAlign: 'center' }}>
            คำขอสมัครไรเดอร์ไม่ผ่านการอนุมัติ
          </Text>
          <Text style={{ textAlign: 'center', color: '#ef4444', marginTop: 10, lineHeight: 22, fontWeight: '600' }}>
            เหตุผล: {rejectReasonParam}
          </Text>
          <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 10, lineHeight: 22 }}>
            กรุณาแก้ไขข้อมูลและแนบเอกสารให้ถูกต้อง แล้วส่งคำขอเข้ามาใหม่อีกครั้ง
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#16a34a', paddingVertical: 16, borderRadius: 14, width: '100%', marginTop: 30, alignItems: 'center' }} 
            onPress={() => setIsRejectedScreen(false)}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>แก้ไขข้อมูลและส่งใหม่</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>สมัครเป็นพนักงานส่งของ</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {renderProgressBar()}
          
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#f5f7f9',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#2e7d32',
    borderRadius: 4,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleTypeBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  vehicleTypeBtnActive: {
    borderColor: '#2e7d32',
    backgroundColor: '#f1f8e9',
  },
  vehicleTypeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  vehicleTypeTextActive: {
    color: '#2e7d32',
  },
  uploadArea: {
    backgroundColor: '#f1f8e9',
    borderWidth: 1.5,
    borderColor: '#c5e1a5',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 8,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  cameraIconBg: {
    backgroundColor: '#81c784',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTextTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  uploadTextSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2e7d32',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2e7d32',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
