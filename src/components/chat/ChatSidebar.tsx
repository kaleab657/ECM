import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface ChatSession {
  id: string;
  carId: string;
  carTitle: string;
  carImage: string;
  lastMessage: string;
  updatedAt: any;
  participants: string[];
  participantNames: Record<string, string>;
  unreadCount?: number;
  lastMessageSenderId?: string;
  deletedBy?: string[];
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  loading: boolean;
  user: any;
  participantProfiles: Record<string, any>;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = React.memo(({
  sessions,
  activeChatId,
  setActiveChatId,
  loading,
  user,
  participantProfiles
}) => {
  const { t } = useAppContext();
  
  return (
    <div className={`w-full md:w-80 lg:w-96 border-r border-zinc-100 dark:border-zinc-800 flex flex-col ${activeChatId && 'hidden md:flex'}`}>
      <div className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800">
        <h1 className="text-lg md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-4 italic uppercase">{t('chatPage.sidebarTitle') || 'Messages'}</h1>
        <div className="relative">
          <label htmlFor="chat-search-input" className="sr-only">{t('chatPage.searchPlaceholder') || 'Search chats...'}</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input 
            id="chat-search-input"
            name="chatSearch"
            type="text" 
            placeholder={t('chatPage.searchPlaceholder') || 'Search chats...'}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-brand" /></div>
        ) : sessions.length > 0 ? (
          sessions
            .filter(s => !s.deletedBy?.includes(user?.uid || ''))
            .map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveChatId(session.id)}
              className={`w-full p-3 md:p-4 flex gap-3 md:gap-4 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800 ${activeChatId === session.id ? 'bg-brand/5 border-l-4 border-l-brand' : ''}`}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden shrink-0">
                <img src={session.carImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-black text-zinc-900 dark:text-white truncate text-xs md:text-sm tracking-tight">
                    {session.participants.find(p => p !== user?.uid) ? 
                      (participantProfiles[session.participants.find(p => p !== user?.uid)!]?.displayName || session.participantNames[session.participants.find(p => p !== user?.uid)!] || 'User') : 
                      'User'
                    }
                  </h3>
                  <span className="text-[9px] font-black text-zinc-400 whitespace-nowrap ml-2 uppercase tracking-widest">
                    {session.updatedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-[10px] truncate flex-1 font-bold ${session.unreadCount && session.unreadCount > 0 && session.lastMessageSenderId !== user?.uid ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                    {session.lastMessage}
                  </p>
                  {session.unreadCount && session.unreadCount > 0 && session.lastMessageSenderId !== user?.uid && (
                    <span className="w-4 h-4 bg-brand text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0 ml-2 shadow-sm shadow-brand/20">
                      {session.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-[9px] font-black text-brand mt-0.5 truncate uppercase tracking-widest">{session.carTitle}</p>
              </div>
            </button>
          ))
        ) : (
          <div className="p-12 text-center text-zinc-500 font-bold">{t('chatPage.noChats') || 'No conversations yet'}</div>
        )}
      </div>
    </div>
  );
});
