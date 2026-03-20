import React from 'react';
import { Moon, Sun, Globe, Heart, Car, Shield, Info, MessageCircle, User } from 'lucide-react';
import { Page } from '../types';
import { useAppContext } from '../context/AppContext';

interface MenuProps {
  setPage: (page: Page) => void;
}

export const Menu: React.FC<MenuProps> = ({ setPage }) => {
  const { theme, toggleTheme, user, t, setAuthModalOpen } = useAppContext();

  const handleNavClick = (page: Page) => {
    setPage(page);
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

        {!user && (
          <div className="pt-4 mt-2">
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
          </div>
        )}
      </div>
    </div>
  );
};
