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
import { fmtINR, fmtPct, fmtMult } from '@/lib/utils/formatters';
import { 
  BarChart3, Plus, Trash2, Edit2, Sparkles, Loader2, Target, 
  TrendingUp, Users, ArrowUpRight, DollarSign, Calendar, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Zap,
  Printer
} from 'lucide-react';
import { exportReportToPDF } from '@/lib/utils/pdfExport';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { salesAdvisorAssistant, SalesAdvisorOutput } from '@/ai/flows/sales-advisor-flow';
import { EZCirkitSalesTracker } from './EZCirkitSalesTracker';

interface SalesAnalyticsProps {
  userId: string;
  companyProfileId: string;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  activeEZCirkitTab?: string;
  onEZCirkitTabChange?: (tab: string) => void;
  readOnly?: boolean;
}

interface Deal {
  id: string;
  dealName: string;
  company: string;
  value: number;
  stage: 'lead' | 'contacted' | 'demo' | 'proposal' | 'won' | 'lost';
  probability: number;
  closeDate: string;
  sourceType?: 'manual' | 'lead' | 'workshop' | 'product-sale';
}

const STAGES = [
  { value: 'lead', label: 'Lead Generation', defaultProb: 10, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'contacted', label: 'Contacted', defaultProb: 30, color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'demo', label: 'Demo Completed', defaultProb: 50, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { value: 'proposal', label: 'Proposal Sent', defaultProb: 75, color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'won', label: 'Closed Won', defaultProb: 100, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'lost', label: 'Closed Lost', defaultProb: 0, color: 'bg-rose-50 text-rose-700 border-rose-100' },
];

export function SalesAnalytics({
  userId,
  companyProfileId,
  activeSubTab,
  onSubTabChange,
  activeEZCirkitTab,
  onEZCirkitTabChange,
  readOnly
}: SalesAnalyticsProps) {
  const firestore = useFirestore();

  // Firestore References
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

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

  // Filter Sales Reports Locally
  const salesReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.type === 'sales' || (r.advice && 'funnelBottlenecks' in r.advice));
  }, [reports]);

  // Tab States
  const [localActiveTab, setLocalActiveTab] = useState('ezcirkit');
  const activeTab = activeSubTab !== undefined ? activeSubTab : localActiveTab;
  const setActiveTab = onSubTabChange !== undefined ? onSubTabChange : setLocalActiveTab;

  // Form States
  const [dealName, setDealName] = useState('');
  const [company, setCompany] = useState('');
  const [value, setValue] = useState<number | ''>('');
  const [stage, setStage] = useState<'lead' | 'contacted' | 'demo' | 'proposal' | 'won' | 'lost'>('lead');
  const [probability, setProbability] = useState<number | ''>('');
  const [closeDate, setCloseDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Target Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [customTargetMRR, setCustomTargetMRR] = useState<number | ''>('');

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');



  // Derived CRM Data
  const manualPipeline = useMemo<Deal[]>(() => {
    return profile?.salesPipeline || [];
  }, [profile]);

  const deals = useMemo<Deal[]>(() => {
    // 1. Manual CRM Deals
    const manualDeals: Deal[] = manualPipeline.map((d: any) => ({
      ...d,
      sourceType: 'manual'
    }));

    // 2. EZLeads map to Deal
    const leadDeals: Deal[] = (profile?.ezLeads || []).map((l: any) => {
      let crmStage: 'lead' | 'contacted' | 'demo' | 'proposal' | 'won' | 'lost' = 'lead';
      if (l.status === 'contacted') crmStage = 'contacted';
      else if (l.status === 'meeting-scheduled') crmStage = 'demo';
      else if (l.status === 'proposal-sent' || l.status === 'follow-up' || l.status === 'negotiation') crmStage = 'proposal';
      else if (l.status === 'won') crmStage = 'won';
      else if (l.status === 'lost') crmStage = 'lost';

      const val = crmStage === 'won' ? (Number(l.actualRevenue) || Number(l.expectedRevenue) || 0) : (Number(l.expectedRevenue) || 0);

      let prob = 10;
      if (crmStage === 'contacted') prob = 30;
      else if (crmStage === 'demo') prob = 50;
      else if (crmStage === 'proposal') prob = 75;
      else if (crmStage === 'won') prob = 100;
      else if (crmStage === 'lost') prob = 0;

      return {
        id: `lead-${l.id}`,
        dealName: l.requirement || `Lead: ${l.organization}`,
        company: l.organization || 'Lead Client',
        value: val,
        stage: crmStage,
        probability: prob,
        closeDate: l.followUpDate || l.date || new Date().toISOString().split('T')[0],
        sourceType: 'lead' as const
      };
    });

    // 3. Workshops map to Deal
    const workshopDeals: Deal[] = (profile?.workshops || []).map((w: any) => {
      let crmStage: 'lead' | 'contacted' | 'demo' | 'proposal' | 'won' | 'lost' = 'proposal';
      if (w.status === 'completed') crmStage = 'won';
      else if (w.status === 'cancelled') crmStage = 'lost';
      else if (w.status === 'planned') crmStage = 'proposal';

      const val = Number(w.revenue || 0);
      let prob = 75;
      if (crmStage === 'won') prob = 100;
      else if (crmStage === 'lost') prob = 0;

      return {
        id: `workshop-${w.id}`,
        dealName: `Workshop: ${w.title || 'Untitled Session'}`,
        company: w.notes || 'Workshop Client',
        value: val,
        stage: crmStage,
        probability: prob,
        closeDate: w.date || new Date().toISOString().split('T')[0],
        sourceType: 'workshop' as const
      };
    });

    // 4. Product Sales map to Deal
    const productDeals: Deal[] = (profile?.ezProductSales || []).map((p: any) => {
      const val = Number(p.total || 0);
      let crmStage: 'lead' | 'contacted' | 'demo' | 'proposal' | 'won' | 'lost' = 'won';
      if (p.paymentStatus === 'refunded') crmStage = 'lost';

      return {
        id: `sale-${p.id}`,
        dealName: `Sale: ${p.product || 'EZCirkit Kit'}`,
        company: p.customer || 'Direct Buyer',
        value: val,
        stage: crmStage,
        probability: crmStage === 'won' ? 100 : 0,
        closeDate: p.date || new Date().toISOString().split('T')[0],
        sourceType: 'product-sale' as const
      };
    });

    return [...manualDeals, ...leadDeals, ...workshopDeals, ...productDeals];
  }, [profile, manualPipeline]);

  const targetMRR = useMemo(() => {
    return profile?.targetMRR || 1000000; // 10 L default
  }, [profile]);

  const pipelineKPIs = useMemo(() => {
    let totalPipeline = 0;
    let weightedPipeline = 0;
    let wonValue = 0;
    let wonCount = 0;
    let totalClosedCount = 0;

    deals.forEach(deal => {
      const val = Number(deal.value) || 0;
      const prob = Number(deal.probability) || 0;
      totalPipeline += val;
      weightedPipeline += (val * prob) / 100;

      if (deal.stage === 'won') {
        wonValue += val;
        wonCount++;
        totalClosedCount++;
      } else if (deal.stage === 'lost') {
        totalClosedCount++;
      }
    });

    const conversionRate = totalClosedCount > 0 ? (wonCount / totalClosedCount) * 100 : 0;
    const avgDealValue = deals.length > 0 ? totalPipeline / deals.length : 0;

    return {
      totalPipeline,
      weightedPipeline,
      wonValue,
      wonCount,
      conversionRate,
      avgDealValue
    };
  }, [deals]);

  // Stage Distribution for Funnel
  const stageStats = useMemo(() => {
    const stats: Record<string, { count: number; totalValue: number }> = {};
    STAGES.forEach(s => {
      stats[s.value] = { count: 0, totalValue: 0 };
    });

    deals.forEach(deal => {
      if (stats[deal.stage]) {
        stats[deal.stage].count++;
        stats[deal.stage].totalValue += Number(deal.value) || 0;
      }
    });

    return stats;
  }, [deals]);

  // Handlers
  const handleStageChange = (newStage: any) => {
    setStage(newStage);
    const stageInfo = STAGES.find(s => s.value === newStage);
    if (stageInfo) {
      setProbability(stageInfo.defaultProb);
    }
  };

  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!profileRef || !dealName || !value) return;

    const dealData: Deal = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      dealName,
      company: company || 'Self',
      value: Number(value) || 0,
      stage,
      probability: probability !== '' ? Number(probability) : 50,
      closeDate: closeDate || new Date().toISOString().split('T')[0]
    };

    let updatedPipeline: Deal[];
    if (editingId) {
      updatedPipeline = manualPipeline.map(d => d.id === editingId ? dealData : d);
    } else {
      updatedPipeline = [...manualPipeline, dealData];
    }

    // If deal stage is WON, update company's monthly revenue (MRR)
    // Let's add up all Won deals to see if we can update the mRevenue
    const totalWonMonthlyVal = updatedPipeline
      .filter(d => d.stage === 'won')
      .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    setDocumentNonBlocking(profileRef, { 
      salesPipeline: updatedPipeline,
      // If total won value is greater than zero, sync it as mRevenue for the overall finance app!
      mRevenue: totalWonMonthlyVal > 0 ? totalWonMonthlyVal : (profile?.mRevenue || 0)
    }, { merge: true });

    // Reset Form
    setDealName('');
    setCompany('');
    setValue('');
    setStage('lead');
    setProbability(10);
    setCloseDate('');
    setEditingId(null);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingId(deal.id);
    setDealName(deal.dealName);
    setCompany(deal.company);
    setValue(deal.value);
    setStage(deal.stage);
    setProbability(deal.probability);
    setCloseDate(deal.closeDate);
  };

  const handleDeleteDeal = (dealId: string) => {
    if (readOnly || !profileRef) return;
    const updatedPipeline = manualPipeline.filter(d => d.id !== dealId);
    
    const totalWonMonthlyVal = updatedPipeline
      .filter(d => d.stage === 'won')
      .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    setDocumentNonBlocking(profileRef, { 
      salesPipeline: updatedPipeline,
      mRevenue: totalWonMonthlyVal > 0 ? totalWonMonthlyVal : (profile?.mRevenue || 0)
    }, { merge: true });

    if (editingId === dealId) {
      setEditingId(null);
      setDealName('');
      setCompany('');
      setValue('');
      setStage('lead');
      setProbability(10);
      setCloseDate('');
    }
  };

  const handleUpdateTarget = () => {
    if (readOnly || !profileRef || customTargetMRR === '') return;
    setDocumentNonBlocking(profileRef, { targetMRR: Number(customTargetMRR) }, { merge: true });
    setShowSettings(false);
  };

  // AI Analyst Trigger
  const triggerAIAnalysis = async () => {
    if (readOnly || !profile || aiLoading) return;
    setAiLoading(true);
    try {
      const input = {
        companyName: profile.companyName || 'My Startup',
        stage: profile.stage || 'seed',
        industry: profile.industry || 'saas',
        monthlyRevenue: profile.mRevenue || 0,
        targetMRR: targetMRR,
        cac: profile.cac || 0,
        totalCustomers: profile.customers || 0,
        deals: deals.map(d => ({
          dealName: d.dealName || '',
          company: d.company || '',
          value: Number(d.value) || 0,
          stage: d.stage || 'lead',
          probability: Number(d.probability) || 0,
          closeDate: d.closeDate || '',
          sourceType: d.sourceType || 'manual'
        })),
        question: customQuestion || "",
        leads: profile?.ezLeads || [],
        workshops: profile?.workshops || [],
        productSales: profile?.ezProductSales || [],
        dailyActivities: profile?.ezDailyActivities || []
      };

      const result = await salesAdvisorAssistant(input);

      if (reportsRef) {
        addDocumentNonBlocking(reportsRef, {
          companyId: companyProfileId,
          createdAt: serverTimestamp(),
          inputSnapshot: input,
          advice: result,
          type: 'sales'
        });
      }

      setActiveReport({ advice: result, createdAt: { seconds: Date.now() / 1000 } });
      setCustomQuestion('');
    } catch (err) {
      console.error('Error generating sales AI advice:', err);
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
        <div class="section-title">Pipeline Bottlenecks</div>
        <ul>
          ${(advice.funnelBottlenecks || []).map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">Conversion Recommendations</div>
        <ul>
          ${(advice.conversionRecommendations || []).map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">Sales Velocity Tips</div>
        <ul>
          ${(advice.salesVelocityTips || []).map((tip: string) => `<li>${tip}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">Suggested Actions</div>
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
    
    exportReportToPDF('Sales Pipeline Audit Report', html);
  };

  const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || !reportsRef) return;
    deleteDocumentNonBlocking(doc(reportsRef, reportId));
    if (activeReport?.id === reportId) setActiveReport(null);
  };

  // Funnel calculations
  const funnelStages = STAGES.filter(s => s.value !== 'lost');
  const maxStageCount = Math.max(...funnelStages.map(s => stageStats[s.value]?.count || 0), 1);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {activeSubTab === undefined && (
          <div className="flex items-center justify-between border-b pb-3 mb-6 gap-4 flex-wrap">
            <TabsList className="bg-slate-100/80 p-1 rounded-full gap-0.5 border-none h-10">
              <TabsTrigger value="ezcirkit" className="rounded-full px-5 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
                <Zap className="w-3.5 h-3.5" /> EZCirkit Sales Tracker
              </TabsTrigger>
            </TabsList>
          </div>
        )}

        <TabsContent value="ezcirkit" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitSalesTracker
            userId={userId}
            companyProfileId={companyProfileId}
            activeSubTab={activeEZCirkitTab}
            onSubTabChange={onEZCirkitTabChange}
            readOnly={readOnly}
          />
        </TabsContent>

        <TabsContent value="crm" className="mt-0 focus-visible:outline-none">
      <div className="space-y-8">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2">
            Sales <span className="text-indigo-600">Analytics</span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Track deals, analyze stage conversion, and simulate growth milestones.
          </p>
        </div>

        {!readOnly && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-indigo-200 hover:bg-indigo-50"
              onClick={() => {
                setShowSettings(!showSettings);
                setCustomTargetMRR(targetMRR);
              }}
            >
              <Target className="w-4 h-4 mr-2 text-indigo-600" />
              Set Target: {fmtINR(targetMRR)}
            </Button>
          </div>
        )}
      </div>

      {showSettings && (
        <Card className="border-indigo-100 bg-indigo-50/20 max-w-md animate-in slide-in-from-top-4 duration-300">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-indigo-900">Target Monthly Revenue (MRR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-sm">₹</span>
                <Input 
                  type="number" 
                  className="pl-7" 
                  value={customTargetMRR} 
                  onChange={e => setCustomTargetMRR(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleUpdateTarget}>
                Save Target
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* KPI 1: ARR/MRR */}
        <Card className="border-2 shadow-sm border-indigo-100 bg-indigo-50/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest text-indigo-950">
              Won Revenue (MRR)
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-code font-black text-indigo-950 mb-1">
              {fmtINR(pipelineKPIs.wonValue)}
            </div>
            <p className="text-xs font-semibold text-muted-foreground flex justify-between">
              <span>ARR: {fmtINR(pipelineKPIs.wonValue * 12)}</span>
              <span className="font-bold text-indigo-600">Target: {fmtPct((pipelineKPIs.wonValue / targetMRR) * 100)}</span>
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((pipelineKPIs.wonValue / targetMRR) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Pipeline Value */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest">
              Total Active Pipeline
            </CardTitle>
            <BarChart3 className="w-5 h-5 opacity-55" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-code font-black text-slate-900 mb-1">
              {fmtINR(pipelineKPIs.totalPipeline)}
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Weighted: <span className="font-bold text-indigo-600">{fmtINR(pipelineKPIs.weightedPipeline)}</span> (by prob)
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Conversion Rate */}
        <Card className="border-2 shadow-sm border-emerald-100 bg-emerald-50/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest text-emerald-950">
              Win Rate (Won/Total)
            </CardTitle>
            <Users className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-code font-black text-emerald-950 mb-1">
              {pipelineKPIs.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Deals Won: <span className="font-bold text-emerald-600">{pipelineKPIs.wonCount}</span> / Total: {deals.length}
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Pipeline Health */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest">
              Avg Deal Size (ACV)
            </CardTitle>
            <DollarSign className="w-5 h-5 opacity-55" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-code font-black text-slate-900 mb-1">
              {fmtINR(pipelineKPIs.avgDealValue)}
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Active Deals Tracked: <span className="font-bold text-indigo-600">{deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length}</span>
            </p>
          </CardContent>
        </Card>

      </div>

      {/* 1. Horizontal CSS Funnel Visualizer */}
      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-2 border-b bg-slate-50/50">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>Sales Pipeline Funnel</span>
            <span className="text-xs font-semibold text-indigo-600">Horizontal Stage Flow</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-stretch gap-4 justify-between">
            {funnelStages.map((fs, idx) => {
              const count = stageStats[fs.value]?.count || 0;
              const totalVal = stageStats[fs.value]?.totalValue || 0;
              // Calculate decreasing height percentage to make it look like a horizontal tapering funnel
              const heightPercent = Math.max(100 - idx * 18, 28);
              
              const stageStyles = {
                lead: 'bg-slate-50 border-slate-200 text-slate-800',
                contacted: 'bg-blue-50 border-blue-200 text-blue-800',
                demo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                proposal: 'bg-amber-50 border-amber-200 text-amber-800',
                won: 'bg-emerald-50 border-emerald-200 text-emerald-800',
              }[fs.value as 'lead' | 'contacted' | 'demo' | 'proposal' | 'won'] || 'bg-slate-50 border-slate-200';

              const barColor = {
                lead: 'bg-slate-500',
                contacted: 'bg-blue-500',
                demo: 'bg-indigo-500',
                proposal: 'bg-amber-500',
                won: 'bg-emerald-500'
              }[fs.value as 'lead' | 'contacted' | 'demo' | 'proposal' | 'won'] || 'bg-indigo-600';

              return (
                <React.Fragment key={fs.value}>
                  {idx > 0 && (
                    <div className="hidden md:flex items-center justify-center text-slate-350 shrink-0">
                      <ChevronRight className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
                  
                  <div className={`flex-1 min-w-[140px] flex flex-col justify-between p-4 rounded-xl border hover:shadow-md transition-all duration-300 ${stageStyles}`}>
                    <div className="space-y-1">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">{fs.label}</div>
                      <div className="text-xl font-code font-black">{count} {count === 1 ? 'deal' : 'deals'}</div>
                      <div className="text-xs font-bold font-code opacity-80">{fmtINR(totalVal)}</div>
                    </div>
                    
                    <div className="mt-4 flex items-end justify-center h-12 w-full bg-black/5 rounded-lg p-1 border border-dashed border-black/10">
                      <div 
                        className={`${barColor} w-full rounded flex items-center justify-center text-[10px] text-white font-black transition-all duration-500 shadow-sm`}
                        style={{ 
                          height: `${heightPercent}%`,
                          opacity: 0.85
                        }}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Deal Modal Dialog */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) { setEditingId(null); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Sales Deal</DialogTitle>
            <DialogDescription>
              Update this opportunity's details and sales stage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDeal} className="space-y-4">
            <div className="space-y-1">
              <Label className="font-bold text-xs">Deal / Opportunity Name</Label>
              <Input 
                placeholder="e.g. Enterprise License..."
                value={dealName} 
                onChange={e => setDealName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Company Name</Label>
                <Input 
                  placeholder="e.g. Acme Corp..."
                  value={company} 
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Value (₹)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 50000"
                  value={value} 
                  onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Stage</Label>
                <Select value={stage} onValueChange={handleStageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Probability (%)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100"
                  placeholder="e.g. 20"
                  value={probability} 
                  onChange={e => setProbability(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs">Target Close Date</Label>
              <Input 
                type="date"
                value={closeDate} 
                onChange={e => setCloseDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  setEditingId(null);
                  setDealName('');
                  setCompany('');
                  setValue('');
                  setStage('lead');
                  setProbability(10);
                  setCloseDate('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Update Deal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CRM Opportunity Board */}
      <div className="space-y-6">
        
        {/* CRM Deal list */}
        <Card className="border shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base font-black text-slate-900">
              CRM Opportunity Board
            </CardTitle>
            <CardDescription>
              Active opportunities across all sales cycles. Click edit to advance deals.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {deals.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-10 h-10 text-indigo-200" />
                <p className="text-sm font-semibold">Your CRM pipeline is empty. Track deals using Lead Tracker, Workshop Tracker, or Product Sales.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-black text-xs uppercase text-slate-500">Deal & Company</TableHead>
                      <TableHead className="font-black text-xs uppercase text-slate-500">Value (₹)</TableHead>
                      <TableHead className="font-black text-xs uppercase text-slate-500">Stage</TableHead>
                      <TableHead className="font-black text-xs uppercase text-slate-500">Probability</TableHead>
                      <TableHead className="font-black text-xs uppercase text-slate-500">Est. Close</TableHead>
                      {!readOnly && <TableHead className="w-20 text-right"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map(deal => {
                      const stageInfo = STAGES.find(s => s.value === deal.stage);
                      const isManual = deal.sourceType === 'manual';
                      return (
                        <TableRow key={deal.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-bold py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-slate-900">{deal.dealName}</div>
                              {deal.sourceType && deal.sourceType !== 'manual' && (
                                <Badge className="bg-slate-100 text-slate-700 text-[8px] uppercase tracking-wider font-extrabold border border-slate-200 rounded-sm px-1.5 py-0.5">
                                  {deal.sourceType}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">{deal.company}</div>
                          </TableCell>
                          <TableCell className="font-code font-black text-slate-800">
                            {fmtINR(deal.value)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`border uppercase text-[9px] font-black ${stageInfo?.color}`}>
                              {stageInfo?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-slate-700">
                            {deal.probability}%
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">
                            {deal.closeDate}
                          </TableCell>
                          {!readOnly && (
                            <TableCell className="text-right py-4">
                              <div className="flex justify-end items-center gap-1.5 pr-2">
                                {isManual ? (
                                  <>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-full"
                                      onClick={() => handleEditDeal(deal)}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full"
                                      onClick={() => handleDeleteDeal(deal.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-bold italic px-2 whitespace-nowrap bg-slate-50 rounded-md py-1 border border-slate-100">
                                    Tracked via {deal.sourceType === 'lead' ? 'Lead Tracker' : deal.sourceType === 'workshop' ? 'Workshop Tracker' : 'Product Sales'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
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

      {/* Sales AI Advisor Section */}
      <div className="space-y-6 pt-10 border-t border-slate-100">
        <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          AI Sales Advisor
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* AI Trigger Control */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 border-indigo-100 bg-indigo-50/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Evaluate Funnel Velocity
                </CardTitle>
                <CardDescription>
                  Generate AI recommendations to close bottlenecks in your CRM pipeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Custom Inquiry (Optional)</Label>
                  <textarea 
                    placeholder="e.g. How can I speed up deals currently stalled in Demo Completed phase?"
                    rows={3}
                    className="w-full text-sm p-3 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={customQuestion}
                    onChange={e => setCustomQuestion(e.target.value)}
                    disabled={readOnly}
                  />
                </div>

                <Button 
                  onClick={triggerAIAnalysis}
                  disabled={aiLoading || deals.length === 0 || readOnly}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 rounded-full py-5"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiLoading ? 'Analyzing Pipeline...' : 'Run Sales Audit'}
                </Button>
                {deals.length === 0 && (
                  <p className="text-[10px] text-rose-500 text-center font-bold">Add at least one deal to CRM to unlock AI Audit</p>
                )}
              </CardContent>
            </Card>

            {/* AI History */}
            {salesReports.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-xs uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Sales Audit History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y max-h-[220px] overflow-y-auto">
                  {salesReports.map(report => {
                    const date = report.createdAt ? new Date(report.createdAt.seconds * 1000) : new Date();
                    const label = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div 
                        key={report.id}
                        onClick={() => setActiveReport(report)}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 flex justify-between items-center transition-colors font-medium ${activeReport?.id === report.id ? 'bg-indigo-50/50 font-bold border-l-4 border-indigo-600' : ''}`}
                      >
                        <span className="truncate">{label}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[8px] h-4 bg-white border-indigo-200 text-indigo-700">Audit</Badge>
                          {!readOnly && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-slate-400 hover:text-rose-600"
                              onClick={(e) => handleDeleteReport(report.id, e)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
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
              <Card className="border-2 border-indigo-100 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="bg-indigo-650 bg-indigo-900 text-white p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
                      Sales Pipeline Audit Report
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 font-mono">
                        Generated {activeReport.createdAt ? new Date(activeReport.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white hover:bg-slate-100 text-indigo-900 text-[10px] font-black uppercase tracking-wider px-3 h-7 gap-1.5 rounded-md border border-indigo-200"
                        onClick={handleExportPDF}
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-650" /> Export PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Summary */}
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium">
                    <p className="text-sm italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-dashed border-indigo-200">
                      "{activeReport.advice?.summary || 'No summary available.'}"
                    </p>
                  </div>

                  {/* Bottlenecks & Conversion Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-xs uppercase font-black tracking-widest text-rose-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Pipeline Bottlenecks
                      </h4>
                      <ul className="space-y-2">
                        {(activeReport.advice?.funnelBottlenecks || []).map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 leading-relaxed font-semibold flex gap-1.5 items-start">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs uppercase font-black tracking-widest text-indigo-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Conversion Accelerators
                      </h4>
                      <ul className="space-y-2">
                        {(activeReport.advice?.conversionRecommendations || []).map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 leading-relaxed font-semibold flex gap-1.5 items-start">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Sales Velocity Tips */}
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-3">
                    <h4 className="text-xs uppercase font-black tracking-widest text-slate-800">
                      Sales Cycle Velocity Tips
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(activeReport.advice?.salesVelocityTips || []).map((tip: string, i: number) => (
                        <div key={i} className="p-3 bg-white border rounded-lg text-xs leading-relaxed text-slate-600 font-semibold flex gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-indigo-900 text-white p-5 rounded-xl shadow-inner space-y-4">
                    <h4 className="text-xs uppercase font-black tracking-[0.2em] text-indigo-200">
                      Immediate Action Plan
                    </h4>
                    <div className="space-y-2.5">
                      {(activeReport.advice?.suggestedActions || []).map((action: string, i: number) => (
                        <div key={i} className="flex gap-3 text-xs font-bold items-center">
                          <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] shrink-0 font-black">
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
                  <Sparkles className="w-8 h-8 mx-auto text-indigo-200" />
                  <p className="text-sm font-semibold">No Sales audit active.</p>
                  <p className="text-xs">Select a historical audit from history or click "Run Sales Audit" to evaluate your pipeline.</p>
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
