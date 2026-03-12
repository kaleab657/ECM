import React from 'react';
import { Page } from '../types';
import { ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const AboutUs: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
  const { t } = useAppContext();
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button 
        onClick={() => setPage('home')}
        className="mb-6 flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ChevronLeft size={20} className="mr-1" />
        {t('detail.back') || 'Back'}
      </button>
      
      <h1 className="text-3xl font-black mb-6 text-zinc-900 dark:text-white mt-4">{t('about.title') || 'About Us'}</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
          {t('about.p1')}
        </p>
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
          {t('about.p2')}
        </p>
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
          {t('about.p3')}
        </p>
        
        <h2 className="text-xl font-black mb-4 text-zinc-900 dark:text-white">{t('about.keyFeatures') || 'Key Features'}</h2>
        <ul className="space-y-4">
          {[
            t('about.feature1') || 'Browse thousands of car listings across Ethiopia',
            t('about.feature2') || 'Post your car for sale quickly and easily',
            t('about.feature3') || 'View detailed car information including condition, price, and location',
            t('about.feature4') || 'Chat directly with buyers and sellers inside the app',
            t('about.feature5') || 'Save cars to your favorites or wishlist',
            t('about.feature6') || 'Fast search and category filtering to find the perfect car.'
          ].map((feature, idx) => (
            <li key={idx} className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-brand mt-2 mr-3 shrink-0"></span>
              <span className="text-zinc-600 dark:text-zinc-400">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
