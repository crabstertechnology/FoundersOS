'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, LayoutDashboard, BookOpen, Sparkles } from 'lucide-react';
import { ValuationCalculator } from '@/components/calculator/ValuationCalculator';
import { CapTableTracker } from '@/components/cap-table/CapTableTracker';
import { GlossarySection } from '@/components/glossary/GlossarySection';
import { AIStrategicAdvisor } from '@/components/ai-advisor/AIStrategicAdvisor';

export default function FounderOSPage() {
  const [activeTab, setActiveTab] = useState('calc');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border h-16 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white font-headline font-bold text-xl px-2 py-0.5 rounded italic">F</div>
          <span className="font-headline font-extrabold text-xl tracking-tight">FOUNDER<span className="text-primary">OS</span></span>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="ml-auto">
          <TabsList className="bg-transparent border-none">
            <TabsTrigger value="calc" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Calculator</span>
            </TabsTrigger>
            <TabsTrigger value="tracker" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Cap Table</span>
            </TabsTrigger>
            <TabsTrigger value="glossary" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Glossary</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="calc" className="mt-0 focus-visible:outline-none">
            <div className="mb-12 text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Startup <span className="text-primary">Valuation</span> Calculator
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Model your funding rounds, track unit economics, and get AI-powered strategic advice instantly.
              </p>
            </div>
            <ValuationCalculator />
          </TabsContent>
          
          <TabsContent value="tracker" className="mt-0 focus-visible:outline-none">
            <div className="mb-12 text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Cap <span className="text-primary">Table</span> Tracker
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Track ownership percentages, share types, and board control health checks.
              </p>
            </div>
            <CapTableTracker />
          </TabsContent>

          <TabsContent value="glossary" className="mt-0 focus-visible:outline-none">
            <div className="mb-12 text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Founder's <span className="text-primary">Glossary</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Master the jargon of VC funding with plain-English explanations and real-world examples.
              </p>
            </div>
            <GlossarySection />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="py-12 border-t mt-20 text-center text-sm text-muted-foreground bg-muted/30">
        <div className="font-code tracking-widest uppercase">FOUNDEROS · Built for Indian Startup Founders · Tamil Nadu Edition</div>
      </footer>
    </div>
  );
}