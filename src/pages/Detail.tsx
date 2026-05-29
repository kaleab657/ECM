import React, { useState } from 'react';
import { useToast } from '../components/Toast';
import { Car, Page, UserProfile } from '../types';
import { MapPin, Calendar, Gauge, Fuel, Settings, ShieldCheck, Phone, MessageCircle, ChevronLeft, User, X, ChevronRight, Maximize2, Tag, Palette, Banknote, Landmark, Box, Car as CarIcon, Flag, Cog } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { CarCard } from '../components/CarCard';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, limit } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const getTelegramUrl = (value: string): string => {
  if (!value) return '';
  const v = value.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (v.startsWith('t.me/')) return `https://${v}`;
  const username = v.startsWith('@') ? v.slice(1) : v;
  return `https://t.me/${username}`;
};

const getWhatsappUrl = (value: string): string => {
  if (!value) return '';
  const v = value.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (v.startsWith('wa.me/')) return `https://${v}`;
  const num = v.replace(/[^0-9+]/g, '');
  return `https://wa.me/${num.startsWith('+') ? num.slice(1) : num}`;
};

interface DetailProps {
  car: Car;
  setPage: (page: Page) => void;
  setActiveChatId: (id: string | null) => void;
  setSelectedCar: (car: Car) => void;
}

