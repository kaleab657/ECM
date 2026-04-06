import { Car } from './types';

export const MAKES = [
  'Toyota', 'BYD', 'Mercedes-Benz', 'Hyundai', 'BMW', 'Ford', 'Volkswagen', 
  'Suzuki', 'Nissan', 'Isuzu', 'Audi', 'Honda', 'Lexus', 'Chevrolet', 'Tesla', 
  'Peugeot', 'Renault', 'Mazda', 'Subaru', 'Mitsubishi', 'Land Rover', 'Jaguar', 
  'Volvo', 'Porsche', 'Acura', 'Mini', 'Fiat', 'Alfa Romeo', 'Jeep', 'Dodge'
];

export const MODELS_BY_MAKE: Record<string, string[]> = {
  'Toyota': ['Corolla', 'Camry', 'Hilux', 'Land Cruiser', 'Rav4', 'Vitz', 'Yaris'],
  'BYD': ['E2', 'Dolphin', 'Atto 3', 'Seal', 'Han', 'Tang', 'Song'],
  'BMW': ['3 Series', '5 Series', 'X1', 'X3', 'X5', 'i3', 'iX'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLC', 'C200', 'E300'],
  'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Accent', 'Ioniq', 'Kona'],
  'Kia': ['Sportage', 'Sorento', 'Rio', 'Picanto', 'EV6', 'Niro'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Fit'],
  'Nissan': ['Patrol', 'Qashqai', 'X-Trail', 'Sunny', 'Leaf', 'Navara'],
  'Ford': ['Ranger', 'Explorer', 'Focus', 'F-150', 'Mustang', 'Everest'],
  'Chevrolet': ['Cruze', 'Captiva', 'Spark', 'Tahoe', 'Silverado'],
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
  'Audi': ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'e-tron'],
  'Volkswagen': ['Golf', 'ID.4', 'ID.6', 'Tiguan', 'Passat', 'Polo'],
  'Lexus': ['RX', 'NX', 'LX', 'ES', 'IS'],
  'Mazda': ['CX-5', 'CX-30', 'Mazda3', 'Mazda6'],
  'Mitsubishi': ['L200', 'Pajero', 'Outlander', 'ASX', 'Eclipse Cross'],
  'Isuzu': ['D-Max', 'N-Series', 'MU-X'],
  'Suzuki': ['Dzire', 'Swift', 'Vitara', 'Ertiga', 'Jimny'],
  'Peugeot': ['208', '3008', '5008', '2008'],
  'Renault': ['Kwid', 'Duster', 'Zoe', 'Megane'],
  'Jeep': ['Wrangler', 'Grand Cherokee', 'Compass', 'Renegade'],
  'Land Rover': ['Range Rover', 'Defender', 'Discovery', 'Evoque'],
};

export const LOCATIONS = [
  'Addis Ababa', 'Adama (Nazret)', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa', 
  'Bahir Dar', 'Jimma', 'Jigjiga', 'Dessie', 'Bishoftu (Debre Zeit)', 'Shashamane', 
  'Arba Minch', 'Hosaena', 'Harar', 'Dilla', 'Nekemte', 'Debre Birhan', 'Asella', 
  'Kombolcha', 'Debre Markos', 'Wolkite', 'Gambela', 'Semera', 'Assosa'
];

export const ADDIS_ABABA_SUB_CITIES = [
  'Bole',
  'Yeka',
  'Arada',
  'Lideta',
  'Gullele',
  'Kolfe Keranio',
  'Nifas Silk',
  'Akaki Kaliti',
  'Kirkos',
  'Addis Ketema',
  'Lemi Kura'
];

export const BODY_TYPES = [
  'Sedan', 'SUV', 'Pickup', 'Hatchback', 'Coupe', 'Van', 'Truck', 'Minivan', 'Convertible'
];

export const PRICE_TYPES = [
  'Fixed Price', 'Negotiable', 'Slightly Negotiable', 'On Call', 'Per Day'
];

export const SELLER_TYPES = [
  'Private Seller', 'Broker', 'Dealer', 'Import & Export'
];

export const BASE_PRICES: Record<string, number> = {
  'Toyota Corolla': 2500000,
  'Toyota Vitz': 1200000,
  'Toyota Hilux': 5500000,
  'Hyundai Tucson': 4500000,
  'Hyundai Accent': 1800000,
  'Suzuki Dzire': 1700000,
  'Suzuki Swift': 1500000,
  'Mercedes-Benz C200': 3500000,
  'Mercedes-Benz E300': 5500000,
  'BYD E2': 2800000,
  'BYD Dolphin': 3200000,
  'Kia Sportage': 4200000,
  'Isuzu D-Max': 4800000,
};

export const LOGO_LIGHT = 'path-to-your-light-logo';
export const LOGO_DARK = 'path-to-your-dark-logo';

export const LISTING_PACKAGES = [
  {
    id: 'free',
    name: 'Normal listing',
    price: 0,
    duration: 15,
    features: ['Appears in latest listings only', 'Auto expires after 15 days']
  },
  {
    id: 'featured',
    name: 'Featured Plan',
    price: 300,
    duration: 30,
    features: ['Homepage exposure', 'Featured section visibility', 'Auto expires after 30 days']
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 600,
    duration: 0, // 0 signifies no expiry
    features: ['Maximum exposure', 'Always first placement', 'Auto boost visibility', 'Active until you delete']
  }
] as const;
