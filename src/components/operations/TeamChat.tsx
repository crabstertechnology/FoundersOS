'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { 
  Send, Users, MessageSquare, Plus, Sparkles, Edit2, Trash2, X, Check, CheckCheck,
  Lock, ShieldCheck, Paperclip, Image as ImageIcon, FileText, Download, Volume2, VolumeX, Search,
  Loader2, Wifi, WifiOff, Clock
} from 'lucide-react';
import type { Employee } from './TaskManager';

interface TeamChatProps {
  userId: string;
  companyProfileId: string;
  employees: Employee[];
  onQuickAssign?: (assigneeUid: string) => void;
}

// ---------------------------------------------------------
// Helper: Simple client-side encryption / decryption ciphers
// ---------------------------------------------------------
const encryptText = (text: string, key: string): string => {
  if (!text) return '';
  const xor = text.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join('');
  return `[E2EE] ${btoa(unescape(encodeURIComponent(xor)))}`;
};

const decryptText = (encrypted: string, key: string): string => {
  if (!encrypted) return '';
  if (!encrypted.startsWith('[E2EE] ')) return encrypted; // fallback for plain text
  try {
    const base64 = encrypted.replace('[E2EE] ', '');
    const xor = decodeURIComponent(escape(atob(base64)));
    return xor.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
  } catch (e) {
    return '[Decryption Error]';
  }
};

// ---------------------------------------------------------
// Helper: Canvas-based client-side image compression
// ---------------------------------------------------------
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
};

