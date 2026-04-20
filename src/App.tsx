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
import { OnboardingModal } from './components/OnboardingModal';

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
const PremiumListings = React.lazy(() => import('./pages/PremiumListings').then(m => ({ default: m.PremiumListings })));
const MenuPage = React.lazy(() => import('./pages/Menu').then(m => ({ default: m.Menu })));


export default function App() {
  const [currentPage, _setCurrentPage] = React.useState<Page>('home');
  const [history, setHistory] = React.useState<Page[]>(['home']);
  const historyRef = React.useRef(history);
  React.useEffect(() => { historyRef.current = history; }, [history]);

  const backPressCount = React.useRef(0);
  const { showToast } = useToast();

  // Tab / Root pages — switching between these REPLACES history (no stacking)
  const TAB_PAGES: Page[] = ['home', 'browse', 'chat', 'dashboard'];

  const setCurrentPage = React.useCallback((page: Page) => {
    // Menu toggle behavior
    if (page === 'menu' && currentPage === 'menu') {
      const newHistory = [...history];
      newHistory.pop();
      const backTo = newHistory[newHistory.length - 1] || 'home';
      setHistory(newHistory);
      _setCurrentPage(backTo);
      return;
    }

    if (TAB_PAGES.includes(page)) {
      // Switching to a tab: REPLACE history (not push)
      // Home is the absolute root; other tabs sit one level above Home
      if (page === 'home') {
        setHistory(['home']);
      } else {
        setHistory(['home', page]);
      }
    } else {
      // Inner page: PUSH onto current history stack
      setHistory(prev => {
        if (prev[prev.length - 1] === page) return prev;
        return [...prev, page];
      });
    }
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
        // 0. Close fullscreen image viewer if open (stays on detail page)
        if (typeof (window as any).__closeDetailViewer === 'function') {
          (window as any).__closeDetailViewer();
          return;
        }

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

        // 3. On Home with no deeper history → double-press to exit
        if (page === 'home') {
          backPressCount.current += 1;
          if (backPressCount.current >= 2) {
            App.exitApp();
          } else {
            showToast('Press back again to exit', 'info');
            setTimeout(() => { backPressCount.current = 0; }, 2000);
          }
          return;
        }

        // 4. On a non-Home tab → go to Home (not previous history)
        if (TAB_PAGES.includes(page)) {
          setHistory(['home']);
          _setCurrentPage('home');
          backPressCount.current = 0;
          return;
        }

        // 5. On an inner page → pop back in history
        if (h.length > 1) {
          const newHistory = h.slice(0, -1);
          const backTo = newHistory[newHistory.length - 1] || 'home';
          setHistory(newHistory);
          _setCurrentPage(backTo);
          backPressCount.current = 0;
        } else {
          // Fallback: go Home
          setHistory(['home']);
          _setCurrentPage('home');
          backPressCount.current = 0;
        }
      });

      listener.then(l => { cleanup = () => l.remove(); });
    }).catch(() => {});

    return () => { cleanup?.(); };
  }, []);

  // Handle push notification tapping (navigation)
  React.useEffect(() => {
    const handler = (e: Event) => {
      const { chatId } = (e as CustomEvent).detail;
      if (chatId) {
        _setCurrentPage('chat');
        setActiveChatId(chatId);
      }
    };
    window.addEventListener('app-notification-action', handler);
    return () => window.removeEventListener('app-notification-action', handler);
  }, []);





  // Auth Guard & Optional First-Launch Prompt
  const promptShownRef = React.useRef(false);
  const redirectingRef = React.useRef(false);
  
  React.useEffect(() => {
    if (loading) return;
    if (redirectingRef.current) return;
    
    if (!user) {
      const protectedPages: Page[] = ['post', 'dashboard', 'chat', 'payment'];
      
      if (protectedPages.includes(currentPage)) {
        // Block restricted pages
        redirectingRef.current = true;
        sessionStorage.setItem('redirectAfterLogin', currentPage);
        setAuthModalOpen(true);
        if (currentPage !== 'home') setCurrentPage('home');
        setTimeout(() => { redirectingRef.current = false; }, 200);
      } else if (!promptShownRef.current) {
        // Optional auth prompt on first app launch
        promptShownRef.current = true;
        setAuthModalOpen(true);
      }
    }
  }, [currentPage, user, loading]);

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
      case 'premiumListings':
        return <PremiumListings setPage={setCurrentPage} setSelectedCar={setSelectedCar} />;
      default:
        return <Home setPage={setCurrentPage} setSelectedCar={setSelectedCar} onSearch={handleSearch} />;
    }
  };

  const isChatActive = currentPage === 'chat' && activeChatId;
  const isBottomNavHidden = isChatActive || currentPage === 'post';
  const hideHeaderOnMobile = currentPage !== 'dashboard';

  return (
    <div 
      className={`w-full max-w-full min-h-[100dvh] bg-[#FDFDFD] dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-500`}
      style={{ 
        overscrollBehavior: 'none',
        touchAction: 'pan-y',
        paddingBottom: isChatActive 
          ? 'env(safe-area-inset-bottom)' 
          : isBottomNavHidden 
            ? 'max(env(safe-area-inset-bottom), 48px)' 
            : 'calc(5rem + max(env(safe-area-inset-bottom), 48px))'
      }}
    >
      <NetworkStatus />
      <div className={hideHeaderOnMobile ? 'hidden md:block' : ''}>
        <Header currentPage={currentPage} setPage={setCurrentPage} />
      </div>
      
      {/* Global Status Bar Protector: Strictly prevents scrolling text/UI from rendering under the system clock on non-Home pages */}
      {hideHeaderOnMobile && currentPage !== 'home' && !(currentPage === 'chat' && activeChatId) && (
        <div 
          className="fixed top-0 inset-x-0 z-[120] bg-[#FDFDFD] dark:bg-zinc-950 md:hidden" 
          style={{ height: 'var(--safe-area-top)' }} 
        />
      )}

      <style>{`
        .safe-padding-main {
          padding-top: var(--safe-area-top);
        }
        @media (min-width: 768px) {
          .safe-padding-main, .safe-padding-home {
            padding-top: var(--header-h) !important;
          }
        }
      `}</style>
      <main 
        className={
          currentPage === 'chat' && activeChatId 
            ? 'h-[100dvh]' 
            : (hideHeaderOnMobile 
                ? (currentPage === 'home' ? 'safe-padding-home' : 'safe-padding-main') 
                : '')
        }
        style={!hideHeaderOnMobile ? { paddingTop: 'var(--header-h)' } : undefined}
      >
        <PullToRefresh disabled={currentPage !== 'home'}>
            <React.Suspense fallback={
              <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-brand" size={32} />
              </div>
            }>
              {renderPage()}
            </React.Suspense>
        </PullToRefresh>
      </main>


      <div className={(currentPage === 'chat' && activeChatId) || currentPage === 'post' ? 'hidden md:block' : ''}>
        <BottomNav currentPage={currentPage} setPage={setCurrentPage} />
      </div>

      <OnboardingModal />

      {isAuthModalOpen && (
        <React.Suspense fallback={null}>
          <Auth setPage={setCurrentPage} />
        </React.Suspense>
      )}
    </div>
  );
}
