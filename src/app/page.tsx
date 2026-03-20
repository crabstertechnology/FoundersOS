'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, LayoutDashboard, BookOpen, Loader2, LogOut, Sparkles, ShieldCheck, ArrowRight, Gavel } from 'lucide-react';
import { ValuationCalculator } from '@/components/calculator/ValuationCalculator';
import { CapTableTracker } from '@/components/cap-table/CapTableTracker';
import { GlossarySection } from '@/components/glossary/GlossarySection';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useUser, useAuth, initiateSignOut } from '@/firebase';
import { Button } from '@/components/ui/button';
import { QuickCalculator } from '@/components/calculator/QuickCalculator';
import { TermSheetAssistant } from '@/components/negotiation/TermSheetAssistant';
import { FeatureBrochure } from '@/components/FeatureBrochure';


export default function FounderOSPage() {
  const [activeTab, setActiveTab] = useState('calc');
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  // If we are checking auth state, show a minimal loader
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-code uppercase tracking-widest text-xs">Verifying Founder Session...</p>
        </div>
      </div>
    );
  }

  // Determine if the user is fully signed in (not anonymous)
  const isAuthenticated = user && !user.isAnonymous;
  const userId = user?.uid;
  const companyProfileId = 'primary-startup';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border h-20 flex items-center px-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-primary text-white font-headline font-black text-xl w-10 h-10 flex items-center justify-center rounded-lg shadow-sm">F</div>
          <span className="font-headline font-extrabold text-2xl tracking-tighter hidden md:inline">FOUNDER<span className="text-primary">OS</span></span>
        </div>
        
        <div className="flex-1 flex justify-center">
          {isAuthenticated ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto">
              <TabsList className="bg-transparent border-none gap-1">
                <TabsTrigger value="calc" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4 rounded-full transition-all">
                  <Calculator className="w-4 h-4" />
                  <span className="hidden sm:inline">Calculator</span>
                </TabsTrigger>
                <TabsTrigger value="tracker" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4 rounded-full transition-all">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Cap Table</span>
                </TabsTrigger>
                <TabsTrigger value="negotiate" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4 rounded-full transition-all">
                  <Gavel className="w-4 h-4" />
                  <span className="hidden sm:inline">Negotiate</span>
                </TabsTrigger>
                <TabsTrigger value="glossary" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4 rounded-full transition-all">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Glossary</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <div className="hidden lg:flex items-center gap-4 animate-in fade-in">
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('valuation')?.scrollIntoView({ behavior: 'smooth' })}>Valuation Engine</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('equity')?.scrollIntoView({ behavior: 'smooth' })}>Equity Tracker</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('term-sheet')?.scrollIntoView({ behavior: 'smooth' })}>Term Sheet AI</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('glossary')?.scrollIntoView({ behavior: 'smooth' })}>Founder's Glossary</Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {isAuthenticated && <QuickCalculator />}
          
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end text-right">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Founder Account</span>
                <span className="text-xs font-semibold truncate max-w-[150px]">{user.email}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => initiateSignOut(auth)} 
                title="Sign Out"
                className="hover:bg-destructive/10 hover:text-destructive rounded-full"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <AuthDialog />
          )}
        </div>
      </header>

      <main className="flex-1 w-full">
        {!isAuthenticated ? (
          <div className="max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-16 md:pb-32 space-y-32">
            <div className="text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-bold tracking-tight mx-auto">
                <Sparkles className="w-4 h-4" />
                The Complete Operating System for Indian Founders
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] max-w-4xl mx-auto">
                Scale Your Startup with <span className="text-primary italic">Analytical Rigor.</span>
              </h1>
              <p className="text-muted-foreground text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-medium opacity-90">
                Professional valuation calculators, cap table management, and AI-driven strategic advice. Built specifically for the Indian startup ecosystem.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                <AuthDialog trigger={<Button size="lg" className="h-16 px-10 text-xl font-bold gap-3 rounded-full shadow-2xl hover:scale-105 transition-all bg-primary hover:shadow-primary/20">
                  Get Started for Free <ArrowRight className="w-6 h-6" />
                </Button>} />
              </div>
            </div>

            <div className="space-y-4 text-center mt-12 mb-8">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">The Ultimate Startup OS</h2>
              <p className="text-xl text-muted-foreground font-medium">Four professional tools integrated into a single unified platform.</p>
            </div>

            <FeatureBrochure />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-700">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="calc" className="mt-0 focus-visible:outline-none">
                <div className="mb-12 text-center space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight">
                    Startup <span className="text-primary">Valuation</span> Calculator
                  </h1>
                  <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-80">
                    Model your funding rounds, track unit economics, and get AI-powered strategic advice instantly.
                  </p>
                </div>
                <ValuationCalculator userId={userId!} companyProfileId={companyProfileId} />
              </TabsContent>
              
              <TabsContent value="tracker" className="mt-0 focus-visible:outline-none">
                <div className="mb-12 text-center space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight">
                    Cap <span className="text-primary">Table</span> Tracker
                  </h1>
                  <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-80">
                    Track ownership percentages, share types, and board control health checks.
                  </p>
                </div>
                <CapTableTracker userId={userId!} companyProfileId={companyProfileId} />
              </TabsContent>

              <TabsContent value="negotiate" className="mt-0 focus-visible:outline-none">
                <div className="mb-12 text-center space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight">
                    Term Sheet <span className="text-primary">Assistant</span>
                  </h1>
                  <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-80">
                    Paste your deal clauses and let AI identify red flags and founder-friendly counter-arguments.
                  </p>
                </div>
                <TermSheetAssistant userId={userId!} companyProfileId={companyProfileId} />
              </TabsContent>

              <TabsContent value="glossary" className="mt-0 focus-visible:outline-none">
                <div className="mb-12 text-center space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight">
                    Founder's <span className="text-primary">Glossary</span>
                  </h1>
                  <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-80">
                    Master the jargon of VC funding with plain-English explanations and real-world examples.
                  </p>
                </div>
                <GlossarySection />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <footer className="py-16 border-t mt-20 text-center text-sm text-muted-foreground bg-muted/30">
        <div className="font-code tracking-widest uppercase font-bold">FOUNDEROS · Built for Indian Startup Founders · Tamil Nadu Edition</div>
      </footer>
    </div>
  );
}
