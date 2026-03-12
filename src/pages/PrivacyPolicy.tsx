import React from 'react';
import { Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const PrivacyPolicy: React.FC = () => {
  const { t } = useAppContext();
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-10 md:p-16 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl">
            <Lock size={24} className="text-zinc-900 dark:text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">{t('privacy.title')}</h1>
        </div>

        <div className="prose prose-zinc max-w-none space-y-8 text-zinc-600 dark:text-zinc-400">
          <section>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest text-xs">{t('privacy.sections.intro.title')}</h2>
            <p className="leading-relaxed">
              {t('privacy.sections.intro.text')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest text-xs">{t('privacy.sections.data.title')}</h2>
            <p className="leading-relaxed">
              {t('privacy.sections.data.text')}
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              {((t('privacy.sections.data.items', { returnObjects: true }) as any) || []).map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest text-xs">{t('privacy.sections.usage.title')}</h2>
            <p className="leading-relaxed">
              {t('privacy.sections.usage.text')}
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              {((t('privacy.sections.usage.items', { returnObjects: true }) as any) || []).map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest text-xs">{t('privacy.sections.security.title')}</h2>
            <p className="leading-relaxed">
              {t('privacy.sections.security.text')}
            </p>
          </section>

          <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            {t('privacy.lastUpdated')}: February 26, 2026
          </div>
        </div>
      </div>
    </div>
  );
};
