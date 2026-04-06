import React from 'react';
import { ShieldCheck, Eye, MapPin, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const SafetyGuidelines: React.FC = () => {
  const { t } = useAppContext();
  
  const tips = [
    {
      title: t('safetyPage.meetPublic') || 'Meet in Public',
      desc: t('safetyPage.meetPublicDesc') || 'Always arrange meetings in busy, well-lit public places like shopping malls or gas stations.',
      icon: MapPin,
      color: 'bg-blue-500'
    },
    {
      title: t('safetyPage.inspect') || 'Inspect Thoroughly',
      desc: t('safetyPage.inspectDesc') || 'Never buy a car without seeing it in person and having a trusted mechanic inspect it.',
      icon: Eye,
      color: 'bg-emerald-500'
    },
    {
      title: t('safetyPage.securePayments') || 'Secure Payments',
      desc: t('safetyPage.securePaymentsDesc') || 'Avoid wire transfers or paying in advance. Use secure bank transfers once the deal is finalized.',
      icon: ShieldCheck,
      color: 'bg-brand'
    },
    {
      title: t('safetyPage.verifyDocs') || 'Verify Documents',
      desc: t('safetyPage.verifyDocsDesc') || 'Check the vehicle registration, service history, and ownership documents carefully.',
      icon: CheckCircle2,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <div className="bg-brand/10 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} className="text-brand" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-4">{t('safetyPage.title') || 'Safety Guidelines'}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">{t('safetyPage.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {tips.map((tip) => (
          <div key={tip.title} className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex gap-6 items-start">
            <div className={`${tip.color} p-4 rounded-2xl text-white shrink-0 shadow-lg`}>
              <tip.icon size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">{tip.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
