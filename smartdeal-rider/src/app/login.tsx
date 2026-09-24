import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/rider/login', { email, password });
      
      const { token, rider } = response.data;
      login(token, rider);
      // Wait for AuthContext to update and redirect automatically
      
    } catch (error: any) {
      console.error(error);
      
      const status = error.response?.status;
      const message = error.response?.data?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง';
      
      if (status === 403) {
        Alert.alert(
          'ข้อผิดพลาด', 
          'ไม่สามารถเข้าสู่ระบบได้ บัญชีนี้ไม่ใช่บัญชีสำหรับพนักงานส่งของ กรุณาสมัครสมาชิกใหม่',
          [
            { text: 'สมัครสมาชิก', onPress: () => router.push('/register') },
            { text: 'ตกลง', style: 'cancel' }
          ]
        );
      } else if (status === 401) {
        Alert.alert(
          'เข้าสู่ระบบไม่สำเร็จ', 
          message, // Could be "รอการอนุมัติ..." or "รหัสผ่านไม่ถูกต้อง"
          [{ text: 'ตกลง', style: 'default' }]
        );
      } else if (status === 400 || status === 404) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', message);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerDecoration}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>SmartDeal</Text>
          <View style={styles.riderBadge}>
            <Text style={styles.riderBadgeText}>RIDER</Text>
          </View>
        </View>
        
        <Text style={styles.subtitle}>ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบเพื่อเริ่มรับงาน</Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#aaa"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </Text>
            {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" style={{marginLeft: 8}} />}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ยังไม่มีบัญชีใช่หรือไม่? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>สมัครเป็นไรเดอร์</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
    zIndex: 0,
  },
  circle1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  circle2: {
    position: 'absolute',
    top: -50,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    zIndex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  riderBadge: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
    marginTop: 4,
  },
  riderBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    lineHeight: 24,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7f9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef0f2',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#81c784',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
    color: '#666',
  },
  linkText: {
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: '700',
  },
});