export const Detail: React.FC<DetailProps> = ({ car, setPage, setActiveChatId, setSelectedCar }) => {
  const { user, profile, t } = useAppContext();
  const { showToast } = useToast();
  const [activeImage, setActiveImage] = useState(0);

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    const rawPosted = t('detail.posted');
    const postedText = rawPosted === 'detail.posted' || !rawPosted ? 'Posted' : rawPosted;

    if (diffMins < 1) return `${postedText} just now`;
    if (diffMins < 60) return `${postedText} ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${postedText} ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${postedText} ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${postedText} ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    }
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${postedText} ${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  };
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
          where('status', '==', 'approved'),
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

  // Fullscreen viewer: lock scroll + fully hide status bar for immersive experience
  React.useEffect(() => {
    if (isViewerOpen) {
      document.body.classList.add('viewer-open');
      document.body.style.overflow = 'hidden';
      if (Capacitor.isNativePlatform()) {
        StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.hide().catch(() => {});
      }
    } else {
      document.body.classList.remove('viewer-open');
      document.body.style.overflow = '';
      if (Capacitor.isNativePlatform()) {
        StatusBar.show().catch(() => {});
        const isDark = document.documentElement.classList.contains('dark');
        StatusBar.setBackgroundColor({ color: isDark ? '#09090b' : '#FDFDFD' }).catch(() => {});
        StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
      }
    }
    return () => {
      document.body.classList.remove('viewer-open');
      document.body.style.overflow = '';
      if (Capacitor.isNativePlatform()) {
        StatusBar.show().catch(() => {});
      }
    };
  }, [isViewerOpen]);

  // Expose a global callback so the hardware back button can close the viewer
  // instead of navigating away from the Detail page
  React.useEffect(() => {
    if (isViewerOpen) {
      (window as any).__closeDetailViewer = () => {
        setIsViewerOpen(false);
        return true; // signal that we handled the back press
      };
    } else {
      delete (window as any).__closeDetailViewer;
    }
    return () => { delete (window as any).__closeDetailViewer; };
  }, [isViewerOpen]);

  const handleSendMessage = async () => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', 'detail');
      showToast(t('dashboard.loginRequired') || 'Please login to access dashboard', 'warning');
      setPage('auth');
      return;
    }

    if (user.uid === car.ownerId) {
      showToast(t('detail.cannotMessageSelf') || 'You cannot message yourself', 'warning');
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
            [user.uid]: (profile?.displayName !== 'Anonymous' ? profile?.displayName : undefined) || user.displayName || (user.email ? user.email?.split('@')[0] : 'User'),
            [car.ownerId]: (car.ownerName !== 'Anonymous' ? car.ownerName : undefined) || sellerProfile?.email?.split('@')[0] || 'User'
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
      showToast(t('detail.chatError') || 'Failed to start chat', 'error');
    }
  };

  return (
    <div className="bg-[#FDFDFD] dark:bg-zinc-950 min-h-screen pb-32">
      <div className="max-w-7xl mx-auto md:pt-8 px-0 md:px-4">
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
                  className="w-full h-full object-cover cursor-zoom-in bg-zinc-100 dark:bg-zinc-800 opacity-0 transition-opacity duration-500"
                  referrerPolicy="no-referrer"
                  onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                  ref={(img) => { if (img?.complete) img.classList.remove('opacity-0'); }}
                  onError={(e) => { e.currentTarget.classList.remove('opacity-0'); e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='533' viewBox='0 0 800 533'%3E%3Crect fill='%23e4e4e7' width='800' height='533'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23a1a1aa'%3ENo Image%3C/text%3E%3C/svg%3E"; e.currentTarget.onerror = null; }}
                  onClick={() => setIsViewerOpen(true)}
                  decoding="async"
                />
                
                {/* Feature badge removed for detail page as per rules */}

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
                    <img 
                      src={img} 
                      alt="" 
                      className="w-full h-full object-cover bg-zinc-100 dark:bg-zinc-800 opacity-0 transition-opacity duration-300" 
                      onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                      ref={(imgElement) => { if (imgElement?.complete) imgElement.classList.remove('opacity-0'); }}
                      referrerPolicy="no-referrer" 
                      onError={(e) => { e.currentTarget.classList.remove('opacity-0'); e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e4e4e7' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23a1a1aa'%3ENo Image%3C/text%3E%3C/svg%3E"; e.currentTarget.onerror = null; }} 
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Title, Price & Info */}
            <div className="md:hidden px-4 mb-4 space-y-4">
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-brand/10 text-brand text-[9px] font-bold uppercase tracking-wide rounded-md border border-brand/20">
                    {car.condition ? (t(`search.${car.condition.toLowerCase()}`) || car.condition) : ''}
                  </span>
                  {car.bankLoan && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wide rounded-md border border-emerald-500/20">
                      {t('detail.bankLoan')}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[9px] font-bold uppercase tracking-wide rounded-md border border-black/5 dark:border-white/5">
                    {car.listingType === 'sale' ? t('sell.forSale') || 'For Sale' : t('sell.forRent') || 'For Rent'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight uppercase">{car.title}</h1>
                <p className="text-3xl font-bold text-brand tracking-tight mt-1">
                  {car.price.toLocaleString()} <span className="text-sm font-bold opacity-70">ETB</span>
                </p>
              </div>

              <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wide bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand" />
                  <span>{(() => { const v = t(`locations.${car.city}`); return (typeof v === 'string' && v.startsWith('locations.')) ? car.city : (v || car.city); })()}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <Gauge size={14} className="text-brand" />
                  <span>{car.views || 0} {t('common.views') || 'Views'}</span>
                </div>
                {car.createdAt && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-bold text-zinc-400">{getRelativeTime(car.createdAt)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 md:rounded-[32px] p-6 md:p-8 border-y md:border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <h2 className="text-sm font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-wide">{t('detail.description')}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                {car.description}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 md:rounded-[32px] p-6 md:p-8 border-y md:border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <h2 className="text-sm font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-wide">{t('detail.specifications')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-wide">
                    <Tag size={12} strokeWidth={2.5} /> {t('search.make')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.brand}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <CarIcon size={12} strokeWidth={2.5} /> {t('search.model')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.model}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Calendar size={12} strokeWidth={2.5} /> {t('search.year')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.year}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Gauge size={12} strokeWidth={2.5} /> {t('detail.mileage')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.mileage.toLocaleString()} km</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Fuel size={12} strokeWidth={2.5} /> {t('search.fuel')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.fuel ? (t(`common.${car.fuel.toLowerCase()}`) || car.fuel) : ''}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Cog size={12} strokeWidth={2.5} /> {t('search.transmission')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.transmission ? (t(`common.${car.transmission.toLowerCase()}`) || car.transmission) : ''}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <ShieldCheck size={12} strokeWidth={2.5} /> {t('search.condition')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.condition ? (t(`search.${car.condition.toLowerCase()}`) || car.condition) : t('search.used')}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Box size={12} strokeWidth={2.5} /> {t('detail.bodyType')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.bodyType ? (t(`bodyTypes.${car.bodyType}`) || car.bodyType) : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Settings size={12} strokeWidth={2.5} /> {t('detail.engineSize')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.engineSize || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Palette size={12} strokeWidth={2.5} /> {t('detail.color')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.color || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Banknote size={12} strokeWidth={2.5} /> {t('detail.listingTypeLabel')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white uppercase">{car.listingType === 'sale' ? t('sell.forSale') : t('sell.forRent')}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Tag size={12} strokeWidth={2.5} /> {t('detail.priceType')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.priceType ? (t(`priceTypes.${car.priceType}`) || car.priceType) : t('priceTypes.Negotiable')}</p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <MapPin size={12} strokeWidth={2.5} /> {t('search.location')}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">
                    {(() => { const v = t(`locations.${car.city}`); return (typeof v === 'string' && v.startsWith('locations.')) ? car.city : (v || car.city); })()}{car.subCity ? `, ${(() => { const v = t(`subcities.${car.subCity}`); return (typeof v === 'string' && v.startsWith('subcities.')) ? car.subCity : (v || car.subCity); })()}` : ''}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                    <Landmark size={12} strokeWidth={2.5} /> {t('detail.bankLoan') || 'Bank Loan'}
                  </span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.bankLoan ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}</p>
                </div>
                {car.bankLoan && car.bankLoanAmount && (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                      <Landmark size={12} strokeWidth={2.5} /> {t('detail.remainingLoan') || 'Remaining Loan'}
                    </span>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.bankLoanAmount.toLocaleString()} ETB</p>
                  </div>
                )}
                {car.fuelMileage && (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                      <Gauge size={12} strokeWidth={2.5} /> {t('detail.fuelMileage') || 'Fuel Mileage'}
                    </span>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.fuelMileage} km/L</p>
                  </div>
                )}
                {car.driveType && (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                      <Cog size={12} strokeWidth={2.5} /> {t('detail.driveType') || 'Drive Type'}
                    </span>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.driveType}</p>
                  </div>
                )}
                {car.commission && (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                      <Tag size={12} strokeWidth={2.5} /> Commission
                    </span>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">{car.commission}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Seller Info (In-flow before Similar Cars) */}
            <div className="md:hidden bg-white dark:bg-zinc-900 md:rounded-[32px] p-6 border-y border-zinc-100 dark:border-zinc-800 shadow-sm mt-4">
              <h2 className="text-sm font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-wide">{t('detail.sellerInfo') || 'Seller Info'}</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">{t('detail.sellerInfo') || 'Seller'}</p>
                  <p className="font-black text-zinc-900 dark:text-white text-sm">
                    {(sellerProfile?.displayName !== 'Anonymous' ? sellerProfile?.displayName : undefined) || (car.ownerName !== 'Anonymous' ? car.ownerName : undefined) || sellerProfile?.email?.split('@')[0] || 'User'}
                  </p>
                  {car.ownerSellerType && (
                    <p className="text-[9px] font-bold text-brand uppercase tracking-wide mt-0.5">{t(`sellerTypes.${car.ownerSellerType}`) || car.ownerSellerType}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => car.ownerPhone && (window.location.href = `tel:${car.ownerPhone}`)}
                  className="w-full bg-brand text-white py-3.5 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-brand/20 active:scale-95 transition-all text-xs"
                >
                  <Phone size={18} fill="currentColor" /> {t('detail.callSeller') || 'Call Seller'}
                </button>
                
                <button 
                  onClick={handleSendMessage}
                  className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-3.5 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
                >
                  <MessageCircle size={18} fill="currentColor" /> {t('detail.messageBtn') || 'Send Message'}
                </button>

                {(car.ownerTelegram || car.ownerWhatsapp) && (
                  <div className="flex gap-3">
                    {car.ownerTelegram && (
                      <button
                        onClick={() => window.open(getTelegramUrl(car.ownerTelegram!), '_blank')}
                        className="flex-1 bg-[#229ED9] text-white py-3 rounded-2xl font-bold uppercase tracking-wide flex items-center justify-center gap-0 active:scale-95 transition-all"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      </button>
                    )}
                    {car.ownerWhatsapp && (
                      <button
                        onClick={() => window.open(getWhatsappUrl(car.ownerWhatsapp!), '_blank')}
                        className="flex-1 bg-[#25D366] text-white py-3 rounded-2xl font-bold uppercase tracking-wide flex items-center justify-center gap-0 active:scale-95 transition-all"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      </button>
                    )}
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
                  <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                    <Gauge size={12} />
                    <span>{car.views || 0} {t('common.views') || 'Views'}</span>
                  </div>
                  <div className="px-3 py-1 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase tracking-wide">
                    {car.listingType === 'sale' ? t('sell.forSale') : t('sell.forRent')}
                  </div>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2 leading-tight uppercase">{car.title}</h1>
                <div className="flex items-center flex-wrap gap-3 text-zinc-500 text-sm mb-6 uppercase font-bold tracking-tight">
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{(() => { const v = t(`locations.${car.city}`); return (typeof v === 'string' && v.startsWith('locations.')) ? car.city : (v || car.city); })()}</span>
                  </div>
                  {car.createdAt && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="font-bold text-zinc-400 text-xs">{getRelativeTime(car.createdAt)}</span>
                    </>
                  )}
                </div>
                <div className="text-4xl font-black text-brand tracking-tight">
                  {car.price.toLocaleString()} <span className="text-lg font-black">ETB</span>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-zinc-400">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">{t('detail.sellerInfo')}</p>
                    <p className="font-black text-zinc-900 dark:text-white text-sm">
                      {(sellerProfile?.displayName !== 'Anonymous' ? sellerProfile?.displayName : undefined) || (car.ownerName !== 'Anonymous' ? car.ownerName : undefined) || sellerProfile?.email?.split('@')[0] || 'User'}
                    </p>
                    {car.ownerSellerType && (
                      <p className="text-[9px] font-bold text-brand uppercase tracking-wide mt-0.5">{t(`sellerTypes.${car.ownerSellerType}`) || car.ownerSellerType}</p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => car.ownerPhone && (window.location.href = `tel:${car.ownerPhone}`)}
                  className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
                >
                  <Phone size={20} fill="currentColor" /> {t('detail.callSeller')}
                </button>
                
                <button 
                  onClick={handleSendMessage}
                  className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all"
                >
                  <MessageCircle size={20} fill="currentColor" /> {t('detail.sendMessage')}
                </button>

                {(car.ownerTelegram || car.ownerWhatsapp) && (
                  <div className="flex gap-3">
                    {car.ownerTelegram && (
                      <button
                        onClick={() => window.open(getTelegramUrl(car.ownerTelegram!), '_blank')}
                        className="flex-1 bg-[#229ED9] text-white py-3.5 rounded-2xl font-bold uppercase tracking-wide flex items-center justify-center gap-0 hover:opacity-90 active:scale-95 transition-all"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      </button>
                    )}
                    {car.ownerWhatsapp && (
                      <button
                        onClick={() => window.open(getWhatsappUrl(car.ownerWhatsapp!), '_blank')}
                        className="flex-1 bg-[#25D366] text-white py-3.5 rounded-2xl font-bold uppercase tracking-wide flex items-center justify-center gap-0 hover:opacity-90 active:scale-95 transition-all"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Similar Cars Section */}
        <section className="max-w-7xl mx-auto px-4 w-full mt-12 mb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase underline decoration-brand/30 decoration-4 underline-offset-4">
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
              <p className="text-zinc-500 font-bold">{t('detail.noSimilar')}</p>
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
            className="fixed inset-0 z-[150] bg-black w-full overflow-hidden"
            style={{
              touchAction: 'none' // Prevent pull-to-refresh & vertical scroll
            }}
          >
            {/* Header (Absolute to top with top safe area calculation for X and pagination) */}
            <div 
              className="absolute top-0 inset-x-0 w-full z-20 pointer-events-none flex items-center justify-center"
              style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', marginTop: '24px' }}
            >
              <div className="flex-1 flex justify-center">
                <span className="px-5 py-2 bg-black/50 backdrop-blur-md rounded-full font-bold text-sm tracking-[0.2em] text-white drop-shadow-md">
                  {activeImage + 1} / {car.imageURLs.length}
                </span>
              </div>
              <button
                onClick={() => setIsViewerOpen(false)}
                className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md pointer-events-auto"
              >
                <X size={24} />
              </button>
            </div>

            {/* Navigation Arrows (Absolute vertically centered) */}
            <button
              onClick={() => setActiveImage(prev => (prev > 0 ? prev - 1 : car.imageURLs.length - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md z-30 pointer-events-auto shadow-xl"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={() => setActiveImage(prev => (prev < car.imageURLs.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md z-30 pointer-events-auto shadow-xl"
            >
              <ChevronRight size={32} />
            </button>

            {/* Image (Absolute to fill screen completely, centered) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.img
                key={activeImage}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.8}
                onDragEnd={(e, { offset }) => {
                  const swipe = offset.x;
                  if (swipe < -50) {
                    setActiveImage(prev => (prev < car.imageURLs.length - 1 ? prev + 1 : 0));
                  } else if (swipe > 50) {
                    setActiveImage(prev => (prev > 0 ? prev - 1 : car.imageURLs.length - 1));
                  }
                }}
                src={car.imageURLs[activeImage]}
                alt=""
                className="w-full h-full object-contain pointer-events-auto cursor-grab active:cursor-grabbing"
                referrerPolicy="no-referrer"
                draggable={false} // Prevent browser image drag
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
