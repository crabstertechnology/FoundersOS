'use client';

import React, { useState, useMemo } from 'react';
import { GLOSSARY_ITEMS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Search, Lightbulb, AlertTriangle, BookOpen, Sparkles, ShieldAlert, Zap, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function GlossarySection() {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => 
    GLOSSARY_ITEMS.filter(item => 
      item.title.toLowerCase().includes(search.toLowerCase()) || 
      item.desc.toLowerCase().includes(search.toLowerCase()) ||
      item.tag.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const categories = useMemo(() => Array.from(new Set(GLOSSARY_ITEMS.map(i => i.label))), []);

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Glossary Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <span className="text-2xl font-black text-primary">{GLOSSARY_ITEMS.length}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Terms Covered</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <span className="text-2xl font-black text-primary">{categories.length}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Categories</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Zap className="w-6 h-6 text-amber-500 mb-1" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Real ₹ Examples</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Globe className="w-6 h-6 text-green-600 mb-1" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">TN / India Specific</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Master the Jargon</p>
          <h2 className="text-3xl font-black tracking-tight">Founder's Knowledge Base</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Plain English definitions for Crabster Technology and the Tamil Nadu ecosystem.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search for terms like 'dilution', 'ROFR', or 'dark pattern'..." 
            className="pl-10 h-14 bg-white shadow-lg rounded-full border-primary/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {filteredItems.map((item, idx) => (
          <AccordionItem key={idx} value={`item-${idx}`} className="bg-white border rounded-2xl px-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden group border-primary/5">
            <AccordionTrigger className="hover:no-underline py-6">
              <div className="flex items-center gap-4 text-left">
                <Badge variant="outline" className="font-code uppercase text-[10px] tracking-widest px-3 py-1 rounded-md" style={{ color: item.color, borderColor: `${item.color}30`, backgroundColor: `${item.color}05` }}>
                  {item.label}
                </Badge>
                <span className="font-bold text-lg tracking-tight group-data-[state=open]:text-primary transition-colors">{item.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-8">
              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">The Definition</div>
                  <p className="text-muted-foreground text-base leading-relaxed">{item.desc}</p>
                </div>
                
                <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-2xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
                    <BookOpen className="w-3.5 h-3.5" />
                    Real-World Example (₹)
                  </div>
                  <p className="text-sm font-medium leading-relaxed italic opacity-80">"{item.example}"</p>
                </div>

                <div className={`p-6 rounded-2xl flex gap-4 ${item.tipType === 'warn' ? 'bg-amber-50 border border-amber-200 text-amber-900' : item.tipType === 'good' ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-destructive/5 border border-destructive/20 text-destructive'}`}>
                  {item.tipType === 'warn' ? <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" /> : item.tipType === 'good' ? <Sparkles className="w-6 h-6 text-green-600 shrink-0" /> : <ShieldAlert className="w-6 h-6 text-destructive shrink-0" />}
                  <div className="space-y-1">
                    <div className="font-black text-xs uppercase tracking-widest">
                      {item.tipType === 'warn' ? 'Founder Warning' : item.tipType === 'good' ? 'Strategic Tip' : 'Dark Pattern Alert'}
                    </div>
                    <p className="text-sm font-medium leading-relaxed opacity-90">{item.tip}</p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center py-32 space-y-4">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto opacity-50">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground italic font-medium">
              No matching terms found. Try searching for broader concepts like "Equity" or "Round".
            </p>
          </div>
        )}
      </Accordion>

      <footer className="text-center pt-12 pb-20 space-y-4 border-t border-dashed">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
          Built for <span className="text-primary font-black">Crabster Technology</span> • Tamil Nadu, India
        </p>
        <p className="text-[10px] text-muted-foreground max-w-md mx-auto leading-relaxed">
          Disclaimer: This glossary is for educational purposes. Always consult with a specialized startup CA and lawyer before signing any legal documents.
        </p>
      </footer>
    </div>
  );
}
