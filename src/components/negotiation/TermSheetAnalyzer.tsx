'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, Loader2, MessageSquare, Search, Send, CheckCircle2, Bot, User, Trash2, ShieldAlert, ShieldCheck, ShieldQuestion
} from 'lucide-react';
import { termSheetQAAssistant, TermSheetQAOutput } from '@/ai/flows/term-sheet-qa-flow';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

interface TermSheetAnalyzerProps {
  userId: string;
  companyProfileId: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedFollowUpQuestions?: string[];
  riskLevel?: 'Low' | 'Medium' | 'High';
  riskRationale?: string;
}

export function TermSheetAnalyzer({ userId, companyProfileId }: TermSheetAnalyzerProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const chatRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'chats', 'termSheetAnalyzer');
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  useEffect(() => {
    if (chatRef) {
      getDoc(chatRef).then(snap => {
        if (snap.exists() && snap.data().messages) {
          setMessages(snap.data().messages);
        }
      }).catch(() => { /* Rules not yet deployed — silently skip loading chat */ });
    }
  }, [chatRef]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const saveChat = async (newMessages: ChatMessage[]) => {
    if (chatRef) {
      try {
        await setDoc(chatRef, { messages: newMessages }, { merge: true });
      } catch {
        // Silently fail — Firestore rules may not be deployed yet
      }
    }
  };

  const handleClearChat = async () => {
    setMessages([]);
    if (chatRef) {
      try {
        await deleteDoc(chatRef);
      } catch {
        // Silently fail — Firestore rules may not be deployed yet
      }
    }
  };

  const handleAsk = async (explicitQuestion?: string) => {
    const q = explicitQuestion || question;
    if (!q.trim() || loading) return;
    
    setQuestion('');
    const userMessage: ChatMessage = { role: 'user', content: q };
    const messagesAfterUser = [...messages, userMessage];
    setMessages(messagesAfterUser);
    saveChat(messagesAfterUser);
    setLoading(true);

    try {
      const input = {
        question: q,
        companyName: profile?.companyName || 'My Startup',
        stage: profile?.stage || 'Seed Stage',
        industry: profile?.industry || 'SaaS',
        monthlyRevenue: profile?.mRevenue || 0,
      };

      const result = await termSheetQAAssistant(input);
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: result.answer,
        suggestedFollowUpQuestions: result.suggestedFollowUpQuestions,
        riskLevel: result.riskLevel,
        riskRationale: result.riskRationale,
      };
      const messagesAfterAssistant = [...messagesAfterUser, assistantMessage];
      setMessages(messagesAfterAssistant);
      saveChat(messagesAfterAssistant);
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while analyzing your question. Please try again.' 
      };
      const messagesAfterError = [...messagesAfterUser, errorMessage];
      setMessages(messagesAfterError);
      saveChat(messagesAfterError);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 items-start">
      <Card className="border-2 border-primary/10 shadow-lg min-h-[600px] flex flex-col">
        <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between py-4">
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              Term Sheet Q&A Analyser
            </CardTitle>
            <CardDescription className="text-base font-medium">
              Ask any question about term sheet content or negotiation details. Powered by founder-friendly AI.
            </CardDescription>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-muted-foreground hover:text-destructive shrink-0 mt-0">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Chat
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-6 h-[400px]">
            <div className="space-y-6" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 animate-in fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h3 className="font-bold text-lg">What do you want to know?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Ask about specific clauses, dilution, board seats, liquidations preferences, or anything else in your term sheet.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <BadgeButton text="What is a 'Full Ratchet'?" onClick={() => handleAsk("What is a 'Full Ratchet' anti-dilution clause?")} />
                    <BadgeButton text="How should I negotiate Board Seats?" onClick={() => handleAsk("How should I negotiate Board Seats?")} />
                    <BadgeButton text="Explain 1x Non-Participating" onClick={() => handleAsk("Explain 1x Non-Participating Liquidation Preference")} />
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`flex flex-col gap-2 max-w-[80%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed overflow-hidden break-words w-full ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none shadow-md whitespace-pre-wrap' 
                          : 'bg-muted/50 border shadow-sm rounded-tl-none prose prose-sm max-w-none'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                      
                      {msg.role === 'assistant' && msg.riskLevel && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold w-full animate-in fade-in mt-1 ${
                          msg.riskLevel === 'High'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : msg.riskLevel === 'Medium'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-green-50 border-green-200 text-green-700'
                        }`}>
                          {msg.riskLevel === 'High' ? (
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                          ) : msg.riskLevel === 'Medium' ? (
                            <ShieldQuestion className="w-4 h-4 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                          )}
                          <span className="font-black uppercase tracking-widest text-[10px]">{msg.riskLevel} Risk</span>
                          {msg.riskRationale && (
                            <span className="font-medium opacity-75 text-[10px] border-l pl-2 ml-1">{msg.riskRationale}</span>
                          )}
                        </div>
                      )}
                      
                      {msg.suggestedFollowUpQuestions && msg.suggestedFollowUpQuestions.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2 w-full animate-in fade-in slide-in-from-bottom-2">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Suggested Follow-ups</span>
                          <div className="flex flex-wrap gap-2">
                            {msg.suggestedFollowUpQuestions.map((fq, fidx) => (
                              <Button 
                                key={fidx} 
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-8 rounded-full border-primary/20 hover:bg-primary/5 hover:border-primary text-left justify-start truncate max-w-full"
                                onClick={() => handleAsk(fq)}
                              >
                                {fq}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {loading && (
                <div className="flex gap-4 justify-start animate-in fade-in">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/50 border rounded-tl-none flex gap-1 items-center h-[52px]">
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-muted/20 border-t">
            <div className="relative">
              <Textarea 
                placeholder="Ask about liquidation preferences, dilution, anti-dilution, board control..."
                className="pr-14 min-h-[60px] max-h-[150px] resize-y rounded-xl border-primary/20 focus-visible:ring-primary shadow-sm"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button 
                size="icon" 
                className="absolute right-2 bottom-2 h-8 w-8 rounded-lg shadow-md hover:scale-105 transition-transform"
                disabled={loading || !question.trim()}
                onClick={() => handleAsk()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center mt-3">
               <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center justify-center gap-1">
                 <CheckCircle2 className="w-3 h-3 text-green-500" />
                 Provides Truthful & Founder-Friendly Advice
               </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BadgeButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-3 py-1.5 bg-background border border-border hover:border-primary hover:bg-primary/5 text-xs font-medium rounded-full transition-all shadow-sm"
    >
      {text}
    </button>
  );
}
