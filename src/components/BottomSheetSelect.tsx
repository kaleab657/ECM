import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X } from 'lucide-react';

interface BottomSheetSelectProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  options: { value: string; label: string }[];
  sheetHeight?: string; // e.g. '40vh' for small lists, '75vh' for large lists
}

export const BottomSheetSelect: React.FC<BottomSheetSelectProps> = ({
  id, name, value, onChange, disabled, className, label, options, sheetHeight = '75vh'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  const handleSelect = (opt: { value: string; label: string }) => {
    const syntheticEvent = {
      target: { name, value: opt.value, type: 'select-one' },
      currentTarget: { name, value: opt.value }
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
    // Delay close by one frame so onChange settles before exit animation starts
    requestAnimationFrame(() => setIsOpen(false));
  };

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={className || `w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-sm font-bold text-left flex items-center justify-between gap-2 disabled:opacity-50 ${!selected ? 'text-zinc-400' : 'text-zinc-900 dark:text-white'}`}
      >
        <span className="truncate">{selected ? selected.label : (label || 'Select...')}</span>
        <ChevronDown size={18} className="shrink-0 text-zinc-400 pointer-events-none" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 flex flex-col justify-end z-[9999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="relative w-full bg-white dark:bg-zinc-900 rounded-t-[32px] flex flex-col"
              style={{ height: sheetHeight }}
            >
              <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              </div>

              <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">
                  {label || 'Select Option'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  flex: '1 1 0',
                  minHeight: 0,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                }}
              >
                {options.map((opt, i) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={`w-full text-left px-5 py-4 text-sm font-bold flex items-center justify-between border-b border-zinc-50 dark:border-zinc-800/60 ${
                        isSelected
                          ? 'bg-brand/10 text-brand'
                          : 'text-zinc-800 dark:text-zinc-200 active:bg-zinc-50 dark:active:bg-zinc-800'
                      }`}
                      style={{ minHeight: 52 }}
                    >
                      {opt.label}
                      {isSelected && <div className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
