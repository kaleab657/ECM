import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh, disabled = false }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const PULL_THRESHOLD = 80;
  const MAX_PULL = 180;

  // Prevent browser's native pull-to-refresh on supported browsers
  useEffect(() => {
    document.body.style.overscrollBehaviorY = 'contain';
    return () => {
      document.body.style.overscrollBehaviorY = 'auto';
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || window.scrollY > 5) return;
    
    // We only register a pull if the user is at the very top of the scroll container
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isPulling || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only respond to downward pulls from the top
    if (diff > 0 && window.scrollY <= 5) {
      // Apply resistance filter (the further you pull, the harder it gets)
      const pull = Math.min(diff * 0.45, MAX_PULL);
      setPullDistance(pull);
    } else if (diff < 0) {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || !isPulling) return;
    
    setIsPulling(false);

    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);

      if (onRefresh) {
        await onRefresh();
        setIsRefreshing(false);
        setPullDistance(0);
      } else {
        // Default refresh behavior: Wait briefly to show the spinner spinning, then soft reload window
        setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    } else {
      // Not pulled enough to trigger a refresh
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full relative"
    >
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ 
              opacity: (pullDistance > 20 || isRefreshing) ? 1 : 0, 
              // Peak out from behind the header (which is usually h-14 to h-16)
              y: isRefreshing ? 20 : Math.max(-40, pullDistance - 40)
            }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            // We use standard React z-index here: Header is z-50, this is z-40 so it slides from underneath.
            className="fixed top-[calc(env(safe-area-inset-top)+64px)] left-0 right-0 z-40 flex justify-center pointer-events-none"
          >
            <div className="bg-white dark:bg-zinc-800 rounded-full p-2 shadow-lg shadow-black/5 dark:shadow-black/20 border border-zinc-100 dark:border-zinc-700/50 flex flex-col items-center justify-center">
              <motion.div
                animate={{ 
                  rotate: isRefreshing ? 360 : pullDistance * 2.5 
                }}
                transition={{ 
                  rotate: isRefreshing 
                    ? { repeat: Infinity, duration: 0.8, ease: "linear" } 
                    : { type: "tween", duration: 0 } 
                }}
              >
                <RefreshCw className="w-5 h-5 text-brand" strokeWidth={2.5} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ y: isRefreshing ? 15 : pullDistance * 0.15 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
};
