import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'expo-router';

type RiderData = {
  id: number;
  user_id: number;
  vehicle_plate: string;
  status: string;
};

type AuthContextType = {
  token: string | null;
  rider: RiderData | null;
  login: (token: string, riderData: RiderData) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  rider: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [rider, setRider] = useState<RiderData | null>(null);
  const router = useRouter();

  const login = (newToken: string, riderData: RiderData) => {
    setToken(newToken);
    setRider(riderData);
    router.replace('/(tabs)');
  };

  const logout = () => {
    setToken(null);
    setRider(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ token, rider, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
