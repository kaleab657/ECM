import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { NetworkStatus } from './components/NetworkStatus';
import { Page, Car } from './types';
import { useAppContext } from './context/AppContext';
import { Loader2 } from 'lucide-react';
import { useToast } from './components/Toast';
import { PullToRefresh } from './components/PullToRefresh';

// Lazy load non-critical pages
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
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
  const historyRef = React.useRef(history);
  React.useEffect(() => { historyRef.current = history; }, [history]);

  const backPressCount = React.useRef(0);
  const { showToast } = useToast();

  // Root pages — pressing back from any of these should trigger "press again to exit"
  const ROOT_PAGES: Page[] = ['home', 'browse', 'chat', 'dashboard'];

  const setCurrentPage = React.useCallback((page: Page) => {
    if (page === 'menu' && currentPage === 'menu') {
      const newHistory = [...history];
      newHistory.pop();
      const backTo = newHistory[newHistory.length - 1] || 'home';
      setHistory(newHistory);
      _setCurrentPage(backTo);
      return;
    }
    setHistory(prev => {
      if (prev[prev.length - 1] === page) return prev;
      return [...prev, page];
    });
    _setCurrentPage(page);
  }, [currentPage, history]);

  const [selectedCar, setSelectedCar] = React.useState<Car | null>(null);
  const [initialFilters, setInitialFilters] = React.useState<any>(null);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const activeChatIdRef = React.useRef<string | null>(null);
  React.useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  const currentPageRef = React.useRef<Page>('home');
  React.useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  const [pendingListingId, setPendingListingId] = React.useState<string | null>(null);
  const { loading, user, isAuthModalOpen, setAuthModalOpen } = useAppContext();

  // Ref to track auth modal state inside the backButton listener (avoids stale closure)
  const authModalRef = React.useRef(isAuthModalOpen);
  React.useEffect(() => { authModalRef.current = isAuthModalOpen; }, [isAuthModalOpen]);

  // Hardware back button listener — registers once, reads fresh state via refs
  React.useEffect(() => {
    let cleanup: (() => void) | undefined;

    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('backButton', () => {
        // 1. Close auth modal first if open
        if (authModalRef.current) {
          setAuthModalOpen(false);
          return;
        }

        // 2. If inside a chat conversation, go back to chat list first
        if (activeChatIdRef.current) {
          setActiveChatId(null);
          backPressCount.current = 0;
          return;
        }

        const h = historyRef.current;
        const page = currentPageRef.current;

        // 3. If on a root page, double-press to exit
        if (ROOT_PAGES.includes(page) && h.length <= 1) {
          backPressCount.current += 1;
          if (backPressCount.current >= 2) {
            App.exitApp();
          } else {
            showToast('Press back again to exit', 'info');
            setTimeout(() => { backPressCount.current = 0; }, 2000);
          }
          return;
        }

        // 4. Navigate back in history
        if (h.length > 1) {
          const newHistory = h.slice(0, -1);
          const backTo = newHistory[newHistory.length - 1] || 'home';
          setHistory(newHistory);
          _setCurrentPage(backTo);
          backPressCount.current = 0;
        } else {
          backPressCount.current += 1;
          if (backPressCount.current >= 2) {
            App.exitApp();
          } else {
            showToast('Press back again to exit', 'info');
            setTimeout(() => { backPressCount.current = 0; }, 2000);
          }
        }
      });

      listener.then(l => { cleanup = () => l.remove(); });
    }).catch(() => {});

    return () => { cleanup?.(); };
  }, []);





  // Global Auth Guard — forces auth modal instantly on launch if not logged in
  const redirectingRef = React.useRef(false);
  React.useEffect(() => {
    if (loading) return;
    
    if (!user) {
      if (!isAuthModalOpen) {
        setAuthModalOpen(true);
      }
    } else {
      // Secondary route guard if user manually logs out while on protected page
      const protectedPages: Page[] = ['post', 'dashboard', 'chat', 'payment'];
      if (protectedPages.includes(currentPage)) {
        // Safe to stay, they are logged in
      }
    }
  }, [currentPage, user, loading, isAuthModalOpen]);

  // Scroll to top on page change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);



  const handleSearch = React.useCallback((filters: any) => {
    setInitialFilters(filters);
    setCurrentPage('browse');
  }, [setCurrentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="animate-spin text-brand" size={48} />
      </div>
    );
  }

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
        return <AboutUs />;
      case 'support':
        return <Support setPage={setCurrentPage} />;
      case 'language':
        return <Language />;
      case 'saved':
        return <SavedCars setPage={setCurrentPage} setSelectedCar={setSelectedCar} />;
      case 'featuredListings':
        return <FeaturedListings setPage={setCurrentPage} setSelectedCar={setSelectedCar} />;
      default:
        return <Home setPage={setCurrentPage} setSelectedCar={setSelectedCar} onSearch={handleSearch} />;
    }
  };

  return (
    <div className={`min-h-[100dvh] bg-[#FDFDFD] dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-brand/10 selection:text-brand transition-colors duration-500 ${currentPage === 'chat' && activeChatId ? '' : 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0'}`}>
      <NetworkStatus />
      {user ? (
        <>
          <div className={currentPage === 'chat' && activeChatId ? 'hidden md:block' : ''}>
            <Header currentPage={currentPage} setPage={setCurrentPage} />
          </div>
          
          <main className={currentPage === 'chat' && activeChatId ? 'h-[100dvh]' : ''} style={currentPage === 'chat' && activeChatId ? undefined : { paddingTop: 'var(--header-h)' }}>
            <PullToRefresh disabled={currentPage === 'menu' || currentPage === 'chat'}>
                <React.Suspense fallback={
                  <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="animate-spin text-brand" size={32} />
                  </div>
                }>
                  {renderPage()}
                </React.Suspense>
            </PullToRefresh>
          </main>

          {currentPage === 'dashboard' && <Footer setPage={setCurrentPage} />}
          <div className={currentPage === 'chat' && activeChatId ? 'hidden md:block' : ''}>
            <BottomNav currentPage={currentPage} setPage={setCurrentPage} />
          </div>
        </>
      ) : (
        <div className="flex h-[100dvh] items-center justify-center w-full">
          <div className="w-16 h-16 opacity-10 animate-pulse rounded-full bg-brand"></div>
        </div>
      )}

      {isAuthModalOpen && (
        <React.Suspense fallback={null}>
          <Auth setPage={setCurrentPage} />
        </React.Suspense>
      )}
    </div>
  );
}
