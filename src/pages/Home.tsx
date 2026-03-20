import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Car as CarIcon, Loader2 } from 'lucide-react';
import { CarCard, CarCardSkeleton } from '../components/CarCard';
import { Car, Page } from '../types';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, query, limit, onSnapshot, where, getDocs, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

interface HomeProps {
  setPage: (page: Page) => void;
  setSelectedCar: (car: Car) => void;
  onSearch?: (filters: any) => void;
}

export const Home: React.FC<HomeProps> = ({ setPage, setSelectedCar, onSearch }) => {
  const { t } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const [cars, setCars] = useState<Car[]>([]);
  const [featuredCars, setFeaturedCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

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

  useEffect(() => {
    setLoading(true);
    const carsRef = collection(db, 'cars');
    const q = query(carsRef, where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(10));
    
    // Use onSnapshot for real-time updates of the first 10 cars
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
      
      let filtered = data;
      if (activeTab === 'bankLoan') filtered = data.filter(c => c.bankLoan === true);
      else if (activeTab !== 'All') filtered = data.filter(c => c.ownerSellerType === activeTab);

      setCars(filtered);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 10);
      setLoading(false);
    }, (error) => {
      console.error('Home snapshot error:', error);
      handleFirestoreError(error, OperationType.LIST, 'cars');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const fetchMoreCars = useCallback(async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const carsRef = collection(db, 'cars');
      const q = query(
        carsRef, 
        where('status', '==', 'approved'), 
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc), 
        limit(10)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];

      let filtered = data;
      if (activeTab === 'bankLoan') filtered = data.filter(c => c.bankLoan === true);
      else if (activeTab !== 'All') filtered = data.filter(c => c.ownerSellerType === activeTab);

      setCars(prev => [...prev, ...filtered]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 10);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'cars');
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, activeTab]);

  useEffect(() => {
    setLoadingFeatured(true);
    const carsRef = collection(db, 'cars');
    let qFeatured;

    if (activeTab === 'bankLoan') {
      qFeatured = query(carsRef, where('status', '==', 'approved'), where('featured', '==', true), where('bankLoan', '==', true), limit(6));
    } else if (activeTab !== 'All') {
      qFeatured = query(carsRef, where('status', '==', 'approved'), where('featured', '==', true), where('ownerSellerType', '==', activeTab), limit(6));
    } else {
      qFeatured = query(carsRef, where('status', '==', 'approved'), where('featured', '==', true), limit(6));
    }

    const unsub = onSnapshot(qFeatured, (snapshot) => {
      setFeaturedCars(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[]);
      setLoadingFeatured(false);
    }, (error) => {
      setLoadingFeatured(false);
      handleFirestoreError(error, OperationType.LIST, 'cars');
    });

    return () => unsub();
  }, [activeTab]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (onSearch) onSearch({ keyword: searchQuery });
    else setPage('browse');
  };

  return (
    <div className="flex flex-col pb-20">

      {/* STICKY search + filter bar */}
      <div className="sticky z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-2 pb-2 px-4 border-b border-zinc-100 dark:border-zinc-800" style={{ top: 'var(--header-h)' }}>
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
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide -mx-4 px-4">
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

      {/* Scrollable content below sticky bar */}
      <div className="flex flex-col gap-4 md:gap-6 px-4 pt-4">

        {/* Featured Listings */}
        {featuredCars.length > 0 && (
          <section className="max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">
                {t('home.featuredTitle')}
              </h2>
              <button
                onClick={() => setPage('featuredListings')}
                className="text-[9px] font-black text-brand uppercase tracking-widest hover:underline"
              >
                {t('home.viewAll')}
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
              {featuredCars.map((car, index) => (
                <div key={car.id} className="min-w-[220px] max-w-[220px] snap-start">
                  <CarCard
                    car={car}
                    priority={index === 0}
                    onClick={(car) => { setSelectedCar(car); setPage('detail'); }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Latest Listings — unlimited via infinite scroll */}
        <section className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">
              {t('home.latestTitle')}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <CarCardSkeleton key={i} />)}
            </div>
          ) : cars.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {cars.map((car, index) => (
                <div
                  key={car.id}
                  ref={index === cars.length - 1 ? lastCarElementRef : null}
                >
                  <CarCard
                    car={car}
                    priority={index < 2 && featuredCars.length === 0}
                    onClick={(car) => { setSelectedCar(car); setPage('detail'); }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <CarIcon size={32} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-zinc-500 text-xs font-bold">{t('home.noResults')}</p>
            </div>
          )}

          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          )}

          {!hasMore && cars.length > 0 && (
            <p className="text-center text-zinc-400 text-xs font-bold py-4">No more listings</p>
          )}
        </section>
      </div>
    </div>
  );
};
