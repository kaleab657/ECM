import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'savedCarIds';

function getSaved(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setSaved(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useFavorites() {
  const [savedIds, setSavedIds] = useState<string[]>(() => getSaved());

  // Sync to localStorage whenever savedIds changes
  useEffect(() => {
    setSaved(savedIds);
  }, [savedIds]);

  const isSaved = useCallback((carId: string) => savedIds.includes(carId), [savedIds]);

  const toggleFavorite = useCallback((carId: string) => {
    setSavedIds(prev =>
      prev.includes(carId) ? prev.filter(id => id !== carId) : [...prev, carId]
    );
  }, []);

  return { savedIds, isSaved, toggleFavorite };
}
