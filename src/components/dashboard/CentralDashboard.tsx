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
  FileText, UploadCloud, Trash, Paperclip, MessageSquare, History, Copy, Check, Mail, Save,
  Search, Clock, ArrowRight, ChevronLeft, Download, ShoppingCart, Box, Lightbulb, Cpu, Zap, Briefcase, GraduationCap, Settings, CheckSquare, Flag,
  Star
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
  const [activePlannerTab, setActivePlannerTab] = useState<'roadmap' | 'history'>('roadmap');
  const [selectedHistoricalPlan, setSelectedHistoricalPlan] = useState<any | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [openQuarters, setOpenQuarters] = useState<Record<number, boolean>>({0: true});
  const [attachedDocName, setAttachedDocName] = useState('');
  const [attachedDocText, setAttachedDocText] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [latestModSuggestion, setLatestModSuggestion] = useState('');

  // UI/UX state for Central Console redesign - default to Month 1 (index 0) so Roadmap is immediately active & highlighted
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(0);
  const [selectedQuarterIdx, setSelectedQuarterIdx] = useState<number | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isHistoryListModalOpen, setIsHistoryListModalOpen] = useState(false);
  const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);
  const [activeQuarterTab, setActiveQuarterTab] = useState<number>(0);
  
  // Draggable Roadmap Co-Pilot Bot state
  const [botPos, setBotPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = React.useRef(false);
  const dragStartRef = React.useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const hasMovedRef = React.useRef(false);

  // Initialize position on mount: positioned at bottom right
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultX = Math.max(20, window.innerWidth - 80);
      const defaultY = Math.max(80, window.innerHeight - 85);
      setBotPos({ x: defaultX, y: defaultY });
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: botPos ? botPos.x : (typeof window !== 'undefined' ? window.innerWidth - 80 : 0),
      posY: botPos ? botPos.y : (typeof window !== 'undefined' ? window.innerHeight - 85 : 0),
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }
    const newX = Math.min(Math.max(10, dragStartRef.current.posX + deltaX), (typeof window !== 'undefined' ? window.innerWidth - 70 : 1000));
    const newY = Math.min(Math.max(10, dragStartRef.current.posY + deltaY), (typeof window !== 'undefined' ? window.innerHeight - 70 : 1000));
    setBotPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (!hasMovedRef.current) {
      setIsChatOpen(true);
    }
  };
  
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

  // 4. Product Suite Pillar Metrics
  const productKPIs = useMemo(() => {
    let prods: any[] = [];
    if (profile?.products && Array.isArray(profile.products) && profile.products.length > 0) {
      prods = profile.products;
    } else if (profile?.prodName || profile?.prodDesc) {
      prods = [{
        id: 'prod_default',
        name: profile.prodName || 'Core Product',
        description: profile.prodDesc || '',
        targetAudience: profile.prodTarget || '',
        pricingModel: profile.prodPricing || 'saas_subscription',
        stage: 'mvp',
        status: 'on_track',
        priority: 'high',
        mrr: Number(profile.mRevenue) || 0,
        usersCount: 0,
        aiPlan: profile.prodAIPlan || null,
        aiPlanHistory: profile.prodAIPlanHistory || []
      }];
    }

    const totalCount = prods.length;
    const suiteMrr = prods.reduce((acc: number, p: any) => acc + (Number(p.mrr) || 0), 0);
    const totalUsers = prods.reduce((acc: number, p: any) => acc + (Number(p.usersCount) || 0), 0);
    const liveCount = prods.filter((p: any) => p.stage === 'launched' || p.stage === 'scaling').length;
    const devCount = prods.filter((p: any) => p.stage === 'mvp' || p.stage === 'beta').length;

    return {
      products: prods,
      totalCount,
      suiteMrr,
      totalUsers,
      liveCount,
      devCount,
      suiteRecommendations: profile?.productSuiteRecommendations || null
    };
  }, [profile]);

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

      // 1. Product Suite Portfolio Data
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

      const suiteRec = profile?.productSuiteRecommendations;
      const suiteRecommendationsSummary = suiteRec ? [
        suiteRec.executiveSummary ? `Executive Diagnosis: ${suiteRec.executiveSummary.slice(0, 300)}...` : '',
        suiteRec.resourceAllocation ? `Resource Split: ${suiteRec.resourceAllocation.slice(0, 300)}...` : '',
        suiteRec.synergiesAndBundling ? `Synergies & Bundling: ${suiteRec.synergiesAndBundling.slice(0, 300)}...` : '',
        suiteRec.immediateSuiteActions ? `Immediate Priorities: ${suiteRec.immediateSuiteActions.join('; ')}` : ''
      ].filter(Boolean).join('\n') : undefined;

      const productSuiteData = productKPIs.products.length > 0 ? {
        totalProducts: productKPIs.totalCount,
        combinedSuiteMrr: productKPIs.suiteMrr || salesKPIs.mrr,
        products: productKPIs.products.map(p => {
          const bp = p.aiPlan;
          const bpSummary = bp ? [
            bp.review ? `Eval: ${bp.review.slice(0, 180)}...` : '',
            bp.howToSell ? `GTM: ${bp.howToSell.slice(0, 180)}...` : '',
            bp.whatToDevelop ? `Dev: ${bp.whatToDevelop.slice(0, 180)}...` : '',
            bp.immediateSteps ? `Actions: ${bp.immediateSteps.slice(0, 2).join(', ')}` : ''
          ].filter(Boolean).join(' | ') : undefined;

          return {
            name: p.name,
            description: p.description || '',
            targetAudience: p.targetAudience || '',
            pricingModel: p.pricingModel || '',
            stage: p.stage || 'mvp',
            status: p.status || 'on_track',
            priority: p.priority || 'medium',
            mrr: Number(p.mrr) || 0,
            usersCount: Number(p.usersCount) || 0,
            techStack: p.techStack || '',
            blueprintSummary: bpSummary
          };
        }),
        suiteRecommendationsSummary
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

      // 4. Finance & Operations Breakdown
      const capTableList = (profile?.capTable || []).map((c: any) => `${c.name || 'Stakeholder'} (${c.type || 'Common'}): ${c.ownershipPct || 0}%`).join(', ');

      const topSaaSList = subscriptions.length > 0 
        ? subscriptions.slice(0, 8).map((s: any) => `${s.name || 'Tool'} (₹${s.cost || 0}/${s.billing || 'mo'})`).join(', ')
        : undefined;

      const teamRolesList = team.length > 0
        ? team.filter((m: any) => m.status === 'active').slice(0, 8).map((m: any) => `${m.name || 'Member'} - ${m.role || 'Role'} (₹${m.salary || 0}/mo)`).join(', ')
        : undefined;

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
          founderOwnership,
          paperNetWorth,
          capTableSummary: capTableList || undefined,
        },
        opsData: {
          teamSize: opsKPIs.teamSize,
          saasCost: opsKPIs.monthlySaaS,
          salaries: opsKPIs.monthlySalaries,
          otherBurn: Number(profile?.otherBurn) || 0,
          topSaaSList,
          teamRolesList,
        },
        productData,
        productSuiteData,
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

      // If doing a fresh plan generation/regeneration (not weekly adaptation or chat modification), reset progress tracking & old reports
      if (!progressText && !modSuggestion) {
        profileUpdates.completedMonthlyMilestones = [];
        profileUpdates.currentMonthIndex = 0;
        profileUpdates.currentWeekIndex = 0;
        profileUpdates.completedWeeklyActions = [];
        profileUpdates.weeklyProgressReport = null;
        profileUpdates.weeklyProgressReportGeneratedAt = null;
        setWeeklyReport('');
      }

      // Save strategic plan directly inside the profile document
      await setDocumentNonBlocking(profileRef, profileUpdates, { merge: true });

      // Sync new daily tasks to tasks subcollection & clear stale AI tasks
      if (tasksRef && Array.isArray(result.dailyTasks)) {
        try {
          const { getDocs, deleteDoc } = await import('firebase/firestore');
          
          if (!progressText && !modSuggestion) {
            const oldTasksSnap = await getDocs(tasksRef);
            const deletePromises: Promise<void>[] = [];
            oldTasksSnap.forEach((taskDoc) => {
              const d = taskDoc.data();
              if (d.isAiGenerated || !d.assignedToUid || d.assignedToUid === userId) {
                deletePromises.push(deleteDoc(taskDoc.ref));
              }
            });
            await Promise.all(deletePromises);
          }

          for (const task of result.dailyTasks) {
            await addDocumentNonBlocking(tasksRef, {
              title: task.title,
              description: task.description || '',
              category: task.category || 'General',
              priority: task.priority || 'medium',
              status: 'todo',
              assignedToUid: userId || '',
              assignedToName: 'Founder',
              assignedToEmail: user?.email || '',
              isAiGenerated: true,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error("Error syncing regenerated daily tasks to tasks subcollection:", err);
        }
      }

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

  const handleExportPlan = () => {
    const plan = selectedHistoricalPlan ? selectedHistoricalPlan.strategicPlan : profile?.strategicPlan;
    const goalTitle = yearlyGoal || profile?.strategicGoal || "Strategic Plan";
    let content = `# AI Strategic Planner - ${goalTitle}\n\n`;
    content += `**Stage:** ${(stage || profile?.companyStage || 'MVP').toUpperCase()}\n`;
    content += `**Company:** ${companyName || 'FounderOS'}\n`;
    content += `**Date:** ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    
    if (plan?.analysis) {
      content += `## Strategic Assessment & Analysis\n${plan.analysis}\n\n`;
    }
    
    if (plan?.yearlyRoadmap && Array.isArray(plan.yearlyRoadmap)) {
      content += `## 12-Month Quarterly Roadmap\n\n`;
      plan.yearlyRoadmap.forEach((q: any) => {
        content += `### ${q.period || 'Quarter'}: ${q.focus || ''}\n`;
        if (q.objectives && Array.isArray(q.objectives)) {
          q.objectives.forEach((obj: string) => {
            content += `- ${obj}\n`;
          });
        }
        content += `\n`;
      });
    }
    
    if (plan?.monthlyMilestones && Array.isArray(plan.monthlyMilestones)) {
      content += `## Monthly Milestones\n\n`;
      plan.monthlyMilestones.forEach((m: any) => {
        content += `### ${m.month || 'Month'}: ${m.milestone || m.objective || ''}\n`;
        if (m.keyMetrics && Array.isArray(m.keyMetrics)) {
          content += `*Key Metrics:*\n`;
          m.keyMetrics.forEach((km: string) => {
            content += `- ${km}\n`;
          });
        }
        if (m.keyDeliverables && Array.isArray(m.keyDeliverables)) {
          content += `*Deliverables:*\n`;
          m.keyDeliverables.forEach((kd: string) => {
            content += `- ${kd}\n`;
          });
        }
        content += `\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Strategic_Plan_${(companyName || 'FounderOS').replace(/\\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Deriving 4 Quarters data with fallback
  const defaultQuarters = [
    { period: "Q1 Months 1–3", focus: "EZCirkit Commercial Launch & Cash Generation", objectives: ["Standardize BOM cost <= ₹750", "Launch pre-order storefront", "Secure 10 paid pre-orders"] },
    { period: "Q2 Months 4–6", focus: "Institutional Pilot Outreach & Detach Prototype Freeze", objectives: ["Deliver curriculum packs to 5 institutions", "Freeze Detach hardware prototype specs", "Build initial B2B pipeline"] },
    { period: "Q3 Months 7–9", focus: "B2B Pilots Execution & Investor Data Room Prep", objectives: ["Run 10 institutional pilots", "Prepare investor data room and audited financials", "Achieve 80% customer retention"] },
    { period: "Q4 Months 10–12", focus: "Fundraising & Operations Expansion", objectives: ["Close ₹3,000,000 seed round", "Scale assembly and supply chain logistics", "Expand B2B sales footprint"] }
  ];

  const quartersList = [0, 1, 2, 3].map(qIdx => {
    const rawQ = strategicPlan?.yearlyRoadmap?.[qIdx];
    const def = defaultQuarters[qIdx];
    const mStart = qIdx * 3 + 1;
    const mEnd = (qIdx + 1) * 3;
    const completedCount = completedMonthlyMilestones.filter((m: string) => {
      const num = parseInt(m.replace(/\D/g, '')) || 0;
      return num >= mStart && num <= mEnd;
    }).length;
    return {
      period: rawQ?.period || def.period,
      focus: rawQ?.focus || def.focus,
      objectives: rawQ?.objectives || def.objectives,
      progress: Math.min(100, Math.round((completedCount / 3) * 100))
    };
  });

  const defaultMilestones = [
    {
      month: "Month 1",
      milestone: "EZCirkit Product Standardization & Pre-Order Storefront Launch",
      metrics: ["BOM cost: ≤ ₹750", "Curriculum downloads: 150+", "Paid pre-orders: 10 units", "Acquisition cost: ≤ ₹1,200"],
      deliverables: [
        "Freeze EZCirkit hardware schematics & component bill of materials (BOM)",
        "Finalize 10-lesson modular robotics & electronics curriculum PDF and teacher guide",
        "Set up pre-order landing page with payment gateway integration",
        "Initiate supplier negotiations for volume discounts on microcontrollers & sensors"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "BOM Cost Auditing & Vendor Benchmarking", financeActions: ["Audit current component costs vs ₹750 target", "Establish supplier payment schedule"], salesActions: ["Draft pre-order landing page copy & curriculum highlights", "Design promotional demo video"], opsActions: ["Audit component inventory in lab", "Test supplier sample batches"] },
        { week: "Week 2", theme: "Curriculum Packaging & Educator Feedback", financeActions: ["Model profit margins across 50, 100, and 500 kit tiers"], salesActions: ["Send draft curriculum to 10 educators for beta feedback", "Launch email waitlist signup"], opsActions: ["Standardize packaging box dimensions & insert foam"] },
        { week: "Week 3", theme: "Storefront QA & Payment Gateway Integration", financeActions: ["Verify payment gateway merchant payout flows & GST setup"], salesActions: ["Launch pre-order storefront to targeted mailing list", "Run first community demo webinar"], opsActions: ["Finalize QA checklist for assembled PCB boards"] },
        { week: "Week 4", theme: "Inaugural Pre-Orders & Production Scheduling", financeActions: ["Reconcile first 10 paid pre-orders & gross receipts"], salesActions: ["Follow up with warm inquiries and school science leads"], opsActions: ["Place initial batch component orders with distributor"] }
      ]
    },
    {
      month: "Month 2",
      milestone: "First Production Batch Assembly & Beta School Testing",
      metrics: ["Batch output: 50 units", "Beta testers: 25 classrooms", "User satisfaction: 90%+", "Assembly time: <45 mins/kit"],
      deliverables: [
        "Assemble and QA-test first production batch of 50 kits",
        "Distribute beta evaluation kits to 25 STEM educators across Tamil Nadu",
        "Collect structured teacher feedback on hands-on workshop usability",
        "Optimize packaging design for postal drop-ship durability and reduced freight cost"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Component Receiving & Inventory Inspection", financeActions: ["Verify invoice terms with PCB assembly house"], salesActions: ["Confirm 25 beta educator delivery addresses & session dates"], opsActions: ["Inspect incoming batch components for defects"] },
        { week: "Week 2", theme: "Assembly Line Optimization & First 25 Kits", financeActions: ["Track direct labor and packaging expense per kit"], salesActions: ["Host beta kickoff call with participating schools"], opsActions: ["Time kit assembly process and reduce bottleneck steps"] },
        { week: "Week 3", theme: "Batch QA Testing & Classroom Delivery", financeActions: ["Monitor regional courier shipping costs"], salesActions: ["Gather initial video testimonials from students"], opsActions: ["Run 100% functional test on all soldered sensor modules"] },
        { week: "Week 4", theme: "Beta Feedback Analysis & Design Fixes", financeActions: ["Calculate realized gross margin on first 50 kits"], salesActions: ["Compile user ratings into sales brochure testimonials"], opsActions: ["Document firmware adjustments for next revision"] }
      ]
    },
    {
      month: "Month 3",
      milestone: "Commercial Deliveries & Detach Sensor Architecture Freeze",
      metrics: ["Delivered kits: 50+", "MRR: ₹50,000", "Sensor precision: 99%", "Repeat purchase intent: 70%+"],
      deliverables: [
        "Fulfill and deliver 100% of inaugural paid customer pre-orders",
        "Complete architectural freeze for Detach multi-sensor IoT telemetry module",
        "Publish customer case studies and classroom demonstration video highlights",
        "Implement initial inventory ledger and reorder threshold alerts"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Commercial Order Fulfillment & Dispatch", financeActions: ["Issue GST tax invoices for all fulfilled pre-orders"], salesActions: ["Trigger automated customer delivery notifications and setup guide"], opsActions: ["Confirm final shipping tracking numbers with courier"] },
        { week: "Week 2", theme: "Detach Sensor Architecture Review", financeActions: ["Establish R&D prototyping budget for Detach sensor module"], salesActions: ["Interview top 5 beta teachers for case study quote"], opsActions: ["Finalize pinout, power rails, and I2C/SPI sensor bus"] },
        { week: "Week 3", theme: "Telemetry Firmware Benchmark & Sensor Testing", financeActions: ["Review monthly burn rate and runway projections"], salesActions: ["Publish first case study on website and social channels"], opsActions: ["Benchmark ADC sensor accuracy and noise floor"] },
        { week: "Week 4", theme: "Q1 Milestone Review & Q2 Institutional Strategy", financeActions: ["Close Q1 financial books and summarize revenue vs target"], salesActions: ["Draft Q2 institutional pilot proposal template"], opsActions: ["Freeze Detach schematic revision 1.0 for prototype fab"] }
      ]
    },
    {
      month: "Month 4",
      milestone: "Institutional Outreach & Detach Prototype Assembly",
      metrics: ["Schools contacted: 30+", "Demos completed: 12", "Prototype boards fabricated: 5", "Pipeline value: ₹4,50,000"],
      deliverables: [
        "Launch outbound outreach campaign targeting private matriculation & CBSE schools",
        "Fabricate 5 working prototype boards for Detach sensor hardware",
        "Conduct 12 in-person interactive curriculum demos for school principals",
        "Establish vendor credit terms with regional PCB fabrication partners"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Target Institutional Account List Curation", financeActions: ["Set pilot discount tiers and institutional pricing matrix"], salesActions: ["Curate contact list of 30 STEM coordinators in Chennai & Coimbatore"], opsActions: ["Send Detach Gerber files to rapid fabrication partner"] },
        { week: "Week 2", theme: "Direct School Outreach & Demo Bookings", financeActions: ["Track travel and demonstration budget"], salesActions: ["Execute targeted phone & email sequence to schedule 12 live demos"], opsActions: ["Receive bare PCB boards and procure sensor components"] },
        { week: "Week 3", theme: "Prototype Board Assembly & Live Demos", financeActions: ["Review preliminary pipeline ROI"], salesActions: ["Conduct first 6 in-person demonstrations with live student kits"], opsActions: ["Hand-assemble and flash firmware on 5 Detach prototype units"] },
        { week: "Week 4", theme: "Demo Follow-ups & Pilot Proposal Submissions", financeActions: ["Issue pilot quotation agreements"], salesActions: ["Complete remaining 6 demos and send customized pilot proposals"], opsActions: ["Perform stress tests on wireless Bluetooth/WiFi telemetry"] }
      ]
    },
    {
      month: "Month 5",
      milestone: "Curriculum Integration & B2B Pilot Deployments",
      metrics: ["Active schools: 8", "Student engagement: 85%+", "Pilot LOIs signed: 5+", "Hardware bug rate: <1%"],
      deliverables: [
        "Deploy multi-week robotics lab pilots across 8 selected schools",
        "Conduct teacher training workshops and certify 16 instructor leads",
        "Draft annual institutional procurement agreements with bundled pricing",
        "Benchmark Detach real-time telemetry battery life under continuous testing"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Pilot Kit Deployment & Classroom Setup", financeActions: ["Secure pilot deposit payments from enrolled schools"], salesActions: ["Onboard 8 pilot schools and distribute student lesson binders"], opsActions: ["Deliver 40 classroom demo kits and spare part packs"] },
        { week: "Week 2", theme: "Teacher Training & Curriculum Kickoff", financeActions: ["Reconcile training material printing & delivery expenses"], salesActions: ["Host 2-day hands-on instructor certification workshop"], opsActions: ["Provide dedicated on-call technical support for teachers"] },
        { week: "Week 3", theme: "Classroom Observation & Student Engagement Audit", financeActions: ["Model annual recurring revenue (ARR) per school contract"], salesActions: ["Observe 4 live classroom sessions and gather feedback"], opsActions: ["Audit hardware durability under aggressive student usage"] },
        { week: "Week 4", theme: "Pilot Evaluation & Procurement LOI", financeActions: ["Prepare final commercial contracts for annual license"], salesActions: ["Present pilot outcome reports to school trustees and secure 5 LOIs"], opsActions: ["Incorporate teacher feature requests into hardware backlog"] }
      ]
    },
    {
      month: "Month 6",
      milestone: "Mid-Year Financial Audit & Investor Teaser Circulation",
      metrics: ["Gross margin: 60%+", "Runway: 12+ months", "Investor meetings scheduled: 15+", "Active student users: 800+"],
      deliverables: [
        "Complete comprehensive mid-year financial audit and unit economics review",
        "Prepare confidential one-page investor teaser and founder pitch deck",
        "Circulate teaser to pre-seed VC funds and angel networks across India",
        "Review H1 OKRs and recalibrate revenue targets for H2 institutional cycle"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Mid-Year Financial Audit & P&L Analysis", financeActions: ["Audit all H1 revenue, COGS, operational expenses, and burn rate", "Calculate exact unit economics and customer payback period"], salesActions: ["Consolidate H1 revenue metrics and pipeline deal values"], opsActions: ["Audit physical inventory and reconcile warehouse asset value"] },
        { week: "Week 2", theme: "Investor Teaser & Pitch Deck Finalization", financeActions: ["Build 3-year financial forecast model (revenue, headcount, capital)"], salesActions: ["Create visual traction slides with pilot photos and retention metrics"], opsActions: ["Map out production scale-up roadmap for 1,000 kits"] },
        { week: "Week 3", theme: "Targeted Investor Outreach & Roadshow Prep", financeActions: ["Set up data room security permissions and NDA templates"], salesActions: ["Reach out to 25 curated angel investors and early-stage VC funds"], opsActions: ["Prepare hardware demo kit for in-person partner meetings"] },
        { week: "Week 4", theme: "Investor Meetings & H2 Goal Alignment", financeActions: ["Track investor feedback on valuation and round sizing"], salesActions: ["Conduct first 5 partner screening calls"], opsActions: ["Lock in H2 production schedule with manufacturing partner"] }
      ]
    },
    {
      month: "Month 7",
      milestone: "Detach Pre-Compliance Testing & Software Platform Launch",
      metrics: ["EMC compliance: Pass", "Cloud platform latency: <100ms", "Waitlist signups: 300+", "Uptime: 99.9%"],
      deliverables: [
        "Submit Detach hardware prototype for regulatory EMC and safety testing",
        "Deploy cloud telemetry dashboard for remote classroom analytics",
        "Launch public waitlist portal and product demonstration preview",
        "Integrate automated student progress tracking into school web portal"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Pre-Compliance Testing Submission", financeActions: ["Pay testing lab certification fees"], salesActions: ["Draft public launch announcement and product video script"], opsActions: ["Submit 2 test units to accredited EMC testing facility"] },
        { week: "Week 2", theme: "Cloud Platform Beta Deployment", financeActions: ["Audit AWS/GCP cloud hosting budget vs user load"], salesActions: ["Invite 50 pilot students to test browser telemetry viewer"], opsActions: ["Perform load testing and API latency optimization"] },
        { week: "Week 3", theme: "Certification Review & Firmware Polish", financeActions: ["Review preliminary tooling vendor capital requirements"], salesActions: ["Launch public teaser landing page and capture 300 waitlist leads"], opsActions: ["Resolve test lab feedback and finalize PCB ground shielding"] },
        { week: "Week 4", theme: "Platform Integration & School Portal Rollout", financeActions: ["Invoice ongoing subscription fees for pilot platform"], salesActions: ["Demo cloud dashboard to prospective school principals"], opsActions: ["Deploy automatic over-the-air (OTA) firmware update system"] }
      ]
    },
    {
      month: "Month 8",
      milestone: "B2B Pilot Conversion to Annual Multi-Kit Contracts",
      metrics: ["Annual contracts: 6 signed", "Contract ARR: ₹6,00,000", "Renewal rate: 95%", "Average deal size: ₹1,00,000"],
      deliverables: [
        "Convert 6 high-engagement pilot schools into multi-year recurring contracts",
        "Deliver bulk curriculum replenishment shipments for upcoming academic term",
        "Introduce tiered service level agreements (SLAs) for technical lab support",
        "Onboard first full-time B2B sales account executive"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Pilot Conversion Negotiations", financeActions: ["Review contract payment schedules and upfront deposit terms"], salesActions: ["Conduct closing meetings with school decision makers"], opsActions: ["Stage bulk kit inventory ready for rapid dispatch"] },
        { week: "Week 2", theme: "Contract Finalization & Billing Setup", financeActions: ["Collect upfront annual subscription payments"], salesActions: ["Sign 3 enterprise institutional supply contracts"], opsActions: ["Prepare custom school branding labels for hardware boxes"] },
        { week: "Week 3", theme: "Bulk Shipments & Onboarding", financeActions: ["Reconcile accounts receivable"], salesActions: ["Sign remaining 3 enterprise institutional contracts"], opsActions: ["Dispatch bulk pallets to schools with freight insurance"] },
        { week: "Week 4", theme: "Sales Team Expansion & Pipeline Review", financeActions: ["Establish compensation structure and sales commission policy"], salesActions: ["Onboard full-time B2B sales hire and assign target territories"], opsActions: ["Set up automated RMA replacement protocol for damaged parts"] }
      ]
    },
    {
      month: "Month 9",
      milestone: "Investor Data Room Finalization & Pitch Roadshow",
      metrics: ["Diligence readiness: 100%", "Term sheet targets: 3", "Committed angel funds: ₹10,00,000", "LTV/CAC ratio: >3.5x"],
      deliverables: [
        "Finalize virtual data room: capitalization table, IP assignments, customer contracts",
        "Initiate formal seed round investor meetings and in-person partner presentations",
        "Obtain first ₹10L in angel syndicate soft commitments",
        "File provisional patent application for Detach modular sensor mounting system"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Data Room Due Diligence Preparation", financeActions: ["Upload audited cap table, tax filings, and bank statements to data room"], salesActions: ["Assemble customer pipeline metrics, cohort retention, and contract proofs"], opsActions: ["Document manufacturing supply agreements and BOM cost trajectory"] },
        { week: "Week 2", theme: "IP Protection & Provisional Patent Filing", financeActions: ["Pay IP attorney filing fees"], salesActions: ["Present to 4 regional angel investor groups in Bangalore & Chennai"], opsActions: ["Finalize technical patent drawings and claims for sensor mount"] },
        { week: "Week 3", theme: "Lead Investor Partner Meetings", financeActions: ["Track term sheet negotiation terms and liquidation preferences"], salesActions: ["Host in-person institutional demo for lead investor diligence team"], opsActions: ["Demonstrate live telemetric dashboard during VC presentation"] },
        { week: "Week 4", theme: "Syndicate Commitment Consolidation", financeActions: ["Secure ₹10,00,000 in binding syndicate soft commitments"], salesActions: ["Follow up with all active investor contacts and share diligence links"], opsActions: ["Benchmark production lead times for 5,000 unit tooling scale"] }
      ]
    },
    {
      month: "Month 10",
      milestone: "Seed Round Closing & Detach Tooling Orders",
      metrics: ["Capital closed: ₹3,000,000", "Tooling vendor: Selected", "Tooling lead time: 6 weeks", "Cash runway: 24 months"],
      deliverables: [
        "Execute definitive seed investment agreements and receive wire transfers",
        "Place injection-molding tooling orders for Detach production enclosures",
        "Authorize component advance orders to secure volume tier price cuts",
        "Formulate employee stock option plan (ESOP) allocation pool"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Term Sheet Execution & Legal Review", financeActions: ["Review shareholders agreement (SHA) and share subscription agreement (SSA)"], salesActions: ["Maintain sales momentum and book new demos for upcoming term"], opsActions: ["Obtain final mold flow simulation reports from tooling vendors"] },
        { week: "Week 2", theme: "Definitive Agreement Signing & Wire Transfers", financeActions: ["Confirm receipt of ₹3,000,000 seed funding wire in escrow"], salesActions: ["Announce funding milestone to school network and partners"], opsActions: ["Select top-tier precision injection molding manufacturer"] },
        { week: "Week 3", theme: "Capital Allocation & Tooling Purchase Order", financeActions: ["Disburse tooling deposit and setup capital reserve account"], salesActions: ["Launch pre-booking campaign for Detach commercial edition"], opsActions: ["Release 3D CAD files and sign off on mold fabrication contract"] },
        { week: "Week 4", theme: "Governance Setup & ESOP Structuring", financeActions: ["Formalize 10% ESOP pool and board resolutions"], salesActions: ["Draft Q4 marketing campaign plan"], opsActions: ["Order long-lead microcontrollers and passive components"] }
      ]
    },
    {
      month: "Month 11",
      milestone: "Manufacturing Scale-Up & Core Hiring in Ops and Sales",
      metrics: ["Assembly throughput: 200 kits/mo", "New hires: 2 onboarded", "Inventory buffer: 30 days", "Scrap rate: <2%"],
      deliverables: [
        "Scale semi-automated assembly line to reach 200 kits per month capacity",
        "Hire Senior Embedded Systems Engineer and Regional Institutional Sales Manager",
        "Establish buffer stock for microcontrollers to hedge against supply chain shocks",
        "Roll out enterprise school management dashboard with multi-campus analytics"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Talent Acquisition & Technical Screening", financeActions: ["Set competitive payroll, ESOP, and benefits budgets for new roles"], salesActions: ["Interview sales candidates with proven school network track records"], opsActions: ["Interview embedded firmware engineers with IoT telemetry experience"] },
        { week: "Week 2", theme: "Core Hiring Offers & Team Onboarding", financeActions: ["Complete background checks and issue formal appointment letters"], salesActions: ["Train new sales executive on institutional presentation playbook"], opsActions: ["Integrate new embedded systems engineer into firmware sprint"] },
        { week: "Week 3", theme: "Assembly Throughput Scaling", financeActions: ["Audit manufacturing labor cost and target ₹500 assembly per kit"], salesActions: ["Expand outreach to private schools in tier-2 district hubs"], opsActions: ["Install semi-automatic screw driving & testing jigs in assembly line"] },
        { week: "Week 4", theme: "Quality Assurance & Buffer Inventory Audit", financeActions: ["Review monthly cash burn and verify 20+ months runway"], salesActions: ["Achieve 15 new active pipeline proposals"], opsActions: ["Reach 200 kits/month throughput with <2% scrap rate"] }
      ]
    },
    {
      month: "Month 12",
      milestone: "Annual Target Review, Detach Commercial Launch & Q1 Planning",
      metrics: ["Annual revenue: ₹1,500,000+", "Active student users: 2,500+", "Net margin: Positive", "Schools onboarded: 20+"],
      deliverables: [
        "Officially launch Detach IoT sensor suite for commercial educational and maker orders",
        "Conduct comprehensive Year-1 performance review with board of advisors",
        "Publish Year-1 Annual Impact Report for investors, educators, and community",
        "Formulate Year-2 strategic roadmap with expansion to neighboring state districts"
      ],
      weeklyPlans: [
        { week: "Week 1", theme: "Commercial Product Launch & Press Announcement", financeActions: ["Activate online payment gateways for commercial Detach sales"], salesActions: ["Host official product release event with partner school principals"], opsActions: ["Inspect initial injection-molded production samples and approve run"] },
        { week: "Week 2", theme: "Annual Revenue Audit & KPI Reconciliations", financeActions: ["Close annual financial audit confirming ₹1.5M+ milestone revenue"], salesActions: ["Calculate annual customer retention rate and lifetime value (LTV)"], opsActions: ["Document warehouse shipping throughput and courier SLA metrics"] },
        { week: "Week 3", theme: "Board Review & Stakeholder Impact Report", financeActions: ["Circulate Q4 board deck and financial summary to seed investors"], salesActions: ["Publish Year-1 Impact Report showing 2,500+ active students"], opsActions: ["Reward assembly team for hitting annual production milestones"] },
        { week: "Week 4", theme: "Year-2 Roadmap Formulation & Strategic Kickoff", financeActions: ["Finalize Year-2 operating budget and revenue targets"], salesActions: ["Set territory goals for state-wide distribution expansion"], opsActions: ["Freeze Year-2 hardware R&D objectives and next-gen sensors"] }
      ]
    }
  ];

  const selectedMonthData = useMemo(() => {
    if (selectedMonthIdx === null || selectedMonthIdx === undefined) return null;
    const raw = strategicPlan?.monthlyMilestones?.[selectedMonthIdx];
    const def = defaultMilestones[selectedMonthIdx] || defaultMilestones[0];
    const milestoneTitle = raw?.milestone || raw?.objective || def.milestone;

    // Extract metrics
    const metrics: string[] = [];
    if (raw?.keyMetrics && Array.isArray(raw.keyMetrics) && raw.keyMetrics.length > 0) {
      metrics.push(...raw.keyMetrics.filter(Boolean));
    } else if (def?.metrics && Array.isArray(def.metrics)) {
      metrics.push(...def.metrics.filter(Boolean));
    }

    // Extract deliverables
    const deliverables: string[] = [];
    if (raw?.deliverables && Array.isArray(raw.deliverables) && raw.deliverables.length > 0) {
      deliverables.push(...raw.deliverables.filter(Boolean));
    } else if (raw?.tasks && Array.isArray(raw.tasks) && raw.tasks.length > 0) {
      deliverables.push(...raw.tasks.filter(Boolean));
    } else if (def?.deliverables && Array.isArray(def.deliverables)) {
      deliverables.push(...def.deliverables.filter(Boolean));
    }

    // Extract weekly plans (if present in AI output or default plan)
    const weeklyPlans: any[] = [];
    if (raw?.weeklyPlans && Array.isArray(raw.weeklyPlans) && raw.weeklyPlans.length > 0) {
      weeklyPlans.push(...raw.weeklyPlans);
    } else if (selectedMonthIdx === 0 && strategicPlan?.weeklyPlans && Array.isArray(strategicPlan.weeklyPlans) && strategicPlan.weeklyPlans.length > 0) {
      weeklyPlans.push(...strategicPlan.weeklyPlans);
    } else if (def?.weeklyPlans && Array.isArray(def.weeklyPlans)) {
      weeklyPlans.push(...def.weeklyPlans);
    }

    const qIdx = Math.floor(selectedMonthIdx / 3);
    const qData = quartersList[qIdx];

    return {
      idx: selectedMonthIdx,
      monthNum: selectedMonthIdx + 1,
      monthName: `Month ${selectedMonthIdx + 1}`,
      title: milestoneTitle,
      metrics: metrics.length > 0 ? metrics : def.metrics,
      deliverables: deliverables.length > 0 ? deliverables : def.deliverables,
      weeklyPlans,
      quarterIdx: qIdx,
      quarterName: `Q${qIdx + 1}`,
      quarterPeriod: qData?.period || `Months ${qIdx * 3 + 1}–${(qIdx + 1) * 3}`,
      quarterFocus: qData?.focus || '',
      quarterProgress: qData?.progress || 0,
      quarterObjectives: qData?.objectives || [],
      isCompleted: completedMonthlyMilestones.includes(`Month ${selectedMonthIdx + 1}`) || completedMonthlyMilestones.includes(`M${selectedMonthIdx + 1}`),
      isCurrent: selectedMonthIdx === currentMonthIndex
    };
  }, [selectedMonthIdx, strategicPlan, completedMonthlyMilestones, currentMonthIndex, quartersList]);

  const activeProducts = useMemo(() => {
    if (productKPIs.products && productKPIs.products.length > 0) {
      const totalMrr = productKPIs.products.reduce((acc: number, p: any) => acc + (Number(p.mrr) || 0), 0);
      return productKPIs.products.slice(0, 2).map((p: any, idx: number) => {
        let pct = 50;
        if (totalMrr > 0) {
          pct = Math.max(10, Math.min(90, Math.round(((Number(p.mrr) || 0) / totalMrr) * 100)));
        } else if (idx === 0) {
          pct = productKPIs.products.length > 1 ? 75 : 100;
        } else {
          pct = 25;
        }
        return {
          id: p.id,
          name: p.name || (idx === 0 ? "Core Product" : "Secondary Product"),
          focus: p.tagline || p.description || p.targetAudience || (idx === 0 ? "Early revenue & market traction" : "Validation & waitlist growth"),
          progress: pct,
          stage: p.stage || 'mvp',
          mrr: Number(p.mrr) || 0
        };
      });
    }
    return [
      { id: '1', name: "Core Product", focus: "Early revenue & market traction", progress: 75, stage: 'launched', mrr: salesKPIs.mrr },
      { id: '2', name: "New Feature / Pilot", focus: "Validation & waitlist growth", progress: 25, stage: 'beta', mrr: 0 }
    ];
  }, [productKPIs.products, salesKPIs.mrr]);

  const currentMonthName = selectedMonthIdx !== null ? `Month ${selectedMonthIdx + 1}` : '';
  const isSelectedMonthCompleted = selectedMonthIdx !== null && (completedMonthlyMilestones.includes(currentMonthName) || completedMonthlyMilestones.includes(`M${selectedMonthIdx + 1}`));
  const isSelectedMonthActive = selectedMonthIdx === currentMonthIndex;

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 pb-12">
      
      {/* Top Header matching AI Strategic Planner visual UI/UX */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pt-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              AI Strategic Planner
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Aligning your yearly goals with automated roadmaps, milestones, and actionable tasks.
            </p>
          </div>
        </div>

        {/* History & Export actions */}
        <div className="flex items-center flex-wrap gap-2.5">

          {/* Plan History Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryListModalOpen(true)}
            className="h-8 rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 px-3.5 shadow-xs"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Plan History
          </Button>

          {/* Export Button */}
          <Button
            size="sm"
            onClick={handleExportPlan}
            className="h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 px-4 shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-white" />
            Export
          </Button>
        </div>
      </div>

      {/* Connected Feature Suites Command Row - Direct 1-Click Sync to Respective Backends */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Finance Suite */}
        <button
          type="button"
          onClick={() => onNavigate('finance')}
          className="p-3.5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Finance Suite
            </span>
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 truncate">
              {postMoney > 0 ? fmtINR(postMoney) : 'Set Valuation'}
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span>{fmtPct(founderOwnership)} Founder Stake</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </button>

        {/* Sales Tracker */}
        <button
          type="button"
          onClick={() => onNavigate('sales')}
          className="p-3.5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Sales Tracker
            </span>
            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 truncate">
              {fmtINR(salesKPIs.mrr)} <span className="text-[10px] text-slate-400 font-bold">MRR</span>
            </div>
            <div className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1 mt-0.5">
              <span>{salesKPIs.wonCount} Deals Won ({salesKPIs.conversionRate.toFixed(0)}%)</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </button>

        {/* Operations Hub */}
        <button
          type="button"
          onClick={() => onNavigate('operations')}
          className="p-3.5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Operations Hub
            </span>
            <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 truncate">
              {fmtINR(opsKPIs.cashBank)} <span className="text-[10px] text-slate-400 font-bold">Cash</span>
            </div>
            <div className="text-[10px] font-semibold text-teal-600 flex items-center gap-1 mt-0.5">
              <span>{opsKPIs.runway === 999 ? '∞ Runway' : `${Math.round(opsKPIs.runway)} mo runway`}</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </button>

        {/* Product Suite */}
        <button
          type="button"
          onClick={() => onNavigate('product')}
          className="p-3.5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Product Suite
            </span>
            <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Box className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 truncate">
              {productKPIs.totalCount} {productKPIs.totalCount === 1 ? 'Product' : 'Products'}
            </div>
            <div className="text-[10px] font-semibold text-purple-600 flex items-center gap-1 mt-0.5">
              <span>{fmtINR(productKPIs.suiteMrr || salesKPIs.mrr)} Portfolio MRR</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </button>

        {/* Marketing Hub */}
        <button
          type="button"
          onClick={() => onNavigate('dm')}
          className="p-3.5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Marketing Hub
            </span>
            <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 truncate">
              {profile?.dmActivePlan?.productName || 'Active GTM'}
            </div>
            <div className="text-[10px] font-semibold text-sky-600 flex items-center gap-1 mt-0.5">
              <span>{profile?.dmActivePlan?.platforms?.length || 0} Social Channels</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </button>
      </div>

      {/* LOADING STATE */}
      {aiLoading && (
        <Card className="border-2 border-indigo-100 bg-indigo-50/5 shadow-md py-14 text-center animate-pulse rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800">FounderOS AI is Processing</h3>
              <p className="text-xs text-indigo-700 font-semibold max-w-md transition-all duration-300">
                {loadingMessages[loadingMessageIdx]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Strategic Initiative Card with Mountain Horizon Graphic */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6 md:p-7 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 min-h-[160px]">
        {/* Mountain illustration in background on right */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 pointer-events-none overflow-hidden opacity-90">
          <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="mtnGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="mtnGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.1" />
              </linearGradient>
              <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Sunrise Glow */}
            <circle cx="470" cy="50" r="45" fill="url(#sunGlow)" />
            <circle cx="470" cy="50" r="14" fill="#fde047" />
            {/* Summit Flag */}
            <line x1="475" y1="52" x2="475" y2="30" stroke="#475569" strokeWidth="2" />
            <polygon points="475,30 490,36 475,42" fill="#ef4444" />
            {/* Distant Mountain Peak */}
            <polygon points="200,200 320,80 430,200" fill="url(#mtnGrad1)" />
            {/* Mid Mountain Peak */}
            <polygon points="300,200 475,50 590,200" fill="url(#mtnGrad2)" />
            {/* Foreground Slope */}
            <polygon points="120,200 280,120 450,200" fill="#e0e7ff" fillOpacity="0.4" />
          </svg>
        </div>

        {/* Left: Initiative Info */}
        <div className="relative z-10 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                Active Strategic Initiative
              </span>
              <h2 className="text-lg md:text-xl font-black text-slate-900 leading-snug tracking-tight">
                {yearlyGoal || profile?.strategicGoal || "Launch MVP product, secure first 10 pilot customers, and close ₹3,000,000 seed investment."}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-200/60 shadow-2xs">
              Stage: {(stage || profile?.companyStage || 'mvp').toUpperCase()}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200/60 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Roadmap active and synced
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setIsGoalsModalOpen(true)}
                className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 hover:bg-indigo-100/70 ml-1 transition-colors shadow-2xs"
              >
                Edit Strategy
              </button>
            )}
          </div>
        </div>

        {/* Right: Glassmorphic Goal Box */}
        <div className="relative z-10 w-full sm:w-auto self-stretch sm:self-auto shrink-0">
          <div className="bg-white/85 backdrop-blur-md border border-white/80 rounded-3xl p-4 shadow-sm min-w-[210px] space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              12-Month Goal
            </span>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              {salesKPIs.wonCount > 0 ? `${salesKPIs.wonCount} Pilot Customers` : '10 Pilot Customers'}
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {postMoney > 0 ? fmtINR(postMoney) : '₹3,000,000 Seed Round'}
            </div>
          </div>
        </div>
      </div>

      {/* Combined 12-Month Strategic Roadmap & Milestones (Left) & Visual AI Strategic Insight (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Highlighted 12-Month Roadmap & Milestones (Flagship Strategic Compass) - approx 64% width */}
        <div className="lg:col-span-8 relative rounded-3xl bg-white border-2 border-indigo-500/35 shadow-[0_20px_50px_-10px_rgba(79,70,229,0.18),0_8px_24px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_24px_64px_-10px_rgba(79,70,229,0.24)] transition-all duration-300 p-6 md:p-7 space-y-6 overflow-hidden ring-4 ring-indigo-50/80">
          
          {/* Ambient Diffused Glows (Color Theory: Subconscious Elevation & Depth) */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-emerald-500/8 via-indigo-500/8 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Highlighted Header with Strategic Icon & Status Badge */}
          <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-200">
                <Calendar className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight font-heading">
                    12-Month Roadmap &amp; Milestones
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/90 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Core Strategic Compass
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Master timeline tracking quarterly execution targets, unit deliverables &amp; founder checkpoints
                </p>
              </div>
            </div>

            {/* Legend with Color Psychology Tokens */}
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" /> Current
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Upcoming
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" /> Completed
              </span>
            </div>
          </div>

          {/* Roadmap Quarters Overview (Q1 - Q4 Cards with Smooth Progress Fill) */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {quartersList.map((q, qIdx) => {
              const isQuarterActive = selectedMonthData?.quarterIdx === qIdx;
              return (
                <div
                  key={qIdx}
                  onClick={() => setSelectedMonthIdx(qIdx * 3)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isQuarterActive
                      ? 'bg-gradient-to-b from-indigo-50/95 via-white to-indigo-50/50 border-indigo-300 ring-2 ring-indigo-200/80 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/70 hover:shadow-2xs'
                  }`}
                  title={`View Q${qIdx + 1} (${q.period})`}
                >
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className="text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {`Q${qIdx + 1}`}{' '}
                      <span className="text-[10px] font-semibold text-slate-400">({q.period})</span>
                    </span>
                    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                      isQuarterActive ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-600 bg-indigo-50'
                    }`}>
                      {Math.round(q.progress)}%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 mt-1 line-clamp-1">
                    {q.focus}
                  </p>
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(4, Math.round(q.progress)))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Straight Flow of 12 Milestone Circles (Illuminated Continuous Timeline) */}
          <div className="relative z-10 pt-4 pb-2 px-1">
            <div className="absolute top-[1.375rem] left-5 right-5 h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-slate-200 rounded-full z-0 opacity-80" />
            <div className="relative z-10 flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-none px-1">
              {Array.from({ length: 12 }).map((_, idx) => {
                const mLabel = `M${idx + 1}`;
                const mFullName = `Month ${idx + 1}`;
                const isSelected = selectedMonthIdx === idx;
                const isCompleted = completedMonthlyMilestones.includes(mFullName) || completedMonthlyMilestones.includes(mLabel);
                const isCurrent = idx === currentMonthIndex;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedMonthIdx(prev => prev === idx ? null : idx)}
                      className={`group relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[11px] md:text-xs transition-all duration-200 focus:outline-hidden cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-[0_4px_16px_rgba(79,70,229,0.55)] ring-4 ring-indigo-200 scale-110 z-20'
                          : isCompleted
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xs hover:scale-105 z-10 ring-2 ring-emerald-200'
                          : isCurrent
                          ? 'bg-white text-indigo-700 border-2 border-indigo-600 ring-4 ring-indigo-100 hover:scale-105 z-10 shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-300 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 z-10 shadow-2xs'
                      }`}
                      title={`${mFullName}: ${isSelected ? 'Selected (Click to toggle)' : isCompleted ? 'Completed' : 'Upcoming'} — Touch for roadmap & milestone details`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 md:w-4.5 md:h-4.5 stroke-[3] text-white" /> : mLabel}
                    </button>
                    <span className="text-[10px] font-bold">
                      {isCurrent ? (
                        <span className="text-indigo-600 font-extrabold uppercase tracking-tight bg-indigo-50 border border-indigo-200 px-1 rounded-sm">Now</span>
                      ) : (
                        <span className="text-slate-500">{mLabel}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details (Appears when any circle is touched, defaults to Month 1 on load) giving content about BOTH Roadmap and Milestone */}
          {selectedMonthIdx !== null && selectedMonthData ? (
            <div className="relative z-10 p-6 md:p-7 rounded-3xl bg-gradient-to-b from-white via-indigo-50/15 to-white border border-indigo-200/90 shadow-[0_6px_24px_rgba(79,70,229,0.06)] space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Header Context Bar */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                    M{selectedMonthData.monthNum}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900 tracking-tight font-heading">
                        {selectedMonthData.monthName} Milestone &amp; Roadmap
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        selectedMonthData.isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : selectedMonthData.isCurrent
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}>
                        {selectedMonthData.isCompleted ? '✓ Completed' : selectedMonthData.isCurrent ? '● Current Active Month' : 'Upcoming'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Part of <span className="text-indigo-600 font-bold">{selectedMonthData.quarterName} Roadmap ({selectedMonthData.quarterPeriod})</span> · {selectedMonthData.quarterProgress}% Quarter Progress
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant={selectedMonthData.isCompleted ? "outline" : "default"}
                      onClick={() => handleToggleMonthlyMilestone(selectedMonthData.monthName, selectedMonthIdx)}
                      className={`h-8 text-xs font-bold px-4 rounded-xl shadow-xs transition-all ${
                        selectedMonthData.isCompleted
                          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xs'
                      }`}
                    >
                      {selectedMonthData.isCompleted ? 'Mark Incomplete' : '✓ Mark Achieved'}
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedMonthIdx(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Close details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Primary Strategic Milestone Objective */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-violet-50/40 to-indigo-50/60 border border-indigo-200/80 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Flag className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                    Primary Strategic Objective
                  </span>
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    {selectedMonthData.title}
                  </p>
                </div>
              </div>

              {/* Two-Column Grid: 1) Roadmap Alignment & Objectives, 2) Target KPIs & Deliverables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: Roadmap Alignment & Quarterly Focus */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <Map className="w-4 h-4 text-indigo-600 shrink-0" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {selectedMonthData.quarterName} Roadmap Alignment
                    </h5>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quarter Thematic Focus</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 leading-relaxed">
                      {selectedMonthData.quarterFocus}
                    </p>
                  </div>
                  {selectedMonthData.quarterObjectives && selectedMonthData.quarterObjectives.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quarter Milestone Benchmarks</span>
                      <ul className="space-y-1">
                        {selectedMonthData.quarterObjectives.map((obj: string, oIdx: number) => (
                          <li key={oIdx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Column 2: Key Metrics & Success Criteria */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <Target className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Target Metrics &amp; Success KPIs
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedMonthData.metrics.map((metric: string, mIdx: number) => {
                      const parts = metric.split(':');
                      const label = parts.length > 1 ? parts[0].trim() : `KPI ${mIdx + 1}`;
                      const val = parts.length > 1 ? parts.slice(1).join(':').trim() : metric;
                      return (
                        <div key={mIdx} className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                            {label}
                          </span>
                          <span className="text-xs font-black text-slate-900 block truncate">
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Key Deliverables & Output Items */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Required Deliverables &amp; Output Checkpoints
                    </h5>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                    {selectedMonthData.deliverables.length} Deliverables
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedMonthData.deliverables.map((del: string, dIdx: number) => (
                    <div key={dIdx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-black text-indigo-700">{dIdx + 1}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-800 leading-snug">
                        {del}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Execution Blueprint (Weeks 1 to 4) */}
              {selectedMonthData.weeklyPlans && selectedMonthData.weeklyPlans.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Weekly Execution Blueprint (Month {selectedMonthData.monthNum})
                      </h5>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      4 Weeks Scheduled
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedMonthData.weeklyPlans.map((wPlan: any, wIdx: number) => (
                      <div key={wIdx} className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                            {wPlan.week || `Week ${wIdx + 1}`}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]" title={wPlan.theme}>
                            {wPlan.theme}
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1 text-[11px]">
                          {wPlan.salesActions && wPlan.salesActions.length > 0 && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0 mt-0.5">Sales</span>
                              <span className="text-slate-700 font-medium leading-tight">{wPlan.salesActions[0]}</span>
                            </div>
                          )}
                          {wPlan.financeActions && wPlan.financeActions.length > 0 && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0 mt-0.5">Finance</span>
                              <span className="text-slate-700 font-medium leading-tight">{wPlan.financeActions[0]}</span>
                            </div>
                          )}
                          {wPlan.opsActions && wPlan.opsActions.length > 0 && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0 mt-0.5">Ops</span>
                              <span className="text-slate-700 font-medium leading-tight">{wPlan.opsActions[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick AI Advisor Trigger */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/40 border border-indigo-100/60 text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Need tailored guidance on Month {selectedMonthData.monthNum}?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsChatOpen(true);
                    setChatMessage(`Help me plan and execute the key milestones for Month ${selectedMonthData.monthNum}: ${selectedMonthData.title}`);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  Consult Co-Pilot <ArrowRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-slate-50/50 border border-dashed border-slate-200 text-center">
              <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Touch any circle (M1–M12) in the flow above to reveal its complete roadmap focus, milestone objectives, deliverables &amp; weekly execution plans.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: AI Strategic Insight - approx 36% width */}
        <div className="lg:col-span-4 rounded-3xl bg-white border border-slate-200/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.09),0_4px_16px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_46px_-6px_rgba(0,0,0,0.12)] transition-shadow duration-300 p-6 md:p-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">AI Strategic Insight</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalysisModalOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                View Full Analysis <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visual Donut Chart */}
            <div className="py-2 flex items-center justify-center gap-6">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="#e2e8f0" strokeWidth="9" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#4f46e5"
                    strokeWidth="9"
                    strokeDasharray={238.76}
                    strokeDashoffset={238.76 * (1 - (activeProducts[0]?.progress || 75) / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-black text-slate-900">{activeProducts[0]?.progress || 75}%</span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="space-y-2 text-xs font-bold">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                    <span className="max-w-[100px] truncate">{activeProducts[0]?.name || "Core Product"}</span>
                  </span>
                  <span className="text-slate-900 font-black">{activeProducts[0]?.progress || 75}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                    <span className="max-w-[100px] truncate">{activeProducts[1]?.name || "Secondary Product"}</span>
                  </span>
                  <span className="text-slate-500 font-bold">{100 - (activeProducts[0]?.progress || 75)}%</span>
                </div>
              </div>
            </div>

            {/* Visual Strategic Tags & Key Signals (Clean visual breakdown instead of big text) */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Stance</span>
                <span className="text-xs font-black text-indigo-600 block truncate">Traction &amp; Cashflow</span>
              </div>
              <div className="p-3 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Lead Driver</span>
                <span className="text-xs font-black text-slate-800 block truncate">{activeProducts[0]?.name || "Core Product"}</span>
              </div>
            </div>

            {/* Concise Visual Highlight Callout */}
            <div className="mt-2.5 p-3.5 rounded-3xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">
                  Prioritize core traction over secondary pipeline
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalysisModalOpen(true)}
                className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-100/90 text-amber-800 hover:bg-amber-200/90 shrink-0 transition-colors shadow-2xs"
              >
                Details
              </button>
            </div>
          </div>

          {/* Action Button */}
          <Button
            type="button"
            onClick={() => hasPlan ? setIsChatOpen(true) : setIsGoalsModalOpen(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-full gap-1.5 shadow-sm mt-3"
          >
            {hasPlan ? "Consult Roadmap Co-Pilot" : "Generate 12-Month Plan"} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Bottom Two-Column Grid: Weekly Adaptation Hub | Investor Weekly Report */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Column 2: Weekly Adaptation Hub */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-5 md:p-6 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Weekly Adaptation Hub</h3>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Log your progress, milestones or roadblocks. FounderOS AI will adapt your roadmap, targets and tasks.
            </p>
            <textarea
              className="w-full text-xs font-medium p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none bg-slate-50/50 placeholder-slate-400"
              rows={2}
              placeholder="E.g. Completed CRM setup. Delayed MVP coding due to API bugs. Closed ₹100k deal..."
              value={weeklyProgress}
              onChange={e => setWeeklyProgress(e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={() => handleGeneratePlan(undefined, weeklyProgress)}
              disabled={!weeklyProgress.trim() || aiLoading || readOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-5 rounded-full gap-1.5 shadow-xs"
            >
              Analyze &amp; Update Plan <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Column 3: Investor Weekly Report */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-5 md:p-6 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Investor Weekly Report</h3>
              </div>
              <Button
                size="sm"
                onClick={handleGenerateWeeklyReport}
                disabled={weeklyReportLoading || readOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-7 px-3 rounded-full gap-1 shadow-xs"
              >
                {weeklyReportLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate Report"} <ArrowRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Clickable Feature Category Chips - Live Sync to Sub-Suites */}
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => onNavigate('leads')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                title="View CRM Leads"
              >
                <Users className="w-2.5 h-2.5" /> CRM
              </button>
              <button
                type="button"
                onClick={() => onNavigate('workshops')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 transition-colors"
                title="View Workshops"
              >
                <GraduationCap className="w-2.5 h-2.5" /> Workshops
              </button>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                title="View Sales Analytics"
              >
                <TrendingUp className="w-2.5 h-2.5" /> Sales
              </button>
              <button
                type="button"
                onClick={() => onNavigate('operations')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                title="View Operations"
              >
                <Settings className="w-2.5 h-2.5" /> Operations
              </button>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 transition-colors"
                title="View Tasks"
              >
                <CheckSquare className="w-2.5 h-2.5" /> Tasks
              </button>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors"
                title="View Daily Activity"
              >
                <MessageSquare className="w-2.5 h-2.5" /> Feedback
              </button>
            </div>

            {/* Status Card */}
            <div
              onClick={() => setIsWeeklyReportModalOpen(true)}
              className="p-3.5 rounded-3xl bg-slate-50/60 border border-slate-200/80 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="space-y-0.5 leading-tight">
                <h6 className="text-xs font-black text-slate-900">
                  {weeklyReport ? "Weekly Update Ready (Click to View)" : "No Weekly Update Compiled Yet"}
                </h6>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Analyze the last 7 days of your workspace data and generate a mentor-ready progress report.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Strategic Assessment Markdown Modal */}
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto p-6 rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              Comprehensive AI Strategic Assessment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Detailed strategic insights, risk assessment, and market positioning formulated by FounderOS AI.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 prose prose-slate max-w-none text-xs leading-relaxed">
            {strategicPlan?.analysis ? (
              renderMarkdown(strategicPlan.analysis)
            ) : (
              <p className="text-slate-500 font-medium">No assessment generated yet. Click "Setup Goals &amp; Strategy" to generate your roadmap.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan History Modal */}
      <Dialog open={isHistoryListModalOpen} onOpenChange={setIsHistoryListModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto p-6 rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Plan Generation History
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Browse previously generated roadmaps and restore them if required.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 space-y-3">
            {!planHistory || planHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed rounded-3xl">
                No plan history recorded yet. Future adaptations will be archived here.
              </div>
            ) : (
              planHistory.map((histPlan: any) => {
                const date = histPlan.createdAt ? new Date(histPlan.createdAt.seconds * 1000) : new Date();
                const formattedDate = date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                return (
                  <div key={histPlan.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500">{formattedDate}</span>
                        <span className="text-[9px] uppercase font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                          {histPlan.companyStage || 'MVP'}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{histPlan.yearlyGoal}</h5>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                              setIsHistoryListModalOpen(false);
                            } catch (err) {
                              console.error("Error restoring plan:", err);
                            } finally {
                              setAiLoading(false);
                            }
                          }
                        }}
                        className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4"
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
                            } catch (err) {
                              console.error("Error deleting plan:", err);
                            }
                          }
                        }}
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Quarter Objectives Modal */}
      <Dialog open={selectedQuarterIdx !== null} onOpenChange={(open) => !open && setSelectedQuarterIdx(null)}>
        <DialogContent className="max-w-xl w-[95vw] max-h-[85vh] overflow-y-auto p-6 rounded-3xl border border-slate-200 shadow-2xl">
          {selectedQuarterIdx !== null && (
            <>
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-indigo-600" />
                  {quartersList[selectedQuarterIdx].period} Deep Dive
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {quartersList[selectedQuarterIdx].focus}
                </DialogDescription>
              </DialogHeader>
              <div className="pt-4 space-y-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Core Objectives &amp; Milestones
                </span>
                <ul className="space-y-2.5">
                  {quartersList[selectedQuarterIdx].objectives.map((obj: string, oIdx: number) => (
                    <li key={oIdx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Investor Weekly Report Modal */}
      <Dialog open={isWeeklyReportModalOpen} onOpenChange={setIsWeeklyReportModalOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Investor Weekly Progress Report
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Analyze recent workspace logs to compose an executive brief for mentors and investors.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4 space-y-4">
            <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-2xl border border-indigo-100">
              <span className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {showHistory ? "Viewing Saved History" : "Report Editor"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistory(!showHistory)}
                  className="h-7 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-full px-3"
                >
                  {showHistory ? "Back to Editor" : `Saved History (${(weeklyReportsHistory || []).length})`}
                </Button>
                {weeklyReport && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyReport}
                    className="h-7 text-xs font-bold gap-1 bg-white border-indigo-200 text-indigo-700 rounded-full px-3"
                  >
                    {isCopied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                )}
              </div>
            </div>

            {weeklyReport ? (
              <div className="space-y-3">
                <textarea
                  className="w-full bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 font-mono text-xs leading-relaxed min-h-[250px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={weeklyReport}
                  onChange={(e) => setWeeklyReport(e.target.value)}
                  placeholder="Edit your weekly report here..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleSaveWeeklyReport}
                    disabled={isSavingReport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-full px-4 gap-1.5"
                  >
                    {reportSavedSuccess ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save Report</>}
                  </Button>
                  <Button
                    onClick={handleGenerateWeeklyReport}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold h-9 text-xs rounded-full px-4 gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                <Mail className="w-8 h-8 text-indigo-600 mx-auto" />
                <h5 className="text-xs font-bold text-slate-800">No report generated yet</h5>
                <Button
                  onClick={handleGenerateWeeklyReport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-full gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Compile New Weekly Report
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Strategic Planner Setup & Goals Popup Modal */}
      <Dialog 
        open={isGoalsModalOpen || isEditingGoal} 
        onOpenChange={(open) => { 
          setIsGoalsModalOpen(open); 
          setIsEditingGoal(open); 
        }}
      >
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 border border-slate-200 shadow-2xl rounded-3xl">
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
            {/* Live Business Context Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <LineChart className="w-3.5 h-3.5 text-indigo-600" />
                  Synchronized Live Business Feeds (All 4 Pillars Considered)
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Auto-Injected to AI
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-0.5">
                <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-purple-600 block">Product Suite</span>
                  <span className="font-bold text-slate-900 block truncate">{productKPIs.totalCount} Products</span>
                  <span className="text-[10px] text-slate-500 block">{fmtINR(productKPIs.suiteMrr || salesKPIs.mrr)} MRR</span>
                </div>
                <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-indigo-600 block">Sales Tracker</span>
                  <span className="font-bold text-slate-900 block truncate">{fmtINR(salesKPIs.mrr)} MRR</span>
                  <span className="text-[10px] text-slate-500 block">{salesKPIs.wonCount} Deals ({salesKPIs.conversionRate.toFixed(0)}%)</span>
                </div>
                <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 block">Finance Suite</span>
                  <span className="font-bold text-slate-900 block truncate">{fmtINR(postMoney)}</span>
                  <span className="text-[10px] text-slate-500 block">{fmtPct(founderOwnership)} Equity</span>
                </div>
                <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-teal-600 block">Operations Hub</span>
                  <span className="font-bold text-slate-900 block truncate">{fmtINR(opsKPIs.cashBank)}</span>
                  <span className="text-[10px] text-rose-600 block">{opsKPIs.runway === 999 ? '∞' : `${Math.round(opsKPIs.runway)} mo`} Runway</span>
                </div>
              </div>
            </div>

            {/* Stage selection */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Startup Stage</Label>
              <Select value={stage} onValueChange={setStage} disabled={readOnly}>
                <SelectTrigger className="w-full h-11 border-slate-200 font-semibold rounded-full px-4">
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
                className="w-full text-sm font-medium p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                        className="p-3.5 text-left text-xs bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all border rounded-2xl font-medium text-slate-600 flex flex-col justify-between"
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
                <div className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-indigo-50 bg-indigo-50/10 hover:bg-indigo-50/20 transition-all">
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
                <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all rounded-2xl p-5 bg-slate-50/30 text-center cursor-pointer">
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
                className="w-full text-sm font-medium p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                className="flex-1 border-slate-300 font-bold h-11 gap-2 text-slate-700 hover:bg-slate-50 rounded-full shadow-xs"
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-sm gap-2 rounded-full shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="w-4 h-4" />
                Generate 12-Month Plan & Roadmap
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movable Floating Circle Bot Button for Roadmap Co-Pilot (Visible in Central Console) */}
      {!readOnly && strategicPlan && botPos && (
        <div
          style={{
            position: 'fixed',
            left: `${botPos.x}px`,
            top: `${botPos.y}px`,
            zIndex: 49,
            touchAction: 'none',
            userSelect: 'none',
          }}
          className="animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
        >
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ borderRadius: '9999px !important' }}
            className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-150 focus:outline-none cursor-grab active:cursor-grabbing border-2 border-indigo-300/60 ring-4 ring-indigo-500/20"
            title="Roadmap Co-Pilot (Click to chat, drag to move)"
          >
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </span>
            <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-200 pointer-events-none" />
            
            {/* Hover Tooltip Pill */}
            <span
              style={{ borderRadius: '9999px' }}
              className="absolute -top-7 right-0 px-3 py-1 bg-slate-950/95 text-indigo-200 text-[10px] font-bold tracking-tight whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-indigo-500/40"
            >
              Roadmap Co-Pilot (Drag me)
            </span>
          </button>
        </div>
      )}

      {/* Roadmap Co-Pilot Chat Dialog Modal */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-2xl w-[95vw] h-[85vh] max-h-[700px] flex flex-col p-0 border border-slate-200 shadow-2xl overflow-hidden rounded-3xl">
          <DialogHeader className="border-b bg-indigo-50/20 px-5 py-4 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                Roadmap Co-Pilot
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Discuss roadmap changes, constraints, or custom strategies with your growth advisor.
              </DialogDescription>
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
                className="text-slate-400 hover:text-rose-600 text-xs font-bold rounded-full px-3"
              >
                Reset Chat
              </Button>
            )}
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
            {/* Chat Messages List */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">How can I help with your roadmap?</h4>
                    <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                      Ask to change dates, focus areas, adjust targets, or customize priorities.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center pt-2 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={() => handleSendChatMessage(undefined, "I want to prioritize product development over sales outreach in Q2.")}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-xs font-semibold text-slate-700 transition-all shadow-2xs rounded-full text-left"
                    >
                      "Prioritize dev over sales in Q2"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendChatMessage(undefined, "We are short on runway, adjust the monthly milestones to be more conservative.")}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-xs font-semibold text-slate-700 transition-all shadow-2xs rounded-full text-left"
                    >
                      "Short on runway, make milestones conservative"
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3.5 text-xs leading-relaxed max-w-[85%] rounded-3xl ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
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
                <div className="flex gap-2 justify-start items-center p-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Co-pilot is thinking...</span>
                </div>
              )}
            </div>

            {/* Modification Suggestion Alert & Modify Button */}
            {latestModSuggestion && (
              <div className="p-3.5 mx-4 my-2 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-amber-900 uppercase block">RECOMMENDED REVISION</span>
                  <p className="text-xs font-bold text-slate-800 leading-normal">{latestModSuggestion}</p>
                </div>
                <Button
                  onClick={() => {
                    handleGeneratePlan(undefined, undefined, latestModSuggestion);
                    setIsChatOpen(false);
                  }}
                  disabled={aiLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 gap-1.5 shrink-0 px-4 rounded-full shadow-xs"
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
            <div className="p-3 bg-white border-t flex gap-2 items-center">
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
                className="bg-slate-50 border-slate-200 text-xs h-11 rounded-full px-4 focus-visible:ring-indigo-500 flex-1"
              />
              <Button
                size="icon"
                disabled={chatLoading || !chatMessage.trim()}
                onClick={() => handleSendChatMessage()}
                className="h-11 w-11 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 rounded-full shadow-sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
