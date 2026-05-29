import React from 'react';
import { Page } from '../types';
import { Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Language as LangType } from '../translations';

export const Language: React.FC = () => {
  const { language, setLanguage, t } = useAppContext();

  const handleSelect = (lang: LangType) => {
    setLanguage(lang);
    setTimeout(() => {
      const homeBtn = Array.from(document.querySelectorAll('nav button')).find(
        (b) => b.textContent?.toLowerCase().includes('home') || 
               b.textContent?.includes('መነሻ') || 
               b.textContent?.includes('Mana') || 
               b.textContent?.includes('መበገሲ')
      );
      if (homeBtn) (homeBtn as HTMLButtonElement).click();
    }, 150); // fast redirect without full loader screen
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <h1 className="text-3xl font-black mb-6 text-zinc-900 dark:text-white">{t('menu.language') || 'Language'}</h1>
      
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-4 shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-2">
        <button
          onClick={() => handleSelect('en')}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
            language === 'en' 
              ? 'bg-brand/10 text-brand' 
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇬🇧</span>
            <span className="font-bold">English</span>
          </div>
          {language === 'en' && <Check size={20} />}
        </button>

        <button
          onClick={() => handleSelect('am')}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
            language === 'am' 
              ? 'bg-brand/10 text-brand' 
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇪🇹</span>
            <span className="font-bold">አማርኛ (Amharic)</span>
          </div>
          {language === 'am' && <Check size={20} />}
        </button>

        <button
          onClick={() => handleSelect('om')}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
            language === 'om' 
              ? 'bg-brand/10 text-brand' 
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇪🇹</span>
            <span className="font-bold">Afaan Oromoo</span>
          </div>
          {language === 'om' && <Check size={20} />}
        </button>

        <button
          onClick={() => handleSelect('ti')}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
            language === 'ti' 
              ? 'bg-brand/10 text-brand' 
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇪🇹</span>
            <span className="font-bold">ትግርኛ (Tigrinya)</span>
          </div>
          {language === 'ti' && <Check size={20} />}
        </button>
      </div>
    </div>
  );
};
