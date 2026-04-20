import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2, CheckCircle2, Phone, ChevronDown, X, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { Logo } from '../components/Logo';
import { auth, db } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, getCountFromServer, increment } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { SELLER_TYPES } from '../constants';
import { Page } from '../types';
import { BottomSheetSelect } from '../components/BottomSheetSelect';

interface AuthProps {
  setPage: (page: Page) => void;
}

function getAuthErrorMessage(error: any, t: (key: string) => string): string {
  const code = error?.code || '';
  
  const getSafely = (key: string, fallback: string) => {
    const val = t(key);
    return (val === key || !val) ? fallback : val;
  };

  switch (code) {
    case 'auth/invalid-credential':
      return getSafely('auth.invalidCredential', 'Invalid email or password');
    case 'auth/wrong-password':
      return getSafely('auth.wrongPassword', 'Incorrect password');
    case 'auth/user-not-found':
      return getSafely('auth.userNotFound', 'No account found with this email');
    case 'auth/email-already-in-use':
      return getSafely('auth.emailInUse', 'This email is already registered. Please log in instead.');
    case 'auth/weak-password':
      return getSafely('auth.weakPassword', 'Password is too weak. Please use at least 6 characters.');
    case 'auth/invalid-email':
      return getSafely('auth.invalidEmail', 'Invalid email format.');
    case 'auth/too-many-requests':
      return getSafely('auth.tooManyRequests', 'Too many failed attempts. Try again later.');
    case 'auth/network-request-failed':
      return getSafely('auth.networkError', 'Network error. Please check your connection and try again.');
    case 'auth/popup-closed-by-user':
      return getSafely('auth.popupClosed', 'Sign-in was cancelled. Please try again.');
    case 'auth/popup-blocked':
      return getSafely('auth.popupBlocked', 'Sign-in popup was blocked. Redirecting instead...');
    case 'auth/cancelled-popup-request':
    case 'auth/redirect-cancelled-by-user':
      return 'Sign-in was cancelled. Please try again.';
    default:
      return getSafely('auth.authError', 'Login failed. Please try again');
  }
}

