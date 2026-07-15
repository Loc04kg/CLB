import axios from 'axios';

// IP LAN của máy chủ backend (đổi nếu IP thay đổi)
const SERVER_IP = '192.168.1.66';
const SERVER_PORT = 5000;

// Phát hiện môi trường:
// - Trên Android/iOS Capacitor: window.location.hostname = 'localhost' hoặc '127.0.0.1'
//   nhưng thực ra cần trỏ về máy tính (SERVER_IP)
// - Trên web browser bình thường: dùng hostname của trang web
const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.();
const hostname = isCapacitor ? SERVER_IP : window.location.hostname;

const API_URL = `http://${hostname}:${SERVER_PORT}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
