import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shaprultra.cad',
  appName: 'ShaprUltra 3D',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0B0D11',
    buildOptions: {
      releaseType: 'AAB',
    },
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0D11',
      overlaysWebView: true,
    },
  },
};

export default config;
