import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

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

  React.useEffect(() => {
    if (disabled) return; // Only set overscrollBehavior when pull-to-refresh is active
    document.body.style.overscrollBehaviorY = 'contain';
    return () => { document.body.style.overscrollBehaviorY = ''; };
  }, [disabled]);

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
      }
      // Small delay so the user sees the refresh indicator
      await new Promise(r => setTimeout(r, 300));
      setIsRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  };

  // When disabled, render children directly — NO wrapper div, NO touch handlers
  // This ensures zero interference with native browser scrolling on non-home pages
  if (disabled) {
    return <>{children}</>;
  }

  const showIndicator = pullDistance > 20 || isRefreshing;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full relative"
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
            <Loader2
              className="w-5 h-5 text-brand animate-spin"
              strokeWidth={2.5}
            />
          </div>
        </div>
      )}
      <div
        className="w-full transition-transform duration-200"
        style={{ transform: `translateY(${isRefreshing ? 15 : pullDistance * 0.15}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
