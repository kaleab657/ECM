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
  Send
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
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
    featuredListings: 0
  });
  const [listings, setListings] = useState<Car[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Notification form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Action states
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [carToDelete, setCarToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = profile?.role?.toLowerCase() === 'admin' || user?.email === 'kaleabepherem@gmail.com' || user?.email === 'kaleabepherem98@gmail.com';

  useEffect(() => {
    if (!user || !isAdmin) return;

    const unsubscribers: (() => void)[] = [];

    // Real-time stats from Firestore
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    }, (error) => {
      console.error('ERROR: Failed to fetch users count:', error);
    });
    unsubscribers.push(unsubUsers);

    const unsubAllCars = onSnapshot(collection(db, 'cars'), (snapshot) => {
      const allCars = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Car[];
      setStats(prev => ({
        ...prev,
        totalListings: allCars.length,
        pendingApprovals: allCars.filter(c => c.status === 'pending' || c.status === 'pending_payment_verification').length,
        featuredListings: allCars.filter(c => c.featured).length
      }));
    }, (error) => {
      console.error('ERROR: Failed to fetch cars stats:', error);
    });
    unsubscribers.push(unsubAllCars);

    // Fetch listings (with optional status filter) from Firestore
    const fetchListings = () => {
      setLoading(true);
      let q;
      if (statusFilter === 'all') {
        q = query(collection(db, 'cars'), orderBy('createdAt', 'desc'), limit(100));
      } else {
        q = query(collection(db, 'cars'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(100));
      }
      const unsubListings = onSnapshot(q, (snapshot) => {
        const cars = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Car[];
        setListings(cars);
        setLoading(false);
      }, (error) => {
        console.error('ERROR: Failed to fetch admin listings:', error);
        // Fallback: try without ordering if composite index is missing
        const fallbackQ = statusFilter === 'all'
          ? query(collection(db, 'cars'), limit(100))
          : query(collection(db, 'cars'), where('status', '==', statusFilter), limit(100));
        onSnapshot(fallbackQ, (snapshot) => {
          const cars = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Car[];
          // Sort client-side
          cars.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          setListings(cars);
          setLoading(false);
        }, (fallbackError) => {
          console.error('ERROR: Fallback listings query also failed:', fallbackError);
          setLoading(false);
        });
      });
      unsubscribers.push(unsubListings);
    };

    fetchListings();

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
  }, [user, isAdmin, statusFilter]);

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
    try {
      const carRef = doc(db, 'cars', carToDelete);
      await deleteDoc(carRef);
      setListings(prev => prev.filter(c => c.id !== carToDelete));
      showToast('Listing deleted successfully', 'success');
      setCarToDelete(null);
    } catch (error) {
      console.error('Error deleting listing:', error);
      showToast('Failed to delete listing', 'error');
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

  const filteredListings = listings.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            { id: 'listings', label: 'Listings', icon: CarIcon },
            { id: 'payments', label: 'Payments', icon: CreditCard, badge: pendingPayments.length },
            { id: 'notifications', label: 'Broadcast', icon: Bell },
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
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Users</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.totalUsers}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
                    <CarIcon size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Listings</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.totalListings}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                    <CreditCard size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Pending</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.pendingApprovals}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                    <Star size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Featured</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.featuredListings}</p>
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
        </main>
      </div>

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
