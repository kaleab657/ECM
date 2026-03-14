import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaleab.ethiocars',
  appName: 'EthioCars',
  webDir: 'dist',
  server: {
    // Allow the WebView to navigate to the backend for API calls
    allowNavigation: ['ethio-cars.vercel.app', '*.r2.dev', '*.r2.cloudflarestorage.com'],
    // Enable mixed content (http from https context) for development
    androidScheme: 'https',
  },
  android: {
    // Allow cleartext traffic for local development
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  }
};

export default config;
