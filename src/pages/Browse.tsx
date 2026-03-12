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
  const [searchTerm, setSearchTerm] = useState('');
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
    
    let q = query(collection(db, 'cars'), where('status', '==', 'active'));

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-zinc-900 flex items-center gap-2">
          <Filter size={18} className="text-brand" /> {t('browse.filters')}
        </h3>
        <button 
          onClick={resetFilters}
          className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1"
        >
          <RotateCcw size={12} /> {t('browse.clearAll')}
        </button>
      </div>

      <div className="space-y-6">
        <FilterSection title={t('search.make')}>
          <div className="space-y-3">
            <label htmlFor="browse-filter-brand" className="sr-only">{t('search.make')}</label>
            <select 
              id="browse-filter-brand"
              name="brand"
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:outline-none appearance-none cursor-pointer dark:text-white"
            >
              <option value="">{t('search.anyMake')}</option>
              {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            
            <label htmlFor="browse-filter-model" className="sr-only">{t('search.model')}</label>
            <select 
              id="browse-filter-model"
              name="model"
              disabled={!filters.brand}
              value={filters.model}
              onChange={(e) => handleFilterChange('model', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:outline-none appearance-none cursor-pointer disabled:opacity-50 dark:text-white"
            >
              <option value="">{t('search.anyModel')}</option>
              {filters.brand && MODELS_BY_MAKE[filters.brand]?.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </FilterSection>

        <FilterSection title={t('browse.listingType') || 'Listing Type'}>
          <div className="flex gap-2">
            {['sell', 'rent'].map(type => (
              <button
                key={type}
                onClick={() => handleFilterChange('listingType', filters.listingType === type ? '' : type)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                  filters.listingType === type 
                    ? 'bg-brand text-white' 
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                {type === 'sell' ? (t('browse.sale') || 'Sale') : (t('browse.rent') || 'Rent')}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t('sell.price')}>
          <div className="grid grid-cols-2 gap-2">
            <label htmlFor="browse-filter-min-price" className="sr-only">{t('search.minPrice')}</label>
            <input 
              id="browse-filter-min-price"
              name="minPrice"
              type="number" 
              placeholder={t('search.minPrice')} 
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-3 py-2 text-sm focus:outline-none dark:text-white" 
            />
            <label htmlFor="browse-filter-max-price" className="sr-only">{t('search.maxPrice')}</label>
            <input 
              id="browse-filter-max-price"
              name="maxPrice"
              type="number" 
              placeholder={t('search.maxPrice')} 
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-3 py-2 text-sm focus:outline-none dark:text-white" 
            />
          </div>
        </FilterSection>

        <FilterSection title={t('search.yearRange')}>
          <div className="grid grid-cols-2 gap-2">
            <label htmlFor="browse-filter-min-year" className="sr-only">{t('search.fromYear') || 'From Year'}</label>
            <input 
              id="browse-filter-min-year"
              name="minYear"
              type="number" 
              placeholder={t('search.from') || 'From'} 
              value={filters.minYear}
              onChange={(e) => handleFilterChange('minYear', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-3 py-2 text-sm focus:outline-none dark:text-white" 
            />
            <label htmlFor="browse-filter-max-year" className="sr-only">{t('search.toYear') || 'To Year'}</label>
            <input 
              id="browse-filter-max-year"
              name="maxYear"
              type="number" 
              placeholder={t('search.to') || 'To'} 
              value={filters.maxYear}
              onChange={(e) => handleFilterChange('maxYear', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-3 py-2 text-sm focus:outline-none dark:text-white" 
            />
          </div>
        </FilterSection>

        <FilterSection title={t('search.fuel')}>
          <div className="grid grid-cols-2 gap-2">
            {['Petrol', 'Diesel', 'Electric', 'Hybrid'].map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange('fuel', filters.fuel === f ? '' : f)}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                  filters.fuel === f 
                    ? 'bg-brand text-white' 
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t('search.transmission')}>
          <div className="flex gap-2">
            {['Automatic', 'Manual'].map(t_type => (
              <button
                key={t_type}
                onClick={() => handleFilterChange('transmission', filters.transmission === t_type ? '' : t_type)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  filters.transmission === t_type 
                    ? 'bg-brand text-white' 
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                {t_type}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t('search.location')}>
          <div className="space-y-3">
            <label htmlFor="browse-filter-city" className="sr-only">{t('search.location')}</label>
            <select 
              id="browse-filter-city"
              name="city"
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:outline-none appearance-none cursor-pointer dark:text-white"
            >
              <option value="">{t('search.anyLocation')}</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{t(`locations.${l}`) || l}</option>)}
            </select>

            {filters.city === 'Addis Ababa' && (
              <>
                <label htmlFor="browse-filter-subcity" className="sr-only">{t('search.subCity')}</label>
                <select 
                  id="browse-filter-subcity"
                  name="subCity"
                  value={filters.subCity}
                  onChange={(e) => handleFilterChange('subCity', e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:outline-none appearance-none cursor-pointer dark:text-white"
                >
                  <option value="">{t('search.anySubCity')}</option>
                  {ADDIS_ABABA_SUB_CITIES.map(sc => <option key={sc} value={sc}>{t(`subcities.${sc}`) || sc}</option>)}
                </select>
              </>
            )}
          </div>
        </FilterSection>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Search Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <label htmlFor="browse-search-input" className="sr-only">{t('search.search')}</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input 
            id="browse-search-input"
            name="search"
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('home.searchPlaceholder') || 'Search cars...'}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-brand transition-all shadow-sm dark:text-white"
          />
        </div>
        <button 
          onClick={() => setIsFilterOpen(true)}
          className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white shadow-sm"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Sorting Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-4 -mx-4 px-4">
        {[
          { id: 'newest', label: t('browse.newest') },
          { id: 'oldest', label: t('browse.oldest') || 'Oldest' },
          { id: 'price-low', label: t('browse.priceLow') },
          { id: 'price-high', label: t('browse.priceHigh') },
          { id: 'mileage-low', label: t('browse.lowestMileage') || 'Lowest Mileage' },
          { id: 'year-newest', label: t('browse.newestModelYear') || 'Newest Model Year' },
        ].map((pill) => (
          <button
            key={pill.id}
            onClick={() => {
              setSortBy(pill.id);
            }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
              sortBy === pill.id 
                ? 'bg-brand border-brand text-white shadow-md shadow-brand/20' 
                : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
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
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-[100] bg-zinc-900/40 backdrop-blur-sm p-4"
              >
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="bg-white dark:bg-zinc-900 w-full h-full rounded-3xl p-6 overflow-y-auto relative"
                >
                  <button 
                    onClick={() => setIsFilterOpen(false)} 
                    className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full dark:text-white"
                  >
                    <X size={18} />
                  </button>
                  <SidebarContent />
                  <button 
                    onClick={() => setIsFilterOpen(false)}
                    className="w-full bg-brand text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs mt-8 shadow-xl shadow-brand/20"
                  >
                    {t('browse.showResults')} ({filteredCars.length})
                  </button>
                </motion.div>
              </motion.div>
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
                
                {/* Infinite Scroll Trigger */}
                <div id="browse-infinite-scroll-trigger" className="col-span-full h-20 flex items-center justify-center mt-8">
                  {hasMore && (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-brand" size={32} />
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('browse.loadingMore')}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="bg-zinc-50 dark:bg-zinc-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="text-zinc-300" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{t('browse.noResults')}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  {t('browse.noResultsDesc')}
                </p>
                <button 
                  onClick={resetFilters}
                  className="mt-8 text-brand font-bold hover:underline"
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
