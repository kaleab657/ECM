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
    <div className="px-3 py-2 h-[60px] flex items-center">
      <form
        onSubmit={(e) => handleSendMessage(e)}
        className="flex items-center gap-2 w-full"
      >
        <input
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
          className="p-2 text-zinc-400 hover:text-brand transition-colors disabled:opacity-50 shrink-0"
        >
          {isUploading
            ? <Loader2 className="animate-spin" size={24} />
            : <ImageIcon size={24} />}
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('chatPage.windowPlaceholder') || 'Type a message...'}
          autoComplete="off"
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-white placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim() && !isUploading}
          className="bg-brand text-white p-2.5 rounded-full shadow-md shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-40 disabled:shadow-none shrink-0"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
});
