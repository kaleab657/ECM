import React from 'react';
import { Car } from '../types';
import { Calendar, Gauge, Fuel, Heart, Settings } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useFavorites } from '../hooks/useFavorites';

interface CarCardProps {
  car: Car;
  onClick: (car: Car) => void;
  variant?: 'featured' | 'search';
  priority?: boolean;
}

export const CarCard = React.memo<CarCardProps>(({ car, onClick, variant = 'search', priority = false }) => {
  const { t } = useAppContext();
  const { isSaved, toggleFavorite } = useFavorites();
  const saved = isSaved(car.id);

  return (
    <div 
      className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer group transition-all hover:shadow-xl hover:shadow-black/5"
      onClick={() => onClick(car)}
    >
      <div className="aspect-[3/2] overflow-hidden relative">
        <img 
          src={car.imageURLs[0]} 
          alt={car.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 bg-zinc-100 dark:bg-zinc-800"
          referrerPolicy="no-referrer"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=60'; // Safe fallback
            e.currentTarget.onerror = null; 
          }}
          decoding="async"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {car.packageType && car.packageType !== 'free' && (
            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg ${
              car.packageType === 'premium' ? 'bg-amber-500 text-white' : 'bg-brand text-white'
            }`}>
              {car.packageType === 'premium' ? (t('carCard.premium') || 'Premium') : (t('carCard.featured') || 'Featured')}
            </div>
          )}
          {car.saleType === 'Broker' && (
            <div className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-zinc-900/80 backdrop-blur-md text-white">
              {t('carCard.broker') || 'Broker'}
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <button 
          className={`absolute top-3 right-3 w-8 h-8 backdrop-blur-md rounded-full flex items-center justify-center transition-all active:scale-90 ${
            saved
              ? 'bg-brand text-white shadow-lg shadow-brand/30'
              : 'bg-white/20 text-white hover:bg-brand'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(car.id);
          }}
          aria-label={saved ? 'Remove from saved' : 'Save car'}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      <div className="p-3">
        <div className="mb-2">
          <h3 className="font-black text-xs text-zinc-900 dark:text-white tracking-tight truncate mb-0.5">
            {car.brand} {car.model}
          </h3>
          <p className="text-base font-black text-brand tracking-tighter">
            {car.price.toLocaleString()} <span className="text-[9px] font-bold">ETB</span>
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 mb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <Calendar size={12} className="text-zinc-300" />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <Gauge size={12} className="text-zinc-300" />
            <span>{(car.mileage / 1000).toFixed(0)}k km</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <Fuel size={12} className="text-zinc-300" />
            <span>{car.fuel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <Settings size={12} className="text-zinc-300" />
            <span className="truncate">{car.transmission}</span>
          </div>
        </div>

        <button 
          className="w-full py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all border border-zinc-100 dark:border-zinc-700"
          onClick={(e) => {
            e.stopPropagation();
            onClick(car);
          }}
        >
          {t('carCard.viewDetails') || 'View Details'}
        </button>
      </div>
    </div>
  );
});

export const CarCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm animate-pulse">
    <div className="aspect-[3/2] bg-zinc-100 dark:bg-zinc-800" />
    <div className="p-3 space-y-3">
      <div className="flex justify-between">
        <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-1/2" />
        <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-1/4" />
      </div>
      <div className="h-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg w-3/4" />
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="h-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl" />
        <div className="h-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl" />
        <div className="h-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl" />
      </div>
    </div>
  </div>
);
