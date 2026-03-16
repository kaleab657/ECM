import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh, disabled = false }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isPulling = useRef(false);
  const startY = useRef(0);
  
  const PULL_THRESHOLD = 80;
  const MAX_PULL = 180;

  // Prevent browser's native pull-to-refresh
  React.useEffect(() => {
    document.body.style.overscrollBehaviorY = 'contain';
    return () => { document.body.style.overscrollBehaviorY = 'auto'; };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || window.scrollY > 5) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isPulling.current || isRefreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && window.scrollY <= 5) {
      setPullDistance(Math.min(diff * 0.45, MAX_PULL));
    } else if (diff < 0) {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || !isPulling.current) return;
    isPulling.current = false;

    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      if (onRefresh) {
        await onRefresh();
        setIsRefreshing(false);
        setPullDistance(0);
      } else {
        setTimeout(() => window.location.reload(), 600);
      }
    } else {
      setPullDistance(0);
    }
  };

  const showIndicator = (pullDistance > 20 || isRefreshing) && !disabled;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full relative"
    >
      {showIndicator && (
        <div
          className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none transition-all duration-200"
          style={{
            top: `calc(env(safe-area-inset-top, 0px) + 64px)`,
            opacity: showIndicator ? 1 : 0,
            transform: `translateY(${isRefreshing ? 20 : Math.max(-40, pullDistance - 40)}px)`
          }}
        >
          <div className="bg-white dark:bg-zinc-800 rounded-full p-2 shadow-lg shadow-black/5 dark:shadow-black/20 border border-zinc-100 dark:border-zinc-700/50">
            <RefreshCw 
              className="w-5 h-5 text-brand" 
              strokeWidth={2.5}
              style={{
                transform: `rotate(${isRefreshing ? 0 : pullDistance * 2.5}deg)`,
                animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none'
              }}
            />
          </div>
        </div>
      )}
      <div
        className="w-full min-h-full transition-transform duration-200"
        style={{ transform: `translateY(${isRefreshing ? 15 : pullDistance * 0.15}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
