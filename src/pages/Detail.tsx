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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button 
        onClick={() => setPage('browse')}
        className="flex items-center gap-2 text-zinc-500 hover:text-brand mb-6 transition-colors"
      >
        <ChevronLeft size={20} /> {t('detail.back')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Images & Description */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="aspect-[16/9] rounded-[32px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative shadow-2xl shadow-black/10 group">
              <img 
                src={car.imageURLs[activeImage]} 
                alt={car.title}
                className="w-full h-full object-cover cursor-zoom-in"
                referrerPolicy="no-referrer"
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
                className="absolute bottom-6 right-6 p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 size={20} />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {car.imageURLs.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-24 h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                    activeImage === idx ? 'border-brand scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">{t('detail.description')}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {car.description}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">{t('detail.specifications')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.make')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.brand}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.model')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.model}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.year')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.year}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.mileage')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.mileage.toLocaleString()} km</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.fuel')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.fuel}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.transmission')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.transmission}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.condition')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.condition ? (t(`post.condition_${car.condition.toLowerCase()}`) || car.condition) : t('search.used')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.bodyType')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.bodyType ? (t(`bodyTypes.${car.bodyType}`) || car.bodyType) : 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.engineSize')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.engineSize || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.color')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.color || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.listingTypeLabel')}</span>
                <p className="font-bold text-zinc-900 dark:text-white uppercase">{car.listingType === 'sale' ? t('sell.forSale') : t('sell.forRent')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.priceType')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.priceType ? (t(`priceTypes.${car.priceType}`) || car.priceType) : t('priceTypes.Negotiable')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('search.location')}</span>
                <p className="font-bold text-zinc-900 dark:text-white">
                  {t(`locations.${car.city}`) || car.city}{car.subCity ? `, ${t(`subcities.${car.subCity}`) || car.subCity}` : ''}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.bankLoan') || 'Bank Loan'}</span>
                <p className="font-bold text-zinc-900 dark:text-white">{car.bankLoan ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}</p>
              </div>
              {car.bankLoan && car.bankLoanAmount && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('detail.remainingLoan') || 'Remaining Loan'}</span>
                  <p className="font-bold text-zinc-900 dark:text-white">{car.bankLoanAmount.toLocaleString()} ETB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Seller */}
        <div className="space-y-6">
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
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2 leading-tight">{car.title}</h1>
              <div className="flex items-center gap-2 text-zinc-500 text-sm mb-6">
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded-md text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      {sellerProfile?.sellerType ? (t(`sellerTypes.${sellerProfile.sellerType}`) || sellerProfile.sellerType) : (t(`sellerTypes.${car.ownerSellerType}`) || car.ownerSellerType || t('sellerTypes.Private Seller'))}
                    </span>
                    {sellerProfile?.isVerified && (
                      <span className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                        <ShieldCheck size={10} />
                        {t('detail.verified')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center px-2 py-1">
                {car.createdAt && (
                  <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    <Calendar size={12} />
                    <span>{new Date(car.createdAt.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  if (car.ownerPhone) {
                    window.location.href = `tel:${car.ownerPhone}`;
                  } else {
                    alert(t('detail.noPhone') || 'Seller has not provided a phone number.');
                  }
                }}
                className="w-full bg-brand text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
              >
                <Phone size={20} /> {t('detail.callSeller')}
              </button>
              
              <button 
                onClick={handleSendMessage}
                className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all"
              >
                <MessageCircle size={20} /> {t('detail.sendMessage')}
              </button>
            </div>

            <div className="mt-8 p-4 bg-brand/5 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="text-brand shrink-0" size={20} />
              <p className="text-xs text-brand/80 leading-relaxed">
                <strong>{t('detail.safetyTipTitle')}</strong> {t('detail.safetyTip')}
              </p>
            </div>

            <button 
              onClick={() => {
                const subject = encodeURIComponent(`Report Scam: ${car.title} (${car.id})`);
                const body = encodeURIComponent(`I would like to report this listing as a scam.\n\nListing URL: ${window.location.href}\nListing ID: ${car.id}\nSeller: ${car.ownerName}`);
                window.location.href = `mailto:ethiocarsmarketplace@gmail.com?subject=${subject}&body=${body}`;
              }}
              className="w-full mt-4 text-[10px] font-black text-zinc-400 hover:text-red-500 uppercase tracking-widest transition-colors text-center"
            >
              {t('detail.reportScam')}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen Image Viewer */}
      <AnimatePresence>
        {isViewerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="p-4 flex justify-between items-center text-white">
              <span className="font-bold">{activeImage + 1} / {car.imageURLs.length}</span>
              <button 
                onClick={() => setIsViewerOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={32} />
              </button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center p-4">
              <button 
                onClick={() => setActiveImage(prev => (prev > 0 ? prev - 1 : car.imageURLs.length - 1))}
                className="absolute left-4 z-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"
              >
                <ChevronLeft size={32} />
              </button>
              
              <motion.img 
                key={activeImage}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={car.imageURLs[activeImage]} 
                alt="" 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />

              <button 
                onClick={() => setActiveImage(prev => (prev < car.imageURLs.length - 1 ? prev + 1 : 0))}
                className="absolute right-4 z-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            <div className="p-8 flex justify-center gap-4 overflow-x-auto">
              {car.imageURLs.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    activeImage === idx ? 'border-brand scale-110' : 'border-transparent opacity-50'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Similar Cars Section */}
      <section className="max-w-7xl mx-auto px-6 w-full mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic">
            {t('detail.similarCars')}
          </h2>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
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
            <p className="text-zinc-500 font-bold">{t('detail.noSimilar')}</p>
          </div>
        )}
      </section>
    </div>
  );
};
