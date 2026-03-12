import React, { useState } from 'react';
import { Bell, Moon, Menu, X, Search, PlusCircle, User, Sun, Globe, LogOut, Home, Heart, Car, Shield, HelpCircle, Info, MessageCircle } from 'lucide-react';
import { Page } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { Logo } from './Logo';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

interface HeaderProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, setPage }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, language, setLanguage, t, user } = useAppContext();
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for unread messages
  React.useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    const initNotifications = () => {
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        let total = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.unreadCount > 0 && data.lastMessageSenderId !== user.uid) {
            total += data.unreadCount;
          }
        });
        setUnreadCount(total);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      });
    };

    // Delay notification listener until browser is idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => initNotifications(), { timeout: 5000 });
    } else {
      setTimeout(initNotifications, 3000);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const navItems = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'browse', label: t('nav.browse'), icon: Search },
    { id: 'post', label: t('nav.sell'), icon: PlusCircle },
    { id: 'chat', label: t('nav.chat'), icon: Bell, badge: unreadCount },
  ];

  const handleNavClick = (page: Page) => {
    setPage(page);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      sessionStorage.clear();
      setPage('auth');
      setIsMobileMenuOpen(false);
    } catch (error) {
      // Silent error
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Logo onClick={() => handleNavClick('home')} />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as Page)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${
                currentPage === item.id 
                  ? 'bg-brand/10 text-brand' 
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {item.label}
              {item.badge ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleNavClick('chat')}
            className="hidden sm:flex p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-brand text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {user ? null : (
            <button 
              onClick={() => handleNavClick('auth')}
              className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-colors"
            >
              <User size={20} />
            </button>
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[100] bg-zinc-900/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-[100dvh] w-[85vw] max-w-sm bg-white dark:bg-zinc-950 z-[101] shadow-2xl flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <h2 className="text-lg font-black text-zinc-900 dark:text-white">{t('common.menu') || 'Menu'}</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto mb-safe">
                {[
                  { id: 'saved', label: t('menu.savedCars'), description: t('menu.savedCarsDesc'), icon: Heart, action: () => handleNavClick('saved' as Page) },
                  { id: 'valuation', label: t('menu.valuation'), icon: Car, action: () => handleNavClick('valuation' as Page) },
                  { id: 'safety', label: t('menu.safety'), icon: Shield, action: () => handleNavClick('safety' as Page) },
                  { id: 'privacy', label: t('menu.privacy'), icon: Shield, action: () => handleNavClick('privacy' as Page) },
                  { id: 'theme', label: t('menu.theme'), description: t('menu.themeDesc'), icon: theme === 'light' ? Moon : Sun, action: toggleTheme },
                  { id: 'about', label: t('menu.about'), icon: Info, action: () => handleNavClick('about' as Page) },
                  { id: 'support', label: t('menu.support'), icon: MessageCircle, action: () => handleNavClick('support' as Page) },
                  { id: 'language', label: t('menu.language'), description: t('menu.languageDesc'), icon: Globe, action: () => handleNavClick('language' as Page) },
                  { id: 'logout', label: t('menu.logout'), icon: LogOut, action: handleSignOut },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <div className="w-10 h-10 rounded-[14px] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0 shadow-sm border border-black/[0.03] dark:border-white/[0.05]">
                      <item.icon size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-zinc-900 dark:text-white">{item.label}</div>
                      {item.description && (
                        <div className="text-[10px] font-bold text-zinc-400 mt-0.5">{item.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 mt-auto border-t border-zinc-100 dark:border-zinc-800 flex justify-center pb-8 shrink-0 bg-white dark:bg-zinc-950">
                <Logo onClick={() => { handleNavClick('home'); setIsMobileMenuOpen(false); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
