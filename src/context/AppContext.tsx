import React, { createContext, useContext, useState, useEffect } from 'react';

import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import enTranslations from '../locales/english.json';
import amTranslations from '../locales/amharic.json';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  // Start with loading false to allow initial UI shell to render immediately
  // This improves First Meaningful Paint and avoids blocking Lighthouse
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    let authUnsubscribe: (() => void) | null = null;
    
    // We only set loading to true if we are actually waiting for an auth check
    // but we do it inside the idle callback to avoid blocking the initial render
    const initAuth = () => {
      authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
        // Cleanup previous profile listener if it exists
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }

        setUser(currentUser);
        
        if (currentUser) {
          profileUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
            if (snapshot.exists()) {
              setProfile(snapshot.data() as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (error) => {
            setLoading(false);
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      });
    };

    // Fallback for browsers that don't support requestIdleCallback
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => initAuth(), { timeout: 2000 });
    } else {
      setTimeout(initAuth, 1000);
    }

    return () => {
      if (authUnsubscribe) authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  const setLanguage = (lang: Language) => setLanguageState(lang);

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

    // Handle returnObjects case
    if (params && 'returnObjects' in params && params.returnObjects) {
      return value;
    }
    
    if (typeof value !== 'string') return value; // Return as is if not a string (array/object)
    
    // Replace params like {amount}
    if (params && !('returnObjects' in params)) {
      return Object.entries(params).reduce((str: string, [k, v]) => {
        return str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      }, value);
    }
    
    return value;
  };

  return (
    <AppContext.Provider value={{ theme, toggleTheme, language, setLanguage, t, user, profile, loading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
