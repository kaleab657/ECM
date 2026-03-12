import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const ContactUs: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useAppContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                <a href="tel:+251942712410" className="text-xl font-bold text-zinc-900 dark:text-white hover:text-brand transition-colors">+251 942 7124 10</a>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="bg-brand/10 p-4 rounded-2xl text-brand">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-1">{t('contactPage.emailUs') || 'Email Us'}</h3>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">ethiocarsmarketplace@gmail.com</p>
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