async function ensureUserDocument(user: any): Promise<boolean> {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  // Safely fallback to email prefix if no exact display name exists
  const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: fallbackName,
      createdAt: serverTimestamp(),
      phoneNumber: user.phoneNumber || '',
      sellerType: '',
      profileCompleted: false
    });
    // Stats update is non-critical — fire and forget (saves ~200-500ms)
    setDoc(doc(db, 'stats', 'global'), {
      usersCount: increment(1)
    }, { merge: true }).catch(() => {});
    return true; // Wait for profile completion
  } else {
    const data = userDoc.data();
    
    // Check if profile is actually fully completed (or legacy user that already filled data)
    const isCompleted = data.profileCompleted === true || (Boolean(data.sellerType) && Boolean(data.phoneNumber));
    if (!isCompleted) {
      return true; // Force profile completion if they never actually finished it
    }

    // Sync Google data into existing profile if the profile is lacking it
    const updates: any = {};
    
    if (!data.email && user.email) updates.email = user.email;
    if (!data.phoneNumber && user.phoneNumber) updates.phoneNumber = user.phoneNumber;
    
    // If current displayName is missing or a generic fallback, overwrite it with real data
    const isGenericName = !data.displayName || data.displayName.toLowerCase() === 'anonymous' || data.displayName.toLowerCase() === 'unknown' || data.displayName.toLowerCase() === 'user';
    if (isGenericName && fallbackName && fallbackName.toLowerCase() !== 'user') {
      updates.displayName = fallbackName;
    }
    
    // Profile sync is non-critical — fire and forget (saves ~200-500ms)
    if (Object.keys(updates).length > 0) {
      setDoc(userRef, updates, { merge: true }).catch(() => {});
    }
    
    return false;
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
  const [sellerType, setSellerType] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    // Only redirect automatically if not in the middle of Google profile completion
    if (user && !isLoading && !isCompletingProfile) {
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
      sessionStorage.removeItem('redirectAfterLogin');
      setPage(redirectTo as any);
      setAuthModalOpen(false);
    }
  }, [user, isLoading, isCompletingProfile, setPage, setAuthModalOpen]);

  const performGoogleAuth = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('No ID Token received');
      const credential = GoogleAuthProvider.credential(idToken);
      const firebaseResult = await signInWithCredential(auth, credential);
      return firebaseResult.user;
    } else {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
          return null; // redirecting
        } else {
          throw popupErr;
        }
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    let userRecord = null;
    

    
    try {
      try {
        userRecord = await performGoogleAuth();
      } catch (firstErr: any) {
        if (firstErr?.code === 'auth/popup-closed-by-user' || firstErr?.code === 'auth/cancelled-popup-request') {
          throw firstErr; // Skip retry if aborted by user
        }
        // Auto-retry immediately — no artificial delay
        userRecord = await performGoogleAuth();
      }
      
      if (userRecord) {
        const needsCompletion = await ensureUserDocument(userRecord);
        if (needsCompletion) {
          setGoogleUser(userRecord);
          if (!fullName) setFullName(userRecord.displayName || '');
          setIsCompletingProfile(true);
        } else {
          const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
          sessionStorage.removeItem('redirectAfterLogin');
          setPage(redirectTo as any);
          setAuthModalOpen(false);
        }
      }
    } catch (err: any) {
      console.error('ERROR: Google sign-in failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError(getAuthErrorMessage(err, t));
      } else {
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!fullName.trim() || !phoneNumber.trim() || !sellerType) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', googleUser.uid);
      await setDoc(userRef, {
        displayName: fullName,
        phoneNumber,
        sellerType,
        profileCompleted: true
      }, { merge: true });

      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || 'home';
      sessionStorage.removeItem('redirectAfterLogin');
      setPage(redirectTo as any);
      setAuthModalOpen(false);
    } catch (err: any) {
      setError(getAuthErrorMessage(err, t));
    } finally {
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

    if (!isLogin && !sellerType) {
      setError('Please select a role');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const needsCompletion = await ensureUserDocument(userCredential.user);
        if (needsCompletion) {
          setGoogleUser(userCredential.user);
          if (!fullName) setFullName(userCredential.user.displayName || '');
          setIsCompletingProfile(true);
          setIsLoading(false);
          return;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: email.trim(),
          displayName: fullName,
          phoneNumber: phoneNumber,
          sellerType: sellerType,
          profileCompleted: true,
          createdAt: serverTimestamp(),
        });
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('auth.invalidEmail') || 'Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        setError(t('auth.userNotFound') !== 'auth.userNotFound' ? t('auth.userNotFound') : 'No account found');
      } else if (err?.code === 'auth/invalid-email') {
        setError(t('auth.invalidEmail') !== 'auth.invalidEmail' ? t('auth.invalidEmail') : 'Invalid email format');
      } else {
        setError(getAuthErrorMessage(err, t));
      }
    } finally {
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
    <div className="auth-bottomsheet-overlay">
      <motion.div
        className="auth-bottomsheet-backdrop"
        onClick={() => setAuthModalOpen(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        className="auth-bottomsheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="auth-bottomsheet-handle-wrap">
          <div className="auth-bottomsheet-handle" />
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
            {isCompletingProfile ? 'Complete Profile' : showForgotPassword ? (t('auth.resetPassword') !== 'auth.resetPassword' ? t('auth.resetPassword') : 'Reset Password') : isLogin ? (t('auth.welcomeBack') || 'Welcome Back') : (t('auth.createAccount') || 'Create Account')}
          </h2>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && !isCompletingProfile && (
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

        <AnimatePresence mode="wait">
          {isCompletingProfile ? (
            <motion.form
              key="complete-profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleCompleteGoogleProfile} 
              className="space-y-3"
            >
              <div className="mb-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold leading-relaxed">
                  Please provide your contact details to finish setting up your account.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs font-bold">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 pointer-events-none" size={18} />
                <input
                  name="fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('profile.labels.fullName') || 'Full Name'}
                  className="auth-input pl-[44px]"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 pointer-events-none" size={18} />
                <input
                  name="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+251 912 345 678"
                  className="auth-input pl-[44px]"
                />
              </div>

              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 pointer-events-none z-10" size={18} />
                <BottomSheetSelect 
                  name="sellerType"
                  value={sellerType}
                  onChange={(e) => setSellerType(e.target.value)}
                  label={t('auth.selectRole') !== 'auth.selectRole' ? t('auth.selectRole') : 'Select Role'}
                  options={SELLER_TYPES.map(type => ({ value: type, label: t(`sellerTypes.${type}`) !== `sellerTypes.${type}` ? t(`sellerTypes.${type}`) : type }))}
                  className="auth-input pl-[44px] pr-4 w-full flex items-center justify-between pointer-events-auto"
                />
              </div>

              <button
                disabled={isLoading}
                className="w-full btn-primary py-3.5 text-base shadow-lg shadow-brand/20 disabled:opacity-70 rounded-2xl mt-4 mb-4"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mx-auto" size={22} />
                ) : (
                  <>
                    {t('auth.finishSetup') || 'Finish Setup'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.form>
          ) : showForgotPassword ? (
            <motion.form
              key="forgot-password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleForgotPassword}
              className="space-y-3"
            >
              {resetSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Check your email</h3>
                  <p className="text-sm text-zinc-500 mb-6">
                    {t('auth.resetLinkSent') !== 'auth.resetLinkSent' ? t('auth.resetLinkSent') : 'Password reset link sent. Check your inbox or spam folder.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setResetSent(false); setIsLogin(true); }}
                    className="w-full btn-primary py-3.5 text-base shadow-lg shadow-brand/20 rounded-2xl"
                  >
                    {t('auth.backToLogin') || 'Back to Login'}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-4 px-1 text-center">
                    {t('auth.forgotPasswordSubtitle') !== 'auth.forgotPasswordSubtitle' ? t('auth.forgotPasswordSubtitle') : 'Enter your email address to receive a password reset link.'}
                  </p>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 pointer-events-none" size={18} />
                    <input
                      name="email"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('profile.labels.email') || 'Email'}
                      className="auth-input pl-[44px]"
                    />
                  </div>

                  <button
                    disabled={isLoading}
                    className="w-full btn-primary py-3.5 text-base shadow-lg shadow-brand/20 disabled:opacity-70 rounded-2xl mt-4 mb-4"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin mx-auto" size={22} />
                    ) : (
                      <>
                        {t('auth.sendResetLink') !== 'auth.sendResetLink' ? t('auth.sendResetLink') : 'Send Reset Link'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => { setShowForgotPassword(false); setError(null); setIsLogin(true); }}
                    className="w-full py-3.5 text-sm font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline-offset-4 hover:underline transition-all"
                  >
                    {t('auth.backToLogin') || 'Back to Login'}
                  </button>
                </>
              )}
            </motion.form>
          ) : (
            <motion.div key="auth-main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all font-bold text-sm text-zinc-700 dark:text-zinc-200 shadow-sm disabled:opacity-50 mb-3"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-brand" />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {t('auth.googleSignIn') || 'Continue with Google'}
                  </>
                )}
              </button>

        <button
          onClick={() => setShowEmailForm(true)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand hover:bg-brand-hover text-white rounded-2xl transition-all font-bold text-sm shadow-lg shadow-brand/20 disabled:opacity-50 mb-4"
          style={{ display: showEmailForm ? 'none' : undefined }}
        >
          <Mail size={18} />
          {t('auth.emailLogin') || 'Continue with Email'}
        </button>

        <AnimatePresence>
          {showEmailForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className=""
            >
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
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 pointer-events-none z-10" size={18} />
                      <BottomSheetSelect 
                        id="auth-signup-seller-type"
                        name="sellerType"
                        value={sellerType}
                        onChange={(e) => setSellerType(e.target.value)}
                        label={t('auth.selectRole') !== 'auth.selectRole' ? t('auth.selectRole') : 'Select Role'}
                        options={SELLER_TYPES.map(type => ({ value: type, label: t(`sellerTypes.${type}`) !== `sellerTypes.${type}` ? t(`sellerTypes.${type}`) : type }))}
                        className="auth-input pl-[44px] pr-4 w-full flex items-center justify-between"
                      />
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

                {isLogin && (
                  <div className="flex justify-end mt-2 mb-1">
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setError(null); setResetSent(false); }}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      {t('auth.forgotPasswordText') !== 'auth.forgotPasswordText' ? t('auth.forgotPasswordText') : 'Forgot Password?'}
                    </button>
                  </div>
                )}

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

        </motion.div>
          )}
        </AnimatePresence>

        {!isCompletingProfile && !showForgotPassword && (
          <>
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

            <p className="mt-3 text-center text-[10px] text-zinc-400 leading-relaxed px-2">
              {t('auth.agreeText') || 'By continuing, you agree to our'}{' '}
              <button type="button" onClick={() => { setAuthModalOpen(false); setPage('terms'); }} className="text-brand hover:underline">{t('auth.termsConditions')}</button>
              {' '}{t('auth.and') || 'and'}{' '}
              <button type="button" onClick={() => { setAuthModalOpen(false); setPage('privacy'); }} className="text-brand hover:underline">{t('auth.privacyPolicy')}</button>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};
