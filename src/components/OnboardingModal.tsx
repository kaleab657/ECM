import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

export const OnboardingModal: React.FC = () => {
  const { theme, toggleTheme, language, setLanguage } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // PREVENT REOPEN LOOP
    if (!localStorage.getItem('onboardingCompleted')) {
      setIsVisible(true);
    }
  }, []);

  const forceCloseAndNavigate = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setIsVisible(false);
    window.location.href = '/';
  };

  // SAFETY FALLBACK: Native Back button
  useEffect(() => {
    if (!isVisible) return;
    
    let backListener: any;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', () => {
        forceCloseAndNavigate();
      }).then((l: any) => backListener = l);
    }
    
    return () => {
      if (backListener) backListener.remove();
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-0 sm:p-4">
          {/* SAFETY FALLBACK: Tap outside backdrop */}
          <motion.div 
            className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={forceCloseAndNavigate}
          />
          
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative flex flex-col max-h-[85vh] z-10 overflow-hidden"
          >
            {/* Scrollable Content Area */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 min-h-0 space-y-6 scrollbar-hide">
              <div className="text-center">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white capitalize mb-1">
                  Welcome to EthioCars
                </h2>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Personalize your experience to get started.
                </p>
              </div>

              <div className="space-y-6">
                {/* Language Selection */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 text-center">
                    Choose Language
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                        language === 'en'
                          ? 'border-brand bg-brand/5 dark:bg-brand/10'
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇬🇧</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">English</span>
                      </div>
                      {language === 'en' && <Check size={16} className="text-brand shrink-0" />}
                    </button>
                    <button
                      onClick={() => setLanguage('am')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                        language === 'am'
                          ? 'border-brand bg-brand/5 dark:bg-brand/10'
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇪🇹</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">አማርኛ</span>
                      </div>
                      {language === 'am' && <Check size={16} className="text-brand shrink-0" />}
                    </button>
                    <button
                      onClick={() => setLanguage('om')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                        language === 'om'
                          ? 'border-brand bg-brand/5 dark:bg-brand/10'
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇪🇹</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Afaan Oromoo</span>
                      </div>
                      {language === 'om' && <Check size={16} className="text-brand shrink-0" />}
                    </button>
                    <button
                      onClick={() => setLanguage('ti')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                        language === 'ti'
                          ? 'border-brand bg-brand/5 dark:bg-brand/10'
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇪🇹</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">ትግርኛ</span>
                      </div>
                      {language === 'ti' && <Check size={16} className="text-brand shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 text-center">
                    Choose Theme
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { if (theme !== 'light') toggleTheme(); }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                        theme === 'light'
                          ? 'border-brand bg-brand/5 dark:bg-brand/10'
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100/50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <Sun size={18} className="text-orange-500" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Light Mode</span>
                      </div>
                      {theme === 'light' && <Check size={16} className="text-brand shrink-0" />}
                    </button>
                    <button
                      onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                        theme === 'dark'
                          ? 'border-brand bg-brand/5 dark:bg-brand/10'
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100/10 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                          <Moon size={18} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Dark Mode</span>
                      </div>
                      {theme === 'dark' && <Check size={16} className="text-brand shrink-0" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FIXED BOTTOM BUTTON */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={forceCloseAndNavigate}
                className="w-full py-4 bg-brand text-white rounded-2xl text-sm font-black tracking-widest hover:bg-brand/90 transition-all active:scale-[0.98] shadow-lg shadow-brand/25 flex items-center justify-center"
              >
                Finish Setup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