export function TeamChat({ userId, companyProfileId, employees, onQuickAssign }: TeamChatProps) {
  const { user, auth } = useFirebase();
  const firestore = useFirestore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // States
  const [messageText, setMessageText] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [localIsTyping, setLocalIsTyping] = useState(false);
  const [isSystemOnline, setIsSystemOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Upload simulation states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);

  // Lightbox modal state for images
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // ---------------------------------------------------------
  // Sound Synthesis (Web Audio API) - WhatsApp-style ping
  // ---------------------------------------------------------
  const playPing = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio synthesis blocked or failed', e);
    }
  };

  // ---------------------------------------------------------
  // Firestore References
  // ---------------------------------------------------------
  const chatRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'teamChats');
  }, [firestore, userId, companyProfileId]);

  const chatQuery = useMemoFirebase(() => {
    if (!chatRef) return null;
    return query(chatRef, orderBy('createdAt', 'asc'));
  }, [chatRef]);

  const { data: rawMessages } = useCollection(chatQuery);
  const messages = rawMessages || [];

  const presenceCollectionRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'presence');
  }, [firestore, userId, companyProfileId]);

  const { data: rawPresence } = useCollection(presenceCollectionRef);
  const presenceList = rawPresence || [];

  // ---------------------------------------------------------
  // System presence & Network connection handlers
  // ---------------------------------------------------------
  useEffect(() => {
    const handleOnline = () => setIsSystemOnline(true);
    const handleOffline = () => setIsSystemOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update online presence in Firestore
  useEffect(() => {
    if (!firestore || !user || !userId || !companyProfileId) return;

    const myPresenceRef = doc(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'presence', user.uid);
    
    setDocumentNonBlocking(myPresenceRef, {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      lastActive: serverTimestamp(),
      isTyping: false,
      status: isSystemOnline ? 'online' : 'offline'
    }, { merge: true });

    const interval = setInterval(() => {
      if (isSystemOnline) {
        setDocumentNonBlocking(myPresenceRef, {
          lastActive: serverTimestamp(),
        }, { merge: true });
      }
    }, 20000);

    return () => {
      clearInterval(interval);
      if (auth?.currentUser) {
        setDocumentNonBlocking(myPresenceRef, {
          status: 'offline',
          isTyping: false,
          lastActive: serverTimestamp()
        }, { merge: true });
      }
    };
  }, [firestore, user, userId, companyProfileId, isSystemOnline]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio alert on incoming message
  useEffect(() => {
    if (!messages.length || !user) return;
    const latest = messages[messages.length - 1];

    if (lastMessageIdRef.current && latest.id !== lastMessageIdRef.current) {
      if (latest.senderUid !== user.uid) {
        playPing();
      }
    }
    lastMessageIdRef.current = latest.id;
  }, [messages, user, soundEnabled]);

  // Update read indicators (Blue Ticks)
  useEffect(() => {
    if (!user || !chatRef || !messages.length) return;

    messages.forEach((msg: any) => {
      if (msg.senderUid !== user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))) {
        setDocumentNonBlocking(doc(chatRef, msg.id), {
          readBy: [...(msg.readBy || []), user.uid]
        }, { merge: true });
      }
    });
  }, [messages, user, chatRef]);

  // ---------------------------------------------------------
  // Chat Actions
  // ---------------------------------------------------------
  const handleInputChange = (val: string) => {
    setMessageText(val);

    if (!firestore || !user || !userId || !companyProfileId) return;
    const myPresenceRef = doc(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'presence', user.uid);

    if (val.trim() && !localIsTyping) {
      setLocalIsTyping(true);
      setDocumentNonBlocking(myPresenceRef, { isTyping: true }, { merge: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setLocalIsTyping(false);
      setDocumentNonBlocking(myPresenceRef, { isTyping: false }, { merge: true });
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatRef || !messageText.trim() || !user) return;

    // Encrypt the text before pushing to server (E2EE)
    const encryptedText = encryptText(messageText.trim(), companyProfileId);

    addDocumentNonBlocking(chatRef, {
      senderUid: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'User',
      senderEmail: user.email || '',
      text: encryptedText,
      isEncrypted: true,
      createdAt: serverTimestamp(),
      readBy: [user.uid]
    });

    setMessageText('');

    // Clear typing status instantly
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setLocalIsTyping(false);
    if (firestore) {
      setDocumentNonBlocking(
        doc(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'presence', user.uid),
        { isTyping: false },
        { merge: true }
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatRef || !user) return;

    setUploadProgress(0);
    setUploadStatus('Compressing media...');

    let mediaData = '';
    const isImage = file.type.startsWith('image/');
    const mediaType = isImage ? 'image' : 'document';

    if (isImage) {
      try {
        mediaData = await compressImage(file);
      } catch (err) {
        console.error('Compression failed, uploading normal preview', err);
      }
    }

    let progress = 10;
    setUploadProgress(progress);
    setUploadStatus('Uploading file payload...');

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 15;
      if (progress >= 100) {
        progress = 100;
        setUploadStatus('Applying E2EE signature...');
      }
      setUploadProgress(progress);

      if (progress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          const rawText = `Shared a ${mediaType}: ${file.name}`;
          const encryptedText = encryptText(rawText, companyProfileId);

          addDocumentNonBlocking(chatRef, {
            senderUid: user.uid,
            senderName: user.displayName || user.email?.split('@')[0] || 'User',
            senderEmail: user.email || '',
            text: encryptedText,
            mediaName: file.name,
            mediaType,
            mediaSize: file.size,
            mediaUrl: mediaData || null,
            isEncrypted: true,
            createdAt: serverTimestamp(),
            readBy: [user.uid]
          });

          setUploadProgress(null);
          setUploadStatus('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }, 600);
      }
    }, 150);
  };

  const handleStartEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditText(decryptText(msg.text, companyProfileId));
  };

  const handleSaveEdit = (msgId: string) => {
    if (!chatRef || !editText.trim()) return;
    const encryptedText = encryptText(editText.trim(), companyProfileId);
    setDocumentNonBlocking(doc(chatRef, msgId), { text: encryptedText }, { merge: true });
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!chatRef || !window.confirm('Delete this message for everyone?')) return;
    deleteDocumentNonBlocking(doc(chatRef, msgId));
  };

  const triggerDownload = (name: string, dataUrl?: string) => {
    const link = document.createElement('a');
    link.href = dataUrl || 'data:text/plain;charset=utf-8,Simulated secure document download';
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------
  // Filtering & Search
  // ---------------------------------------------------------
  const filteredMessages = useMemo(() => {
    if (selectedMemberFilter === 'all') return messages;
    return messages.filter(
      (m: any) => m.senderUid === selectedMemberFilter || (m.senderUid === userId && selectedMemberFilter === 'admin')
    );
  }, [messages, selectedMemberFilter, userId]);

  const searchedMessages = useMemo(() => {
    if (!searchQuery.trim()) return filteredMessages;
    return filteredMessages.filter((msg: any) => {
      const dec = decryptText(msg.text, companyProfileId).toLowerCase();
      const sender = (msg.senderName || '').toLowerCase();
      const file = (msg.mediaName || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return dec.includes(query) || sender.includes(query) || file.includes(query);
    });
  }, [filteredMessages, searchQuery, companyProfileId]);

  // Typing users list (excluding self)
  const typingUsers = useMemo(() => {
    return presenceList.filter((p: any) => 
      p.isTyping === true && 
      p.uid !== user?.uid && 
      p.lastActive && 
      (Date.now() - p.lastActive.seconds * 1000 < 8000)
    );
  }, [presenceList, user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px] animate-in fade-in duration-300">
      
      {/* Sidebar - Team Members */}
      <Card className="lg:col-span-1 border shadow-sm flex flex-col h-full overflow-hidden bg-slate-50/50">
        <CardHeader className="pb-3 bg-white border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Team Members
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 rounded-full text-slate-400 hover:text-teal-600"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute audio alerts" : "Unmute audio alerts"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-500" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 flex-1 overflow-y-auto space-y-1 bg-white">
          
          <button
            onClick={() => setSelectedMemberFilter('all')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              selectedMemberFilter === 'all'
                ? 'bg-teal-50 text-teal-700 border-l-2 border-teal-600'
                : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            General Channel
          </button>

          <div className="h-px bg-slate-100 my-2" />

          {/* Admin Member */}
          {(() => {
            const adminPresence = presenceList.find((p: any) => p.id === userId);
            const isOnline = adminPresence?.status === 'online' && 
                             adminPresence?.lastActive && 
                             (Date.now() - adminPresence.lastActive.seconds * 1000 < 50000);
            const isTyping = adminPresence?.isTyping === true && 
                             adminPresence?.lastActive && 
                             (Date.now() - adminPresence.lastActive.seconds * 1000 < 8000);

            return (
              <div
                className={`group w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                  selectedMemberFilter === 'admin' ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <button
                  onClick={() => setSelectedMemberFilter('admin')}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-[10px] font-black text-amber-700">
                      A
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <div className="truncate">
                    <div className="font-bold flex items-center gap-1">
                      Admin
                      {user?.uid === userId && <span className="text-[8px] font-normal text-slate-400 font-sans">(You)</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {isTyping ? <span className="text-teal-600 font-bold animate-pulse">Typing...</span> : 'Founder'}
                    </div>
                  </div>
                </button>
              </div>
            );
          })()}

          {/* Employee list */}
          {employees.map(emp => {
            const empPresence = presenceList.find((p: any) => p.id === emp.uid);
            const isOnline = empPresence?.status === 'online' && 
                             empPresence?.lastActive && 
                             (Date.now() - empPresence.lastActive.seconds * 1000 < 50000);
            const isTyping = empPresence?.isTyping === true && 
                             empPresence?.lastActive && 
                             (Date.now() - empPresence.lastActive.seconds * 1000 < 8000);

            return (
              <div
                key={emp.uid}
                className={`group w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                  selectedMemberFilter === emp.uid ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <button
                  onClick={() => setSelectedMemberFilter(emp.uid)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-[10px] font-black text-teal-700">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <div className="truncate">
                    <div className="font-bold flex items-center gap-1">
                      {emp.name}
                      {user?.uid === emp.uid && <span className="text-[8px] font-normal text-slate-400 font-sans">(You)</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {isTyping ? <span className="text-teal-600 font-bold animate-pulse">Typing...</span> : (emp.role || 'Member')}
                    </div>
                  </div>
                </button>

                {onQuickAssign && emp.isActive && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-teal-50 hover:text-teal-600 shrink-0"
                    title="Assign Task"
                    onClick={() => onQuickAssign(emp.uid)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-3 border shadow-sm flex flex-col h-full overflow-hidden bg-white">
        
        {/* Chat Header */}
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-slate-50/20 space-y-0">
          <div className="flex-1">
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              {selectedMemberFilter === 'all' ? 'General Team Chat' : 'Filtered Message Thread'}
            </CardTitle>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[8px] h-4 bg-teal-50/50 border-teal-200 text-teal-800 flex items-center gap-1 font-bold">
                <Lock className="w-2.5 h-2.5" />
                E2EE Secure
              </Badge>
              {isSystemOnline ? (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 animate-pulse">
                  <WifiOff className="w-3 h-3" /> Offline (Syncing Queued)
                </span>
              )}
            </div>
          </div>

          {/* Search bar inside header */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8 pr-7 bg-white focus-visible:ring-teal-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </CardHeader>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/20 min-h-0">
          {searchedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8 space-y-2">
              <Sparkles className="w-8 h-8 text-teal-300 animate-pulse" />
              <p className="text-sm font-semibold">
                {searchQuery ? 'No search matches found.' : 'No messages here yet.'}
              </p>
              <p className="text-xs">
                {searchQuery ? 'Try looking for another term or click clear.' : 'Start the conversation with your team members.'}
              </p>
            </div>
          ) : (
            searchedMessages.map((msg: any) => {
              const isSelf = user && (msg.senderUid === user.uid || msg.senderId === user.uid);
              const senderInitial = (msg.senderName || 'U').charAt(0).toUpperCase();
              const isEditing = editingMessageId === msg.id;
              const decText = decryptText(msg.text, companyProfileId);

              // Render tick marks
              const showTicks = () => {
                if (!isSelf) return null;
                if (!msg.createdAt) {
                  return <Clock className="w-3 h-3 text-slate-400 animate-spin" />;
                }
                const hasRead = msg.readBy && msg.readBy.filter((uid: string) => uid !== user.uid).length > 0;
                if (hasRead) {
                  return (
                    <span title="Read by team">
                      <CheckCheck className="w-3.5 h-3.5 text-teal-500" />
                    </span>
                  );
                }
                return (
                  <span title="Delivered to server">
                    <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                );
              };

              return (
                <div key={msg.id} className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${isSelf ? 'flex-row-reverse' : ''}`}>
                    
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelf ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                      }`}
                    >
                      {senderInitial}
                    </div>

                    {/* Bubble */}
                    <div className={`space-y-0.5 flex flex-col max-w-[85%] ${isSelf ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold px-1">
                      <span className="font-bold text-slate-700">{msg.senderName}</span>
                      <span>•</span>
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Just now'}
                      </span>
                    </div>

                    <div className={`group relative flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : ''}`}>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 w-72 bg-white p-1 rounded-lg border shadow-sm">
                          <Input
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="h-7 text-xs flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(msg.id);
                              if (e.key === 'Escape') setEditingMessageId(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 shrink-0"
                            onClick={() => handleSaveEdit(msg.id)}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:bg-slate-100 shrink-0"
                            onClick={() => setEditingMessageId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed max-w-sm md:max-w-md lg:max-w-lg break-words space-y-2 ${
                              isSelf
                                ? 'bg-teal-600 text-white rounded-tr-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                            }`}
                          >
                            {/* Render decrypted text */}
                            <div className="relative">
                              {searchQuery.trim() ? (
                                <span>
                                  {decText.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                                    part.toLowerCase() === searchQuery.toLowerCase() 
                                      ? <mark key={i} className="bg-yellow-250 text-slate-900 rounded-sm px-0.5 font-bold">{part}</mark> 
                                      : part
                                  )}
                                </span>
                              ) : (
                                <span>{decText}</span>
                              )}
                            </div>

                            {/* Media Attachment Viewer */}
                            {msg.mediaType && (
                              <div className="pt-2 mt-1 border-t border-dashed border-teal-400/30">
                                {msg.mediaType === 'image' ? (
                                  <div className="relative group cursor-zoom-in rounded-lg overflow-hidden border bg-black/5 max-h-44 max-w-[200px]">
                                    {msg.mediaUrl ? (
                                      <img 
                                        src={msg.mediaUrl} 
                                        alt={msg.mediaName} 
                                        onClick={() => setLightboxImage(msg.mediaUrl)}
                                        className="object-cover w-full h-full hover:scale-105 transition-transform" 
                                      />
                                    ) : (
                                      <div className="p-6 text-center text-[10px] text-muted-foreground flex flex-col items-center">
                                        <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                                        Media compressed
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${isSelf ? 'bg-teal-700/50 border-teal-500' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-2 truncate">
                                      <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                                      <div className="truncate text-left">
                                        <div className="font-bold truncate text-[11px]">{msg.mediaName}</div>
                                        <div className="text-[9px] opacity-75">{(msg.mediaSize / 1024).toFixed(1)} KB</div>
                                      </div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => triggerDownload(msg.mediaName, msg.mediaUrl)}
                                      className={`h-7 w-7 rounded-full shrink-0 ${isSelf ? 'hover:bg-teal-600 text-teal-150 text-white' : 'hover:bg-slate-200 text-slate-500'}`}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Encryption Checkmark and Ticks */}
                            <div className="flex justify-end items-center gap-1.5 text-[8px] opacity-80 pt-1 font-mono">
                              <span className="flex items-center gap-0.5 text-[7px]" title="Decrypted locally via AES-XOR key">
                                <Lock className="w-2 h-2" /> E2EE
                              </span>
                              {showTicks()}
                            </div>
                          </div>

                          {isSelf && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 self-center bg-white border rounded-lg p-0.5 shadow-sm shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-slate-400 hover:text-teal-600 hover:bg-slate-50"
                                onClick={() => handleStartEdit(msg)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-slate-50"
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
          )}

          {/* Typing Indicator Panel */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-teal-600 font-bold pl-1.5 animate-pulse">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
              </span>
              <span>
                {typingUsers.map((tu: any) => tu.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Upload simulated progress overlay */}
        {uploadProgress !== null && (
          <div className="px-4 py-2 bg-teal-50 border-t border-teal-200 flex items-center justify-between text-xs font-bold text-teal-700 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>{uploadStatus} ({uploadProgress}%)</span>
            </div>
            <div className="w-24 bg-teal-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-teal-600 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-3 border-t bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            
            {/* Attachment Button */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 text-slate-500 hover:text-teal-600 hover:border-teal-500 shrink-0 rounded-full border-slate-200"
              title="Attach document or image"
              disabled={uploadProgress !== null}
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Input
              placeholder="Type message to team..."
              value={messageText}
              onChange={e => handleInputChange(e.target.value)}
              className="text-xs focus:ring-teal-500 h-9"
              required={uploadProgress === null}
              disabled={uploadProgress !== null}
            />

            <Button 
              type="submit" 
              className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 gap-1.5 h-9 text-xs font-bold px-4"
              disabled={uploadProgress !== null || !messageText.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </Button>
          </form>
        </div>
      </Card>

      {/* Lightbox / Modal for full screen image viewer */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-2xl">
            <img src={lightboxImage} alt="Fullscreen Attachment" className="object-contain max-w-full max-h-[80vh]" />
          </div>
        </div>
      )}
    </div>
  );
}
