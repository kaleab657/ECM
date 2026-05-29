import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { UserProfile } from '../types';
// NOTE: firebase/messaging is NOT imported here — it crashes on Android Capacitor WebView.
// It is dynamically imported inside the web-only notification useEffect below.
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import enTranslations from '../locales/english.json';
import amTranslations from '../locales/amharic.json';
import omTranslations from '../locales/om.json';
import tiTranslations from '../locales/ti.json';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

const translations = {
  en: enTranslations,
  am: amTranslations,
  om: omTranslations,
  ti: tiTranslations
};

export type Language = 'en' | 'am' | 'om' | 'ti';

type Theme = 'light' | 'dark';

export interface AppConfig {
  premium_enabled?: boolean;
  featured_price?: number;
  premium_price?: number;
}

interface AppContextType {
  appConfig: AppConfig;
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number> | { returnObjects: boolean }) => any;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (isOpen: boolean) => void;
  savedIds: string[];
  toggleFavorite: (carId: string) => void;
  isSaved: (carId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mounted = useRef(true);
  const fcmTokenRef = useRef<string | null>(null);
  
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Force logout on fresh install to prevent zombie sessions across reinstalls
  useEffect(() => {
    const hasLaunched = localStorage.getItem('hasLaunchedBefore');
    if (!hasLaunched) {
      // Preserve theme and language before clearing to prevent flash
      const savedTheme = localStorage.getItem('theme');
      const savedLang = localStorage.getItem('language');
      auth.signOut().catch(() => {});
      localStorage.clear();
      localStorage.setItem('hasLaunchedBefore', 'true');
      if (savedTheme) localStorage.setItem('theme', savedTheme);
      if (savedLang) localStorage.setItem('language', savedLang);
    }
  }, []);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    // Match the inline script in index.html: respect system preference
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpenState] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    premium_enabled: true,
  });

  // Listen to remote AppConfig settings dynamically
  useEffect(() => {
    const unsubConfig = onSnapshot(
      doc(db, 'settings', 'app_config'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAppConfig({
            premium_enabled: data?.premium_enabled !== false, // default true
            featured_price: data?.featured_price,
            premium_price: data?.premium_price
          });
        }
        // If document doesn't exist yet, keep defaults — no crash
      },
      (error) => {
        // Permission denied or network error — app continues with defaults
        console.warn('[AppConfig] Settings listener failed, using defaults:', error.message);
      }
    );
    return () => unsubConfig();
  }, []);
  
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('savedCarIds') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('savedCarIds', JSON.stringify(savedIds));
  }, [savedIds]);

  const toggleFavorite = (carId: string) => {
    if (mounted.current) {
      setSavedIds(prev =>
        prev.includes(carId) ? prev.filter(id => id !== carId) : [...prev, carId]
      );
    }
  };

  const isSaved = (carId: string) => savedIds.includes(carId);

  const setAuthModalOpen = (isOpen: boolean) => {
    if (mounted.current) setAuthModalOpenState(isOpen);
  };

  // Native push notification permission — runs once on first launch
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initNativeNotifications = async () => {
      try {
        const { receive } = await PushNotifications.checkPermissions();

        if (receive === 'prompt') {
          const { receive: result } = await PushNotifications.requestPermissions();
          if (result !== 'granted') return;
        } else if (receive !== 'granted') {
          return;
        }

        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'default',
            name: 'Default',
            description: 'Default notifications',
            importance: 5,
            visibility: 1,
          });
          await PushNotifications.createChannel({
            id: 'messages',
            name: 'Messages',
            description: 'Chat message notifications',
            importance: 5,
            visibility: 1,
            sound: 'default',
          });
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          if (token.value) {
            fcmTokenRef.current = token.value;
            const currentUser = auth.currentUser;
            if (currentUser) {
              await setDoc(doc(db, 'users', currentUser.uid), {
                fcmTokens: arrayUnion(token.value),
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.warn('[PushNotifications] Registration error:', error);
        });

        // Handle push notifications received while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[PushNotifications] Foreground notification:', notification);
          // Display as in-app notification using a native alert-style approach
          const title = notification.title || 'EthioCars';
          const body = notification.body || '';
          if (body) {
            // Dispatch a custom event that the Toast system can pick up
            window.dispatchEvent(new CustomEvent('app-notification', {
              detail: { title, body }
            }));
          }
        });
        
        // Handle push notifications when tapped (action performed)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('[PushNotifications] Action performed:', action);
          const { chatId } = action.notification.data || {};
          if (chatId) {
            // Dispatch a custom event so App.tsx can handle navigation
            window.dispatchEvent(new CustomEvent('app-notification-action', {
              detail: { chatId }
            }));
          }
        });

      } catch (error) {
        console.warn('[PushNotifications] Init error:', error);
      }
    };

    setTimeout(initNativeNotifications, 2000);
  }, []);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // CRITICAL: onAuthStateChanged can fire synchronously during useEffect
      // execution (before React finishes the commit phase). Calling setState
      // at that point triggers React #310 "too many re-renders".
      // queueMicrotask defers these updates to after the commit completes.
      queueMicrotask(() => {
        if (!mounted.current) return;

        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }

        setUser(currentUser);

        // Optimization: Immediately stop the global app loader once the auth state is known.
        // We don't need to wait for the Firestore profile snapshot to show the app shell.
        if (loading) setLoading(false);

        if (currentUser) {
          // Save any pending FCM token that was registered before auth resolved
          if (fcmTokenRef.current) {
            setDoc(doc(db, 'users', currentUser.uid), {
              fcmTokens: arrayUnion(fcmTokenRef.current),
              updatedAt: serverTimestamp()
            }, { merge: true }).catch(() => {});
          }
          profileUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
            if (!mounted.current) return;
            if (snapshot.exists()) {
              setProfile(snapshot.data() as UserProfile);
            } else {
              setProfile(null);
            }
          }, (error) => {
            console.error('ERROR: Failed to load user profile:', error);
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          });
        } else {
          setProfile(null);
        }
      });
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  // Theme + status bar sync
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Sync native Android status bar and navigation bar with theme
    if (Capacitor.isNativePlatform()) {
      // Defer native plugin calls to prevent blocking the UI thread during React render
      const timer = setTimeout(() => {
        try {
          const bgColor = theme === 'dark' ? '#09090b' : '#FDFDFD';
          StatusBar.setBackgroundColor({ color: bgColor }).catch(() => { });
          StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => { });

          NavigationBar.setNavigationBarColor({
            color: bgColor,
            darkButtons: theme !== 'dark' // true means black buttons for light mode
          }).catch((e) => console.log('NavBar err:', e));
        } catch (err) {
          console.warn('[ThemeSync] Native update failed:', err);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleTheme = () => {
    if (mounted.current) setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  const setLanguage = (lang: Language) => {
    if (mounted.current) setLanguageState(lang);
  };

  // Handle service worker registration & web push notifications
  useEffect(() => {
    let messagingUnsubscribe: (() => void) | null = null;

    const initNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        return;
      }

      try {
        await navigator.serviceWorker.register('/sw.js');

        if (!user) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const fcmReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope'
        });

        try {
          // Dynamically import messaging so it doesn't crash Android Capacitor WebView
          const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
          
          const messagingParams = { app: auth.app }; // need to pass app to getMessaging if needed or just use default
          const messaging = getMessaging();
          const token = await getToken(messaging, {
            serviceWorkerRegistration: fcmReg
          });

          if (token) {
            await setDoc(doc(db, 'users', user.uid), {
              fcmTokens: arrayUnion(token),
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          messagingUnsubscribe = onMessage(messaging, (payload) => {
            if (document.visibilityState === 'visible') {
              new Notification(payload.notification?.title || 'EthioCars', {
                body: payload.notification?.body,
                icon: '/favicon.ico'
              });
            }
          });
        } catch (fcmError) {
          console.warn('[FCM] Firebase messaging not available:', fcmError);
        }
      } catch (error) {
        console.warn('[Notifications] Init error:', error);
      }
    };

    initNotifications();

    return () => {
      if (messagingUnsubscribe) messagingUnsubscribe();
    };
  }, [user]);

  const t = (key: string, params?: Record<string, string | number> | { returnObjects: boolean }): any => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (value === undefined) return key;

    if (params && 'returnObjects' in params && params.returnObjects) {
      return value;
    }
    
    if (typeof value !== 'string') return value;
    
    if (params && !('returnObjects' in params)) {
      return Object.entries(params).reduce((str: string, [k, v]) => {
        return str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      }, value);
    }
    
    return value;
  };

  return (
    <AppContext.Provider value={{ 
      theme, toggleTheme, language, setLanguage, t, user, profile, loading, 
      isAuthModalOpen, setAuthModalOpen, savedIds, toggleFavorite, isSaved, appConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
