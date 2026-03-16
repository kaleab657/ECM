import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, ChevronRight, Fuel, Gauge, Calendar, Car as CarIcon, ChevronDown, Loader2, ChevronLeft } from 'lucide-react';
import { MAKES, LOCATIONS, MODELS_BY_MAKE } from '../constants';
import { CarCard, CarCardSkeleton } from '../components/CarCard';
import { Car, Page } from '../types';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  
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
  }, [loading, loadingMore, hasMore]); // fetchMoreCars added below

  const tabs = [
    { id: 'All', label: t('browse.filter.all') },
    { id: 'private', label: t('browse.filter.privateSellers') },
    { id: 'dealership', label: t('browse.filter.dealerships') },
    { id: 'broker', label: t('browse.filter.brokers') },
    { id: 'bankLoan', label: t('browse.filter.bankLoan') }
  ];

  const fetchInitialCars = async () => {
    setLoading(true);
    try {
      const carsRef = collection(db, 'cars');
      const q = query(
        carsRef,
        where('status', '==', 'active'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
      
      let filtered = data;
      if (activeTab === 'bankLoan') {
        filtered = data.filter(c => c.bankLoan === true);
      } else if (activeTab !== 'All') {
        filtered = data.filter(c => c.ownerSellerType === activeTab);
      }

      setCars(filtered);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 10);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'cars');
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreCars = useCallback(async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const carsRef = collection(db, 'cars');
      const q = query(
        carsRef,
        where('status', '==', 'active'),
        startAfter(lastDoc),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
      
      let filtered = data;
      if (activeTab === 'bankLoan') {
        filtered = data.filter(c => c.bankLoan === true);
      } else if (activeTab !== 'All') {
        filtered = data.filter(c => c.ownerSellerType === activeTab);
      }

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
    fetchInitialCars();
  }, [activeTab]);

  useEffect(() => {
    setLoadingFeatured(true);
    let qFeatured;
    const carsRef = collection(db, 'cars');
    
    if (activeTab === 'bankLoan') {
      qFeatured = query(
        carsRef,
        where('status', '==', 'active'),
        where('featured', '==', true),
        where('bankLoan', '==', true),
        limit(6)
      );
    } else if (activeTab !== 'All') {
      qFeatured = query(
        carsRef,
        where('status', '==', 'active'),
        where('featured', '==', true),
        where('ownerSellerType', '==', activeTab),
        limit(6)
      );
    } else {
      qFeatured = query(
        carsRef,
        where('status', '==', 'active'),
        where('featured', '==', true),
        limit(6)
      );
    }

    const unsubscribeFeatured = onSnapshot(qFeatured, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
      setFeaturedCars(data);
      setLoadingFeatured(false);
    }, (error) => {
      setLoadingFeatured(false);
      handleFirestoreError(error, OperationType.LIST, 'cars');
    });

    return () => unsubscribeFeatured();
  }, [activeTab]);

  // Auto-slide featured cars every 7 seconds
  useEffect(() => {
    if (featuredCars.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveFeaturedIndex((prev) => (prev + 1) % featuredCars.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [featuredCars.length]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (onSearch) {
      onSearch({ keyword: searchQuery });
    } else {
      setPage('browse');
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Smart Search Section */}
      <section className="pt-2 pb-1 px-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-3">
          <div className="relative group">
            <form onSubmit={handleSearchSubmit}>
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
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
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
      </section>

      {/* Featured Listings Slider */}
      {featuredCars.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 w-full">
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
          
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
              {featuredCars.map((car, index) => (
                <div 
                  key={car.id} 
                  className="min-w-[220px] max-w-[220px] snap-start"
                >
                  <CarCard 
                    car={car} 
                    priority={index === 0} 
                    onClick={(car) => {
                      setSelectedCar(car);
                      setPage('detail');
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Listings */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex items-center justify-between mb-3">
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
                  onClick={(car) => {
                    setSelectedCar(car);
                    setPage('detail');
                  }} 
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
      </section>
    </div>
  );
};
