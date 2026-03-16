import React from 'react';
import { Moon, Sun, Globe, LogOut, Heart, Car, Shield, Info, MessageCircle, User } from 'lucide-react';
import { Page } from '../types';
import { useAppContext } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface MenuProps {
  setPage: (page: Page) => void;
}

export const Menu: React.FC<MenuProps> = ({ setPage }) => {
  const { theme, toggleTheme, user, profile, t, setAuthModalOpen } = useAppContext();

  const handleNavClick = (page: Page) => {
    setPage(page);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      sessionStorage.clear();
      setPage('home');
    } catch (error) {
      // Silent error
    }
  };

  const menuItems = [
    { id: 'saved', label: t('menu.savedCars') || 'Saved Cars', description: t('menu.savedCarsDesc'), icon: Heart, action: () => handleNavClick('saved') },
    { id: 'valuation', label: t('menu.valuation') || 'Car Valuation', icon: Car, action: () => handleNavClick('valuation') },
    { id: 'safety', label: t('menu.safety') || 'Safety Tips', icon: Shield, action: () => handleNavClick('safety') },
    { id: 'privacy', label: t('menu.privacy') || 'Privacy Policy', icon: Shield, action: () => handleNavClick('privacy') },
    { id: 'theme', label: t('menu.theme') || 'Appearance', description: t('menu.themeDesc'), icon: theme === 'light' ? Moon : Sun, action: toggleTheme },
    { id: 'about', label: t('menu.about') || 'About Us', icon: Info, action: () => handleNavClick('about') },
    { id: 'support', label: t('menu.support') || 'Support & Help', icon: MessageCircle, action: () => handleNavClick('support') },
    { id: 'language', label: t('menu.language') || 'Language', description: t('menu.languageDesc'), icon: Globe, action: () => handleNavClick('language') },
  ];

  return (
    <div className="pt-2 md:pt-4 pb-24 px-4 max-w-2xl mx-auto min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20">
      {/* Profile Section */}
      <div className="mb-6 bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-black/[0.03] dark:border-white/[0.05] flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand border border-brand/20">
          <User size={32} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">{user ? (profile?.displayName || user.displayName || 'EthioCars User') : t('auth.welcome') || 'Welcome!'}</h2>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">{user ? user.email : t('auth.signInToAccess') || 'Sign in to access all features'}</p>
        </div>
      </div>

      <h1 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-3 px-4 uppercase tracking-[0.2em]">{t('common.management') || 'Management'}</h1>
      
      <div className="grid grid-cols-1 gap-2.5">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-[24px] transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm border border-black/[0.02] dark:border-white/[0.04] group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 group-hover:bg-brand/10 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-brand shrink-0 transition-colors">
              <item.icon size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-black text-zinc-900 dark:text-white">{item.label}</div>
              {item.description && (
                <div className="text-[10px] font-bold text-zinc-400 mt-0.5 leading-tight">{item.description}</div>
              )}
            </div>
          </button>
        ))}

        <div className="pt-4 mt-2">
          {user ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 p-4 rounded-[24px] transition-all hover:bg-red-50 dark:hover:bg-red-900/10 border border-transparent hover:border-red-100 dark:hover:border-red-900/20 active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 border border-red-100 dark:border-red-900/30">
                <LogOut size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-wider">{t('menu.logout') || 'Logout'}</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center gap-4 p-4 rounded-[24px] bg-brand text-white shadow-lg shadow-brand/20 active:scale-[0.98] transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <User size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-black uppercase tracking-wider">{t('auth.signInBtn') || 'Login / Sign Up'}</div>
                <div className="text-[10px] font-bold text-white/70 mt-0.5 leading-tight">Sync your saved cars across devices</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
