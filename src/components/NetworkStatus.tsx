import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';

export const NetworkStatus: React.FC = () => {
  const { t } = useAppContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-zinc-900/60 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-white dark:bg-zinc-950 w-full max-w-[320px] rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <WifiOff size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
              {t('network.title') || 'No Internet Connection'}
            </h2>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-8">
              {t('network.message') || 'Please check your internet connection and try again.'}
            </p>
            <button
               onClick={() => {
                 if (navigator.onLine) {
                   setIsOnline(true);
                 } else {
                   window.location.reload();
                 }
               }}
              className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-[0.98]"
            >
              {t('network.tryAgain') || 'Try Again'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
