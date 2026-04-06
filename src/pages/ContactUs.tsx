import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle2, Instagram, Facebook } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const ContactUs: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useAppContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const fd = new FormData(e.target as HTMLFormElement);
    const name = fd.get('fullname') as string;
    const contactInfo = fd.get('contactInfo') as string;
    const message = fd.get('message') as string;
    
    const subject = encodeURIComponent('Support Request from App');
    const body = encodeURIComponent(`Full Name: ${name}\nEmail: ${contactInfo}\n\nMessage:\n${message}`);
    
    window.location.href = `mailto:ethiocarsmarket@gmail.com?subject=${subject}&body=${body}`;
    
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-6 leading-tight">{t('contactPage.title') || 'Get in Touch with EthioCars'}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-12 leading-relaxed">
            {t('contactPage.subtitle')}
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="bg-brand/10 p-4 rounded-2xl text-brand">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1">{t('contactPage.callUs') || 'Call Us'}</h3>
                <a href="tel:+251991152329" className="text-xl font-bold text-zinc-900 dark:text-white hover:text-brand transition-colors">+251 99 115 2329</a>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="bg-brand/10 p-4 rounded-2xl text-brand">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1">{t('contactPage.emailUs') || 'Email Us'}</h3>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">ethiocarsmarket@gmail.com</p>
              </div>
            </div>

            {/* Social Connect - NEW */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">{t('contactPage.connectWithUs') || 'Connect With Us'}</h3>
              <div className="flex gap-4">
                {[
                  { 
                    icon: (props: any) => (
                      <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    ), 
                    url: 'https://www.tiktok.com/@ethi.ocars', 
                    label: 'TikTok',
                    color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-black hover:text-white'
                  },
                  { 
                    icon: Send, 
                    url: 'https://t.me/ethiocars18', 
                    label: 'Telegram',
                    color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-[#0088cc] hover:text-white'
                  },
                  { 
                    icon: Instagram, 
                    url: 'https://www.instagram.com/ethi.ocars', 
                    label: 'Instagram',
                    color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-gradient-to-tr hover:from-amber-500 hover:to-purple-600 hover:text-white'
                  },
                  { 
                    icon: Facebook, 
                    url: 'https://www.facebook.com/share/18Aad51wxS/', 
                    label: 'Facebook',
                    color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-[#1877F2] hover:text-white'
                  }
                ].map((social) => (
                  <motion.a 
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={{ scale: 0.9, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${social.color}`}
                    aria-label={social.label}
                  >
                    <social.icon size={20} />
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-10 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/5">
          {submitted ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in duration-500">
              <div className="bg-emerald-100 dark:bg-emerald-500/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} className="text-emerald-600 dark:text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">{t('contactPage.messageSent') || 'Message Sent!'}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8">{t('contactPage.thankYou')}</p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-brand font-bold hover:underline"
              >
                {t('contactPage.sendAnother') || 'Send another message'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="contact-fullname" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('contactPage.fullName') || 'Full Name'}</label>
                <input
                  id="contact-fullname"
                  name="fullname"
                  required
                  type="text"
                  placeholder={t('contactPage.placeholderName') || 'John Doe'}
                  autoComplete="name"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="contact-email-phone" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('contactPage.emailPhone') || 'Email or Phone'}</label>
                <input
                  id="contact-email-phone"
                  name="contactInfo"
                  required
                  type="text"
                  placeholder={t('contactPage.placeholderInfo') || 'name@example.com'}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('contactPage.message') || 'Message'}</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  placeholder={t('contactPage.placeholderMessage') || 'How can we help you?'}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none dark:text-white"
                ></textarea>
              </div>
              <button type="submit" className="w-full btn-primary py-5 text-lg">
                <Send size={20} /> {t('contactPage.sendBtn') || 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
