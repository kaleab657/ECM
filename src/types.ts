export type Car = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  ownerTelegram?: string;
  ownerWhatsapp?: string;
  ownerSellerType?: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
  transmission: 'Manual' | 'Automatic';
  city: string;
  subCity?: string;
  description: string;
  imageURLs: string[];
  listingType: 'sale' | 'rent';
  status: 'approved' | 'pending' | 'sold' | 'pending_payment_verification' | 'rejected' | 'payment_rejected';
  condition: 'Used' | 'New';
  bodyType?: string;
  color?: string;
  engineSize?: string;
  priceType: 'Negotiable' | 'Slightly Negotiable' | 'Fixed Price' | 'Owner Call';
  saleType: 'Owner' | 'Broker' | 'Dealer';
  packageType: 'free' | 'featured' | 'premium';
  featured?: boolean;
  bankLoan?: boolean;
  bankLoanAmount?: number;
  fuelMileage?: string;
  driveType?: 'FWD' | 'RWD' | 'AWD' | '4WD';
  views?: number;
  createdAt: any;
};

export type ListingPackage = {
  id: 'free' | 'featured' | 'premium';
  name: string;
  price: number;
  duration: number;
  features: readonly string[];
};

export type PaymentRecord = {
  id?: string;
  userId: string;
  listingId: string;
  packageType: string;
  price: number;
  paymentMethod: 'CBE' | 'Telebirr';
  screenshotURL: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: any;
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  sellerType?: string;
  isVerified?: boolean;
  role?: 'admin' | 'user';
  isBanned?: boolean;
  banReason?: string;
  createdAt: any;
};

export type Page = 'home' | 'menu' | 'browse' | 'detail' | 'post' | 'auth' | 'dashboard' | 'valuation' | 'dealerships' | 'help' | 'safety' | 'privacy' | 'terms' | 'contact' | 'chat' | 'payment' | 'admin' | 'saved' | 'about' | 'support' | 'language' | 'featuredListings' | 'premiumListings';
