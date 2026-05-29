import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { LayoutDashboard, Car as CarIcon, MessageSquare, PlusCircle, Settings, LogOut, MoreVertical, Loader2, User, Phone, Briefcase, ShieldCheck, Megaphone, ArrowRight, ArrowLeft, Send, Instagram, Facebook, Music, Trash2, AlertCircle, List } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { signOut, deleteUser } from 'firebase/auth';
import { Car, Page } from '../types';
import { SELLER_TYPES } from '../constants';
import { apiFetch } from '../lib/api-client';

import { useToast } from '../components/Toast';
import { BottomSheetSelect } from '../components/BottomSheetSelect';
import { isListingExpired } from '../utils/expiry';

const TikTokLogo = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
     <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.25-1.11 4.41-2.82 5.76-1.8 1.4-4.22 1.83-6.4 1.25-2.43-.65-4.32-2.73-4.73-5.2-.42-2.5.5-5.2 2.5-6.62 1.95-1.39 4.42-1.6 6.64-.81V15.7c-1.31-.38-2.73-.24-3.87.5-1.12.72-1.76 2.05-1.63 3.39.14 1.4 1.22 2.6 2.6 2.87 1.34.25 2.75-.15 3.63-1.14.86-.96 1.2-2.3 1.15-3.64l-.06-17.65Z"/>
  </svg>
);

