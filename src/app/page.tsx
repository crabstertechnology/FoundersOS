'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, LayoutDashboard, BookOpen, Loader2, LogOut, Sparkles, 
  ShieldCheck, ArrowRight, Gavel, PieChart, Home, TrendingUp, Activity,
  Menu, X, ChevronLeft, ChevronDown, ChevronRight, Settings, ListChecks, MessageSquare,
  ShieldAlert, Calendar, Box, Megaphone, Pin, User
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
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
import { FinanceWeeklyDashboard, DEFAULT_FINANCE_TARGETS } from '@/components/finance/FinanceWeeklyDashboard';
import { FinanceDailyActivity } from '@/components/finance/FinanceDailyActivity';
import { SettingsPage } from '@/components/operations/SettingsPage';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ProductDashboard } from '@/components/product/ProductDashboard';
import { DigitalMarketingHub } from '@/components/sales/DigitalMarketingHub';


export default function FounderOSPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salesTab, setSalesTab] = useState('ezcirkit');
  const [ezCirkitTab, setEzCirkitTab] = useState('strategy');
  const [financeTab, setFinanceTab] = useState('calc');
  const [operationsTab, setOperationsTab] = useState('ops');
  const [isSalesExpanded, setIsSalesExpanded] = useState(true);
  const [isEZCirkitExpanded, setIsEZCirkitExpanded] = useState(true);
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(true);
  const [isOperationsExpanded, setIsOperationsExpanded] = useState(true);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Load sidebar pin preference on mount
  React.useEffect(() => {
    const savedPin = localStorage.getItem('sidebarPinnedPreference');
    if (savedPin === 'true') {
      setIsSidebarPinned(true);
      setIsSidebarMinimized(false);
    }
  }, []);

  const toggleSidebarPin = () => {
    const newVal = !isSidebarPinned;
    setIsSidebarPinned(newVal);
    if (newVal) {
      setIsSidebarMinimized(false);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarPinnedPreference', String(newVal));
    }
  };
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const sub = params.get('sub');
      const ez = params.get('ez');
      if (tab) {
        setActiveTab(tab);
        if (sub) {
          if (tab === 'sales') setSalesTab(sub);
          else if (tab === 'operations') setOperationsTab(sub);
          else if (tab === 'finance') setFinanceTab(sub);
        }
        if (ez) setEzCirkitTab(ez);
      }
    }
  }, []);

  React.useEffect(() => {
    const handleNavigateEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.tab) setActiveTab(detail.tab);
      if (detail.sub) {
        if (detail.tab === 'sales') {
          setSalesTab(detail.sub);
        } else if (detail.tab === 'operations') {
          setOperationsTab(detail.sub);
        } else if (detail.tab === 'finance') {
          setFinanceTab(detail.sub);
        }
      }
      if (detail.ez) {
        setEzCirkitTab(detail.ez);
      }
    };
    window.addEventListener('navigate-app', handleNavigateEvent);
    return () => window.removeEventListener('navigate-app', handleNavigateEvent);
  }, []);

  const employeeDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user?.uid]);

  const { data: employeeData, isLoading: isEmployeeLoading } = useDoc(employeeDocRef);

  const employeeRecord = employeeData;
  const workspaceUserId = employeeRecord?.adminUid || user?.uid || '';
  const userId = workspaceUserId;
  const companyProfileId = 'primary-startup';

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

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

  const userRole = (employeeRecord?.role || 'admin').toLowerCase();
  const isReadOnly = userRole === 'employee' || userRole === 'visitor';
  const isVisitor = userRole === 'visitor';

  const handleNavigate = (tab: string) => {
    if (['calc', 'tracker', 'exit', 'negotiate', 'qa', 'glossary'].includes(tab)) {
      setActiveTab('finance');
      setFinanceTab(tab);
    } else if (['ezcirkit'].includes(tab)) {
      setActiveTab('sales');
      setSalesTab(tab);
    } else if (['weekly', 'strategy', 'leads', 'workshops', 'products', 'activity'].includes(tab)) {
      setActiveTab('sales');
      setSalesTab('ezcirkit');
      setEzCirkitTab(tab);
    } else if (tab === 'productSuite' || tab === 'product') {
      setActiveTab('product');
    } else if (tab === 'dm' || tab === 'marketing') {
      setActiveTab('dm');
    } else if (['operations', 'ops', 'tasks', 'chat', 'runway', 'team'].includes(tab)) {
      setActiveTab('operations');
      if (['tasks', 'chat', 'weekly', 'activity'].includes(tab)) {
        setOperationsTab(tab);
      } else {
        setOperationsTab('ops');
      }
    } else {
      setActiveTab(tab);
    }
  };

  // Dynamic Title for top header
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Founder Dashboard';
      case 'product': return 'AI Product Suite';
      case 'dm': return 'Digital Marketing Hub';
      case 'sales':
        switch (salesTab) {
          case 'ezcirkit':
            switch (ezCirkitTab) {
              case 'weekly': return 'Weekly Dashboard';
              case 'strategy': return 'Sales Strategy';
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
    <div className="h-screen flex flex-col bg-[#f6f7f9] overflow-hidden">
      {/* Minimal Consolidated Top Navigation Bar (Edge to Edge, Spans Full Width) */}
      <header className="h-16 w-full border-b border-slate-200/80 bg-white/75 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 shadow-[0_1px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle Button (Opens sidebar on hover and click) */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setIsMobileSidebarOpen(prev => !prev);
              } else {
                setIsSidebarMinimized(prev => {
                  const next = !prev;
                  if (next && isSidebarPinned) {
                    setIsSidebarPinned(false);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('sidebarPinnedPreference', 'false');
                    }
                  }
                  return next;
                });
              }
            }}
            onMouseEnter={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setIsMobileSidebarOpen(true);
              } else {
                setIsSidebarMinimized(false);
              }
            }}
            className="p-2 hover:bg-slate-100/90 text-slate-700 hover:text-indigo-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* FounderOS Company Name in Nav Bar */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-white font-black text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>F</span>
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-950" style={{ letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>
              Founder<span className="text-indigo-600">OS</span>
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase font-code hidden sm:block">
            {getPageTitle()}
          </h2>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/calendar')}
            className="rounded-full h-9 w-9 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all shrink-0 cursor-pointer"
            title="Calendar"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
          </Button>
          <NotificationCenter />
          <QuickCalculator />

          {/* Founder Profile - Soft circle shape, only icon on top right corner; opens dropdown on hover and press */}
          <div 
            className="relative flex items-center"
            onMouseEnter={() => setIsProfileOpen(true)}
            onMouseLeave={() => setIsProfileOpen(false)}
          >
            <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-9 h-9 rounded-full bg-linear-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs ring-2 ring-indigo-200/70 hover:ring-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none"
                  title="Founder Profile"
                  aria-label="Founder Profile"
                >
                  <User className="w-4.5 h-4.5 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                sideOffset={8}
                onMouseEnter={() => setIsProfileOpen(true)}
                onMouseLeave={() => setIsProfileOpen(false)}
                className="w-56 p-1.5 shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-md rounded-2xl animate-in fade-in zoom-in-95 duration-150 z-50"
              >
                <div className="px-2 py-1.5 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.email || 'founder@startup.com'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Founder Account</span>
                    {isVisitor && (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 rounded-full">
                        View Only
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }}
                  className="cursor-pointer gap-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 focus:bg-slate-100 rounded-lg"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }}
                  className="cursor-pointer gap-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 focus:bg-slate-100 rounded-lg"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { initiateSignOut(auth); setIsProfileOpen(false); }}
                  className="cursor-pointer gap-2.5 py-2 text-xs font-semibold text-rose-600 focus:text-rose-700 focus:bg-rose-50 rounded-lg"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Container below Navigation Bar */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Desktop Left Sidebar (Below Top Navbar with Transparent Glassmorphism & Bold Dark Curvy Font) */}
        <aside 
          onMouseEnter={() => {
            if (isSidebarMinimized) setIsSidebarMinimized(false);
          }}
          onMouseLeave={() => {
            if (!isSidebarPinned) {
              setIsSidebarMinimized(true);
            }
          }}
          className={`hidden md:flex flex-col h-full select-none bg-white/60 backdrop-blur-xl border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] text-slate-900 transition-all duration-300 ease-spring shrink-0 ${isSidebarMinimized ? 'w-[72px]' : 'w-[264px]'}`}
          style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Sidebar Controls Header */}
          <div className={`h-12 border-b border-slate-200/60 flex items-center ${isSidebarMinimized ? 'justify-center px-2' : 'justify-between px-3'} transition-all duration-300`}>
            {!isSidebarMinimized && (
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                Navigation
              </span>
            )}
            <div className="flex items-center gap-1">
              {!isSidebarMinimized && (
                <button
                  onClick={toggleSidebarPin}
                  className={`p-1.5 rounded-xl transition-all duration-150 cursor-pointer ${
                    isSidebarPinned 
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5'
                  }`}
                  title={isSidebarPinned ? 'Unpin Sidebar (Auto-closes when cursor leaves)' : 'Pin Sidebar (Keep sidebar open permanently)'}
                >
                  <Pin className={`w-3.5 h-3.5 transition-transform ${isSidebarPinned ? 'fill-indigo-600 rotate-45 text-indigo-600' : ''}`} />
                </button>
              )}
              <button
                onClick={() => {
                  const next = !isSidebarMinimized;
                  setIsSidebarMinimized(next);
                  if (next && isSidebarPinned) {
                    setIsSidebarPinned(false);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('sidebarPinnedPreference', 'false');
                    }
                  }
                }}
                className="text-slate-500 hover:text-slate-900 p-1.5 hover:bg-slate-900/5 rounded-xl hidden md:flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer"
                title={isSidebarMinimized ? 'Expand Sidebar' : 'Minimize Sidebar'}
              >
                {isSidebarMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Scrollable Navigation List with Bold Dark Curvy Font & Rounded Active Corners */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {isSidebarMinimized ? (
              <div className="flex flex-col items-center gap-1.5">
                {[
                  { tab: 'dashboard', icon: Home, label: 'Central Console' },
                  { tab: 'product', icon: Box, label: 'Product Suite' },
                  { tab: 'dm', icon: Megaphone, label: 'Digital Marketing' },
                  { tab: 'sales', icon: TrendingUp, label: 'Sales Tracker' },
                  { tab: 'finance', icon: Calculator, label: 'Finance Suite' },
                  { tab: 'operations', icon: Activity, label: 'Operations Hub' },
                ].map(({ tab, icon: Icon, label }) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-extrabold'
                          : 'hover:bg-slate-900/5 hover:text-slate-950 text-slate-700'
                      }`}
                      title={label}
                    >
                      <Icon className={`w-5 h-5 stroke-[2.2] ${isActive ? 'text-white' : 'text-slate-700'}`} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Central Console */}
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                  }`}
                >
                  <Home className={`w-4.5 h-4.5 shrink-0 stroke-[2.2] ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-700'}`} />
                  <span>Central Console</span>
                </button>

                {/* Product Suite */}
                <button
                  onClick={() => setActiveTab('product')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 ${
                    activeTab === 'product'
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Box className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'product' ? 'text-white' : 'text-slate-700'}`} />
                    <span>Product Suite</span>
                  </div>
                </button>

                {/* Digital Marketing */}
                <button
                  onClick={() => setActiveTab('dm')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 ${
                    activeTab === 'dm'
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Megaphone className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'dm' ? 'text-white' : 'text-slate-700'}`} />
                    <span>Digital Marketing</span>
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    activeTab === 'dm' ? 'bg-white text-indigo-700' : 'bg-[#f97316] text-white'
                  }`}>
                    NEW
                  </span>
                </button>

                <div className="h-px bg-slate-200/70 my-2 mx-1" />

                {/* Sales Section */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setIsSalesExpanded(!isSalesExpanded)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 group ${
                      activeTab === 'sales'
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                        : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'sales' ? 'text-white' : 'text-slate-700'}`} />
                      <span>Sales Tracker</span>
                    </div>
                    {isSalesExpanded ? (
                      <ChevronDown className={`w-4 h-4 ${activeTab === 'sales' ? 'text-white' : 'text-slate-700'}`} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${activeTab === 'sales' ? 'text-white' : 'text-slate-700 group-hover:text-black'}`} />
                    )}
                  </button>

                  {isSalesExpanded && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-300/80 ml-5 animate-in slide-in-from-top-1 duration-200">
                      {[
                        { sub: 'strategy', label: 'Sales Strategy' },
                        { sub: 'leads', label: 'Lead Tracker' },
                        { sub: 'workshops', label: 'Workshop Tracker' },
                        { sub: 'products', label: 'Product Sales' },
                        { sub: 'weekly', label: 'Weekly Dashboard' },
                        { sub: 'activity', label: 'Daily Activity' },
                      ].map(({ sub, label }) => {
                        const isActive = activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === sub;
                        return (
                          <button
                            key={sub}
                            onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab(sub); }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[13px] transition-all ${
                              isActive
                                ? 'text-indigo-600 font-extrabold bg-indigo-50/90 shadow-2xs'
                                : 'text-slate-800 hover:text-black hover:bg-slate-900/5 font-bold'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-200/70 my-2 mx-1" />

                {/* Finance Section */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 group ${
                      activeTab === 'finance'
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                        : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calculator className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'finance' ? 'text-white' : 'text-slate-700'}`} />
                      <span>Finance Suite</span>
                    </div>
                    {isFinanceExpanded ? (
                      <ChevronDown className={`w-4 h-4 ${activeTab === 'finance' ? 'text-white' : 'text-slate-700'}`} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${activeTab === 'finance' ? 'text-white' : 'text-slate-700 group-hover:text-black'}`} />
                    )}
                  </button>

                  {isFinanceExpanded && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-300/80 ml-5 animate-in slide-in-from-top-1 duration-200">
                      {[
                        { sub: 'calc', label: 'Valuation Calculator' },
                        { sub: 'tracker', label: 'Cap Table Tracker' },
                        { sub: 'exit', label: 'Exit Simulator' },
                        { sub: 'negotiate', label: 'Term Sheet Assistant' },
                        { sub: 'qa', label: 'Term Sheet Q&A' },
                        { sub: 'glossary', label: "Founder's Glossary" },
                        { sub: 'weekly', label: 'Weekly Dashboard' },
                        { sub: 'activity', label: 'Daily Activity' },
                      ].map(({ sub, label }) => {
                        const isActive = activeTab === 'finance' && financeTab === sub;
                        return (
                          <button
                            key={sub}
                            onClick={() => { setActiveTab('finance'); setFinanceTab(sub); }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[13px] transition-all ${
                              isActive
                                ? 'text-indigo-600 font-extrabold bg-indigo-50/90 shadow-2xs'
                                : 'text-slate-800 hover:text-black hover:bg-slate-900/5 font-bold'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-200/70 my-2 mx-1" />

                {/* Operations Section */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setIsOperationsExpanded(!isOperationsExpanded)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 group ${
                      activeTab === 'operations'
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                        : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Activity className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'operations' ? 'text-white' : 'text-slate-700'}`} />
                      <span>Operations Hub</span>
                    </div>
                    {isOperationsExpanded ? (
                      <ChevronDown className={`w-4 h-4 ${activeTab === 'operations' ? 'text-white' : 'text-slate-700'}`} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${activeTab === 'operations' ? 'text-white' : 'text-slate-700 group-hover:text-black'}`} />
                    )}
                  </button>

                  {isOperationsExpanded && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-300/80 ml-5 animate-in slide-in-from-top-1 duration-200">
                      {[
                        { sub: 'ops', label: 'Runway & SaaS Burn' },
                        { sub: 'tasks', label: 'Task Workspace' },
                        { sub: 'chat', label: 'Team Chat' },
                        { sub: 'weekly', label: 'Weekly Dashboard' },
                        { sub: 'activity', label: 'Daily Activity' },
                      ].map(({ sub, label }) => {
                        const isActive = activeTab === 'operations' && operationsTab === sub;
                        return (
                          <button
                            key={sub}
                            onClick={() => { setActiveTab('operations'); setOperationsTab(sub); }}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-[13px] transition-all ${
                              isActive
                                ? 'text-indigo-600 font-extrabold bg-indigo-50/90 shadow-2xs'
                                : 'text-slate-800 hover:text-black hover:bg-slate-900/5 font-bold'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <aside 
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setIsMobileSidebarOpen(false)}
            className="w-72 bg-white/80 backdrop-blur-2xl text-slate-950 flex flex-col h-full animate-in slide-in-from-left duration-300 relative border-r border-slate-200/60 shadow-2xl"
            style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
          >
            <div className="h-14 border-b border-slate-200/60 flex items-center justify-end px-4 shrink-0">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                    : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-700'}`} />
                  <span>Central Console</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('product'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 ${
                  activeTab === 'product'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                    : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Box className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'product' ? 'text-white' : 'text-slate-700'}`} />
                  <span>Product Suite</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('dm'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 ${
                  activeTab === 'dm'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                    : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Megaphone className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'dm' ? 'text-white' : 'text-slate-700'}`} />
                  <span>Digital Marketing</span>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  activeTab === 'dm' ? 'bg-white text-indigo-700' : 'bg-[#f97316] text-white'
                }`}>
                  NEW
                </span>
              </button>

              {/* Sales Section */}
              <div className="space-y-0.5">
                <button
                  onClick={() => setIsSalesExpanded(!isSalesExpanded)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 group ${
                    activeTab === 'sales'
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'sales' ? 'text-white' : 'text-slate-700'}`} />
                    <span>Sales Tracker</span>
                  </div>
                  {isSalesExpanded ? (
                    <ChevronDown className={`w-4 h-4 ${activeTab === 'sales' ? 'text-white' : 'text-slate-700'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${activeTab === 'sales' ? 'text-white' : 'text-slate-700'}`} />
                  )}
                </button>
                {isSalesExpanded && (
                  <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-300/80 ml-5">
                    {[
                      { sub: 'strategy', label: 'Sales Strategy' },
                      { sub: 'leads', label: 'Lead Tracker' },
                      { sub: 'workshops', label: 'Workshop Tracker' },
                      { sub: 'products', label: 'Product Sales' },
                      { sub: 'weekly', label: 'Weekly Dashboard' },
                      { sub: 'activity', label: 'Daily Activity' },
                    ].map(({ sub, label }) => {
                      const isActive = activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab(sub); setIsMobileSidebarOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-[13px] transition-all ${
                            isActive
                              ? 'text-indigo-600 font-extrabold bg-indigo-50/90 shadow-2xs'
                              : 'text-slate-800 hover:text-black hover:bg-slate-900/5 font-bold'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-200/70 my-2 mx-1" />

              {/* Finance Section */}
              <div className="space-y-0.5">
                <button
                  onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 group ${
                    activeTab === 'finance'
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calculator className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'finance' ? 'text-white' : 'text-slate-700'}`} />
                    <span>Finance Suite</span>
                  </div>
                  {isFinanceExpanded ? (
                    <ChevronDown className={`w-4 h-4 ${activeTab === 'finance' ? 'text-white' : 'text-slate-700'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${activeTab === 'finance' ? 'text-white' : 'text-slate-700'}`} />
                  )}
                </button>

                {isFinanceExpanded && (
                  <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-300/80 ml-5">
                    {[
                      { sub: 'calc', label: 'Valuation Calculator' },
                      { sub: 'tracker', label: 'Cap Table Tracker' },
                      { sub: 'exit', label: 'Exit Simulator' },
                      { sub: 'negotiate', label: 'Term Sheet Assistant' },
                      { sub: 'qa', label: 'Term Sheet Q&A' },
                      { sub: 'glossary', label: "Founder's Glossary" },
                      { sub: 'weekly', label: 'Weekly Dashboard' },
                      { sub: 'activity', label: 'Daily Activity' },
                    ].map(({ sub, label }) => {
                      const isActive = activeTab === 'finance' && financeTab === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => { setActiveTab('finance'); setFinanceTab(sub); setIsMobileSidebarOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-[13px] transition-all ${
                            isActive
                              ? 'text-indigo-600 font-extrabold bg-indigo-50/90 shadow-2xs'
                              : 'text-slate-800 hover:text-black hover:bg-slate-900/5 font-bold'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-200/70 my-2 mx-1" />

              {/* Operations Section */}
              <div className="space-y-0.5">
                <button
                  onClick={() => setIsOperationsExpanded(!isOperationsExpanded)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] transition-all duration-150 group ${
                    activeTab === 'operations'
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-900 font-bold hover:bg-slate-900/5 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className={`w-4.5 h-4.5 stroke-[2.2] ${activeTab === 'operations' ? 'text-white' : 'text-slate-700'}`} />
                    <span>Operations Hub</span>
                  </div>
                  {isOperationsExpanded ? (
                    <ChevronDown className={`w-4 h-4 ${activeTab === 'operations' ? 'text-white' : 'text-slate-700'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${activeTab === 'operations' ? 'text-white' : 'text-slate-700'}`} />
                  )}
                </button>

                {isOperationsExpanded && (
                  <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-300/80 ml-5">
                    {[
                      { sub: 'ops', label: 'Runway & SaaS Burn' },
                      { sub: 'tasks', label: 'Task Workspace' },
                      { sub: 'chat', label: 'Team Chat' },
                      { sub: 'weekly', label: 'Weekly Dashboard' },
                      { sub: 'activity', label: 'Daily Activity' },
                    ].map(({ sub, label }) => {
                      const isActive = activeTab === 'operations' && operationsTab === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => { setActiveTab('operations'); setOperationsTab(sub); setIsMobileSidebarOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-[13px] transition-all ${
                            isActive
                              ? 'text-indigo-600 font-extrabold bg-indigo-50/90 shadow-2xs'
                              : 'text-slate-800 hover:text-black hover:bg-slate-900/5 font-bold'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Panel Content Area (Scrollable below Top Navigation Bar) */}
      <div 
        className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto"
        onMouseEnter={() => {
          if (!isSidebarPinned) {
            setIsSidebarMinimized(true);
          }
        }}
      >
        {/* Dynamic Inner Tab Switcher */}
        <main className="flex-1 p-3 sm:p-4 md:p-8 max-w-[1500px] w-full mx-auto">
          <Tabs value={activeTab} className="w-full">
            {/* Console Landing Dashboard */}
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
              <CentralDashboard userId={userId!} companyProfileId={companyProfileId} onNavigate={handleNavigate} readOnly={isVisitor} />
            </TabsContent>

            {/* Product Suite Content */}
            <TabsContent value="product" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
              <ProductDashboard userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
            </TabsContent>

            {/* Digital Marketing Content */}
            <TabsContent value="dm" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
              <DigitalMarketingHub userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
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
              {/* Sub-suite Segmented Navigation Bar */}
              <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
                <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-lg">
                  {[
                    { id: 'calc', label: 'Valuation Calculator', icon: Calculator },
                    { id: 'tracker', label: 'Cap Table Tracker', icon: PieChart },
                    { id: 'exit', label: 'Exit Simulator', icon: TrendingUp },
                    { id: 'negotiate', label: 'Term Sheet Assistant', icon: Gavel },
                    { id: 'qa', label: 'Term Sheet Q&A', icon: MessageSquare },
                    { id: 'glossary', label: 'Glossary', icon: BookOpen },
                    { id: 'weekly', label: 'Weekly Dashboard', icon: LayoutDashboard },
                    { id: 'activity', label: 'Daily Activity', icon: Activity },
                  ].map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isActive = financeTab === subItem.id;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => setFinanceTab(subItem.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <SubIcon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                        <span>{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Tabs value={financeTab} className="w-full animate-in fade-in duration-300">
                <TabsContent value="weekly" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <LayoutDashboard className="w-3.5 h-3.5" /> Finance Suite / Weekly Dashboard
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Finance Weekly Dashboard
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        Monitor your funding progress, valuation targets, burn rate limits, and capital runway metrics.
                      </p>
                    </div>
                  </div>
                  <FinanceWeeklyDashboard
                    profileRef={profileRef}
                    cashBank={profile?.cashBank || 0}
                    burnRate={profile?.burnRate || 0}
                    runway={profile?.runway || 0}
                    valuation={profile?.valuation || 0}
                    capitalRaised={profile?.capitalRaised || 0}
                    targets={profile?.financeWeeklyTargets || DEFAULT_FINANCE_TARGETS}
                    readOnly={isReadOnly}
                  />
                </TabsContent>

                <TabsContent value="activity" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <Activity className="w-3.5 h-3.5" /> Finance Suite / Daily Audit
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Finance Daily Activity Log
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        Log daily cash transactions, categorize software spend, and audit your assigned strategic execution.
                      </p>
                    </div>
                  </div>
                  <FinanceDailyActivity
                    profileRef={profileRef}
                    activities={profile?.financeDailyActivities || []}
                    readOnly={isReadOnly}
                  />
                </TabsContent>

                <TabsContent value="calc" className="mt-0 focus-visible:outline-none">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <Calculator className="w-3.5 h-3.5" /> Finance Suite / Valuation Engine
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Startup Valuation Calculator
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        Model your funding rounds, track unit economics, and get AI-powered strategic advice instantly.
                      </p>
                    </div>
                  </div>
                  <ValuationCalculator userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="tracker" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <PieChart className="w-3.5 h-3.5" /> Finance Suite / Equity Governance
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Cap Table Tracker
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        Track ownership percentages, share types, and board control health checks.
                      </p>
                    </div>
                  </div>
                  <CapTableTracker userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="exit" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Finance Suite / M&A Simulation
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Exit Waterfall Simulator
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        See exactly who gets what when your startup is acquired or goes public. Model complex liquidation preferences in real-time.
                      </p>
                    </div>
                  </div>
                  <ExitSimulator userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="negotiate" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <Gavel className="w-3.5 h-3.5" /> Finance Suite / Deal Legal AI
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Term Sheet AI Assistant
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        Paste your deal clauses and let AI identify red flags and founder-friendly counter-arguments.
                      </p>
                    </div>
                  </div>
                  <TermSheetAssistant userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="qa" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Finance Suite / Advisory Q&A
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Term Sheet Q&A Assistant
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        Ask any questions about term sheets, clauses, or negotiation strategies and get founder-friendly AI advice.
                      </p>
                    </div>
                  </div>
                  <TermSheetAnalyzer userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="glossary" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest font-bold mb-1">
                        <BookOpen className="w-3.5 h-3.5" /> Finance Suite / VC Knowledge
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Founder's Glossary
                      </h1>
                      <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
                        Master the jargon of VC funding with plain-English explanations and real-world examples.
                      </p>
                    </div>
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
  </div>
);
}
