import React, { useState, useRef } from 'react';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Info, X, Loader2, ChevronRight, ChevronLeft, CheckCircle2, DollarSign, MapPin, Car as CarIcon, User, Package, ChevronDown, AlertTriangle } from 'lucide-react';
import { MAKES, LOCATIONS, ADDIS_ABABA_SUB_CITIES, BODY_TYPES, PRICE_TYPES, SELLER_TYPES, LISTING_PACKAGES } from '../constants';
import { useAppContext } from '../context/AppContext';
import { Car, Page, ListingPackage } from '../types';
import { db } from '../lib/firebase';
import { collection, serverTimestamp, doc, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { apiUpload } from '../lib/api-client';
import { compressImage } from '../utils/image-utils';
import { BottomSheetSelect } from '../components/BottomSheetSelect';

interface PostCarProps {
  setPage: (page: Page) => void;
  setPendingListingId: (id: string) => void;
}

export const PostCar: React.FC<PostCarProps> = ({ setPage, setPendingListingId }) => {
  const { user, profile, t, appConfig } = useAppContext();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(() => {
    return sessionStorage.getItem('pendingListing') ? 6 : 1;
  });
  
  const [dbBanData, setDbBanData] = useState<{ isBanned: boolean; banReason: string } | null>(null);

  React.useEffect(() => {
    const fetchBanData = async () => {
      if (user?.uid) {
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            setDbBanData({
              isBanned: !!docSnap.data().isBanned,
              banReason: docSnap.data().banReason || ''
            });
          }
        } catch (e) {}
      }
    };
    fetchBanData();
  }, [user]);

  const isBanned = dbBanData ? dbBanData.isBanned : profile?.isBanned;
  const banReason = dbBanData ? dbBanData.banReason : profile?.banReason;

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(() => {
    const pending = sessionStorage.getItem('pendingListing');
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        return parsed.imageURLs || [];
      } catch (e) { return []; }
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CAR_COLORS = [
    'White', 'Black', 'Silver', 'Gray', 'Blue', 'Red', 'Green',
    'Yellow', 'Brown', 'Gold', 'Orange', 'Purple', 'Beige', 'Other'
  ];

  const [formData, setFormData] = useState(() => {
    const defaultData = {
      title: '', brand: '', model: '', year: new Date().getFullYear().toString(),
      price: '', priceType: '', mileage: '', fuel: '', transmission: '',
      bodyType: '', color: '', engineSize: '', city: '', subCity: '', description: '',
      condition: '' as '' | 'Used' | 'New', listingType: '' as '' | 'sale' | 'rent',
      sellerPhone: profile?.phoneNumber || '', telegram: '', whatsapp: '',
      packageType: 'free', bankLoan: false, bankLoanAmount: '',
      fuelMileage: '', driveType: '',
      commission: ''
    };
    
    const pending = sessionStorage.getItem('pendingListing');
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        return {
          ...defaultData,
          ...parsed,
          year: parsed.year?.toString() || defaultData.year,
          price: parsed.price?.toString() || '',
          mileage: parsed.mileage?.toString() || '',
          bankLoanAmount: parsed.bankLoanAmount?.toString() || ''
        };
      } catch (e) { return defaultData; }
    }
    return defaultData;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      let finalValue = value;
      if (name === 'price' || name === 'bankLoanAmount' || name === 'mileage' || name === 'commission') {
        const rawValue = finalValue.replace(/[^0-9]/g, '');
        if (name === 'commission') {
          // Rule 21-23: Commission 1-5
          if (rawValue && (Number(rawValue) < 1 || Number(rawValue) > 5)) {
            showToast(t('post.commission.warn') || 'Commission must be between 1% and 5%', 'warning');
            return;
          }
          finalValue = rawValue;
        } else {
          finalValue = rawValue ? Number(rawValue).toLocaleString('en-US') : '';
        }
      }
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      if (images.length + newFiles.length > 6) {
        showToast(t('post.errorMaxImages') || 'Maximum 6 images allowed', 'warning');
        return;
      }

      // Validate file size (5MB)
      const oversized = newFiles.some(file => file.size > 5 * 1024 * 1024);
      if (oversized) {
        showToast(t('post.errorImageSize') || 'Each image must be less than 5MB', 'warning');
        return;
      }

      setImages(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!formData.title) {
          showToast(t('post.errorTitle') || 'Listing title is required', 'warning'); return false;
        }
        if (!formData.city) {
          showToast(t('post.errorCity') || 'City is required', 'warning'); return false;
        }
        if (formData.city === 'Addis Ababa' && !formData.subCity) {
          showToast(t('post.errorSubCity') || 'Please select a sub city', 'warning'); return false;
        }
        if (!formData.condition) {
          showToast(t('post.errorCondition') || 'Condition is required', 'warning'); return false;
        }
        if (!formData.listingType) {
          showToast(t('post.errorListingType') || 'Listing type is required', 'warning'); return false;
        }
        return true;
      case 2:
        if (!formData.brand) { showToast(t('post.errorMake') || 'Make is required', 'warning'); return false; }
        if (!formData.model) { showToast(t('post.errorModel') || 'Model is required', 'warning'); return false; }
        if (!formData.year) { showToast(t('post.errorYear') || 'Year is required', 'warning'); return false; }
        if (!formData.mileage) { showToast(t('post.errorMileage') || 'Mileage is required', 'warning'); return false; }
        if (!formData.transmission) { showToast(t('post.errorTransmission') || 'Transmission is required', 'warning'); return false; }
        if (!formData.fuel) { showToast(t('post.errorFuel') || 'Fuel type is required', 'warning'); return false; }
        if (!formData.bodyType) { showToast(t('post.errorBodyType') || 'Body type is required', 'warning'); return false; }
        // Color and engineSize are optional — no validation needed
        return true;
      case 3:
        if (!formData.price) {
          showToast(t('post.errorPrice') || 'Please enter a price', 'warning');
          return false;
        }
        if (profile?.sellerType === 'Broker' && formData.commission) {
          const comm = Number(formData.commission);
          if (comm < 1 || comm > 5) {
            showToast(t('post.commission.warn') || 'Commission must be between 1% and 5%', 'warning');
            return false;
          }
        }
        return true;
      case 4:
        if (!formData.sellerPhone) {
          showToast(t('post.errorPhone') || 'Please enter your phone number', 'warning');
          return false;
        }
        return true;
      case 5:
        if (previews.length < 2) {
          showToast(t('post.errorImageRequired') || 'Minimum 2 images required', 'warning');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // Recursively remove undefined and NaN values from an object before sending to Firestore
  const sanitizeForFirestore = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined && !(typeof v === 'number' && isNaN(v)))
        .map(([k, v]) => [
          k,
          v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
            ? sanitizeForFirestore(v)
            : v
        ])
    );
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSubmitting) return;
    if (!user) {
      showToast(t('post.errorNotLoggedIn') || 'You must be logged in to post a listing', 'error');
      return;
    }

    // Final validation
    if (previews.length < 2) {
      showToast(t('post.errorImageRequired') || 'Minimum 2 images required', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();
      
      const pendingData = sessionStorage.getItem('pendingListing');
      let listingId = pendingData ? JSON.parse(pendingData).id : Math.random().toString(36).substring(2, 15);
      
      let imageUrls: string[] = [];

      if (images.length > 0) {
        showToast(t('post.uploading') || 'Uploading images...', 'info');

        // Step A: Compress all images in parallel
        const compressedImages = await Promise.all(
          images.map(image =>
            compressImage(image).catch(() => image)
          )
        );

        // Step B: Upload all compressed images in parallel
        const uploadPromises = compressedImages.map(async (blob, i) => {
          const imageName = `image-${i + 1}-${Date.now()}-${i}`;
          const key = `listings/${user.uid}/${listingId}/${imageName}.jpg`;

          const uploadData = await apiUpload(
            `/api/r2/upload-listing?fileName=${encodeURIComponent(imageName)}&fileType=image/jpeg&customKey=${encodeURIComponent(key)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'image/jpeg',
                'Authorization': `Bearer ${idToken}`
              },
              body: await blob.arrayBuffer()
            }
          );
          return uploadData.publicUrl;
        });

        imageUrls = await Promise.all(uploadPromises);
      } else if (pendingData) {
        // If no new images uploaded, retain existing ones
        imageUrls = JSON.parse(pendingData).imageURLs || [];
      }

      const isPaid = formData.packageType !== 'free';
      
      const listingPayload = {
        id: listingId,
        ownerId: user.uid,
        ownerName: profile?.displayName || user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        ownerPhone: formData.sellerPhone,
        ownerTelegram: formData.telegram || '',
        ownerWhatsapp: formData.whatsapp || '',
        ownerSellerType: profile?.sellerType || 'Private Seller',
        ...formData,
        year: parseInt(formData.year.toString().replace(/[^0-9]/g, '')) || new Date().getFullYear(),
        price: parseFloat(formData.price.toString().replace(/[^0-9.]/g, '')) || 0,
        mileage: parseFloat(formData.mileage.toString().replace(/[^0-9.]/g, '')) || 0,
        bankLoanAmount: formData.bankLoanAmount ? (parseFloat(formData.bankLoanAmount.toString().replace(/[^0-9.]/g, '')) || 0) : null,
        fuelMileage: formData.fuelMileage || null,
        driveType: formData.driveType || null,
        commission: (profile?.sellerType === 'Broker' && formData.commission) ? parseInt(formData.commission.toString()) : null,
        imageURLs: imageUrls,
        status: isPaid ? 'pending_payment_verification' : 'approved',
        views: 0,
        createdAt: new Date().toISOString()
      };

      // Sanitize: remove any undefined/NaN values before Firestore or sessionStorage
      const cleanPayload = sanitizeForFirestore(listingPayload);

      if (isPaid) {
        // Store temporary listing data
        sessionStorage.setItem('pendingListing', JSON.stringify(cleanPayload));
        setPendingListingId(listingId);
        showToast(t('post.redirectingPayment') || 'Redirecting to payment...', 'info');
        setPage('payment');
      } else {
        // 2. Save car data directly to Firestore
        const carRef = doc(db, 'cars', listingId);
        await setDoc(carRef, {
          ...cleanPayload,
          createdAt: serverTimestamp()
        });
        
        // Optimistic UI cache injection for immediate loading on Home.tsx
        try {
          const cachedStr = sessionStorage.getItem('cachedHomeCars');
          const parsed = cachedStr ? JSON.parse(cachedStr) : [];
          sessionStorage.setItem('cachedHomeCars', JSON.stringify([{
            ...cleanPayload,
            createdAt: { seconds: Math.floor(Date.now()/1000) } // Mock Firestore ts
          }, ...parsed]));
        } catch(e) {}

        showToast(t('post.success') || 'Listing posted successfully!', 'success');
        setPage('home');
      }
    } catch (error: any) {
      console.error('ERROR: Post listing failed:', error);
      const msg = (t('post.errorPosting') || 'Failed to post listing: ') + error.message;
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 md:p-8 border border-black/[0.03] dark:border-white/[0.05] shadow-sm space-y-6">
              <h2 className="text-sm font-black flex items-center gap-2 text-zinc-400 uppercase tracking-[0.2em]">
                <Info size={16} className="text-brand" strokeWidth={2.5} /> {t('post.basicInfo') || 'Basic Information'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.listingTitle') || 'Listing Title'}</label>
                  <input 
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder={t('post.titlePlaceholder') || 'e.g. 2020 Toyota Corolla - Excellent Condition'}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>

                <div>
                  <label htmlFor="condition" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.condition') || 'Condition'}</label>
                  <BottomSheetSelect 
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    label={t('post.selectCondition') || 'Select Condition'}
                    options={[
                      { value: "Used", label: t('search.used') },
                      { value: "New", label: t('search.new') }
                    ]}
                  />
                </div>
                
                <div>
                  <label htmlFor="listingType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.listingType') || 'Listing Type'}</label>
                  <BottomSheetSelect 
                    id="listingType"
                    name="listingType"
                    value={formData.listingType}
                    onChange={handleInputChange}
                    label={t('post.selectListingType') || 'Select Listing Type'}
                    options={[
                      { value: "sale", label: t('nav.sell') },
                      { value: "rent", label: t('nav.rent') }
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.location') || 'City'}</label>
                  <BottomSheetSelect 
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    label={t('post.selectCity') || 'Select City'}
                    options={LOCATIONS.map(l => ({ value: l, label: (() => { const v = t(`locations.${l}`); return (typeof v === 'string' && v.startsWith('locations.')) ? l : (v || l); })() }))}
                  />
                </div>
                
                {formData.city === 'Addis Ababa' && (
                  <div>
                    <label htmlFor="subCity" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.subCity') || 'Sub City'}</label>
                    <BottomSheetSelect 
                      id="subCity"
                      name="subCity"
                      value={formData.subCity}
                      onChange={handleInputChange}
                      label={t('search.anySubCity') || 'Select Sub City'}
                      options={ADDIS_ABABA_SUB_CITIES.map(sc => ({ value: sc, label: t(`subcities.${sc}`) || sc }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 md:p-8 border border-black/[0.03] dark:border-white/[0.05] shadow-sm space-y-6">
              <h2 className="text-sm font-black flex items-center gap-2 text-zinc-400 uppercase tracking-[0.2em]">
                <CarIcon size={16} className="text-brand" strokeWidth={2.5} /> {t('post.vehicleDetails') || 'Vehicle Details'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label htmlFor="brand" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.make') || 'Make'}</label>
                  <BottomSheetSelect 
                    id="brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    label={t('search.anyMake') || 'Select Make'}
                    options={MAKES.map(m => ({ value: m, label: m }))}
                  />
                </div>
                <div>
                  <label htmlFor="model" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.model') || 'Model'}</label>
                  <input 
                    id="model"
                    name="model"
                    type="text"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder="e.g. Corolla"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="year" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.year') || 'Year'}</label>
                  <input 
                    id="year"
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="mileage" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.mileage') || 'Mileage (km)'}</label>
                  <input 
                    id="mileage"
                    name="mileage"
                    type="text"
                    inputMode="numeric"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    placeholder="e.g. 45000"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="transmission" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.transmission') || 'Transmission'}</label>
                  <BottomSheetSelect 
                    id="transmission"
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleInputChange}
                    label={t('post.selectTransmission') || 'Select Transmission'}
                    options={[
                      { value: "Automatic", label: t('common.automatic') },
                      { value: "Manual", label: t('common.manual') }
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor="fuel" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.fuel') || 'Fuel Type'}</label>
                  <BottomSheetSelect 
                    id="fuel"
                    name="fuel"
                    value={formData.fuel}
                    onChange={handleInputChange}
                    label={t('post.selectFuelType') || 'Select Fuel Type'}
                    options={[
                      { value: "Petrol", label: t('common.petrol') },
                      { value: "Diesel", label: t('common.diesel') },
                      { value: "Hybrid", label: t('common.hybrid') },
                      { value: "Electric", label: t('common.electric') }
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor="bodyType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.bodyType') || 'Body Type'}</label>
                  <BottomSheetSelect 
                    id="bodyType"
                    name="bodyType"
                    value={formData.bodyType}
                    onChange={handleInputChange}
                    label={t('post.selectBodyType') || 'Select Body Type'}
                    options={BODY_TYPES.map(type => ({ value: type, label: t(`bodyTypes.${type}`) || type }))}
                  />
                </div>
                <div>
                  <label htmlFor="engineSize" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.engineSize') || 'Engine Size'} <span className="font-bold text-zinc-800 dark:text-zinc-200">({t('common.optional') || 'Optional'})</span></label>
                  <input 
                    id="engineSize"
                    name="engineSize"
                    value={formData.engineSize}
                    onChange={handleInputChange}
                    placeholder="e.g. 1.6L"
                    inputMode="decimal"
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="color" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.color') || 'Color'} <span className="font-bold text-zinc-800 dark:text-zinc-200">({t('common.optional') || 'Optional'})</span></label>
                  <BottomSheetSelect 
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    label={t('post.selectColor') || 'Select Color'}
                    options={CAR_COLORS.map(c => ({ value: c, label: t(`colors.${c}`) || c }))}
                  />
                </div>
                <div>
                  <label htmlFor="fuelMileage" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.fuelMileage') || 'Fuel Mileage (km/L)'} <span className="font-bold text-zinc-800 dark:text-zinc-200">({t('common.optional') || 'Optional'})</span></label>
                  <input 
                    id="fuelMileage"
                    name="fuelMileage"
                    value={formData.fuelMileage}
                    onChange={handleInputChange}
                    placeholder="e.g. 15"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="driveType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.driveType') || 'Drive Type'} <span className="font-bold text-zinc-800 dark:text-zinc-200">({t('common.optional') || 'Optional'})</span></label>
                  <BottomSheetSelect 
                    id="driveType"
                    name="driveType"
                    value={formData.driveType}
                    onChange={handleInputChange}
                    label="Select Drive Type"
                    options={[
                      { value: "FWD", label: "FWD" },
                      { value: "RWD", label: "RWD" },
                      { value: "AWD", label: "AWD" },
                      { value: "4WD", label: "4WD" }
                    ]}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 md:p-8 border border-black/[0.03] dark:border-white/[0.05] shadow-sm space-y-6">
              <h2 className="text-sm font-black flex items-center gap-2 text-zinc-400 uppercase tracking-[0.2em]">
                <DollarSign size={16} className="text-brand" strokeWidth={2.5} /> {t('post.pricingDetails') || 'Pricing Details'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label htmlFor="price" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    {formData.listingType === 'rent' ? 'Rent Price (ETB)' : 'Sale Price (ETB)'}
                  </label>
                  <input 
                    id="price"
                    name="price"
                    type="text"
                    inputMode="numeric"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder={formData.listingType === 'rent' ? 'Enter rent price' : 'Enter sale price'}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                {profile?.sellerType === 'Broker' && (
                  <div>
                    <label htmlFor="commission" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Commission (%)</label>
                    <input 
                      id="commission"
                      name="commission"
                      type="text"
                      inputMode="numeric"
                      value={formData.commission}
                      onChange={handleInputChange}
                      placeholder="Enter 1% to 5%"
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                    />
                    <p className="mt-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Enter 1% to 5%</p>
                  </div>
                )}
                <div>
                  <label htmlFor="priceType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.priceType') || 'Price Type'} <span className="font-bold text-zinc-800 dark:text-zinc-200">({t('common.optional') || 'Optional'})</span></label>
                  <BottomSheetSelect 
                    id="priceType"
                    name="priceType"
                    value={formData.priceType}
                    onChange={handleInputChange}
                    label={t('post.selectPriceType') || 'Select Price Type'}
                    options={PRICE_TYPES.map(type => ({ value: type, label: t(`priceTypes.${type}`) || type }))}
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  <input 
                    type="checkbox"
                    id="bankLoan"
                    name="bankLoan"
                    checked={formData.bankLoan}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-zinc-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor="bankLoan" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer select-none">
                    {t('post.hasBankLoan') || 'This car has a bank loan'}
                  </label>
                </div>
                {formData.bankLoan && (
                  <div>
                    <label htmlFor="bankLoanAmount" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.remainingLoan') || 'Remaining Bank Loan Amount'}</label>
                    <input 
                      id="bankLoanAmount"
                      name="bankLoanAmount"
                      type="text"
                      inputMode="numeric"
                      value={formData.bankLoanAmount}
                      onChange={handleInputChange}
                      placeholder={t('post.loanPlaceholder') || 'Enter remaining loan amount (ETB)'}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 md:p-8 border border-black/[0.03] dark:border-white/[0.05] shadow-sm space-y-6">
              <h2 className="text-sm font-black flex items-center gap-2 text-zinc-400 uppercase tracking-[0.2em]">
                <User size={16} className="text-brand" strokeWidth={2.5} /> {t('detail.sellerInfo') || 'Seller Information'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label htmlFor="sellerPhone" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('auth.phone') || 'Phone Number'}</label>
                  <input 
                    id="sellerPhone"
                    name="sellerPhone"
                    value={formData.sellerPhone}
                    onChange={handleInputChange}
                    placeholder="e.g. 0912345678"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="telegram" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Telegram <span className="font-bold text-zinc-800 dark:text-zinc-200">(Optional)</span></label>
                  <input 
                    id="telegram"
                    name="telegram"
                    value={formData.telegram}
                    onChange={handleInputChange}
                    placeholder="e.g. @username or t.me/username"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="whatsapp" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">WhatsApp <span className="font-bold text-zinc-800 dark:text-zinc-200">(Optional)</span></label>
                  <input 
                    id="whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="e.g. +251912345678"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 dark:text-white">
                <Camera size={18} className="text-brand" /> {t('post.mediaDesc') || 'Media & Description'}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.uploadPhotos') || 'Upload Photos (Min 2, Max 6)'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                    {previews.map((p, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                        <img src={p} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeImage(i)}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full shadow-lg active:scale-95 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {previews.length < 6 && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center hover:border-brand transition-colors bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <Upload className="text-zinc-400" size={20} />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">{t('post.addPhoto') || 'Add Photo'}</span>
                      </button>
                    )}
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.description') || 'Description'}</label>
                  <textarea 
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder={t('post.descPlaceholder') || 'Describe your car...'}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none resize-none dark:text-white"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 6:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 md:p-8 border border-black/[0.03] dark:border-white/[0.05] shadow-sm space-y-6">
              <h2 className="text-sm font-black flex items-center gap-2 text-zinc-400 uppercase tracking-[0.2em]">
                <Package size={16} className="text-brand" strokeWidth={2.5} /> {t('post.selectPackage') || 'Select Package'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {LISTING_PACKAGES.map((basePkg) => {
                  const pkg = {
                    ...basePkg,
                    price: basePkg.id === 'featured' ? (appConfig.featured_price ?? basePkg.price) : 
                           basePkg.id === 'premium' ? (appConfig.premium_price ?? basePkg.price) : basePkg.price
                  };
                  return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, packageType: pkg.id }))}
                    className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${
                      formData.packageType === pkg.id 
                        ? 'border-brand bg-brand/5' 
                        : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                    }`}
                  >
                    {formData.packageType === pkg.id && (
                      <div className="absolute top-4 right-4 text-brand">
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                    <h3 className="font-black text-sm uppercase tracking-tight mb-1 dark:text-white">
                      {pkg.name}
                    </h3>
                    <p className="text-brand font-black text-lg mb-4">{pkg.price === 0 ? 'Free' : `${pkg.price} ETB`}</p>
                    <ul className="space-y-2">
                      {pkg.features.map((f: string, i: number) => (
                        <li key={i} className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <div className="w-1 h-1 bg-brand rounded-full" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (isBanned) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-24 flex justify-center">
        <div className="bg-red-50 dark:bg-red-500/10 border-2 border-red-500/20 rounded-[32px] p-8 md:p-12 text-center max-w-lg w-full mt-4 md:mt-12 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <AlertTriangle size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-red-600 dark:text-red-400 tracking-tight mb-4 text-balance">
            Your account is restricted
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium text-sm md:text-base mb-6 whitespace-pre-wrap">
            You cannot post listings.
            {banReason ? `\nReason: ${banReason}` : ''}
          </p>
          <button 
            type="button"
            onClick={() => setPage('home')}
            className="mt-8 w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-4">
      <div>
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-between items-center">
        {currentStep > 1 ? (
          <button 
            type="button"
            onClick={prevStep}
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 text-zinc-500 font-black text-xs md:text-sm hover:text-brand transition-colors uppercase tracking-widest"
          >
            <ChevronLeft size={18} />
            {t('post.previous') || 'Previous'}
          </button>
        ) : <div />}

        {currentStep < 6 ? (
          <button 
            type="button"
            onClick={nextStep}
            className="flex items-center gap-1.5 md:gap-2 px-6 md:px-8 py-3 md:py-4 bg-brand text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
          >
            {t('post.next') || 'Next Step'}
            <ChevronRight size={18} />
          </button>
        ) : (
          <button 
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 md:gap-2 px-8 md:px-12 py-3 md:py-4 bg-brand text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {t('post.posting')}
              </>
            ) : (
              t('post.completePost')
            )}
          </button>
        )}
      </div>
    </div>
  );
};
