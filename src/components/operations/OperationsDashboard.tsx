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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { fmtINR, fmtPct, fmtMult } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { 
  Plus, Trash2, Edit2, Sparkles, Loader2, Wallet, Users, Layout, ShieldAlert, Layers, Cloud,
  Server, Laptop, Briefcase, Calendar, CheckCircle2, ChevronRight, Activity, Info, ListChecks, Shield, MessageSquare,
  Printer, BarChart3, CreditCard, Calculator, Download, Clock, Flame, Coins, Send, Play, RefreshCw, X, ChevronDown, Check, ArrowRight, Eye
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
import { RunwayOperationsView } from './RunwayOperationsView';
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
  const [showAddSaas, setShowAddSaas] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Modal and filter states
  const [isAddSaasOpen, setIsAddSaasOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditCashOpen, setIsEditCashOpen] = useState(false);
  const [isAuditHistoryOpen, setIsAuditHistoryOpen] = useState(false);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('This Month');

  // Runway Simulation States
  const [simRevenue, setSimRevenue] = useState(0);
  const [simSaaSPercent, setSimSaaSPercent] = useState(100);
  const [simSalariesDelta, setSimSalariesDelta] = useState(0);

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
    const categoryTotals: Record<string, number> = { hosting: 0, ai: 0, saas: 0, marketing: 0, other: 0 };
    subscriptions.forEach(sub => {
      const cost = Number(sub.cost) || 0;
      const monthlyEquivalent = sub.billing === 'yearly' ? cost / 12 : cost;
      totalSaasMonthly += monthlyEquivalent;
      
      const cat = sub.category || 'saas';
      if (categoryTotals[cat] !== undefined) {
        categoryTotals[cat] += monthlyEquivalent;
      } else {
        categoryTotals.other += monthlyEquivalent;
      }
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
      runway,
      categoryTotals
    };
  }, [subscriptions, team, otherBurn, cashBank]);

  // Cash & Runway 6-Month Projection
  const projectionData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const simSaaS = calculatedStats.totalSaasMonthly * (simSaaSPercent / 100);
    const simSalaries = calculatedStats.totalSalaries + simSalariesDelta;
    const simBurn = Math.max(0, simSaaS + simSalaries + otherBurn - simRevenue);
    
    // Starting balance (anchor to cash in bank, or default ₹10L scale for visual preview if 0)
    const baseCash = cashBank > 0 ? cashBank : 1000000;
    
    return months.map((month, idx) => {
      // Projected cash decrease or steady growth
      const projected = Math.max(0, baseCash - (simBurn * idx * 0.5));
      return {
        month,
        cashBalance: projected,
        burn: simBurn > 0 ? simBurn : calculatedStats.totalBurn,
      };
    });
  }, [cashBank, calculatedStats.totalBurn, calculatedStats.totalSaasMonthly, calculatedStats.totalSalaries, simSaaSPercent, simSalariesDelta, otherBurn, simRevenue]);

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
    setShowAddSaas(false);
  };

  const handleEditSaas = (sub: SaasSubscription) => {
    setEditingSaasId(sub.id);
    setSaasName(sub.name);
    setSaasCost(sub.cost);
    setSaasBilling(sub.billing || 'monthly');
    setSaasCategory(sub.category || 'saas');
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
      setSaasBilling('monthly');
      setSaasCategory('hosting');
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
    <div className="space-y-6 w-full animate-in fade-in duration-500">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {activeSubTab === undefined && (
          <div className="flex border-b pb-3 mb-6 overflow-hidden">
            <TabsList className="w-full overflow-x-auto flex justify-start p-1 bg-slate-100/80 rounded-xl md:rounded-full gap-0.5 border-none h-auto md:h-10 whitespace-nowrap scrollbar-none shrink-0">
              <TabsTrigger value="ops" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <Activity className="w-3.5 h-3.5" /> Runway & SaaS Burn
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <ListChecks className="w-3.5 h-3.5" /> Task Workspace
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <MessageSquare className="w-3.5 h-3.5" /> Team Chat
              </TabsTrigger>
              <TabsTrigger value="weekly" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <Activity className="w-3.5 h-3.5" /> Weekly Dashboard
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-full px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 transition-all gap-1.5 shrink-0">
                <Activity className="w-3.5 h-3.5" /> Daily Activity
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
          <RunwayOperationsView
            profile={profile}
            calculatedStats={calculatedStats}
            subscriptions={subscriptions}
            team={team}
            otherBurn={otherBurn}
            cashBank={cashBank}
            readOnly={readOnly}
            operationsReports={operationsReports}
            activeReport={activeReport}
            setActiveReport={setActiveReport}
            aiLoading={aiLoading}
            triggerAIAnalysis={triggerAIAnalysis}
            customQuestion={customQuestion}
            setCustomQuestion={setCustomQuestion}
            handleSaveSaas={handleSaveSaas}
            handleDeleteSaas={handleDeleteSaas}
            handleSaveMember={handleSaveMember}
            handleDeleteMember={handleDeleteMember}
            handleUpdateCash={handleUpdateCash}
            handleUpdateOverhead={handleUpdateOverhead}
            handleExportPDF={handleExportPDF}
            handleDeleteReport={handleDeleteReport}
            saasName={saasName}
            setSaasName={setSaasName}
            saasCost={saasCost}
            setSaasCost={setSaasCost}
            saasBilling={saasBilling}
            setSaasBilling={setSaasBilling}
            saasCategory={saasCategory}
            setSaasCategory={setSaasCategory}
            editingSaasId={editingSaasId}
            setEditingSaasId={setEditingSaasId}
            memberName={memberName}
            setMemberName={setMemberName}
            memberRole={memberRole}
            setMemberRole={setMemberRole}
            memberSalary={memberSalary}
            setMemberSalary={setMemberSalary}
            memberStatus={memberStatus}
            setMemberStatus={setMemberStatus}
            editingMemberId={editingMemberId}
            setEditingMemberId={setEditingMemberId}
            cashBankInput={cashBankInput}
            otherBurnInput={otherBurnInput}
            simRevenue={simRevenue}
            setSimRevenue={setSimRevenue}
            simSaaSPercent={simSaaSPercent}
            setSimSaaSPercent={setSimSaaSPercent}
            simSalariesDelta={simSalariesDelta}
            setSimSalariesDelta={setSimSalariesDelta}
            CATEGORIES={CATEGORIES}
          />
      </TabsContent>
      </Tabs>
    </div>
  );
}
