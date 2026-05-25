'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fmtINR, fmtPct, fmtMult } from '@/lib/utils/formatters';
import { 
  Plus, Trash2, Edit2, Sparkles, Loader2, Wallet, Users, Layout, ShieldAlert,
  Server, Laptop, Briefcase, Calendar, CheckCircle2, ChevronRight, Activity, Info, ListChecks, Shield, MessageSquare
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { operationsAdvisorAssistant, OperationsAdvisorOutput } from '@/ai/flows/operations-advisor-flow';
import { TaskManager } from './TaskManager';
import { AdminPanel } from './AdminPanel';
import { TeamChat } from './TeamChat';
import type { Employee } from './TaskManager';

interface OperationsDashboardProps {
  userId: string;
  companyProfileId: string;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  userRole?: string;
  readOnly?: boolean;
  currentUserUid?: string;
}

interface SaasSubscription {
  id: string;
  name: string;
  cost: number;
  billing: 'monthly' | 'yearly';
  category: 'hosting' | 'ai' | 'saas' | 'marketing' | 'other';
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  salary: number;
  status: 'active' | 'hiring';
}

const CATEGORIES = [
  { value: 'hosting', label: 'Cloud Hosting & Infra', color: 'bg-cyan-50 text-cyan-700 border-cyan-150' },
  { value: 'ai', label: 'AI & APIs', color: 'bg-purple-50 text-purple-700 border-purple-150' },
  { value: 'saas', label: 'SaaS & Productivity', color: 'bg-indigo-50 text-indigo-700 border-indigo-150' },
  { value: 'marketing', label: 'Marketing & Ads', color: 'bg-pink-50 text-pink-700 border-pink-150' },
  { value: 'other', label: 'Other software', color: 'bg-slate-50 text-slate-700 border-slate-150' },
];

export function OperationsDashboard({ userId, companyProfileId, activeSubTab, onSubTabChange, userRole, readOnly, currentUserUid }: OperationsDashboardProps) {
  const firestore = useFirestore();

  // Firestore References
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  // Employees collection (top-level, linked by adminUid)
  const employeesRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, 'employees');
  }, [firestore, userId]);

  const employeesQuery = useMemoFirebase(() => {
    if (!employeesRef) return null;
    return query(employeesRef, where('adminUid', '==', userId));
  }, [employeesRef, userId]);

  const { data: rawEmployeesData } = useCollection(employeesQuery);
  const employees = useMemo<Employee[]>(() => (rawEmployeesData || []).map((e: any) => ({
    id: e.id, uid: e.uid || e.id, name: e.name || 'Unknown',
    email: e.email || '', department: e.department || '',
    role: e.role || 'Employee', isActive: e.isActive !== false,
  })), [rawEmployeesData]);

  const reportsRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'strategicReports');
  }, [firestore, userId, companyProfileId]);

  const reportsQuery = useMemoFirebase(() => {
    if (!reportsRef) return null;
    return query(reportsRef, orderBy('createdAt', 'desc'));
  }, [reportsRef]);

  // Subscriptions
  const { data: profile } = useDoc(profileRef);
  const { data: reports } = useCollection(reportsQuery);

  // Filter Operations Reports Locally
  const operationsReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.type === 'operations' || (r.advice && 'runwayAnalysis' in r.advice));
  }, [reports]);

  // SaaS Form States
  const [saasName, setSaasName] = useState('');
  const [saasCost, setSaasCost] = useState<number | ''>('');
  const [saasBilling, setSaasBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [saasCategory, setSaasCategory] = useState<'hosting' | 'ai' | 'saas' | 'marketing' | 'other'>('hosting');
  const [editingSaasId, setEditingSaasId] = useState<string | null>(null);

  // Team Form States
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberSalary, setMemberSalary] = useState<number | ''>('');
  const [memberStatus, setMemberStatus] = useState<'active' | 'hiring'>('active');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // General Overhead Inputs
  const [otherBurnInput, setOtherBurnInput] = useState<number | ''>('');
  const [cashBankInput, setCashBankInput] = useState<number | ''>('');

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');

  // Tab & Quick Task States
  const [localActiveTab, setLocalActiveTab] = useState('ops');
  const activeTab = activeSubTab !== undefined ? activeSubTab : localActiveTab;
  const setActiveTab = onSubTabChange !== undefined ? onSubTabChange : setLocalActiveTab;
  const [preselectedAssigneeUid, setPreselectedAssigneeUid] = useState<string>('');

  // Derived Operations Data
  const subscriptions = useMemo<SaasSubscription[]>(() => {
    return profile?.saasSubscriptions || [];
  }, [profile]);

  const team = useMemo<TeamMember[]>(() => {
    return profile?.teamMembers || [];
  }, [profile]);

  const otherBurn = useMemo(() => {
    return profile?.otherBurn || 0;
  }, [profile]);

  const cashBank = useMemo(() => {
    return profile?.cashBank || 0;
  }, [profile]);

  // Sync state variables once profile loads
  React.useEffect(() => {
    if (profile) {
      if (otherBurnInput === '') setOtherBurnInput(profile.otherBurn || 0);
      if (cashBankInput === '') setCashBankInput(profile.cashBank || 0);
    }
  }, [profile]);

  // Core Calculations
  const calculatedStats = useMemo(() => {
    // SaaS monthly totals
    let totalSaasMonthly = 0;
    subscriptions.forEach(sub => {
      const cost = Number(sub.cost) || 0;
      totalSaasMonthly += sub.billing === 'yearly' ? cost / 12 : cost;
    });

    // Salaries totals (only count active ones or count all based on choice, let's include active and hiring separately or total them. Typically, burn includes both. Let's include both, but highlight status)
    let totalSalaries = 0;
    let activeHeadcount = 0;
    let openRoles = 0;

    team.forEach(member => {
      const sal = Number(member.salary) || 0;
      totalSalaries += sal;
      if (member.status === 'active') {
        activeHeadcount++;
      } else {
        openRoles++;
      }
    });

    const totalBurn = totalSaasMonthly + totalSalaries + otherBurn;
    const runway = totalBurn > 0 ? cashBank / totalBurn : 999;

    return {
      totalSaasMonthly,
      totalSalaries,
      activeHeadcount,
      openRoles,
      totalBurn,
      runway
    };
  }, [subscriptions, team, otherBurn, cashBank]);

  // Handlers: SaaS Tracker
  const handleSaveSaas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !saasName || !saasCost) return;

    const subData: SaasSubscription = {
      id: editingSaasId || Math.random().toString(36).substr(2, 9),
      name: saasName,
      cost: Number(saasCost) || 0,
      billing: saasBilling,
      category: saasCategory
    };

    let updatedSubs: SaasSubscription[];
    if (editingSaasId) {
      updatedSubs = subscriptions.map(s => s.id === editingSaasId ? subData : s);
    } else {
      updatedSubs = [...subscriptions, subData];
    }

    // Calculate new total burn
    let newSaasTotal = 0;
    updatedSubs.forEach(sub => {
      const cost = Number(sub.cost) || 0;
      newSaasTotal += sub.billing === 'yearly' ? cost / 12 : cost;
    });
    const newTotalBurn = newSaasTotal + calculatedStats.totalSalaries + otherBurn;

    setDocumentNonBlocking(profileRef, { 
      saasSubscriptions: updatedSubs,
      burnRate: newTotalBurn
    }, { merge: true });

    // Reset Form
    setSaasName('');
    setSaasCost('');
    setSaasBilling('monthly');
    setSaasCategory('hosting');
    setEditingSaasId(null);
  };

  const handleEditSaas = (sub: SaasSubscription) => {
    setEditingSaasId(sub.id);
    setSaasName(sub.name);
    setSaasCost(sub.cost);
    setSaasBilling(sub.billing);
    setSaasCategory(sub.category);
  };

  const handleDeleteSaas = (subId: string) => {
    if (!profileRef) return;
    const updatedSubs = subscriptions.filter(s => s.id !== subId);

    let newSaasTotal = 0;
    updatedSubs.forEach(sub => {
      const cost = Number(sub.cost) || 0;
      newSaasTotal += sub.billing === 'yearly' ? cost / 12 : cost;
    });
    const newTotalBurn = newSaasTotal + calculatedStats.totalSalaries + otherBurn;

    setDocumentNonBlocking(profileRef, { 
      saasSubscriptions: updatedSubs,
      burnRate: newTotalBurn
    }, { merge: true });

    if (editingSaasId === subId) {
      setEditingSaasId(null);
      setSaasName('');
      setSaasCost('');
    }
  };

  // Handlers: Team Planner
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !memberName || !memberSalary) return;

    const memberData: TeamMember = {
      id: editingMemberId || Math.random().toString(36).substr(2, 9),
      name: memberName,
      role: memberRole || 'Engineer',
      salary: Number(memberSalary) || 0,
      status: memberStatus
    };

    let updatedTeam: TeamMember[];
    if (editingMemberId) {
      updatedTeam = team.map(m => m.id === editingMemberId ? memberData : m);
    } else {
      updatedTeam = [...team, memberData];
    }

    // Calculate new total burn
    let newSalaryTotal = 0;
    updatedTeam.forEach(m => {
      newSalaryTotal += Number(m.salary) || 0;
    });
    const newTotalBurn = calculatedStats.totalSaasMonthly + newSalaryTotal + otherBurn;

    setDocumentNonBlocking(profileRef, { 
      teamMembers: updatedTeam,
      burnRate: newTotalBurn
    }, { merge: true });

    // Reset Form
    setMemberName('');
    setMemberRole('');
    setMemberSalary('');
    setMemberStatus('active');
    setEditingMemberId(null);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setMemberName(member.name);
    setMemberRole(member.role);
    setMemberSalary(member.salary);
    setMemberStatus(member.status);
  };

  const handleDeleteMember = (memberId: string) => {
    if (!profileRef) return;
    const updatedTeam = team.filter(m => m.id !== memberId);

    let newSalaryTotal = 0;
    updatedTeam.forEach(m => {
      newSalaryTotal += Number(m.salary) || 0;
    });
    const newTotalBurn = calculatedStats.totalSaasMonthly + newSalaryTotal + otherBurn;

    setDocumentNonBlocking(profileRef, { 
      teamMembers: updatedTeam,
      burnRate: newTotalBurn
    }, { merge: true });

    if (editingMemberId === memberId) {
      setEditingMemberId(null);
      setMemberName('');
      setMemberRole('');
      setMemberSalary('');
    }
  };

  // Handlers: General Settings updates
  const handleUpdateOverhead = (val: number) => {
    if (!profileRef) return;
    setOtherBurnInput(val);
    const newTotalBurn = calculatedStats.totalSaasMonthly + calculatedStats.totalSalaries + val;
    setDocumentNonBlocking(profileRef, { 
      otherBurn: val,
      burnRate: newTotalBurn
    }, { merge: true });
  };

  const handleUpdateCash = (val: number) => {
    if (!profileRef) return;
    setCashBankInput(val);
    setDocumentNonBlocking(profileRef, { cashBank: val }, { merge: true });
  };

  // AI Operations Analyst Trigger
  const triggerAIAnalysis = async () => {
    if (!profile || aiLoading) return;
    setAiLoading(true);
    try {
      const input = {
        companyName: profile.companyName || 'My Startup',
        stage: profile.stage || 'seed',
        industry: profile.industry || 'saas',
        cashInBank: cashBank,
        monthlyBurnRate: calculatedStats.totalBurn,
        runwayMonths: calculatedStats.runway === 999 ? 99 : Math.round(calculatedStats.runway),
        saasSubscriptions: subscriptions.map(s => ({
          name: s.name,
          cost: Number(s.cost) || 0,
          billing: s.billing,
          category: s.category
        })),
        teamMembers: team.map(m => ({
          name: m.name,
          role: m.role,
          salary: Number(m.salary) || 0,
          status: m.status
        })),
        otherBurn: otherBurn,
        question: customQuestion || undefined
      };

      const result = await operationsAdvisorAssistant(input);

      if (reportsRef) {
        addDocumentNonBlocking(reportsRef, {
          companyId: companyProfileId,
          createdAt: serverTimestamp(),
          inputSnapshot: input,
          advice: result,
          type: 'operations'
        });
      }

      setActiveReport({ advice: result, createdAt: { seconds: Date.now() / 1000 } });
      setCustomQuestion('');
    } catch (err) {
      console.error('Error generating operations AI advice:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reportsRef) return;
    deleteDocumentNonBlocking(doc(reportsRef, reportId));
    if (activeReport?.id === reportId) setActiveReport(null);
  };

  const isDangerRunway = calculatedStats.runway < 6 && calculatedStats.runway > 0;

  const companyName = profile?.companyName || 'EZCirkit';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {activeSubTab === undefined && (
          <div className="flex border-b pb-3 mb-6">
            <TabsList className="bg-slate-100/80 p-1 rounded-full gap-0.5 border-none h-10">
              <TabsTrigger value="ops" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Operations
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5">
                <ListChecks className="w-3.5 h-3.5" /> Task Manager
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Team Chat
              </TabsTrigger>
            </TabsList>
          </div>
        )}

        <TabsContent value="tasks" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <TaskManager
            userId={userId}
            companyProfileId={companyProfileId}
            employees={employees}
            initialAssigneeUid={preselectedAssigneeUid}
            userRole={userRole}
            currentUserUid={currentUserUid}
          />
        </TabsContent>

        <TabsContent value="chat" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <TeamChat
            userId={userId}
            companyProfileId={companyProfileId}
            employees={employees}
            onQuickAssign={(empUid) => {
              setPreselectedAssigneeUid(empUid);
              setActiveTab('tasks');
            }}
          />
        </TabsContent>

        <TabsContent value="ops" className="mt-0 focus-visible:outline-none">
      <div className="space-y-8">
      {/* Title block */}
      <div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2">
          Operations <span className="text-teal-600">Dashboard</span>
        </h1>
        <p className="text-muted-foreground font-medium text-lg">
          Manage subscriptions, headcount planner, operational burn rate, and runway.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* KPI 1: Runway */}
        <Card className={`border-2 shadow-sm ${isDangerRunway ? 'border-red-200 bg-red-50/10' : 'border-teal-100 bg-teal-50/10'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest text-teal-950">
              Survival Runway
            </CardTitle>
            <Activity className={`w-5 h-5 ${isDangerRunway ? 'text-red-500' : 'text-teal-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-code font-black leading-none mb-1.5 ${isDangerRunway ? 'text-red-900' : 'text-teal-950'}`}>
              {calculatedStats.runway === 999 ? '∞' : `${Math.round(calculatedStats.runway)} months`}
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Total Burn: <span className="font-bold">{fmtINR(calculatedStats.totalBurn)}/mo</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Cash in Bank */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest">
              Liquid Bank Cash
            </CardTitle>
            <Wallet className="w-5 h-5 opacity-55" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
              <Input 
                type="number"
                className="pl-7 h-9 text-lg font-bold font-code"
                value={cashBankInput}
                onChange={e => handleUpdateCash(Number(e.target.value))}
                disabled={readOnly}
              />
            </div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Type in bank balance to update runway</p>
          </CardContent>
        </Card>

        {/* KPI 3: Headcount Expenses */}
        <Card className="border-2 shadow-sm border-indigo-150 bg-indigo-50/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest text-indigo-950">
              Headcount Costs
            </CardTitle>
            <Users className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-code font-black text-indigo-950 mb-1">
              {fmtINR(calculatedStats.totalSalaries)}
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Active: <span className="font-bold text-indigo-600">{calculatedStats.activeHeadcount}</span> | Open Roles: {calculatedStats.openRoles}
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: SaaS Monthly Costs */}
        <Card className="border-2 shadow-sm border-purple-150 bg-purple-50/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest text-purple-950">
              Monthly SaaS Costs
            </CardTitle>
            <Server className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-code font-black text-purple-950 mb-1">
              {fmtINR(calculatedStats.totalSaasMonthly)}
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Active Subscriptions: <span className="font-bold text-purple-600">{subscriptions.length}</span>
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Main SaaS and Headcount Trackers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pillar 1: SaaS Cost Tracker */}
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-teal-600" />
            SaaS & Subscriptions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-6">
            {/* SaaS Form */}
            <Card className="md:col-span-1 border shadow-sm">
              <CardContent className="pt-6">
                <form onSubmit={handleSaveSaas} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="font-bold text-xs">Subscription / SaaS Name</Label>
                    <Input 
                      placeholder="e.g. Amazon Web Services..."
                      value={saasName}
                      onChange={e => setSaasName(e.target.value)}
                      required
                      disabled={readOnly}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-bold text-xs">Cost (₹)</Label>
                      <Input 
                        type="number"
                        placeholder="e.g. 15000"
                        value={saasCost}
                        onChange={e => setSaasCost(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-xs">Billing</Label>
                      <Select value={saasBilling} onValueChange={(v: any) => setSaasBilling(v)} disabled={readOnly}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold text-xs">Category</Label>
                    <Select value={saasCategory} onValueChange={(v: any) => setSaasCategory(v)} disabled={readOnly}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold" disabled={readOnly}>
                      {editingSaasId ? 'Update SaaS' : 'Add Subscription'}
                    </Button>
                    {editingSaasId && (
                      <Button 
                        type="button" 
                        variant="ghost"
                        onClick={() => {
                          setEditingSaasId(null);
                          setSaasName('');
                          setSaasCost('');
                        }}
                        disabled={readOnly}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* SaaS Table */}
            <Card className="md:col-span-2 border shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                {subscriptions.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm font-semibold">
                    No subscriptions tracked yet. Add cloud costs or developer tools above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-black text-xs uppercase text-slate-500">Service</TableHead>
                          <TableHead className="font-black text-xs uppercase text-slate-500">Cost (₹)</TableHead>
                          <TableHead className="font-black text-xs uppercase text-slate-500">Category</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map(sub => {
                          const catInfo = CATEGORIES.find(c => c.value === sub.category);
                          return (
                            <TableRow key={sub.id} className="hover:bg-slate-50 transition-colors">
                              <TableCell className="font-bold py-3">
                                <div>{sub.name}</div>
                                <div className="text-[10px] text-muted-foreground uppercase font-mono font-medium">{sub.billing} billing</div>
                              </TableCell>
                              <TableCell className="font-code font-black text-slate-800">
                                {fmtINR(sub.cost)}
                                {sub.billing === 'yearly' && <span className="text-[9px] font-normal text-muted-foreground block font-sans">({fmtINR(sub.cost / 12)}/mo)</span>}
                              </TableCell>
                              <TableCell>
                                <Badge className={`border text-[9px] uppercase font-black ${catInfo?.color}`}>
                                  {sub.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right py-3 pr-4">
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-slate-400 hover:text-teal-600 rounded-full"
                                    onClick={() => handleEditSaas(sub)}
                                    disabled={readOnly}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full"
                                    onClick={() => handleDeleteSaas(sub.id)}
                                    disabled={readOnly}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pillar 2: Headcount Planner */}
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-teal-600" />
            Headcount Planner
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-6">
            {/* Team Form */}
            <Card className="md:col-span-1 border shadow-sm">
              <CardContent className="pt-6">
                <form onSubmit={handleSaveMember} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-bold text-xs">Name</Label>
                      <Input 
                        placeholder="e.g. Amit S..."
                        value={memberName}
                        onChange={e => setMemberName(e.target.value)}
                        required
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-xs">Role</Label>
                      <Input 
                        placeholder="e.g. Lead Engineer..."
                        value={memberRole}
                        onChange={e => setMemberRole(e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-bold text-xs">Monthly Salary (₹)</Label>
                      <Input 
                        type="number"
                        placeholder="e.g. 100000"
                        value={memberSalary}
                        onChange={e => setMemberSalary(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-xs">Status</Label>
                      <Select value={memberStatus} onValueChange={(v: any) => setMemberStatus(v)} disabled={readOnly}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active Employee</SelectItem>
                          <SelectItem value="hiring">Hiring / Planned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold" disabled={readOnly}>
                      {editingMemberId ? 'Update Role' : 'Add Team Member'}
                    </Button>
                    {editingMemberId && (
                      <Button 
                        type="button" 
                        variant="ghost"
                        onClick={() => {
                          setEditingMemberId(null);
                          setMemberName('');
                          setMemberRole('');
                          setMemberSalary('');
                        }}
                        disabled={readOnly}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Team Table */}
            <Card className="md:col-span-2 border shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                {team.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm font-semibold">
                    No team members listed yet. Add employees or planned hires above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-black text-xs uppercase text-slate-500">Name & Role</TableHead>
                          <TableHead className="font-black text-xs uppercase text-slate-500">Monthly Salary</TableHead>
                          <TableHead className="font-black text-xs uppercase text-slate-500">Status</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.map(member => (
                          <TableRow key={member.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-bold py-3">
                              <div>{member.name}</div>
                              <div className="text-xs text-muted-foreground font-medium">{member.role}</div>
                            </TableCell>
                            <TableCell className="font-code font-black text-slate-800">
                              {fmtINR(member.salary)}/mo
                            </TableCell>
                            <TableCell>
                              <Badge className={`border text-[9px] uppercase font-black ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                {member.status === 'active' ? 'Active' : 'Hiring'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-3 pr-4">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-slate-400 hover:text-teal-600 rounded-full"
                                  onClick={() => handleEditMember(member)}
                                  disabled={readOnly}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full"
                                  onClick={() => handleDeleteMember(member.id)}
                                  disabled={readOnly}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Burn Sync & Other overheads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
        
        {/* Inputs */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-black text-slate-900">
                Other Operational Burn
              </CardTitle>
              <CardDescription>
                Input non-software, non-salary monthly overheads (marketing, office rent, compliance).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs">Other Monthly Expenses (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-sm">₹</span>
                  <Input 
                    type="number"
                    className="pl-7"
                    value={otherBurnInput}
                    onChange={e => handleUpdateOverhead(Number(e.target.value))}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Burn Rate Calculator Output */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-teal-100 bg-teal-50/10 shadow-sm">
            <CardHeader className="pb-4 border-b border-teal-100">
              <CardTitle className="text-base font-black text-teal-950 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                Operational Burn Rate Calculator Output
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Formula */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white border rounded-lg text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">SaaS spend</div>
                  <div className="text-sm font-code font-bold text-slate-800">{fmtINR(calculatedStats.totalSaasMonthly)}</div>
                </div>
                <div className="p-3 bg-white border rounded-lg text-center flex flex-col justify-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">+ salaries</div>
                  <div className="text-sm font-code font-bold text-slate-800">+{fmtINR(calculatedStats.totalSalaries)}</div>
                </div>
                <div className="p-3 bg-white border rounded-lg text-center flex flex-col justify-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">+ other burn</div>
                  <div className="text-sm font-code font-bold text-slate-800">+{fmtINR(otherBurn)}</div>
                </div>
                <div className="p-3 bg-teal-600 text-white rounded-lg text-center flex flex-col justify-center shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-teal-200 mb-1">= total burn</div>
                  <div className="text-sm font-code font-bold">{fmtINR(calculatedStats.totalBurn)}/mo</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white/70 border rounded-lg border-teal-200/50">
                <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-xs text-teal-900 leading-relaxed font-semibold">
                  This true monthly burn of <span className="font-black text-teal-700">{fmtINR(calculatedStats.totalBurn)}</span> is automatically synced to the Valuation Calculator and Dashboard metrics, giving you an instantly updated runway of <span className="font-black text-teal-700">{calculatedStats.runway === 999 ? '∞' : `${Math.round(calculatedStats.runway)} months`}</span> based on your current cash bank balance.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* Operations AI Advisor Section */}
      <div className="space-y-6 pt-10 border-t border-slate-100">
        <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-teal-600" />
          AI Operations Advisor
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* AI Trigger Control */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 border-teal-100 bg-teal-50/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-teal-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  Evaluate Burn Efficiency
                </CardTitle>
                <CardDescription>
                  Generate AI recommendations to optimize software subscriptions, roles, and extend runway.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Custom Inquiry (Optional)</Label>
                  <textarea 
                    placeholder="e.g. We want to cut our SaaS spend by 20%. Where do you see direct pruning opportunities?"
                    rows={3}
                    className="w-full text-sm p-3 rounded-lg border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    value={customQuestion}
                    onChange={e => setCustomQuestion(e.target.value)}
                    disabled={readOnly}
                  />
                </div>

                <Button 
                  onClick={triggerAIAnalysis}
                  disabled={aiLoading || readOnly}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 rounded-full py-5"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiLoading ? 'Analyzing Operations...' : 'Run Operations Audit'}
                </Button>
              </CardContent>
            </Card>

            {/* AI History */}
            {operationsReports.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-xs uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    Operations Audit History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y max-h-[220px] overflow-y-auto">
                  {operationsReports.map(report => {
                    const date = report.createdAt ? new Date(report.createdAt.seconds * 1000) : new Date();
                    const label = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div 
                        key={report.id}
                        onClick={() => setActiveReport(report)}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 flex justify-between items-center transition-colors font-medium ${activeReport?.id === report.id ? 'bg-teal-50/50 font-bold border-l-4 border-teal-600' : ''}`}
                      >
                        <span className="truncate">{label}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[8px] h-4 bg-white border-teal-200 text-teal-750 text-teal-800">Audit</Badge>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-slate-400 hover:text-rose-600"
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            disabled={readOnly}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Report Output */}
          <div className="lg:col-span-2">
            {activeReport ? (
              <Card className="border-2 border-teal-100 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="bg-teal-900 text-white p-5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-teal-250 text-teal-300 animate-pulse" />
                      Operations Audit Report
                    </CardTitle>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 font-mono">
                      Generated {activeReport.createdAt ? new Date(activeReport.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Summary */}
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium">
                    <p className="text-sm italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-dashed border-teal-200">
                      "{activeReport.advice.summary}"
                    </p>
                  </div>

                  {/* Runway analysis */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs uppercase font-black tracking-widest text-slate-900">
                      Runway & Burn Composition
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-teal-50/30 p-3 rounded-lg border border-teal-100/50">
                      {activeReport.advice.runwayAnalysis}
                    </p>
                  </div>

                  {/* Cost & Headcount Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-xs uppercase font-black tracking-widest text-teal-700 flex items-center gap-1.5">
                        <Server className="w-4 h-4 shrink-0" />
                        SaaS Cost Savings
                      </h4>
                      <ul className="space-y-2">
                        {activeReport.advice.costOptimizationOpportunities.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 leading-relaxed font-semibold flex gap-1.5 items-start">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-teal-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs uppercase font-black tracking-widest text-teal-750 text-teal-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 shrink-0" />
                        Headcount Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {activeReport.advice.teamPlanningRecommendations.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 leading-relaxed font-semibold flex gap-1.5 items-start">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-teal-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Runway extension */}
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-3">
                    <h4 className="text-xs uppercase font-black tracking-widest text-slate-800 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-500" />
                      Runway Extension Tactics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeReport.advice.runwayExtensionTactics.map((tip: string, i: number) => (
                        <div key={i} className="p-3 bg-white border rounded-lg text-xs leading-relaxed text-slate-600 font-semibold flex gap-2">
                          <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-teal-900 text-white p-5 rounded-xl shadow-inner space-y-4">
                    <h4 className="text-xs uppercase font-black tracking-[0.2em] text-teal-200">
                      Immediate Action Plan
                    </h4>
                    <div className="space-y-2.5">
                      {activeReport.advice.suggestedActions.map((action: string, i: number) => (
                        <div key={i} className="flex gap-3 text-xs font-bold items-center">
                          <span className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-[10px] shrink-0 font-black">
                            {i + 1}
                          </span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center p-12 border-2 border-dashed rounded-xl text-center text-muted-foreground bg-slate-50/50">
                <div className="max-w-xs space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-teal-250 text-teal-300" />
                  <p className="text-sm font-semibold">No Operations audit active.</p>
                  <p className="text-xs">Select a historical audit from history or click "Run Operations Audit" to evaluate your expenses.</p>
                </div>
              </div>
            )}
              </div>

        </div>
      </div>
      </div>
      </TabsContent>
      </Tabs>
    </div>
  );
}
