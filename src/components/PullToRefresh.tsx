import React, { useState, useRef, createContext, useContext } from 'react';

interface RefreshContextType {
  isRefreshing: boolean;
  pullDistance: number;
}

const RefreshContext = createContext<RefreshContextType>({ isRefreshing: false, pullDistance: 0 });

export const useRefresh = () => useContext(RefreshContext);

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

  const PULL_THRESHOLD = 70;
  const MAX_PULL = 150;

  React.useEffect(() => {
    if (disabled) return;
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
      setPullDistance(Math.min(diff * 0.4, MAX_PULL));
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
      
      const refreshStartTime = Date.now();
      
      if (onRefresh) {
        try {
          await onRefresh();
        } catch (e) {
          console.error('Refresh failed:', e);
        }
      }
      
      // Ensure spinner runs for at least 2 seconds as per Rule 9 & 4
      const elapsedTime = Date.now() - refreshStartTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      
      await new Promise(r => setTimeout(r, remainingTime));
      
      setIsRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <RefreshContext.Provider value={{ isRefreshing, pullDistance }}>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full relative"
      >
        <div
          className="w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateY(${isRefreshing ? 10 : pullDistance * 0.1}px)` }}
        >
          {children}
        </div>
      </div>
    </RefreshContext.Provider>
  );
};
