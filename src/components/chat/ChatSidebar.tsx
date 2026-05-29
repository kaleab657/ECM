import React, { useRef, useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
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
  
  const listContainerRef = useRef<HTMLDivElement>(null);
  const listContentRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (listContainerRef.current && listContentRef.current) {
        const isContentLarger = listContentRef.current.scrollHeight > listContainerRef.current.clientHeight;
        setCanScroll(isContentLarger);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    // Setup observer to detect content changes (like images loading or new messages)
    const observer = new MutationObserver(checkScroll);
    if (listContentRef.current) {
      observer.observe(listContentRef.current, { childList: true, subtree: true });
    }
    
    return () => {
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, [sessions, loading]);

  const activeSessions = sessions.filter(s => !s.deletedBy?.includes(user?.uid || ''));
  const isEmpty = !loading && activeSessions.length === 0;

  return (
    <div className={`w-full md:w-80 lg:w-96 border-r border-zinc-100 dark:border-zinc-800 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex-1 h-full'}`}>
      
      {/* HEADER SECTION (STATIC / FIXED) */}
      <div className="shrink-0 p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10" style={{ paddingTop: 'calc(var(--safe-area-top, env(safe-area-inset-top)) + 16px)' }}>
        <h1 className="text-lg md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight italic uppercase">{t('chatPage.sidebarTitle') || 'Messages'}</h1>
      </div>

      {/* CHAT LIST SECTION (DYNAMIC SCROLL) */}
      <div 
        ref={listContainerRef}
        className={`flex-1 ${canScroll ? 'overflow-y-auto' : 'overflow-hidden'}`}
        style={{ overscrollBehavior: 'none' }}
      >
        <div ref={listContentRef} className={`w-full ${isEmpty || loading || !canScroll ? 'h-full flex flex-col' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center p-12 m-auto">
              <Loader2 className="animate-spin text-brand" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300 m-auto">
              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center text-zinc-400 mb-4 border border-zinc-100 dark:border-zinc-800">
                <MessageSquare size={28} strokeWidth={2} />
              </div>
              <h3 className="font-black text-zinc-900 dark:text-white mb-2">{t('chatPage.noMessages') || 'No messages yet'}</h3>
              <p className="text-xs font-bold text-zinc-500 max-w-[200px] leading-relaxed">
                {t('chatPage.noMessagesDesc') || 'When you contact sellers or buyers message you, they will appear here.'}
              </p>
            </div>
          ) : (
            activeSessions.map((session) => (
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
                      {(() => {
                        const otherId = session.participants.find(p => p !== user?.uid);
                        if (!otherId) return 'User';
                        const pName = participantProfiles[otherId]?.displayName;
                        const sName = session.participantNames[otherId];
                        return (pName !== 'Anonymous' ? pName : undefined) || (sName !== 'Anonymous' ? sName : undefined) || participantProfiles[otherId]?.email?.split('@')[0] || 'User';
                      })()}
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
          )}
        </div>
      </div>
    </div>
  );
});
