import React, { useState } from 'react';
import { Calculator, Info, ArrowRight } from 'lucide-react';
import { MAKES, BASE_PRICES } from '../constants';
import { useAppContext } from '../context/AppContext';
import { BottomSheetSelect } from '../components/BottomSheetSelect';

export const Valuation: React.FC = () => {
  const { t } = useAppContext();
  const [valuation, setValuation] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    mileage: '0'
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.make || !formData.model || !formData.year || !formData.mileage) {
       alert('Please complete all fields');
       return;
    }
    
    const basePrices: Record<string, number> = {
      Toyota: 3500000,
      Hyundai: 3000000,
      Mercedes: 6000000,
      BMW: 5500000,
      Suzuki: 2500000,
      Ford: 3200000,
      Volkswagen: 4000000
    };
    
    const defaultBase = 2800000;
    const basePrice = basePrices[formData.make] || defaultBase;
    
    const year = parseInt(formData.year);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    const priceAfterAge = basePrice * (1 - (age * 0.05));
    
    const mileage = parseInt(formData.mileage);
    const mileageFactor = mileage / 100000;
    const priceAfterMileage = priceAfterAge * (1 - (mileageFactor * 0.1));
    
    const estimatedPrice = Math.max(priceAfterMileage, basePrice * 0.3);
    setValuation(Math.round(estimatedPrice));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-4">{t('valuation.title')}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">{t('valuation.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div>
              <label htmlFor="valuation-make" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('valuation.make')}</label>
              <BottomSheetSelect 
                id="valuation-make"
                name="make"
                value={formData.make}
                onChange={(e) => setFormData({...formData, make: e.target.value, model: ''})}
                label={t('valuation.selectMake') || 'Select Make'}
                options={MAKES.map(m => ({ value: m, label: m }))}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="valuation-model" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('valuation.model')}</label>
              <input 
                id="valuation-model"
                name="model"
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                placeholder={t('valuation.modelPlaceholder') || 'e.g. Corolla'} 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="valuation-year" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('valuation.year')}</label>
                <input 
                  id="valuation-year"
                  name="year"
                  required 
                  type="number" 
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  placeholder="e.g. 2018" 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:text-white" 
                />
              </div>
              <div>
                <label htmlFor="valuation-mileage" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('valuation.mileage')}</label>
                <input 
                  id="valuation-mileage"
                  name="mileage"
                  required 
                  type="number" 
                  value={formData.mileage}
                  onChange={(e) => setFormData({...formData, mileage: e.target.value})}
                  placeholder="e.g. 45000" 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:text-white" 
                />
              </div>
            </div>
            <button type="submit" className="w-full btn-primary py-4">
              <Calculator size={20} /> {t('valuation.calculate')}
            </button>
          </form>
        </div>

        <div className="flex flex-col justify-center">
          {valuation ? (
            <div className="bg-brand/5 rounded-[32px] p-8 border border-brand/10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-sm font-bold text-brand uppercase tracking-widest mb-2">{t('valuation.estimatedValue')}</p>
              <h2 className="text-5xl font-black text-brand tracking-tighter mb-4">
                ETB {valuation.toLocaleString()}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold leading-relaxed mb-6">
                {t('valuation.marketAverage') || 'Estimate based on market averages'}
              </p>
            </div>
          ) : (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 text-center">
              <div className="bg-white dark:bg-zinc-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Info size={32} className="text-zinc-300 dark:text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{t('valuation.readyTitle')}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t('valuation.readyDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
