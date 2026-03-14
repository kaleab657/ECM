import React, { useState } from 'react';
import { Bell, Menu, Search, PlusCircle, User, Home } from 'lucide-react';
import { Page } from '../types';
import { useAppContext } from '../context/AppContext';
import { Logo } from './Logo';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

interface HeaderProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, setPage }) => {
  const { theme, toggleTheme, language, setLanguage, t, user, setAuthModalOpen } = useAppContext();
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
              onClick={() => setAuthModalOpen(true)}
              className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-colors"
            >
              <User size={20} />
            </button>
          )}

          {user && (
            <button 
              onClick={() => handleNavClick('menu')}
              className="md:hidden p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
