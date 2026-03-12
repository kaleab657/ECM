import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Car as CarIcon, MessageSquare, PlusCircle, Settings, LogOut, MoreVertical, Loader2, User, Phone, Briefcase, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { signOut } from 'firebase/auth';
import { Car, Page } from '../types';
import { SELLER_TYPES } from '../constants';

import { useToast } from '../components/Toast';

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
      const carData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Car[];
      
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
        phoneNumber,
        sellerType
      });
      
      showToast(t('dashboard.profileUpdated'), 'success');
    } catch (error) {
      showToast(t('dashboard.updateFailed'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!carToDelete) return;
    
    setIsDeleting(true);
    try {
      if (!user) {
        throw new Error('You must be logged in to delete listings');
      }
      
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/listings?id=${carToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete listing');
      }
      
      // Update local state immediately for better perceived performance
      setListings(prev => prev.filter(car => car.id !== carToDelete));
      setCarToDelete(null);
      showToast('Listing deleted successfully', 'success');
    } catch (error: any) {
      console.error('Delete error:', error);
      showToast(`Failed to delete listing: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPage('home');
    } catch (error) {
      // Silent logout
    }
  };

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-brand" /></div>;
  if (!user) return <div className="text-center py-24"><h2 className="text-2xl font-bold">{t('dashboard.loginRequired')}</h2></div>;

  const menuItems = [
    { id: 'listings', label: t('dashboard.myListings'), icon: CarIcon },
    { id: 'messages', label: t('dashboard.messages'), icon: MessageSquare, badge: unreadTotal },
    { id: 'settings', label: t('dashboard.settings'), icon: Settings },
  ];

  const handleTabClick = (id: string) => {
    if (id === 'messages') {
      setPage('chat');
    } else if (id === 'admin') {
      setPage('admin');
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
      <div className="flex flex-col gap-6">
        {/* Profile Header - Mobile Optimized */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 border border-black/5 dark:border-white/5 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <User size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-zinc-900 dark:text-white truncate leading-tight">{profile?.displayName || 'Anonymous'}</h2>
            <p className="text-[10px] font-bold text-zinc-400 truncate uppercase tracking-wider">{profile?.phoneNumber || 'No phone number'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Mobile Tabs - Sticky & Compact */}
        <div className="sticky top-0 z-10 bg-zinc-50/80 dark:bg-black/80 backdrop-blur-md -mx-4 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  activeTab === item.id 
                    ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                <item.icon size={14} />
                {item.label}
                {item.badge ? (
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                    activeTab === item.id ? 'bg-white text-brand' : 'bg-brand text-white'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="space-y-6">
          {activeTab === 'listings' && (
            <div className="space-y-6">
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
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                    <ShieldCheck size={16} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('dashboard.active')}</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white">
                    {listings.filter(l => l.status === 'active').length}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                    <Briefcase size={16} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('dashboard.sold')}</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-white">
                    {listings.filter(l => l.status === 'sold').length}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t('dashboard.myInventory')}</h3>
                  <span className="text-[10px] font-bold text-zinc-400">{listings.length} {t('dashboard.items')}</span>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand" /></div>
                ) : listings.length > 0 ? (
                  listings.map((car) => (
                    <div key={car.id} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex gap-4 items-center group">
                      <div className="relative shrink-0">
                        <img src={car.imageURLs[0]} alt="" className="w-24 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-2 left-2">
                          <span className={`inline-flex justify-center items-center text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-md border border-white/10 w-20 text-center ${
                            car.status === 'active' 
                              ? 'bg-emerald-500/90 text-white backdrop-blur-md' 
                              : car.status === 'pending_payment_verification'
                                ? 'bg-orange-500/90 text-white backdrop-blur-md'
                                : 'bg-zinc-800/90 text-white backdrop-blur-md'
                          }`}>
                            <span className="truncate w-full block">
                              {car.status === 'active' ? t('dashboard.active') : car.status === 'pending_payment_verification' ? 'Payment Pending' : t('dashboard.sold')}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate mb-0.5">{car.title}</h4>
                        <p className="text-xs font-black text-brand mb-2">{car.price.toLocaleString()} ETB</p>
                        <div className="flex gap-2">
                          {car.status === 'active' && (
                            <button 
                              onClick={async () => {
                                const carRef = doc(db, 'cars', car.id);
                                await updateDoc(carRef, { status: 'sold' });
                              }}
                              className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
                            >
                              {t('dashboard.markSold')}
                            </button>
                          )}
                          <button 
                            onClick={() => setCarToDelete(car.id)}
                            className="p-1.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg"
                          >
                            <LogOut size={14} className="rotate-180" />
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
                      <h2 className="text-sm font-black text-white dark:text-zinc-900 uppercase tracking-tight">Admin Portal</h2>
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Manage platform</p>
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
                        type="tel" 
                        placeholder="0911..."
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">{t('profile.labels.sellerType')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SELLER_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSellerType(type)}
                          className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                            sellerType === type
                              ? 'bg-brand border-brand text-white shadow-md shadow-brand/20'
                              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {t(`sellerTypes.${type}`) || type}
                        </button>
                      ))}
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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setLanguage('en')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        language === 'en' ? 'bg-brand text-white' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-100 dark:border-zinc-800'
                      }`}
                    >
                      English
                    </button>
                    <button 
                      onClick={() => setLanguage('am')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        language === 'am' ? 'bg-brand text-white' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-100 dark:border-zinc-800'
                      }`}
                    >
                      Amharic
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {carToDelete && (
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
        </div>
      )}


    </div>
  );
};
