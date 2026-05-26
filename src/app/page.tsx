'use client';

import React, { useState } from 'react';
import { doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, LayoutDashboard, BookOpen, Loader2, LogOut, Sparkles, 
  ShieldCheck, ArrowRight, Gavel, PieChart, Home, TrendingUp, Activity,
  Menu, X, ChevronLeft, ChevronDown, ChevronRight, Settings, ListChecks, MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { ValuationCalculator } from '@/components/calculator/ValuationCalculator';
import { CapTableTracker } from '@/components/cap-table/CapTableTracker';
import { GlossarySection } from '@/components/glossary/GlossarySection';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useUser, useAuth, initiateSignOut, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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
  const [salesTab, setSalesTab] = useState('crm');
  const [ezCirkitTab, setEzCirkitTab] = useState('weekly');
  const [financeTab, setFinanceTab] = useState('calc');
  const [operationsTab, setOperationsTab] = useState('ops');
  const [isSalesExpanded, setIsSalesExpanded] = useState(true);
  const [isEZCirkitExpanded, setIsEZCirkitExpanded] = useState(true);
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(true);
  const [isOperationsExpanded, setIsOperationsExpanded] = useState(true);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const employeeDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user?.uid]);

  const { data: employeeData, isLoading: isEmployeeLoading } = useDoc(employeeDocRef);

  // If we are checking auth state, show a minimal loader
  if (isUserLoading || (user && isEmployeeLoading)) {
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
  const employeeRecord = employeeData;
  const isEmployeeActive = employeeRecord ? employeeRecord.isActive !== false : true;

  // Deactivated screen
  if (isAuthenticated && !isEmployeeActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl shadow-lg p-10 text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-rose-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Access Suspended</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your employee account has been deactivated by the administrator. Please contact your company administrator to restore access.
          </p>
          <Button onClick={() => initiateSignOut(auth)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold w-full h-12">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const workspaceUserId = employeeRecord?.adminUid || user?.uid || '';
  const userRole = (employeeRecord?.role || 'admin').toLowerCase();
  const isReadOnly = userRole === 'employee';
  const userId = workspaceUserId;
  const companyProfileId = 'primary-startup';

  const handleNavigate = (tab: string) => {
    if (['calc', 'tracker', 'exit', 'negotiate', 'qa', 'glossary'].includes(tab)) {
      setActiveTab('finance');
      setFinanceTab(tab);
    } else if (['crm', 'ezcirkit'].includes(tab)) {
      setActiveTab('sales');
      setSalesTab(tab);
    } else if (['weekly', 'leads', 'workshops', 'products', 'activity'].includes(tab)) {
      setActiveTab('sales');
      setSalesTab('ezcirkit');
      setEzCirkitTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  // Dynamic Title for top header
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Founder Dashboard';
      case 'sales':
        switch (salesTab) {
          case 'crm': return 'CRM Pipeline';
          case 'ezcirkit':
            switch (ezCirkitTab) {
              case 'weekly': return 'Weekly Dashboard';
              case 'leads': return 'Lead Tracker';
              case 'workshops': return 'Workshop Tracker';
              case 'products': return 'Product Sales';
              case 'activity': return 'Daily Activity';
              default: return 'EZCirkit Sales Tracker';
            }
          default: return 'Sales Funnel Analytics';
        }
      case 'finance':
        switch (financeTab) {
          case 'calc': return 'Valuation Calculator';
          case 'tracker': return 'Cap Table Tracker';
          case 'exit': return 'Exit Simulator';
          case 'negotiate': return 'Term Sheet AI Assistant';
          case 'qa': return 'Term Sheet Q&A Assistant';
          case 'glossary': return 'Founder\'s Glossary';
          default: return 'Finance Suite';
        }
      case 'operations':
        switch (operationsTab) {
          case 'ops': return 'Runway Operations';
          case 'tasks': return 'Task Workspace';
          case 'chat': return 'Team Workspace Chat';
          default: return 'Operations Hub';
        }
      case 'settings': return 'Founder Configuration';
      default: return 'FounderOS';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border h-20 flex items-center px-6 print:hidden">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-primary text-white font-headline font-black text-xl w-10 h-10 flex items-center justify-center rounded-lg shadow-sm">F</div>
            <span className="font-headline font-extrabold text-2xl tracking-tighter hidden md:inline">FOUNDER<span className="text-primary">OS</span></span>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="hidden lg:flex items-center gap-4 animate-in fade-in">
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('valuation')?.scrollIntoView({ behavior: 'smooth' })}>Valuation Engine</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('equity')?.scrollIntoView({ behavior: 'smooth' })}>Equity Tracker</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('exit-sim')?.scrollIntoView({ behavior: 'smooth' })}>Exit Sim</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('term-sheet')?.scrollIntoView({ behavior: 'smooth' })}>Term Sheet AI</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('qa-analyser')?.scrollIntoView({ behavior: 'smooth' })}>Term Sheet Q&A</Button>
              <Button variant="ghost" className="text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('glossary')?.scrollIntoView({ behavior: 'smooth' })}>Founder's Glossary</Button>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto shrink-0">
            <AuthDialog />
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-700 print:hidden">
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
        </main>

        <footer className="py-16 border-t mt-20 text-center text-sm text-muted-foreground bg-muted/30 print:hidden">
          <div className="font-code tracking-widest uppercase font-bold">FOUNDEROS · Built for Indian Startup Founders · Tamil Nadu Edition</div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50/30">
      {/* Desktop Left Sidebar */}
      <aside className={`hidden md:flex ${isSidebarMinimized ? 'w-[76px]' : 'w-72'} bg-[#090d16] border-r border-slate-800 text-slate-300 flex-col h-screen sticky top-0 shrink-0 select-none transition-all duration-300`}>
        {/* Brand Header */}
        <div className={`h-16 border-b border-slate-800/80 flex items-center justify-between ${isSidebarMinimized ? 'px-3 justify-center' : 'px-6'} transition-all duration-300`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-primary text-white font-headline font-black text-lg w-8 h-8 flex items-center justify-center rounded-lg shadow-sm shrink-0">F</div>
            {!isSidebarMinimized && (
              <span className="font-headline font-black text-xl tracking-tight text-white animate-in fade-in duration-200">FOUNDER<span className="text-primary">OS</span></span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className={`text-slate-400 hover:text-white p-1 hover:bg-slate-850 rounded-lg hidden md:block shrink-0 ${isSidebarMinimized ? 'mt-0.5' : ''}`}
            title={isSidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          >
            {isSidebarMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {isSidebarMinimized ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-primary text-white shadow-md'
                    : 'hover:bg-slate-800/50 hover:text-slate-100 text-slate-400'
                }`}
                title="Central Console"
              >
                <Home className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setActiveTab('sales'); }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  activeTab === 'sales'
                    ? 'bg-primary text-white shadow-md'
                    : 'hover:bg-slate-800/50 hover:text-slate-100 text-slate-400'
                }`}
                title="Sales Tracker"
              >
                <TrendingUp className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setActiveTab('finance'); }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  activeTab === 'finance'
                    ? 'bg-primary text-white shadow-md'
                    : 'hover:bg-slate-800/50 hover:text-slate-100 text-slate-400'
                }`}
                title="Finance Suite"
              >
                <Calculator className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setActiveTab('operations'); }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  activeTab === 'operations'
                    ? 'bg-primary text-white shadow-md'
                    : 'hover:bg-slate-800/50 hover:text-slate-100 text-slate-400'
                }`}
                title="Operations Hub"
              >
                <ListChecks className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              {/* Central Console */}
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-primary text-white shadow-md shadow-primary/15'
                    : 'hover:bg-slate-800/50 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4" />
                  <span>Central Console</span>
                </div>
              </button>

              {/* Sales Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsSalesExpanded(!isSalesExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'sales'
                      ? 'text-white font-black'
                      : 'hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4" />
                    <span>Sales Tracker</span>
                  </div>
                  {isSalesExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  )}
                </button>

                {isSalesExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800/60 ml-5 animate-in slide-in-from-top-1 duration-200">
                    <button
                      onClick={() => { setActiveTab('sales'); setSalesTab('crm'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'sales' && salesTab === 'crm'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      CRM Pipeline
                    </button>

                    {/* Nested EZCirkit Tracker Collapse System */}
                    <div className="space-y-1 mt-1">
                      <button
                        onClick={() => setIsEZCirkitExpanded(!isEZCirkitExpanded)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          activeTab === 'sales' && salesTab === 'ezcirkit'
                            ? 'text-white font-bold'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850/30'
                        }`}
                      >
                        <span>EZCirkit Tracker</span>
                        {isEZCirkitExpanded ? (
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        ) : (
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        )}
                      </button>

                      {isEZCirkitExpanded && (
                        <div className="pl-3 py-0.5 space-y-0.5 border-l border-slate-800 ml-3 animate-in slide-in-from-top-1 duration-150">
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('weekly'); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'weekly'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'
                            }`}
                          >
                            Weekly Dashboard
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('leads'); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'leads'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'
                            }`}
                          >
                            Lead Tracker
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('workshops'); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'workshops'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'
                            }`}
                          >
                            Workshop Tracker
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('products'); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'products'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'
                            }`}
                          >
                            Product Sales
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('activity'); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'activity'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'
                            }`}
                          >
                            Daily Activity
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-850/80 my-3" />

              {/* Finance Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'finance'
                      ? 'text-white font-black'
                      : 'hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calculator className="w-4 h-4" />
                    <span>Finance Suite</span>
                  </div>
                  {isFinanceExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  )}
                </button>

                {isFinanceExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800/60 ml-5 animate-in slide-in-from-top-1 duration-200">
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'calc'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Valuation Calculator
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('tracker'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'tracker'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Cap Table Tracker
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('exit'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'exit'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Exit Simulator
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('negotiate'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'negotiate'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Term Sheet Assistant
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('qa'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'qa'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Term Sheet Q&A
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('glossary'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'glossary'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Founder's Glossary
                    </button>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-850/80 my-3" />

              {/* Operations Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsOperationsExpanded(!isOperationsExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'operations'
                      ? 'text-white font-black'
                      : 'hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4" />
                    <span>Operations Hub</span>
                  </div>
                  {isOperationsExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  )}
                </button>

                {isOperationsExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800/60 ml-5 animate-in slide-in-from-top-1 duration-200">
                    <button
                      onClick={() => { setActiveTab('operations'); setOperationsTab('ops'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'operations' && operationsTab === 'ops'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Runway & SaaS Burn
                    </button>
                    <button
                      onClick={() => { setActiveTab('operations'); setOperationsTab('tasks'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'operations' && operationsTab === 'tasks'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Task Workspace
                    </button>
                    <button
                      onClick={() => { setActiveTab('operations'); setOperationsTab('chat'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'operations' && operationsTab === 'chat'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                      }`}
                    >
                      Team Chat
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Profile/Footer Widget */}
        <div className={`p-4 border-t border-slate-800/80 bg-slate-950/40 transition-all duration-350 ${isSidebarMinimized ? 'flex flex-col items-center gap-3 py-4 px-2' : 'space-y-2'}`}>
          {isSidebarMinimized ? (
            <>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${
                  activeTab === 'settings'
                    ? 'bg-slate-800/60 border-slate-700 text-white'
                    : 'hover:bg-slate-850 border-transparent text-slate-400 hover:text-white'
                }`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => initiateSignOut(auth)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 text-left p-2 rounded-xl transition-all border ${
                  activeTab === 'settings'
                    ? 'bg-slate-800/60 border-slate-700 text-white'
                    : 'hover:bg-slate-850 border-transparent text-slate-300'
                }`}
              >
                <div className="w-8 h-8 bg-primary text-white font-black text-xs flex items-center justify-center rounded-lg shadow-sm">
                  {(user?.email || 'F').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start leading-tight min-w-0 flex-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Founder Profile</span>
                  <span className="text-xs font-semibold text-slate-200 truncate w-full">{user.email}</span>
                </div>
                <Settings className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>
              
              <button
                onClick={() => initiateSignOut(auth)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-300">
          <aside className="w-72 bg-[#090d16] text-slate-200 flex flex-col h-full animate-in slide-in-from-left duration-300 relative border-r border-slate-800">
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="h-16 border-b border-slate-800/80 flex items-center gap-3 px-6">
              <div className="bg-primary text-white font-headline font-black text-lg w-8 h-8 flex items-center justify-center rounded-lg shadow-sm">F</div>
              <span className="font-headline font-black text-xl tracking-tight text-white">FOUNDER<span className="text-primary">OS</span></span>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-200 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4" />
                  <span>Central Console</span>
                </div>
              </button>

              {/* Sales Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsSalesExpanded(!isSalesExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'sales'
                      ? 'text-white font-black bg-slate-800/30'
                      : 'text-slate-200 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4" />
                    <span>Sales Tracker</span>
                  </div>
                  {isSalesExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  )}
                </button>

                {isSalesExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800/60 ml-5">
                    <button
                      onClick={() => { setActiveTab('sales'); setSalesTab('crm'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'sales' && salesTab === 'crm'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      CRM Pipeline
                    </button>

                    {/* Mobile Nested EZCirkit */}
                    <div className="space-y-1 mt-1">
                      <button
                        onClick={() => setIsEZCirkitExpanded(!isEZCirkitExpanded)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          activeTab === 'sales' && salesTab === 'ezcirkit'
                            ? 'text-white font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/10'
                        }`}
                      >
                        <span>EZCirkit Tracker</span>
                        {isEZCirkitExpanded ? (
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        ) : (
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        )}
                      </button>

                      {isEZCirkitExpanded && (
                        <div className="pl-3 py-0.5 space-y-0.5 border-l border-slate-800 ml-3">
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('weekly'); setIsMobileSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'weekly'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            Weekly Dashboard
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('leads'); setIsMobileSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'leads'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            Lead Tracker
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('workshops'); setIsMobileSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'workshops'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            Workshop Tracker
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('products'); setIsMobileSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'products'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            Product Sales
                          </button>
                          <button
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab('activity'); setIsMobileSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === 'activity'
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            Daily Activity
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-850/80 my-3" />

              <div className="space-y-1">
                <button
                  onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'finance'
                      ? 'text-white font-black bg-slate-800/30'
                      : 'text-slate-200 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calculator className="w-4 h-4" />
                    <span>Finance Suite</span>
                  </div>
                  {isFinanceExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  )}
                </button>

                {isFinanceExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800/60 ml-5">
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'calc'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Valuation Calculator
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('tracker'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'tracker'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Cap Table Tracker
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('exit'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'exit'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Exit Simulator
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('negotiate'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'negotiate'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Term Sheet Assistant
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('qa'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'qa'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Term Sheet Q&A
                    </button>
                    <button
                      onClick={() => { setActiveTab('finance'); setFinanceTab('glossary'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'finance' && financeTab === 'glossary'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Founder's Glossary
                    </button>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-850/80 my-3" />

              <div className="space-y-1">
                <button
                  onClick={() => setIsOperationsExpanded(!isOperationsExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'operations'
                      ? 'text-white font-black bg-slate-800/30'
                      : 'text-slate-200 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4" />
                    <span>Operations Hub</span>
                  </div>
                  {isOperationsExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  )}
                </button>

                {isOperationsExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800/60 ml-5">
                    <button
                      onClick={() => { setActiveTab('operations'); setOperationsTab('ops'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'operations' && operationsTab === 'ops'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Runway & SaaS Burn
                    </button>
                    <button
                      onClick={() => { setActiveTab('operations'); setOperationsTab('tasks'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'operations' && operationsTab === 'tasks'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Task Workspace
                    </button>
                    <button
                      onClick={() => { setActiveTab('operations'); setOperationsTab('chat'); setIsMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'operations' && operationsTab === 'chat'
                          ? 'text-primary font-bold bg-primary/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                      }`}
                    >
                      Team Chat
                    </button>
                  </div>
                )}
              </div>
            </nav>

            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
              <button
                onClick={() => { setActiveTab('settings'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 text-left p-2 rounded-xl transition-all border ${
                  activeTab === 'settings'
                    ? 'bg-slate-800/80 border-slate-700 text-white'
                    : 'hover:bg-slate-850 border-transparent text-slate-300'
                }`}
              >
                <div className="w-8 h-8 bg-primary text-white font-black text-xs flex items-center justify-center rounded-lg shadow-sm">
                  {(user?.email || 'F').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start leading-tight min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Founder Profile</span>
                  <span className="text-xs font-semibold text-slate-200 truncate w-full">{user.email}</span>
                </div>
              </button>
              
              <button
                onClick={() => { initiateSignOut(auth); setIsMobileSidebarOpen(false); }}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {/* Minimal Consolidated Top Bar */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xs font-black text-slate-700 tracking-widest uppercase font-code">
              {getPageTitle()}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <QuickCalculator />
          </div>
        </header>

        {/* Dynamic Inner Tab Switcher */}
        <main className="flex-1 p-4 md:p-8 max-w-[1500px] w-full mx-auto">
          <Tabs value={activeTab} className="w-full">
            {/* Console Landing Dashboard */}
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
              <CentralDashboard userId={userId!} companyProfileId={companyProfileId} onNavigate={handleNavigate} />
            </TabsContent>

            {/* Sales Dashboard */}
            <TabsContent value="sales" className="mt-0 focus-visible:outline-none">
              <SalesAnalytics
                userId={userId!}
                companyProfileId={companyProfileId}
                activeSubTab={salesTab}
                onSubTabChange={setSalesTab}
                activeEZCirkitTab={ezCirkitTab}
                onEZCirkitTabChange={setEzCirkitTab}
                readOnly={isReadOnly}
              />
            </TabsContent>

            {/* Finance Suite Content */}
            <TabsContent value="finance" className="mt-0 focus-visible:outline-none">
              <Tabs value={financeTab} className="w-full animate-in fade-in duration-300">
                <TabsContent value="calc" className="mt-0 focus-visible:outline-none">
                  <div className="mb-10 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                      Startup <span className="text-primary">Valuation</span> Calculator
                    </h1>
                    <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                      Model your funding rounds, track unit economics, and get AI-powered strategic advice instantly.
                    </p>
                  </div>
                  <ValuationCalculator userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="tracker" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-10 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                      Cap <span className="text-primary">Table</span> Tracker
                    </h1>
                    <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                      Track ownership percentages, share types, and board control health checks.
                    </p>
                  </div>
                  <CapTableTracker userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="exit" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-10 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                      Exit <span className="text-primary">Waterfall</span> Simulator
                    </h1>
                    <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                      See exactly who gets what when your startup is acquired or goes public. Model complex liquidation preferences in real-time.
                    </p>
                  </div>
                  <ExitSimulator userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="negotiate" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-10 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                      Term Sheet <span className="text-primary">Assistant</span>
                    </h1>
                    <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                      Paste your deal clauses and let AI identify red flags and founder-friendly counter-arguments.
                    </p>
                  </div>
                  <TermSheetAssistant userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="qa" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-10 text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                      Term Sheet <span className="text-primary">Q&A</span>
                    </h1>
                    <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium opacity-85">
                      Ask any questions about term sheets, clauses, or negotiation strategies and get founder-friendly AI advice.
                    </p>
                  </div>
                  <TermSheetAnalyzer userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="glossary" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-10 text-center space-y-4">
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

            {/* Operations Hub Content */}
            <TabsContent value="operations" className="mt-0 focus-visible:outline-none">
              <OperationsDashboard
                userId={userId!}
                companyProfileId={companyProfileId}
                activeSubTab={operationsTab}
                onSubTabChange={setOperationsTab}
                userRole={userRole}
                readOnly={isReadOnly}
                currentUserUid={user?.uid || ''}
              />
            </TabsContent>

            {/* Config & Settings Page */}
            <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
              <SettingsPage userId={userId!} userRole={userRole} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
