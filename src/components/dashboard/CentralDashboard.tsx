'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, getDoc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { fmtINR, fmtPct } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { goalAdvisorAssistant } from '@/ai/flows/goal-advisor-flow';
import { roadmapChatAssistant } from '@/ai/flows/roadmap-chat-flow';
import { 
  LineChart, Wallet, Rocket, PieChart, Activity, TrendingUp, 
  AlertTriangle, ArrowUpRight, BarChart3, Users, Server, DollarSign, Calendar,
  Brain, Target, Sparkles, Map, ListTodo, CheckCircle2, Loader2, Edit, RefreshCw, Send, HelpCircle, ChevronRight, X,
  FileText, UploadCloud, Trash, Paperclip, MessageSquare, History, Copy, Check, Mail, Save
} from 'lucide-react';
import { weeklyProgressReportAssistant } from '@/ai/flows/weekly-progress-report-flow';

const loadPdfJs = () => {
  return new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined') return reject('Not on browser');
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve((window as any).pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const extractTextFromPdf = async (file: File): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    text += pageText + '\n';
  }
  return text;
};

const extractTextFromFile = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

interface CentralDashboardProps {
  userId: string;
  companyProfileId: string;
  onNavigate: (tab: string) => void;
  readOnly?: boolean;
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

export function CentralDashboard({ userId, companyProfileId, onNavigate, readOnly = false }: CentralDashboardProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // State variables
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [stage, setStage] = useState('mvp');
  const [missingInfoContext, setMissingInfoContext] = useState('');
  const [weeklyProgress, setWeeklyProgress] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState('');
  const [weeklyReportLoading, setWeeklyReportLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportSavedSuccess, setReportSavedSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [goalsSavedSuccess, setGoalsSavedSuccess] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Record<string, boolean>>({});
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [missingInfoAnswers, setMissingInfoAnswers] = useState<Record<string, string>>({});
  const [activePlannerTab, setActivePlannerTab] = useState<'roadmap' | 'milestones' | 'chat' | 'history'>('roadmap');
  const [selectedHistoricalPlan, setSelectedHistoricalPlan] = useState<any | null>(null);
  const [attachedDocName, setAttachedDocName] = useState('');
  const [attachedDocText, setAttachedDocText] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [latestModSuggestion, setLatestModSuggestion] = useState('');
  
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

  const tasksRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'tasks');
  }, [firestore, userId, companyProfileId]);

  // Subscriptions
  const { data: profile } = useDoc(profileRef) || {};
  const { data: shareholders } = useCollection(shareholdersRef) || {};
  const { data: rawEmployeesData } = useCollection(employeesQuery) || {};
  const { data: tasksRaw } = useCollection(tasksRef) || {};

  const planHistoryRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'planHistory');
  }, [firestore, userId, companyProfileId]);

  const planHistoryQuery = useMemoFirebase(() => {
    if (!planHistoryRef) return null;
    return query(planHistoryRef, orderBy('createdAt', 'desc'));
  }, [planHistoryRef]);

  const { data: planHistory } = useCollection(planHistoryQuery) || {};

  const weeklyReportsRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'weeklyReports');
  }, [firestore, userId, companyProfileId]);

  const weeklyReportsQuery = useMemoFirebase(() => {
    if (!weeklyReportsRef) return null;
    return query(weeklyReportsRef, orderBy('createdAt', 'desc'));
  }, [weeklyReportsRef]);

  const { data: weeklyReportsHistory } = useCollection(weeklyReportsQuery) || {};

  const roadmapChatRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'chats', 'roadmapDiscussion');
  }, [firestore, userId, companyProfileId]);

  useEffect(() => {
    if (roadmapChatRef) {
      getDoc(roadmapChatRef).then(snap => {
        if (snap.exists() && snap.data().messages) {
          setChatMessages(snap.data().messages);
          if (snap.data().latestModSuggestion) {
            setLatestModSuggestion(snap.data().latestModSuggestion);
          }
        }
      }).catch(err => console.error("Error reading roadmap chat:", err));
    }
  }, [roadmapChatRef]);

  const { completedTasksList, pendingTasksList } = useMemo(() => {
    const completed: any[] = [];
    const pending: any[] = [];
    (tasksRaw || []).forEach((t: any) => {
      const taskData = {
        title: t.title || '',
        description: t.description || '',
        category: t.category || '',
        feedback: t.feedback || ''
      };
      if (t.status === 'done') {
        completed.push(taskData);
      } else {
        pending.push(taskData);
      }
    });
    return { completedTasksList: completed, pendingTasksList: pending };
  }, [tasksRaw]);

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
      if (profile.attachedDocName) setAttachedDocName(profile.attachedDocName);
      if (profile.attachedDocText) setAttachedDocText(profile.attachedDocText);
      if (profile.weeklyProgressReport) setWeeklyReport(profile.weeklyProgressReport);
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

  const handleGenerateWeeklyReport = async () => {
    if (!profileRef) return;
    setWeeklyReportLoading(true);
    try {
      const now = new Date();
      const dateOnlyStr = now.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const currentDateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Filter and serialize data
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const filterLast7Days = (list: any[], dateField = 'date') => {
        return (list || []).filter(item => {
          const val = item[dateField];
          if (!val) return true;
          const d = new Date(val);
          return !isNaN(d.getTime()) && d >= sevenDaysAgo && d <= now;
        });
      };

      const filteredDaily = filterLast7Days(profile?.ezDailyActivities || [], 'date');
      const filteredWorkshops = filterLast7Days(profile?.workshops || [], 'date');
      const filteredProductSales = filterLast7Days(profile?.ezProductSales || [], 'date');
      const filteredLeads = filterLast7Days(profile?.ezLeads || [], 'lastActivity');
      const filteredBdLeads = filterLast7Days(profile?.bdLeads || [], 'lastActivity');
      const filteredNetworking = filterLast7Days(profile?.networkingEvents || [], 'date');
      
      const filteredTasks = (tasksRaw || []).filter((t: any) => {
        const completedAt = t.completedAt;
        if (completedAt) {
          const d = new Date(completedAt);
          return !isNaN(d.getTime()) && d >= sevenDaysAgo && d <= now;
        }
        const createdAt = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : null;
        if (createdAt) {
          return createdAt >= sevenDaysAgo && createdAt <= now;
        }
        return true;
      });

      const feedbacks = {
        salesDaily: profile?.salesDailyFeedback || '',
        salesWeekly: profile?.salesWeeklyFeedback || '',
        opsDaily: profile?.opsDailyFeedback || '',
        opsWeekly: profile?.opsWeeklyFeedback || '',
        financeDaily: profile?.financeDailyFeedback || '',
        financeWeekly: profile?.financeWeeklyFeedback || '',
      };

      const marketing = profile?.dmActivePlan ? {
        productName: profile.dmActivePlan.productName,
        brandTone: profile.dmActivePlan.brandTone,
        contentGoal: profile.dmActivePlan.contentGoal,
        platforms: profile.dmActivePlan.platforms,
        calendarSummary: (profile.dmActivePlan.calendar?.weeklyCalendar || []).map((c: any) => `${c.day}: ${c.platform} ${c.contentType} - ${c.topic}`).join('\n')
      } : null;

      const serialized = JSON.stringify({
        ezDailyActivities: filteredDaily,
        workshops: filteredWorkshops,
        ezProductSales: filteredProductSales,
        ezLeads: filteredLeads,
        bdLeads: filteredBdLeads,
        networkingEvents: filteredNetworking,
        tasks: filteredTasks.map((t: any) => ({
          title: t.title,
          description: t.description,
          status: t.status,
          assignedToName: t.assignedToName,
          completedAt: t.completedAt,
          category: t.category
        })),
        marketingPlan: marketing,
        feedbackNotes: feedbacks
      }, null, 2);

      const result = await weeklyProgressReportAssistant({
        companyName,
        currentDate: dateOnlyStr,
        activitiesSerialized: serialized
      });

      setWeeklyReport(result.report);

      await setDocumentNonBlocking(profileRef, {
        weeklyProgressReport: result.report,
        weeklyProgressReportGeneratedAt: currentDateStr
      }, { merge: true });

    } catch (err) {
      console.error('Error generating weekly progress report:', err);
    } finally {
      setWeeklyReportLoading(false);
    }
  };

  const handleSaveWeeklyReport = async () => {
    if (!profileRef) return;
    setIsSavingReport(true);
    try {
      const now = new Date();
      const currentDateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      await setDocumentNonBlocking(profileRef, {
        weeklyProgressReport: weeklyReport,
        weeklyProgressReportSavedAt: currentDateStr
      }, { merge: true });

      if (firestore && userId && companyProfileId) {
        const reportsCollRef = collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'weeklyReports');
        await addDocumentNonBlocking(reportsCollRef, {
          report: weeklyReport,
          createdAt: serverTimestamp(),
          date: currentDateStr
        });
      }

      setReportSavedSuccess(true);
      setTimeout(() => setReportSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving weekly report:', err);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleCopyReport = () => {
    if (!weeklyReport) return;
    navigator.clipboard.writeText(weeklyReport);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveGoals = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profileRef || isSavingGoals) return;

    setIsSavingGoals(true);
    try {
      await setDocumentNonBlocking(profileRef, {
        yearlyGoal,
        companyStage: stage,
        missingInfoContext,
        attachedDocName: attachedDocName || null,
        attachedDocText: attachedDocText || null,
      }, { merge: true });

      setGoalsSavedSuccess(true);
      setTimeout(() => {
        setGoalsSavedSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving startup strategy & goals to DB:', err);
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleGeneratePlan = async (e?: React.FormEvent, progressText?: string, modSuggestion?: string) => {
    if (e) e.preventDefault();
    if (!profileRef || !yearlyGoal) return;
    setAiLoading(true);
    setSelectedHistoricalPlan(null);

    try {
      // Build additional info payload including Q&A answers
      let refinedMissingInfo = missingInfoContext;
      if (Object.keys(missingInfoAnswers).length > 0) {
        refinedMissingInfo += '\n\nAnswers to AI clarifying questions:\n' + 
          Object.entries(missingInfoAnswers)
            .map(([q, a]) => `- Q: ${q}\n  A: ${a}`)
            .join('\n');
      }

      // 1. Product Suite Data
      const prodAIPlan = profile?.prodAIPlan;
      const productBlueprintSummary = prodAIPlan ? [
        prodAIPlan.review ? `Evaluation: ${prodAIPlan.review.slice(0, 300)}...` : '',
        prodAIPlan.howToSell ? `GTM Strategy: ${prodAIPlan.howToSell.slice(0, 300)}...` : '',
        prodAIPlan.whatToDevelop ? `Dev Priorities: ${prodAIPlan.whatToDevelop.slice(0, 300)}...` : '',
        prodAIPlan.immediateSteps ? `Action Steps: ${prodAIPlan.immediateSteps.join(', ')}` : ''
      ].filter(Boolean).join('\n') : undefined;

      const productData = (profile?.prodName || profile?.prodDesc) ? {
        productName: profile?.prodName || '',
        productDescription: profile?.prodDesc || '',
        targetAudience: profile?.prodTarget || '',
        pricingModel: profile?.prodPricing || '',
        blueprintSummary: productBlueprintSummary
      } : undefined;

      // 2. Digital Marketing Data
      const marketingData = profile?.dmActivePlan ? {
        productName: profile.dmActivePlan.productName,
        brandTone: profile.dmActivePlan.brandTone,
        contentGoal: profile.dmActivePlan.contentGoal,
        platforms: profile.dmActivePlan.platforms || [],
        calendarSummary: (profile.dmActivePlan.calendar?.weeklyCalendar || [])
          .map((c: any) => `${c.day}: ${c.platform} ${c.contentType} - ${c.topic}`)
          .join('\n')
      } : undefined;

      // 3. Sales Tracker & Activity Data
      const workshops = profile?.workshops || [];
      const productSales = profile?.ezProductSales || [];
      const ezLeads = profile?.ezLeads || [];
      const bdLeads = profile?.bdLeads || [];
      const networkingEvents = profile?.networkingEvents || [];
      const dailyActivities = profile?.ezDailyActivities || [];

      const recentActivitiesSummary = dailyActivities.length > 0 ? dailyActivities
        .slice(-10)
        .map((a: any) => `${a.date || ''}: ${a.activityType || 'Activity'} - ${a.description || ''}`)
        .join('\n') : undefined;

      const sectorFeedback = {
        financeWeekly: profile?.financeWeeklyFeedback || '',
        financeDaily: profile?.financeDailyFeedback || '',
        opsWeekly: profile?.opsWeeklyFeedback || '',
        opsDaily: profile?.opsDailyFeedback || '',
        salesWeekly: profile?.salesWeeklyFeedback || '',
        salesDaily: profile?.salesDailyFeedback || '',
      };

      const salesTrackerData = (workshops.length || ezLeads.length || bdLeads.length || productSales.length || networkingEvents.length || dailyActivities.length) ? {
        workshopsCount: workshops.length,
        leadsCount: ezLeads.length,
        bdLeadsCount: bdLeads.length,
        productSalesCount: productSales.length,
        networkingEventsCount: networkingEvents.length,
        recentActivitiesSummary
      } : undefined;

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
        productData,
        marketingData,
        salesTrackerData,
        missingInfo: refinedMissingInfo,
        weeklyProgress: progressText || undefined,
        planModificationRequest: modSuggestion || undefined,
        previousRoadmap: (progressText || modSuggestion) ? JSON.stringify(profile?.strategicPlan || null) : undefined,
        currentDate: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        completedWeeklyActions: profile?.completedWeeklyActions || [],
        completedDailyTasks: completedTasksList,
        pendingDailyTasks: pendingTasksList,
        sectorFeedback,
        attachedDocText: attachedDocText || undefined,
        attachedDocName: attachedDocName || undefined,
      };

      const result = await goalAdvisorAssistant(input);

      // Construct profile update payload
      const profileUpdates: any = {
        yearlyGoal,
        companyStage: stage,
        missingInfoContext: refinedMissingInfo,
        strategicPlan: result,
        attachedDocName: attachedDocName || null,
        attachedDocText: attachedDocText || null,
      };

      // If doing a fresh plan generation/regeneration (not weekly adaptation or chat modification), reset progress tracking
      if (!progressText && !modSuggestion) {
        profileUpdates.completedMonthlyMilestones = [];
        profileUpdates.currentMonthIndex = 0;
        profileUpdates.currentWeekIndex = 0;
        profileUpdates.completedWeeklyActions = [];
      }

      // Save strategic plan directly inside the profile document
      await setDocumentNonBlocking(profileRef, profileUpdates, { merge: true });

      // Save in history subcollection
      if (firestore && userId && companyProfileId) {
        const historyCollRef = collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'planHistory');
        await addDocumentNonBlocking(historyCollRef, {
          yearlyGoal,
          companyStage: stage,
          strategicPlan: result,
          createdAt: serverTimestamp(),
        });
      }

      setIsEditingGoal(false);
      setMissingInfoAnswers({});
      if (progressText) {
        setWeeklyProgress('');
      }
      if (modSuggestion) {
        setLatestModSuggestion('');
        setChatMessages([]);
        if (roadmapChatRef) {
          await deleteDoc(roadmapChatRef).catch(() => {});
        }
        setActivePlannerTab('roadmap');
      }
    } catch (err) {
      console.error('Error generating AI execution plan:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent, explicitMsg?: string) => {
    if (e) e.preventDefault();
    const msg = explicitMsg || chatMessage;
    if (!msg.trim() || chatLoading || !profileRef || !roadmapChatRef) return;

    setChatMessage('');
    const userMsg = { role: 'user', content: msg };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const input = {
        message: msg,
        chatHistory: chatMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        activePlan: JSON.stringify(profile?.strategicPlan || null),
        yearlyGoal,
        companyName,
      };

      const result = await roadmapChatAssistant(input);
      const assistantMsg = { role: 'assistant', content: result.response };
      const finalMessages = [...updatedMessages, assistantMsg];
      
      setChatMessages(finalMessages);
      setLatestModSuggestion(result.planModificationSuggestion);

      await setDoc(roadmapChatRef, {
        messages: finalMessages,
        latestModSuggestion: result.planModificationSuggestion
      }, { merge: true });

    } catch (err) {
      console.error("Error in roadmap chat assistant:", err);
      const errorMsg = { role: 'assistant', content: "Sorry, I had trouble processing that query. Please try again." };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
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

  const strategicPlan = selectedHistoricalPlan ? selectedHistoricalPlan.strategicPlan : profile?.strategicPlan;
  const currentMonthIndex = profile?.currentMonthIndex || 0;
  const completedMonthlyMilestones = profile?.completedMonthlyMilestones || [];

  const handleToggleMonthlyMilestone = async (milestoneMonth: string, idx: number) => {
    if (!profileRef) return;
    let updated: string[];
    let newMonthIndex = currentMonthIndex;
    
    if (completedMonthlyMilestones.includes(milestoneMonth)) {
      updated = completedMonthlyMilestones.filter((m: string) => m !== milestoneMonth);
      newMonthIndex = idx;
    } else {
      updated = [...completedMonthlyMilestones, milestoneMonth];
      newMonthIndex = Math.min((strategicPlan?.monthlyMilestones?.length || 3) - 1, idx + 1);
    }
    
    await setDocumentNonBlocking(profileRef, { 
      completedMonthlyMilestones: updated,
      currentMonthIndex: newMonthIndex,
      currentWeekIndex: 0 // Reset week to Week 1 when month changes
    }, { merge: true });
  };

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
        {!readOnly && (
          <div className="flex items-center gap-2">
            {hasPlan && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => handleGeneratePlan(e)}
                disabled={aiLoading}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold gap-1.5 h-10 px-4 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-600 ${aiLoading ? 'animate-spin' : ''}`} />
                Regenerate Plan
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsGoalsModalOpen(true)}
              className="border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all rounded-lg font-bold gap-1.5 h-10 px-4 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              {hasPlan ? 'Edit Goals & Strategy' : 'Setup Goals & Strategy'}
            </Button>
          </div>
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

      {/* Visitor no-plan notice */}
      {!aiLoading && !hasPlan && readOnly && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Target className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-black text-slate-700">No Strategic Plan Yet</h3>
          <p className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed">
            The founder hasn't set up a strategic plan yet. Once they define a goal and generate the roadmap, you'll be able to view it here.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
            👁 View-Only Access
          </div>
        </div>
      )}

      {/* SETUP CTA CARD & Live Feed - triggers Popup Modal */}
      {!aiLoading && !hasPlan && !readOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Setup CTA Card */}
          <Card className="lg:col-span-2 border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center shadow-sm flex flex-col justify-center items-center">
            <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-indigo-50 rounded-full border border-indigo-100">
                <Target className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Define Your Startup Strategy & Goals</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Configure your 12-month targets, stage, and attached documents in the pop-up modal to generate an automated AI roadmap.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsGoalsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 gap-2 mt-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                Setup Goals & Strategy
              </Button>
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
          {selectedHistoricalPlan ? (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">VIEWING HISTORICAL STRATEGIC PLAN</span>
                <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">{selectedHistoricalPlan.yearlyGoal}</h2>
                <div className="flex gap-2 items-center pt-1">
                  <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/30 uppercase text-[9px] font-bold">
                    Stage: {selectedHistoricalPlan.companyStage}
                  </Badge>
                  <span className="text-slate-500 text-xs">|</span>
                  <span className="text-xs text-slate-300 font-medium">
                    Generated on {selectedHistoricalPlan.createdAt ? new Date(selectedHistoricalPlan.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button 
                  onClick={async () => {
                    if (profileRef) {
                      setAiLoading(true);
                      try {
                        await setDocumentNonBlocking(profileRef, {
                          yearlyGoal: selectedHistoricalPlan.yearlyGoal,
                          companyStage: selectedHistoricalPlan.companyStage,
                          strategicPlan: selectedHistoricalPlan.strategicPlan,
                        }, { merge: true });
                        setSelectedHistoricalPlan(null);
                      } catch (err) {
                        console.error("Error restoring plan:", err);
                      } finally {
                        setAiLoading(false);
                      }
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 font-semibold"
                >
                  Restore as Active Plan
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedHistoricalPlan(null)}
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs rounded-xl h-9"
                >
                  Back to Active Plan
                </Button>
              </div>
            </div>
          ) : (
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
              {!readOnly && (
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
              )}
              {readOnly && (
                <div className="flex gap-3 shrink-0">
                  <Badge className="bg-slate-500/20 text-slate-200 border-slate-400/30 uppercase text-[9px] font-bold px-3 py-1.5">
                    👁 View Only
                  </Badge>
                </div>
              )}
            </div>
          )}

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
                    ...(!selectedHistoricalPlan && !readOnly ? [{ id: 'chat', label: 'Discuss & Modify Plan', icon: MessageSquare }] : []),
                    { id: 'history', label: 'Plan History', icon: History }
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
                  {strategicPlan.monthlyMilestones?.map((milestone: any, idx: number) => {
                    const isCompleted = completedMonthlyMilestones.includes(milestone.month);
                    const isActive = idx === currentMonthIndex;
                    return (
                      <Card key={idx} className={`border-2 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all ${
                        isCompleted ? 'border-emerald-200 bg-emerald-50/5' : 
                        isActive ? 'border-indigo-300 bg-indigo-50/5' : 'border-slate-200'
                      }`}>
                        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between gap-2">
                          <div className="space-y-1">
                            <Badge className={`${
                              isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              isActive ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                              'bg-slate-100 text-slate-800 border-slate-200'
                            } text-[10px] uppercase font-bold w-fit`}>
                              {milestone.month}
                            </Badge>
                            {isCompleted && (
                              <Badge className="bg-emerald-600 text-white ml-2 text-[9px] uppercase font-black px-2 py-0.5">
                                Achieved
                              </Badge>
                            )}
                            {isActive && !isCompleted && (
                              <Badge className="bg-indigo-600 text-white ml-2 text-[9px] uppercase font-black px-2 py-0.5 animate-pulse">
                                Current
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1 space-y-4 flex flex-col justify-between">
                          <div className="space-y-4">
                            <div>
                              <CardTitle className="text-sm font-bold text-slate-800 leading-snug">{milestone.milestone}</CardTitle>
                            </div>
                            
                            <div>
                              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-2">KEY METRICS TO MONITOR</span>
                              <ul className="space-y-1.5">
                                {milestone.keyMetrics?.map((metric: string, mIdx: number) => (
                                  <li key={mIdx} className="text-xs text-slate-650 font-semibold flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                                    <span>{metric}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {!readOnly && (
                            <div className="pt-2 mt-auto">
                              <Button
                                size="sm"
                                variant={isCompleted ? "outline" : "default"}
                                onClick={() => handleToggleMonthlyMilestone(milestone.month, idx)}
                                className={`w-full text-xs font-bold ${
                                  isCompleted ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                              >
                                {isCompleted ? 'Mark as Incomplete' : 'Mark Milestone Achieved'}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* 3. Discuss & Modify Plan Chatbot Tab */}
              {activePlannerTab === 'chat' && (
                <Card className="border-2 border-indigo-100 shadow-lg min-h-[500px] flex flex-col">
                  <CardHeader className="border-b bg-indigo-50/10 py-3.5 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        Roadmap Co-Pilot Chat
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Discuss changes, constraints, or custom strategies with your growth advisor.
                      </CardDescription>
                    </div>
                    {chatMessages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setChatMessages([]);
                          setLatestModSuggestion('');
                          if (roadmapChatRef) {
                            await deleteDoc(roadmapChatRef).catch(() => {});
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 text-[10px] font-bold"
                      >
                        Reset Chat
                      </Button>
                    )}
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col p-0">
                    {/* Chat Messages List */}
                    <div className="flex-1 p-4 space-y-4 max-h-[350px] overflow-y-auto bg-slate-50/30">
                      {chatMessages.length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto animate-bounce">
                            <Sparkles className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-800">What would you like to discuss?</h4>
                            <p className="text-[11px] text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
                              Ask the AI to change dates, focus areas, adjust targets, or add custom priorities.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-center pt-2">
                            <button
                              type="button"
                              onClick={() => handleSendChatMessage(undefined, "I want to prioritize product development over sales outreach in Q2.")}
                              className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-indigo-50/20 hover:border-indigo-200 rounded-full text-[10px] font-semibold text-slate-600 transition-all shadow-sm"
                            >
                              "Prioritize dev over sales in Q2"
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendChatMessage(undefined, "We are short on runway, adjust the monthly milestones to be more conservative.")}
                              className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-indigo-50/20 hover:border-indigo-200 rounded-full text-[10px] font-semibold text-slate-600 transition-all shadow-sm"
                            >
                              "Short on runway, make milestones conservative"
                            </button>
                          </div>
                        </div>
                      ) : (
                        chatMessages.map((msg, index) => (
                          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-xl text-xs leading-relaxed max-w-[85%] ${
                              msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                                : 'bg-white border rounded-tl-none text-slate-700 shadow-sm'
                            }`}>
                              {msg.role === 'assistant' ? (
                                <div className="prose prose-slate prose-xs max-w-none">
                                  {renderMarkdown(msg.content)}
                                </div>
                              ) : (
                                msg.content
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {chatLoading && (
                        <div className="flex gap-2 justify-start items-center">
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                          <span className="text-[10px] font-bold text-slate-400">Co-pilot is thinking...</span>
                        </div>
                      )}
                    </div>

                    {/* Modification Suggestion Alert & Modify Button */}
                    {latestModSuggestion && (
                      <div className="p-3.5 bg-amber-50 border-t border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black tracking-widest text-amber-850 uppercase block">RECOMMENDED REVISION SUGGESTION</span>
                          <p className="text-xs font-bold text-slate-700 leading-normal">{latestModSuggestion}</p>
                        </div>
                        <Button
                          onClick={() => handleGeneratePlan(undefined, undefined, latestModSuggestion)}
                          disabled={aiLoading}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 gap-1.5 shrink-0 px-4"
                        >
                          {aiLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Modify Plan
                        </Button>
                      </div>
                    )}

                    {/* Chat Input Field */}
                    <div className="p-3 bg-slate-50 border-t flex gap-2">
                      <Input
                        placeholder="Discuss plan adjustments (e.g. shift priorities, change timeline)..."
                        value={chatMessage}
                        onChange={e => setChatMessage(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        disabled={chatLoading}
                        className="bg-white border-slate-200 text-xs h-9"
                      />
                      <Button
                        size="icon"
                        disabled={chatLoading || !chatMessage.trim()}
                        onClick={() => handleSendChatMessage()}
                        className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 4. Plan History Tab */}
              {activePlannerTab === 'history' && (
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-black text-slate-900">Plan Generation History</CardTitle>
                    <CardDescription>Browse previously generated strategic plans and assessments.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-4">
                    {!planHistory || planHistory.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground font-semibold text-xs">
                        No plan history found. Any new plans you generate will appear here.
                      </div>
                    ) : (
                      <div className="divide-y border rounded-xl overflow-hidden bg-white">
                      {planHistory.map((histPlan: any) => {
                          const date = histPlan.createdAt ? new Date(histPlan.createdAt.seconds * 1000) : new Date();
                          const formattedDate = date.toLocaleString();
                          const isCurrentlySelected = selectedHistoricalPlan?.id === histPlan.id;
                          return (
                            <div key={histPlan.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-all">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-slate-500">{formattedDate}</span>
                                  <Badge className="bg-slate-100 text-slate-700 uppercase text-[9px] font-bold">
                                    Stage: {histPlan.companyStage}
                                  </Badge>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">{histPlan.yearlyGoal}</h4>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={isCurrentlySelected ? "secondary" : "outline"}
                                  onClick={() => {
                                    setSelectedHistoricalPlan(histPlan);
                                    setActivePlannerTab('roadmap');
                                  }}
                                  className="text-xs font-bold"
                                >
                                  {isCurrentlySelected ? "Viewing..." : "View Plan"}
                                </Button>
                                {!readOnly && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        if (profileRef) {
                                          setAiLoading(true);
                                          try {
                                            await setDocumentNonBlocking(profileRef, {
                                              yearlyGoal: histPlan.yearlyGoal,
                                              companyStage: histPlan.companyStage,
                                              strategicPlan: histPlan.strategicPlan,
                                            }, { merge: true });
                                            setSelectedHistoricalPlan(null);
                                          } catch (err) {
                                            console.error("Error restoring plan:", err);
                                          } finally {
                                            setAiLoading(false);
                                          }
                                        }
                                      }}
                                      className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                                    >
                                      Restore
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={async () => {
                                        if (profileRef && planHistoryRef && window.confirm("Delete this plan from history?")) {
                                          try {
                                            await deleteDocumentNonBlocking(doc(planHistoryRef, histPlan.id));
                                            if (selectedHistoricalPlan?.id === histPlan.id) {
                                              setSelectedHistoricalPlan(null);
                                            }
                                          } catch (err) {
                                            console.error("Error deleting plan:", err);
                                          }
                                        }
                                      }}
                                      className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-9 w-9 p-0 rounded-lg"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Weekly Founder Update Report Generator */}
              {!readOnly && (
                <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/10 via-white to-slate-50 shadow-sm mt-8 relative overflow-hidden transition-all hover:shadow-md">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
                  
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-indigo-600" />
                      Investor Weekly Report Generator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Analyze all logs from the last 7 days (CRM, workshops, sales, operations, tasks, feedback) and compile an executive progress report for mentors & investors.
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {weeklyReportLoading ? (
                      <div className="py-12 text-center space-y-4 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm border rounded-xl animate-in fade-in duration-300">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800">Compiling and Analyzing Week's Activities</h4>
                          <p className="text-[10px] text-muted-foreground font-semibold max-w-xs mx-auto leading-relaxed">
                            Evaluating customer discovery, sales metrics, product milestones, and feedback logs...
                          </p>
                        </div>
                      </div>
                    ) : weeklyReport ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100">
                          <span className="text-[10px] font-black text-indigo-950 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            {showHistory ? "Viewing Saved Report History" : "Report Editor (Save your edits below)"}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowHistory(!showHistory)}
                              className="h-8 text-xs font-bold text-indigo-700 hover:bg-indigo-50/50 animate-in fade-in"
                            >
                              {showHistory ? "Back to Editor" : `History (${(weeklyReportsHistory || []).length})`}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCopyReport}
                              className="h-8 text-xs font-bold gap-1.5 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all duration-200"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {showHistory ? (
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 animate-in fade-in duration-200">
                            {(!weeklyReportsHistory || weeklyReportsHistory.length === 0) ? (
                              <div className="p-8 text-center text-muted-foreground font-semibold text-xs bg-white rounded-xl border border-dashed border-slate-200">
                                No saved weekly report history found.
                              </div>
                            ) : (
                              weeklyReportsHistory.map((histReport: any) => {
                                const date = histReport.createdAt ? new Date(histReport.createdAt.seconds * 1000) : new Date();
                                const formattedDate = date.toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                });
                                return (
                                  <div key={histReport.id} className="p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 transition-all space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-bold text-slate-500 font-mono">{formattedDate}</span>
                                      <div className="flex gap-1.5">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setWeeklyReport(histReport.report);
                                            setShowHistory(false);
                                          }}
                                          className="h-6 text-[9px] font-bold px-2 py-0"
                                        >
                                          Restore
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={async () => {
                                            if (window.confirm("Delete this saved report from history?")) {
                                              try {
                                                await deleteDocumentNonBlocking(doc(weeklyReportsRef!, histReport.id));
                                              } catch (err) {
                                                console.error("Error deleting report:", err);
                                              }
                                            }
                                          }}
                                          className="h-6 text-[9px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0"
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="bg-slate-50 text-slate-700 p-3 rounded-lg font-mono text-[10px] whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto border border-slate-100 select-all">
                                      {histReport.report}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ) : (
                          <>
                            <textarea
                              className="w-full bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed min-h-[300px] max-h-[400px] focus:outline-none focus:ring-2 focus:ring-indigo-500 select-text"
                              value={weeklyReport}
                              onChange={(e) => setWeeklyReport(e.target.value)}
                              placeholder="Type or edit your weekly update here..."
                            />
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button
                                onClick={handleSaveWeeklyReport}
                                disabled={isSavingReport}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs gap-1.5 transition-all px-6 shrink-0"
                              >
                                {reportSavedSuccess ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-white animate-in zoom-in-50 duration-150" />
                                    Saved to History!
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    Save Report
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                onClick={handleGenerateWeeklyReport}
                                variant="outline"
                                className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold h-10 text-xs gap-1.5 transition-all"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Regenerate Update
                              </Button>
                              
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to clear the generated report?")) {
                                    setWeeklyReport('');
                                    if (profileRef) {
                                      setDocumentNonBlocking(profileRef, {
                                        weeklyProgressReport: null,
                                        weeklyProgressReportGeneratedAt: null,
                                        weeklyProgressReportSavedAt: null
                                      }, { merge: true });
                                    }
                                  }
                                }}
                                className="text-slate-500 hover:bg-rose-50 hover:text-rose-600 font-bold h-10 text-xs transition-all px-4"
                              >
                                Clear
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50 space-y-4 hover:border-indigo-200 hover:bg-indigo-50/5 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-800">No Weekly Update Compiled Yet</h4>
                          <p className="text-[10px] text-muted-foreground font-semibold max-w-xs mx-auto leading-relaxed">
                            Click below to analyze the last 7 days of raw workspace data and generate a mentor-ready progress report.
                          </p>
                        </div>
                        <Button
                          onClick={handleGenerateWeeklyReport}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-lg gap-1.5 shadow-sm hover:shadow-md transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Weekly Update
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Weekly Progress Logger / Adaptation Section - hidden for visitors */}
              {!readOnly && (
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
              )}

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
            </div>

          </div>

        </div>
      )}

      {/* AI Strategic Planner Setup & Goals Popup Modal */}
      <Dialog 
        open={isGoalsModalOpen || isEditingGoal} 
        onOpenChange={(open) => { 
          setIsGoalsModalOpen(open); 
          setIsEditingGoal(open); 
        }}
      >
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 border border-slate-200 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-600" />
              Define Startup Strategy & Goals
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              Provide your yearly roadmap objectives, stage, and attached documents. Save to DB or run AI analysis to generate a 12-month roadmap.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              handleGeneratePlan(e);
              setIsGoalsModalOpen(false);
              setIsEditingGoal(false);
            }} 
            className="space-y-5 pt-4"
          >
            {/* Stage selection */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Startup Stage</Label>
              <Select value={stage} onValueChange={setStage} disabled={readOnly}>
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
                disabled={readOnly}
              />
              
              {/* Presets */}
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
                        disabled={readOnly}
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

            {/* Strategy Document Section */}
            <div className="space-y-2 pt-2">
              <Label className="font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                Attach Strategy Document / Pitch Deck (PDF, TXT, MD, CSV, JSON)
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
              </Label>
              
              {attachedDocName ? (
                <div className="flex items-center justify-between p-3.5 rounded-lg border-2 border-indigo-50 bg-indigo-50/10 hover:bg-indigo-50/20 transition-all">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-600 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">{attachedDocName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {attachedDocText ? `${(attachedDocText.length / 1024).toFixed(1)} KB text extracted` : 'Extracting text...'}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50/50"
                      onClick={async () => {
                        setAttachedDocName('');
                        setAttachedDocText('');
                        if (profileRef) {
                          await setDocumentNonBlocking(profileRef, {
                            attachedDocName: null,
                            attachedDocText: null
                          }, { merge: true });
                        }
                      }}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all rounded-lg p-5 bg-slate-50/30 text-center cursor-pointer">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".txt,.md,.json,.csv,.pdf"
                    disabled={readOnly}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingDoc(true);
                      try {
                        setAttachedDocName(file.name);
                        let text = '';
                        if (file.name.endsWith('.pdf')) {
                          text = await extractTextFromPdf(file);
                        } else {
                          text = await extractTextFromFile(file);
                        }
                        setAttachedDocText(text);
                      } catch (err) {
                        console.error('Error reading file:', err);
                      } finally {
                        setUploadingDoc(false);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {uploadingDoc ? (
                      <>
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-xs font-bold text-indigo-600">Extracting content...</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700">Attach strategy file or business plan</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">Click or drag here to upload (PDF, TXT, MD, CSV, JSON)</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
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
                disabled={readOnly}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="button"
                onClick={handleSaveGoals}
                disabled={readOnly || !yearlyGoal || isSavingGoals}
                variant="outline"
                className="flex-1 border-slate-300 font-bold h-11 gap-2 text-slate-700 hover:bg-slate-50"
              >
                {isSavingGoals ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : goalsSavedSuccess ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Save className="w-4 h-4 text-indigo-600" />
                )}
                {goalsSavedSuccess ? 'Saved!' : 'Save'}
              </Button>

              <Button
                type="submit"
                disabled={readOnly || !yearlyGoal}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-sm gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate 12-Month Plan & Roadmap
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
