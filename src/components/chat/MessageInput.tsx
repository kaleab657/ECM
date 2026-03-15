import React, { useRef } from 'react';
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface MessageInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: (e?: React.FormEvent, imageURLs?: string[]) => Promise<void>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = React.memo(({
  inputText,
  setInputText,
  handleSendMessage,
  handleImageUpload,
  isUploading
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useAppContext();

  return (
    <div className="bg-white dark:bg-zinc-900 p-3 md:p-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
      <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2 md:gap-3">
        <label htmlFor="chat-file-upload" className="sr-only">Upload images</label>
        <input 
          id="chat-file-upload"
          name="chatFiles"
          type="file" 
          ref={fileInputRef}
          onChange={handleImageUpload}
          multiple
          accept="image/*"
          className="hidden"
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2.5 text-zinc-400 hover:text-brand transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
        </button>
        <label htmlFor="chat-message-input" className="sr-only">Type a message</label>
        <input 
          id="chat-message-input"
          name="message"
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('chatPage.windowPlaceholder') || 'Type a message...'}
          autoComplete="off"
          className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-bold dark:text-white"
        />
        <button 
          type="submit"
          disabled={!inputText.trim() && !isUploading}
          className="bg-brand text-white p-2.5 rounded-xl shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
});
