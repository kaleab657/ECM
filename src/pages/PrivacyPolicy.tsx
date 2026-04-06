import React, { useState } from 'react';
import { Lock } from 'lucide-react';

type Lang = 'en' | 'am';

interface Section {
  title: string;
  content: string[];
  list?: string[];
}

const contentData: Record<Lang, {
  title: string;
  effective: string;
  sections: Section[];
}> = {
  en: {
    title: 'Privacy Policy',
    effective: 'Effective Date:',
    sections: [
      {
        title: '1. Introduction',
        content: [
          'Welcome to EthioCars. This app is designed to help users buy and sell vehicles in Ethiopia.',
          'This Privacy Policy explains what information we collect, how we use it, and how we protect it. By using EthioCars, you agree to the practices described here.'
        ]
      },
      {
        title: '2. Information We Collect',
        content: ['When you use EthioCars, we may collect the following information:'],
        list: [
          '- Your name',
          '- Your email address',
          '- Your phone number',
          '- Your selected role (private seller, broker, dealer, etc.)',
          '- Car listings you create, including images and descriptions',
          '- Messages you send or receive through the app',
          '- Basic device and usage information to help us improve the app'
        ]
      },
      {
        title: '3. How We Use Your Information',
        content: ['We use the information we collect for the following purposes:'],
        list: [
          '- To create and manage your account',
          '- To allow you to post, edit, and manage vehicle listings',
          '- To enable messaging between buyers and sellers',
          '- To improve app performance and fix issues',
          '- To communicate important updates to you'
        ]
      },
      {
        title: '4. Data Sharing',
        content: [
          'We do not sell your personal information to anyone.',
          'We may share limited information with trusted service providers who help us run the app. We only share what is necessary, and we require those providers to protect your data.'
        ]
      },
      {
        title: '5. Data Storage and Security',
        content: [
          'Your data is stored securely using industry-standard cloud services.',
          'We take reasonable measures to protect your information from unauthorized access, loss, or misuse. However, no system can guarantee complete security.'
        ]
      },
      {
        title: '6. Your Rights',
        content: ['As a user of EthioCars, you have the right to:'],
        list: [
          '- View and update your personal information at any time',
          '- Request deletion of your account and associated data'
        ]
      },
      {
        title: '7. Account Deletion',
        content: [
          'If you choose to delete your account, your profile and related data will be removed from our system. You can request account deletion through the app settings.'
        ]
      },
      {
        title: '8. Children\'s Privacy',
        content: [
          'EthioCars is not intended for use by children under the age of 13. We do not knowingly collect information from children. If we become aware that a child has provided us with personal data, we will take steps to remove it.'
        ]
      },
      {
        title: '9. Changes to This Policy',
        content: [
          'We may update this Privacy Policy from time to time. If we make changes, the effective date at the top of this page will be updated. Your continued use of the app after any changes means you accept the updated policy.'
        ]
      },
      {
        title: '10. Contact Us',
        content: ['If you have any questions about this Privacy Policy, you can reach us at:'],
        list: [
          '- Email: ethiocarsmarket@gmail.com',
          '- Phone: +251 99 115 2329'
        ]
      }
    ]
  },
  am: {
    title: 'የግላዊነት ፖሊሲ',
    effective: 'የተሻሻለበት ቀን፡',
    sections: [
      {
        title: '1. መግቢያ',
        content: [
          'እንኳን ወደ ኢትዮ ካርስ በደህና መጡ። ይህ መተግበሪያ ተጠቃሚዎች በኢትዮጵያ ውስጥ ተሽከርካሪዎችን እንዲገዙ እና እንዲሸጡ ለማገዝ የተዘጋጀ ነው።',
          'ይህ የግላዊነት ፖሊሲ ምን መረጃ እንደምንሰበስብ፣ እንዴት እንደምንጠቀምበት እና እንዴት እንደምንጠብቀው ያብራራል። ኢትዮ ካርስን በመጠቀም፣ እዚህ በተገለጹት አሠራሮች ተስማምተዋል ማለት ነው።'
        ]
      },
      {
        title: '2. የምንሰበስበው መረጃ',
        content: ['ኢትዮ ካርስን ሲጠቀሙ የሚከተሉትን መረጃዎች ልንሰበስብ እንችላለን፦'],
        list: [
          '- ስምዎ',
          '- የኢሜይል አድራሻዎ',
          '- ስልክ ቁጥርዎ',
          '- የመረጡት ሚና (የግል ሻጭ፣ ደላላ፣ መኪና ተራ፣ ወዘተ)',
          '- የሚፈጥሩት የመኪና ማስታወቂያዎች፣ ምስሎች እና መግለጫዎችን ጨምሮ',
          '- በመተግበሪያው ውስጥ የሚላኩ ወይም የሚቀበሉት መልዕክቶች',
          '- መተግበሪያውን ለማሻሻል የሚረዳ መሰረታዊ የመሣሪያ እና የአጠቃቀም መረጃ'
        ]
      },
      {
        title: '3. መረጃዎን እንዴት እንደምንጠቀምበት',
        content: ['የምንሰበስበውን መረጃ ለሚከተሉት ዓላማዎች እንጠቀምበታለን፦'],
        list: [
          '- መለያዎን ለመፍጠር እና ለማስተዳደር',
          '- የተሽከርካሪ ማስታወቂያዎችን ለመለጠፍ፣ ለማረም እና ለማስተዳደር',
          '- በገዢዎች እና ሻጮች መካከል የመልዕክት ልውውጥ እንዲኖር',
          '- የመተግበሪያውን አፈጻጸም ለማሻሻል እና ችግሮችን ለማስተካከል',
          '- አስፈላጊ ዝማኔዎችን ለማሳወቅ'
        ]
      },
      {
        title: '4. መረጃ ማጋራት',
        content: [
          'የግል መረጃዎን ለማንም አንሸጥም።',
          'መተግበሪያውን ለማስኬድ ከሚረዱን ታማኝ የአገልግሎት ሰጪዎች ጋር ውስን መረጃ ልናጋራ እንችላለን። አስፈላጊውን ብቻ እናጋራለን፣ እና እነዚያ አቅራቢዎች መረጃዎን እንዲጠብቁ እንጠይቃለን።'
        ]
      },
      {
        title: '5. የመረጃ ማከማቻ እና ደህንነት',
        content: [
          'መረጃዎ በዘመናዊ የደመና አገልግሎቶች በደህንነቱ በተጠበቀ ሁኔታ ይከማቻል።',
          'መረጃዎን ካልተፈቀደ መዳረሻ፣ መጥፋት ወይም አላግባብ አጠቃቀም ለመጠበቅ ተገቢ እርምጃዎችን እንወስዳለን። ሆኖም ግን ማንም ሥርዓት ሙሉ ለሙሉ ደህንነትን ሊያረጋግጥ አይችልም።'
        ]
      },
      {
        title: '6. የእርስዎ መብቶች',
        content: ['እንደ ኢትዮ ካርስ ተጠቃሚ የሚከተሉት መብቶች አሉዎት፦'],
        list: [
          '- የግል መረጃዎን በማንኛውም ጊዜ ማየት እና ማዘመን',
          '- መለያዎን እና ተያያዥ መረጃዎን መሰረዝ መጠየቅ'
        ]
      },
      {
        title: '7. መለያ መሰረዝ',
        content: [
          'መለያዎን ለመሰረዝ ከመረጡ፣ ፕሮፋይልዎ እና ተያያዥ መረጃዎ ከሥርዓታችን ይወገዳሉ። በመተግበሪያው ቅንብሮች ውስጥ የመለያ ማጥፋትን መጠየቅ ይችላሉ።'
        ]
      },
      {
        title: '8. የልጆች ግላዊነት',
        content: [
          'ኢትዮ ካርስ ከ13 ዓመት በታች ለሆኑ ህጻናት አገልግሎት የታሰበ አይደለም። ከልጆች ሆን ብለን መረጃ አንሰበስብም። አንድ ህጻን የግል መረጃ እንደሰጠን ካወቅን ለማስወገድ እርምጃ እንወስዳለን።'
        ]
      },
      {
        title: '9. የፖሊሲ ለውጦች',
        content: [
          'ይህን የግላዊነት ፖሊሲ አልፎ አልፎ ልናዘምነው እንችላለን። ለውጦች ካሉ በዚህ ገጽ ላይ ያለው የተሻሻለበት ቀን ይዘመናል። ከለውጦች በኋላ መተግበሪያውን መጠቀም ከቀጠሉ፣ የተዘመነውን ፖሊሲ ተቀብለዋል ማለት ነው።'
        ]
      },
      {
        title: '10. ያግኙን',
        content: ['ስለዚህ የግላዊነት ፖሊሲ ማንኛውም ጥያቄ ካለዎት እዚህ ያግኙን፦'],
        list: [
          '- ኢሜይል፦ ethiocarsmarket@gmail.com',
          '- ስልክ፦ +251 99 115 2329'
        ]
      }
    ]
  }
};

