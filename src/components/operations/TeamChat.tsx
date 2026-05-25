'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { Send, Users, MessageSquare, Plus, Sparkles, Edit2, Trash2, X, Check } from 'lucide-react';
import type { Employee } from './TaskManager';

interface TeamChatProps {
  userId: string;
  companyProfileId: string;
  employees: Employee[];
  onQuickAssign?: (assigneeUid: string) => void;
}

export function TeamChat({ userId, companyProfileId, employees, onQuickAssign }: TeamChatProps) {
  const { user } = useFirebase();
  const firestore = useFirestore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messageText, setMessageText] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Firestore References
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

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatRef || !messageText.trim() || !user) return;

    addDocumentNonBlocking(chatRef, {
      senderUid: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'User',
      senderEmail: user.email || '',
      text: messageText.trim(),
      createdAt: serverTimestamp(),
    });

    setMessageText('');
  };

  const handleStartEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const handleSaveEdit = (msgId: string) => {
    if (!chatRef || !editText.trim()) return;
    setDocumentNonBlocking(doc(chatRef, msgId), { text: editText.trim() }, { merge: true });
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!chatRef || !window.confirm('Are you sure you want to delete this message?')) return;
    deleteDocumentNonBlocking(doc(chatRef, msgId));
  };

  const filteredMessages = useMemo(() => {
    if (selectedMemberFilter === 'all') return messages;
    return messages.filter(
      (m: any) => m.senderUid === selectedMemberFilter || (m.senderUid === userId && selectedMemberFilter === 'admin')
    );
  }, [messages, selectedMemberFilter, userId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px] animate-in fade-in duration-300">
      {/* Sidebar - Team Members */}
      <Card className="lg:col-span-1 border shadow-sm flex flex-col h-full overflow-hidden bg-slate-50/50">
        <CardHeader className="pb-3 bg-white border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            Team Members
          </CardTitle>
          <CardDescription>Chat or assign tasks</CardDescription>
        </CardHeader>
        <CardContent className="p-3 flex-1 overflow-y-auto space-y-1 bg-white">
          <button
            onClick={() => setSelectedMemberFilter('all')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
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
          <div
            className={`group w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
              selectedMemberFilter === 'admin' ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <button
              onClick={() => setSelectedMemberFilter('admin')}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-[10px] font-black text-amber-700">
                A
              </div>
              <div className="truncate">
                <div className="font-bold">Admin (You)</div>
                <div className="text-[10px] text-muted-foreground">Founder</div>
              </div>
            </button>
          </div>

          {/* Employee list */}
          {employees.map(emp => (
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
                <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-[10px] font-black text-teal-700">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="font-bold">{emp.name}</div>
                  <div className="text-[10px] text-muted-foreground">{emp.role || 'Member'}</div>
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
          ))}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-3 border shadow-sm flex flex-col h-full overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-slate-50/20">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              {selectedMemberFilter === 'all' ? 'General Team Chat' : 'Filtered Message Thread'}
            </CardTitle>
            <CardDescription>
              {selectedMemberFilter === 'all'
                ? 'Broadcast announcements or discuss operations with the team.'
                : 'Viewing messages filtered by sender.'}
            </CardDescription>
          </div>
          {selectedMemberFilter !== 'all' && (
            <Badge className="bg-teal-50 text-teal-700 border border-teal-200 uppercase font-black text-[9px]">
              Filtered
            </Badge>
          )}
        </CardHeader>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/20 min-h-0">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8 space-y-2">
              <Sparkles className="w-8 h-8 text-teal-300 animate-pulse" />
              <p className="text-sm font-semibold">No messages here yet.</p>
              <p className="text-xs">Start the conversation with your team members.</p>
            </div>
          ) : (
            filteredMessages.map((msg: any) => {
              const isSelf = user && msg.senderUid === user.uid;
              const senderInitial = (msg.senderName || 'U').charAt(0).toUpperCase();
              const isEditing = editingMessageId === msg.id;

              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isSelf ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    {senderInitial}
                  </div>

                  {/* Bubble */}
                  <div className={`space-y-1 flex flex-col max-w-[85%] ${isSelf ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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

                    <div className={`group relative flex items-center gap-2 ${isSelf ? 'flex-row-reverse' : ''}`}>
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
                            className={`p-3 rounded-2xl text-xs leading-relaxed max-w-sm md:max-w-md lg:max-w-lg break-words ${
                              isSelf
                                ? 'bg-teal-600 text-white rounded-tr-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                            }`}
                          >
                            {msg.text}
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
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Type message to team..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="text-xs focus:ring-teal-500"
              required
            />
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 gap-1.5 h-9 text-xs font-bold">
              <Send className="w-3.5 h-3.5" />
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
