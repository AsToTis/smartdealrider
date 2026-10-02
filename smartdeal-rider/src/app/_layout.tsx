import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, Alert } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
SplashScreen.preventAutoHideAsync();

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('Push notifications not available in Expo Go');
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Hide splash screen after navigation is ready
    SplashScreen.hideAsync();

    let subscription: any;
    if (Notifications) {
      subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        if (data?.status === 'rejected') {
          Alert.alert(
            'คำขอไม่ผ่านการอนุมัติ',
            `เหตุผล: ${data.reason}\n\nคุณต้องการแก้ไขข้อมูลและส่งคำขอใหม่หรือไม่?`,
            [
              { text: 'แก้ไขข้อมูล', onPress: () => router.push('/register') },
              { text: 'ตกลง', style: 'cancel' }
            ]
          );
        }
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'delivery' || segments[0] === 'proof-of-delivery';

    if (!token && inAuthGroup) {
      // Redirect to login if not authenticated but trying to access protected routes
      router.replace('/login');
    } else if (token && (segments[0] === 'login' || segments[0] === 'register')) {
      // Redirect to home if authenticated but trying to access login/register
      router.replace('/(tabs)');
    }
  }, [token, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="delivery/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="proof-of-delivery/[id]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
