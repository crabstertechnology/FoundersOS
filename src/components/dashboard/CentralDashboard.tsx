'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { fmtINR, fmtPct } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { goalAdvisorAssistant } from '@/ai/flows/goal-advisor-flow';
import { 
  LineChart, Wallet, Rocket, PieChart, Activity, TrendingUp, 
  AlertTriangle, ArrowUpRight, BarChart3, Users, Server, DollarSign, Calendar,
  Brain, Target, Sparkles, Map, ListTodo, CheckCircle2, Loader2, Edit, RefreshCw, Send, HelpCircle, ChevronRight, X
} from 'lucide-react';

interface CentralDashboardProps {
  userId: string;
  companyProfileId: string;
  onNavigate: (tab: string) => void;
}

interface Employee {
  id: string;
  uid: string;
  name: string;
  email: string;
  department: string;
  role: string;
  isActive: boolean;
}

export function CentralDashboard({ userId, companyProfileId, onNavigate }: CentralDashboardProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // State variables
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [stage, setStage] = useState('mvp');
  const [missingInfoContext, setMissingInfoContext] = useState('');
  const [weeklyProgress, setWeeklyProgress] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Record<string, boolean>>({});
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [missingInfoAnswers, setMissingInfoAnswers] = useState<Record<string, string>>({});
  const [activePlannerTab, setActivePlannerTab] = useState<'roadmap' | 'milestones' | 'weekly' | 'tasks'>('roadmap');
  
  // Loading messages loop
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const loadingMessages = [
    "Analyzing sales pipelines and conversion metrics...",
    "Reviewing headcount runway and SaaS operational burn rate...",
    "Comparing company current condition to your 12-month goal...",
    "Breaking down objectives into monthly targets...",
    "Drafting weekly high-impact execution plans...",
    "Synthesizing daily actionable tasks with role assignments...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (aiLoading) {
      interval = setInterval(() => {
        setLoadingMessageIdx(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [aiLoading]);

  // Firestore References
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  const employeesRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return collection(firestore, 'employees');
  }, [firestore, userId]);

  const employeesQuery = useMemoFirebase(() => {
    if (!employeesRef) return null;
    return query(employeesRef, where('adminUid', '==', userId));
  }, [employeesRef, userId]);

  // Subscriptions
  const { data: profile } = useDoc(profileRef) || {};
  const { data: shareholders } = useCollection(shareholdersRef) || {};
  const { data: rawEmployeesData } = useCollection(employeesQuery) || {};

  // Parse employees
  const employees = useMemo<Employee[]>(() => (rawEmployeesData || []).map((e: any) => ({
    id: e.id, uid: e.uid || e.id, name: e.name || 'Unknown',
    email: e.email || '', department: e.department || '',
    role: e.role || 'Employee', isActive: e.isActive !== false,
  })), [rawEmployeesData]);

  // Construct assignees list (Self + Employees)
  const assigneesList = useMemo(() => {
    const list = [...employees];
    if (user && !list.some(e => e.uid === user.uid)) {
      list.unshift({
        id: user.uid,
        uid: user.uid,
        name: `${user.displayName || 'You'} (Founder)`,
        email: user.email || '',
        department: 'Executive',
        role: 'Founder',
        isActive: true
      });
    }
    return list;
  }, [employees, user]);

  // Load goal details from Firestore once loaded
  useEffect(() => {
    if (profile) {
      if (profile.yearlyGoal) setYearlyGoal(profile.yearlyGoal);
      if (profile.companyStage) setStage(profile.companyStage);
      if (profile.missingInfoContext) setMissingInfoContext(profile.missingInfoContext);
    }
  }, [profile]);

  // 1. Finance Pillar Metrics
  const founderOwnership = useMemo(() => {
    if (!shareholders) return 100;
    const founders = shareholders.filter(sh => sh.role?.toLowerCase() === 'founder');
    if (founders.length === 0) return 0;
    return founders.reduce((sum, sh) => sum + (Number(sh.ownershipPercentage) || 0), 0);
  }, [shareholders]);

  const companyName = profile?.companyName || 'Your Startup';
  const postMoney = profile?.postMoneyValuation !== undefined && profile?.postMoneyValuation !== null 
    ? profile.postMoneyValuation 
    : (profile?.latestValuation || 0);

  const paperNetWorth = postMoney > 0 ? (postMoney * founderOwnership) / 100 : 0;
  const investment = profile?.investment || 0;
  const preMoney = Math.max(0, postMoney - investment);

  // 2. Sales Pillar Metrics
  const deals = useMemo(() => {
    return profile?.salesPipeline || [];
  }, [profile]);

  const salesKPIs = useMemo(() => {
    let activePipelineValue = 0;
    let wonCount = 0;
    let totalClosedCount = 0;

    deals.forEach((deal: any) => {
      const val = Number(deal.value) || 0;
      activePipelineValue += val;

      if (deal.stage === 'won') {
        wonCount++;
        totalClosedCount++;
      } else if (deal.stage === 'lost') {
        totalClosedCount++;
      }
    });

    const conversionRate = totalClosedCount > 0 ? (wonCount / totalClosedCount) * 100 : 0;
    const mrr = profile?.mRevenue || 0;
    const arr = mrr * 12;

    return {
      activePipelineValue,
      conversionRate,
      mrr,
      arr,
      wonCount
    };
  }, [deals, profile]);

  // 3. Operations Pillar Metrics
  const subscriptions = useMemo(() => {
    return profile?.saasSubscriptions || [];
  }, [profile]);

  const team = useMemo(() => {
    return profile?.teamMembers || [];
  }, [profile]);

  const opsKPIs = useMemo(() => {
    let monthlySaaS = 0;
    subscriptions.forEach((sub: any) => {
      const cost = Number(sub.cost) || 0;
      monthlySaaS += sub.billing === 'yearly' ? cost / 12 : cost;
    });

    let monthlySalaries = 0;
    team.forEach((m: any) => {
      monthlySalaries += Number(m.salary) || 0;
    });

    const cashBank = profile?.cashBank || 0;
    const totalBurn = profile?.burnRate || (monthlySaaS + monthlySalaries + (profile?.otherBurn || 0));
    const runway = totalBurn > 0 ? cashBank / totalBurn : 999;
    const teamSize = team.filter((m: any) => m.status === 'active').length;

    return {
      monthlySaaS,
      monthlySalaries,
      cashBank,
      totalBurn,
      runway,
      teamSize
    };
  }, [subscriptions, team, profile]);

  const handleGeneratePlan = async (e?: React.FormEvent, progressText?: string) => {
    if (e) e.preventDefault();
    if (!profileRef || !yearlyGoal) return;
    setAiLoading(true);

    try {
      // Build additional info payload including Q&A answers
      let refinedMissingInfo = missingInfoContext;
      if (Object.keys(missingInfoAnswers).length > 0) {
        refinedMissingInfo += '\n\nAnswers to AI clarifying questions:\n' + 
          Object.entries(missingInfoAnswers)
            .map(([q, a]) => `- Q: ${q}\n  A: ${a}`)
            .join('\n');
      }

      const input = {
        companyName,
        stage,
        yearlyGoal,
        salesData: {
          mrr: salesKPIs.mrr,
          arr: salesKPIs.arr,
          pipelineValue: salesKPIs.activePipelineValue,
          dealsCount: deals.length,
        },
        financeData: {
          valuation: postMoney,
          investment,
          runway: opsKPIs.runway === 999 ? 99 : Math.round(opsKPIs.runway),
          cash: opsKPIs.cashBank,
          burnRate: opsKPIs.totalBurn,
        },
        opsData: {
          teamSize: opsKPIs.teamSize,
          saasCost: opsKPIs.monthlySaaS,
          salaries: opsKPIs.monthlySalaries,
        },
        missingInfo: refinedMissingInfo,
        weeklyProgress: progressText || undefined,
        previousRoadmap: progressText ? JSON.stringify(profile?.strategicPlan || null) : undefined,
      };

      const result = await goalAdvisorAssistant(input);

      // Save strategic plan directly inside the profile document
      await setDocumentNonBlocking(profileRef, {
        yearlyGoal,
        companyStage: stage,
        missingInfoContext: refinedMissingInfo,
        strategicPlan: result,
      }, { merge: true });

      setIsEditingGoal(false);
      setMissingInfoAnswers({});
      if (progressText) {
        setWeeklyProgress('');
      }
    } catch (err) {
      console.error('Error generating AI execution plan:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAssignTask = async (task: any, assigneeUid: string) => {
    if (!firestore || !userId || !companyProfileId) return;

    const assignee = assigneesList.find(a => a.uid === assigneeUid);
    const tasksRef = collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'tasks');

    const payload = {
      title: task.title,
      description: task.description,
      priority: task.priority || 'medium',
      status: 'todo',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week due date
      assignedToUid: assigneeUid,
      assignedToName: assignee?.name || 'Unassigned',
      assignedToEmail: assignee?.email || '',
      category: task.category || 'AI Roadmap',
      createdAt: serverTimestamp()
    };

    try {
      await addDocumentNonBlocking(tasksRef, payload);
      setAssignedTasks(prev => ({ ...prev, [task.title]: true }));
      setAssigningTaskId(null);
    } catch (err) {
      console.error('Error creating assigned task document:', err);
    }
  };

  // Predefined goal options for quick fill
  const goalPresets = [
    { text: "Achieve ₹5,000,000 ARR, optimize runway to 18 months, and hire 3 core team members.", icon: TrendingUp },
    { text: "Launch MVP product, secure first 10 pilot customers, and close ₹3,000,000 seed investment.", icon: Rocket },
    { text: "Double pipeline conversion rate from 10% to 20% and reduce monthly burn rate by 15% through SaaS audits.", icon: Activity },
  ];

  // Helper to render AI response markdown safely
  function renderMarkdown(text: string) {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      let cleanLine = line;
      let isBullet = false;
      let headingLevel = 0;
      
      if (line.startsWith('### ')) {
        headingLevel = 3;
        cleanLine = line.substring(4);
      } else if (line.startsWith('## ')) {
        headingLevel = 2;
        cleanLine = line.substring(3);
      } else if (line.startsWith('# ')) {
        headingLevel = 1;
        cleanLine = line.substring(2);
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        isBullet = true;
        cleanLine = line.trim().substring(2);
      }

      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-slate-900">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }
      const content = parts.length > 0 ? parts : cleanLine;

      if (headingLevel === 1) return <h1 key={idx} className="text-xl font-black mt-4 mb-2 text-slate-900 border-b pb-1">{content}</h1>;
      if (headingLevel === 2) return <h2 key={idx} className="text-lg font-bold mt-3 mb-1.5 text-slate-900">{content}</h2>;
      if (headingLevel === 3) return <h3 key={idx} className="text-sm font-bold mt-2.5 mb-1 text-slate-800 uppercase tracking-wide">{content}</h3>;
      if (isBullet) return <li key={idx} className="ml-4 list-disc text-sm text-slate-600 leading-relaxed mb-1">{content}</li>;
      return <p key={idx} className="text-sm text-slate-600 leading-relaxed mb-2 min-h-[1rem]">{content}</p>;
    });
  }

  const strategicPlan = profile?.strategicPlan;
  const hasPlan = strategicPlan && !isEditingGoal;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-2 mt-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-indigo-600" />
            AI Strategic Planner
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Aligning your yearly goals with automated roadmaps, milestones, and actionable tasks.
          </p>
        </div>
        {hasPlan && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditingGoal(true)}
            className="border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all rounded-lg font-bold gap-1.5 h-9"
          >
            <Edit className="w-4 h-4" />
            Edit Goals & Stage
          </Button>
        )}
      </div>

      {/* LOADING STATE */}
      {aiLoading && (
        <Card className="border-2 border-indigo-100 bg-indigo-50/5 shadow-md py-16 text-center animate-pulse">
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">FounderOS AI is Processing</h3>
              <p className="text-sm text-indigo-700 font-semibold max-w-md transition-all duration-300">
                {loadingMessages[loadingMessageIdx]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SETUP FORM */}
      {!aiLoading && !hasPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Setup Fields */}
          <Card className="lg:col-span-2 border-2 border-slate-200 hover:border-indigo-200 transition-all shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Define Startup Strategy
              </CardTitle>
              <CardDescription>
                Provide your yearly roadmap objectives. The AI will cross-reference this with your CRM, Runway, and SaaS subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={(e) => handleGeneratePlan(e)} className="space-y-6">
                
                {/* Stage selection */}
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Startup Stage</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger className="w-full h-10 border-slate-200 font-semibold">
                      <SelectValue placeholder="Select current stage..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mvp">Pre-revenue / MVP (Product Development)</SelectItem>
                      <SelectItem value="seed">Early Traction / Seed (Validating Product-Market Fit)</SelectItem>
                      <SelectItem value="scaling">Scaling / Growth (Acquiring Market Share)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Yearly Goal text input */}
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Startup Yearly Goal</Label>
                  <textarea
                    className="w-full text-sm font-medium p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Describe your primary targets for the next 12 months (e.g. key revenue milestones, funding milestones, customer numbers)..."
                    value={yearlyGoal}
                    onChange={e => setYearlyGoal(e.target.value)}
                    required
                  />
                  
                  {/*Presets*/}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Preset Templates (Click to fill)</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {goalPresets.map((preset, idx) => {
                        const Icon = preset.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setYearlyGoal(preset.text)}
                            className="p-3 text-left text-xs bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all border rounded-lg font-medium text-slate-600 flex flex-col justify-between"
                          >
                            <Icon className="w-4 h-4 text-indigo-500 mb-2 shrink-0" />
                            <p className="line-clamp-3 leading-relaxed">{preset.text}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Qualitative Context / Missing Info */}
                <div className="space-y-2 pt-2">
                  <Label className="font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    Additional Context / Missing Business Information
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </Label>
                  <textarea
                    className="w-full text-sm font-medium p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={2}
                    placeholder="Provide context like sales channels, target audience, roadblocks, or details not logged in Sales/Finance trackers..."
                    value={missingInfoContext}
                    onChange={e => setMissingInfoContext(e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t flex gap-3">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-sm gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate 12-Month Plan & Roadmap
                  </Button>
                  {isEditingGoal && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditingGoal(false)}
                      className="h-11 px-5 font-bold"
                    >
                      Cancel
                    </Button>
                  )}
                </div>

              </form>
            </CardContent>
          </Card>

          {/* Live Data Summary Card */}
          <Card className="border shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-indigo-50/20 border-b pb-4">
              <CardTitle className="text-xs uppercase font-black tracking-widest text-indigo-950 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-indigo-600" />
                Live Business Feed
              </CardTitle>
              <CardDescription className="text-[10px]">
                FoundersOS gathers these metrics from active CRM pipelines, Cap tables, and Operations tables.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 flex-1">
              
              {/* Sales Feed */}
              <div className="space-y-1.5 pb-3 border-b">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Sales Tracker
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  <div>MRR: <span className="font-bold text-slate-900">{fmtINR(salesKPIs.mrr)}</span></div>
                  <div>Pipeline: <span className="font-bold text-slate-900">{fmtINR(salesKPIs.activePipelineValue)}</span></div>
                  <div>Won Deals: <span className="font-bold text-indigo-600">{salesKPIs.wonCount}</span></div>
                  <div>Win Rate: <span className="font-bold text-emerald-600">{salesKPIs.conversionRate.toFixed(1)}%</span></div>
                </div>
              </div>

              {/* Finance Feed */}
              <div className="space-y-1.5 pb-3 border-b">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Finance Suite
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  <div>Valuation: <span className="font-bold text-slate-900">{fmtINR(postMoney)}</span></div>
                  <div>Capital Raised: <span className="font-bold text-slate-900">{fmtINR(investment)}</span></div>
                  <div>Founder Share: <span className="font-bold text-blue-600">{fmtPct(founderOwnership)}</span></div>
                  <div>Net Worth: <span className="font-bold text-slate-900">{fmtINR(paperNetWorth)}</span></div>
                </div>
              </div>

              {/* Operations Feed */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Operations Hub
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  <div>Bank Cash: <span className="font-bold text-slate-900">{fmtINR(opsKPIs.cashBank)}</span></div>
                  <div>Runway: <span className="font-bold text-rose-600">{opsKPIs.runway === 999 ? '∞' : `${Math.round(opsKPIs.runway)} mo`}</span></div>
                  <div>Monthly Burn: <span className="font-bold text-slate-900">{fmtINR(opsKPIs.totalBurn)}</span></div>
                  <div>Team size: <span className="font-bold text-slate-900">{opsKPIs.teamSize} active</span></div>
                </div>
              </div>

            </CardContent>
            <div className="p-6 bg-slate-50 border-t text-[10px] text-muted-foreground font-semibold text-center leading-relaxed">
              If these metrics look incomplete, navigate to the Sales, Finance, or Operations tabs to update your records.
            </div>
          </Card>
        </div>
      )}

      {/* ROADMAP & PLANNER DASHBOARD VIEW */}
      {!aiLoading && hasPlan && (
        <div className="space-y-8">
          
          {/* Goal Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block">ACTIVE STRATEGIC INITIATIVE</span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">{yearlyGoal}</h2>
              <div className="flex gap-2 items-center pt-1">
                <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 uppercase text-[9px] font-bold">
                  Stage: {stage}
                </Badge>
                <span className="text-slate-500 text-xs">|</span>
                <span className="text-xs text-slate-300 font-medium">Roadmap active and synced</span>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditingGoal(true)}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs rounded-xl h-9"
              >
                Re-Generate Plan
              </Button>
            </div>
          </div>

          {/* Strategic Analysis & Plans Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Strategic Content Column (Roadmap Tabs) */}
            <div className="xl:col-span-2 space-y-8">
              
              {/* Tab Selector */}
              <div className="border-b flex justify-between items-center pb-2">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  {[
                    { id: 'roadmap', label: 'Quarterly Roadmap', icon: Map },
                    { id: 'milestones', label: 'Monthly Milestones', icon: Calendar },
                    { id: 'weekly', label: 'Weekly Execution', icon: TrendingUp },
                    { id: 'tasks', label: 'Daily Actionable Tasks', icon: ListTodo }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActivePlannerTab(item.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          activePlannerTab === item.id 
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TABS CONTENT */}

              {/* 1. Quarterly Roadmap Tab */}
              {activePlannerTab === 'roadmap' && (
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-black text-slate-900">12-Month Roadmaps & Focus Areas</CardTitle>
                    <CardDescription>Strategic priorities divided into quarterly focus areas to achieve target milestones.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-6">
                    <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-8">
                      {strategicPlan.yearlyRoadmap?.map((quarter: any, idx: number) => (
                        <div key={idx} className="relative group">
                          {/* Bullet marker */}
                          <div className="absolute -left-[31px] top-1 bg-white border-2 border-indigo-600 w-4 h-4 rounded-full flex items-center justify-center group-hover:scale-110 transition-all">
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block mb-0.5">{quarter.period}</span>
                            <h4 className="font-extrabold text-sm text-slate-800 mb-1">{quarter.focus}</h4>
                            <ul className="space-y-1">
                              {quarter.objectives?.map((obj: string, oIdx: number) => (
                                <li key={oIdx} className="text-xs text-slate-600 font-medium flex items-start gap-2">
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                  <span>{obj}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 2. Monthly Milestones Tab */}
              {activePlannerTab === 'milestones' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {strategicPlan.monthlyMilestones?.map((milestone: any, idx: number) => (
                    <Card key={idx} className="border shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                      <CardHeader className="pb-3 border-b bg-slate-50/50">
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] uppercase font-bold w-fit mb-2">
                          {milestone.month}
                        </Badge>
                        <CardTitle className="text-sm font-bold text-slate-800 leading-snug">{milestone.milestone}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 flex-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-2">KEY METRICS TO MONITOR</span>
                        <ul className="space-y-1.5">
                          {milestone.keyMetrics?.map((metric: string, mIdx: number) => (
                            <li key={mIdx} className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                              <span>{metric}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 3. Weekly Execution Tab */}
              {activePlannerTab === 'weekly' && (
                <div className="space-y-6">
                  {strategicPlan.weeklyPlans?.map((week: any, idx: number) => (
                    <Card key={idx} className="border shadow-sm">
                      <CardHeader className="pb-3 bg-slate-50/20 border-b flex flex-row items-center justify-between">
                        <div>
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-black uppercase mr-2">
                            {week.week}
                          </Badge>
                          <span className="font-bold text-xs text-slate-900">{week.theme}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {week.actions?.map((action: string, aIdx: number) => (
                            <li key={aIdx} className="text-xs text-slate-600 bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-lg border border-slate-150 font-semibold flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 4. Daily Actionable Tasks Tab */}
              {activePlannerTab === 'tasks' && (
                <Card className="border shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/30 border-b pb-4">
                    <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                      <ListTodo className="w-5 h-5 text-indigo-600" />
                      Daily Roadmap Deliverables
                    </CardTitle>
                    <CardDescription>
                      Assign these strategic daily tasks directly. Assigned members will receive real-time notifications linking to their Task workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 divide-y">
                    {strategicPlan.dailyTasks?.map((task: any, idx: number) => {
                      const isAssigned = assignedTasks[task.title];
                      const isAssigning = assigningTaskId === task.title;

                      return (
                        <div key={idx} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/30 transition-all">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex gap-2 items-center flex-wrap">
                              <Badge className="bg-teal-50 text-teal-700 border-teal-100 text-[9px] uppercase font-bold">
                                {task.category}
                              </Badge>
                              <Badge className={`border text-[9px] uppercase font-bold ${
                                task.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                task.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {task.priority}
                              </Badge>
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-800 truncate">{task.title}</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{task.description}</p>
                          </div>

                          <div className="shrink-0 flex items-center gap-2 w-full md:w-auto justify-end">
                            {isAssigned ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[10px] font-bold px-2.5 py-1.5 gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Assigned & Notified
                              </Badge>
                            ) : isAssigning ? (
                              <div className="flex gap-1.5 items-center bg-white border p-1 rounded-xl shadow-sm animate-in fade-in duration-200">
                                <Select onValueChange={(uid) => handleAssignTask(task, uid)}>
                                  <SelectTrigger className="h-8 text-xs w-44">
                                    <SelectValue placeholder="Select member..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {assigneesList.map(a => (
                                      <SelectItem key={a.uid} value={a.uid}>{a.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setAssigningTaskId(null)} 
                                  className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setAssigningTaskId(task.title)}
                                className="bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl h-8 gap-1"
                              >
                                <Users className="w-3.5 h-3.5" />
                                Assign Task
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Weekly Progress Logger / Adaptation Section */}
              <Card className="border-2 border-indigo-100 bg-indigo-50/5 shadow-sm mt-8">
                <CardHeader>
                  <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                    Weekly Adaptation Hub
                  </CardTitle>
                  <CardDescription>
                    Log your startup progress, milestones completed, or roadblocks faced. FounderOS AI will dynamically adapt your roadmaps, monthly targets, and daily actionable tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Weekly Progress Update</Label>
                    <textarea
                      className="w-full text-sm font-medium p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
                      rows={3}
                      placeholder="e.g. Completed CRM pilots setup. Delayed MVP dashboard coding due to API bugs. Closed ₹100k ARR SaaS deal..."
                      value={weeklyProgress}
                      onChange={e => setWeeklyProgress(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleGeneratePlan(undefined, weeklyProgress)}
                    disabled={!weeklyProgress || aiLoading}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold h-10 gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Adapt Future Plans Dynamically
                  </Button>
                </CardContent>
              </Card>

            </div>

            {/* Right Strategic Insights Column (AI Analysis & Q&A) */}
            <div className="space-y-8">
              
              {/* Strategic Insights Analysis */}
              <Card className="border-2 border-indigo-50 hover:border-indigo-100 transition-all shadow-sm">
                <CardHeader className="bg-indigo-50/30 border-b pb-4">
                  <CardTitle className="text-xs uppercase font-black tracking-widest text-indigo-950 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-600" />
                    Strategic Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 prose prose-slate max-w-none">
                  {renderMarkdown(strategicPlan.analysis)}
                </CardContent>
              </Card>

              {/* AI Clarifying Questions / Missing Info Form */}
              {strategicPlan.missingInfoRequests && strategicPlan.missingInfoRequests.length > 0 && (
                <Card className="border-2 border-amber-100/80 bg-amber-50/5 shadow-sm">
                  <CardHeader className="bg-amber-50/30 border-b pb-4">
                    <CardTitle className="text-xs uppercase font-black tracking-widest text-amber-950 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      Refine Plan (AI Requests)
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      The AI needs some clarity to tailor your roadmaps. Submit details below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {strategicPlan.missingInfoRequests.map((question: string, qIdx: number) => (
                      <div key={qIdx} className="space-y-2">
                        <Label className="font-bold text-xs text-slate-700 block leading-relaxed">{question}</Label>
                        <Input
                          placeholder="Type answer here..."
                          value={missingInfoAnswers[question] || ''}
                          onChange={e => setMissingInfoAnswers(prev => ({ ...prev, [question]: e.target.value }))}
                          className="bg-white border-slate-200"
                        />
                      </div>
                    ))}
                    <Button
                      onClick={(e) => handleGeneratePlan(e)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 text-xs gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Answers to AI
                    </Button>
                  </CardContent>
                </Card>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
