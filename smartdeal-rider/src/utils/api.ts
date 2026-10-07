import axios from 'axios';

const API_URL = 'https://smartdeal-backend-vhjo.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
});

export default api;
