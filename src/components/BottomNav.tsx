import React from 'react';
import { Car, Search, Plus, MessageCircle, User } from 'lucide-react';
import { Page } from '../types';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

interface BottomNavProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, setPage }) => {
  const { user, t } = useAppContext();
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Listen for unread messages — deferred to avoid blocking initial render
  React.useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;

    const init = () => {
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

    // Defer until browser is idle to avoid blocking paint
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => init(), { timeout: 4000 });
    } else {
      setTimeout(init, 2000);
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  const navItems = [
    { id: 'home', label: t('nav.cars') === 'nav.cars' ? 'Cars' : t('nav.cars') || 'Cars', icon: Car },
    { id: 'browse', label: t('nav.browse') || 'Browse', icon: Search },
    { id: 'post', label: '', icon: Plus }, // Central button drops the label for pure visual focus
    { id: 'chat', label: t('nav.chat') || 'Chat', icon: MessageCircle, badge: unreadCount },
    { id: 'dashboard', label: t('nav.profile') === 'nav.profile' ? 'Profile' : t('nav.profile') || 'Profile', icon: User },
  ];

  return (
    <nav
      className="md:hidden fixed z-[90] bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800 px-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] rounded-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 48px)' }}
    >
      <div className="flex items-center justify-between h-[72px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isPost = item.id === 'post';
          
          if (isPost) {
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id as Page)}
                className="relative -top-5 flex items-center justify-center bg-brand text-white shadow-xl shadow-brand/40 rounded-full w-[60px] h-[60px] active:scale-95 transition-transform duration-300 shrink-0 border-4 border-[#FDFDFD] dark:border-zinc-950"
              >
                <Icon size={28} strokeWidth={2.5} />
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id as Page)}
              className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-14 ${
                isActive 
                  ? 'text-brand scale-105' 
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${
                isActive ? 'opacity-100 text-brand' : 'opacity-80'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