export const PrivacyPolicy: React.FC = () => {
  const [lang, setLang] = useState<Lang>('en');
  
  const content = contentData[lang];
  
  const currentDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-10 md:p-16 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        
        {/* Header & Language Toggle */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl shrink-0">
              <Lock size={24} className="text-zinc-900 dark:text-white" />
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

        <div className="mb-8 font-bold text-brand uppercase tracking-widest text-sm">
          {content.effective} {currentDate}
        </div>

        <div className="prose prose-zinc max-w-none space-y-10 text-zinc-600 dark:text-zinc-400">
          {content.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-widest text-xs">
                {section.title}
              </h2>
              {section.content.map((p, i) => (
                <p key={i} className="leading-relaxed mb-3 font-medium">
                  {p}
                </p>
              ))}
              {section.list && section.list.length > 0 && (
                <div className="mt-4 space-y-2 not-prose text-zinc-600 dark:text-zinc-400">
                  {section.list.map((item, i) => {
                    const isBullet = item.trim().startsWith('-');
                    if (item === '') return <div key={i} className="h-2" />;
                    if (isBullet) {
                      return (
                        <div key={i} className="flex items-start gap-3 pl-2">
                          <span className="text-zinc-400 mt-1 text-[12px]">●</span>
                          <span className="leading-relaxed font-medium">{item.replace(/^-?\s*/, '')}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="font-bold text-zinc-900 dark:text-white mt-6 mb-3">
                        {item}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
