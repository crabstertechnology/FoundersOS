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
  Search, Clock, ArrowRight, ChevronLeft, Download, ShoppingCart, Box, Lightbulb, Cpu, Zap, Briefcase, GraduationCap, Settings, CheckSquare, Flag
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

  // UI/UX state for Central Console redesign
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const [selectedQuarterIdx, setSelectedQuarterIdx] = useState<number | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isHistoryListModalOpen, setIsHistoryListModalOpen] = useState(false);
  const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    { month: "Month 1", milestone: "EZCirkit Product Standardization & Pre-Order Storefront Launch", metrics: ["BOM cost: ≤ ₹750", "Curriculum downloads: 150", "Paid pre-orders: 10"] },
    { month: "Month 2", milestone: "First Production Batch Assembly & Beta School Testing", metrics: ["Batch output: 50 units", "Beta testers: 25", "User satisfaction: 90%"] },
    { month: "Month 3", milestone: "Commercial Deliveries & Detach Sensor Architecture Freeze", metrics: ["Delivered kits: 50", "MRR: ₹50,000", "Sensor precision: 99%"] },
    { month: "Month 4", milestone: "Institutional Outreach & Detach Prototype Assembly", metrics: ["Schools contacted: 30", "Demos completed: 12", "Prototype boards: 5"] },
    { month: "Month 5", milestone: "Curriculum Integration & B2B Pilot Deployments", metrics: ["Active schools: 8", "Student engagement: 85%", "Pilot LOIs: 5"] },
    { month: "Month 6", milestone: "Mid-Year Financial Audit & Investor Teaser Circulation", metrics: ["Gross margin: 60%", "Runway: 12+ mo", "Investor meetings: 15"] },
    { month: "Month 7", milestone: "Detach Pre-Compliance Testing & Software Platform Launch", metrics: ["EMC compliance: Pass", "Cloud platform latency: <100ms", "Waitlist: 300"] },
    { month: "Month 8", milestone: "B2B Pilot Conversion to Annual Multi-Kit Contracts", metrics: ["Annual contracts: 6", "Contract ARR: ₹600,000", "Renewal rate: 95%"] },
    { month: "Month 9", milestone: "Investor Data Room Finalization & Pitch Roadshow", metrics: ["Diligence complete: 100%", "Term sheet targets: 3", "Committed angel funds: ₹10L"] },
    { month: "Month 10", milestone: "Seed Round Closing & Detach Tooling Orders", metrics: ["Capital closed: ₹3,000,000", "Tooling vendor: Selected", "Lead time: 6 weeks"] },
    { month: "Month 11", milestone: "Manufacturing Scale-up & Core Hiring in Ops and Sales", metrics: ["Assembly throughput: 200/mo", "New hires: 2", "Inventory buffer: 30 days"] },
    { month: "Month 12", milestone: "Annual Target Review, Detach Commercial Launch & Q1 Planning", metrics: ["Annual revenue: ₹1,500,000", "Active student users: 2,500", "Net margin: Positive"] },
  ];

  const currentMonthData = (() => {
    const raw = strategicPlan?.monthlyMilestones?.[selectedMonthIdx];
    const def = defaultMilestones[selectedMonthIdx] || defaultMilestones[0];
    const milestoneTitle = raw?.milestone || raw?.objective || def.milestone;
    const metricsRaw = (raw?.keyMetrics && raw.keyMetrics.length > 0) ? raw.keyMetrics : def.metrics;
    
    const m1 = (metricsRaw[0] || "BOM cost: ≤ ₹750").split(/[:=]/);
    const m2 = (metricsRaw[1] || "Curriculum downloads: 150").split(/[:=]/);
    const m3 = (metricsRaw[2] || "Paid pre-orders: 10").split(/[:=]/);

    return {
      title: milestoneTitle,
      metric1: { label: m1[0]?.trim() || "BOM cost", value: m1.slice(1).join(':').trim() || "≤ ₹750" },
      metric2: { label: m2[0]?.trim() || "Curriculum downloads", value: m2.slice(1).join(':').trim() || "150" },
      metric3: { label: m3[0]?.trim() || "Paid pre-orders", value: m3.slice(1).join(':').trim() || "10" }
    };
  })();

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

  const filteredQuarters = useMemo(() => {
    if (!searchTerm.trim()) return quartersList;
    const term = searchTerm.toLowerCase();
    return quartersList.filter(q => 
      q.period.toLowerCase().includes(term) ||
      q.focus.toLowerCase().includes(term) ||
      q.objectives.some((obj: string) => obj.toLowerCase().includes(term))
    );
  }, [quartersList, searchTerm]);

  const currentMonthName = `Month ${selectedMonthIdx + 1}`;
  const isSelectedMonthCompleted = completedMonthlyMilestones.includes(currentMonthName) || completedMonthlyMilestones.includes(`M${selectedMonthIdx + 1}`);
  const isSelectedMonthActive = selectedMonthIdx === currentMonthIndex;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-12">
      
      {/* Top Header matching AI Strategic Planner visual UI/UX */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pt-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0 mt-0.5">
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

        {/* Search, History & Export actions (Notification bell & Profile chip removed as requested) */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roadmap & milestones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-44 md:w-56 shadow-xs font-medium"
            />
          </div>

          {/* Plan History Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryListModalOpen(true)}
            className="h-8 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 px-3 shadow-xs"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Plan History
          </Button>

          {/* Export Button */}
          <Button
            size="sm"
            onClick={handleExportPlan}
            className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 px-3.5 shadow-xs"
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
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Finance Suite
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
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
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Sales Tracker
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
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
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Operations Hub
            </span>
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
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
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Product Suite
            </span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
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
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between group shadow-2xs col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">
              Marketing Hub
            </span>
            <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
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
        <div className="relative z-10 max-w-2xl space-y-3">
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
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 ml-1 transition-colors"
              >
                Edit Strategy
              </button>
            )}
          </div>
        </div>

        {/* Right: Glassmorphic Goal Box */}
        <div className="relative z-10 w-full sm:w-auto self-stretch sm:self-auto shrink-0">
          <div className="bg-white/85 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm min-w-[210px] space-y-1.5">
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

      {/* 12-Month Roadmap Card */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6 md:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">12-Month Roadmap</h3>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Click each quarter to view milestones and key focus areas.
            </span>
          </div>
        </div>

        {/* Horizontal Sequence of 4 Quarters with Connecting Arrows */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {filteredQuarters.length === 0 ? (
            <div className="w-full py-8 text-center text-xs font-semibold text-slate-500 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              No roadmap quarters match "{searchTerm}". Try clearing your search.
            </div>
          ) : (
            filteredQuarters.map((q, qIdx) => {
              const isSelected = selectedQuarterIdx === qIdx;
              const themeConfig = [
                { color: 'bg-indigo-500 text-white', ring: 'border-indigo-200 hover:border-indigo-400', icon: Rocket },
                { color: 'bg-sky-500 text-white', ring: 'border-sky-200 hover:border-sky-400', icon: Users },
                { color: 'bg-amber-500 text-white', ring: 'border-amber-200 hover:border-amber-400', icon: FileText },
                { color: 'bg-emerald-500 text-white', ring: 'border-emerald-200 hover:border-emerald-400', icon: TrendingUp },
              ][qIdx % 4];
              const Icon = themeConfig.icon;

              return (
                <React.Fragment key={qIdx}>
                  <div
                    onClick={() => setSelectedQuarterIdx(qIdx)}
                    className={`flex-1 w-full p-4 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md flex flex-col justify-between min-h-[140px] relative group ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-sm' : themeConfig.ring
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${themeConfig.color} flex items-center justify-center shrink-0 shadow-2xs`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="leading-tight">
                          <span className="text-[11px] font-black text-slate-900 block">{`Q${qIdx + 1}`}</span>
                          <span className="text-[9px] font-semibold text-slate-400 block">{`Months ${qIdx * 3 + 1}–${(qIdx + 1) * 3}`}</span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                        {q.focus}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-auto border-t border-slate-100">
                      <span className="text-[11px] font-extrabold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {Math.round(q.progress)}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {qIdx < filteredQuarters.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-300 hidden md:block shrink-0" />
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* Middle Two-Column Grid: Monthly Milestones (Left) & AI Strategic Insight (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Monthly Milestones (12 Months) - approx 64% width */}
        <div className="lg:col-span-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6 md:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Monthly Milestones (12 Months)</h3>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> Current
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300" /> Upcoming
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
              </span>
            </div>
          </div>

          {/* Stepper Timeline M1 to M12 */}
          <div className="relative pt-2 pb-1">
            <div className="absolute top-6 left-3 right-3 h-0.5 bg-slate-100 z-0" />
            <div className="relative z-10 flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-none">
              {Array.from({ length: 12 }).map((_, idx) => {
                const mLabel = `M${idx + 1}`;
                const mFullName = `Month ${idx + 1}`;
                const isSelected = selectedMonthIdx === idx;
                const isCompleted = completedMonthlyMilestones.includes(mFullName) || completedMonthlyMilestones.includes(mLabel);
                const isCurrent = idx === currentMonthIndex;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedMonthIdx(idx)}
                      className={`w-7 h-7 rounded-full text-[10px] font-black transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm scale-110'
                          : isCompleted
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : isCurrent
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 text-white" /> : mLabel}
                    </button>
                    {isCurrent && (
                      <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-tighter">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Month Detail Card */}
          <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-indigo-600 shrink-0" />
                <h4 className="text-sm font-black text-slate-900">
                  {currentMonthName}
                </h4>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  isSelectedMonthCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : isSelectedMonthActive
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {isSelectedMonthCompleted ? 'Completed' : isSelectedMonthActive ? 'Current' : 'Upcoming'}
                </span>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={isSelectedMonthCompleted ? "outline" : "default"}
                    onClick={() => handleToggleMonthlyMilestone(currentMonthName, selectedMonthIdx)}
                    className={`h-7 text-xs font-bold px-3 rounded-lg ${
                      isSelectedMonthCompleted
                        ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isSelectedMonthCompleted ? 'Mark Incomplete' : 'Mark Achieved'}
                  </Button>
                </div>
              )}
            </div>

            <p className="text-xs font-bold text-slate-800 pl-3 leading-snug">
              {currentMonthData.title}
            </p>

            {/* 3 Metric Target Cards & Next Month Chevron */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 w-full">
                {/* Metric 1 */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/60 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Box className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[9px] font-bold text-slate-400 block truncate">{currentMonthData.metric1.label}</span>
                    <span className="text-xs font-extrabold text-slate-900 block truncate">{currentMonthData.metric1.value}</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/60 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[9px] font-bold text-slate-400 block truncate">{currentMonthData.metric2.label}</span>
                    <span className="text-xs font-extrabold text-slate-900 block truncate">{currentMonthData.metric2.value}</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/60 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[9px] font-bold text-slate-400 block truncate">{currentMonthData.metric3.label}</span>
                    <span className="text-xs font-extrabold text-slate-900 block truncate">{currentMonthData.metric3.value}</span>
                  </div>
                </div>
              </div>

              {/* Next Month Button */}
              <button
                type="button"
                onClick={() => setSelectedMonthIdx((prev) => (prev + 1) % 12)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 shadow-2xs shrink-0 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Strategic Insight - approx 36% width */}
        <div className="lg:col-span-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs p-6 md:p-7 flex flex-col justify-between space-y-4">
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

            {/* Highlight Callout Box with Amber Lightbulb */}
            <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs font-bold text-slate-800 leading-snug">
                {profile?.productSuiteRecommendations?.executiveSummary || 
                 profile?.productSuiteRecommendations?.resourceAllocation || 
                 `Prioritize ${activeProducts[0]?.name || "core revenue drivers"} for immediate traction while maintaining structured validation on secondary pipelines.`}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            type="button"
            onClick={() => hasPlan ? setIsChatOpen(true) : setIsGoalsModalOpen(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5 shadow-sm mt-3"
          >
            {hasPlan ? "Consult Roadmap Co-Pilot" : "Generate 12-Month Plan"} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Bottom Three-Column Grid: Strategic Focus | Weekly Adaptation Hub | Investor Weekly Report */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Strategic Focus */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs p-5 md:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Strategic Focus</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('product')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5"
              >
                All Products <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Product 1 */}
              <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900 truncate">{activeProducts[0]?.name || "Core Product"}</h5>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight line-clamp-2">
                      {activeProducts[0]?.focus || "Early revenue & market traction"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${activeProducts[0]?.progress || 75}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => onNavigate('product')}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    >
                      View Details <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-slate-600 font-extrabold">{activeProducts[0]?.progress || 75}%</span>
                  </div>
                </div>
              </div>

              {/* Product 2 */}
              <div className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900 truncate">{activeProducts[1]?.name || "Secondary Product"}</h5>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight line-clamp-2">
                      {activeProducts[1]?.focus || "Validation & waitlist growth"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${100 - (activeProducts[0]?.progress || 75)}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => onNavigate('product')}
                      className="text-sky-600 hover:text-sky-800 flex items-center gap-0.5"
                    >
                      View Details <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-slate-600 font-extrabold">{100 - (activeProducts[0]?.progress || 75)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
              className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none bg-slate-50/50 placeholder-slate-400"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-4 rounded-xl gap-1.5 shadow-xs"
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-7 px-2.5 rounded-lg gap-1 shadow-xs"
              >
                {weeklyReportLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate Report"} <ArrowRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Clickable Feature Category Chips - Live Sync to Sub-Suites */}
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => onNavigate('leads')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                title="View CRM Leads"
              >
                <Users className="w-2.5 h-2.5" /> CRM
              </button>
              <button
                type="button"
                onClick={() => onNavigate('workshops')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 transition-colors"
                title="View Workshops"
              >
                <GraduationCap className="w-2.5 h-2.5" /> Workshops
              </button>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                title="View Sales Analytics"
              >
                <TrendingUp className="w-2.5 h-2.5" /> Sales
              </button>
              <button
                type="button"
                onClick={() => onNavigate('operations')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                title="View Operations"
              >
                <Settings className="w-2.5 h-2.5" /> Operations
              </button>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 transition-colors"
                title="View Tasks"
              >
                <CheckSquare className="w-2.5 h-2.5" /> Tasks
              </button>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors"
                title="View Daily Activity"
              >
                <MessageSquare className="w-2.5 h-2.5" /> Feedback
              </button>
            </div>

            {/* Status Card */}
            <div
              onClick={() => setIsWeeklyReportModalOpen(true)}
              className="p-3 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
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
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed rounded-2xl">
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
                        className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
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
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
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
                    <li key={oIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-800 flex items-start gap-2.5">
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
            <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
              <span className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {showHistory ? "Viewing Saved History" : "Report Editor"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistory(!showHistory)}
                  className="h-7 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  {showHistory ? "Back to Editor" : `Saved History (${(weeklyReportsHistory || []).length})`}
                </Button>
                {weeklyReport && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyReport}
                    className="h-7 text-xs font-bold gap-1 bg-white border-indigo-200 text-indigo-700"
                  >
                    {isCopied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                )}
              </div>
            </div>

            {weeklyReport ? (
              <div className="space-y-3">
                <textarea
                  className="w-full bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed min-h-[250px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={weeklyReport}
                  onChange={(e) => setWeeklyReport(e.target.value)}
                  placeholder="Edit your weekly report here..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleSaveWeeklyReport}
                    disabled={isSavingReport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-xl gap-1.5"
                  >
                    {reportSavedSuccess ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save Report</>}
                  </Button>
                  <Button
                    onClick={handleGenerateWeeklyReport}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold h-9 text-xs rounded-xl gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <Mail className="w-8 h-8 text-indigo-600 mx-auto" />
                <h5 className="text-xs font-bold text-slate-800">No report generated yet</h5>
                <Button
                  onClick={handleGenerateWeeklyReport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl gap-1.5"
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
            {/* Live Business Context Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <LineChart className="w-3.5 h-3.5 text-indigo-600" />
                  Synchronized Live Business Feeds (All 4 Pillars Considered)
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Auto-Injected to AI
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-0.5">
                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-purple-600 block">Product Suite</span>
                  <span className="font-bold text-slate-900 block truncate">{productKPIs.totalCount} Products</span>
                  <span className="text-[10px] text-slate-500 block">{fmtINR(productKPIs.suiteMrr || salesKPIs.mrr)} MRR</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-indigo-600 block">Sales Tracker</span>
                  <span className="font-bold text-slate-900 block truncate">{fmtINR(salesKPIs.mrr)} MRR</span>
                  <span className="text-[10px] text-slate-500 block">{salesKPIs.wonCount} Deals ({salesKPIs.conversionRate.toFixed(0)}%)</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 block">Finance Suite</span>
                  <span className="font-bold text-slate-900 block truncate">{fmtINR(postMoney)}</span>
                  <span className="text-[10px] text-slate-500 block">{fmtPct(founderOwnership)} Equity</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
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
              style={{ borderRadius: '4px' }}
              className="absolute -top-7 right-0 px-2.5 py-0.5 bg-slate-950/95 text-indigo-200 text-[10px] font-bold tracking-tight whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-indigo-500/40"
            >
              Roadmap Co-Pilot (Drag me)
            </span>
          </button>
        </div>
      )}

      {/* Roadmap Co-Pilot Chat Dialog Modal */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-2xl w-[95vw] h-[85vh] max-h-[700px] flex flex-col p-0 border border-slate-200 shadow-2xl overflow-hidden rounded-none">
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
                className="text-slate-400 hover:text-rose-600 text-xs font-bold"
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
                      className="px-3 py-2 border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-xs font-semibold text-slate-700 transition-all shadow-sm text-left"
                    >
                      "Prioritize dev over sales in Q2"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendChatMessage(undefined, "We are short on runway, adjust the monthly milestones to be more conservative.")}
                      className="px-3 py-2 border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-xs font-semibold text-slate-700 transition-all shadow-sm text-left"
                    >
                      "Short on runway, make milestones conservative"
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 text-xs leading-relaxed max-w-[85%] ${
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
              <div className="p-3.5 bg-amber-50 border-t border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
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
            <div className="p-3 bg-white border-t flex gap-2">
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
                className="bg-slate-50 border-slate-200 text-xs h-10 rounded-none focus-visible:ring-indigo-500"
              />
              <Button
                size="icon"
                disabled={chatLoading || !chatMessage.trim()}
                onClick={() => handleSendChatMessage()}
                className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 rounded-none"
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
