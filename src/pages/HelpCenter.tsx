import React from 'react';
import { Search, ChevronRight, ShoppingBag, Tag, UserCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';

export const HelpCenter: React.FC = () => {
  const { t } = useAppContext();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedQuestion, setSelectedQuestion] = React.useState<string | null>(null);

  const FAQSList = [
    {
      category: t('helpPage.categories.buying') || 'Buying a car',
      icon: ShoppingBag,
      questions: [
        t('helpPage.questions.contactSeller') || 'How do I contact a seller?',
        t('helpPage.questions.checkBeforeBuying') || 'What should I check before buying?',
        t('helpPage.questions.priceNegotiable') || 'Are the prices negotiable?',
        t('helpPage.questions.spotScam') || 'How to spot a scam listing?'
      ]
    },
    {
      category: t('helpPage.categories.selling') || 'Selling a car',
      icon: Tag,
      questions: [
        t('helpPage.questions.costToList') || 'How much does it cost to list?',
        t('helpPage.questions.goodPhotos') || 'How to take good car photos?',
        t('helpPage.questions.adDuration') || 'How long does my ad stay active?',
        t('helpPage.questions.promoteListing') || 'Can I promote my listing?'
      ]
    },
    {
      category: t('helpPage.categories.account') || 'Account & login issues',
      icon: UserCircle,
      questions: [
        t('helpPage.questions.resetPassword') || 'How to reset my password?',
        t('helpPage.questions.changePhone') || 'Can I change my phone number?',
        t('helpPage.questions.deleteAccount') || 'How to delete my account?',
        t('helpPage.questions.whySuspended') || 'Why is my account suspended?'
      ]
    }
  ];

  const filteredFaqs = FAQSList.map(section => ({
    ...section,
    questions: section.questions.filter(q => 
      q.toLowerCase().includes(searchTerm.toLowerCase()) || 
      section.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.questions.length > 0);

  const getAnswer = (question: string) => {
    if (question === (t('helpPage.questions.deleteAccount') || 'How to delete my account?')) {
      return (
        <div className="space-y-4">
          <p>{t('helpPage.answers.deleteAccountIntro') || 'To delete your account, please follow these steps:'}</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>{t('helpPage.answers.deleteStep1') || 'Go to your Dashboard.'}</li>
            <li>{t('helpPage.answers.deleteStep2') || 'Click on the Settings tab.'}</li>
            <li>{t('helpPage.answers.deleteStep3') || 'Scroll to the bottom of the page.'}</li>
            <li>{t('helpPage.answers.deleteStep4') || 'Click on the Delete Account button.'}</li>
            <li>{t('helpPage.answers.deleteStep5') || 'Confirm your decision in the popup.'}</li>
          </ol>
          <p className="text-xs text-zinc-500 mt-4 italic">{t('helpPage.answers.permanentNote') || 'Note: This action is permanent and cannot be undone.'}</p>
        </div>
      );
    }
    
    if (question === (t('helpPage.questions.contactSeller') || 'How do I contact a seller?')) {
      return (
        <div className="space-y-4">
          <p>{t('helpPage.answers.contactIntro') || 'You can contact a seller directly through our platform:'}</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>{t('helpPage.answers.contactStep1') || 'Open the car listing you are interested in.'}</li>
            <li>{t('helpPage.answers.contactStep2') || 'Click the Call Seller button to see their phone number.'}</li>
            <li>{t('helpPage.answers.contactStep3') || 'Or click Send Message to start a real-time chat.'}</li>
          </ol>
        </div>
      );
    }

    return <p>{t('helpPage.answers.comingSoon') || 'Detailed guide is coming soon.'}</p>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-4">{t('helpPage.title') || 'Help Center'}</h1>
        <p className="text-zinc-500 mb-8">{t('helpPage.subtitle') || 'How can we help you today?'}</p>
        <div className="max-w-2xl mx-auto relative">
          <label htmlFor="help-search-input" className="sr-only">{t('helpPage.searchPlaceholder') || 'Search help articles'}</label>
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            id="help-search-input"
            name="helpSearch"
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('helpPage.searchPlaceholder') || 'Search for answers...'}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[32px] pl-14 pr-6 py-5 shadow-xl shadow-black/5 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredFaqs.map((section) => (
          <div key={section.category} className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-brand/10 p-3 rounded-2xl text-brand">
                <section.icon size={24} />
              </div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{section.category}</h2>
            </div>
            <div className="space-y-3">
              {section.questions.map((q) => (
                <div key={q} className="space-y-2">
                  <button 
                    onClick={() => setSelectedQuestion(selectedQuestion === q ? null : q)}
                    className={`w-full flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-left text-sm font-bold transition-all group shadow-sm ${selectedQuestion === q ? 'border-brand text-brand' : 'text-zinc-600 dark:text-zinc-400 hover:border-brand hover:text-brand'}`}
                  >
                    {q}
                    <ChevronRight size={16} className={`transition-transform duration-300 ${selectedQuestion === q ? 'rotate-90 text-brand' : 'text-zinc-300 group-hover:text-brand'}`} />
                  </button>
                  {selectedQuestion === q && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700"
                    >
                      {getAnswer(q)}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 bg-zinc-900 rounded-[40px] p-12 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <ShieldCheck size={200} />
        </div>
        <h2 className="text-3xl font-black mb-4 relative z-10">{t('helpPage.stillNeedHelp') || 'Still Need Help?'}</h2>
        <p className="text-zinc-400 mb-8 relative z-10">{t('helpPage.supportAvailable') || 'Our support team is available 24/7 to assist you.'}</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
          <button 
            onClick={() => window.location.href = 'tel:+251942712410'}
            className="btn-primary px-10"
          >
            {t('helpPage.callSupport') || 'Call Support'}
          </button>
          <button 
            onClick={() => window.location.href = 'tel:+251942712410'}
            className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            {t('helpPage.reportScam') || 'Report Scam'}
          </button>
        </div>
      </div>
    </div>
  );
};
