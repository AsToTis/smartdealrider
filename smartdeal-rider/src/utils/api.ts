import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// เปลี่ยนเซิร์ฟเวอร์ได้โดยสร้างไฟล์ smartdeal-rider/.env.local แล้วใส่ EXPO_PUBLIC_API_URL=http://<IP>:5000
const ENV_SERVER_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = ENV_SERVER_URL
  ? `${ENV_SERVER_URL.replace(/\/+$/, '').replace(/\/api$/, '')}/api`
  : 'http://192.168.0.68:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('rider_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to attach token to request header:', error);
  }
  return config;
});

export default api;
