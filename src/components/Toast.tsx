import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Listen for push notifications received in foreground
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, body } = (e as CustomEvent).detail;
      showToast(`${title}: ${body}`, 'info');
    };
    window.addEventListener('app-notification', handler);
    return () => window.removeEventListener('app-notification', handler);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed left-4 right-4 flex flex-col gap-2 pointer-events-none"
          style={{ 
            bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
            zIndex: 999999 
          }}
        >
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="pointer-events-auto shadow-2xl"
              >
                <div className={`
                  flex items-center gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md
                  ${toast.type === 'success' ? 'bg-emerald-500/95 border-emerald-400 text-white' :
                    toast.type === 'error' ? 'bg-red-500/95 border-red-400 text-white' :
                    toast.type === 'warning' ? 'bg-amber-500/95 border-amber-400 text-white' :
                    'bg-zinc-900/95 border-zinc-700 text-white'}
                `}>
                  <div className="shrink-0">
                    {toast.type === 'success' && <CheckCircle size={20} />}
                    {toast.type === 'error' && <XCircle size={20} />}
                    {toast.type === 'warning' && <AlertCircle size={20} />}
                    {toast.type === 'info' && <Info size={20} />}
                  </div>
                  <p className="flex-1 text-xs font-bold leading-tight">{toast.message}</p>
                  <button 
                    onClick={() => removeToast(toast.id)}
                    className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
