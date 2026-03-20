import React, { useState, useRef } from 'react';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Info, X, Loader2, ChevronRight, ChevronLeft, CheckCircle2, DollarSign, MapPin, Car as CarIcon, User, Package, ChevronDown } from 'lucide-react';
import { MAKES, MODELS_BY_MAKE, LOCATIONS, ADDIS_ABABA_SUB_CITIES, BODY_TYPES, PRICE_TYPES, SELLER_TYPES, LISTING_PACKAGES } from '../constants';
import { useAppContext } from '../context/AppContext';
import { Car, Page, ListingPackage } from '../types';
import { db } from '../lib/firebase';
import { collection, serverTimestamp, doc, writeBatch, setDoc } from 'firebase/firestore';
import { apiUpload } from '../lib/api-client';
import { compressImage } from '../utils/image-utils';

// Custom dropdown — replaces native <select> to avoid Android WebView white popup
interface CustomSelectProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ id, name, value, onChange, disabled, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse options from children
  const options: { value: string; label: string }[] = [];
  React.Children.forEach(children, (child: any) => {
    if (child?.type === 'option') {
      options.push({ value: child.props.value ?? '', label: child.props.children ?? '' });
    }
  });

  const selected = options.find(o => o.value === value);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (opt: { value: string; label: string }) => {
    const syntheticEvent = {
      target: { name, value: opt.value, type: 'select-one' },
      currentTarget: { name, value: opt.value }
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold text-left flex items-center justify-between gap-2 disabled:opacity-50 ${!selected?.value ? 'text-zinc-400' : 'text-zinc-900 dark:text-white'}`}
      >
        <span className="truncate">{selected?.label || options[0]?.label || 'Select...'}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${opt.value === value ? 'bg-brand text-white' : 'text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700'} ${!opt.value ? 'text-zinc-400' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface PostCarProps {
  setPage: (page: Page) => void;
  setPendingListingId: (id: string) => void;
}

export const PostCar: React.FC<PostCarProps> = ({ setPage, setPendingListingId }) => {
  const { user, profile, t } = useAppContext();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CAR_COLORS = [
    'White', 'Black', 'Silver', 'Gray', 'Blue', 'Red', 'Green',
    'Yellow', 'Brown', 'Gold', 'Orange', 'Purple', 'Beige', 'Other'
  ];

  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    model: '',
    year: new Date().getFullYear().toString(),
    price: '',
    priceType: 'Fixed Price',
    mileage: '',
    fuel: '',
    transmission: '',
    bodyType: '',
    color: '',
    engineSize: '',
    city: '',
    subCity: '',
    description: '',
    condition: '' as '' | 'Used' | 'New',
    listingType: '' as '' | 'sale' | 'rent',
    saleType: 'Owner' as 'Owner' | 'Broker' | 'Dealer',
    sellerPhone: profile?.phoneNumber || '',
    packageType: 'free',
    bankLoan: false,
    bankLoanAmount: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      if (images.length + newFiles.length > 4) {
        showToast(t('post.errorMaxImages') || 'Maximum 4 images allowed', 'warning');
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
          showToast('Listing title is required', 'warning'); return false;
        }
        if (!formData.city) {
          showToast('City is required', 'warning'); return false;
        }
        if (!formData.condition) {
          showToast('Condition is required', 'warning'); return false;
        }
        if (!formData.listingType) {
          showToast('Listing type is required', 'warning'); return false;
        }
        return true;
      case 2:
        if (!formData.brand) { showToast('Make is required', 'warning'); return false; }
        if (!formData.model) { showToast('Model is required', 'warning'); return false; }
        if (!formData.year) { showToast('Year is required', 'warning'); return false; }
        if (!formData.mileage) { showToast('Mileage is required', 'warning'); return false; }
        if (!formData.transmission) { showToast('Transmission is required', 'warning'); return false; }
        if (!formData.fuel) { showToast('Fuel type is required', 'warning'); return false; }
        if (!formData.bodyType) { showToast('Body type is required', 'warning'); return false; }
        // Color and engineSize are optional — no validation needed
        return true;
      case 3:
        if (!formData.price) {
          showToast(t('post.errorPrice') || 'Please enter a price', 'warning');
          return false;
        }
        return true;
      case 4:
        if (!formData.sellerPhone) {
          showToast(t('post.errorPhone') || 'Please enter your phone number', 'warning');
          return false;
        }
        return true;
      case 5:
        if (images.length === 0) {
          showToast(t('post.errorImageRequired') || 'Please upload at least one image', 'warning');
          return false;
        }
        return true;
      default:
        return true;
    }
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
    if (images.length === 0) {
      showToast(t('post.errorImageRequired') || 'Please upload at least one image', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      showToast(t('post.uploading') || 'Uploading images...', 'info');

      // 1. Upload images to R2 via Express server proxy (SEQUENTIAL to prevent OOM on Android)
      const listingId = Math.random().toString(36).substring(2, 15);
      const imageUrls: string[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          const compressedBlob = await compressImage(image).catch(err => {
            console.warn('Compression failed, using original:', err);
            return image;
          });

          const imageName = `image-${i + 1}-${Date.now()}`;
          const key = `listings/${user.uid}/${listingId}/${imageName}.jpg`;

          const uploadResponse = await apiUpload(
            `/api/r2/upload-listing?fileName=${encodeURIComponent(imageName)}&fileType=image/jpeg&customKey=${encodeURIComponent(key)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'image/jpeg',
                'Authorization': `Bearer ${idToken}`
              },
              body: await compressedBlob.arrayBuffer()
            }
          );

          if (!uploadResponse.ok) {
            const contentType = uploadResponse.headers.get('content-type');
            let errorMsg = 'Failed to upload image';
            if (contentType && contentType.includes('application/json')) {
              const errorData = await uploadResponse.json();
              errorMsg = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || errorMsg);
            }
            throw new Error(errorMsg);
          }

          const { publicUrl } = await uploadResponse.json();
          imageUrls.push(publicUrl);
        } catch (uploadErr: any) {
          console.error(`ERROR: Image ${i + 1} upload failed:`, uploadErr);
          throw new Error(`Image ${i + 1} upload failed: ${uploadErr.message}`);
        }
      }

      const isPaid = formData.packageType !== 'free';
      
      const listingPayload = {
        id: listingId,
        ownerId: user.uid,
        ownerName: profile?.displayName || user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        ownerPhone: formData.sellerPhone,
        ownerSellerType: formData.saleType,
        ...formData,
        year: parseInt(formData.year.toString().replace(/[^0-9]/g, '')) || new Date().getFullYear(),
        price: parseFloat(formData.price.toString().replace(/[^0-9.]/g, '')) || 0,
        mileage: parseFloat(formData.mileage.toString().replace(/[^0-9.]/g, '')) || 0,
        bankLoanAmount: formData.bankLoanAmount ? (parseFloat(formData.bankLoanAmount.toString().replace(/[^0-9.]/g, '')) || 0) : undefined,
        imageURLs: imageUrls,
        status: isPaid ? 'pending_payment_verification' : 'pending',
        views: 0,
        createdAt: new Date().toISOString()
      };

      if (isPaid) {
        // Store temporary listing data
        sessionStorage.setItem('pendingListing', JSON.stringify(listingPayload));
        setPendingListingId(listingId);
        showToast(t('post.redirectingPayment') || 'Redirecting to payment...', 'info');
        setPage('payment');
      } else {
        // 2. Save car data directly to Firestore
        const carRef = doc(db, 'cars', listingId);
        await setDoc(carRef, {
          ...listingPayload,
          createdAt: serverTimestamp()
        });

        showToast(t('post.success') || 'Listing posted successfully!', 'success');
        setPage('home');
      }
    } catch (error: any) {
      console.error('ERROR: Post listing failed:', error);
      const msg = (t('post.errorPosting') || 'Failed to post listing: ') + error.message;
      showToast(msg, 'error');
      alert(`Submission Error: ${msg}`); // Explicit alert so user doesn't miss the failure reason
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="condition" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.condition') || 'Condition'}</label>
                    <CustomSelect 
                      id="condition"
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                    >
                      <option value="">{t('post.selectCondition') || 'Select Condition'}</option>
                      <option value="Used">{t('search.used')}</option>
                      <option value="New">{t('search.new')}</option>
                    </CustomSelect>
                  </div>
                  <div>
                    <label htmlFor="listingType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.listingType') || 'Listing Type'}</label>
                    <CustomSelect 
                      id="listingType"
                      name="listingType"
                      value={formData.listingType}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                    >
                      <option value="">{t('post.selectListingType') || 'Select Listing Type'}</option>
                      <option value="sale">{t('nav.sell')}</option>
                      <option value="rent">{t('nav.rent')}</option>
                    </CustomSelect>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.location') || 'City'}</label>
                    <CustomSelect 
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                    >
                      <option value="">{t('post.selectCity') || 'Select City'}</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{t(`locations.${l}`) || l}</option>)}
                    </CustomSelect>
                  </div>
                  {formData.city === 'Addis Ababa' && (
                    <div>
                      <label htmlFor="subCity" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.subCity') || 'Sub City'}</label>
                      <CustomSelect 
                        id="subCity"
                        name="subCity"
                        value={formData.subCity}
                        onChange={handleInputChange}
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                      >
                        <option value="">{t('search.anySubCity') || 'Select Sub City'}</option>
                        {ADDIS_ABABA_SUB_CITIES.map(sc => <option key={sc} value={sc}>{t(`subcities.${sc}`) || sc}</option>)}
                      </CustomSelect>
                    </div>
                  )}
                </div>
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
                  <CustomSelect 
                    id="brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  >
                    <option value="">{t('search.anyMake') || 'Select Make'}</option>
                    {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </CustomSelect>
                </div>
                <div>
                  <label htmlFor="model" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.model') || 'Model'}</label>
                  <CustomSelect 
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    disabled={!formData.brand}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none disabled:opacity-50"
                  >
                    <option value="">{t('search.anyModel') || 'Select Model'}</option>
                    {formData.brand && MODELS_BY_MAKE[formData.brand]?.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </CustomSelect>
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
                    type="number"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    placeholder="e.g. 45000"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="transmission" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.transmission') || 'Transmission'}</label>
                  <CustomSelect 
                    id="transmission"
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  >
                    <option value="">{t('post.selectTransmission') || 'Select Transmission'}</option>
                    <option value="Automatic">{t('common.automatic')}</option>
                    <option value="Manual">{t('common.manual')}</option>
                  </CustomSelect>
                </div>
                <div>
                  <label htmlFor="fuel" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('search.fuel') || 'Fuel Type'}</label>
                  <CustomSelect 
                    id="fuel"
                    name="fuel"
                    value={formData.fuel}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  >
                    <option value="">{t('post.selectFuelType') || 'Select Fuel Type'}</option>
                    <option value="Petrol">{t('common.petrol')}</option>
                    <option value="Diesel">{t('common.diesel')}</option>
                    <option value="Hybrid">{t('common.hybrid')}</option>
                    <option value="Electric">{t('common.electric')}</option>
                  </CustomSelect>
                </div>
                <div>
                  <label htmlFor="bodyType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.bodyType') || 'Body Type'}</label>
                  <CustomSelect 
                    id="bodyType"
                    name="bodyType"
                    value={formData.bodyType}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  >
                    <option value="">{t('post.selectBodyType') || 'Select Body Type'}</option>
                    {BODY_TYPES.map(type => <option key={type} value={type}>{t(`bodyTypes.${type}`) || type}</option>)}
                  </CustomSelect>
                </div>
                <div>
                  <label htmlFor="engineSize" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.engineSize') || 'Engine Size'} <span className="text-zinc-300">({t('common.optional') || 'Optional'})</span></label>
                  <input 
                    id="engineSize"
                    name="engineSize"
                    value={formData.engineSize}
                    onChange={handleInputChange}
                    placeholder="e.g. 1.6L"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="color" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.color') || 'Color'} <span className="text-zinc-300">({t('common.optional') || 'Optional'})</span></label>
                  <CustomSelect
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  >
                    <option value="">{t('post.selectColor') || 'Select Color'}</option>
                    {CAR_COLORS.map(c => <option key={c} value={c}>{t(`colors.${c}`) || c}</option>)}
                  </CustomSelect>
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
                  <label htmlFor="price" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('sell.price') || 'Price (ETB)'}</label>
                  <input 
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 1500000"
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  />
                </div>
                <div>
                  <label htmlFor="priceType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('detail.priceType') || 'Price Type'}</label>
                  <CustomSelect 
                    id="priceType"
                    name="priceType"
                    value={formData.priceType}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  >
                    {PRICE_TYPES.map(type => <option key={type} value={type}>{t(`priceTypes.${type}`) || type}</option>)}
                  </CustomSelect>
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
                      type="number"
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
                  <label htmlFor="saleType" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.iAmA') || 'I am a'}</label>
                  <CustomSelect 
                    id="saleType"
                    name="saleType"
                    value={formData.saleType}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none text-zinc-900 dark:text-white appearance-none"
                  >
                    {SELLER_TYPES.map(type => <option key={type} value={type}>{t(`sellerTypes.${type}`) || type}</option>)}
                  </CustomSelect>
                </div>
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
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('post.uploadPhotos') || 'Upload Photos (Max 4)'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                    {previews.map((p, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                        <img src={p} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeImage(i)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {previews.length < 4 && (
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
                {LISTING_PACKAGES.map((pkg) => (
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
                      {t(`packages.${pkg.id}.name`) || pkg.name}
                    </h3>
                    <p className="text-brand font-black text-lg mb-4">{pkg.price === 0 ? t('postSteps.free') : `${pkg.price} ETB`}</p>
                    <ul className="space-y-2">
                      {((t(`packages.${pkg.id}.features`, { returnObjects: true }) as any) || pkg.features).map((f: string, i: number) => (
                        <li key={i} className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <div className="w-1 h-1 bg-brand rounded-full" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12">
      <div className="mb-8 md:mb-12 text-center">
        <h1 className="text-xl md:text-4xl font-black text-zinc-900 dark:text-white mb-6 italic uppercase tracking-tight">{t('post.title') || 'Post Your Car'}</h1>
        <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div 
              key={step}
              className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ${
                step === currentStep ? 'w-8 md:w-12 bg-brand' : step < currentStep ? 'w-3 md:w-4 bg-brand/30' : 'w-3 md:w-4 bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Step {currentStep} of 6</p>
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      <div className="mt-8 md:mt-12 flex justify-between items-center">
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
