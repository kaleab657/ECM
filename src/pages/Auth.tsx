import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Chrome, Apple, AlertCircle, Loader2, CheckCircle2, Phone, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, getCountFromServer, increment } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { SELLER_TYPES } from '../constants';
import { Page } from '../types';

interface AuthProps {
  setPage: (page: Page) => void;
}

export const Auth: React.FC<AuthProps> = ({ setPage }) => {
  const { t, user } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sellerType, setSellerType] = useState(SELLER_TYPES[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [stats, setStats] = useState({ listings: 0, users: 0 });

  // Fetch real stats
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try to get stats from the global stats document first (most efficient and avoids permission issues)
        const statsDoc = await getDoc(doc(db, 'stats', 'global'));
        if (statsDoc.exists()) {
          const data = statsDoc.data();
          setStats({
            listings: data.listingsCount || 0,
            users: data.usersCount || 0
          });
          return;
        }

        // Fallback to direct counting if stats doc doesn't exist (only works for public collections)
        const listingsColl = collection(db, 'cars');
        const listingsCount = await getCountFromServer(listingsColl);
        
        setStats({
          listings: listingsCount.data().count,
          users: 1000 // Fallback for users since we can't list them publicly
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        // Final fallback
        setStats({ listings: 500, users: 1000 });
      }
    };
    fetchStats();
  }, []);

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (user && !isLoading) {
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
      sessionStorage.removeItem('redirectAfterLogin');
      setPage(redirectTo as any);
    }
  }, [user, isLoading, setPage]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Anonymous',
          createdAt: serverTimestamp(),
          phoneNumber: '', // Will be prompted to add in dashboard if needed
          sellerType: SELLER_TYPES[0] // Default for Google sign-in
        });

        // Increment global user count
        await setDoc(doc(db, 'stats', 'global'), {
          usersCount: increment(1)
        }, { merge: true });
      }
      
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
      sessionStorage.removeItem('redirectAfterLogin');
      setPage(redirectTo as any);
    } catch (err: any) {
      let errorMessage = err.message || 'An error occurred during Google Sign-in';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!isLogin && password !== confirmPassword) {
      setError(t('auth.passwordsMatch') || 'Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !fullName.trim()) {
      setError(t('auth.fullNameRequired') || 'Full name is required');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !phoneNumber.trim()) {
      setError(t('auth.phoneRequired') || 'Phone number is required');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !/^\+?[0-9]{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
      setError(t('auth.validPhoneRequired') || 'Please enter a valid phone number');
      setIsLoading(false);
      return;
    }
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: email,
          displayName: fullName,
          phoneNumber: phoneNumber,
          sellerType: sellerType,
          createdAt: serverTimestamp(),
        });

        // Increment global user count
        await setDoc(doc(db, 'stats', 'global'), {
          usersCount: increment(1)
        }, { merge: true });
      }
      
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
      sessionStorage.removeItem('redirectAfterLogin');
      setPage(redirectTo as any);
    } catch (err: any) {
      let errorMessage = err.message || t('auth.authError') || 'An error occurred during authentication';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-6">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="flex justify-center">
            <Logo />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand/5 p-8 rounded-3xl border border-brand/10"
          >
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-brand" size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-4">{t('auth.verifyEmail') || 'Verify your email'}</h2>
            <p className="text-zinc-500 font-medium leading-relaxed">
              {t('auth.verificationSent') || 'We have sent you a verification email to'} <span className="text-brand font-bold">{registeredEmail}</span>. {t('auth.pleaseVerify') || 'Please verify it and log in.'}
            </p>
          </motion.div>
          <button
            onClick={() => {
              setShowVerification(false);
              setIsLogin(true);
              setEmail('');
              setPassword('');
            }}
            className="w-full btn-primary py-5 text-lg shadow-xl shadow-brand/20"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-zinc-950 transition-colors duration-500">
      {/* Brand Section - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-950 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80" 
            alt="Auth background"
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center mb-8"
          >
            <Logo className="scale-150" />
          </motion.div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-6 leading-tight">
            {t('auth.heroTitle') || 'THE FUTURE OF CAR TRADING IN ETHIOPIA'}
          </h1>
          <p className="text-zinc-400 text-lg font-medium leading-relaxed">
            {t('auth.heroDesc') || 'Join thousands of buyers and sellers on the most trusted automotive marketplace.'}
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { label: stats.listings.toLocaleString(), sub: t('auth.listings') || 'Listings' },
              { label: stats.users.toLocaleString(), sub: t('auth.users') || 'Users' },
              { label: '24/7', sub: t('auth.support') || 'Support' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-black text-white">{stat.label}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20 overflow-y-auto">
        <div className="w-full max-w-md py-10">
          <div className="mb-10 text-center md:text-left">
            <div className="md:hidden flex justify-center mb-6">
              <Logo />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
              {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
            </h2>
            <p className="text-zinc-500 font-medium">
              {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="auth-signup-fullname" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">{t('profile.labels.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                    <input 
                      id="auth-signup-fullname"
                      name="fullname"
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      autoComplete="name"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="auth-signup-phone" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">{t('profile.labels.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                    <input 
                      id="auth-signup-phone"
                      name="phone"
                      type="tel" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+251 912 345 678"
                      autoComplete="tel"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="auth-signup-seller-type" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">{t('auth.sellerType') || 'Seller Type'}</label>
                  <div className="relative">
                    <select 
                      id="auth-signup-seller-type"
                      name="sellerType"
                      value={sellerType}
                      onChange={(e) => setSellerType(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white appearance-none cursor-pointer"
                    >
                      {SELLER_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" size={18} />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">{t('profile.labels.email')}</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                <input 
                  id="auth-email"
                  name="email"
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-4">
                <label htmlFor="auth-password" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('auth.password') || 'Password'}</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                <input 
                  id="auth-password"
                  name="password"
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="auth-signup-confirm-password" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">{t('auth.confirmPassword') || 'Confirm Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                  <input 
                    id="auth-signup-confirm-password"
                    name="confirmPassword"
                    required
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
                  />
                </div>
              </div>
            )}

            <button 
              disabled={isLoading}
              className="w-full btn-primary py-5 text-lg shadow-xl shadow-brand/20 disabled:opacity-70 disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  {isLogin ? t('auth.signInBtn') : t('auth.signUpBtn')}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>


          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
              </div>
              <span className="relative px-4 bg-white dark:bg-zinc-950 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('auth.continueWith') || 'Or continue with'}</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all font-bold text-sm text-zinc-700 dark:text-zinc-200 shadow-sm disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t('auth.googleSignIn') || 'Continue with Google'}
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm font-bold text-zinc-500">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-brand hover:underline"
            >
              {isLogin ? t('auth.signUpLink') : t('auth.signInLink')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
