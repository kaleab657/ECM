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

const MessageItem = React.memo(({ msg, isOwn }: { msg: Message; isOwn: boolean }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 px-3`}>
      <div className={`max-w-[78%] ${
        isOwn
          ? 'bg-brand text-white rounded-2xl rounded-br-sm'
          : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl rounded-bl-sm shadow-sm'
      } px-4 py-2.5`}>
        {msg.imageURLs && msg.imageURLs.length > 0 && (
          <div className="grid grid-cols-1 gap-2 mb-2">
            {msg.imageURLs.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden aspect-square">
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
        {msg.text && (
          <p className="text-[15px] leading-snug break-words">{msg.text}</p>
        )}
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-white/60' : 'text-zinc-400'}`}>
          <span className="text-[11px]">
            {msg.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
          </span>
          {isOwn && (
            msg.status === 'seen'
              ? <CheckCheck size={15} className="text-white/80" />
              : <Check size={15} />
          )}
        </div>
      </div>
    </div>
  );
});

export const MessageList: React.FC<MessageListProps> = React.memo(({ messages, user }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto py-3"
    >
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          msg={msg}
          isOwn={msg.senderId === user?.uid}
        />
      ))}
      {/* Bottom padding so last message isn't hidden behind input */}
      <div className="h-2" />
    </div>
  );
});
