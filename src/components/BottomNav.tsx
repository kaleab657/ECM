import React from 'react';
import { Home, Search, PlusCircle, LayoutDashboard, Bell } from 'lucide-react';
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

  // Listen for unread messages
  React.useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    return () => unsubscribe();
  }, [user]);

  const navItems = [
    { id: 'home', label: t('nav.home') || 'Home', icon: Home },
    { id: 'browse', label: t('nav.browse') || 'Browse', icon: Search },
    { id: 'post', label: 'Post Your Car', icon: PlusCircle },
    { id: 'chat', label: t('nav.chat') || 'Chat', icon: Bell, badge: unreadCount },
    { id: 'dashboard', label: t('nav.account') || 'Account', icon: LayoutDashboard },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-100 dark:border-zinc-800 px-6"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex items-center justify-between h-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isPost = item.id === 'post';
          
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id as Page)}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${
                isActive 
                  ? 'text-brand scale-110' 
                  : isPost
                    ? 'text-brand/70 dark:text-brand/60 hover:text-brand'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                isPost 
                  ? isActive 
                    ? 'bg-brand text-white shadow-lg shadow-brand/30' 
                    : 'bg-brand/10 text-brand'
                  : isActive 
                    ? 'bg-brand/10' 
                    : ''
              }`}>
                <Icon size={isPost ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {item.badge ? (
                <span className="absolute top-0 right-0 -translate-y-1 translate-x-1 w-4 h-4 bg-brand text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
              <span className={`text-[9px] font-black uppercase tracking-tight transition-all duration-300 leading-tight ${
                isActive ? 'opacity-100' : isPost ? 'opacity-80' : 'opacity-60'
              } ${isPost ? 'text-center max-w-[52px]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
