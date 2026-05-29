import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Car as CarIcon, Loader2 } from 'lucide-react';
import { CarCard, CarCardSkeleton } from '../components/CarCard';
import { Car, Page } from '../types';
import { useAppContext } from '../context/AppContext';
import { useRefresh } from '../components/PullToRefresh';
import { db } from '../lib/firebase';
import { collection, query, limit, onSnapshot, where, getDocs, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { isListingExpired } from '../utils/expiry';
import { motion, AnimatePresence } from 'motion/react';
import { LineSpinner } from 'ldrs/react';
import 'ldrs/react/LineSpinner.css';

interface HomeProps {
  setPage: (page: Page) => void;
  setSelectedCar: (car: Car) => void;
  onSearch?: (filters: any) => void;
}

export const Home: React.FC<HomeProps> = ({ setPage, setSelectedCar, onSearch }) => {
  const { t, user, theme } = useAppContext();
  const { isRefreshing, pullDistance } = useRefresh();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const [cars, setCars] = useState<Car[]>(() => {
    try {
      const cached = sessionStorage.getItem('cachedHomeCars');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [featuredCars, setFeaturedCars] = useState<Car[]>(() => {
    try {
      const cached = sessionStorage.getItem('cachedFeaturedCars');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [premiumCars, setPremiumCars] = useState<Car[]>(() => {
    try {
      const cached = sessionStorage.getItem('cachedPremiumCars');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('cachedHomeCars'));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(() => !sessionStorage.getItem('cachedFeaturedCars'));
  const [loadingPremium, setLoadingPremium] = useState(() => !sessionStorage.getItem('cachedPremiumCars'));

  // Auto-slide refs
  const premiumScrollRef = useRef<HTMLDivElement>(null);
  const featuredScrollRef = useRef<HTMLDivElement>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastCarElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMoreCars();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const tabs = [
    { id: 'All', label: t('browse.filter.all') },
    { id: 'private', label: t('browse.filter.privateSellers') },
    { id: 'dealership', label: t('browse.filter.dealerships') },
    { id: 'broker', label: t('browse.filter.brokers') },
    { id: 'bankLoan', label: t('browse.filter.bankLoan') }
  ];

  const sortNewestFirst = (listingData: Car[]) => {
    return listingData.sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return (timeB || 0) - (timeA || 0);
    });
  };

  const filterBySellerType = (cars: Car[], tab: string) => {
    if (tab === 'All' || tab === 'bankLoan') return cars;
    
    return cars.filter(c => {
      const dbVal = (c.ownerSellerType || '').toLowerCase().trim();
      const filterVal = tab.toLowerCase();
      
      if (filterVal === 'private') return dbVal.includes('private');
      if (filterVal === 'dealership') return dbVal.includes('dealer');
      if (filterVal === 'broker') return dbVal.includes('broker');
      
      return dbVal === filterVal;
    });
  };

  // Whether a seller-type filter is active (needs bigger fetch to survive client-side filtering)
  const isSellerFilter = activeTab !== 'All' && activeTab !== 'bankLoan';

  // Fetch Latest Listings (Free only)
  useEffect(() => {
    setLoading(true);
    
    const carsRef = collection(db, 'cars');
    
    const processSnapshot = (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Car[];
      let filtered = data.filter(c => !isListingExpired(c));
      if (activeTab === 'bankLoan') filtered = filtered.filter(c => c.bankLoan === true);
      else filtered = filterBySellerType(filtered, activeTab);

      const sorted = sortNewestFirst(filtered);
      
      // Block empty cached results — keep loading until real server data arrives
      // But always resolve loading state to prevent infinite spinner on re-mount
      if (activeTab === 'All' && snapshot.metadata.fromCache && sorted.length === 0) {
        setLoading(false);
        return;
      }

      setCars(sorted);
      if (activeTab === 'All') sessionStorage.setItem('cachedHomeCars', JSON.stringify(sorted));
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length >= fetchLimit);
      setLoading(false);
    };

    // When a seller-type filter is active, fetch more documents so client-side
    // filtering has enough data to produce results.
    const fetchLimit = isSellerFilter ? 50 : 10;

    // Primary query: with orderBy (requires composite index)
    const qOrdered = query(
      carsRef, 
      where('status', '==', 'approved'), 
      where('packageType', '==', 'free'),
      orderBy('createdAt', 'desc'), 
      limit(fetchLimit)
    );
    
    let unsubscribe = onSnapshot(qOrdered, processSnapshot, (error) => {
      console.error('🔴 [LATEST LISTINGS] orderBy query failed, retrying without orderBy:', error);
      
      // Fallback query: without orderBy (same structure as Premium/Featured)
      // Client-side sort via sortNewestFirst() handles ordering
      const qFallback = query(
        carsRef,
        where('status', '==', 'approved'),
        where('packageType', '==', 'free'),
        limit(fetchLimit)
      );
      
      unsubscribe = onSnapshot(qFallback, processSnapshot, (fallbackError) => {
        console.error('🔴 [LATEST LISTINGS] Fallback query also failed:', fallbackError);
        handleFirestoreError(fallbackError, OperationType.LIST, 'cars');
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Global Viewport Lock for Home Page
  useEffect(() => {
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalOverflowX = document.body.style.overflowX;
    
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    
    return () => {
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.overflowX = originalOverflowX;
      document.documentElement.style.overscrollBehavior = '';
    };
  }, []);

  // Fetch Premium Cars
  useEffect(() => {
    const carsRef = collection(db, 'cars');
    let qPremium;
    if (activeTab === 'bankLoan') {
      qPremium = query(carsRef, where('status', '==', 'approved'), where('packageType', '==', 'premium'), where('bankLoan', '==', true), limit(20));
    } else {
      qPremium = query(carsRef, where('status', '==', 'approved'), where('packageType', '==', 'premium'), limit(20));
    }

    const unsub = onSnapshot(qPremium, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
      data = data.filter(c => !isListingExpired(c));
      data = filterBySellerType(data, activeTab);
      const sorted = sortNewestFirst(data).slice(0, 12);
      
      if (activeTab === 'All' && snapshot.metadata.fromCache && sorted.length === 0) return;

      setPremiumCars(sorted);
      if (activeTab === 'All') sessionStorage.setItem('cachedPremiumCars', JSON.stringify(sorted));
      setLoadingPremium(false);
    }, (error) => {
      setLoadingPremium(false);
    });
    return () => unsub();
  }, [activeTab]);

  // Fetch Featured Cars 
  useEffect(() => {
    const carsRef = collection(db, 'cars');
    let qFeatured;

    if (activeTab === 'bankLoan') {
      qFeatured = query(carsRef, where('status', '==', 'approved'), where('packageType', '==', 'featured'), where('bankLoan', '==', true), limit(20));
    } else {
      qFeatured = query(carsRef, where('status', '==', 'approved'), where('packageType', '==', 'featured'), limit(20));
    }

    const unsub = onSnapshot(qFeatured, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
      data = data.filter(c => !isListingExpired(c));
      data = filterBySellerType(data, activeTab);
      const sorted = sortNewestFirst(data).slice(0, 8);
      
      if (activeTab === 'All' && snapshot.metadata.fromCache && sorted.length === 0) return;

      setFeaturedCars(sorted);
      if (activeTab === 'All') sessionStorage.setItem('cachedFeaturedCars', JSON.stringify(sorted));
      setLoadingFeatured(false);
    }, (error) => {
      setLoadingFeatured(false);
    });

    return () => unsub();
  }, [activeTab]);

  const fetchMoreCars = useCallback(async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const moreLimit = isSellerFilter ? 50 : 10;
    try {
      const carsRef = collection(db, 'cars');
      const q = query(
        carsRef, 
        where('status', '==', 'approved'), 
        where('packageType', '==', 'free'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc), 
        limit(moreLimit)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];

      let filtered = data.filter(c => !isListingExpired(c));
      if (activeTab === 'bankLoan') filtered = filtered.filter(c => c.bankLoan === true);
      else filtered = filterBySellerType(filtered, activeTab);

      setCars(prev => sortNewestFirst([...prev, ...filtered]));
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length >= moreLimit);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'cars');
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, activeTab, isSellerFilter]);

  // Auto-slide logic
  useEffect(() => {
    if (premiumCars.length <= 1) return;
    const interval = setInterval(() => {
      if (premiumScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = premiumScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          premiumScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          premiumScrollRef.current.scrollBy({ left: 250, behavior: 'smooth' }); // 240px card + 10px gap
        }
      }
    }, 10000); // 10 seconds interval for smooth auto-scroll
    return () => clearInterval(interval);
  }, [premiumCars]);

  useEffect(() => {
    if (featuredCars.length <= 2) return;
    const interval = setInterval(() => {
      if (featuredScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = featuredScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          featuredScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          featuredScrollRef.current.scrollBy({ left: 170, behavior: 'smooth' }); // 160px card + 10px gap
        }
      }
    }, 17500); // 15-20s interval
    return () => clearInterval(interval);
  }, [featuredCars]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (onSearch) onSearch({ keyword: searchQuery });
    else setPage('browse');
  };

  const handleCarClick = React.useCallback((car: Car) => {
    setSelectedCar(car);
    setPage('detail');
  }, [setSelectedCar, setPage]);

  return (
    <div className="flex flex-col w-full h-[100dvh] overflow-hidden" style={{ overscrollBehavior: 'none' }}>

      {/* STATIC search + filter bar (Locked to top) */}
      <div 
        className="shrink-0 z-[100] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pb-2 px-4 border-b border-zinc-100 dark:border-zinc-800 md:pt-2" 
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        {user?.displayName && (
          <div className="mb-3 text-left">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
              {(() => {
                let greeting = t('home.greeting.evening') || 'Good evening';
                try {
                  const timeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa', hour12: false });
                  const match = timeStr.match(/(\d+):\d+:\d+/);
                  let hour = match ? parseInt(match[1], 10) : new Date().getHours();
                  if (hour === 24) hour = 0;
                  if (hour >= 5 && hour < 12) greeting = t('home.greeting.morning') || 'Good morning';
                  else if (hour >= 12 && hour < 18) greeting = t('home.greeting.afternoon') || 'Good afternoon';
                } catch {
                  const hr = new Date().getHours();
                  if (hr >= 5 && hr < 12) greeting = t('home.greeting.morning') || 'Good morning';
                  else if (hr >= 12 && hr < 18) greeting = t('home.greeting.afternoon') || 'Good afternoon';
                }
                const firstName = user.displayName.trim().split(' ')[0];
                return `${greeting}, ${firstName}`;
              })()}
            </span>
          </div>
        )}

        {/* Anchored Refresh Spinner */}
        <AnimatePresence>
          {(isRefreshing || pullDistance > 30) && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="flex justify-center overflow-hidden"
            >
              <div className="py-2">
                <LineSpinner
                  size="32"
                  stroke="3"
                  speed="1"
                  color={theme === 'dark' ? 'white' : 'black'}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSearchSubmit} className="relative mb-2">
          <input
            id="home-search-input"
            name="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('home.searchPlaceholder') || 'Search cars...'}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-brand transition-all shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-brand text-white p-2 rounded-lg shadow-md shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Search size={14} />
          </button>
        </form>

        {/* Filter tabs */}
        <div 
          className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide -mx-4 px-4"
          onTouchMove={(e) => e.stopPropagation()}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? 'bg-brand border-brand text-white shadow-md shadow-brand/20'
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content below static bar */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24"
        style={{ overscrollBehavior: 'none' }}
        onTouchStart={(e) => {
          if (e.currentTarget.scrollTop > 5) e.stopPropagation();
        }}
        onTouchMove={(e) => {
          if (e.currentTarget.scrollTop > 5) e.stopPropagation();
        }}
      >
        <div className="flex flex-col gap-3 md:gap-6 px-3 pt-3">

        {/* Premium Listings - Horizontal Large Cards */}
        {premiumCars.length > 0 && (
          <section className="max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">
                {t('home.premiumTitle') || 'Premium Cars'}
              </h2>
              <button
                onClick={() => setPage('premiumListings')}
                className="text-[9px] font-black text-brand uppercase tracking-widest hover:underline"
              >
                {t('home.viewAll') || 'View All'}
              </button>
            </div>
            <div 
              ref={premiumScrollRef}
              className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
              onTouchMove={(e) => e.stopPropagation()}
            >
              {premiumCars.map((car, index) => (
                <div key={car.id} className="min-w-[240px] max-w-[240px] snap-start">
                  <CarCard
                    car={car}
                    priority={index === 0}
                    onClick={handleCarClick}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Listings - 2 Rows x Column Grid Horizontal */}
        {featuredCars.length > 0 && (
          <section className="max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">
                {t('home.featuredTitle')}
              </h2>
              <button
                onClick={() => setPage('featuredListings')}
                className="text-[9px] font-black text-brand uppercase tracking-widest hover:underline"
              >
                {t('home.viewAll') || 'View All'}
              </button>
            </div>
            <div 
              ref={featuredScrollRef}
              className={`grid ${featuredCars.length > 1 ? 'grid-rows-2' : 'grid-rows-1'} grid-flow-col gap-2.5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4`}
              style={{ gridAutoColumns: 'calc(50% - 10px)' }}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {featuredCars.map((car, index) => (
                <div key={car.id} className="min-w-[160px] snap-start">
                  <CarCard
                    car={car}
                    onClick={handleCarClick}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Latest Listings — Only Free */}
        <section className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">
              {t('home.latestTitle')}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => <CarCardSkeleton key={i} />)}
            </div>
          ) : cars.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {cars.map((car, index) => (
                <div
                  key={car.id}
                  ref={index === cars.length - 1 ? lastCarElementRef : null}
                >
                  <CarCard
                    car={car}
                    priority={index < 2 && featuredCars.length === 0}
                    onClick={handleCarClick}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <CarIcon size={32} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-zinc-500 text-xs font-bold">
                {activeTab === 'private' ? 'No private seller listings' :
                 activeTab === 'dealership' ? 'No dealership listings' :
                 activeTab === 'broker' ? 'No broker listings' :
                 activeTab === 'bankLoan' ? 'No bank loan listings' :
                 (t('home.noResults') || t('home.noListings'))}
              </p>
            </div>
          )}

          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          )}

          {!hasMore && cars.length > 0 && (
            <p className="text-center text-zinc-400 text-xs font-bold py-4">No more  Listings</p>
          )}
        </section>
        </div>
      </div>
    </div>
  );
};
