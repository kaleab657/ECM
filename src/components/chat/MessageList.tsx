import React, { useEffect, useRef } from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  status: 'sent' | 'seen';
  imageURLs?: string[];
}

interface MessageListProps {
  messages: Message[];
  user: any;
}

const MessageItem = React.memo(({ msg, isOwn }: { msg: Message, isOwn: boolean }) => {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-1`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'bg-brand text-white rounded-2xl rounded-tr-none' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl rounded-tl-none border border-zinc-100 dark:border-zinc-700 shadow-sm'} p-3 md:p-4 transition-all`}>
        {msg.imageURLs && msg.imageURLs.length > 0 && (
          <div className="grid grid-cols-1 gap-2 mb-2">
            {msg.imageURLs.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-700 aspect-square md:aspect-video relative">
                <img 
                  src={url} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  loading="lazy" 
                />
              </div>
            ))}
          </div>
        )}
        {msg.text && <p className="text-sm md:text-base leading-relaxed break-words font-medium">{msg.text}</p>}
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-white/70' : 'text-zinc-400'}`}>
          <span className="text-[9px] font-black uppercase tracking-widest">
            {msg.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
          </span>
          {isOwn && (
            msg.status === 'seen' ? <CheckCheck size={12} className="text-white" /> : <Check size={12} />
          )}
        </div>
      </div>
    </div>
  );
});

export const MessageList: React.FC<MessageListProps> = React.memo(({ messages, user }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior
      });
    }, 100);
  };

  useEffect(() => {
    // Initial scroll without animation, subsequent with smooth
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages]);

  return (
    <div 
      className="flex-1 p-4 md:p-6 space-y-4 pb-20"
    >
      {messages.map((msg) => (
        <MessageItem 
          key={msg.id} 
          msg={msg} 
          isOwn={msg.senderId === user?.uid} 
        />
      ))}
    </div>
  );
});
