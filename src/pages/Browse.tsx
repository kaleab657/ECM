import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Search, SlidersHorizontal, X, ChevronDown, RotateCcw, Loader2 } from 'lucide-react';
import { MAKES, LOCATIONS, MODELS_BY_MAKE, ADDIS_ABABA_SUB_CITIES } from '../constants';
import { CarCard, CarCardSkeleton } from '../components/CarCard';
import { Car, Page } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

interface BrowseProps {
  setPage: (page: Page) => void;
  setSelectedCar: (car: Car) => void;
  initialFilters?: any;
}

export const Browse: React.FC<BrowseProps> = ({ setPage, setSelectedCar, initialFilters }) => {
  const { t } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialFilters?.keyword || '');
  const [filters, setFilters] = useState({
    brand: initialFilters?.brand || '',
    model: initialFilters?.model || '',
    minYear: initialFilters?.minYear || '',
    maxYear: initialFilters?.maxYear || '',
    minPrice: initialFilters?.minPrice || '',
    maxPrice: initialFilters?.maxPrice || '',
    fuel: initialFilters?.fuel || '',
    transmission: initialFilters?.transmission || '',
    city: initialFilters?.city || '',
    subCity: initialFilters?.subCity || '',
    condition: initialFilters?.condition || '',
    listingType: initialFilters?.listingType || '',
    packageType: initialFilters?.packageType || '',
  });
  const [sortBy, setSortBy] = useState('newest');
  const [cars, setCars] = useState<Car[]>([]);
  const [displayLimit, setDisplayLimit] = useState(12);
  const [hasMore, setHasMore] = useState(true);

  // Sync keyword from Home page search
  useEffect(() => {
    if (initialFilters?.keyword) {
      setSearchTerm(initialFilters.keyword);
    }
  }, [initialFilters?.keyword]);

  const filteredCars = useMemo(() => {
    let result = cars.filter(car => {
      // Text search (client-side as Firestore doesn't support full-text search easily)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          car.title.toLowerCase().includes(search) || 
          car.brand.toLowerCase().includes(search) || 
          car.model.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Range filters (client-side)
      if (filters.minYear && car.year < parseInt(filters.minYear)) return false;
      if (filters.maxYear && car.year > parseInt(filters.maxYear)) return false;
      if (filters.minPrice && car.price < parseInt(filters.minPrice)) return false;
      if (filters.maxPrice && car.price > parseInt(filters.maxPrice)) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'year-new': return b.year - a.year;
        case 'newest':
        default:
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });

    return result;
  }, [cars, searchTerm, filters.minYear, filters.maxYear, filters.minPrice, filters.maxPrice, sortBy]);

  useEffect(() => {
    setHasMore(displayLimit < filteredCars.length);
  }, [displayLimit, filteredCars.length]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setDisplayLimit(prev => prev + 12);
        }
      },
      { threshold: 0.1 }
    );

    const target = document.querySelector('#browse-infinite-scroll-trigger');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    setLoading(true);
    
    let q = query(collection(db, 'cars'), where('status', '==', 'approved'));

    // Apply Firestore filters for exact matches
    if (filters.brand) {
      q = query(q, where('brand', '==', filters.brand));
    }
    if (filters.city) {
      q = query(q, where('city', '==', filters.city));
    }
    if (filters.subCity) {
      q = query(q, where('subCity', '==', filters.subCity));
    }
    if (filters.fuel) {
      q = query(q, where('fuel', '==', filters.fuel));
    }
    if (filters.transmission) {
      q = query(q, where('transmission', '==', filters.transmission));
    }
    if (filters.condition) {
      q = query(q, where('condition', '==', filters.condition));
    }
    if (filters.model) {
      q = query(q, where('model', '==', filters.model));
    }
    if (filters.listingType) {
      q = query(q, where('listingType', '==', filters.listingType));
    }
    if (filters.packageType) {
      if (filters.packageType === 'featured') {
        q = query(q, where('packageType', 'in', ['featured', 'premium']));
      } else {
        q = query(q, where('packageType', '==', filters.packageType));
      }
    }

    // Note: Complex queries with multiple filters and orderBy might require indexes.
    // We'll stick to a simpler query if multiple filters are active, or use client-side sorting.
    // Removed limit(100) to ensure all listings are visible as per requirements.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const carData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Car[];
      setCars(carData);
      setLoading(false);
    }, (error) => {
      // If index is missing, fallback to a simpler query or show error
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'cars');
    });

    return () => unsubscribe();
  }, [filters.brand, filters.model, filters.city, filters.subCity, filters.fuel, filters.transmission, filters.condition, filters.listingType]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'brand' ? { model: '' } : {}), // Reset model if brand changes
      ...(key === 'city' && value !== 'Addis Ababa' ? { subCity: '' } : {}) // Reset subCity if city changes from AA
    }));
  };

  const resetFilters = () => {
    setFilters({
      brand: '',
      model: '',
      minYear: '',
      maxYear: '',
      minPrice: '',
      maxPrice: '',
      fuel: '',
      transmission: '',
      city: '',
      subCity: '',
      condition: '',
      listingType: '',
      packageType: '',
    });
    setSearchTerm('');
  };

  const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{title}</h4>
      {children}
    </div>
  );

  const SidebarContent = () => (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2 italic uppercase tracking-tight">
          <Filter size={20} className="text-brand" /> {t('browse.filters')}
        </h3>
        <button 
          onClick={resetFilters}
          className="text-[10px] font-black text-brand hover:text-brand-hover flex items-center gap-1 uppercase tracking-widest"
        >
          <RotateCcw size={12} /> {t('browse.clearAll')}
        </button>
      </div>

      <div className="space-y-8">
        <FilterSection title={t('search.make')}>
          <div className="grid grid-cols-1 gap-3">
            <div className="relative">
              <select 
                id="browse-filter-brand"
                name="brand"
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:outline-none appearance-none cursor-pointer dark:text-white transition-all italic"
              >
                <option value="">{t('search.anyMake')}</option>
                {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
            </div>
            
            <div className="relative">
              <select 
                id="browse-filter-model"
                name="model"
                disabled={!filters.brand}
                value={filters.model}
                onChange={(e) => handleFilterChange('model', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:outline-none appearance-none cursor-pointer disabled:opacity-50 dark:text-white transition-all italic"
              >
                <option value="">{t('search.anyModel')}</option>
                {filters.brand && MODELS_BY_MAKE[filters.brand]?.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
            </div>
          </div>
        </FilterSection>

        <FilterSection title={t('browse.listingType') || 'Listing Type'}>
          <div className="flex gap-2">
            {['sell', 'rent'].map(type => (
              <button
                key={type}
                onClick={() => handleFilterChange('listingType', filters.listingType === type ? '' : type)}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic border ${
                  filters.listingType === type 
                    ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' 
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700/50 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                {type === 'sell' ? (t('browse.sale') || 'Sale') : (t('browse.rent') || 'Rent')}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t('sell.price')}>
          <div className="grid grid-cols-2 gap-3">
            <input 
              id="browse-filter-min-price"
              name="minPrice"
              type="number" 
              placeholder={t('search.minPrice')} 
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none dark:text-white italic focus:ring-2 focus:ring-brand/20 transition-all" 
            />
            <input 
              id="browse-filter-max-price"
              name="maxPrice"
              type="number" 
              placeholder={t('search.maxPrice')} 
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none dark:text-white italic focus:ring-2 focus:ring-brand/20 transition-all" 
            />
          </div>
        </FilterSection>

        <FilterSection title={t('search.fuel')}>
          <div className="grid grid-cols-2 gap-2">
            {['Petrol', 'Diesel', 'Electric', 'Hybrid'].map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange('fuel', filters.fuel === f ? '' : f)}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic border ${
                  filters.fuel === f 
                    ? 'bg-brand border-brand text-white shadow-md shadow-brand/10' 
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700/50 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t('search.location')}>
          <div className="space-y-3">
            <div className="relative">
              <select 
                id="browse-filter-city"
                name="city"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none appearance-none cursor-pointer dark:text-white transition-all italic"
              >
                <option value="">{t('search.anyLocation')}</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{t(`locations.${l}`) || l}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
            </div>

            {filters.city === 'Addis Ababa' && (
              <div className="relative">
                <select 
                  id="browse-filter-subcity"
                  name="subCity"
                  value={filters.subCity}
                  onChange={(e) => handleFilterChange('subCity', e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none appearance-none cursor-pointer dark:text-white transition-all italic"
                >
                  <option value="">{t('search.anySubCity')}</option>
                  {ADDIS_ABABA_SUB_CITIES.map(sc => <option key={sc} value={sc}>{t(`subcities.${sc}`) || sc}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
              </div>
            )}
          </div>
        </FilterSection>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 py-0 md:py-6">
      {/* Search & Sort Bar - Sticky on Mobile */}
      <div className="sticky md:relative z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md md:bg-transparent border-b md:border-none border-zinc-100 dark:border-zinc-800 px-4 md:px-0" style={{ top: 'var(--header-h)' }}>
        <div className="flex items-center gap-2 py-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              id="browse-search-input"
              name="search"
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('home.searchPlaceholder') || 'Search cars...'}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm dark:text-white italic"
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Sorting Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide px-0">
          {[
            { id: 'newest', label: t('browse.newest') },
            { id: 'price-low', label: t('browse.priceLow') },
            { id: 'price-high', label: t('browse.priceHigh') },
            { id: 'year-new', label: t('browse.newestModelYear') || 'Newest Year' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSortBy(pill.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border italic ${
                sortBy === pill.id 
                  ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 px-4 md:px-0 mt-4">
        {/* Sidebar Filters - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm" style={{ top: 'calc(var(--header-h) + 1rem)' }}>
            <SidebarContent />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="mb-4">
            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {filteredCars.length.toLocaleString()} {t('browse.results')}
            </h2>
          </div>

          {/* Mobile Filters Overlay */}
          <AnimatePresence>
            {isFilterOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsFilterOpen(false)}
                  className="lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] bg-white dark:bg-zinc-950 rounded-t-[40px] max-h-[90vh] overflow-y-auto px-6 pt-2 pb-10 shadow-2xl"
                >
                  <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 mt-2" />
                  
                  <SidebarContent />

                  <div className="sticky bottom-0 left-0 right-0 pt-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 -mx-6 px-6">
                    <button 
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand/20 active:scale-95 transition-all mb-[env(safe-area-inset-bottom)]"
                    >
                      {t('browse.showResults')} ({filteredCars.length})
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Results Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <CarCardSkeleton key={i} />
              ))
            ) : filteredCars.length > 0 ? (
              <>
                {filteredCars.slice(0, displayLimit).map((car) => (
                  <CarCard 
                    key={car.id} 
                    car={car} 
                    onClick={(car) => {
                      setSelectedCar(car);
                      setPage('detail');
                    }} 
                  />
                ))}
                
                {/* Infinite Scroll Trigger — only takes space when loading */}
                {hasMore ? (
                  <div id="browse-infinite-scroll-trigger" className="col-span-full h-20 flex items-center justify-center mt-4">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-brand" size={32} />
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('browse.loadingMore')}</p>
                    </div>
                  </div>
                ) : (
                  <div id="browse-infinite-scroll-trigger" className="col-span-full h-2" />
                )}
              </>
            ) : (
              <div className="col-span-full py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-zinc-100 dark:bg-zinc-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-zinc-200 dark:border-zinc-800">
                  <Search className="text-zinc-300" size={40} />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-3 italic uppercase tracking-tight">{t('browse.noResults')}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                  {t('browse.noResultsDesc') || 'Try adjusting your filters or search term to find what you are looking for.'}
                </p>
                <button 
                  onClick={resetFilters}
                  className="mt-8 px-8 py-3 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand/20 active:scale-95 transition-all"
                >
                  {t('browse.clearAll')}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
