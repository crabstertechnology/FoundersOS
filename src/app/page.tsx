'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, collection, query, where } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger, GliderNav } from '@/components/ui/tabs';
import { 
  Calculator, LayoutDashboard, BookOpen, Loader2, LogOut, Sparkles, 
  ShieldCheck, ArrowRight, Gavel, PieChart, Home, TrendingUp, Activity,
  Menu, X, PanelLeftOpen, PanelLeftClose, ChevronLeft, ChevronDown, ChevronRight, Settings, ListChecks, MessageSquare,
  ShieldAlert, Calendar, Box, Megaphone, Pin, User, CalendarDays
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ValuationCalculator } from '@/components/calculator/ValuationCalculator';
import { CapTableTracker } from '@/components/cap-table/CapTableTracker';
import { GlossarySection } from '@/components/glossary/GlossarySection';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useUser, useAuth, initiateSignOut, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { QuickCalculator } from '@/components/calculator/QuickCalculator';
import { QuickCalendar } from '@/components/calendar/QuickCalendar';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WeeklyDailyHub } from '@/components/execution/WeeklyDailyHub';
import { TaskManager, type Employee } from '@/components/operations/TaskManager';
import { TeamChat } from '@/components/operations/TeamChat';


export default function FounderOSPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salesTab, setSalesTab] = useState('ezcirkit');
  const [ezCirkitTab, setEzCirkitTab] = useState('strategy');
  const [financeTab, setFinanceTab] = useState('calc');
  const [operationsTab, setOperationsTab] = useState('ops');
  const [isSalesExpanded, setIsSalesExpanded] = useState(false);
  const [isEZCirkitExpanded, setIsEZCirkitExpanded] = useState(false);
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(false);
  const [isOperationsExpanded, setIsOperationsExpanded] = useState(false);
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

  // Employees collection for Task Manager & Team Chat
  const employeesRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, 'employees');
  }, [firestore, userId]);

  const employeesQuery = useMemoFirebase(() => {
    if (!employeesRef) return null;
    return query(employeesRef, where('adminUid', '==', userId));
  }, [employeesRef, userId]);

  const { data: rawEmployeesData } = useCollection(employeesQuery);
  const employees = React.useMemo<Employee[]>(() => (rawEmployeesData || []).map((e: any) => ({
    id: e.id, uid: e.uid || e.id, name: e.name || 'Unknown',
    email: e.email || '', department: e.department || '',
    role: e.role || 'Employee', isActive: e.isActive !== false,
  })), [rawEmployeesData]);

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
              case 'strategy': return 'Sales Strategy';
              case 'leads': return 'Lead Tracker';
              case 'workshops': return 'Workshop Tracker';
              case 'products': return 'Product Sales';
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
      case 'operations': return 'Runway Operations';
      case 'tasks': return 'Task Workspace';
      case 'cadence':
      case 'weekly-daily': return 'Weekly & Daily Hub';
      case 'chat': return 'Team Workspace Chat';
      case 'settings': return 'Founder Configuration';
      default: return 'FounderOS';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border h-20 flex items-center px-6 print:hidden">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-primary text-white font-headline font-black text-xl w-10 h-10 flex items-center justify-center rounded-2xl shadow-sm">F</div>
            <span className="font-headline font-extrabold text-2xl tracking-tighter hidden md:inline">FOUNDER<span className="text-primary">OS</span></span>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="hidden lg:flex items-center gap-2 animate-in fade-in">
              <Button variant="ghost" className="rounded-full px-4 text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('valuation')?.scrollIntoView({ behavior: 'smooth' })}>Valuation Engine</Button>
              <Button variant="ghost" className="rounded-full px-4 text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('equity')?.scrollIntoView({ behavior: 'smooth' })}>Equity Tracker</Button>
              <Button variant="ghost" className="rounded-full px-4 text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('exit-sim')?.scrollIntoView({ behavior: 'smooth' })}>Exit Sim</Button>
              <Button variant="ghost" className="rounded-full px-4 text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('term-sheet')?.scrollIntoView({ behavior: 'smooth' })}>Term Sheet AI</Button>
              <Button variant="ghost" className="rounded-full px-4 text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('qa-analyser')?.scrollIntoView({ behavior: 'smooth' })}>Term Sheet Q&A</Button>
              <Button variant="ghost" className="rounded-full px-4 text-sm font-bold hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => document.getElementById('glossary')?.scrollIntoView({ behavior: 'smooth' })}>Founder's Glossary</Button>
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
    <div className="h-screen w-screen flex bg-slate-50/70 text-slate-900 overflow-hidden relative">
      {/* Layout Spacer: Desktop placeholder rail that reserves layout width so content never shifts */}
      <div 
        className={`hidden md:block shrink-0 transition-all duration-300 ease-out pointer-events-none ${
          isSidebarPinned ? 'w-[264px]' : 'w-[72px]'
        }`} 
        aria-hidden="true" 
      />

      {/* Desktop Left Sidebar — OVERLAP SIDEBAR (Shiprocket-style Unified Structure) */}
      <aside 
        onMouseEnter={() => {
          if (isSidebarMinimized) {
            setIsSidebarMinimized(false);
            setIsSalesExpanded(false);
            setIsFinanceExpanded(false);
            setIsOperationsExpanded(false);
          }
        }}
        onMouseLeave={() => {
          if (!isSidebarPinned) {
            setIsSidebarMinimized(true);
            setIsSalesExpanded(false);
            setIsFinanceExpanded(false);
            setIsOperationsExpanded(false);
          }
        }}
        className={`hidden md:flex flex-col h-screen select-none fixed top-0 left-0 bottom-0 z-40 bg-[#0B0F28] text-slate-100 border-r border-slate-800/80 transition-all duration-300 ease-out font-sidebar overflow-hidden ${
          isSidebarMinimized 
            ? 'w-[72px] shadow-[2px_0_12px_rgba(0,0,0,0.25)]' 
            : 'w-[264px] shadow-[8px_0_36px_rgba(0,0,0,0.45)]'
        }`}
        style={{ fontFamily: "'Google Sans Text', 'Google Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        {/* Sidebar Header (Aligned with Top Header: height h-16 / 64px) - 100% Identical Icon & Alignment */}
        <div className="h-16 border-b border-slate-800/80 flex items-center px-4 shrink-0 overflow-hidden">
          <div 
            onClick={() => {
              if (isSidebarMinimized) {
                setIsSidebarMinimized(false);
                setIsSalesExpanded(false);
                setIsFinanceExpanded(false);
                setIsOperationsExpanded(false);
              } else {
                setActiveTab('dashboard');
              }
            }}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
            title={isSidebarMinimized ? "Click to expand sidebar" : "FounderOS Command Center"}
          >
            {/* Logo: Always at exact same position in both collapsed and open states */}
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30 hover:scale-105 transition-all">
              <span className="text-white font-bold text-sm" style={{ fontFamily: "'Google Sans', sans-serif" }}>F</span>
            </div>
            {/* Title: Unfolds to the right when open, perfectly hidden when collapsed */}
            <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="font-bold text-[15px] tracking-tight text-white leading-none" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                Founder<span className="text-indigo-400">OS</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                Command Center
              </span>
            </div>
          </div>

          {/* Pin Sidebar Button (smoothly revealed on far right when open) */}
          <div className={`ml-auto flex items-center gap-1 shrink-0 transition-opacity duration-200 ${
            isSidebarMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <button
              onClick={toggleSidebarPin}
              className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                isSidebarPinned 
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 shadow-xs' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={isSidebarPinned ? 'Unpin Sidebar (Auto-collapse on leave)' : 'Pin Sidebar (Lock expanded)'}
              aria-label="Pin Sidebar"
            >
              <Pin className={`w-3.5 h-3.5 transition-transform ${isSidebarPinned ? 'fill-indigo-400 rotate-45 text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation List - SINGLE UNIFIED TREE: Icons NEVER shift position */}
        <nav className="flex-1 overflow-y-auto py-3 px-3.5 space-y-1.5 scrollbar-none">
          {/* 1. Central Console */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 cursor-pointer group overflow-hidden ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarMinimized ? 'Central Console' : undefined}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <Home className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            </div>
            <div className={`flex items-center flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="text-[13.5px] truncate">Central Console</span>
            </div>
          </button>

          {/* 2. Product Suite */}
          <button
            onClick={() => setActiveTab('product')}
            className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 cursor-pointer group overflow-hidden ${
              activeTab === 'product'
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarMinimized ? 'Product Suite' : undefined}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <Box className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'product' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            </div>
            <div className={`flex items-center flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="text-[13.5px] truncate">Product Suite</span>
            </div>
          </button>

          {/* 3. Digital Marketing */}
          <button
            onClick={() => setActiveTab('dm')}
            className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 cursor-pointer group overflow-hidden ${
              activeTab === 'dm'
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarMinimized ? 'Digital Marketing' : undefined}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <Megaphone className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'dm' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            </div>
            <div className={`flex items-center justify-between flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="text-[13.5px] truncate">Digital Marketing</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-2 ${
                activeTab === 'dm' ? 'bg-white text-indigo-700' : 'bg-orange-500 text-white'
              }`}>
                NEW
              </span>
            </div>
          </button>

          <div className="h-px bg-slate-800/80 my-2 mx-1" />

          {/* 4. Sales Tracker (with Expandable Submenu) */}
          <div className="space-y-0.5">
            <button
              onClick={() => {
                setActiveTab('sales');
                if (isSidebarMinimized) {
                  setIsSidebarMinimized(false);
                  setIsSalesExpanded(false);
                } else {
                  setIsSalesExpanded(prev => !prev);
                }
              }}
              className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 group cursor-pointer overflow-hidden ${
                activeTab === 'sales'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
              }`}
              title={isSidebarMinimized ? 'Sales Tracker' : undefined}
            >
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <TrendingUp className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'sales' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              </div>
              <div className={`flex items-center justify-between flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
              }`}>
                <span className="text-[13.5px] truncate">Sales Tracker</span>
                {isSalesExpanded ? (
                  <ChevronDown className={`w-4 h-4 shrink-0 ml-2 transition-transform ${activeTab === 'sales' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 shrink-0 ml-2 transition-transform ${activeTab === 'sales' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                )}
              </div>
            </button>

            {isSalesExpanded && !isSidebarMinimized && (
              <div className="pl-11 pr-2 py-1 space-y-0.5 border-l border-slate-700/60 ml-5 my-1 animate-in slide-in-from-top-1 duration-200">
                {[
                  { sub: 'strategy', label: 'Sales Strategy' },
                  { sub: 'leads', label: 'Lead Tracker' },
                  { sub: 'workshops', label: 'Workshop Tracker' },
                  { sub: 'products', label: 'Product Sales' },
                ].map(({ sub, label }) => {
                  const isActive = activeTab === 'sales' && salesTab === 'ezcirkit' && ezCirkitTab === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab(sub); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
                        isActive
                          ? 'text-indigo-400 font-semibold bg-indigo-500/15'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 font-medium'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800/80 my-2 mx-1" />

          {/* 5. Finance Section (with Expandable Submenu) */}
          <div className="space-y-0.5">
            <button
              onClick={() => {
                setActiveTab('finance');
                if (isSidebarMinimized) {
                  setIsSidebarMinimized(false);
                  setIsFinanceExpanded(false);
                } else {
                  setIsFinanceExpanded(prev => !prev);
                }
              }}
              className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 group cursor-pointer overflow-hidden ${
                activeTab === 'finance'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
              }`}
              title={isSidebarMinimized ? 'Finance Suite' : undefined}
            >
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <Calculator className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'finance' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              </div>
              <div className={`flex items-center justify-between flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
              }`}>
                <span className="text-[13.5px] truncate">Finance Suite</span>
                {isFinanceExpanded ? (
                  <ChevronDown className={`w-4 h-4 shrink-0 ml-2 transition-transform ${activeTab === 'finance' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 shrink-0 ml-2 transition-transform ${activeTab === 'finance' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                )}
              </div>
            </button>

            {isFinanceExpanded && !isSidebarMinimized && (
              <div className="pl-11 pr-2 py-1 space-y-0.5 border-l border-slate-700/60 ml-5 my-1 animate-in slide-in-from-top-1 duration-200">
                {[
                  { sub: 'calc', label: 'Valuation Calculator' },
                  { sub: 'tracker', label: 'Cap Table Tracker' },
                  { sub: 'exit', label: 'Exit Simulator' },
                  { sub: 'negotiate', label: 'Term Sheet Assistant' },
                  { sub: 'qa', label: 'Term Sheet Q&A' },
                  { sub: 'glossary', label: "Founder's Glossary" },
                ].map(({ sub, label }) => {
                  const isActive = activeTab === 'finance' && financeTab === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => { setActiveTab('finance'); setFinanceTab(sub); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
                        isActive
                          ? 'text-indigo-400 font-semibold bg-indigo-500/15'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 font-medium'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800/80 my-2 mx-1" />

          {/* 6. Operations Hub (Runway & SaaS Burn) */}
          <button
            onClick={() => setActiveTab('operations')}
            className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 cursor-pointer group overflow-hidden ${
              activeTab === 'operations'
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarMinimized ? 'Runway & Operations' : undefined}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <Activity className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'operations' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            </div>
            <div className={`flex items-center flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="text-[13.5px] truncate">Operations Hub</span>
            </div>
          </button>

          <div className="h-px bg-slate-800/80 my-2 mx-1" />

          {/* 7. Task Workspace (Dedicated Section) */}
          <button
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 cursor-pointer group overflow-hidden ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarMinimized ? 'Task Workspace' : undefined}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <ListChecks className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'tasks' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            </div>
            <div className={`flex items-center flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="text-[13.5px] truncate">Task Workspace</span>
            </div>
          </button>

          {/* 8. Weekly & Daily Hub (Cross-sector Cadence) */}
          <button
            onClick={() => setActiveTab('cadence')}
            className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 cursor-pointer group overflow-hidden ${
              activeTab === 'cadence'
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarMinimized ? 'Weekly & Daily Hub' : undefined}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <CalendarDays className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'cadence' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            </div>
            <div className={`flex items-center justify-between flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="text-[13.5px] truncate">Weekly &amp; Daily Hub</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-1.5 bg-indigo-500/30 text-indigo-200">
                Sectors
              </span>
            </div>
          </button>

          <div className="h-px bg-slate-800/80 my-2 mx-1" />

          {/* 7. Settings */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 cursor-pointer group overflow-hidden ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
            }`}
            title={isSidebarMinimized ? 'Settings' : undefined}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <Settings className={`w-5 h-5 stroke-[2] transition-colors ${activeTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            </div>
            <div className={`flex items-center flex-1 min-w-0 pr-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarMinimized ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
            }`}>
              <span className="text-[13.5px] truncate">Settings</span>
            </div>
          </button>
        </nav>
      </aside>

      {/* Mobile Drawer (Slide-over overlay for small screens < md) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-[280px] max-w-[85vw] bg-[#0B0F28] text-slate-100 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-250 select-none">
            {/* Mobile Sidebar Header */}
            <div className="h-16 border-b border-slate-800/80 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "'Google Sans', sans-serif" }}>F</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[15px] tracking-tight text-white leading-none" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                    Founder<span className="text-indigo-400">OS</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                    Command Center
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close Mobile Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation List */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 scrollbar-none">
              {/* 1. Central Console */}
              <button
                type="button"
                onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <Home className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                <span className="text-[13.5px]">Central Console</span>
              </button>

              {/* 2. Product Suite */}
              <button
                type="button"
                onClick={() => { setActiveTab('product'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'product'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <Box className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                <span className="text-[13.5px]">Product Suite</span>
              </button>

              {/* 3. Digital Marketing */}
              <button
                type="button"
                onClick={() => { setActiveTab('dm'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dm'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Megaphone className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                  <span className="text-[13.5px]">Digital Marketing</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-orange-500 text-white">NEW</span>
              </button>

              <div className="h-px bg-slate-800/80 my-2 mx-1" />

              {/* 4. Sales Tracker (with Expandable Submenu) */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsSalesExpanded(prev => !prev)}
                  className={`w-full flex items-center justify-between h-11 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'sales'
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                    <span className="text-[13.5px]">Sales Tracker</span>
                  </div>
                  {isSalesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {isSalesExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1 border-l border-slate-700/60 ml-5 my-1">
                    {[
                      { sub: 'strategy', label: 'Sales Strategy' },
                      { sub: 'leads', label: 'Lead Tracker' },
                      { sub: 'workshops', label: 'Workshop Tracker' },
                      { sub: 'products', label: 'Product Sales' },
                    ].map(({ sub, label }) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => { setActiveTab('sales'); setSalesTab('ezcirkit'); setEzCirkitTab(sub); setIsMobileSidebarOpen(false); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-[13px] text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-800/80 my-2 mx-1" />

              {/* 5. Finance Suite (with Expandable Submenu) */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsFinanceExpanded(prev => !prev)}
                  className={`w-full flex items-center justify-between h-11 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'finance'
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <Calculator className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                    <span className="text-[13.5px]">Finance Suite</span>
                  </div>
                  {isFinanceExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {isFinanceExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1 border-l border-slate-700/60 ml-5 my-1">
                    {[
                      { sub: 'calc', label: 'Valuation Calculator' },
                      { sub: 'tracker', label: 'Cap Table Tracker' },
                      { sub: 'exit', label: 'Exit Simulator' },
                      { sub: 'negotiate', label: 'Term Sheet Assistant' },
                      { sub: 'qa', label: 'Term Sheet Q&A' },
                      { sub: 'glossary', label: "Founder's Glossary" },
                    ].map(({ sub, label }) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => { setActiveTab('finance'); setFinanceTab(sub); setIsMobileSidebarOpen(false); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-[13px] text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-800/80 my-2 mx-1" />

              {/* 6. Operations Hub */}
              <button
                type="button"
                onClick={() => { setActiveTab('operations'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'operations'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <Activity className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                <span className="text-[13.5px]">Operations Hub</span>
              </button>

              <div className="h-px bg-slate-800/80 my-2 mx-1" />

              {/* 7. Task Workspace */}
              <button
                type="button"
                onClick={() => { setActiveTab('tasks'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <ListChecks className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                <span className="text-[13.5px]">Task Workspace</span>
              </button>

              {/* 8. Weekly & Daily Hub */}
              <button
                type="button"
                onClick={() => { setActiveTab('cadence'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'cadence'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <CalendarDays className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                  <span className="text-[13.5px]">Weekly &amp; Daily Hub</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-indigo-500/30 text-indigo-200">
                  Sectors
                </span>
              </button>

              {/* 9. Team Workspace Chat */}
              <button
                type="button"
                onClick={() => { setActiveTab('chat'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <MessageSquare className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                <span className="text-[13.5px]">Team Chat</span>
              </button>

              <div className="h-px bg-slate-800/80 my-2 mx-1" />

              {/* 10. Settings */}
              <button
                type="button"
                onClick={() => { setActiveTab('settings'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center h-11 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 font-medium hover:bg-white/10 hover:text-white'
                }`}
              >
                <Settings className="w-5 h-5 mr-3 text-slate-400 shrink-0" />
                <span className="text-[13.5px]">Settings</span>
              </button>
            </nav>

            {/* Mobile Footer */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user?.email || 'Founder'}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => initiateSignOut(auth)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Area: Merged Top Header + Scrollable Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Merged Consolidated Top Navigation Bar */}
        <header className="h-16 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xl flex items-center justify-between px-2.5 sm:px-6 shrink-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Toggle (Only for small screens where sidebar is hidden) */}
            <button
              onClick={() => setIsMobileSidebarOpen(prev => !prev)}
              className="md:hidden p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>

            {/* Mobile Brand Mark (shown only on small screens) */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                <span className="text-white font-bold text-sm" style={{ fontFamily: "'Google Sans', sans-serif" }}>F</span>
              </div>
              <span className="font-bold text-base tracking-tight text-slate-950" style={{ letterSpacing: '-0.02em', fontFamily: "'Google Sans', sans-serif" }}>
                Founder<span className="text-indigo-600">OS</span>
              </span>
            </div>

            {/* Page Title Header Navigation */}
            <div className="hidden sm:flex items-center">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                {getPageTitle()}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2.5">
            {/* Quick Calendar Popover (Notification & Calculator Style) */}
            <QuickCalendar />

            {/* Team Chat Header Button (Opens Full Page) */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setActiveTab('chat')}
              className={`rounded-xl h-9 w-9 border transition-all shrink-0 cursor-pointer relative ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                  : 'border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50'
              }`}
              title="Team Workspace Chat"
              aria-label="Open Team Workspace Chat"
            >
              <MessageSquare className={`w-4 h-4 ${activeTab === 'chat' ? 'text-white' : 'text-indigo-600'}`} />
            </Button>

            <NotificationCenter />
            <QuickCalculator />

            {/* Founder Profile (Click-to-open only) */}
            <div className="relative flex items-center">
              <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full bg-linear-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs ring-2 ring-indigo-200/70 hover:ring-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none"
                    aria-label="Founder Profile"
                  >
                    <User className="w-4.5 h-4.5 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  sideOffset={8}
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
                    className="cursor-pointer gap-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 focus:bg-slate-100 rounded-xl"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }}
                    className="cursor-pointer gap-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 focus:bg-slate-100 rounded-xl"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { initiateSignOut(auth); setIsProfileOpen(false); }}
                    className="cursor-pointer gap-2.5 py-2 text-xs font-semibold text-rose-600 focus:text-rose-700 focus:bg-rose-50 rounded-xl"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Panel Content Area (Scrollable below Merged Navigation Bar) */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50/70">
          <main className="flex-1 p-3 sm:p-5 md:p-6 w-full">
            <Tabs value={activeTab} className="w-full">
            {/* Console Landing Dashboard */}
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none w-full">
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
                <GliderNav
                  value={financeTab}
                  onChange={setFinanceTab}
                  options={[
                    { id: 'calc', label: 'Valuation Calculator', icon: Calculator },
                    { id: 'tracker', label: 'Cap Table Tracker', icon: PieChart },
                    { id: 'exit', label: 'Exit Simulator', icon: TrendingUp },
                    { id: 'negotiate', label: 'Term Sheet Assistant', icon: Gavel },
                    { id: 'qa', label: 'Term Sheet Q&A', icon: MessageSquare },
                    { id: 'glossary', label: 'Glossary', icon: BookOpen },
                  ]}
                />
              </div>

              <Tabs value={financeTab} className="w-full animate-in fade-in duration-300">
                <TabsContent value="calc" className="mt-0 focus-visible:outline-none">
                  <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>Console</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <button
                          type="button"
                          onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); }}
                          className="hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Finance Suite
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5" /> Valuation Engine
                        </span>
                      </nav>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                        Startup Valuation Calculator
                      </h1>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
                        Model your funding rounds, track unit economics, and get AI-powered strategic advice instantly.
                      </p>
                    </div>
                  </div>
                  <ValuationCalculator userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="tracker" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>Console</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <button
                          type="button"
                          onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); }}
                          className="hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Finance Suite
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <PieChart className="w-3.5 h-3.5" /> Equity Governance
                        </span>
                      </nav>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                        Cap Table Tracker
                      </h1>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
                        Track ownership percentages, share types, and board control health checks.
                      </p>
                    </div>
                  </div>
                  <CapTableTracker userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="exit" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>Console</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <button
                          type="button"
                          onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); }}
                          className="hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Finance Suite
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> M&amp;A Simulation
                        </span>
                      </nav>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                        Exit Waterfall Simulator
                      </h1>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
                        See exactly who gets what when your startup is acquired or goes public. Model complex liquidation preferences in real-time.
                      </p>
                    </div>
                  </div>
                  <ExitSimulator userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="negotiate" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>Console</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <button
                          type="button"
                          onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); }}
                          className="hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Finance Suite
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <Gavel className="w-3.5 h-3.5" /> Deal Legal AI
                        </span>
                      </nav>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                        Term Sheet AI Assistant
                      </h1>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
                        Paste your deal clauses and let AI identify red flags and founder-friendly counter-arguments.
                      </p>
                    </div>
                  </div>
                  <TermSheetAssistant userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="qa" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>Console</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <button
                          type="button"
                          onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); }}
                          className="hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Finance Suite
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> Advisory Q&amp;A
                        </span>
                      </nav>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                        Term Sheet Q&amp;A Assistant
                      </h1>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
                        Ask any questions about term sheets, clauses, or negotiation strategies and get founder-friendly AI advice.
                      </p>
                    </div>
                  </div>
                  <TermSheetAnalyzer userId={userId!} companyProfileId={companyProfileId} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="glossary" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                  <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>Console</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <button
                          type="button"
                          onClick={() => { setActiveTab('finance'); setFinanceTab('calc'); }}
                          className="hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          Finance Suite
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-indigo-600 font-bold flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" /> VC Knowledge
                        </span>
                      </nav>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                        Founder&apos;s Glossary
                      </h1>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
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

            {/* Dedicated Task Workspace (Full Page) */}
            <TabsContent value="tasks" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
              <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      <span>Console</span>
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-indigo-600 font-bold flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" /> Task Workspace
                    </span>
                  </nav>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                    Task Workspace
                  </h1>
                  <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
                    Assign, track, and manage team deliverables, operational sprints, and priority founder tasks.
                  </p>
                </div>
              </div>
              <TaskManager
                userId={userId!}
                companyProfileId={companyProfileId}
                employees={employees}
                userRole={userRole}
                currentUserUid={user?.uid || ''}
              />
            </TabsContent>

            {/* Dedicated Weekly & Daily Cadence Hub (Full Page) */}
            <TabsContent value="cadence" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
              <WeeklyDailyHub
                userId={userId!}
                companyProfileId={companyProfileId}
                readOnly={isReadOnly}
                onNavigateHome={() => setActiveTab('dashboard')}
              />
            </TabsContent>

            <TabsContent value="weekly-daily" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
              <WeeklyDailyHub
                userId={userId!}
                companyProfileId={companyProfileId}
                readOnly={isReadOnly}
                onNavigateHome={() => setActiveTab('dashboard')}
              />
            </TabsContent>

            {/* Dedicated Team Workspace Chat (Full Page) */}
            <TabsContent value="chat" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
              <div className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      <span>Console</span>
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-indigo-600 font-bold flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Team Workspace Chat
                    </span>
                  </nav>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
                    Team Workspace Chat
                  </h1>
                  <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
                    Real-time encrypted internal founder &amp; team communications and direct messaging.
                  </p>
                </div>
              </div>
              <TeamChat
                userId={userId!}
                companyProfileId={companyProfileId}
                employees={employees}
                onQuickAssign={(empUid) => {
                  setActiveTab('tasks');
                }}
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
