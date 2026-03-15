import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { NetworkStatus } from './components/NetworkStatus';
import { Home } from './pages/Home';
import { Page, Car } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from './context/AppContext';
import { Loader2 } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { useToast } from './components/Toast';
import { initPushNotifications, removePushListeners, associateTokenWithUser } from './lib/push-notifications';
import { PullToRefresh } from './components/PullToRefresh';

// Lazy load non-critical pages
const Browse = React.lazy(() => import('./pages/Browse').then(m => ({ default: m.Browse })));
const Detail = React.lazy(() => import('./pages/Detail').then(m => ({ default: m.Detail })));
const PostCar = React.lazy(() => import('./pages/PostCar').then(m => ({ default: m.PostCar })));
const Auth = React.lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Valuation = React.lazy(() => import('./pages/Valuation').then(m => ({ default: m.Valuation })));
const Dealerships = React.lazy(() => import('./pages/Dealerships').then(m => ({ default: m.Dealerships })));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter').then(m => ({ default: m.HelpCenter })));
const SafetyGuidelines = React.lazy(() => import('./pages/SafetyGuidelines').then(m => ({ default: m.SafetyGuidelines })));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfUse = React.lazy(() => import('./pages/TermsOfUse').then(m => ({ default: m.TermsOfUse })));
const ContactUs = React.lazy(() => import('./pages/ContactUs').then(m => ({ default: m.ContactUs })));
const Chat = React.lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Payment = React.lazy(() => import('./pages/Payment').then(m => ({ default: m.Payment })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const AboutUs = React.lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUs })));
const Support = React.lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));
const Language = React.lazy(() => import('./pages/Language').then(m => ({ default: m.Language })));
const SavedCars = React.lazy(() => import('./pages/SavedCars').then(m => ({ default: m.SavedCars })));
const FeaturedListings = React.lazy(() => import('./pages/FeaturedListings').then(m => ({ default: m.FeaturedListings })));
const MenuPage = React.lazy(() => import('./pages/Menu').then(m => ({ default: m.Menu })));


