import React from 'react';
import { ChevronLeft, Trash2, Search } from 'lucide-react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useAppContext } from '../../context/AppContext';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  status: 'sent' | 'seen';
  imageURLs?: string[];
}

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

interface ChatWindowProps {
  activeChatId: string | null;
  activeChat: ChatSession | undefined;
  messages: Message[];
  user: any;
  otherParticipantName: string;
  setActiveChatId: (id: string | null) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: (e?: React.FormEvent, imageURLs?: string[]) => Promise<void>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = React.memo(({
  activeChatId,
  activeChat,
  messages,
  user,
  otherParticipantName,
  setActiveChatId,
  setShowDeleteConfirm,
  inputText,
  setInputText,
  handleSendMessage,
  handleImageUpload,
  isUploading
}) => {
  const { t } = useAppContext();
  
  if (!activeChatId || !activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
        <div className="bg-zinc-100 dark:bg-zinc-800 w-24 h-24 rounded-[32px] flex items-center justify-center mb-6">
          < Search size={40} className="text-zinc-300" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">{t('chatPage.noChatSelected') || 'Select a conversation'}</h2>
        <p className="text-zinc-500 max-w-xs">{t('chatPage.noChatSelectedDesc') || 'Choose a chat from the list to start talking with buyers or sellers.'}</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/30 h-full ${!activeChatId && 'hidden md:flex'}`}>
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-3 md:p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 md:gap-4 sticky top-0 z-10">
        <button 
          onClick={() => setActiveChatId(null)}
          className="md:hidden p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
          <img src={activeChat.carImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-zinc-900 dark:text-white tracking-tight truncate text-xs md:text-base">{activeChat.carTitle}</h2>
          <p className="text-brand font-black text-[9px] uppercase tracking-widest">
            {otherParticipantName}
          </p>
        </div>
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
          title={t('chatPage.deleteBtn') || 'Delete Conversation'}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages Area */}
      <MessageList messages={messages} user={user} />

      {/* Input Area */}
      <MessageInput 
        inputText={inputText}
        setInputText={setInputText}
        handleSendMessage={handleSendMessage}
        handleImageUpload={handleImageUpload}
        isUploading={isUploading}
      />
    </div>
  );
});
