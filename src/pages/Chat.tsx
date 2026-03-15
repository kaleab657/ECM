import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { apiFetch } from '../lib/api-client';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';

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

interface ChatProps {
  initialChatId?: string | null;
  onChatChange?: (id: string | null) => void;
}

export const Chat: React.FC<ChatProps> = ({ initialChatId, onChatChange }) => {
  const { user, t } = useAppContext();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeChatId = initialChatId || null;

  const setActiveChatId = useCallback((id: string | null) => {
    if (onChatChange) onChatChange(id);
  }, [onChatChange]);

  // Fetch chat sessions
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      
      setSessions(prevSessions => {
        return sessionData.sort((a, b) => {
          const dateA = a.updatedAt?.toDate?.() || (a.updatedAt ? new Date(a.updatedAt) : new Date());
          const dateB = b.updatedAt?.toDate?.() || (b.updatedAt ? new Date(b.updatedAt) : new Date());
          const timeA = dateA instanceof Date && !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
          const timeB = dateB instanceof Date && !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
          return timeB - timeA;
        });
      });
      
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [user, activeChatId]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (!activeChatId || !user) return;

    const chatRef = doc(db, 'chats', activeChatId);
    const session = sessions.find(s => s.id === activeChatId);
    
    if (session && session.unreadCount && session.unreadCount > 0 && session.lastMessageSenderId !== user.uid) {
      updateDoc(chatRef, {
        unreadCount: 0
      });
    }
  }, [activeChatId, user, sessions]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChatId || !user) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(messageData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChatId}/messages`);
    });

    return () => unsubscribe();
  }, [activeChatId, user]);

  // Resolve participant names
  useEffect(() => {
    if (sessions.length === 0 || !user) return;

    const unsubscribes: (() => void)[] = [];

    sessions.forEach(session => {
      const otherId = session.participants.find(p => p !== user.uid);
      if (!otherId || participantProfiles[otherId]) return;

      const name = session.participantNames[otherId];
      if (!name || name === 'WWWW' || name === 'User' || name === 'Seller') {
        const unsub = onSnapshot(doc(db, 'users', otherId), (snapshot) => {
          if (snapshot.exists()) {
            setParticipantProfiles(prev => ({
              ...prev,
              [otherId]: snapshot.data()
            }));
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${otherId}`);
        });
        unsubscribes.push(unsub);
      }
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [sessions, user, participantProfiles]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent, imageURLs?: string[]) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && (!imageURLs || imageURLs.length === 0)) return;
    if (!activeChatId || !user) return;

    const text = inputText;
    setInputText('');

    try {
      const messagesRef = collection(db, 'chats', activeChatId, 'messages');
      await addDoc(messagesRef, {
        text,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        status: 'sent',
        imageURLs: imageURLs || []
      });

      const chatRef = doc(db, 'chats', activeChatId);
      const session = sessions.find(s => s.id === activeChatId);
      const currentUnread = session?.unreadCount || 0;

      await updateDoc(chatRef, {
        lastMessage: imageURLs && imageURLs.length > 0 ? '📷 Image' : text,
        updatedAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        unreadCount: currentUnread + 1
      });

      // Send push notification to the other participant
      const recipientId = session?.participants.find(p => p !== user.uid);
      if (recipientId) {
        const senderName = session?.participantNames[user.uid] || user.displayName || 'Someone';
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            apiFetch('/api/notifications/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                recipientId,
                senderName,
                message: imageURLs && imageURLs.length > 0 ? '📷 Image' : text,
                chatId: activeChatId,
                carTitle: session?.carTitle || ''
              })
            }).catch(() => {}); // Fire-and-forget, don't block chat
          }
        } catch {
          // Silent - push notification is best-effort
        }
      }
    } catch (error) {
      // Silent error
    }
  }, [inputText, activeChatId, user, sessions]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChatId || !user) return;

    if (files.length > 3) {
      alert(t('chatPage.maxImages') || 'Maximum 3 images allowed per message');
      return;
    }

    setIsUploading(true);
    try {
      const { uploadToR2 } = await import('../lib/r2-client-utils');
      const urls = await Promise.all(
        Array.from(files).map(async (file) => {
          const { publicUrl } = await uploadToR2(file as File, 'chats');
          return publicUrl;
        })
      );

      await handleSendMessage(undefined, urls);
    } catch (error: any) {
      alert(t('chatPage.uploadFailed') || 'Failed to upload images');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  }, [activeChatId, user, handleSendMessage]);

  const handleDeleteChat = useCallback(async () => {
    if (!activeChatId || !user) return;
    
    setIsDeletingChat(true);
    try {
      const chatRef = doc(db, 'chats', activeChatId);
      const session = sessions.find(s => s.id === activeChatId);
      if (!session) return;

      const deletedBy = session.deletedBy || [];
      if (!deletedBy.includes(user.uid)) {
        await updateDoc(chatRef, {
          deletedBy: [...deletedBy, user.uid]
        });
      }
      
      setActiveChatId(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      alert(t('chatPage.deleteFailed') || 'Failed to delete conversation');
    } finally {
      setIsDeletingChat(false);
    }
  }, [activeChatId, user, sessions, setActiveChatId]);

  const activeChat = useMemo(() => sessions.find(s => s.id === activeChatId), [sessions, activeChatId]);
  
  const otherParticipantName = useMemo(() => {
    const otherId = activeChat?.participants.find(p => p !== user?.uid);
    if (!otherId) return 'User';
    return participantProfiles[otherId]?.displayName || activeChat?.participantNames[otherId] || 'User';
  }, [activeChat, user, participantProfiles]);

  if (!user) return <div className="text-center py-24"><h2 className="text-2xl font-bold">{t('chatPage.loginRequired') || 'Please login to view messages'}</h2></div>;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100dvh-5rem-56px)] md:h-[calc(100vh-10rem)] bg-white dark:bg-zinc-900 md:rounded-[40px] shadow-xl shadow-black/5 border border-zinc-100 dark:border-zinc-800 overflow-hidden flex flex-col md:flex-row">
      <ChatSidebar 
        sessions={sessions}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        loading={loading}
        user={user}
        participantProfiles={participantProfiles}
      />

      <ChatWindow 
        activeChatId={activeChatId}
        activeChat={activeChat}
        messages={messages}
        user={user}
        otherParticipantName={otherParticipantName}
        setActiveChatId={setActiveChatId}
        setShowDeleteConfirm={setShowDeleteConfirm}
        inputText={inputText}
        setInputText={setInputText}
        handleSendMessage={handleSendMessage}
        handleImageUpload={handleImageUpload}
        isUploading={isUploading}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white text-center mb-2 tracking-tight">{t('chatPage.deleteChat') || 'Delete Chat?'}</h3>
            <p className="text-zinc-500 text-center mb-8 font-medium">
              {t('chatPage.deleteConfirm') || 'This will remove the conversation from your list. The other person will still be able to see it.'}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteChat}
                disabled={isDeletingChat}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isDeletingChat ? <Loader2 className="animate-spin mx-auto" size={20} /> : (t('chatPage.deleteBtn') || 'Delete Conversation')}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingChat}
                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:hover:bg-zinc-700 transition-all"
              >
                {t('chatPage.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
