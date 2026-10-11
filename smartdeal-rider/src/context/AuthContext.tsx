import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RiderData = {
  id: number;
  user_id: number;
  vehicle_plate: string;
  status: string;
  [key: string]: any;
};

type AuthContextType = {
  token: string | null;
  rider: RiderData | null;
  isLoading: boolean;
  login: (token: string, riderData: RiderData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  rider: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [rider, setRider] = useState<RiderData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const [storedToken, storedRider] = await Promise.all([
          AsyncStorage.getItem('rider_token'),
          AsyncStorage.getItem('rider_data'),
        ]);

        if (storedToken && storedRider) {
          setToken(storedToken);
          setRider(JSON.parse(storedRider));
        }
      } catch (error) {
        console.error('Failed to load rider auth session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (newToken: string, riderData: RiderData) => {
    try {
      await AsyncStorage.setItem('rider_token', newToken);
      await AsyncStorage.setItem('rider_data', JSON.stringify(riderData));
    } catch (e) {
      console.error('Failed to save rider auth session:', e);
    }
    setToken(newToken);
    setRider(riderData);
    router.replace('/(tabs)');
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['rider_token', 'rider_data']);
    } catch (e) {
      console.error('Failed to clear rider auth session:', e);
    }
    setToken(null);
    setRider(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ token, rider, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
