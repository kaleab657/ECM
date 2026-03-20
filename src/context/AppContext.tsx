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
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';

const translations = {
  en: enTranslations,
  am: amTranslations
};

export type Language = 'en' | 'am';

type Theme = 'light' | 'dark';

interface AppContextType {
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mounted = useRef(true);
  
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpenState] = useState(false);

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

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          const currentUser = auth.currentUser;
          if (currentUser && token.value) {
            await setDoc(doc(db, 'users', currentUser.uid), {
              fcmTokens: arrayUnion(token.value),
              updatedAt: serverTimestamp()
            }, { merge: true });
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

        if (currentUser) {
          profileUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
            if (!mounted.current) return;
            if (snapshot.exists()) {
              setProfile(snapshot.data() as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (error) => {
            console.error('ERROR: Failed to load user profile:', error);
            if (mounted.current) setLoading(false);
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          });
        } else {
          setProfile(null);
          setLoading(false);
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

    // Sync native Android status bar with theme
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#09090b' : '#FDFDFD' }).catch(() => {});
        StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
      } catch {
        // StatusBar plugin might not be ready during initial load
      }
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
    <AppContext.Provider value={{ theme, toggleTheme, language, setLanguage, t, user, profile, loading, isAuthModalOpen, setAuthModalOpen }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
