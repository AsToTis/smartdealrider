import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, Image, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants/api';

export default function App() {
  const [screen, setScreen] = useState<'login' | 'register' | 'forgot'>('login');
  
  // 1. ข้อมูลสำหรับ Login
  const [identifier, setIdentifier] = useState('test@gmail.com');
  const [password, setPassword] = useState('123456password');
  const [showPassword, setShowPassword] = useState(false);
  
  // 2. ข้อมูลสำหรับ Register
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // 3. ข้อมูลสำหรับ Forgot Password (OTP 3 ขั้นตอน)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [user, setUser] = useState<any>(null);

  // นำ useEffect ที่สร้าง default user อัตโนมัติออก เพื่อให้ระบบจดจำสถานะการล็อกเอาท์ได้จริงๆ
  useEffect(() => {
    // สามารถเพิ่ม logic เช็ค session จริงๆ ที่นี่ได้ในอนาคต (เช่น ถ้ามี user ให้ redirect ไป /(tabs))
  }, []);

  // --- ฟังก์ชันฝั่ง Login & Register ---
  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    try {
      const res = await axios.post(`${BASE_URL}/login`, { identifier, password });
      setUser(res.data.user);
      
      // บันทึก User ลง AsyncStorage
      if (res.data?.user) {
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      }

      // เมื่อ Login สำเร็จ สั่งให้สลับไปยังกลุ่มหน้า (tabs) ทันที
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('ผิดพลาด', err.response?.data?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    try {
      const res = await axios.post(`${BASE_URL}/register`, {
        full_name: fullName, email, phone, password, role: 'buyer'
      });
      Alert.alert('สำเร็จ', res.data.message);
      setScreen('login');
    } catch (err: any) {
      Alert.alert('ผิดพลาด', err.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ');
    }
  };

  // --- ฟังก์ชันฝั่ง OTP ลืมรหัสผ่าน ---
  const handleRequestOTP = async () => {
    if (!forgotEmail) return Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมล');
    try {
      const res = await axios.post(`${BASE_URL}/forgot-password/request-otp`, { email: forgotEmail });
      Alert.alert('สำเร็จ', res.data.message);
      setForgotStep(2);
    } catch (err: any) {
      Alert.alert('ผิดพลาด', err.response?.data?.message || 'ส่ง OTP ไม่สำเร็จ');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput) return Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัส OTP 6 หลัก');
    try {
      await axios.post(`${BASE_URL}/forgot-password/verify-otp`, { email: forgotEmail, otp: otpInput });
      setForgotStep(3);
    } catch (err: any) {
      Alert.alert('ผิดพลาด', err.response?.data?.message || 'รหัส OTP ไม่ถูกต้อง');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสผ่านใหม่');
    try {
      const res = await axios.post(`${BASE_URL}/forgot-password/reset-password`, {
        email: forgotEmail,
        otp: otpInput,
        newPassword
      });
      Alert.alert('สำเร็จ', res.data.message);
      setScreen('login');
      setForgotStep(1);
    } catch (err: any) {
      Alert.alert('ผิดพลาด', err.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>Smart Deal</Text>

        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800' }} 
            style={styles.bannerImage}
          />
        </View>

        {/* --- [1] หน้า LOGIN --- */}
        {screen === 'login' && (
          <View style={styles.formContainer}>
            <Text style={styles.title}>ยินดีต้อนรับ</Text>
            <Text style={styles.subtitle}>เข้าสู่ระบบเพื่อเริ่มประหยัดกับดีลอัจฉริยะ</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมล หรือ เบอร์โทรศัพท์</Text>
              <TextInput 
                style={styles.input} 
                placeholder="example@email.com" 
                value={identifier} 
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสผ่าน</Text>
              <View style={styles.passwordWrapper}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                  placeholder="••••••••" 
                  secureTextEntry={!showPassword} 
                  value={password} 
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={{ fontSize: 12, color: '#666' }}>{showPassword ? 'ซ่อน' : 'แสดง'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20 }} onPress={() => setScreen('forgot')}>
              <Text style={styles.linkText}>ลืมรหัสผ่าน?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>หรือ</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton}>
              <Text style={styles.googleButtonText}>G  เข้าสู่ระบบด้วย Google</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={{ color: '#666' }}>ยังไม่มีบัญชี?</Text>
              <TouchableOpacity onPress={() => setScreen('register')}>
                <Text style={[styles.linkText, { fontWeight: 'bold', marginLeft: 5 }]}>สมัครสมาชิกที่นี่</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- [2] หน้า REGISTER --- */}
        {screen === 'register' && (
          <View style={styles.formContainer}>
            <Text style={styles.title}>สมัครสมาชิก</Text>
            <Text style={styles.subtitle}>สร้างบัญชีใหม่เพื่อใช้งาน Smart Deal</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ชื่อ-นามสกุล</Text>
              <TextInput style={styles.input} placeholder="สมชาย ใจดี" value={fullName} onChangeText={setFullName} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมล</Text>
              <TextInput style={styles.input} placeholder="example@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>เบอร์โทรศัพท์</Text>
              <TextInput style={styles.input} placeholder="0812345678" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสผ่าน</Text>
              <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
              <Text style={styles.primaryButtonText}>ยืนยันการสมัครสมาชิก</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 15, alignSelf: 'center' }} onPress={() => setScreen('login')}>
              <Text style={styles.linkText}>← กลับไปหน้าเข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- [3] หน้า FORGOT PASSWORD (3 Steps) --- */}
        {screen === 'forgot' && (
          <View style={styles.formContainer}>
            <Text style={styles.title}>ลืมรหัสผ่าน</Text>

            {forgotStep === 1 && (
              <>
                <Text style={styles.subtitle}>กรอกอีเมลของคุณเพื่อรับรหัสยืนยัน OTP</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>อีเมล</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="example@gmail.com" 
                    value={forgotEmail} 
                    onChangeText={setForgotEmail} 
                    autoCapitalize="none" 
                  />
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={handleRequestOTP}>
                  <Text style={styles.primaryButtonText}>ขอรับรหัส OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <Text style={styles.subtitle}>กรอกรหัส OTP 6 หลักที่ส่งไปที่ {forgotEmail}</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>รหัส OTP (6 หลัก)</Text>
                  <TextInput 
                    style={[styles.input, { textAlign: 'center', fontSize: 22, letterSpacing: 5 }]} 
                    placeholder="123456" 
                    keyboardType="number-pad" 
                    maxLength={6} 
                    value={otpInput} 
                    onChangeText={setOtpInput} 
                  />
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOTP}>
                  <Text style={styles.primaryButtonText}>ยืนยันรหัส OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {forgotStep === 3 && (
              <>
                <Text style={styles.subtitle}>กรอกรหัสผ่านใหม่ที่คุณต้องการใช้งาน</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>รหัสผ่านใหม่</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="••••••••" 
                    secureTextEntry 
                    value={newPassword} 
                    onChangeText={setNewPassword} 
                  />
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={handleResetPassword}>
                  <Text style={styles.primaryButtonText}>ตั้งรหัสผ่านใหม่</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity 
              style={{ marginTop: 15, alignSelf: 'center' }} 
              onPress={() => { setScreen('login'); setForgotStep(1); }}
            >
              <Text style={styles.linkText}>← ยกเลิก / กลับไปหน้าเข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.copyright}>© 2024 Smart Deal. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f6' },
  scrollContainer: { padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#141e15', marginBottom: 15 },
  bannerContainer: { width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  formContainer: { width: '100%' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#141e15', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 14, fontSize: 15 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingRight: 10 },
  eyeBtn: { padding: 10 },
  primaryButton: { backgroundColor: '#2e7a32', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { color: '#2e7a32', fontSize: 14, fontWeight: '600' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 15, color: '#888', fontSize: 14 },
  googleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  googleButtonText: { color: '#333', fontSize: 15, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  copyright: { color: '#aaa', fontSize: 12, marginTop: 30, marginBottom: 10 }
});