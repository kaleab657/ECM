import React, { useState, useEffect } from 'react';
import { Car, Page } from '../types';
import { Star, ChevronLeft, Loader2, Car as CarIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { CarCard, CarCardSkeleton } from '../components/CarCard';

interface FeaturedListingsProps {
  setPage: (page: Page) => void;
  setSelectedCar: (car: Car) => void;
}

export const FeaturedListings: React.FC<FeaturedListingsProps> = ({ setPage, setSelectedCar }) => {
  const { t } = useAppContext();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'cars'),
          where('status', '==', 'active'),
          where('featured', '==', true),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
        setCars(data);
      } catch (err) {
        console.error('Error fetching featured cars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setPage('home')}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Star size={22} className="text-amber-500" fill="currentColor" />
          <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">
            {t('home.featuredTitle') || 'Featured Listings'}
          </h1>
        </div>
        {!loading && cars.length > 0 && (
          <span className="ml-auto px-2.5 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-widest">
            {cars.length} listings
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <CarCardSkeleton key={i} />)}
        </div>
      ) : cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
            <CarIcon size={36} className="text-zinc-300" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white mb-1">No Featured Listings</h2>
            <p className="text-sm text-zinc-400 font-medium">
              Check back soon for featured and premium vehicles.
            </p>
          </div>
          <button
            onClick={() => setPage('browse')}
            className="mt-2 px-6 py-3 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20"
          >
            Browse All Cars
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cars.map(car => (
            <CarCard
              key={car.id}
              car={car}
              onClick={(c) => {
                setSelectedCar(c);
                setPage('detail');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
