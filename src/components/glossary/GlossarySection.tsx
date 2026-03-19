'use client';

import React, { useState, useMemo } from 'react';
import { GLOSSARY_ITEMS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Lightbulb, AlertTriangle, BookOpen, 
  Sparkles, ShieldAlert, Zap, Globe, Info, 
  ChevronRight, Filter, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { explainStartupTerm } from '@/ai/flows/dynamic-glossary-explainer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function GlossarySection() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<any>(null);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(GLOSSARY_ITEMS.map(i => i.label)));
    return ['All', ...cats];
  }, []);

  const filteredItems = useMemo(() => 
    GLOSSARY_ITEMS.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                            item.desc.toLowerCase().includes(search.toLowerCase()) ||
                            item.tag.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || item.label === activeCategory;
      return matchesSearch && matchesCategory;
    }), [search, activeCategory]);

  const handleAskAI = async (term: string) => {
    setExplainingId(term);
    try {
      const result = await explainStartupTerm({ termOrClause: term });
      setAiExplanation(result);
    } catch (err) {
      console.error(err);
    } finally {
      setExplainingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Glossary Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-6 flex flex-col items-center text-center gap-1">
            <span className="text-3xl font-black text-primary">{GLOSSARY_ITEMS.length}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Terms Covered</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-6 flex flex-col items-center text-center gap-1">
            <span className="text-3xl font-black text-primary">{categories.length - 1}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Categories</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-6 flex flex-col items-center text-center gap-1">
            <Zap className="w-8 h-8 text-amber-500 mb-1" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Real ₹ Examples</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-6 flex flex-col items-center text-center gap-1">
            <Globe className="w-8 h-8 text-green-600 mb-1" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">TN / India Specific</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
            <BookOpen className="w-3 h-3" />
            FounderOS Knowledge Base
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Master the <span className="text-primary">Jargon</span></h2>
          <p className="text-muted-foreground max-w-lg mx-auto font-medium">
            Simplified definitions and strategic warnings for the Indian startup ecosystem.
          </p>
        </div>

        <div className="space-y-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input 
              placeholder="Search terms (e.g. 'Dilution', 'LTV', 'ROFR')..." 
              className="pl-12 h-16 bg-white shadow-xl rounded-2xl border-primary/10 text-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2 mr-2 text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Filter:</span>
            </div>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                  activeCategory === cat 
                    ? "bg-primary text-white border-primary shadow-md scale-105" 
                    : "bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, idx) => (
          <Card key={idx} className="flex flex-col h-full bg-white border-primary/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardHeader className="pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className="font-code uppercase text-[9px] tracking-widest px-2.5 py-0.5 rounded-md" 
                  style={{ 
                    color: item.color, 
                    borderColor: `${item.color}30`, 
                    backgroundColor: `${item.color}05` 
                  }}
                >
                  {item.label}
                </Badge>
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Info className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 flex flex-col">
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {item.desc}
              </p>
              
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 border-l-2 border-primary rounded-r-xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-widest text-primary">
                    <Zap className="w-3 h-3" />
                    Indian Context Example
                  </div>
                  <p className="text-xs font-medium leading-relaxed italic text-foreground opacity-80">
                    "{item.example}"
                  </p>
                </div>

                <div className={`p-4 rounded-xl flex gap-3 ${
                  item.tipType === 'warn' 
                    ? 'bg-amber-50 border border-amber-200/50' 
                    : item.tipType === 'good' 
                    ? 'bg-green-50 border border-green-200/50' 
                    : 'bg-destructive/5 border border-destructive/10'
                }`}>
                  <div className="shrink-0 mt-0.5">
                    {item.tipType === 'warn' 
                      ? <AlertTriangle className="w-4 h-4 text-amber-600" /> 
                      : item.tipType === 'good' 
                      ? <Sparkles className="w-4 h-4 text-green-600" /> 
                      : <ShieldAlert className="w-4 h-4 text-destructive" />
                    }
                  </div>
                  <div className="space-y-1">
                    <div className={`font-black text-[9px] uppercase tracking-widest ${
                      item.tipType === 'warn' ? 'text-amber-800' : item.tipType === 'good' ? 'text-green-800' : 'text-destructive'
                    }`}>
                      {item.tipType === 'warn' ? 'Founder Warning' : item.tipType === 'good' ? 'Strategic Tip' : 'Dark Pattern Alert'}
                    </div>
                    <p className={`text-xs font-medium leading-relaxed ${
                      item.tipType === 'warn' ? 'text-amber-900' : item.tipType === 'good' ? 'text-green-900' : 'text-destructive'
                    }`}>
                      {item.tip}
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full gap-2 font-bold text-xs rounded-full border-primary/20 hover:bg-primary/5 h-10"
                  onClick={() => handleAskAI(item.title)}
                  disabled={explainingId !== null}
                >
                  {explainingId === item.title ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                  Ask AI to Simplify & Contextualize
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!aiExplanation} onOpenChange={() => setAiExplanation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Jargon Explainer
            </DialogTitle>
            <DialogDescription>
              A deep-dive analysis of this startup term localized for your context.
            </DialogDescription>
          </DialogHeader>
          {aiExplanation && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-black tracking-widest text-primary">Simplified Logic</div>
                <p className="text-sm leading-relaxed font-medium">{aiExplanation.explanation}</p>
              </div>
              <div className="space-y-2 bg-muted/30 p-4 rounded-xl border">
                <div className="text-[10px] uppercase font-black tracking-widest text-green-700">Indian Market Example</div>
                <p className="text-sm leading-relaxed italic">{aiExplanation.indianContextExample}</p>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-black tracking-widest text-amber-700">Practical Implications</div>
                <p className="text-sm leading-relaxed font-bold">{aiExplanation.practicalImplications}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredItems.length === 0 && (
        <div className="text-center py-32 space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Search className="w-10 h-10 text-muted-foreground opacity-20" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-muted-foreground">No matches found</p>
            <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto font-medium">
              Try searching for "Equity", "Valuation", or "LTV".
            </p>
          </div>
        </div>
      )}

      <footer className="text-center pt-16 pb-20 space-y-6 border-t border-dashed">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
            A Free Resource by
          </p>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border font-headline font-black text-primary italic">
            FOUNDER OS
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium">
          Disclaimer: This glossary is provided for educational purposes within the Indian startup hub context. 
          Always perform due diligence with a certified CA and legal counsel before signing any definitive documents.
        </p>
      </footer>
    </div>
  );
}
