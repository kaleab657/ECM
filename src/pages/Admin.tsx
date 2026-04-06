import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Car as CarIcon, 
  Users, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Star, 
  Bell, 
  Loader2, 
  Filter, 
  Search, 
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Send,
  Crown,
  Ban,
  UserMinus,
  Settings
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { Car, Page } from '../types';
import { apiFetch } from '../lib/api-client';

import { useToast } from '../components/Toast';

interface AdminProps {
  setPage: (page: Page) => void;
  setSelectedCar: (car: Car) => void;
}

export const Admin: React.FC<AdminProps> = ({ setPage, setSelectedCar }) => {
  const { user, profile, t } = useAppContext();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    pendingApprovals: 0,
    featuredListings: 0,
    premiumListings: 0
  });
  const [listings, setListings] = useState<Car[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Users Management state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Settings state
  const { appConfig } = useAppContext();
  const [settingsValues, setSettingsValues] = useState({
    featured_price: '',
    premium_price: '',
    premium_enabled: true
  });
  
  useEffect(() => {
    setSettingsValues({
      featured_price: appConfig.featured_price?.toString() ?? '300',
      premium_price: appConfig.premium_price?.toString() ?? '600',
      premium_enabled: appConfig.premium_enabled !== false
    });
  }, [appConfig]);
  
  // Notification form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Action states
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [carToDelete, setCarToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToBan, setUserToBan] = useState<string | null>(null);

  const isAdmin = profile?.role?.toLowerCase() === 'admin' || user?.email === 'kaleabepherem@gmail.com' || user?.email === 'kaleabepherem98@gmail.com';

  useEffect(() => {
    if (!user || !isAdmin) return;

    const unsubscribers: (() => void)[] = [];

    // Real-time stats from Firestore
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(allUsers);
    }, (error) => {
      console.error('ERROR: Failed to fetch users count:', error);
    });
    unsubscribers.push(unsubUsers);

    setLoading(true);
    const unsubAllCars = onSnapshot(collection(db, 'cars'), (snapshot) => {
      const allCars = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Car[];
      
      // Sort client-side
      allCars.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      setListings(allCars);
      setLoading(false);

      setStats(prev => ({
        ...prev,
        totalListings: allCars.length,
        pendingApprovals: allCars.filter(c => c.status === 'pending' || c.status === 'pending_payment_verification').length,
        featuredListings: allCars.filter(c => c.packageType === 'featured').length,
        premiumListings: allCars.filter(c => c.packageType === 'premium').length
      }));
    }, (error) => {
      console.error('ERROR: Failed to fetch cars stats:', error);
      setLoading(false);
    });
    unsubscribers.push(unsubAllCars);

    // Listen for pending payments
    const qPayments = query(
      collection(db, 'payments'),
      where('status', '==', 'pending')
    );
    const unsubscribePayments = onSnapshot(qPayments, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingPayments(payments);
    }, (error) => {
      console.error('ERROR: Failed to fetch pending payments:', error);
    });
    unsubscribers.push(unsubscribePayments);

    return () => unsubscribers.forEach(u => u());
  }, [user, isAdmin]);

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    if (!user) return;
    if (!currentStatus) {
      setUserToBan(userId);
      return;
    }
    await executeToggleBan(userId, currentStatus);
  };

  const executeToggleBan = async (userId: string, currentStatus: boolean) => {
    setIsProcessing(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentStatus });
      showToast(`User ${!currentStatus ? 'banned' : 'unbanned'} successfully!`, 'success');
    } catch (error) {
      console.error('Error updating ban status:', error);
      showToast('Failed to update ban status', 'error');
    } finally {
      setIsProcessing(null);
      setUserToBan(null);
    }
  };

  const handleSoftDelete = async (userId: string) => {
    if (!user) return;
    setIsProcessing(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { isDeleted: true });
      showToast('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error soft-deleting user:', error);
      showToast('Failed to delete user', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsProcessing('settings');
    const featured_price = parseFloat(settingsValues.featured_price) || 0;
    const premium_price = parseFloat(settingsValues.premium_price) || 0;
    
    try {
      await setDoc(doc(db, 'settings', 'app_config'), {
        featured_price,
        premium_price,
        premium_enabled: settingsValues.premium_enabled
      }, { merge: true });
      showToast('Global settings updated dynamically!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to update app configuration', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateStatus = async (carId: string, newStatus: string) => {
    if (!user) return;
    setIsProcessing(carId);
    try {
      const carRef = doc(db, 'cars', carId);
      await updateDoc(carRef, { status: newStatus });
      setListings(prev => prev.map(c => c.id === carId ? { ...c, status: newStatus as any } : c));
      showToast(`Listing ${newStatus} successfully!`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update listing status', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleFeatured = async (carId: string, currentFeatured: boolean) => {
    if (!user) return;
    setIsProcessing(carId);
    try {
      const carRef = doc(db, 'cars', carId);
      await updateDoc(carRef, { featured: !currentFeatured });
      setListings(prev => prev.map(c => c.id === carId ? { ...c, featured: !currentFeatured } : c));
      showToast(`Listing ${!currentFeatured ? 'featured' : 'unfeatured'} successfully!`, 'success');
    } catch (error) {
      console.error('Error toggling featured:', error);
      showToast('Failed to toggle featured status', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteListing = async () => {
    if (!user || !carToDelete) return;
    setIsDeleting(true);
    setIsProcessing(carToDelete);
    
    // Optimistic UI update
    const deletedId = carToDelete;
    const prevListings = [...listings];
    setListings(prev => prev.filter(c => c.id !== deletedId));
    setCarToDelete(null);
    showToast('Listing deleted successfully', 'success');

    try {
      const idToken = await user.getIdToken();
      // Remove from R2 storage via API
      try {
        await apiFetch(`/api/listings?id=${encodeURIComponent(deletedId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        // Sync local Firestore cache
        try { await deleteDoc(doc(db, 'cars', deletedId)); } catch {}
      } catch {
        // Fallback to internal delete
        await deleteDoc(doc(db, 'cars', deletedId));
      }
      
      // Clear all session caches to instantly remove ghosts from frontend
      sessionStorage.removeItem('cachedFeaturedCars');
      sessionStorage.removeItem('cachedPremiumCars');
      sessionStorage.removeItem('cachedHomeCars');
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      // Revert optimistic update
      setListings(prevListings);
      showToast(`Failed to delete listing: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(null);
      setIsDeleting(false);
    }
  };

  const handleVerifyPayment = async (payment: any, status: 'verified' | 'rejected') => {
    if (!user) return;
    setIsProcessing(payment.id);
    try {
      const idToken = await user.getIdToken();
      
      const response = await apiFetch('/api/admin/verify-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: payment.id,
          listingId: payment.listingId,
          status
        })
      });

      if (!response.success) throw new Error(response.error || 'API failed');

      setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
      showToast(`Payment ${status} successfully!`, 'success');
    } catch (error) {
      console.error('Error verifying payment:', error);
      showToast('Failed to verify payment', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !notifTitle || !notifMessage) return;
    setIsSendingNotif(true);
    try {
      const idToken = await user.getIdToken();
      // Use backend API which has real FCM push notification logic
      const data = await apiFetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: notifTitle, message: notifMessage })
      });
      if (data.success) {
        const stats = data.stats;
        const detail = stats ? ` (${stats.delivered}/${stats.totalTokens} devices)` : '';
        showToast(`Notification sent successfully!${detail}`, 'success');
        setNotifTitle('');
        setNotifMessage('');
      } else {
        showToast(data.error || 'Failed to send notification', 'error');
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      showToast(`Failed to send notification: ${error.message}`, 'error');
    } finally {
      setIsSendingNotif(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center">
        <ShieldCheck size={64} className="text-zinc-200 mb-4" />
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 italic uppercase">Access Denied</h2>
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Only administrators can access this page.</p>
        <button 
          onClick={() => setPage('home')}
          className="mt-8 bg-brand text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand/20"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  const filteredListings = listings.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getScreenshotUrl = (url: string) => {
    if (!url) return '';
    // If the URL is already a full URL with the correct domain, return it
    const correctDomain = 'https://pub-241e6fed684d40058707e17c356ae538.r2.dev';
    if (url.startsWith(correctDomain)) return url;
    
    // If it's a relative path or has a different domain, try to fix it
    try {
      const urlObj = new URL(url);
      return `${correctDomain}${urlObj.pathname}`;
    } catch (e) {
      // If it's just a key/path
      return `${correctDomain}/${url.startsWith('/') ? url.substring(1) : url}`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white italic uppercase tracking-tight">
              Admin <span className="text-brand">Dashboard</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Management Console</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sticky top-0 z-10 bg-zinc-50/80 dark:bg-black/80 backdrop-blur-md -mx-4 px-4 py-2">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'listings', label: 'Listings', icon: CarIcon },
            { id: 'payments', label: 'Payments', icon: CreditCard, badge: pendingPayments.length },
            { id: 'notifications', label: 'Broadcast', icon: Bell },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                activeTab === tab.id 
                  ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.badge ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                  activeTab === tab.id ? 'bg-white text-brand' : 'bg-brand text-white'
                }`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <main className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                    <Users size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('admin.totalUsers')}</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.totalUsers}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
                    <CarIcon size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('admin.totalListings')}</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.totalListings}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                    <CreditCard size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('admin.pending')}</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.pendingApprovals}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                    <Star size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('admin.featured')}</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.featuredListings}</p>
                </div>
                <div className="col-span-2 bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('admin.premium')}</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.premiumListings}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Crown size={24} />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-brand p-6 rounded-[2rem] text-white shadow-xl shadow-brand/20 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-lg font-black uppercase italic mb-1">System Broadcast</h3>
                  <p className="text-[10px] font-bold opacity-80 mb-4 uppercase tracking-widest">Send a push notification to all users</p>
                  <button 
                    onClick={() => setActiveTab('notifications')}
                    className="bg-white text-brand px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                  >
                    Compose Message
                  </button>
                </div>
                <Bell size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filters & Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Search users by name, email or role..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand" /></div>
                ) : users
                    .filter(u => !u.isDeleted)
                    .filter(u => 
                      (u.displayName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                      (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.role || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                    ).length > 0 ? (
                  users
                    .filter(u => !u.isDeleted)
                    .filter(u => 
                      (u.displayName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                      (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.role || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                    )
                    .map(targetUser => (
                    <div key={targetUser.id} className={`bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border ${targetUser.isBanned ? 'border-red-200 dark:border-red-900/50 opacity-80' : 'border-zinc-100 dark:border-zinc-800'} shadow-sm`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
                            {targetUser.photoURL ? <img src={targetUser.photoURL} alt="" referrerPolicy="no-referrer" /> : <Users size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-zinc-900 dark:text-white truncate">{targetUser.displayName || 'Unknown User'}</h4>
                              {targetUser.role && (
                                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{targetUser.role}</span>
                              )}
                              {targetUser.isBanned && (
                                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-red-100 text-red-600">Banned</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 mt-0.5 truncate">{targetUser.email || targetUser.phoneNumber || 'No contact info'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                          <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest">Listings</span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">{listings.filter(c => c.ownerId === targetUser.id).length}</span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                          <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest">Joined</span>
                          <span className="text-[10px] font-black text-zinc-900 dark:text-white truncate">
                            {targetUser.createdAt?.toDate ? targetUser.createdAt.toDate().toLocaleDateString() : 'Date unknown'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                        <button
                          disabled={isProcessing === targetUser.id}
                          onClick={() => handleToggleBan(targetUser.id, !!targetUser.isBanned)}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm transition-all ${targetUser.isBanned ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-500/20'}`}
                        >
                           {isProcessing === targetUser.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} {targetUser.isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                        <button
                          disabled={isProcessing === targetUser.id}
                          onClick={() => handleSoftDelete(targetUser.id)}
                          className="px-4 py-3 text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all disabled:opacity-50 border border-red-100 dark:border-red-900/30 shrink-0"
                        >
                          {isProcessing === targetUser.id ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-300">
                      <Users size={24} />
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No users found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="space-y-4">
              {/* Filters & Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    id="admin-search-input"
                    name="adminSearch"
                    type="text"
                    placeholder="Search by title, brand, model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all shadow-sm"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {['all', 'approved', 'pending', 'sold', 'rejected', 'pending_payment_verification'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                        statusFilter === status 
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white' 
                          : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {status === 'pending_payment_verification' ? 'To Verify' : status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Listings List */}
              <div className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand" /></div>
                ) : filteredListings.length > 0 ? (
                  filteredListings.map((car) => (
                    <div key={car.id} className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex flex-col gap-4 shadow-sm">
                      <div className="flex gap-4">
                        <img 
                          src={car.imageURLs[0]} 
                          alt="" 
                          className="w-24 h-24 rounded-2xl object-cover cursor-pointer"
                          onClick={() => {
                            setSelectedCar(car);
                            setPage('detail');
                          }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              car.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                              car.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                            }`}>
                              {car.status}
                            </span>
                            {car.featured && (
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate mb-0.5">{car.title}</h4>
                          <p className="text-xs font-black text-brand mb-1">{car.price.toLocaleString()} ETB</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase truncate">Owner: {car.ownerName}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                        {car.status === 'pending' && (
                          <button 
                            disabled={isProcessing === car.id}
                            onClick={() => handleUpdateStatus(car.id, 'approved')}
                            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20"
                          >
                            {isProcessing === car.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Approve
                          </button>
                        )}
                        {car.status === 'approved' && (
                          <button 
                            disabled={isProcessing === car.id}
                            onClick={() => handleToggleFeatured(car.id, !!car.featured)}
                            className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 border ${
                              car.featured 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' 
                                : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'
                            }`}
                          >
                            {isProcessing === car.id ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />} {car.featured ? 'Featured' : 'Feature'}
                          </button>
                        )}
                        <button 
                          disabled={isProcessing === car.id}
                          onClick={() => setCarToDelete(car.id)}
                          className="p-2.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl"
                        >
                          {isProcessing === car.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No listings found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Verification Queue</h3>
                <span className="text-[10px] font-bold text-zinc-400">{pendingPayments.length} pending</span>
              </div>

              {pendingPayments.map((payment) => (
                <div key={payment.id} className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 space-y-4 shadow-sm">
                  <div className="flex gap-4">
                    <div className="relative shrink-0">
                      <img 
                        src={getScreenshotUrl(payment.screenshotURL)} 
                        alt="" 
                        className="w-24 h-24 rounded-2xl object-cover cursor-pointer border border-zinc-100 dark:border-zinc-800"
                        onClick={() => window.open(getScreenshotUrl(payment.screenshotURL), '_blank')}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-brand text-white p-1.5 rounded-lg shadow-lg">
                        <CreditCard size={14} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Package</p>
                        <p className="text-xs font-black text-zinc-900 dark:text-white uppercase">{payment.packageType}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Amount</p>
                        <p className="text-sm font-black text-brand">{payment.price.toLocaleString()} ETB</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-md inline-block">
                        <p className="text-[8px] font-bold text-zinc-500">{payment.paymentMethod}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      disabled={isProcessing === payment.id}
                      onClick={() => handleVerifyPayment(payment, 'verified')}
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isProcessing === payment.id ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Approve'}
                    </button>
                    <button
                      disabled={isProcessing === payment.id}
                      onClick={() => handleVerifyPayment(payment, 'rejected')}
                      className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              
              {pendingPayments.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                  <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-300">
                    <CheckCircle size={24} />
                  </div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">All caught up!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">Broadcast</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Push to all users</p>
                </div>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Title</label>
                    <input 
                      id="admin-notif-title"
                      name="notifTitle"
                      type="text" 
                      placeholder="e.g. New Features Available!"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Message</label>
                    <textarea 
                      id="admin-notif-message"
                      name="notifMessage"
                      placeholder="Enter your message here..."
                      rows={4}
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all resize-none"
                    />
                  </div>
                </div>

                <button 
                  disabled={isSendingNotif || !notifTitle || !notifMessage}
                  className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSendingNotif ? <Loader2 className="animate-spin" size={20} /> : <><Send size={16} /> Send Notification</>}
                </button>
              </form>
              
              <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                <p className="text-[9px] font-bold text-zinc-400 uppercase leading-relaxed">
                  <span className="text-brand font-black">Note:</span> Notifications are sent to the 'all_users' topic. Users must have granted permission and be subscribed to receive them.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">Dynamic Configuration</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Safely manage app behavior</p>
                </div>
              </div>

              <div className="space-y-6 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest">Pricing Controls</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Featured Price (ETB)</label>
                      <input 
                        type="number" 
                        value={settingsValues.featured_price}
                        onChange={(e) => setSettingsValues(prev => ({ ...prev, featured_price: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Premium Price (ETB)</label>
                      <input 
                        type="number" 
                        value={settingsValues.premium_price}
                        onChange={(e) => setSettingsValues(prev => ({ ...prev, premium_price: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-brand transition-all"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] font-bold text-brand uppercase mt-2 ml-2">Updates instantly across app</p>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
                  <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest">Features Toggle</h4>
                  
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 relative overflow-hidden group">
                    <div>
                      <h5 className="font-bold text-sm text-zinc-900 dark:text-white mb-0.5">Premium Badge UI</h5>
                      <p className="text-[10px] font-bold text-zinc-500 max-w-[80%] leading-relaxed">Turn OFF to globally hide the Premium badge across the entire platform. Data and logic won't be deleted, only visibility.</p>
                    </div>
                    <button 
                      onClick={() => setSettingsValues(prev => ({ ...prev, premium_enabled: !prev.premium_enabled }))}
                      className={`relative w-14 h-8 rounded-full transition-colors flex items-center shadow-inner shrink-0 ${settingsValues.premium_enabled ? 'bg-brand' : 'bg-red-500'}`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white transition-all shadow-md transform ${settingsValues.premium_enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                    {!settingsValues.premium_enabled && <div className="absolute inset-y-0 right-0 w-1 bg-red-500" />}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  disabled={isProcessing === 'settings'}
                  onClick={handleSaveSettings}
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:bg-black dark:hover:bg-zinc-200"
                >
                  {isProcessing === 'settings' ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={16} /> Save Active Configuration</>}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Ban Confirmation Modal */}
      {userToBan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
              <Ban size={32} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white text-center mb-2 tracking-tight">Are you sure you want to ban this user?</h3>
            <div className="flex flex-col gap-3 mt-8">
              <button 
                onClick={() => executeToggleBan(userToBan, false)}
                disabled={isProcessing === userToBan}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex justify-center items-center"
              >
                {isProcessing === userToBan ? <Loader2 className="animate-spin" size={20} /> : 'Confirm'}
              </button>
              <button 
                onClick={() => setUserToBan(null)}
                disabled={isProcessing === userToBan}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {carToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white text-center mb-2 tracking-tight">Delete Listing?</h3>
            <p className="text-zinc-500 text-center mb-8 font-medium">
              This action is permanent and cannot be undone. All images and data associated with this listing will be removed.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteListing}
                disabled={isDeleting}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Yes, Delete Permanently'}
              </button>
              <button 
                onClick={() => setCarToDelete(null)}
                disabled={isDeleting}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
