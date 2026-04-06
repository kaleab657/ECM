import React, { useRef, useCallback } from 'react';
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { useToast } from '../Toast';

// ── Custom native plugin for REAL Android permission dialogs ──
// The @capacitor/camera plugin maps 'photos' to empty strings,
// so Camera.requestPermissions() never triggers a system dialog.
// This plugin directly requests READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE.
interface PhotoPermissionPlugin {
  checkPermission(): Promise<{ status: 'granted' | 'prompt' | 'denied' | 'permanentlyDenied'; permission: string }>;
  requestPermission(): Promise<{ status: 'granted' | 'denied' | 'permanentlyDenied' }>;
  openSettings(): Promise<void>;
}
const PhotoPermission = registerPlugin<PhotoPermissionPlugin>('PhotoPermission');

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
  const { showToast } = useToast();

  const handleImageClick = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // ── Step 1: Check current permission status ──
        const { status, permission } = await PhotoPermission.checkPermission();
        console.log(`[MessageInput] Permission check: status=${status}, permission=${permission}`);

        // ── Step 2: Handle based on status ──
        if (status !== 'granted') {
          if (status === 'permanentlyDenied') {
            // User previously chose "Don't allow" with "Don't ask again"
            console.log('[MessageInput] Permission permanently denied → opening settings');
            showToast(
              t('chatPage.enableInSettings') || 'Enable photo access in Settings to send images',
              'warning'
            );
            await PhotoPermission.openSettings();
            return;
          }

          // status is 'prompt' or 'denied' → trigger the REAL Android system dialog
          console.log('[MessageInput] Requesting photo permission (will show system dialog)...');
          const result = await PhotoPermission.requestPermission();
          console.log(`[MessageInput] Permission request result: ${result.status}`);

          if (result.status !== 'granted') {
            if (result.status === 'permanentlyDenied') {
              showToast(
                t('chatPage.enableInSettings') || 'Enable photo access in Settings to send images',
                'warning'
              );
              await PhotoPermission.openSettings();
            } else {
              showToast(
                t('chatPage.permissionRequired') || 'Permission required to send images',
                'warning'
              );
            }
            return;
          }
        }

        // ── Step 3: Permission granted → open native photo picker ──
        console.log('[MessageInput] Permission GRANTED → opening native picker');
        const pickerResult = await Camera.pickImages({
          quality: 90,
          limit: 3,
        });

        if (!pickerResult.photos || pickerResult.photos.length === 0) {
          console.log('[MessageInput] User cancelled — no photos selected');
          return;
        }

        console.log(`[MessageInput] User selected ${pickerResult.photos.length} photo(s)`);

        // ── Step 4: Convert picked photos to File objects for existing upload flow ──
        const dataTransfer = new DataTransfer();
        for (const photo of pickerResult.photos) {
          if (!photo.webPath) continue;
          try {
            const resp = await fetch(photo.webPath);
            const blob = await resp.blob();
            const name = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
            dataTransfer.items.add(new File([blob], name, { type: blob.type || 'image/jpeg' }));
          } catch (fetchErr) {
            console.warn('[MessageInput] Failed to convert photo blob:', fetchErr);
          }
        }

        // Feed files into the existing hidden file input → triggers handleImageUpload
        if (dataTransfer.files.length > 0 && fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files;
          fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.log('[MessageInput] Picker/permission error:', errMsg);

        // Show toast only for permission errors, not user cancellation
        if (errMsg.toLowerCase().includes('denied') || errMsg.toLowerCase().includes('permission')) {
          showToast(
            t('chatPage.permissionRequired') || 'Permission required to send images',
            'warning'
          );
        }
        return;
      }
      return;
    }

    // Web platform: use standard HTML file input picker
    fileInputRef.current?.click();
  }, [showToast, t]);

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
          onClick={handleImageClick}
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

