import axios from 'axios';
import Constants from 'expo-constants';

// Fallback IP for development if auto-detection fails, or production URL
let API_URL = 'http://172.20.10.2:5000/api';

if (__DEV__) {
  // Use the IP address of the machine running the Expo server
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const localhost = debuggerHost.split(':')[0];
    API_URL = `http://${localhost}:5000/api`;
  }
} else {
  // Add your production URL here when deploying
  // API_URL = 'https://api.yourdomain.com/api';
}

const api = axios.create({
  baseURL: API_URL,
});

export default api;
