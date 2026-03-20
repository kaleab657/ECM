import { initializeApp, getApp, getApps } from "firebase/app";
import { indexedDBLocalPersistence, initializeAuth, browserLocalPersistence, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAGloaibYUVnqUVXIo3-7qi4-e3m2YhWu0",
  authDomain: "ethiocars-dd66e.firebaseapp.com",
  projectId: "ethiocars-dd66e",
  storageBucket: "ethiocars-dd66e.firebasestorage.app",
  messagingSenderId: "533268030508",
  appId: "1:533268030508:web:525f7941396df5e7969d89"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Use initializeAuth() — NEVER getAuth().
//
// getAuth() automatically registers browserPopupRedirectResolver, which
// internally calls getRedirectResult() on every startup. In a Capacitor
// Android WebView, signInWithRedirect is not supported, so getRedirectResult
// throws auth/argument-error. This error fires onAuthStateChanged callbacks
// rapidly → React sees too many setState calls → #310 crash.
//
// initializeAuth() with explicit persistence and NO popup/redirect resolver
// avoids this entirely. We provide both indexedDB and browserLocal as a
// fallback chain so persistence works regardless of WebView capabilities.
//
// The catch handles Vite HMR: when this module re-evaluates during dev,
// initializeAuth throws "already initialized". We recover by extracting
// the existing auth instance from Firebase's internal service container.
// This does NOT register any resolver — safe for Capacitor.

function getOrCreateAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });
  } catch {
    // Already initialized (Vite HMR or duplicate module load).
    // Retrieve existing instance from Firebase's internal container.
    // This avoids getAuth() which would add the redirect resolver.
    try {
      const container = (app as any).container;
      if (container) {
        const provider = container.getProvider('auth');
        if (provider) {
          return provider.getImmediate() as Auth;
        }
      }
    } catch {
      // container API failed — fall through
    }

    // Last resort: create a minimal auth instance.
    // This path should only be hit during dev HMR in rare edge cases.
    console.warn('[Firebase] Auth recovery: re-initializing with initializeAuth');
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });
  }
}

const auth = getOrCreateAuth();

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
