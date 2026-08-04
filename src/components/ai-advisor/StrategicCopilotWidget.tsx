'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, Sparkles, Send, Loader2, X, Wrench, ChevronRight, ShieldCheck, RefreshCw 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askFounderOSAssistant, FounderOSAssistantOutput } from '@/ai/flows/assistant-tool-calling-flow';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  toolsCalled?: string[];
  timestamp: Date;
}

export function StrategicCopilotWidget({ companyName }: { companyName?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello! I am your **FounderOS Strategic AI Copilot** (Option 14 Tool-Calling Agent). Ask me anything about your runway, cap table equity, or investor terms!`,
      timestamp: new Date(),
    },
  ]);

  const quickPrompts = [
    'Calculate runway with ₹50L cash & ₹5L burn',
    'Is 60% founder equity safe at Seed stage?',
    'What is a 1x Non-Participating Liquidation Preference?',
  ];

  const handleSendMessage = async (promptToSend?: string) => {
    const queryText = (promptToSend || inputPrompt).trim();
    if (!queryText || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptToSend) setInputPrompt('');
    setLoading(true);

    try {
      const res: FounderOSAssistantOutput = await askFounderOSAssistant({
        userPrompt: queryText,
        companyName: companyName || 'FounderOS Startup',
      });

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answerMarkdown,
        toolsCalled: res.toolsCalled,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error calling FounderOS Copilot:', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I encountered an error executing your strategic query. Please check your network connection and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full h-14 px-6 bg-slate-900 text-white hover:bg-slate-800 shadow-2xl border border-slate-700 gap-3 hover:scale-105 transition-all duration-300 group"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-none">AI Copilot</div>
            <div className="text-[10px] text-emerald-400 font-mono">Tool Calling Active</div>
          </div>
        </Button>
      )}

      {/* Copilot Drawer Modal / Popup */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[420px] h-[600px] max-h-[85vh] shadow-2xl border-slate-800 bg-slate-950/95 backdrop-blur-xl text-slate-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <CardHeader className="bg-slate-900/80 border-b border-slate-800 p-4 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  FounderOS Strategic Copilot
                  <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 uppercase">
                    Option 14 AI
                  </Badge>
                </CardTitle>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Gemini 2.5 Flash + Tool Execution
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          {/* Chat Body */}
          <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-4 py-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-md font-medium'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-inner'
                      }`}
                    >
                      {msg.sender === 'ai' ? (
                        <div className="prose prose-invert prose-xs max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}

                      {/* Tool Execution Badges */}
                      {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                            <Wrench className="w-2.5 h-2.5 text-emerald-400" /> Tools used:
                          </span>
                          {msg.toolsCalled.map((tool, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[9px] font-mono bg-slate-800 text-emerald-300 border border-emerald-500/20 px-1.5 py-0"
                            >
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800 w-fit animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Executing backend tool analysis...</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Suggestions */}
            {messages.length < 3 && (
              <div className="py-2 space-y-1.5 shrink-0 border-t border-slate-800/80 mt-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Quick Strategic Queries</div>
                <div className="flex flex-col gap-1">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left text-[11px] bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 p-2 rounded-lg border border-slate-800 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt}</span>
                      <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          {/* Footer Input */}
          <CardFooter className="p-3 bg-slate-900/90 border-t border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 w-full"
            >
              <Input
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask financial, cap table, or valuation question..."
                disabled={loading}
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 text-xs focus-visible:ring-emerald-500/50 h-9"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !inputPrompt.trim()}
                className="h-9 w-9 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
