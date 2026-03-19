'use client';

import React, { useState } from 'react';
import { GLOSSARY_ITEMS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Search, Lightbulb, AlertTriangle, BookOpen } from 'lucide-react';

export function GlossarySection() {
  const [search, setSearch] = useState('');

  const filteredItems = GLOSSARY_ITEMS.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Search any term (e.g. 'dilution', 'valuation', 'cliff')..." 
          className="pl-10 h-12 bg-white shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {filteredItems.map((item, idx) => (
          <AccordionItem key={idx} value={`item-${idx}`} className="bg-white border rounded-lg px-4 shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-6">
              <div className="flex items-center gap-4 text-left">
                <Badge variant="outline" className="font-code uppercase text-[10px] tracking-widest px-2 py-0.5" style={{ color: item.color, borderColor: `${item.color}30`, backgroundColor: `${item.color}05` }}>
                  {item.label}
                </Badge>
                <span className="font-bold text-lg tracking-tight">{item.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="space-y-4 pt-2">
                <p className="text-muted-foreground text-base leading-relaxed">{item.desc}</p>
                
                <div className="bg-muted/30 border-l-4 border-primary p-4 rounded-r-lg">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary mb-2">
                    <BookOpen className="w-3 h-3" />
                    Real-World Example
                  </div>
                  <p className="text-sm font-body">{item.example}</p>
                </div>

                <div className={`p-4 rounded-lg flex gap-3 ${item.tipType === 'warn' ? 'bg-amber-50 border border-amber-200 text-amber-900' : item.tipType === 'good' ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-red-50 border border-red-200 text-red-900'}`}>
                  {item.tipType === 'warn' ? <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" /> : <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  <div>
                    <div className="font-bold text-sm uppercase tracking-tighter mb-1">
                      {item.tipType === 'warn' ? 'Founder Warning' : item.tipType === 'good' ? 'Strategic Tip' : 'Dark Pattern Alert'}
                    </div>
                    <p className="text-sm leading-snug opacity-90">{item.tip}</p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-muted-foreground italic">
            No terms found matching your search.
          </div>
        )}
      </Accordion>
    </div>
  );
}