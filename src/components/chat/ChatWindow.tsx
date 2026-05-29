import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, Trash2, Search } from 'lucide-react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useAppContext } from '../../context/AppContext';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

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
  loadingMessages?: boolean;
}

const HEADER_H = 60;
const INPUT_H = 60;

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
  isUploading,
  loadingMessages
}) => {
  const { t } = useAppContext();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height on native
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showSub = Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.then(h => h.remove());
      hideSub.then(h => h.remove());
    };
  }, []);

  if (!activeChatId) return null;

  return (
    // Full screen container — position relative so fixed children anchor to it
    <div className="fixed inset-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 md:static md:flex-1 md:h-full md:overflow-hidden">

      {/* HEADER — fixed at top, never moves */}
      <div
        className="fixed top-0 left-0 right-0 z-20 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 md:static shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-3 px-3 h-[60px]">
          <button
            onClick={() => setActiveChatId(null)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
            {activeChat?.carImage && (
              <img
                src={activeChat.carImage}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[15px] text-zinc-900 dark:text-white truncate leading-tight">
              {activeChat ? otherParticipantName : <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />}
            </h2>
            <p className="text-brand text-[11px] font-semibold truncate">
              {activeChat ? activeChat.carTitle : <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded mt-1" />}
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* MESSAGES — fills space between header and input */}
      <div
        className="fixed left-0 right-0 overflow-y-auto md:static md:flex-1 md:overflow-y-auto"
        style={{
          top: `calc(env(safe-area-inset-top) + ${HEADER_H}px)`,
          bottom: `calc(max(env(safe-area-inset-bottom), 48px) + 60px + ${keyboardHeight}px)`,
        }}
      >
        {loadingMessages && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('common.loading') || 'Loading...'}</p>
            </div>
          </div>
        )}
        <MessageList messages={messages} user={user} />
      </div>

      {/* INPUT — fixed at bottom, moves up with keyboard */}
      <div
        className="fixed left-0 right-0 z-20 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 md:static shrink-0"
        style={{ bottom: keyboardHeight, paddingBottom: 'max(env(safe-area-inset-bottom), 48px)' }}
      >
        <MessageInput
          inputText={inputText}
          setInputText={setInputText}
          handleSendMessage={handleSendMessage}
          handleImageUpload={handleImageUpload}
          isUploading={isUploading}
        />
      </div>

    </div>
  );
});
