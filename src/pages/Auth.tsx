import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2, CheckCircle2, Phone, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, getCountFromServer, increment } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { SELLER_TYPES } from '../constants';
import { Page } from '../types';

interface AuthProps {
  setPage: (page: Page) => void;
}

// Map Firebase error codes to user-friendly messages
function getAuthErrorMessage(error: any, t: (key: string) => string): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
      return t('auth.invalidCredential') || 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/user-not-found':
      return t('auth.userNotFound') || 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return t('auth.wrongPassword') || 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return t('auth.emailInUse') || 'This email is already registered. Please log in instead.';
    case 'auth/weak-password':
      return t('auth.weakPassword') || 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return t('auth.invalidEmail') || 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return t('auth.tooManyRequests') || 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return t('auth.networkError') || 'Network error. Please check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return t('auth.popupClosed') || 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return t('auth.popupBlocked') || 'Sign-in popup was blocked. Redirecting instead...';
    case 'auth/cancelled-popup-request':
      return 'A sign-in request is already in progress. Please wait.';
    case 'auth/redirect-cancelled-by-user':
      return 'Sign-in was cancelled. Please try again.';
    default:
      return error?.message || t('auth.authError') || 'An error occurred. Please try again.';
  }
}

/** After a successful Google sign-in, ensure user doc exists in Firestore */
async function ensureUserDocument(user: any) {
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Anonymous',
      createdAt: serverTimestamp(),
      phoneNumber: '',
      sellerType: SELLER_TYPES[0]
    });
    await setDoc(doc(db, 'stats', 'global'), {
      usersCount: increment(1)
    }, { merge: true });
  }
}

export const Auth: React.FC<AuthProps> = ({ setPage }) => {
  const { t, user, setAuthModalOpen } = useAppContext();
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
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (user && !isLoading) {
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
      sessionStorage.removeItem('redirectAfterLogin');
      setPage(redirectTo as any);
      setAuthModalOpen(false);
    }
  }, [user, isLoading, setPage, setAuthModalOpen]);


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      // Web browser — try popup first
      try {
        const result = await signInWithPopup(auth, provider);
        await ensureUserDocument(result.user);
        const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
        sessionStorage.removeItem('redirectAfterLogin');
        setPage(redirectTo as any);
        setAuthModalOpen(false);
      } catch (popupErr: any) {
        // If popup was blocked by browser, fall back to redirect
        if (popupErr?.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
          // Page reloads — getRedirectResult in AppContext handles the rest
        } else {
          throw popupErr; // Re-throw other errors
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError(getAuthErrorMessage(err, t));
      }
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
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: email.trim(),
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
      setAuthModalOpen(false);
    } catch (err: any) {
      setError(getAuthErrorMessage(err, t));
      setIsLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="auth-fullscreen">
        <div className="auth-modal" style={{ maxWidth: '360px' }}>
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand/5 p-6 rounded-2xl border border-brand/10 mb-6"
          >
            <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-brand" size={28} />
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-3 text-center">{t('auth.verifyEmail') || 'Verify your email'}</h2>
            <p className="text-zinc-500 font-medium leading-relaxed text-center text-sm">
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
            className="w-full btn-primary py-4 text-base shadow-xl shadow-brand/20"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bottomsheet-overlay z-[200]">
      {/* Backdrop */}
      <motion.div 
        className="auth-bottomsheet-backdrop" 
        onClick={() => setAuthModalOpen(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Bottom Sheet */}
      <motion.div 
        className="auth-bottomsheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Drag Handle */}
        <div className="auth-bottomsheet-handle-wrap">
          <div className="auth-bottomsheet-handle" />
        </div>

        {/* Header: Title + Close */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
            {isLogin ? (t('auth.welcomeBack') || 'Welcome Back') : (t('auth.createAccount') || 'Create Account')}
          </h2>
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs font-bold"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google Sign In */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all font-bold text-sm text-zinc-700 dark:text-zinc-200 shadow-sm disabled:opacity-50 mb-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t('auth.googleSignIn') || 'Continue with Google'}
        </button>

        {/* Email/Phone login button */}
        <button 
          onClick={() => setShowEmailForm(true)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand hover:bg-brand-hover text-white rounded-2xl transition-all font-bold text-sm shadow-lg shadow-brand/20 disabled:opacity-50 mb-4"
          style={{ display: showEmailForm ? 'none' : undefined }}
        >
          <Mail size={18} />
          {t('auth.emailLogin') || 'Log in with email or phone'}
        </button>

        {/* Email/Phone Form (shown when clicked) */}
        <AnimatePresence>
          {showEmailForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {/* Divider */}
              <div className="relative flex items-center justify-center mb-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
                </div>
                <span className="relative px-3 bg-white dark:bg-zinc-900 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('auth.continueWith') || 'Or'}</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                {!isLogin && (
                  <>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600" size={18} />
                      <input 
                        id="auth-signup-fullname"
                        name="fullname"
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('profile.labels.fullName') || 'Full Name'}
                        autoComplete="name"
                        className="auth-input"
                      />
                    </div>

                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600" size={18} />
                      <input 
                        id="auth-signup-phone"
                        name="phone"
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+251 912 345 678"
                        autoComplete="tel"
                        className="auth-input"
                      />
                    </div>

                    <div className="relative">
                      <select 
                        id="auth-signup-seller-type"
                        name="sellerType"
                        value={sellerType}
                        onChange={(e) => setSellerType(e.target.value)}
                        className="auth-input appearance-none cursor-pointer pr-10"
                      >
                        {SELLER_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 pointer-events-none" size={16} />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600" size={18} />
                  <input 
                    id="auth-email"
                    name="email"
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('profile.labels.email') || 'Email'}
                    autoComplete="email"
                    className="auth-input"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600" size={18} />
                  <input 
                    id="auth-password"
                    name="password"
                    required
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password') || 'Password'}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="auth-input"
                  />
                </div>

                {!isLogin && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600" size={18} />
                    <input 
                      id="auth-signup-confirm-password"
                      name="confirmPassword"
                      required
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.confirmPassword') || 'Confirm Password'}
                      autoComplete="new-password"
                      className="auth-input"
                    />
                  </div>
                )}

                <button 
                  disabled={isLoading}
                  className="w-full btn-primary py-3 text-base shadow-lg shadow-brand/20 disabled:opacity-70 disabled:shadow-none rounded-2xl mt-1"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={22} />
                  ) : (
                    <>
                      {isLogin ? t('auth.signInBtn') : t('auth.signUpBtn')}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Login / Sign Up */}
        <p className="mt-4 text-center text-[11px] font-bold text-zinc-500">
          {isLogin ? (t('auth.noAccount') || "Don't have an account?") : (t('auth.hasAccount') || 'Already have an account?')}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); setShowEmailForm(true); }}
            className="ml-1 text-brand hover:underline"
          >
            {isLogin ? (t('auth.signUpLink') || 'Create one now') : (t('auth.signInLink') || 'Sign in')}
          </button>
        </p>

        {/* Terms footer */}
        <p className="mt-3 text-center text-[10px] text-zinc-400 leading-relaxed px-2">
          By continuing, you agree to our{' '}
          <button type="button" onClick={() => { setAuthModalOpen(false); setPage('terms'); }} className="text-brand hover:underline">Terms & Conditions</button>
          {' '}and{' '}
          <button type="button" onClick={() => { setAuthModalOpen(false); setPage('privacy'); }} className="text-brand hover:underline">Privacy Policy</button>
        </p>
      </motion.div>
    </div>
  );
};
