'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, LayoutDashboard, BookOpen, Loader2, LogOut, Sparkles, 
  ShieldCheck, ArrowRight, Gavel, PieChart, Home, TrendingUp, Activity 
} from 'lucide-react';
import { ValuationCalculator } from '@/components/calculator/ValuationCalculator';
import { CapTableTracker } from '@/components/cap-table/CapTableTracker';
import { GlossarySection } from '@/components/glossary/GlossarySection';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useUser, useAuth, initiateSignOut } from '@/firebase';
import { Button } from '@/components/ui/button';
import { QuickCalculator } from '@/components/calculator/QuickCalculator';
import { TermSheetAssistant } from '@/components/negotiation/TermSheetAssistant';
import { TermSheetAnalyzer } from '@/components/negotiation/TermSheetAnalyzer';
import { FeatureBrochure } from '@/components/FeatureBrochure';
import { ExitSimulator } from '@/components/calculator/ExitSimulator';
import { CentralDashboard } from '@/components/dashboard/CentralDashboard';
import { SalesAnalytics } from '@/components/sales/SalesAnalytics';
import { OperationsDashboard } from '@/components/operations/OperationsDashboard';
import { SettingsPage } from '@/components/operations/SettingsPage';


export default function FounderOSPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [financeTab, setFinanceTab] = useState('calc');
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

  const handleNavigate = (tab: string) => {
    if (['calc', 'tracker', 'exit', 'negotiate', 'qa', 'glossary'].includes(tab)) {
      setActiveTab('finance');
      setFinanceTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border h-20 flex items-center px-6 print:hidden">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-primary text-white font-headline font-black text-xl w-10 h-10 flex items-center justify-center rounded-lg shadow-sm">F</div>
          <span className="font-headline font-extrabold text-2xl tracking-tighter hidden md:inline">FOUNDER<span className="text-primary">OS</span></span>
        </div>
        
        <div className="flex-1 flex justify-center">
          {isAuthenticated ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto">
              <TabsList className="bg-transparent border-none gap-1">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4 rounded-full transition-all">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline font-bold text-xs">Home</span>
                </TabsTrigger>
                <TabsTrigger value="sales" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-650 data-[state=active]:text-indigo-700 gap-2 h-10 px-4 rounded-full transition-all">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline font-bold text-xs">Sales</span>
                </TabsTrigger>
                <TabsTrigger value="finance" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4 rounded-full transition-all">
                  <Calculator className="w-4 h-4" />
                  <span className="hidden sm:inline font-bold text-xs font-headline">Finance</span>
                </TabsTrigger>
                <TabsTrigger value="operations" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 gap-2 h-10 px-4 rounded-full transition-all">
                  <Activity className="w-4 h-4 text-teal-650 text-teal-650 text-teal-600" />
                  <span className="hidden sm:inline font-bold text-xs">Operations</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <div className="hidden lg:flex items-center gap-4 animate-in fade-in">
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('valuation')?.scrollIntoView({ behavior: 'smooth' })}>Valuation Engine</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('equity')?.scrollIntoView({ behavior: 'smooth' })}>Equity Tracker</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('exit-sim')?.scrollIntoView({ behavior: 'smooth' })}>Exit Sim</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('term-sheet')?.scrollIntoView({ behavior: 'smooth' })}>Term Sheet AI</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('qa-analyser')?.scrollIntoView({ behavior: 'smooth' })}>Term Sheet Q&A</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('glossary')?.scrollIntoView({ behavior: 'smooth' })}>Founder's Glossary</Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {isAuthenticated && <QuickCalculator />}
          
          {isAuthenticated ? (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 text-left p-1.5 rounded-full transition-all group border ${
                activeTab === 'settings' ? 'bg-primary/5 border-primary/20 ring-2 ring-primary/20' : 'hover:bg-slate-50 border-transparent'
              }`}
            >
              <div className="w-9 h-9 bg-primary text-white font-black text-sm flex items-center justify-center rounded-full shadow-sm group-hover:scale-105 transition-all">
                {user.email?.charAt(0).toUpperCase() || 'F'}
              </div>
              <div className="hidden lg:flex flex-col items-start leading-none shrink-0 pr-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Founder Account</span>
                <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{user.email}</span>
              </div>
            </button>
          ) : (
            <AuthDialog />
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-700 print:hidden">
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
              <p className="text-xl text-muted-foreground font-medium">Complete Suite for Sales, Equity Finance, and Runway Operations.</p>
            </div>

            <FeatureBrochure />
          </div>
        ) : (
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              
              {/* Home Dashboard Tab */}
              <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
                <CentralDashboard userId={userId!} companyProfileId={companyProfileId} onNavigate={handleNavigate} />
              </TabsContent>
              
              {/* Sales Tab */}
              <TabsContent value="sales" className="mt-0 focus-visible:outline-none">
                <SalesAnalytics userId={userId!} companyProfileId={companyProfileId} />
              </TabsContent>
              
              {/* Finance Suite Tab (Nested Tabs) */}
              <TabsContent value="finance" className="mt-0 focus-visible:outline-none">
                <Tabs value={financeTab} onValueChange={setFinanceTab} className="w-full">
                  <div className="flex justify-center border-b pb-3 mb-8">
                    <TabsList className="bg-slate-100/80 p-1 rounded-full gap-0.5 border-none h-11">
                      <TabsTrigger value="calc" className="rounded-full px-5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                        Valuation Calculator
                      </TabsTrigger>
                      <TabsTrigger value="tracker" className="rounded-full px-5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                        Cap Table
                      </TabsTrigger>
                      <TabsTrigger value="exit" className="rounded-full px-5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                        Exit Simulator
                      </TabsTrigger>
                      <TabsTrigger value="negotiate" className="rounded-full px-5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                        Term Sheet Assistant
                      </TabsTrigger>
                      <TabsTrigger value="qa" className="rounded-full px-5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                        Term Sheet Q&A
                      </TabsTrigger>
                      <TabsTrigger value="glossary" className="rounded-full px-5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
                        Glossary
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="calc" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="mb-12 text-center space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                        Startup <span className="text-primary">Valuation</span> Calculator
                      </h1>
                      <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                        Model your funding rounds, track unit economics, and get AI-powered strategic advice instantly.
                      </p>
                    </div>
                    <ValuationCalculator userId={userId!} companyProfileId={companyProfileId} />
                  </TabsContent>

                  <TabsContent value="tracker" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="mb-12 text-center space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                        Cap <span className="text-primary">Table</span> Tracker
                      </h1>
                      <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                        Track ownership percentages, share types, and board control health checks.
                      </p>
                    </div>
                    <CapTableTracker userId={userId!} companyProfileId={companyProfileId} />
                  </TabsContent>

                  <TabsContent value="exit" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="mb-12 text-center space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                        Exit <span className="text-primary">Waterfall</span> Simulator
                      </h1>
                      <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                        See exactly who gets what when your startup is acquired or goes public. Model complex liquidation preferences in real-time.
                      </p>
                    </div>
                    <ExitSimulator userId={userId!} companyProfileId={companyProfileId} />
                  </TabsContent>

                  <TabsContent value="negotiate" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="mb-12 text-center space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                        Term Sheet <span className="text-primary">Assistant</span>
                      </h1>
                      <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                        Paste your deal clauses and let AI identify red flags and founder-friendly counter-arguments.
                      </p>
                    </div>
                    <TermSheetAssistant userId={userId!} companyProfileId={companyProfileId} />
                  </TabsContent>

                  <TabsContent value="qa" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="mb-12 text-center space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                        Term Sheet <span className="text-primary">Q&A</span>
                      </h1>
                      <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                        Ask any questions about term sheets, clauses, or negotiation strategies and get founder-friendly AI advice.
                      </p>
                    </div>
                    <TermSheetAnalyzer userId={userId!} companyProfileId={companyProfileId} />
                  </TabsContent>

                  <TabsContent value="glossary" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                    <div className="mb-12 text-center space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                        Founder's <span className="text-primary">Glossary</span>
                      </h1>
                      <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                        Master the jargon of VC funding with plain-English explanations and real-world examples.
                      </p>
                    </div>
                    <GlossarySection />
                  </TabsContent>
                </Tabs>
              </TabsContent>
              
              {/* Operations Tab */}
              <TabsContent value="operations" className="mt-0 focus-visible:outline-none">
                <OperationsDashboard userId={userId!} companyProfileId={companyProfileId} />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
                <SettingsPage userId={userId!} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <footer className="py-16 border-t mt-20 text-center text-sm text-muted-foreground bg-muted/30 print:hidden">
        <div className="font-code tracking-widest uppercase font-bold">FOUNDEROS · Built for Indian Startup Founders · Tamil Nadu Edition</div>
      </footer>
    </div>
  );
}
