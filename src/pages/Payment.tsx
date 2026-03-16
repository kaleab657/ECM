import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Upload, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Building2, Smartphone } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppContext } from '../context/AppContext';
import { LISTING_PACKAGES } from '../constants';
import { Page, Car, ListingPackage } from '../types';
import { apiUpload, apiFetch } from '../lib/api-client';

interface PaymentProps {
  listingId: string | null;
  setPage: (page: Page) => void;
}

export const Payment: React.FC<PaymentProps> = ({ listingId, setPage }) => {
  const { user, t } = useAppContext();
  const [listing, setListing] = useState<Car | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ListingPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CBE' | 'Telebirr'>('CBE');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingListing');
    if (pendingData) {
      const data = JSON.parse(pendingData) as Car;
      setListing(data);
      const pkg = LISTING_PACKAGES.find(p => p.id === data.packageType);
      if (pkg) setSelectedPackage(pkg as ListingPackage);
    } else if (!listingId) {
      setPage('home');
    }
  }, [listingId, setPage]);

  const handlePackageChange = (pkg: ListingPackage) => {
    setSelectedPackage(pkg);
    if (listing) {
      const updatedListing = { ...listing, packageType: pkg.id };
      setListing(updatedListing);
      sessionStorage.setItem('pendingListing', JSON.stringify(updatedListing));
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        setError('Only JPG, JPEG, and PNG images are allowed');
        return;
      }
      setScreenshot(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedPackage || !screenshot) {
      setError(t('payment.errorMissingInfo') || 'Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      
      let finalListingId = listingId;
      const pendingData = sessionStorage.getItem('pendingListing');
      let listingPayload = null;
      
      if (pendingData) {
        listingPayload = JSON.parse(pendingData);
        finalListingId = listingPayload.id;
      }

      if (!finalListingId) throw new Error('Listing ID not found');

      // 1. Upload screenshot to R2 (payment-proof bucket)
      const timestamp = Date.now();
      const customKey = `payments/${user.uid}/${finalListingId}/${timestamp}.jpg`;
      const fileName = `payment-${timestamp}.jpg`;
      
      // Upload to R2 via Backend Proxy (Bypasses CORS)
      const uploadResponse = await apiUpload(`/api/r2/upload-payment?fileName=${fileName}&fileType=${screenshot.type}&customKey=${customKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': screenshot.type,
          'Authorization': `Bearer ${idToken}`
        },
        body: screenshot
      });

      if (!uploadResponse.ok) {
        const contentType = uploadResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await uploadResponse.json();
          const errorMessage = errorData.details 
            ? `${errorData.error}: ${errorData.details}` 
            : (errorData.error || 'Failed to upload screenshot to R2');
          throw new Error(errorMessage);
        } else {
          throw new Error(`Upload failed (status ${uploadResponse.status}). Server may be unreachable.`);
        }
      }
      const { publicUrl } = await uploadResponse.json();

      // 2 & 3. Create listing and payment record in parallel to reduce delay
      const promises: Promise<any>[] = [
        addDoc(collection(db, 'payments'), {
          userId: user.uid,
          listingId: finalListingId,
          packageType: selectedPackage.id,
          price: selectedPackage.price,
          paymentMethod: paymentMethod,
          screenshotURL: publicUrl,
          status: 'pending',
          createdAt: serverTimestamp()
        })
      ];

      if (listingPayload) {
        promises.push(
          apiFetch('/api/listings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ listing: listingPayload })
          }).then(() => sessionStorage.removeItem('pendingListing'))
        );
      }

      await Promise.all(promises);

      setSuccess(true);
      setTimeout(() => setPage('dashboard'), 3000);
    } catch (err: any) {
      console.error('Payment submission error:', err);
      setError(err.message || 'Failed to submit payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center shadow-xl border border-zinc-100 dark:border-zinc-800"
        >
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-4 dark:text-white">{t('payment.successTitle')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            {t('payment.successDesc')}
          </p>
          <button 
            onClick={() => setPage('dashboard')}
            className="w-full py-4 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/20"
          >
            {t('payment.goToDashboard')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 md:pt-24 pb-24 md:pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => setPage('post')}
          className="flex items-center gap-2 text-zinc-500 hover:text-brand mb-4 md:mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{t('payment.back')}</span>
        </button>

        <h1 className="text-xl md:text-3xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight italic">{t('payment.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Left Column: Package Summary & Payment Methods */}
          <div className="lg:col-span-2 space-y-4 md:space-y-8">
            {/* Package Summary */}
            <section className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 md:p-6 shadow-sm border border-black/[0.03] dark:border-white/[0.05]">
              <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-zinc-400 uppercase tracking-widest">
                <CreditCard className="text-brand" size={18} strokeWidth={2.5} />
                {t('payment.packageSummary')}
              </h2>
              {selectedPackage && (
                <div className="p-4 bg-brand/[0.03] dark:bg-brand/5 rounded-2xl border border-brand/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-zinc-900 dark:text-white uppercase tracking-tight">{selectedPackage.name}</span>
                    <span className="text-brand font-black text-lg">{selectedPackage.price} ETB</span>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-bold mb-3 uppercase tracking-widest">{selectedPackage.duration} {t('post.days') || 'Post Days'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPackage.features.map((f, i) => (
                      <span key={i} className="px-2 py-1 bg-white dark:bg-zinc-800 text-[9px] font-black uppercase tracking-tight rounded-lg border border-black/[0.03] dark:border-white/[0.05] dark:text-zinc-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <label className="block text-sm font-semibold mb-3 dark:text-zinc-300">{t('payment.changePackage')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {LISTING_PACKAGES.filter(p => p.price > 0).map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handlePackageChange(pkg as ListingPackage)}
                      className={`p-3 rounded-xl border-2 transition-all text-sm font-bold ${
                        selectedPackage?.id === pkg.id
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-zinc-100 dark:border-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {pkg.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Payment Methods */}
            <section className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 md:p-6 shadow-sm border border-black/[0.03] dark:border-white/[0.05]">
              <h2 className="text-sm font-black mb-6 text-zinc-400 uppercase tracking-widest">{t('payment.method')}</h2>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('CBE')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                    paymentMethod === 'CBE'
                      ? 'border-brand bg-brand/[0.02]'
                      : 'border-zinc-50 dark:border-zinc-800'
                  }`}
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-black/[0.05] shadow-sm">
                    <img src="/assets/logos/cbe_logo.png" alt="CBE Bank" className="w-9 h-9 object-contain" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-xs text-zinc-900 dark:text-white uppercase tracking-tight">CBE</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">{t('payment.bankTransfer') || 'Transfer'}</p>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('Telebirr')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                    paymentMethod === 'Telebirr'
                      ? 'border-brand bg-brand/[0.02]'
                      : 'border-zinc-50 dark:border-zinc-800'
                  }`}
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-black/[0.05] shadow-sm">
                    <img src="/assets/logos/telebirr_logo.png" alt="Telebirr" className="w-9 h-9 object-contain" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-xs text-zinc-900 dark:text-white uppercase tracking-tight">Telebirr</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">{t('payment.mobileMoney') || 'Mobile'}</p>
                  </div>
                </button>
              </div>

              <div className="p-5 bg-zinc-50 dark:bg-zinc-800/80 rounded-[28px] border border-dashed border-zinc-200 dark:border-zinc-700">
                {paymentMethod === 'CBE' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-brand">
                      <Building2 size={24} />
                      <span className="font-bold">{t('payment.cbeDetails')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{t('payment.bankName')}</span>
                        <span className="font-semibold dark:text-white">Commercial Bank of Ethiopia</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{t('payment.accountNumber')}</span>
                        <span className="font-bold text-lg text-brand">1000706401311</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{t('payment.accountName')}</span>
                        <span className="font-semibold dark:text-white">KALEAB EPHEREM</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-brand">
                      <Smartphone size={24} />
                      <span className="font-bold">{t('payment.telebirrDetails')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{t('payment.phoneNumber')}</span>
                        <span className="font-bold text-lg text-brand">+251942712410</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{t('payment.accountName')}</span>
                        <span className="font-semibold dark:text-white">KALEAB EPHEREM</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Upload & Instructions */}
          <div className="space-y-4 md:space-y-8">
            <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
              <h2 className="text-xl font-bold mb-4 dark:text-white">{t('payment.instructions')}</h2>
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-brand/10 text-brand rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>{t('payment.instruction1', { amount: selectedPackage?.price || 0 })}</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-brand/10 text-brand rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>{t('payment.instruction2')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-brand/10 text-brand rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>{t('payment.instruction3')}</span>
                </li>
              </ul>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
              <h2 className="text-xl font-bold mb-4 dark:text-white">{t('payment.uploadProof')}</h2>
              
              <div className="space-y-4">
                <div 
                  onClick={() => document.getElementById('screenshot-upload')?.click()}
                  className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
                    preview ? 'border-brand' : 'border-zinc-200 dark:border-zinc-700 hover:border-brand'
                  }`}
                >
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="text-zinc-400 mb-2" size={32} />
                      <span className="text-xs text-zinc-500 font-medium">{t('payment.proofDesc')}</span>
                    </>
                  )}
                  <input 
                    id="screenshot-upload"
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleScreenshotChange}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  disabled={isSubmitting || !screenshot}
                  onClick={handleSubmit}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isSubmitting || !screenshot
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                      : 'bg-brand text-white shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>{t('payment.submitting')}</span>
                    </>
                  ) : (
                    <span>{t('payment.submit')}</span>
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
