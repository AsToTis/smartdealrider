import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669', // Modern Emerald Green
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 82 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          backgroundColor: '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 8,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'เรดาร์รับงาน',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'radar' : 'radar'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'ออเดอร์ของฉัน',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'moped' : 'moped-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'กระเป๋าเงิน',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'wallet' : 'wallet-outline'} 
              size={23} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'ประวัติงาน',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'time' : 'time-outline'} 
              size={23} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

