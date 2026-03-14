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
  const { theme, toggleTheme, user, t, setAuthModalOpen } = useAppContext();

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
    <div className="pt-6 pb-20 px-4 max-w-7xl mx-auto min-h-[90vh]">
      <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 px-2">{t('common.menu') || 'Menu'}</h1>
      
      <div className="space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 rounded-2xl transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm border border-black/[0.03] dark:border-white/[0.05]"
          >
            <div className="w-12 h-12 rounded-[14px] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0 shadow-sm border border-black/[0.03] dark:border-white/[0.05]">
              <item.icon size={22} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-base font-bold text-zinc-900 dark:text-white">{item.label}</div>
              {item.description && (
                <div className="text-xs font-semibold text-zinc-400 mt-0.5">{item.description}</div>
              )}
            </div>
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/50">
          {user ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <div className="w-12 h-12 rounded-[14px] bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 border border-red-100 dark:border-red-900/30">
                <LogOut size={22} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-base font-bold text-red-600 dark:text-red-400">{t('menu.logout') || 'Logout'}</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-brand/5"
            >
              <div className="w-12 h-12 rounded-[14px] bg-brand/10 flex items-center justify-center text-brand shrink-0 border border-brand/20">
                <User size={22} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-base font-bold text-brand">{t('auth.signInBtn') || 'Login / Sign Up'}</div>
                <div className="text-xs font-semibold text-brand/70 mt-0.5">Access disabled features</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
