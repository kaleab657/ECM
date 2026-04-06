import React, { useState } from 'react';
import { FileText, Lock } from 'lucide-react';

type Lang = 'en' | 'am';

const termsData: Record<Lang, {
  title: string;
  intro: string;
  terms: string[];
}> = {
  en: {
    title: 'Terms of Use',
    intro: 'By using EthioCars, you agree to the following terms:',
    terms: [
      '1. You must provide accurate and truthful information when creating an account.',
      '2. You are responsible for all listings you post, including vehicle details, images, and pricing.',
      '3. You must not post illegal, misleading, or fraudulent content.',
      '4. EthioCars is a marketplace platform and is not responsible for transactions between buyers and sellers.',
      '5. You are responsible for your communication and interactions with other users.',
      '6. We reserve the right to remove listings or suspend accounts that violate these terms.',
      '7. By continuing to use the app, you agree to follow these rules.'
    ]
  },
  am: {
    title: 'የአጠቃቀም ደንቦች',
    intro: 'ኢትዮ ካርስን በመጠቀም፣ በሚከተሉት ደንቦች ተስማምተዋል፡',
    terms: [
      '1. መለያ ሲፈጥሩ ትክክለኛ እና እውነተኛ መረጃ ማቅረብ አለብዎት።',
      '2. ለሚለጥፏቸው ማስታወቂያዎች በሙሉ፣ የተሽከርካሪ ዝርዝሮችን፣ ምስሎችን እና ዋጋን ጨምሮ ኃላፊነት ይወስዳሉ።',
      '3. ሕገ-ወጥ፣ አሳሳች ወይም ማጭበርበር የሆኑ ይዘቶችን መለጠፍ የለብዎትም።',
      '4. ኢትዮ ካርስ የገበያ መድረክ ሲሆን በገዢዎች እና ሻጮች መካከል ለሚደረጉ ግብይቶች ኃላፊነት አይወስድም።',
      '5. ከሌሎች ተጠቃሚዎች ጋር ለሚያደርጉት ግንኙነት እና ልውውጥ ኃላፊነት ይወስዳሉ።',
      '6. እነዚህን ደንቦች የሚጥሱ ማስታወቂያዎችን የማስወገድ ወይም መለያዎችን የማገድ መብት አለን።',
      '7. መተግበሪያውን መጠቀሞን በመቀጠል፣ እነዚህን ህጎች ለመከተል ተስማምተዋል ማለት ነው።'
    ]
  }
};

export const TermsOfUse: React.FC = () => {
  const [lang, setLang] = useState<Lang>('en');
  const content = termsData[lang];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-10 md:p-16 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        
        {/* Header & Language Toggle */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl shrink-0">
              <FileText size={24} className="text-zinc-900 dark:text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
              {content.title}
            </h1>
          </div>
          
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 shrink-0">
            <button
              onClick={() => setLang('en')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${lang === 'en' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('am')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${lang === 'am' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Amharic
            </button>
          </div>
        </div>

        <div className="prose prose-zinc max-w-none text-zinc-600 dark:text-zinc-400">
          <p className="text-lg font-bold mb-8 text-zinc-900 dark:text-white">
            {content.intro}
          </p>

          <div className="space-y-6">
            {content.terms.map((term, idx) => (
              <div key={idx} className="flex gap-4 p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                <span className="text-brand font-black text-xl">{idx + 1}.</span>
                <p className="leading-relaxed font-medium m-0 mt-0.5">
                  {term.replace(/^\d+\.\s*/, '')}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
