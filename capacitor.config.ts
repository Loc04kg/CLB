import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hutech.club',
  appName: 'Hutech Club',
  webDir: 'dist',
  server: {
    // Khi dev: dùng live reload từ máy tính
    // Khi build production: xóa dòng 'url' bên dưới
    // url: 'http://192.168.1.39:3000',
    cleartext: true // cho phép HTTP (không chỉ HTTPS) trên Android
  },
  android: {
    allowMixedContent: true // cho phép gọi HTTP API từ WebView
  }
};

export default config;
