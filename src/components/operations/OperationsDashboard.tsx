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
  Server, Laptop, Briefcase, Calendar, CheckCircle2, ChevronRight, Activity, Info, ListChecks, Shield, MessageSquare,
  Printer
} from 'lucide-react';
import { exportReportToPDF } from '@/lib/utils/pdfExport';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { operationsAdvisorAssistant, OperationsAdvisorOutput } from '@/ai/flows/operations-advisor-flow';
import { TaskManager } from './TaskManager';
import { AdminPanel } from './AdminPanel';
import { TeamChat } from './TeamChat';
import { OperationsWeeklyDashboard, DEFAULT_OPS_TARGETS } from './OperationsWeeklyDashboard';
import { OperationsDailyActivity } from './OperationsDailyActivity';
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
  const [localActiveTab, setLocalActiveTab] = useState('weekly');
  const activeTab = activeSubTab !== undefined ? activeSubTab : localActiveTab;
  const setActiveTab = onSubTabChange !== undefined ? onSubTabChange : setLocalActiveTab;
  const [preselectedAssigneeUid, setPreselectedAssigneeUid] = useState<string>('');
  const [showAddSaas, setShowAddSaas] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

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
      billing: 'monthly',
      category: 'saas'
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
    setEditingSaasId(null);
    setShowAddSaas(false);
  };

  const handleEditSaas = (sub: SaasSubscription) => {
    setEditingSaasId(sub.id);
    setSaasName(sub.name);
    setSaasCost(sub.cost);
    setShowAddSaas(true);
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
    setShowAddMember(false);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setMemberName(member.name);
    setMemberRole(member.role);
    setMemberSalary(member.salary);
    setMemberStatus(member.status);
    setShowAddMember(true);
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
          name: s.name || '',
          cost: Number(s.cost) || 0,
          billing: s.billing || 'monthly',
          category: s.category || 'saas'
        })),
        teamMembers: team.map(m => ({
          name: m.name || '',
          role: m.role || '',
          salary: Number(m.salary) || 0,
          status: m.status || 'active'
        })),
        otherBurn: otherBurn,
        question: customQuestion || ""
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

  const handleExportPDF = () => {
    if (!activeReport) return;
    const advice = activeReport.advice || {};
    const dateStr = activeReport.createdAt ? new Date(activeReport.createdAt.seconds * 1000).toLocaleString() : 'Just now';

    const html = `
      <div class="summary-box">
        "${advice.summary || 'No summary available.'}"
      </div>

      <div class="section">
        <div class="section-title">Runway & Burn Composition</div>
        <p style="font-size: 13px; color: #334155; line-height: 1.6; font-weight: 500;">
          ${advice.runwayAnalysis || 'No runway analysis available.'}
        </p>
      </div>

      <div class="section">
        <div class="section-title">SaaS Cost Savings</div>
        <ul>
          ${(advice.costOptimizationOpportunities || []).map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">Headcount Recommendations</div>
        <ul>
          ${(advice.teamPlanningRecommendations || []).map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">Runway Extension Tactics</div>
        <ul>
          ${(advice.runwayExtensionTactics || []).map((tip: string) => `<li>${tip}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">Immediate Action Plan</div>
        <div style="margin-top: 10px;">
          ${(advice.suggestedActions || []).map((action: string, i: number) => `
            <div class="bullet-point">
              <span class="action-badge">${i + 1}</span>
              <span>${action}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="font-size: 9px; color: #94a3b8; text-align: center; margin-top: 50px; font-weight: bold; text-transform: uppercase; font-family: 'JetBrains Mono', monospace;">
        Report Snapshot Date: ${dateStr}
      </div>
    `;

    exportReportToPDF('Operations & Runway Audit Report', html);
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
          <div className="flex border-b pb-3 mb-6 overflow-hidden">
            <TabsList className="w-full overflow-x-auto flex justify-start p-1 bg-slate-100/80 rounded-xl md:rounded-full gap-0.5 border-none h-auto md:h-10 whitespace-nowrap scrollbar-none shrink-0">
              <TabsTrigger value="weekly" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <Activity className="w-3.5 h-3.5" /> Weekly Dashboard
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <Activity className="w-3.5 h-3.5" /> Daily Activity
              </TabsTrigger>
              <TabsTrigger value="ops" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <Activity className="w-3.5 h-3.5" /> Runway & SaaS Burn
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <ListChecks className="w-3.5 h-3.5" /> Task Workspace
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <MessageSquare className="w-3.5 h-3.5" /> Team Chat
              </TabsTrigger>
            </TabsList>
          </div>
        )}

        <TabsContent value="weekly" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <OperationsWeeklyDashboard
            profileRef={profileRef}
            teamSize={calculatedStats.activeHeadcount || team.length}
            saasCost={calculatedStats.totalSaasMonthly}
            targets={profile?.opsWeeklyTargets || DEFAULT_OPS_TARGETS}
            readOnly={readOnly}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <OperationsDailyActivity
            profileRef={profileRef}
            activities={profile?.opsDailyActivities || []}
            readOnly={readOnly}
          />
        </TabsContent>

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
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* KPI Cards (Runway Dashboard Parameters & Outflows) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Runway */}
          <Card className={`border-2 shadow-sm ${isDangerRunway ? 'border-red-200 bg-red-50/10' : 'border-teal-100 bg-teal-50/10'}`}>
            <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-teal-950">
                Survival Runway
              </CardTitle>
              <Activity className={`w-4 h-4 ${isDangerRunway ? 'text-red-500' : 'text-teal-500'}`} />
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl font-code font-black leading-none mb-1 ${isDangerRunway ? 'text-red-900' : 'text-teal-950'}`}>
                {calculatedStats.runway === 999 ? '∞' : `${Math.round(calculatedStats.runway)} months`}
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/80 uppercase">
                BURN: <span className="font-bold text-slate-800">{fmtINR(calculatedStats.totalBurn)}/mo</span>
              </p>
            </CardContent>
          </Card>

          {/* KPI 2: Cash in Bank */}
          <Card className="border-2 border-teal-100/50 bg-white shadow-sm">
            <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-800">
                Liquid Bank Cash
              </CardTitle>
              <Wallet className="w-4 h-4 text-teal-500 opacity-75" />
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                <Input 
                  type="number"
                  className="pl-6 h-8 text-sm font-bold font-code border-slate-200 focus-visible:ring-teal-500"
                  value={cashBankInput}
                  onChange={e => handleUpdateCash(Number(e.target.value))}
                  disabled={readOnly}
                />
              </div>
              <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase">Adjusts runway calculation</p>
            </CardContent>
          </Card>

          {/* KPI 3: Other Monthly Expenses */}
          <Card className="border-2 border-teal-100/50 bg-white shadow-sm">
            <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-800">
                Other Expenses
              </CardTitle>
              <Plus className="w-4 h-4 text-teal-500 opacity-75" />
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                <Input 
                  type="number"
                  className="pl-6 h-8 text-sm font-bold font-code border-slate-200 focus-visible:ring-teal-500"
                  value={otherBurnInput}
                  onChange={e => handleUpdateOverhead(Number(e.target.value))}
                  disabled={readOnly}
                />
              </div>
              <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase">Rent, marketing, compliance</p>
            </CardContent>
          </Card>

          {/* KPI 4: Headcount Expenses */}
          <Card className="border-2 shadow-sm border-indigo-100 bg-indigo-50/10">
            <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-indigo-950">
                Headcount Costs
              </CardTitle>
              <Users className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-code font-black text-indigo-950 mb-1">
                {fmtINR(calculatedStats.totalSalaries)}
              </div>
              <p className="text-[9px] font-bold text-indigo-600 uppercase">
                {calculatedStats.activeHeadcount} Active | {calculatedStats.openRoles} Planned
              </p>
            </CardContent>
          </Card>

          {/* KPI 5: SaaS Monthly Costs */}
          <Card className="border-2 shadow-sm border-purple-100 bg-purple-50/10">
            <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-purple-950">
                SaaS Costs
              </CardTitle>
              <Server className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-code font-black text-purple-950 mb-1">
                {fmtINR(calculatedStats.totalSaasMonthly)}
              </div>
              <p className="text-[9px] font-bold text-purple-600 uppercase">
                {subscriptions.length} Subscriptions
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Burn Sync Formula Info Strip */}
        <div className="bg-slate-50 border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Monthly Burn Breakdown:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span>SaaS: <strong className="text-slate-900">{fmtINR(calculatedStats.totalSaasMonthly)}</strong></span>
            <span className="text-slate-400">+</span>
            <span>Salaries: <strong className="text-slate-900">{fmtINR(calculatedStats.totalSalaries)}</strong></span>
            <span className="text-slate-400">+</span>
            <span>Other: <strong className="text-slate-900">{fmtINR(otherBurn)}</strong></span>
            <span className="text-slate-400">=</span>
            <span className="bg-teal-600 text-white px-2.5 py-0.5 rounded font-bold font-mono">Total Burn: {fmtINR(calculatedStats.totalBurn)}/mo</span>
          </div>
          <div className="text-[10px] text-muted-foreground text-right">
            Synced automatically to Valuations
          </div>
        </div>

        {/* Main SaaS and Headcount Trackers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pillar 1: SaaS Cost Tracker */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-teal-600" />
                SaaS & Subscriptions
              </h2>
              {!readOnly && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-bold gap-1 rounded-full h-8 px-3"
                  onClick={() => {
                    setShowAddSaas(!showAddSaas);
                    if (editingSaasId) {
                      setEditingSaasId(null);
                      setSaasName('');
                      setSaasCost('');
                    }
                  }}
                >
                  {showAddSaas ? 'Cancel' : editingSaasId ? 'Edit Sub' : '+ Add Sub'}
                </Button>
              )}
            </div>

            {/* SaaS Form (Collapsible) */}
            {showAddSaas && !readOnly && (
              <Card className="border border-teal-100 bg-teal-50/5 shadow-sm animate-in slide-in-from-top-2 duration-200">
                <CardContent className="pt-4 pb-4">
                  <form onSubmit={handleSaveSaas} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-700">Subscription / SaaS Name</Label>
                      <Input 
                        placeholder="e.g. AWS, Github, ChatGPT..."
                        value={saasName}
                        onChange={e => setSaasName(e.target.value)}
                        required
                        disabled={readOnly}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div className="col-span-2 space-y-1">
                        <Label className="font-bold text-xs text-slate-700">Monthly Cost (₹)</Label>
                        <Input 
                          type="number"
                          placeholder="e.g. 15000"
                          value={saasCost}
                          onChange={e => setSaasCost(e.target.value === '' ? '' : Number(e.target.value))}
                          required
                          disabled={readOnly}
                          className="h-9"
                        />
                      </div>
                      <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-9">
                        Save
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* SaaS Table */}
            <Card className="border shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                {subscriptions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-semibold">
                    No subscriptions tracked yet. Add software costs to start.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/75">
                          <TableHead className="font-black text-xs uppercase text-slate-500 h-9 py-2">Service</TableHead>
                          <TableHead className="font-black text-xs uppercase text-slate-500 h-9 py-2">Monthly Cost</TableHead>
                          <TableHead className="w-16 h-9 py-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map(sub => (
                          <TableRow key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-bold py-2.5">
                              <span className="text-slate-800 text-sm">{sub.name}</span>
                            </TableCell>
                            <TableCell className="font-code font-black text-slate-800 py-2.5">
                              {fmtINR(sub.cost)}
                            </TableCell>
                            <TableCell className="text-right py-2.5 pr-3">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-slate-400 hover:text-teal-600 rounded-full"
                                  onClick={() => handleEditSaas(sub)}
                                  disabled={readOnly}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full"
                                  onClick={() => handleDeleteSaas(sub.id)}
                                  disabled={readOnly}
                                >
                                  <Trash2 className="w-3 h-3" />
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

          {/* Pillar 2: Headcount Planner */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-600" />
                Headcount Planner
              </h2>
              {!readOnly && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-bold gap-1 rounded-full h-8 px-3"
                  onClick={() => {
                    setShowAddMember(!showAddMember);
                    if (editingMemberId) {
                      setEditingMemberId(null);
                      setMemberName('');
                      setMemberRole('');
                      setMemberSalary('');
                    }
                  }}
                >
                  {showAddMember ? 'Cancel' : editingMemberId ? 'Edit Role' : '+ Add Role'}
                </Button>
              )}
            </div>

            {/* Team Form (Collapsible) */}
            {showAddMember && !readOnly && (
              <Card className="border border-teal-100 bg-teal-50/5 shadow-sm animate-in slide-in-from-top-2 duration-200">
                <CardContent className="pt-4 pb-4">
                  <form onSubmit={handleSaveMember} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="font-bold text-xs text-slate-700">Name</Label>
                        <Input 
                          placeholder="e.g. Amit S..."
                          value={memberName}
                          onChange={e => setMemberName(e.target.value)}
                          required
                          disabled={readOnly}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-bold text-xs text-slate-700">Role</Label>
                        <Input 
                          placeholder="e.g. Lead Engineer..."
                          value={memberRole}
                          onChange={e => setMemberRole(e.target.value)}
                          disabled={readOnly}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="col-span-1 space-y-1">
                        <Label className="font-bold text-xs text-slate-700">Monthly Salary (₹)</Label>
                        <Input 
                          type="number"
                          placeholder="e.g. 100000"
                          value={memberSalary}
                          onChange={e => setMemberSalary(e.target.value === '' ? '' : Number(e.target.value))}
                          required
                          disabled={readOnly}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="font-bold text-xs text-slate-700">Status</Label>
                        <Select value={memberStatus} onValueChange={(v: any) => setMemberStatus(v)} disabled={readOnly}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="hiring">Planned Hire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-9">
                        Save Member
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Team Table */}
            <Card className="border shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                {team.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-semibold">
                    No team members listed yet. Add roles to start.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/75">
                          <TableHead className="font-black text-xs uppercase text-slate-500 h-9 py-2">Name & Role</TableHead>
                          <TableHead className="font-black text-xs uppercase text-slate-500 h-9 py-2">Monthly Salary</TableHead>
                          <TableHead className="font-black text-xs uppercase text-slate-500 h-9 py-2">Status</TableHead>
                          <TableHead className="w-16 h-9 py-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.map(member => (
                          <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-bold py-2.5">
                              <div className="text-slate-800 text-sm">{member.name}</div>
                              <div className="text-[10px] text-muted-foreground font-medium">{member.role}</div>
                            </TableCell>
                            <TableCell className="font-code font-black text-slate-800 py-2.5">
                              {fmtINR(member.salary)}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Badge className={`border text-[9px] uppercase font-black px-1.5 py-0.5 ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                {member.status === 'active' ? 'Active' : 'Planned'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-2.5 pr-3">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-slate-400 hover:text-teal-600 rounded-full"
                                  onClick={() => handleEditMember(member)}
                                  disabled={readOnly}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full"
                                  onClick={() => handleDeleteMember(member.id)}
                                  disabled={readOnly}
                                >
                                  <Trash2 className="w-3 h-3" />
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-teal-350 text-teal-300 animate-pulse" />
                      Operations Audit Report
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 font-mono">
                        Generated {activeReport.createdAt ? new Date(activeReport.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white hover:bg-slate-100 text-teal-900 text-[10px] font-black uppercase tracking-wider px-3 h-7 gap-1.5 rounded-md border border-teal-200"
                        onClick={handleExportPDF}
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-650" /> Export PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Summary */}
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium">
                    <p className="text-sm italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-dashed border-teal-200">
                      "{activeReport.advice?.summary || 'No summary available.'}"
                    </p>
                  </div>

                  {/* Runway analysis */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs uppercase font-black tracking-widest text-slate-900">
                      Runway & Burn Composition
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-teal-50/30 p-3 rounded-lg border border-teal-100/50">
                      {activeReport.advice?.runwayAnalysis || 'No analysis available.'}
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
                        {(activeReport.advice?.costOptimizationOpportunities || []).map((item: string, i: number) => (
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
                        {(activeReport.advice?.teamPlanningRecommendations || []).map((item: string, i: number) => (
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
                      {(activeReport.advice?.runwayExtensionTactics || []).map((tip: string, i: number) => (
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
                      {(activeReport.advice?.suggestedActions || []).map((action: string, i: number) => (
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
