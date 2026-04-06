import { useAppContext } from '../context/AppContext';

export function useFavorites() {
  const { savedIds, isSaved, toggleFavorite } = useAppContext();
  return { savedIds, isSaved, toggleFavorite };
}
