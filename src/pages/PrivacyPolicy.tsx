import React from 'react';
import { Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Language } from '../translations';

export const PrivacyPolicy: React.FC = () => {
  const { language, setLanguage, t } = useAppContext();
  
  const content = t('privacy', { returnObjects: true });
  
  const currentDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'am', label: 'Amharic' },
    { code: 'om', label: 'Oromoo' },
    { code: 'ti', label: 'Tigrinya' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-10 md:p-16 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        
        {/* Header & Language Toggle */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl shrink-0">
              <Lock size={24} className="text-zinc-900 dark:text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
              {content.title}
            </h1>
          </div>
          
          <div className="flex items-center flex-wrap bg-zinc-100 dark:bg-zinc-800 rounded-[24px] p-1 gap-1 shrink-0">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-4 py-2 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  language === lang.code 
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8 font-bold text-brand uppercase tracking-widest text-sm">
          {content.effective} {currentDate}
        </div>

        <div className="prose prose-zinc max-w-none space-y-10 text-zinc-600 dark:text-zinc-400">
          {Array.isArray(content.sections) && content.sections.map((section: any, idx: number) => (
            <section key={idx}>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest text-xs">
                {section.title}
              </h2>
              {Array.isArray(section.content) && section.content.map((p: string, i: number) => (
                <p key={i} className="leading-relaxed mb-3 font-medium">
                  {p}
                </p>
              ))}
              {section.list && Array.isArray(section.list) && section.list.length > 0 && (
                <div className="mt-4 space-y-2 not-prose text-zinc-600 dark:text-zinc-400">
                  {section.list.map((item: string, i: number) => {
                    const isBullet = item.trim().startsWith('-');
                    if (item === '') return <div key={i} className="h-2" />;
                    if (isBullet) {
                      return (
                        <div key={i} className="flex items-start gap-3 pl-2">
                          <span className="text-zinc-400 mt-1 text-[12px]">●</span>
                          <span className="leading-relaxed font-medium">{item.replace(/^-?\s*/, '')}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="font-bold text-zinc-900 dark:text-white mt-6 mb-3">
                        {item}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