export default function App() {
  const [currentPage, _setCurrentPage] = React.useState<Page>('home');
  const [history, setHistory] = React.useState<Page[]>(['home']);
  const backPressCount = React.useRef(0);
  const { showToast } = useToast();

  const setCurrentPage = React.useCallback((page: Page) => {
    setHistory(prev => {
      if (prev[prev.length - 1] === page) return prev;
      return [...prev, page];
    });
    _setCurrentPage(page);
  }, []);

  const [selectedCar, setSelectedCar] = React.useState<Car | null>(null);
  const [initialFilters, setInitialFilters] = React.useState<any>(null);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [pendingListingId, setPendingListingId] = React.useState<string | null>(null);
  const { loading, user, isAuthModalOpen, setAuthModalOpen } = useAppContext();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Ref to track auth modal state inside the backButton listener (avoids stale closure)
  const authModalRef = React.useRef(isAuthModalOpen);
  React.useEffect(() => { authModalRef.current = isAuthModalOpen; }, [isAuthModalOpen]);

  // Hardware Back Button specific for Capacitor
  React.useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', () => {
      // If auth bottom sheet is open, close it first — don't navigate
      if (authModalRef.current) {
        setAuthModalOpen(false);
        return;
      }

      setHistory(prev => {
        const current = prev[prev.length - 1];
        if (current === 'home') {
          if (backPressCount.current === 0) {
            backPressCount.current = 1;
            showToast('Press back again to exit', 'info');
            setTimeout(() => {
              backPressCount.current = 0;
            }, 2000);
          } else {
            CapacitorApp.exitApp();
          }
          return prev;
        } else {
          // Navigate to previous page in history
          if (prev.length > 1) {
            const newHistory = [...prev];
            newHistory.pop(); // Remove current
            const previousPage = newHistory[newHistory.length - 1];
            _setCurrentPage(previousPage);
            return newHistory;
          } else {
            // Fallback
            _setCurrentPage('home');
            return ['home'];
          }
        }
      });
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [showToast, setAuthModalOpen]);

  // Initialize Push Notifications on first app launch
  React.useEffect(() => {
    const handleNotificationTap = (data: any) => {
      // Navigate based on notification type
      if (data.type === 'chat' && data.chatId) {
        setActiveChatId(data.chatId);
        setCurrentPage('chat');
      } else if (data.type === 'listing' && data.listingId) {
        setCurrentPage('browse');
      } else if (data.type === 'announcement') {
        setCurrentPage('home');
      }
    };

    initPushNotifications(handleNotificationTap);

    return () => {
      removePushListeners();
    };
  }, []);

  // Re-associate FCM token when user logs in
  React.useEffect(() => {
    if (user) {
      associateTokenWithUser(user.uid);
    }
  }, [user]);

  // Auth Guard for protected pages
  React.useEffect(() => {
    if (loading || isRedirecting) return;

    const protectedPages: Page[] = ['post', 'dashboard', 'chat', 'payment'];
    if (protectedPages.includes(currentPage) && !user) {
      sessionStorage.setItem('redirectAfterLogin', currentPage);
      setIsRedirecting(true);
      setAuthModalOpen(true);
      // If they were trying to access a protected page, maybe we send them 'home' underneath until they auth
      if (currentPage !== 'home') {
         setCurrentPage('home');
      }
      setTimeout(() => setIsRedirecting(false), 100);
    }
  }, [currentPage, user, loading, isRedirecting]);

  // Scroll to top on page change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Hide splash screen when context is loaded
  React.useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        SplashScreen.hide().catch(() => {});
      }, 500); // Give it a slight moment to ensure visual DOM is ready
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="animate-spin text-brand" size={48} />
      </div>
    );
  }

  const handleSearch = (filters: any) => {
    setInitialFilters(filters);
    setCurrentPage('browse');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home setPage={setCurrentPage} setSelectedCar={setSelectedCar} onSearch={handleSearch} />;
      case 'browse':
        return <Browse setPage={setCurrentPage} setSelectedCar={setSelectedCar} initialFilters={initialFilters} />;
      case 'menu':
        return <MenuPage setPage={setCurrentPage} />;
      case 'detail':
        return selectedCar ? (
          <Detail car={selectedCar} setPage={setCurrentPage} setActiveChatId={setActiveChatId} setSelectedCar={setSelectedCar} />
        ) : (
          <Home setPage={setCurrentPage} setSelectedCar={setSelectedCar} onSearch={handleSearch} />
        );
      case 'post':
        return <PostCar setPage={setCurrentPage} setPendingListingId={setPendingListingId} />;
      case 'dashboard':
        return <Dashboard setPage={setCurrentPage} />;
      case 'valuation':
        return <Valuation />;
      case 'dealerships':
        return <Dealerships />;
      case 'help':
        return <HelpCenter />;
      case 'safety':
        return <SafetyGuidelines />;
      case 'privacy':
        return <PrivacyPolicy />;
      case 'terms':
        return <TermsOfUse />;
      case 'contact':
        return <ContactUs />;
      case 'chat':
        return <Chat initialChatId={activeChatId} onChatChange={setActiveChatId} />;
      case 'payment':
        return <Payment listingId={pendingListingId} setPage={setCurrentPage} />;
      case 'admin':
        return <Admin setPage={setCurrentPage} setSelectedCar={setSelectedCar} />;
      case 'about':
        return <AboutUs setPage={setCurrentPage} />;
      case 'support':
        return <Support setPage={setCurrentPage} />;
      case 'language':
        return <Language setPage={setCurrentPage} />;
      case 'saved':
        return <SavedCars setPage={setCurrentPage} setSelectedCar={setSelectedCar} />;
      case 'featuredListings':
        return <FeaturedListings setPage={setCurrentPage} setSelectedCar={setSelectedCar} />;
      default:
        return <Home setPage={setCurrentPage} setSelectedCar={setSelectedCar} onSearch={handleSearch} />;
    }
  };

  return (
    <div className={`min-h-[100dvh] bg-[#FDFDFD] dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-brand/10 selection:text-brand transition-colors duration-500 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0`}>
      <NetworkStatus />
      <Header currentPage={currentPage} setPage={setCurrentPage} />
      
      <main>
        <PullToRefresh disabled={currentPage === 'menu' || currentPage === 'chat'}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <React.Suspense fallback={
                <div className="min-h-[60vh] flex items-center justify-center">
                  <Loader2 className="animate-spin text-brand" size={32} />
                </div>
              }>
                {renderPage()}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>
      </main>

      {currentPage === 'dashboard' && <Footer setPage={setCurrentPage} />}
      <BottomNav currentPage={currentPage} setPage={setCurrentPage} />

      <AnimatePresence>
        {isAuthModalOpen && (
          <React.Suspense fallback={null}>
            <Auth setPage={setCurrentPage} />
          </React.Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
