import React from 'react';
import { Page } from '../types';
import { ChevronLeft, Mail, MessageCircle, HelpCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const Support: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
  const { t } = useAppContext();
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-6 text-zinc-900 dark:text-white mt-4">{t('supportPage.title') || 'Support'}</h1>
      
      <div className="grid gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center shrink-0">
              <HelpCircle size={24} />
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">{t('supportPage.howCanWeHelp') || 'How can we help?'}</h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {t('supportPage.desc')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <a href="mailto:support@ethiocars.com" className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 hover:border-brand dark:hover:border-brand transition-colors group">
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-900 dark:text-white mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
              <Mail size={24} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">{t('supportPage.emailSupport') || 'Email Support'}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              support@ethiocars.com
            </p>
          </a>

          <button onClick={() => setPage('contact')} className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 hover:border-brand dark:hover:border-brand transition-colors group text-left">
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-900 dark:text-white mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">{t('supportPage.contactMessage') || 'Contact Message'}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('supportPage.sendUsAMessage') || 'Send us a message directly'}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
