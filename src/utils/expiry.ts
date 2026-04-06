import { Car } from '../types';
import { LISTING_PACKAGES } from '../constants';

/**
 * Checks if a listing has expired based on its package duration.
 * Free -> 15 days
 * Featured -> 30 days
 * Premium -> 0 (no expiry)
 */
export const isListingExpired = (car: Car): boolean => {
  if (!car || !car.createdAt) return false;
  
  const pkg = LISTING_PACKAGES.find(p => p.id === car.packageType);
  if (!pkg || pkg.duration === 0) return false;

  let createdDate: Date;
  if (typeof car.createdAt === 'string') {
    createdDate = new Date(car.createdAt);
  } else if (car.createdAt && (car.createdAt as any).seconds) {
    createdDate = new Date((car.createdAt as any).seconds * 1000);
  } else if (car.createdAt instanceof Date) {
    createdDate = car.createdAt;
  } else {
    return false;
  }

  const now = new Date();
  const diffTime = now.getTime() - createdDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays > pkg.duration;
};
