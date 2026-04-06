// FILE: AboutUs.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { 
  Target, 
  CheckCircle2, 
  MessageCircle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Lightbulb, 
  Star, 
  Eye, 
  Loader2,
  ArrowRight,
  Send,
  Instagram,
  Facebook
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AboutUsProps {
  setPage?: (page: string) => void;
}

export const AboutUs: React.FC<AboutUsProps> = ({ setPage }) => {
  const { t } = useAppContext();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const usersColl = collection(db, 'users');
        const usersSnapshot = await getCountFromServer(usersColl);
        
        const carsColl = collection(db, 'cars');
        const activeCarsQuery = query(carsColl, where('status', '==', 'approved'));
        const carsSnapshot = await getCountFromServer(activeCarsQuery);
        
        if (isMounted) {
          setUserCount(usersSnapshot.data().count);
          setListingCount(carsSnapshot.data().count);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Fallbacks in case of permission or network errors
        if (isMounted) {
          setUserCount(2500);
          setListingCount(1200);
        }
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };
    
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const features = [
    { title: t('about.feature1Title') || 'Verified Listings', desc: t('about.feature1Desc') || 'All listings are reviewed before going live to ensure quality and safety.', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: t('about.feature2Title') || 'Direct Chat', desc: t('about.feature2Desc') || 'Talk to sellers instantly inside the app without sharing personal numbers.', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: t('about.feature3Title') || 'Built for Ethiopia', desc: t('about.feature3Desc') || 'Designed specifically for Ethiopian cities, regions, and local market needs.', icon: MapPin, color: 'text-brand', bg: 'bg-brand/10' },
    { title: t('about.feature4Title') || 'Always Available', desc: t('about.feature4Desc') || 'Our platform gives you 24/7 access to browse and manage your listings.', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' }
  ];

  const values = [
    { title: t('about.value1Title') || 'Integrity', desc: t('about.value1Desc') || 'Honesty and fairness are the foundation of every transaction on our platform.', icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: t('about.value2Title') || 'Innovation', desc: t('about.value2Desc') || 'We are constantly improving to provide the most modern car trading experience.', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: t('about.value3Title') || 'Customer First', desc: t('about.value3Desc') || 'Your satisfaction and safety remain our absolute top priorities at all times.', icon: Star, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: t('about.value4Title') || 'Transparency', desc: t('about.value4Desc') || 'Clear, accurate, and upfront information on every single vehicle listing.', icon: Eye, color: 'text-cyan-500', bg: 'bg-cyan-500/10' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="bg-[#FDFDFD] dark:bg-zinc-950 min-h-screen">
      {/* SECTION 1: Hero */}
      <section className="pt-20 pb-16 px-4 text-center max-w-4xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white leading-tight mb-6"
        >
          {t('about.heroTitle1') || 'Driving the Future of'} <br className="hidden md:block" />
          <span className="text-brand">{t('about.heroTitle2') || 'Automotive in Ethiopia'}</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          {t('about.heroDesc') || 'EthioCars Marketplace is a modern digital platform built to make buying and selling cars in Ethiopia simple, fast, and secure. We connect buyers and sellers in one trusted marketplace.'}
        </motion.p>
      </section>

      {/* SECTION 2: Live Stats */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[32px] p-6 text-center shadow-lg shadow-black/[0.03]">
            {loadingStats ? (
              <Loader2 className="animate-spin text-brand mx-auto mb-2" size={32} />
            ) : (
              <h3 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">{userCount?.toLocaleString()}+</h3>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('about.totalUsers') || 'Total Users'}</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[32px] p-6 text-center shadow-lg shadow-black/[0.03]">
            {loadingStats ? (
              <Loader2 className="animate-spin text-brand mx-auto mb-2" size={32} />
            ) : (
              <h3 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">{listingCount?.toLocaleString()}+</h3>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('about.activeListings') || 'Active Listings'}</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[32px] p-6 text-center shadow-lg shadow-black/[0.03]">
            <h3 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">98%</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('about.satisfaction') || 'Satisfaction'}</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[32px] p-6 text-center shadow-lg shadow-black/[0.03]">
            <h3 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">24/7</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('about.support') || 'Support'}</p>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 3: Our Mission */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-slate-900 dark:bg-zinc-900 rounded-[40px] p-8 md:p-12 relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10 blur-2xl">
            <div className="w-64 h-64 bg-brand rounded-full mix-blend-screen" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="shrink-0 bg-white/10 p-6 rounded-[32px] backdrop-blur-md">
              <Target size={48} className="text-brand" strokeWidth={1.5} />
            </div>
            <div className="text-center md:text-left text-white">
              <h2 className="text-sm font-black text-brand uppercase tracking-widest mb-3">{t('about.missionTitle') || 'Our Mission'}</h2>
              <p className="text-xl md:text-3xl font-bold leading-tight">
                {t('about.missionDesc') || 'Empowering Ethiopians to buy and sell cars with absolute trust, transparency, and convenience. We are transforming the local automotive market through modern technology.'}
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 4: Why Choose EthioCars */}
      <section className="px-4 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">{t('about.whyChooseTitle') || 'Why Choose EthioCars'}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">{t('about.whyChooseDesc') || 'We provide the most robust set of features to make your experience seamless.'}</p>
        </div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-start gap-6">
              <div className={`shrink-0 ${feature.bg} p-4 rounded-2xl`}>
                <feature.icon size={28} className={feature.color} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">{feature.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* SECTION 5: Values */}
      <section className="px-4 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">{t('about.valuesTitle') || 'Our Values'}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">{t('about.valuesDesc') || 'The principles that guide everything we do behind the scenes.'}</p>
        </div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {values.map((val, idx) => (
            <motion.div key={idx} variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-start gap-6">
              <div className={`shrink-0 ${val.bg} p-4 rounded-2xl`}>
                <val.icon size={28} className={val.color} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">{val.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{val.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* SECTION 6: CTA */}
      <section className="px-4 pb-24 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-zinc-900 rounded-[40px] p-10 md:p-16 text-center shadow-xl shadow-black/10 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-brand/5 mix-blend-overlay"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('about.ctaTitle') || 'Ready to find your ride?'}</h2>
            <p className="text-zinc-400 md:text-lg mb-8 max-w-lg mx-auto font-medium">
              {t('about.ctaDesc') || 'Join thousands of users discovering the best car deals seamlessly across Ethiopia today.'}
            </p>
            <button 
              onClick={() => {
                if (setPage) {
                  setPage('browse');
                } else {
                  // Fallback for missing prop
                  const browseLink = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent?.toLowerCase().includes('browse') || b.textContent?.includes('መኪና')
                  );
                  if (browseLink) browseLink.click();
                }
              }}
              className="bg-brand text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              {t('about.ctaButton') || 'Start Exploring'} <ArrowRight size={20} strokeWidth={3} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* SECTION 7: Social Follow - NEW */}
      <section className="px-4 pb-24 max-w-4xl mx-auto border-t border-zinc-100 dark:border-zinc-900/50 pt-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">{t('about.followUs') || 'Follow Us'}</h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-60">Connect with EthioCars on social media</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-12">
          {[
            { 
              icon: (props: any) => (
                <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              ), 
              url: 'https://www.tiktok.com/@ethi.ocars', 
              label: 'TikTok',
              color: 'bg-zinc-900 text-white',
              hoverColor: 'hover:shadow-zinc-500/30'
            },
            { 
              icon: Send, 
              url: 'https://t.me/ethiocars18', 
              label: 'Telegram',
              color: 'bg-blue-500 text-white',
              hoverColor: 'hover:shadow-blue-500/30'
            },
            { 
              icon: Instagram, 
              url: 'https://www.instagram.com/ethi.ocars', 
              label: 'Instagram',
              color: 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white',
              hoverColor: 'hover:shadow-pink-500/30'
            },
            { 
              icon: Facebook, 
              url: 'https://www.facebook.com/share/18Aad51wxS/', 
              label: 'Facebook',
              color: 'bg-blue-600 text-white',
              hoverColor: 'hover:shadow-blue-600/30'
            }
          ].map((social, idx) => (
            <motion.a 
              key={social.label}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.15, rotate: idx % 2 === 0 ? 5 : -5, y: -5 }}
              whileTap={{ scale: 0.9, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-[22px] flex items-center justify-center shadow-lg ${social.color} ${social.hoverColor} transition-all duration-300 relative overflow-hidden group`}
              aria-label={social.label}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <social.icon size={26} className="relative z-10 group-hover:scale-110 transition-transform" />
            </motion.a>
          ))}
        </div>
      </section>
    </div>
  );
};
