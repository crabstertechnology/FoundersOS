'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDUSTRIES, STAGES } from '@/lib/constants';
import { fmtINR, fmtPct, fmtMult } from '@/lib/utils/formatters';
import { 
  TrendingUp, Zap, Loader2, Coins, Scale, Info, ShieldAlert, CheckCircle2, 
  Target, HeartPulse, Sparkles, ChevronRight, Activity, Users, FileText, 
  BarChart3, PieChart, ShieldCheck, Flame, ArrowRight, Clock, Award, 
  Trash2, Calendar, Printer, X, Wallet
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { contextualStrategicAdvisor } from '@/ai/flows/contextual-strategic-advisor';
import { exportReportToPDF } from '@/lib/utils/pdfExport';
import { WaterfallChart, HistogramChart, AreaGrowthChart } from '@/components/charts';

interface ValuationCalculatorProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
}

const DEFAULT_FORM_DATA = {
  overridePostMoney: null as number | null,
  companyName: '',
  stage: 'idea',
  industry: 'saas',
  mRevenue: 0,
  growthRate: 0,
  burnRate: 0,
  cashBank: 0,
  customers: 0,
  profitPerOrder: 0,
  ordersPerCustomer: 1,
  cac: 0,
  investment: 0,
  equityOffered: 0,
  esopPool: 10,
  advisorEquity: 0,
  coFounderEq: 0,
  prefMultiple: '1',
  prefType: 'nonparticipating'
};

function LabelWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] text-xs font-medium">
          {info}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function ValuationCalculator({ userId, companyProfileId, readOnly }: ValuationCalculatorProps) {
  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profileDoc, isLoading: isDocLoading } = useDoc(profileRef);
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [exitValue, setExitValue] = useState<number>(50000000); // 5 Cr default
  const [viewMode, setViewMode] = useState<'matrix' | 'visual'>('matrix');

  // AI Advisor States
  const [aiLoading, setAiLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const reportsRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'strategicReports');
  }, [firestore, userId, companyProfileId]);

  const reportsQuery = useMemoFirebase(() => {
    if (!reportsRef) return null;
    return query(reportsRef, orderBy('createdAt', 'desc'));
  }, [reportsRef]);

  const { data: savedReports } = useCollection(reportsQuery);

  useEffect(() => {
    if (profileDoc) {
      setFormData(prev => ({
        ...prev,
        ...profileDoc,
      }));
      if (profileDoc.postMoneyValuation) {
        setExitValue(Math.max(10000000, profileDoc.postMoneyValuation * 2));
      }
    }
  }, [profileDoc]);

  const handleChange = (field: string, val: any) => {
    const newData = { ...formData, [field]: val };
    setFormData(newData);

    const investment = newData.investment || 0;
    const equityOffered = newData.equityOffered || 0;
    const calculatedPostMoney = equityOffered > 0 ? (investment / (equityOffered / 100)) : 0;
    const finalPostMoney = newData.overridePostMoney !== null && newData.overridePostMoney !== undefined
      ? newData.overridePostMoney 
      : calculatedPostMoney;

    if (profileRef && !readOnly) {
      setDocumentNonBlocking(profileRef, {
        ...newData,
        latestValuation: finalPostMoney,
        postMoneyValuation: finalPostMoney,
        id: companyProfileId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_FORM_DATA);
  };

  const results = useMemo(() => {
    const { 
      investment, equityOffered, mRevenue, burnRate, cashBank, cac, 
      profitPerOrder, ordersPerCustomer, esopPool, advisorEquity, coFounderEq, overridePostMoney 
    } = formData;
    
    const calculatedPostMoney = equityOffered > 0 ? (investment / (equityOffered / 100)) : 0;
    const postMoney = overridePostMoney !== null && overridePostMoney !== undefined ? overridePostMoney : calculatedPostMoney;
    const preMoney = Math.max(0, postMoney - investment);
    const arr = mRevenue * 12;
    const runway = burnRate > 0 ? cashBank / burnRate : (cashBank > 0 ? 999 : 0);
    
    const ltv = (profitPerOrder || 0) * (ordersPerCustomer || 1);
    const ltvCac = cac > 0 ? ltv / cac : 0;
    const profitPerCustomer = ltv - cac;
    const breakEvenCac = ltv;
    
    const founderEq = Math.max(0, 100 - (equityOffered + esopPool + advisorEquity + coFounderEq));

    return { 
      preMoney, postMoney, arr, runway, ltvCac, founderEq, 
      ltv, profitPerCustomer, breakEvenCac 
    };
  }, [formData]);

  const industryData = INDUSTRIES.find(i => i.value === formData.industry);
  const revValuation = results.arr * (industryData?.multiple || 0);

  // Exit Simulator Math
  const simResults = useMemo(() => {
    const mult = Number(formData.prefMultiple) || 1;
    const invInitial = formData.investment || 0;
    const isParticipating = formData.prefType === 'participating';
    const investorEqPct = (formData.equityOffered || 0) / 100;
    const founderEqPct = results.founderEq / 100;

    let investorReturn = 0;
    let founderReturn = 0;

    if (isParticipating) {
      const prefAmount = Math.min(exitValue, invInitial * mult);
      const remaining = Math.max(0, exitValue - prefAmount);
      investorReturn = prefAmount + (remaining * investorEqPct);
      founderReturn = remaining * founderEqPct;
    } else {
      // Non-participating: higher of preference or share
      const prefAmount = invInitial * mult;
      const shareAmount = exitValue * investorEqPct;
      investorReturn = Math.min(exitValue, Math.max(prefAmount, shareAmount));
      founderReturn = Math.max(0, exitValue - investorReturn);
    }

    return { investorReturn, founderReturn };
  }, [exitValue, formData, results.founderEq]);

  // Cap Table Donut Slices
  const donutData = useMemo(() => {
    const founder = Math.max(0, results.founderEq);
    const investor = Math.max(0, formData.equityOffered || 0);
    const esop = Math.max(0, formData.esopPool || 0);
    const advisors = Math.max(0, formData.advisorEquity || 0);
    const cofounders = Math.max(0, formData.coFounderEq || 0);

    const slices = [
      { label: 'Founder', pct: founder, color: '#4f46e5' },      // indigo
      { label: 'Investor', pct: investor, color: '#0284c7' },    // sky
      { label: 'ESOP', pct: esop, color: '#10b981' },            // emerald
      { label: 'Advisors', pct: advisors, color: '#f59e0b' },    // amber
      { label: 'Co-founders', pct: cofounders, color: '#64748b' } // slate
    ];

    return slices;
  }, [results.founderEq, formData]);

  // Visual Valuation Charts Data
  const waterfallData = useMemo(() => {
    const baseArpValue = Math.max(1000000, Math.round(results.arr * 1.5));
    const ipValue = Math.max(500000, Math.round(results.preMoney * 0.2));
    const growthPremium = Math.max(0, results.preMoney - (baseArpValue + ipValue));

    return [
      { name: 'Base ARR Asset', value: baseArpValue, category: 'base' as const, description: 'Core intrinsic run-rate foundation' },
      { name: 'Tech & IP Moat', value: ipValue, category: 'positive' as const, description: 'Proprietary IP and architecture value' },
      { name: 'Growth Premium', value: growthPremium, category: 'positive' as const, description: 'Market multiple lift from trajectory' },
      { name: 'Implied Pre-Money', value: results.preMoney, isTotal: true, category: 'total' as const, description: 'Pre-round company valuation' },
      { name: 'Round Investment', value: formData.investment || 0, category: 'positive' as const, description: 'Incoming investor growth capital' },
      { name: 'Implied Post-Money', value: results.postMoney, isTotal: true, category: 'total' as const, description: 'Post-round aggregate capitalization' },
    ];
  }, [results.arr, results.preMoney, results.postMoney, formData.investment]);

  const multipleHistogramBins = useMemo(() => [
    { rangeLabel: '1 - 4x', min: 1, max: 4, count: 68 },
    { rangeLabel: '4 - 7x', min: 4, max: 7, count: 182 },
    { rangeLabel: '7 - 11x', min: 7, max: 11, count: 145 },
    { rangeLabel: '11 - 16x', min: 11, max: 16, count: 72 },
    { rangeLabel: '16 - 22x', min: 16, max: 22, count: 31 },
    { rangeLabel: '22x+', min: 22, max: 100, count: 12 },
  ], []);

  const currentMultiple = results.arr > 0 ? results.postMoney / results.arr : (industryData?.multiple || 6.5);

  const runwayMonthlyProjection = useMemo(() => {
    const intervals = [
      { label: 'Month 1', elapsed: 1 },
      { label: 'Month 3', elapsed: 3 },
      { label: 'Month 6', elapsed: 6 },
      { label: 'Month 9', elapsed: 9 },
      { label: 'Month 12', elapsed: 12 },
      { label: 'Month 15', elapsed: 15 },
      { label: 'Month 18', elapsed: 18 },
      { label: 'Month 24', elapsed: 24 },
    ];
    const burn = formData.burnRate || 100000;
    const currentCash = formData.cashBank || 500000;
    const postRaiseCash = currentCash + (formData.investment || 0);

    return intervals.map((int) => ({
      period: int.label,
      primaryVal: Math.max(0, postRaiseCash - (burn * int.elapsed)),
      secondaryVal: Math.max(0, currentCash - (burn * int.elapsed)),
    }));
  }, [formData.burnRate, formData.cashBank, formData.investment]);

  // Trigger AI Strategic Analysis
  const handleGenerateAI = async () => {
    if (readOnly) return;
    setAiLoading(true);
    try {
      const input = {
        companyName: formData.companyName || 'Your Startup',
        stage: formData.stage as any,
        industry: formData.industry as any,
        monthlyRevenue: formData.mRevenue || 0,
        monthlyGrowthRate: formData.growthRate || 0,
        monthlyBurnRate: formData.burnRate || 0,
        cashInBank: formData.cashBank || 0,
        totalCustomers: formData.customers || 0,
        avgCustomerLTV: results.ltv || 0,
        customerAcquisitionCost: formData.cac || 0,
        investmentAmount: formData.investment || 0,
        equityOfferedToInvestor: formData.equityOffered || 0,
        esopPoolPercentage: formData.esopPool || 0,
        advisorEquityPercentage: formData.advisorEquity || 0,
        coFounderEquityPercentage: formData.coFounderEq || 0,
        preMoneyValuation: results.preMoney || 0,
        postMoneyValuation: results.postMoney || 0,
        revenueMultipleBasedValuation: results.arr * (industryData?.multiple || 0),
        berkusScoreValuation: 0,
        impliedRevenueMultiple: results.arr > 0 ? results.preMoney / results.arr : 0,
        currentFounderEquityPercentage: results.founderEq || 0,
        runwayMonths: results.runway || 0,
        ltvToCacRatio: results.ltvCac || 0,
        cacPaybackMonths: formData.mRevenue / Math.max(1, formData.customers) > 0 ? formData.cac / (formData.mRevenue / Math.max(1, formData.customers)) : 0,
        projectedAnnualRevenue12Months: results.arr * Math.pow(1 + formData.growthRate / 100, 12),
        dilutionRounds: [],
        founderEquityAfterAllDilution: results.founderEq || 0,
        exitPrice: exitValue || 0,
        totalInvestorCapitalInvested: formData.investment || 0,
        liquidationPreferenceMultiple: Number(formData.prefMultiple) || 1,
        liquidationPreferenceType: (formData.prefType || 'nonparticipating') as any,
        investorReceivesAtExit: simResults.investorReturn || 0,
        founderReceivesAtExit: simResults.founderReturn || 0,
        totalCapTablePercentage: 100,
        capTableAlerts: [],
        founderVotingMajorityCheck: (results.founderEq || 0) > 50,
        investorPreferenceSharesHealth: 'healthy' as const,
        singleInvestorDominanceHealth: 'healthy' as const,
        esopPoolHealth: (formData.esopPool >= 5 && formData.esopPool <= 15) ? 'healthy' as const : 'too_low' as const,
        founderEquityHealthStatus: (results.founderEq >= 40) ? 'healthy' as const : 'low' as const,
      };

      const result = await contextualStrategicAdvisor(input);

      if (reportsRef) {
        addDocumentNonBlocking(reportsRef, {
          ...result,
          createdAt: serverTimestamp(),
          companyName: formData.companyName || 'Your Startup',
          valuationTarget: results.postMoney || 0,
        });
      }

      setActiveReport(result);
    } catch (err) {
      console.error('Failed to run AI Strategic Advisor:', err);
    } finally {
      setAiLoading(false);
    }
  };

  if (isDocLoading && !profileDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-mono text-xs">Loading Valuation Calculator Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL BAR: View Mode Toggle & Actions
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Valuation Intelligence Center</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pre-to-Post Bridge, Cohort Multiple Histograms, and Runway Trajectory</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded-md transition-all ${viewMode === 'matrix' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Input Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'visual' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Visual Charts Suite
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            disabled={readOnly}
            className="h-8 text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 1: Inputs & Parameters (4 cols | 5 cols | 3 cols)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Column 1: Startup Profile & Deal Terms (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Startup Profile */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-700 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Startup Profile</h3>
            </div>

            <fieldset disabled={readOnly} className="space-y-2.5">
              <div>
                <LabelWithInfo label="Company Name" info="The official registered name of your company." />
                <Input 
                  placeholder="e.g. CRABSTER TECHNOLOGY"
                  value={formData.companyName} 
                  onChange={e => handleChange('companyName', e.target.value)}
                  className="h-8.5 text-xs font-semibold uppercase tracking-wider bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <LabelWithInfo label="Stage" info="Idea (Pre-revenue), MVP (Early traction), or Seed." />
                  <Select value={formData.stage} onValueChange={v => handleChange('stage', v)}>
                    <SelectTrigger className="h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <LabelWithInfo label="Industry" info="Determines the market revenue multiple applied to your startup." />
                  <Select value={formData.industry} onValueChange={v => handleChange('industry', v)}>
                    <SelectTrigger className="h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>
          </div>

          {/* Deal Terms */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-700 shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Deal Terms</h3>
            </div>

            <fieldset disabled={readOnly} className="grid grid-cols-2 gap-2.5">
              <div>
                <LabelWithInfo label="Pref Multiple" info="1x is standard VC. 2x is aggressive liquidation preference." />
                <Select value={formData.prefMultiple} onValueChange={v => handleChange('prefMultiple', v)}>
                  <SelectTrigger className="h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <LabelWithInfo label="Type" info="Non-participating is founder-friendly standard." />
                <Select value={formData.prefType} onValueChange={v => handleChange('prefType', v)}>
                  <SelectTrigger className="h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nonparticipating">Non-Participating</SelectItem>
                    <SelectItem value="participating">Participating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
          </div>
        </div>

        {/* Column 2: Strategic Fundraising Inputs (lg:col-span-5) */}
        <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 rounded-md text-slate-700 shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Strategic Fundraising Inputs</h3>
          </div>

          <fieldset disabled={readOnly} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <LabelWithInfo label="Investment Amount" info="The total capital being raised in this round." />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-6 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 5000000"
                    value={formData.investment || ''} 
                    onChange={e => handleChange('investment', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="Equity Offered %" info="Percentage equity dilution given to round investors." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pr-6 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 10"
                    value={formData.equityOffered || ''} 
                    onChange={e => handleChange('equityOffered', Number(e.target.value))}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <LabelWithInfo label="Monthly Revenue" info="Current Monthly Recurring Revenue (MRR)." />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-6 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 50000"
                    value={formData.mRevenue || ''} 
                    onChange={e => handleChange('mRevenue', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="Monthly Burn" info="Net monthly operational cash outflow." />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-6 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 30000"
                    value={formData.burnRate || ''} 
                    onChange={e => handleChange('burnRate', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <LabelWithInfo label="Cash in Bank" info="Total current liquid bank reserves." />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-6 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 500000"
                    value={formData.cashBank || ''} 
                    onChange={e => handleChange('cashBank', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="Override Post-Money" info="Manual override for Post-Money valuation." />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-6 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="Optional..."
                    value={formData.overridePostMoney !== null && formData.overridePostMoney !== undefined ? formData.overridePostMoney : ''} 
                    onChange={e => handleChange('overridePostMoney', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-0.5">
              <div>
                <LabelWithInfo label="ESOP %" info="Stock option pool reserved for team hires." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pr-5 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="10"
                    value={formData.esopPool || ''} 
                    onChange={e => handleChange('esopPool', Number(e.target.value))}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                </div>
              </div>

              <div>
                <LabelWithInfo label="Advisor %" info="Equity pool allocated to board advisors." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pr-5 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 2"
                    value={formData.advisorEquity || ''} 
                    onChange={e => handleChange('advisorEquity', Number(e.target.value))}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                </div>
              </div>

              <div>
                <LabelWithInfo label="Co-Founder %" info="Equity held collectively by other co-founders." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pr-5 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 8"
                    value={formData.coFounderEq || ''} 
                    onChange={e => handleChange('coFounderEq', Number(e.target.value))}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                </div>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Column 3: Unit Econ Inputs & Founder Stake (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Unit Econ Inputs */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-700 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Unit Econ Inputs</h3>
            </div>

            <fieldset disabled={readOnly} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <LabelWithInfo label="Profit/Order" info="Gross Profit per transaction (Revenue - COGS)." />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">₹</span>
                    <Input 
                      type="number" 
                      className="pl-5 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                      placeholder="e.g. 500"
                      value={formData.profitPerOrder || ''} 
                      onChange={e => handleChange('profitPerOrder', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <LabelWithInfo label="Orders/Cust" info="Avg frequency of repeat orders over customer lifetime." />
                  <Input 
                    type="number" 
                    className="h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="1"
                    value={formData.ordersPerCustomer || ''} 
                    onChange={e => handleChange('ordersPerCustomer', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="Avg CAC" info="Total Sales & Marketing cost spent per new customer acquired." />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-semibold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-6 h-8.5 text-xs font-semibold bg-white border-slate-200 text-slate-900 focus-visible:ring-slate-400"
                    placeholder="e.g. 1000"
                    value={formData.cac || ''} 
                    onChange={e => handleChange('cac', Number(e.target.value))}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Founder Stake Box */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-slate-100 rounded text-slate-700 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Founder Stake</h3>
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {results.founderEq.toFixed(1)}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                className="h-full bg-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, results.founderEq))}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>Retained Equity</span>
              <span className="font-mono text-slate-400">100 - {Math.round(100 - results.founderEq)}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: Key Metrics & Valuation Outputs (6-Card KPI Strip)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Runway */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
            Runway
          </span>
          <span className="text-xl font-black text-slate-900 block truncate mt-1">
            {results.runway === 999 ? '∞' : `${Math.round(results.runway)} mo`}
          </span>
          <span className="text-[10px] text-slate-400 font-medium block truncate mt-1">
            Bank ÷ Burn
          </span>
        </div>

        {/* ARR */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
            ARR
          </span>
          <span className="text-xl font-black text-slate-900 block truncate mt-1">
            {fmtINR(results.arr)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium block truncate mt-1">
            MRR × 12
          </span>
        </div>

        {/* Burn Rate */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
            Burn Rate
          </span>
          <span className="text-xl font-black text-slate-900 block truncate mt-1">
            {fmtINR(formData.burnRate)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium block truncate mt-1">
            Monthly Outflow
          </span>
        </div>

        {/* Pre-Money */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
            Pre-Money
          </span>
          <span className="text-xl font-black text-slate-900 block truncate mt-1">
            {fmtINR(results.preMoney)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium block truncate mt-1">
            Post - Investment
          </span>
        </div>

        {/* Post-Money */}
        <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block truncate">
            Post-Money
          </span>
          <span className="text-xl font-black text-indigo-950 block truncate mt-1">
            {fmtINR(results.postMoney)}
          </span>
          <span className="text-[10px] text-indigo-600/80 font-medium block truncate mt-1">
            Inv ÷ Eq%
          </span>
        </div>

        {/* Revenue Multiple */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
            Rev Multiple
          </span>
          <span className="text-xl font-black text-slate-900 block truncate mt-1">
            {fmtINR(revValuation)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium block truncate mt-1">
            {industryData?.multiple || 3}x ({industryData?.label || 'Market'})
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 3: Unit Economics (6 cols) & Breakdown + Advisor (6 cols)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Left: Unit Economics (lg:col-span-6) */}
        <div className="lg:col-span-6 rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-700 shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Unit Economics</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* LTV */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">LTV</span>
                <span className="text-sm font-black text-slate-900 block truncate mt-0.5">{fmtINR(results.ltv)}</span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">Profit × Orders</span>
              </div>

              {/* LTV / CAC */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">LTV / CAC</span>
                <span className={`text-sm font-black block truncate mt-0.5 ${results.ltvCac >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {fmtMult(results.ltvCac)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">LTV ÷ CAC</span>
              </div>

              {/* Net Profit / Customer */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Net Profit</span>
                <span className="text-sm font-black text-slate-900 block truncate mt-0.5">{fmtINR(results.profitPerCustomer)}</span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">LTV - CAC</span>
              </div>

              {/* Break-even CAC */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Break-even</span>
                <span className="text-sm font-black text-slate-900 block truncate mt-0.5">{fmtINR(results.breakEvenCac)}</span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">Max CAC</span>
              </div>
            </div>
          </div>

          {/* Alert Banner */}
          <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2.5 ${
            results.ltvCac >= 3 
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50/60 border-amber-200 text-amber-900'
          }`}>
            {results.ltvCac >= 3 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Healthy unit economics: {fmtMult(results.ltvCac)} LTV/CAC with ₹{fmtINR(results.profitPerCustomer)} net profit/customer.</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Unit economics below 3x ({fmtMult(results.ltvCac)}). Focus on optimizing CAC or increasing repeat purchase frequency.</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Breakdown & Advisor Split (lg:col-span-6) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Valuation Breakdown Donut */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-700 shrink-0">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Valuation Breakdown</h3>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* SVG Donut Chart */}
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                  {(() => {
                    const circumference = 2 * Math.PI * 36;
                    let currentOffset = 0;
                    return donutData.map((slice, i) => {
                      const strokeLen = (slice.pct / 100) * circumference;
                      const dashArray = `${strokeLen} ${circumference - strokeLen}`;
                      const offset = currentOffset;
                      currentOffset -= strokeLen;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="36"
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="14"
                          strokeDasharray={dashArray}
                          strokeDashoffset={offset}
                          className="transition-all duration-300"
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-slate-900 leading-none">
                    {Math.round(results.founderEq)}%
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                    Founder
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-1.5 text-xs font-medium flex-1 min-w-0">
                {donutData.map((slice, i) => (
                  <div key={i} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="text-slate-600 truncate text-[11px]">{slice.label}</span>
                    </div>
                    <span className="text-slate-900 font-bold shrink-0 text-[11px]">{slice.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FounderOS Strategic Advisor */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-indigo-50 rounded text-indigo-600 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Strategic Advisor</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <FileText className="w-3 h-3" />
                  Saved ({savedReports?.length || 0})
                </button>
              </div>

              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                AI-driven analysis of your valuation posture, cap table health, and investor negotiation strategy.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={aiLoading || readOnly}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs h-9 gap-1.5 shadow-xs"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  Generate Strategic Analysis <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 4: Exit Value Simulator (Full-Width Responsive Card)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Slider Side (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-md text-slate-700 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Exit Value Simulator</h3>
              </div>
              <div className="flex items-baseline gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Target:</span>
                <span className="text-sm font-black text-slate-900 font-mono">{fmtINR(exitValue)}</span>
              </div>
            </div>

            {/* Slider */}
            <div className="pt-2 pb-0.5">
              <input
                type="range"
                min={5000000}
                max={500000000}
                step={5000000}
                value={exitValue}
                onChange={e => setExitValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Metric Tiles Side (lg:col-span-7) */}
          <div className="lg:col-span-7 grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                Founder Return
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 block truncate mt-1">
                {fmtINR(simResults.founderReturn)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                Investor Return
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 block truncate mt-1">
                {fmtINR(simResults.investorReturn)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                Total Return
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 block truncate mt-1">
                {fmtINR(exitValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 5: Visual Charts Suite (Pre-to-Post Waterfall, Histogram & Runway Area Chart)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-50 text-indigo-700 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Visual Valuation Analytics & Cohort Benchmarks
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono bg-indigo-50/50 text-indigo-700 border-indigo-200">
            Interactive Visual Models
          </Badge>
        </div>

        {/* 2-Column Visual Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Pre-to-Post Money Waterfall Bridge Chart */}
          <div className="lg:col-span-7">
            <WaterfallChart
              title="Valuation Waterfall (Pre-to-Post Money Bridge)"
              subtitle="Step-by-step enterprise value creation from base ARR to proposed round capitalization"
              data={waterfallData}
              isCurrency={true}
              height={290}
            />
          </div>

          {/* Right: Valuation Multiple Histogram */}
          <div className="lg:col-span-5">
            <HistogramChart
              title="Valuation Multiple Distribution (500+ Indian Cohorts)"
              subtitle={`${industryData?.label || 'SaaS'} multiples vs your current valuation`}
              bins={multipleHistogramBins}
              currentVal={currentMultiple}
              currentValLabel={formData.companyName || 'Your Startup'}
              medianVal={industryData?.multiple || 6.5}
              unit="x"
              height={290}
            />
          </div>
        </div>

        {/* Full-Width Runway & Cash Depletion Area Chart */}
        <div className="w-full">
          <AreaGrowthChart
            title="Cash Runway & Depletion Trajectory (24-Month Projection)"
            subtitle="Comparing projected cash bank runway with current reserves vs post-raise growth trajectory"
            data={runwayMonthlyProjection}
            primaryLabel="Post-Round Cash"
            secondaryLabel="Without Capital Raise"
            primaryKey="primaryVal"
            secondaryKey="secondaryVal"
            isCurrency={true}
            gradientColorPrimary="#4f46e5"
            gradientColorSecondary="#059669"
            height={260}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AI STRATEGIC ADVISOR REPORT MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!activeReport} onOpenChange={(open) => !open && setActiveReport(null)}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto p-0 border border-slate-200 shadow-2xl">
          <DialogHeader className="p-5 border-b bg-slate-50/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Strategic Advisor Analysis
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                  AI-evaluated fundraising posture, investor sentiment, and negotiation tactics.
                </DialogDescription>
              </div>

              {activeReport && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportReportToPDF(activeReport, formData.companyName || 'Startup')}
                  className="gap-1.5 text-xs font-bold shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" /> Export PDF
                </Button>
              )}
            </div>
          </DialogHeader>

          {activeReport && (
            <div className="p-6 space-y-6">
              {/* Executive Summary */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block">
                  Executive Assessment
                </span>
                <p className="text-xs leading-relaxed text-slate-700 font-medium">
                  {activeReport.overallStrategicAdvice}
                </p>
              </div>

              {/* Red Flags & Strengths */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2">
                  <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" /> Red Flags &amp; Risks
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeReport.redFlags?.map((flag: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeReport.strengths?.map((str: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Negotiation Strategy */}
              {activeReport.negotiationStrategy && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Tactical Negotiation Strategy
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed font-medium">
                    {activeReport.negotiationStrategy}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          SAVED REPORTS HISTORY MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh] overflow-y-auto p-0 border border-slate-200 shadow-2xl">
          <DialogHeader className="p-5 border-b bg-slate-50/70">
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Saved Strategic Reports
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Review previously generated valuation and investor readiness reports.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-3">
            {!savedReports || savedReports.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No reports saved yet. Click "Generate Strategic Analysis" to create your first report.
              </div>
            ) : (
              savedReports.map((rep: any) => (
                <div
                  key={rep.id}
                  className="p-3.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {rep.companyName || 'Startup Report'}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {fmtINR(rep.valuationTarget || 0)} Post-Money
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {rep.overallStrategicAdvice || 'Strategic Analysis'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveReport(rep);
                        setShowHistoryModal(false);
                      }}
                      className="text-xs font-bold h-8"
                    >
                      View Report
                    </Button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (reportsRef) {
                            const d = doc(reportsRef, rep.id);
                            deleteDocumentNonBlocking(d);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                        title="Delete Report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
