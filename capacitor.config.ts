import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethiocars.app',
  appName: 'EthioCars',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    CapacitorHttp: {
      // DISABLED: CapacitorHttp intercepts ALL fetch() calls and routes them
      // through the native HTTP bridge. This bridge CANNOT handle ArrayBuffer/Blob
      // request bodies (e.g. image uploads) — it hangs trying to serialize binary
      // data across the JS-to-native bridge.
      //
      // With this disabled, the WebView's standard browser engine handles all
      // network requests, which correctly supports:
      //   - ArrayBuffer bodies for image uploads
      //   - CORS (backend is configured to allow https://localhost)
      //   - Authorization headers (Bearer tokens)
      enabled: false
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true
    }
  }
};

export default config;