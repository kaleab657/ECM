import React, { useState } from 'react';
import { Car, Page, UserProfile } from '../types';
import { MapPin, Calendar, Gauge, Fuel, Settings, ShieldCheck, Phone, MessageCircle, ChevronLeft, User, X, ChevronRight, Maximize2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { CarCard } from '../components/CarCard';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, limit } from 'firebase/firestore';

interface DetailProps {
  car: Car;
  setPage: (page: Page) => void;
  setActiveChatId: (id: string | null) => void;
  setSelectedCar: (car: Car) => void;
}

export const Detail: React.FC<DetailProps> = ({ car, setPage, setActiveChatId, setSelectedCar }) => {
  const { user, profile, t } = useAppContext();
  const [activeImage, setActiveImage] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [similarCars, setSimilarCars] = useState<Car[]>([]);

  // Fetch similar cars
  React.useEffect(() => {
    const fetchSimilarCars = async () => {
      try {
        const q = query(
          collection(db, 'cars'),
          where('brand', '==', car.brand),
          where('status', '==', 'active'),
          limit(7)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() })) as Car[];
        setSimilarCars(data.filter(c => c.id !== car.id).slice(0, 6));
      } catch (error) {
        console.error('Error fetching similar cars:', error);
      }
    };
    fetchSimilarCars();
  }, [car.brand, car.id]);

  // Fetch seller profile from Firestore
  React.useEffect(() => {
    const fetchSellerProfile = async () => {
      if (car.ownerId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', car.ownerId));
          if (userDoc.exists()) {
            setSellerProfile(userDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error('Error fetching seller profile:', error);
        }
      }
    };
    fetchSellerProfile();
  }, [car.ownerId]);

  // Increment views on mount
  React.useEffect(() => {
    if (car.id) {
      const carRef = doc(db, 'cars', car.id);
      updateDoc(carRef, {
        views: increment(1)
      }).catch(err => console.error('Error incrementing views:', err));
    }
  }, [car.id]);

  const handleSendMessage = async () => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', 'detail');
      alert(t('dashboard.loginRequired') || 'Please login to access dashboard');
      setPage('auth');
      return;
    }

    if (user.uid === car.ownerId) {
      alert(t('detail.cannotMessageSelf') || 'You cannot message yourself');
      return;
    }

    try {
      // Check if chat already exists for this car and buyer
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('carId', '==', car.id),
        where('participants', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let chatId;

      if (snapshot.empty) {
        // Create new chat
        const newChat = await addDoc(chatsRef, {
          carId: car.id,
          carTitle: car.title,
          carImage: car.imageURLs[0],
          participants: [user.uid, car.ownerId],
          participantNames: {
            [user.uid]: profile?.displayName || user.displayName || 'User',
            [car.ownerId]: car.ownerName || 'Seller'
          },
          lastMessage: '',
          updatedAt: serverTimestamp(),
          unreadCount: 0,
          lastMessageSenderId: ''
        });
        chatId = newChat.id;
      } else {
        chatId = snapshot.docs[0].id;
      }

      setActiveChatId(chatId);
      setPage('chat');
    } catch (error) {
      alert(t('detail.chatError') || 'Failed to start chat');
    }
  };

  return (
    <div className="bg-[#FDFDFD] dark:bg-zinc-950 min-h-screen pb-32">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-black/[0.03] dark:border-white/[0.05] h-14 px-4 flex items-center justify-between pt-[env(safe-area-inset-top)]">
        <button 
          onClick={() => setPage('home')}
          className="p-2 -ml-2 text-zinc-900 dark:text-white"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="font-black text-[10px] uppercase tracking-[0.2em]">{t('detail.detailsTitle') || 'Vehicle Details'}</div>
        <div className="w-10"></div>
      </div>

      <div className="max-w-7xl mx-auto pt-14 md:pt-8 px-0 md:px-4">
        {/* Desktop Back Button */}
        <button 
          onClick={() => setPage('browse')}
          className="hidden md:flex items-center gap-2 text-zinc-500 hover:text-brand mb-6 transition-colors"
        >
          <ChevronLeft size={20} /> {t('detail.back')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-8">
          {/* Left Column: Images & Description */}
          <div className="lg:col-span-2 space-y-4 md:space-y-8">
            <div className="space-y-4">
              <div className="aspect-[3/2] md:aspect-[16/9] md:rounded-[32px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative shadow-2xl shadow-black/10 group">
                <img 
                  src={car.imageURLs[activeImage]} 
                  alt={car.title}
                  className="w-full h-full object-cover cursor-zoom-in bg-zinc-100 dark:bg-zinc-800"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='533' viewBox='0 0 800 533'%3E%3Crect fill='%23e4e4e7' width='800' height='533'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23a1a1aa'%3ENo Image%3C/text%3E%3C/svg%3E"; e.currentTarget.onerror = null; }}
                  onClick={() => setIsViewerOpen(true)}
                />
                
                {(car.packageType === 'featured' || car.packageType === 'premium') && (
                  <div className="absolute top-6 left-6 px-4 py-2 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl shadow-brand/20 flex items-center gap-2">
                    <ShieldCheck size={12} />
                    {t('detail.featured')}
                  </div>
                )}

                <button 
                  onClick={() => setIsViewerOpen(true)}
                  className="absolute bottom-6 right-6 p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize2 size={20} />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 md:px-0 scrollbar-hide">
                {car.imageURLs.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeImage === idx ? 'border-brand scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover bg-zinc-100 dark:bg-zinc-800" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e4e4e7' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23a1a1aa'%3ENo Image%3C/text%3E%3C/svg%3E"; e.currentTarget.onerror = null; }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Title & Price */}
            <div className="md:hidden px-4 mb-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="px-2 py-0.5 bg-brand/10 text-brand text-[9px] font-black uppercase tracking-widest rounded-md border border-brand/20">
                  {car.condition}
                </span>
                {car.bankLoan && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-emerald-500/20">
                    {t('detail.bankLoan')}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight uppercase italic">{car.brand} {car.model} {car.year}</h1>
              <p className="text-3xl font-black text-brand tracking-tighter mt-1">
                {car.price.toLocaleString()} <span className="text-sm font-bold opacity-70">ETB</span>
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 md:rounded-[32px] p-6 md:p-8 border-y md:border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <h2 className="text-sm font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest italic">{t('detail.description')}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                {car.description}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 md:rounded-[32px] p-6 md:p-8 border-y md:border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <h2 className="text-sm font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-widest italic">{t('detail.specifications')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.make')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.brand}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.model')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.model}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.year')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.year}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.mileage')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.mileage.toLocaleString()} km</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.fuel')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.fuel}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.transmission')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.transmission}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.condition')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.condition ? (t(`search.${car.condition.toLowerCase()}`) || car.condition) : t('search.used')}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.bodyType')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.bodyType ? (t(`bodyTypes.${car.bodyType}`) || car.bodyType) : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.engineSize')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.engineSize || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.color')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.color || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.listingTypeLabel')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white uppercase italic">{car.listingType === 'sale' ? t('sell.forSale') : t('sell.forRent')}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.priceType')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.priceType ? (t(`priceTypes.${car.priceType}`) || car.priceType) : t('priceTypes.Negotiable')}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.location')}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">
                    {t(`locations.${car.city}`) || car.city}{car.subCity ? `, ${t(`subcities.${car.subCity}`) || car.subCity}` : ''}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.bankLoan') || 'Bank Loan'}</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.bankLoan ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}</p>
                </div>
                {car.bankLoan && car.bankLoanAmount && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.remainingLoan') || 'Remaining Loan'}</span>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white italic">{car.bankLoanAmount.toLocaleString()} ETB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Seller (Desktop) */}
          <div className="hidden md:block space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/5 sticky top-24">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <Gauge size={12} />
                    <span>{car.views || 0} {t('common.views') || 'Views'}</span>
                  </div>
                  <div className="px-3 py-1 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase tracking-widest">
                    {car.listingType === 'sale' ? t('sell.forSale') : t('sell.forRent')}
                  </div>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2 leading-tight italic uppercase">{car.title}</h1>
                <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6 uppercase font-bold tracking-tight">
                  <MapPin size={16} />
                  <span>{t(`locations.${car.city}`) || car.city}</span>
                </div>
                <div className="text-4xl font-black text-brand tracking-tighter">
                  {car.price.toLocaleString()} <span className="text-lg font-bold">ETB</span>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-zinc-400">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.sellerInfo')}</p>
                    <p className="font-bold text-zinc-900 dark:text-white text-sm">
                      {sellerProfile?.displayName || car.ownerName}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => car.ownerPhone && (window.location.href = `tel:${car.ownerPhone}`)}
                  className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
                >
                  <Phone size={20} fill="currentColor" /> {t('detail.callSeller')}
                </button>
                
                <button 
                  onClick={handleSendMessage}
                  className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all"
                >
                  <MessageCircle size={20} fill="currentColor" /> {t('detail.sendMessage')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Mobile Action Buttons */}
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-[55] flex gap-3 pb-[env(safe-area-inset-bottom)]">
          <a 
            href={`tel:${car.ownerPhone}`}
            className="flex-1 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-xs"
          >
            <Phone size={18} fill="currentColor" />
            {t('detail.callBtn')}
          </a>
          <button 
            onClick={handleSendMessage}
            className="flex-1 h-14 bg-brand text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-2xl shadow-brand/20 active:scale-95 transition-all text-xs"
          >
            <MessageCircle size={18} fill="currentColor" />
            {t('detail.messageBtn')}
          </button>
        </div>

        {/* Similar Cars Section */}
        <section className="max-w-7xl mx-auto px-4 w-full mt-12 mb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase italic underline decoration-brand/30 decoration-4 underline-offset-4">
              {t('detail.similarCars')}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {similarCars.map((similarCar) => (
              <CarCard 
                key={similarCar.id} 
                car={similarCar} 
                onClick={(c) => {
                  setSelectedCar(c);
                  window.scrollTo(0, 0);
                }} 
              />
            ))}
          </div>
          
          {similarCars.length === 0 && (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 font-bold italic">{t('detail.noSimilar')}</p>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {isViewerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="p-4 flex justify-between items-center text-white">
              <span className="font-black text-xs tracking-widest">{activeImage + 1} / {car.imageURLs.length}</span>
              <button 
                onClick={() => setIsViewerOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={28} />
              </button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center p-4">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImage(prev => (prev > 0 ? prev - 1 : car.imageURLs.length - 1)); }}
                className="absolute left-4 z-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors hidden md:block"
              >
                <ChevronLeft size={32} />
              </button>
              
              <motion.img 
                key={activeImage}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={car.imageURLs[activeImage]} 
                alt="" 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />

              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImage(prev => (prev < car.imageURLs.length - 1 ? prev + 1 : 0)); }}
                className="absolute right-4 z-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors hidden md:block"
              >
                <ChevronRight size={32} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
