import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Image, Alert, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../../constants/api';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300'
];

export default function ProfileScreen() {
  const [user, setUser] = useState<any>({
    user_id: 2,
    full_name: 'สมชาย ใจดี',
    email: 'test@gmail.com',
    phone: '0812345678',
    avatar_url: DEFAULT_AVATAR
  });
  const [points, setPoints] = useState<number>(2000);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [hasShop, setHasShop] = useState(false);
  const [shopStatus, setShopStatus] = useState('none');

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  // Edit Profile Form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState(DEFAULT_AVATAR);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password Form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ดึงข้อมูลผู้ใช้จริงจาก MySQL Backend
  const loadUserData = async () => {
    try {
      let userId = 2;
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed?.user_id) userId = parsed.user_id;
        setUser(parsed);
        setEditName(parsed.full_name || '');
        setEditPhone(parsed.phone || '');
        setEditEmail(parsed.email || '');
        setEditAvatar(parsed.avatar_url || DEFAULT_AVATAR);
      }

      // 1. ดึงข้อมูล Profile ล่าสุดจาก MySQL
      try {
        const profileRes = await axios.get(`${BASE_URL}/users/${userId}/profile`);
        if (profileRes.data?.success && profileRes.data?.user) {
          const freshUser = profileRes.data.user;
          setUser(freshUser);
          setEditName(freshUser.full_name || '');
          setEditPhone(freshUser.phone || '');
          setEditEmail(freshUser.email || '');
          setEditAvatar(freshUser.avatar_url || DEFAULT_AVATAR);
          await AsyncStorage.setItem('user', JSON.stringify(freshUser));
        }
      } catch (err) {
        console.log('Error fetching fresh user profile from API:', err);
      }

      // 2. ดึงคะแนนพอยท์จริงจาก Backend
      try {
        const pointsRes = await axios.get(`${BASE_URL}/points/${userId}`);
        if (pointsRes.data?.success) {
          setPoints(pointsRes.data.points ?? 2000);
          setPointsHistory(pointsRes.data.history || []);
        }
      } catch (err) {
        console.log('Error fetching points from API:', err);
      }

      // 3. เช็คว่ามีร้านค้าหรือไม่
      try {
        const shopRes = await axios.get(`${BASE_URL}/users/${userId}/shop`);
        if (shopRes.data?.success && shopRes.data?.hasShop) {
          setHasShop(true);
          setShopStatus(shopRes.data.shop.status || 'pending');
          await AsyncStorage.setItem('shop_id', String(shopRes.data.shop.shop_id));
        } else {
          setHasShop(false);
          setShopStatus('none');
          await AsyncStorage.removeItem('shop_id');
        }
      } catch (err) {
        console.log('Error fetching shop status:', err);
      }
    } catch (e) {
      console.log('Error loading profile data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const openEditModal = () => {
    setEditName(user?.full_name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditAvatar(user?.avatar_url || DEFAULT_AVATAR);
    setShowEditProfileModal(true);
  };

  // ฟังก์ชันบันทึกข้อมูลส่วนตัว (PUT /api/users/:id/profile)
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!editEmail.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมล');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกเบอร์โทรศัพท์');
      return;
    }

    setIsSavingProfile(true);
    const userId = user?.user_id || 2;

    try {
      const response = await axios.put(`${BASE_URL}/users/${userId}/profile`, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        avatar_url: editAvatar || null
      });

      if (response.data?.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setShowEditProfileModal(false);
        Alert.alert('สำเร็จ', 'บันทึกข้อมูลสำเร็จ');
      } else {
        Alert.alert('ผิดพลาด', response.data?.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error: any) {
      console.error('Save Profile Error:', error);
      const msg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      Alert.alert('ผิดพลาด', msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ฟังก์ชันเปลี่ยนรหัสผ่าน (PUT /api/users/:id/change-password)
  const handleChangePassword = async () => {
    if (!oldPassword) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสผ่านเดิม');
      return;
    }
    if (!newPassword) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsChangingPassword(true);
    const userId = user?.user_id || 2;

    try {
      const response = await axios.put(`${BASE_URL}/users/${userId}/change-password`, {
        old_password: oldPassword,
        new_password: newPassword
      });

      if (response.data?.success) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePasswordModal(false);
        Alert.alert('สำเร็จ', response.data.message || 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
      } else {
        Alert.alert('ผิดพลาด', response.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } catch (error: any) {
      console.error('Change Password Error:', error);
      const msg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
      Alert.alert('ผิดพลาด', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRedeemReward = () => {
    Alert.alert('แลกของรางวัล 🎁', `คุณมีคะแนน ${points.toLocaleString()} พอยท์ สามารถแลกคูปองส่วนลด 50 บาท (ใช้ 500 พอยท์) ได้ทันที!`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'แลกคูปอง',
        onPress: () => {
          setPoints(prev => Math.max(0, prev - 500));
          Alert.alert('สำเร็จ', 'แลกคูปองส่วนลด 50 บาทเรียบร้อยแล้ว');
        }
      }
    ]);
  };

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ตกลง',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('shop_id');
            setUser(null);
            
            // นำทางไปหน้า Login แบบแทนที่ stack เดิม (กลับไปหน้า index.tsx)
            router.replace('/');
          } catch (error) {
            console.error('Error during logout:', error);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>โปรไฟล์</Text>

        <TouchableOpacity 
          style={styles.moreBtn}
          onPress={() => Alert.alert('ตัวเลือก', 'Smart Deal App สำหรับผู้ซื้อและร้านค้า')}
          activeOpacity={0.7}
        >
          <MaterialIcons name="more-vert" size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. User Avatar & Info */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarWrapper} 
            onPress={openEditModal}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: user?.avatar_url || DEFAULT_AVATAR }} 
              style={styles.avatarImage} 
            />
            {/* Green pencil edit badge */}
            <View style={styles.editPencilBadge}>
              <MaterialIcons name="edit" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userNameText}>{user?.full_name || 'สมชาย ใจดี'}</Text>
          <Text style={styles.userEmailText}>{user?.email || 'test@gmail.com'}</Text>
          <Text style={styles.userPhoneText}>{user?.phone || '0812345678'}</Text>
        </View>

        {/* 3. Points & Rewards Card (ดีลอัจฉริยะ พอยท์) */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsLeft}>
            <Text style={styles.pointsLabel}>ดีลอัจฉริยะ พอยท์</Text>
            <View style={styles.pointsNumberRow}>
              <Text style={styles.pointsNumber}>{points.toLocaleString()}</Text>
              <Text style={styles.pointsUnit}>คะแนน</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.redeemBtn}
            onPress={handleRedeemReward}
            activeOpacity={0.85}
          >
            <FontAwesome5 name="gift" size={14} color="#fff" />
            <Text style={styles.redeemBtnText}>แลกของรางวัล</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Menu Items */}
        <View style={styles.menuContainer}>
          {/* แก้ไขข้อมูลส่วนตัว */}
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <MaterialIcons name="person-outline" size={22} color="#16a34a" />
            </View>
            <Text style={styles.menuTitle}>แก้ไขข้อมูลส่วนตัว</Text>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>

          {/* เปลี่ยนรหัสผ่าน */}
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => setShowChangePasswordModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#f0fdf4' }]}>
              <MaterialIcons name="lock-outline" size={22} color="#16a34a" />
            </View>
            <Text style={styles.menuTitle}>เปลี่ยนรหัสผ่าน</Text>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>

          {/* ประวัติคะแนนสะสม */}
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => setShowPointsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <MaterialIcons name="history" size={22} color="#16a34a" />
            </View>
            <Text style={styles.menuTitle}>ประวัติคะแนนสะสม</Text>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>

          {/* ตั้งค่าการใช้งาน */}
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => Alert.alert('ตั้งค่า', 'เปิด/ปิด การแจ้งเตือนดีลสายฟ้าแลบ และตำแหน่งที่อยู่')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <MaterialIcons name="settings" size={22} color="#16a34a" />
            </View>
            <Text style={styles.menuTitle}>ตั้งค่าการใช้งาน</Text>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>

          {/* ศูนย์ความช่วยเหลือ */}
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => Alert.alert('ศูนย์ความช่วยเหลือ', 'ติดต่อสอบถามได้ที่ support@smartdeal.com หรือโทร 02-123-4567')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <MaterialIcons name="help-outline" size={22} color="#16a34a" />
            </View>
            <Text style={styles.menuTitle}>ศูนย์ความช่วยเหลือ</Text>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>

          {/* ระบบจัดการร้านค้า (Merchant Center) */}
          <TouchableOpacity 
            style={[styles.menuCard, hasShop && shopStatus === 'pending' ? { opacity: 0.6 } : null]}
            onPress={() => {
              if (hasShop && shopStatus === 'approved') {
                router.push('/(seller)');
              } else if (hasShop && shopStatus === 'pending') {
                Alert.alert('แจ้งเตือน', 'บัญชีร้านค้าของคุณกำลังอยู่ระหว่างการตรวจสอบ');
              } else {
                router.push('/(seller)/register-shop' as any);
              }
            }}
            activeOpacity={0.7}
            disabled={hasShop && shopStatus === 'pending'}
          >
            <View style={styles.menuIconCircle}>
              <MaterialIcons name="storefront" size={22} color="#16a34a" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#0f172a' }}>
                {hasShop && shopStatus === 'approved' 
                  ? 'สลับไปจัดการร้านค้า' 
                  : hasShop && shopStatus === 'pending' 
                    ? 'สมัครเปิดร้านค้ากับเรา (รอตรวจสอบอนุมัติ)' 
                    : 'สมัครเปิดร้านค้ากับเรา'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* 5. Logout Button (Red pill card) */}
        <TouchableOpacity 
          style={styles.logoutCard} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.logoutIconCircle}>
            <MaterialIcons name="logout" size={18} color="#ef4444" />
          </View>
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>

        {/* 6. Footer Version */}
        <Text style={styles.versionFooter}>เวอร์ชัน 2.4.0 (Build 2402)</Text>
      </ScrollView>

      {/* ========================================== */}
      {/* 1. MODAL: แก้ไขข้อมูลส่วนตัว (Edit Profile) */}
      {/* ========================================== */}
      <Modal
        visible={showEditProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isSavingProfile && setShowEditProfileModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalHeading}>แก้ไขข้อมูลส่วนตัว</Text>
              <Text style={styles.modalSubDesc}>ปรับปรุงข้อมูลและรูปโปรไฟล์ของคุณ</Text>

              {/* Avatar Preview & Selection */}
              <View style={styles.modalAvatarContainer}>
                <Image 
                  source={{ uri: editAvatar || DEFAULT_AVATAR }} 
                  style={styles.modalAvatarPreview} 
                />
                <Text style={styles.presetHeading}>เลือกรูปโปรไฟล์ด่วน:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                  {AVATAR_PRESETS.map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setEditAvatar(preset)}
                      style={[
                        styles.presetThumbnailWrapper,
                        editAvatar === preset && styles.presetActiveThumbnail
                      ]}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: preset }} style={styles.presetThumbnail} />
                      {editAvatar === preset && (
                        <View style={styles.presetCheckmark}>
                          <MaterialIcons name="check" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Input: ชื่อ-นามสกุล */}
              <Text style={styles.inputLabel}>ชื่อ - นามสกุล *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="กรอกชื่อ-นามสกุล"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Input: เบอร์โทรศัพท์ */}
              <Text style={styles.inputLabel}>เบอร์โทรศัพท์ *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="phone" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="0812345678"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Input: อีเมล */}
              <Text style={styles.inputLabel}>อีเมล *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="example@gmail.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Input: ลิงก์รูปภาพ (Avatar URL) */}
              <Text style={styles.inputLabel}>URL รูปโปรไฟล์ (กำหนดเอง)</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="image" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={editAvatar}
                  onChangeText={setEditAvatar}
                  placeholder="https://example.com/photo.jpg"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
              </View>

              {/* Quick link to Change Password */}
              <TouchableOpacity 
                style={styles.changePwShortcut}
                onPress={() => {
                  setShowEditProfileModal(false);
                  setShowChangePasswordModal(true);
                }}
              >
                <MaterialIcons name="vpn-key" size={16} color="#16a34a" />
                <Text style={styles.changePwShortcutText}>ต้องการเปลี่ยนรหัสผ่าน? คลิกที่นี่</Text>
              </TouchableOpacity>

              {/* Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity 
                  style={styles.modalCancel} 
                  onPress={() => setShowEditProfileModal(false)}
                  disabled={isSavingProfile}
                >
                  <Text style={styles.modalCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalSave} 
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                  activeOpacity={0.8}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>บันทึกข้อมูล</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* 2. MODAL: เปลี่ยนรหัสผ่าน (Change Password) */}
      {/* ========================================== */}
      <Modal
        visible={showChangePasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isChangingPassword && setShowChangePasswordModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.lockIconCircle}>
                  <MaterialIcons name="lock-reset" size={24} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeading}>เปลี่ยนรหัสผ่าน</Text>
                  <Text style={styles.modalSubDesc}>กรุณาระบุรหัสผ่านเดิมและรหัสผ่านใหม่</Text>
                </View>
              </View>

              {/* รหัสผ่านเดิม */}
              <Text style={styles.inputLabel}>รหัสผ่านเดิม *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="กรอกรหัสผ่านปัจจุบัน"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showOldPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowOldPassword(!showOldPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons 
                    name={showOldPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>

              {/* รหัสผ่านใหม่ */}
              <Text style={styles.inputLabel}>รหัสผ่านใหม่ *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="vpn-key" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="อย่างน้อย 4 ตัวอักษร"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons 
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>

              {/* ยืนยันรหัสผ่านใหม่ */}
              <Text style={styles.inputLabel}>ยืนยันรหัสผ่านใหม่ *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="check-circle-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>

              {/* Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity 
                  style={styles.modalCancel} 
                  onPress={() => {
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowChangePasswordModal(false);
                  }}
                  disabled={isChangingPassword}
                >
                  <Text style={styles.modalCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalSave} 
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                  activeOpacity={0.8}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>ยืนยันเปลี่ยน</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* 3. MODAL: ประวัติคะแนนสะสม (Points Modal)  */}
      {/* ========================================== */}
      <Modal
        visible={showPointsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPointsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>ประวัติคะแนนสะสม 🎁</Text>
            <Text style={styles.modalSubHeading}>คะแนนปัจจุบัน: {points.toLocaleString()} พอยท์</Text>

            <ScrollView style={{ maxHeight: 250, marginVertical: 10 }}>
              {pointsHistory.length > 0 ? (
                pointsHistory.map((item) => (
                  <View key={item.id} style={styles.pointsHistoryItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointsHistoryTitle}>{item.title}</Text>
                      <Text style={styles.pointsHistoryDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.pointsHistoryAdd}>{item.points}</Text>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8' }}>ยังไม่มีประวัติการรับคะแนน</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalFullBtn}
              onPress={() => setShowPointsModal(false)}
            >
              <Text style={styles.modalFullBtnText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfefe' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fdfefe'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  // Avatar Section
  avatarSection: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  avatarWrapper: { position: 'relative', width: 90, height: 90, marginBottom: 12 },
  avatarImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f1f5f9' },
  editPencilBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  userNameText: { fontSize: 19, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  userEmailText: { fontSize: 13, color: '#16a34a', fontWeight: '500', marginBottom: 2 },
  userPhoneText: { fontSize: 12, color: '#64748b' },
  
  // Points Card
  pointsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginBottom: 24
  },
  pointsLeft: { justifyContent: 'center' },
  pointsLabel: { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 2 },
  pointsNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  pointsNumber: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  pointsUnit: { fontSize: 12, color: '#16a34a', fontWeight: 'bold' },
  redeemBtn: {
    backgroundColor: '#2e7a32',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20
  },
  redeemBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  // Menu Container
  menuContainer: { gap: 10, marginBottom: 20 },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  menuTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  
  // Logout
  logoutCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginTop: 4,
    marginBottom: 20
  },
  logoutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  logoutText: { fontSize: 14, fontWeight: 'bold', color: '#ef4444' },
  versionFooter: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 4 },

  // Modals Styling
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 22, 
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  lockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalHeading: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalSubDesc: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 10 },
  modalSubHeading: { fontSize: 13, color: '#16a34a', fontWeight: 'bold', marginBottom: 12 },
  
  // Avatar Selection in Modal
  modalAvatarContainer: { alignItems: 'center', marginVertical: 8 },
  modalAvatarPreview: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#16a34a' },
  presetHeading: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 8, marginBottom: 6 },
  presetRow: { flexDirection: 'row', marginBottom: 6 },
  presetThumbnailWrapper: { position: 'relative', marginRight: 8, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  presetActiveThumbnail: { borderColor: '#16a34a' },
  presetThumbnail: { width: 38, height: 38, borderRadius: 19 },
  presetCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#16a34a',
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Inputs
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 10, marginBottom: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12
  },
  inputIcon: { marginRight: 8 },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a'
  },
  eyeBtn: { padding: 6 },
  
  changePwShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 6
  },
  changePwShortcutText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },

  // Buttons
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  modalSave: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Points history
  pointsHistoryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  pointsHistoryTitle: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  pointsHistoryDate: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  pointsHistoryAdd: { fontSize: 13, fontWeight: 'bold', color: '#16a34a' },
  modalFullBtn: { backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalFullBtnText: { color: '#475569', fontWeight: 'bold' }
});