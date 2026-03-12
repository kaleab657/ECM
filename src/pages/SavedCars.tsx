import React, { useState, useEffect } from 'react';
import { Car, Page } from '../types';
import { Heart, ChevronLeft, Car as CarIcon, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useFavorites } from '../hooks/useFavorites';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CarCard, CarCardSkeleton } from '../components/CarCard';

interface SavedCarsProps {
  setPage: (page: Page) => void;
  setSelectedCar: (car: Car) => void;
}

export const SavedCars: React.FC<SavedCarsProps> = ({ setPage, setSelectedCar }) => {
  const { t } = useAppContext();
  const { savedIds } = useFavorites();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      if (savedIds.length === 0) {
        setCars([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Firestore 'in' queries support max 30 items
        const chunks: string[][] = [];
        for (let i = 0; i < savedIds.length; i += 30) {
          chunks.push(savedIds.slice(i, i + 30));
        }

        const results: Car[] = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, 'cars'),
            where('__name__', 'in', chunk)
          );
          const snapshot = await getDocs(q);
          snapshot.docs.forEach(doc => {
            results.push({ id: doc.id, ...doc.data() } as Car);
          });
        }

        // Preserve the order of savedIds
        const ordered = savedIds
          .map(id => results.find(c => c.id === id))
          .filter(Boolean) as Car[];

        setCars(ordered);
      } catch (err) {
        console.error('Error fetching saved cars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [savedIds]);

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
          <Heart size={22} className="text-brand" fill="currentColor" />
          <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
            {t('menu.savedCars') || 'Saved Cars'}
          </h1>
        </div>
        {!loading && cars.length > 0 && (
          <span className="ml-auto px-2.5 py-1 bg-brand/10 text-brand text-[10px] font-black rounded-full uppercase tracking-widest">
            {cars.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <CarCardSkeleton key={i} />)}
        </div>
      ) : cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
            <Heart size={36} className="text-zinc-300" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white mb-1">No Saved Cars</h2>
            <p className="text-sm text-zinc-400 font-medium">
              Tap the heart icon on any listing to save it here.
            </p>
          </div>
          <button
            onClick={() => setPage('browse')}
            className="mt-2 px-6 py-3 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20"
          >
            Browse Cars
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
