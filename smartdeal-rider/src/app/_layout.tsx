import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Hide splash screen after navigation is ready
    SplashScreen.hideAsync();
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
