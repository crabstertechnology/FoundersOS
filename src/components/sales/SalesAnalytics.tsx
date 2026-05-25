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
  BarChart3, Plus, Trash2, Edit2, Sparkles, Loader2, Target, 
  TrendingUp, Users, ArrowUpRight, DollarSign, Calendar, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Zap
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { salesAdvisorAssistant, SalesAdvisorOutput } from '@/ai/flows/sales-advisor-flow';
import { EZCirkitSalesTracker } from './EZCirkitSalesTracker';

interface SalesAnalyticsProps {
  userId: string;
  companyProfileId: string;
}

interface Deal {
  id: string;
  dealName: string;
  company: string;
  value: number;
  stage: 'lead' | 'contacted' | 'demo' | 'proposal' | 'won' | 'lost';
  probability: number;
  closeDate: string;
}

const STAGES = [
  { value: 'lead', label: 'Lead Generation', defaultProb: 10, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'contacted', label: 'Contacted', defaultProb: 30, color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'demo', label: 'Demo Completed', defaultProb: 50, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { value: 'proposal', label: 'Proposal Sent', defaultProb: 75, color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'won', label: 'Closed Won', defaultProb: 100, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'lost', label: 'Closed Lost', defaultProb: 0, color: 'bg-rose-50 text-rose-700 border-rose-100' },
];

export function SalesAnalytics({ userId, companyProfileId }: SalesAnalyticsProps) {
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

  // Forecast Simulator States
  const [simTargetMRR, setSimTargetMRR] = useState<number>(1000000); // 10 L default
  const [simAvgDealSize, setSimAvgDealSize] = useState<number>(150000);
  const [simConversionRate, setSimConversionRate] = useState<number>(20);

  // Derived CRM Data
  const deals = useMemo<Deal[]>(() => {
    return profile?.salesPipeline || [];
  }, [profile]);

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
      updatedPipeline = deals.map(d => d.id === editingId ? dealData : d);
    } else {
      updatedPipeline = [...deals, dealData];
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
    if (!profileRef) return;
    const updatedPipeline = deals.filter(d => d.id !== dealId);
    
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
    if (!profileRef || customTargetMRR === '') return;
    setDocumentNonBlocking(profileRef, { targetMRR: Number(customTargetMRR) }, { merge: true });
    setShowSettings(false);
  };

  // AI Analyst Trigger
  const triggerAIAnalysis = async () => {
    if (!profile || aiLoading) return;
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
          dealName: d.dealName,
          company: d.company,
          value: Number(d.value) || 0,
          stage: d.stage,
          probability: Number(d.probability) || 0,
          closeDate: d.closeDate
        })),
        question: customQuestion || undefined
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

  const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reportsRef) return;
    deleteDocumentNonBlocking(doc(reportsRef, reportId));
    if (activeReport?.id === reportId) setActiveReport(null);
  };

  // Funnel calculations
  const funnelStages = STAGES.filter(s => s.value !== 'lost');
  const maxStageCount = Math.max(...funnelStages.map(s => stageStats[s.value]?.count || 0), 1);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      <Tabs defaultValue="crm" className="w-full">
        <div className="flex items-center justify-between border-b pb-3 mb-6 gap-4 flex-wrap">
          <TabsList className="bg-slate-100/80 p-1 rounded-full gap-0.5 border-none h-10">
            <TabsTrigger value="crm" className="rounded-full px-5 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> CRM Pipeline
            </TabsTrigger>
            <TabsTrigger value="ezcirkit" className="rounded-full px-5 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
              <Zap className="w-3.5 h-3.5" /> EZCirkit Sales Tracker
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ezcirkit" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitSalesTracker userId={userId} companyProfileId={companyProfileId} />
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

      {/* Main Layout: CRM & Funnel Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Deal Input & Funnel Chart */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* CRM Form */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                {editingId ? 'Edit Sales Deal' : 'Add New Sales Deal'}
              </CardTitle>
              <CardDescription>
                Track a lead through your pipeline phases.
              </CardDescription>
            </CardHeader>
            <CardContent>
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

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    {editingId ? 'Update Deal' : 'Add Opportunity'}
                  </Button>
                  {editingId && (
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
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* CSS Funnel Visualizer */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Sales Pipeline Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex flex-col gap-3">
                {funnelStages.map((fs, idx) => {
                  const count = stageStats[fs.value]?.count || 0;
                  const totalVal = stageStats[fs.value]?.totalValue || 0;
                  const ratio = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
                  // Calculate decreasing width to make it look like a funnel
                  const widthPercent = Math.max(100 - idx * 15, 30);
                  
                  return (
                    <div key={fs.value} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{fs.label}</span>
                        <span className="font-mono text-indigo-600">{count} deals ({fmtINR(totalVal)})</span>
                      </div>
                      <div className="flex justify-center w-full bg-slate-50 p-1 rounded-lg border border-dashed">
                        <div 
                          className="bg-indigo-600/80 h-6 rounded flex items-center justify-center text-[10px] text-white font-black transition-all duration-500 shadow-sm"
                          style={{ 
                            width: `${widthPercent}%`,
                            opacity: 0.4 + (idx * 0.15) // Gradient effect
                          }}
                        >
                          {count > 0 ? `${count}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CRM Deal Tracker Table */}
        <div className="lg:col-span-2 space-y-6">
          
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
                  <p className="text-sm font-semibold">Your CRM pipeline is empty. Add deals on the left to start tracking sales.</p>
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
                        <TableHead className="w-20 text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map(deal => {
                        const stageInfo = STAGES.find(s => s.value === deal.stage);
                        return (
                          <TableRow key={deal.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-bold py-4">
                              <div className="text-slate-900">{deal.dealName}</div>
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
                            <TableCell className="text-right py-4">
                              <div className="flex justify-end gap-1.5 pr-2">
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

          {/* Forecasting Calculator */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-black text-slate-900">
                Sales Target & Pipeline Gap Forecast
              </CardTitle>
              <CardDescription>
                Simulate how many opportunities you need to close in order to reach your MRR goals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Target MRR (₹)</Label>
                  <Input 
                    type="number"
                    value={simTargetMRR}
                    onChange={e => setSimTargetMRR(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Avg Monthly Contract Value (₹)</Label>
                  <Input 
                    type="number"
                    value={simAvgDealSize}
                    onChange={e => setSimAvgDealSize(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Conversion Rate (%)</Label>
                  <Input 
                    type="number"
                    value={simConversionRate}
                    onChange={e => setSimConversionRate(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Forecasting Output Math */}
              {simAvgDealSize > 0 && simConversionRate > 0 && (
                <div className="bg-indigo-50/30 border border-indigo-100/50 p-6 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <span className="font-black text-sm text-indigo-950 uppercase tracking-widest">Growth Forecast Results</span>
                  </div>

                  {(() => {
                    const requiredWonCount = Math.ceil(simTargetMRR / simAvgDealSize);
                    const requiredTotalLeads = Math.ceil(requiredWonCount / (simConversionRate / 100));
                    const currentWonValue = pipelineKPIs.wonValue;
                    const revenueGap = Math.max(0, simTargetMRR - currentWonValue);
                    const extraDealsToWon = Math.ceil(revenueGap / simAvgDealSize);
                    const extraLeadsToFill = Math.ceil(extraDealsToWon / (simConversionRate / 100));

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Required Won Deals / mo</span>
                          <span className="text-2xl font-code font-black text-indigo-900">{requiredWonCount}</span>
                          <span className="text-[9px] text-muted-foreground mt-1">Target MRR ÷ Avg Deal</span>
                        </div>

                        <div className="p-4 bg-white rounded-lg border flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Required Pipeline Leads</span>
                          <span className="text-2xl font-code font-black text-indigo-900">{requiredTotalLeads}</span>
                          <span className="text-[9px] text-muted-foreground mt-1">Won Deals ÷ Conv Rate</span>
                        </div>

                        <div className="p-4 bg-white rounded-lg border flex flex-col justify-between md:col-span-2 xl:col-span-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Leads to Close MRR Gap</span>
                          <span className="text-2xl font-code font-black text-indigo-900">
                            {revenueGap > 0 ? `${extraLeadsToFill} leads` : 'Goal Met! 🎉'}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-1">
                            {revenueGap > 0 ? `To bridge ₹${fmtINR(revenueGap)} gap` : 'No revenue gap remaining'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                  />
                </div>

                <Button 
                  onClick={triggerAIAnalysis}
                  disabled={aiLoading || deals.length === 0}
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
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-slate-400 hover:text-rose-600"
                            onClick={(e) => handleDeleteReport(report.id, e)}
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
              <Card className="border-2 border-indigo-100 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="bg-indigo-650 bg-indigo-900 text-white p-5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
                      Sales Pipeline Audit Report
                    </CardTitle>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 font-mono">
                      Generated {activeReport.createdAt ? new Date(activeReport.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Summary */}
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium">
                    <p className="text-sm italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-dashed border-indigo-200">
                      "{activeReport.advice.summary}"
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
                        {activeReport.advice.funnelBottlenecks.map((item: string, i: number) => (
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
                        {activeReport.advice.conversionRecommendations.map((item: string, i: number) => (
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
                      {activeReport.advice.salesVelocityTips.map((tip: string, i: number) => (
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
                      {activeReport.advice.suggestedActions.map((action: string, i: number) => (
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
