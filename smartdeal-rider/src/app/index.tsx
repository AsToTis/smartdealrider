import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { token } = useAuth();

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