const AdvertisingScreen = ({ t }: { t: (key: string) => string }) => {
  const [step, setStep] = useState<'promo' | 'contact'>('promo');

  if (step === 'promo') {
    return (
      <div className="relative rounded-[32px] overflow-hidden shadow-2xl min-h-[400px] flex flex-col justify-end p-8 border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&q=80&w=800"
            alt="Advertising"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20" />
        </div>

        <div className="relative z-10 space-y-4">
          <span className="inline-block px-3 py-1 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-brand/20">
            ADVERTISING
          </span>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tight leading-tight">
            {t('dashboard.advertiseTitle') || 'Advertise your products and services here'}
          </h2>
          <p className="text-zinc-300 font-bold pb-4">
            {t('dashboard.advertiseDesc') || 'Reach thousands of customers'}
          </p>
          <button
            onClick={() => setStep('contact')}
            className="w-full py-4 bg-white text-zinc-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {t('common.getStarted') || 'Get Started'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setStep('promo')} className="p-2 -ml-2 text-zinc-500 hover:text-brand transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">{t('dashboard.contactOptions')}</h3>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('dashboard.reachOutDirectly')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Phone */}
        <a href="tel:+251991152329" className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 transition-colors active:scale-95">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('dashboard.phoneNumber')}</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">+251 99 115 2329</p>
          </div>
        </a>

        {/* Telegram */}
        <a href="https://t.me/ethiocars18" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 transition-colors active:scale-95">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Send size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Telegram</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">@ethiocars18</p>
          </div>
        </a>

        {/* Facebook */}
        <a href="https://www.facebook.com/share/18Aad51wxS/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 transition-colors active:scale-95">
          <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 text-[#1877F2] dark:bg-[#1877F2]/20 flex items-center justify-center shrink-0">
            <Facebook size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Facebook</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">EthioCars</p>
          </div>
        </a>

        {/* Instagram */}
        <a href="https://www.instagram.com/ethi.ocars" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 transition-colors active:scale-95">
          <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 flex items-center justify-center shrink-0">
            <Instagram size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instagram</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">@ethi.ocars</p>
          </div>
        </a>

        {/* TikTok */}
        <a href="https://www.tiktok.com/@ethi.ocars" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 transition-colors active:scale-95">
          <div className="w-10 h-10 rounded-xl bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white flex items-center justify-center shrink-0">
            <TikTokLogo size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">TikTok</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">@ethi.ocars</p>
          </div>
        </a>
      </div>
    </div>
  );
};

interface DashboardProps {
  setPage: (page: Page) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setPage }) => {
  const { user, profile, loading: authLoading, t, language, setLanguage } = useAppContext();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [carToDelete, setCarToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [carToMarkSold, setCarToMarkSold] = useState<string | null>(null);
  const [isMarkingSold, setIsMarkingSold] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Lock body scroll when delete or logout modal is open
  useEffect(() => {
    if (carToDelete || carToMarkSold || showLogoutModal || showDeleteAccountModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [carToDelete, carToMarkSold, showLogoutModal, showDeleteAccountModal]);

  const isAdmin = profile?.role?.toLowerCase() === 'admin' || user?.email === 'kaleabepherem@gmail.com' || user?.email === 'kaleabepherem98@gmail.com';

  // Settings state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sellerType, setSellerType] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setSellerType(profile.sellerType || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadCount > 0 && data.lastMessageSenderId !== user.uid) {
          total += data.unreadCount;
        }
      });
      setUnreadTotal(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'cars'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let carData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Car[];

      carData = carData.filter(c => !isListingExpired(c));

      const sortedListings = carData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setListings(sortedListings);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'cars');
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        phoneNumber
      });

      showToast(t('dashboard.profileUpdated'), 'success');
    } catch (error) {
      showToast(t('dashboard.updateFailed'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Background cleanup for expired sold listings
  useEffect(() => {
    if (!user || listings.length === 0) return;
    const now = Date.now();
    const expiredSoldListings = listings.filter(car => car.status === 'sold' && (car as any).scheduledDeleteAt && now >= (car as any).scheduledDeleteAt);

    expiredSoldListings.forEach(async (car) => {
      try {
        const idToken = await user.getIdToken();
        try {
          await apiFetch(`/api/listings?id=${encodeURIComponent(car.id)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
        } catch {
          await deleteDoc(doc(db, 'cars', car.id));
        }
      } catch (e) {
        console.error('Background cleanup failed', e);
      }
    });
  }, [listings, user]);

  const handleMarkSold = async () => {
    if (!carToMarkSold || !user) return;
    setIsMarkingSold(true);
    try {
      const carRef = doc(db, 'cars', carToMarkSold);
      const scheduledDeleteAt = Date.now() + 5 * 60 * 1000; // 5 mins
      await updateDoc(carRef, {
        status: 'sold',
        soldAt: serverTimestamp(),
        scheduledDeleteAt
      });

      // Increment totalSold securely on profile so deleting documents never lowers the stats
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { totalSold: increment(1) });

      const successKey = t('dashboard.markSoldSuccess');
      showToast(successKey === 'dashboard.markSoldSuccess' ? 'Marked as sold successfully' : successKey, 'success');

      // Auto-delete timer for current active session
      const deletedId = carToMarkSold;
      setTimeout(async () => {
        try {
          const idToken = await user.getIdToken();
          try {
            await apiFetch(`/api/listings?id=${encodeURIComponent(deletedId)}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${idToken}` }
            });
          } catch {
            await deleteDoc(doc(db, 'cars', deletedId));
          }
        } catch (e) {
          console.error("Scheduled delete failed:", e);
        }
      }, 5 * 60 * 1000);

      setCarToMarkSold(null);
    } catch (error: any) {
      const errorKey = t('dashboard.markSoldFailed');
      showToast(errorKey === 'dashboard.markSoldFailed' ? 'Failed to mark as sold' : errorKey, 'error');
    } finally {
      setIsMarkingSold(false);
    }
  };

  const handleDeleteListing = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!carToDelete) return;

    // Optimistic UI: remove from list immediately for instant feel
    const deletedId = carToDelete;
    const prevListings = [...listings];
    setListings(prev => prev.filter(car => car.id !== deletedId));
    setCarToDelete(null);
    showToast('Listing deleted successfully', 'success');

    // Background: actual network deletion (R2 cleanup + Firestore)
    try {
      if (!user) throw new Error('Not authenticated');
      const idToken = await user.getIdToken();
      try {
        await apiFetch(`/api/listings?id=${encodeURIComponent(deletedId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        // Sync local Firestore SDK cache so onSnapshot listeners (Featured/Premium/Home) update instantly
        try { await deleteDoc(doc(db, 'cars', deletedId)); } catch {}
      } catch {
        await deleteDoc(doc(db, 'cars', deletedId));
      }
      // Clear sessionStorage caches so Home page doesn't show stale listing data
      sessionStorage.removeItem('cachedFeaturedCars');
      sessionStorage.removeItem('cachedPremiumCars');
      sessionStorage.removeItem('cachedHomeCars');
    } catch (error: any) {
      // Revert optimistic update on failure
      console.error('Delete error:', error);
      setListings(prevListings);
      showToast(`Failed to delete listing: ${error.message || 'Unknown error'}`, 'error');
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
      setPage('home');
    } catch (error) {
      // Silent logout
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not found");

      const uid = currentUser.uid;
      const idToken = await currentUser.getIdToken(true);

      // ── PRE-FETCH all data while still authenticated ──
      const carsSnap = await getDocs(query(collection(db, 'cars'), where('ownerId', '==', uid)));
      const userListings = carsSnap.docs.map(d => ({ id: d.id, ...d.data() as Car }));
      const chatsSnap = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', uid)));
      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', uid)));

      // ── DELETE UPLOADED IMAGES (R2) + Firestore listings ──
      for (const listing of userListings) {
        try {
          await apiFetch(`/api/listings?id=${encodeURIComponent(listing.id)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
        } catch (err) {
          console.error(`R2 cleanup failed for listing ${listing.id}:`, err);
        }
      }
      for (const carDoc of carsSnap.docs) {
        try { await deleteDoc(carDoc.ref); } catch (err) { console.error(`Delete listing ${carDoc.id} failed:`, err); }
      }

      // ── DELETE CHATS & MESSAGES ──
      for (const chatDoc of chatsSnap.docs) {
        try {
          const msgsSnap = await getDocs(collection(db, 'chats', chatDoc.id, 'messages'));
          for (const msgDoc of msgsSnap.docs) { await deleteDoc(msgDoc.ref); }
          await deleteDoc(chatDoc.ref);
        } catch (err) { console.error(`Delete chat ${chatDoc.id} failed:`, err); }
      }

      // ── DELETE PAYMENT RECORDS ──
      for (const paymentDoc of paymentsSnap.docs) {
        try { await deleteDoc(paymentDoc.ref); } catch (err) { console.error(`Delete payment ${paymentDoc.id} failed:`, err); }
      }

      // ── DELETE USER PROFILE ──
      try { await deleteDoc(doc(db, 'users', uid)); } catch (err) { console.error('Delete user profile failed:', err); }

      // ── DELETE AUTH USER — if it fails, just sign out (data is already gone) ──
      try {
        await deleteUser(currentUser);
      } catch (authErr) {
        console.warn('Could not delete auth user, signing out instead:', authErr);
        await signOut(auth);
      }

      // ── CLEAR SESSION & GO HOME ──
      localStorage.clear();
      sessionStorage.clear();
      setShowDeleteAccountModal(false);
      setPage('home');
      showToast('Your account has been deleted successfully', 'success');

    } catch (err: any) {
      console.error('Account deletion error:', err);
      showToast('Failed to delete account. Please try again.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-brand" /></div>;
  if (!user) return <div className="text-center py-24"><h2 className="text-2xl font-bold">{t('dashboard.loginRequired')}</h2></div>;

  const getLabel = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const menuItems: { id: string, label: string, icon: any, badge?: number }[] = [
    { id: 'listings', label: getLabel('dashboard.myListings', 'My Listings'), icon: List },
    { id: 'advertising', label: getLabel('dashboard.advertising', 'Advertising'), icon: Megaphone },
    { id: 'settings', label: getLabel('dashboard.settings', 'Settings'), icon: Settings },
  ];

  const getJoinDateText = () => {
    const creationTime = profile?.createdAt || user?.metadata?.creationTime;
    if (!creationTime) return '';

    const date = creationTime.toDate ? creationTime.toDate() : new Date(creationTime);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(Math.max(0, diffTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('profile.join.today');
    if (diffDays < 30) return t('profile.join.days', { count: diffDays });
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return t('profile.join.months', { count: diffMonths });
    
    const diffYears = Math.floor(diffMonths / 12);
    return t('profile.join.years', { count: diffYears });
  };

  const handleTabClick = (id: string) => {
    if (id === 'admin') {
      setPage('admin');
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-4">
      <div className="flex flex-col gap-3">
        {/* Profile Header - Native Mobile Feel */}
        <div className="flex items-center gap-4 px-1 py-3">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <User size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white truncate leading-tight">{profile?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'User')}</h2>
            <div className="flex flex-col">
              <p className="text-[11px] font-bold text-zinc-400 truncate uppercase tracking-wider">{profile?.phoneNumber || user?.email || ''}</p>
              {profile?.sellerType && (
                <p className="text-[10px] font-black text-brand truncate uppercase tracking-widest mt-0.5">{t(`sellerTypes.${profile.sellerType}`) || profile.sellerType}</p>
              )}
              <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">
                {getJoinDateText()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
          >
            <LogOut size={22} />
          </button>
        </div>

        {/* Mobile Tabs - Compact */}
        <div className="z-10 bg-transparent -mx-4 px-4 py-0.5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeTab === item.id
                  ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20'
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
                  }`}
              >
                <item.icon size={14} className="shrink-0" />
                {item.label}
                {item.badge ? (
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeTab === item.id ? 'bg-white text-brand' : 'bg-brand text-white'
                    }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="space-y-4">
          {activeTab === 'advertising' && <AdvertisingScreen t={t} />}

          {activeTab === 'listings' && (
            <div className="space-y-4">
              {/* Stats Grid - Bento Style */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-brand p-5 rounded-[2rem] text-white shadow-xl shadow-brand/20 flex items-center justify-between overflow-hidden relative">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{t('dashboard.totalListings')}</p>
                    <p className="text-4xl font-black">{listings.length}</p>
                  </div>
                  <CarIcon size={80} className="absolute -right-4 -bottom-4 opacity-20 rotate-12" />
                  <button
                    onClick={() => setPage('post')}
                    className="relative z-10 bg-white text-brand px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"
                  >
                    <PlusCircle size={14} /> {t('dashboard.postNew')}
                  </button>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                    <ShieldCheck size={16} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('dashboard.active')}</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white">
                    {listings.filter(l => l.status === 'approved' || l.status === 'pending_payment_verification' || l.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                    <Briefcase size={16} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('dashboard.sold')}</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white">
                    {(profile as any)?.totalSold ?? listings.filter(l => l.status === 'sold').length}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t('dashboard.myInventory') || 'My Listings'}</h3>
                  <span className="text-[10px] font-bold text-zinc-400">{listings.length} {t('dashboard.items')}</span>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand" /></div>
                ) : listings.length > 0 ? (
                  listings.map((car) => (
                    <div key={car.id} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm flex gap-4 items-center group">
                      <div className="relative shrink-0">
                        <img src={car.imageURLs[0]} alt="" className="w-24 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0 py-1 flex flex-col items-start w-full">
                        <div className="flex items-start justify-between w-full">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate mb-0.5 pr-2">{car.title}</h4>
                          <span className="text-[10px] font-bold text-zinc-400 whitespace-nowrap pt-0.5">
                            {car.createdAt ? (() => {
                              const d = car.createdAt?.toDate?.() || new Date(car.createdAt);
                              return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
                            })() : ''}
                          </span>
                        </div>
                        <p className="text-xs font-black text-brand mb-2">{car.price.toLocaleString()} ETB</p>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          <span className={`inline-flex text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 ${car.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500'
                            : car.status === 'rejected' || car.status === 'payment_rejected'
                              ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500'
                              : car.status === 'sold'
                                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-500'
                            }`}>
                            <span className="whitespace-normal text-left break-words">
                              {car.status === 'approved' ? t('dashboard.active') : car.status === 'rejected' ? (t('dashboard.rejected') || 'Rejected') : car.status === 'payment_rejected' ? (t('dashboard.paymentRejected') || 'Payment Rejected') : car.status === 'sold' ? t('dashboard.sold') : (t('dashboard.pendingVerification') || 'Payment Pending Verification')}
                            </span>
                          </span>
                          <span className={`inline-flex text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 ${
                            car.packageType === 'premium'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500'
                              : car.packageType === 'featured'
                                ? 'bg-brand/10 text-brand'
                                : 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {car.packageType === 'premium' ? t('listing.premium') : car.packageType === 'featured' ? t('listing.featured') : t('listing.free')}
                          </span>
                        </div>
                        <div className="flex gap-2 w-full justify-end mt-1">
                          {car.status === 'approved' && (
                            <button
                              onClick={() => setCarToMarkSold(car.id)}
                              className="flex-1 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                            >
                              <ShieldCheck size={12} className="text-emerald-500" />
                              <span>{t('dashboard.markSold')}</span>
                            </button>
                          )}
                          <button
                            onClick={() => setCarToDelete(car.id)}
                            className="flex-1 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-[0.98]"
                          >
                            <Trash2 size={12} />
                            <span>{t('dashboard.deleteListingBtn') || 'Delete Listing'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-300">
                      <CarIcon size={24} />
                    </div>
                    <p className="text-zinc-500 text-xs font-bold">{t('dashboard.noListings')}</p>
                    <button
                      onClick={() => setPage('post')}
                      className="mt-4 text-brand text-[10px] font-black uppercase tracking-widest"
                    >
                      {t('dashboard.createFirst')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">{t('dashboard.settings')}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('dashboard.manageAccount')}</p>
                </div>
              </div>

              {/* Admin Portal Button */}
              {profile === undefined || authLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-brand" />
                </div>
              ) : isAdmin ? (
                <div className="mb-8 p-6 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand/10 dark:bg-brand/20 rounded-xl flex items-center justify-center text-brand">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white dark:text-zinc-900 uppercase tracking-tight">{t('dashboard.adminPortal')}</h2>
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{t('dashboard.managePlatform')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPage('admin')}
                    className="py-3 px-6 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-brand/90 transition-all"
                  >
                    Open
                  </button>
                </div>
              ) : null}

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">{t('profile.labels.fullName')}</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                      <input
                        id="dashboard-display-name"
                        name="displayName"
                        type="text"
                        placeholder={t('profile.labels.fullName')}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">{t('profile.labels.phone')}</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                      <input
                        id="dashboard-phone-number"
                        name="phoneNumber"
                        type="tel"
                        placeholder="0911..."
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button
                  disabled={isUpdating}
                  className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={20} /> : t('dashboard.updateProfile')}
                </button>
              </form>

              {/* App Settings Section Integrated */}
              <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{t('dashboard.appSettings')}</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('dashboard.preferences')}</p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-tight">{t('dashboard.language')}</h3>
                  <p className="text-[10px] font-medium text-zinc-500 mb-4">{t('dashboard.languageDesc')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-brand text-white' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-100 dark:border-zinc-800'
                        }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('am')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'am' ? 'bg-brand text-white' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-100 dark:border-zinc-800'
                        }`}
                    >
                      Amharic
                    </button>
                    <button
                      onClick={() => setLanguage('om')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'om' ? 'bg-brand text-white' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-100 dark:border-zinc-800'
                        }`}
                    >
                      Oromoo
                    </button>
                    <button
                      onClick={() => setLanguage('ti')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'ti' ? 'bg-brand text-white' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-100 dark:border-zinc-800'
                        }`}
                    >
                      Tigrinya
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Account Section */}
              <div className="mt-8 pt-8 border-t border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-tight">{t('dashboard.deleteAccount') || 'Delete Account'}</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('dashboard.deleteDataDesc') || 'Permanently remove your data'}</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                  {t('dashboard.deleteWarning') || 'This will permanently delete your account, all your listings, messages, payment records, and uploaded images. This action cannot be undone.'}
                </p>
                <button
                  onClick={() => setShowDeleteAccountModal(true)}
                  className="w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl font-black uppercase tracking-widest text-xs border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                >
                  {t('dashboard.yesDeleteAccount') || 'Delete My Account'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mark Sold Confirmation Modal */}
      {carToMarkSold && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white text-center mb-2 tracking-tight">{t('dashboard.markAsSoldTitle')}</h3>
            <p className="text-zinc-500 text-center mb-8 font-medium">
              {t('dashboard.markAsSoldConfirm')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleMarkSold}
                disabled={isMarkingSold}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isMarkingSold ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('dashboard.confirm')}
              </button>
              <button
                onClick={() => setCarToMarkSold(null)}
                disabled={isMarkingSold}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                {t('dashboard.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal — rendered via portal to escape scroll container */}
      {carToDelete && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
              <LogOut size={32} className="rotate-180" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white text-center mb-2 tracking-tight">{t('dashboard.deleteListingTitle')}</h3>
            <p className="text-zinc-500 text-center mb-8 font-medium">
              {t('dashboard.deleteConfirm')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteListing}
                disabled={isDeleting}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('dashboard.yesDelete')}
              </button>
              <button
                onClick={() => setCarToDelete(null)}
                disabled={isDeleting}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                {t('dashboard.cancel')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
              <LogOut size={32} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white text-center mb-2 tracking-tight">{t('dashboard.logoutTitle') || 'Log out?'}</h3>
            <p className="text-zinc-500 text-center mb-8 font-medium">
              {t('dashboard.logoutConfirm') || 'Are you sure you want to log out?'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                {t('dashboard.logout') || 'Log out'}
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                {t('dashboard.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white text-center mb-2 tracking-tight">{t('dashboard.deleteAccount') || 'Delete Account'}</h3>
            <p className="text-zinc-500 text-center mb-8 font-medium">
              {t('dashboard.deleteAccountConfirm') || 'Are you sure you want to permanently delete your account? All your listings, messages, and data will be removed forever. This cannot be undone.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>{t('dashboard.deletingAccount') || 'Deleting account...'}</span>
                  </>
                ) : (t('dashboard.yesDeleteAccount') || 'Yes, Delete My Account')}
              </button>
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                {t('dashboard.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
