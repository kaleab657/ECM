import React, { useState, useEffect } from 'react';
import { MapPin, Phone, ExternalLink, Award, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

interface Dealer {
  id: string;
  name: string;
  location: string;
  phone: string;
  verified: boolean;
  inventoryUrl?: string;
}

export const Dealerships: React.FC = () => {
  const { t } = useAppContext();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'dealerships'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dealerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Dealer[];
      setDealers(dealerData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'dealerships');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-4">{t('dealerships.title')}</h1>
        <p className="text-zinc-500 dark:text-zinc-400">{t('dealerships.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-brand" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dealers.length > 0 ? (
            dealers.map((dealer) => (
              <div key={dealer.id} className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-zinc-50 dark:bg-zinc-800 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-brand/5 transition-colors">
                    <Award size={32} className={dealer.verified ? 'text-brand' : 'text-zinc-300 dark:text-zinc-600'} />
                  </div>
                  {dealer.verified && (
                    <span className="bg-brand/10 text-brand text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {t('dealerships.verified')}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight">{dealer.name}</h3>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                    <MapPin size={18} className="text-zinc-300 dark:text-zinc-600" />
                    <span>{dealer.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                    <Phone size={18} className="text-zinc-300 dark:text-zinc-600" />
                    <span>{dealer.phone}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (dealer.inventoryUrl) {
                      window.open(dealer.inventoryUrl, '_blank');
                    } else {
                      alert(t('dealerships.comingSoon'));
                    }
                  }}
                  className="w-full py-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-zinc-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
                >
                  {t('dealerships.viewInventory')} <ExternalLink size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-zinc-50 dark:bg-zinc-900 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-400 font-bold">{t('dealerships.noDealers')}</p>
              <button 
                onClick={() => window.location.href = 'mailto:partners@ethiocars.com'}
                className="mt-4 text-brand font-black uppercase tracking-widest text-xs hover:underline"
              >
                {t('dealerships.registerPartner')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
