'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
    <div className="flex items-center gap-1.5 mb-1.5">
      <Label className="text-xs font-bold text-slate-700">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-help" />
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
  const [isScenarioPreMoney, setIsScenarioPreMoney] = useState(false);
  const [exitValue, setExitValue] = useState<number>(50000000); // 5 Cr default

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
      { label: 'Founder', pct: founder, color: '#3b82f6' },      // blue
      { label: 'Investor', pct: investor, color: '#ef4444' },    // red
      { label: 'ESOP', pct: esop, color: '#a855f7' },            // purple
      { label: 'Advisors', pct: advisors, color: '#f59e0b' },    // amber
      { label: 'Co-founders', pct: cofounders, color: '#06b6d4' } // cyan
    ];

    return slices;
  }, [results.founderEq, formData]);

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

  // Funding Scenario Round Projections
  const currentVal = isScenarioPreMoney ? results.preMoney : results.postMoney;
  const scenarioRounds = [
    { label: 'Current', val: currentVal || 0 },
    { label: 'Seed', val: Math.max(currentVal * 2.5, 15000000) },
    { label: 'Series A', val: Math.max(currentVal * 6, 60000000) },
    { label: 'Series B', val: Math.max(currentVal * 15, 180000000) },
    { label: 'Series C', val: Math.max(currentVal * 35, 450000000) },
  ];
  const maxScenarioVal = Math.max(...scenarioRounds.map(r => r.val), 1);

  return (
    <div className="space-y-5 w-full">
      
      {/* ─────────────────────────────────────────────────────────────
          ROW 1: Inputs & Parameters (3 Columns)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Column 1: Startup Profile & Deal Terms (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-5 flex flex-col justify-between">
          {/* Startup Profile: Deep Indigo Tint with Asymmetric Corner Cut */}
          <div className="rounded-tl-3xl rounded-br-3xl rounded-tr-xl rounded-bl-xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/80 border-2 border-indigo-200/90 border-l-4 border-l-indigo-600 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Startup Profile</h3>
            </div>

            <fieldset disabled={readOnly} className="space-y-3">
              <div>
                <LabelWithInfo label="Company Name" info="The official registered name of your company." />
                <Input 
                  placeholder="e.g. CRABSTER TECHNOLOGY"
                  value={formData.companyName} 
                  onChange={e => handleChange('companyName', e.target.value)}
                  className="h-9 text-xs font-semibold uppercase tracking-wider bg-white/90 border-indigo-200 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <LabelWithInfo label="Stage" info="Idea (Pre-revenue), MVP (Early traction), or Seed." />
                <Select value={formData.stage} onValueChange={v => handleChange('stage', v)}>
                  <SelectTrigger className="h-9 text-xs font-semibold bg-white/90 border-indigo-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <LabelWithInfo label="Industry" info="Determines the market revenue multiple applied to your startup." />
                <Select value={formData.industry} onValueChange={v => handleChange('industry', v)}>
                  <SelectTrigger className="h-9 text-xs font-semibold bg-white/90 border-indigo-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
          </div>

          {/* Deal Terms: Cyan / Teal Law Card with Inverted Asymmetric Cut */}
          <div className="rounded-tr-3xl rounded-bl-3xl rounded-tl-xl rounded-br-xl bg-gradient-to-br from-cyan-50/70 via-white to-teal-50/60 border-2 border-cyan-200/90 border-l-4 border-l-cyan-600 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Deal Terms</h3>
            </div>

            <fieldset disabled={readOnly} className="grid grid-cols-2 gap-3">
              <div>
                <LabelWithInfo label="Pref Multiple" info="1x is standard VC. 2x is aggressive liquidation preference." />
                <Select value={formData.prefMultiple} onValueChange={v => handleChange('prefMultiple', v)}>
                  <SelectTrigger className="h-9 text-xs font-semibold bg-white/90 border-cyan-200"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger className="h-9 text-xs font-semibold bg-white/90 border-cyan-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nonparticipating">Non-Participating</SelectItem>
                    <SelectItem value="participating">Participating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
          </div>
        </div>

        {/* Column 2: Unit Econ Inputs & Founder Stake (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
          {/* Unit Econ Inputs: Emerald Top-Bordered Shape */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border-2 border-emerald-200/90 border-t-4 border-t-emerald-600 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Unit Econ Inputs</h3>
            </div>

            <fieldset disabled={readOnly} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelWithInfo label="Profit per Order" info="Gross Profit per transaction (Revenue - COGS)." />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 font-mono text-xs font-bold">₹</span>
                    <Input 
                      type="number" 
                      className="pl-7 h-9 text-xs font-semibold bg-white/90 border-emerald-200 focus-visible:ring-emerald-500"
                      placeholder="e.g. 500"
                      value={formData.profitPerOrder || ''} 
                      onChange={e => handleChange('profitPerOrder', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <LabelWithInfo label="Orders per Customer" info="Avg frequency of repeat orders over customer lifetime." />
                  <Input 
                    type="number" 
                    className="h-9 text-xs font-semibold bg-white/90 border-emerald-200 focus-visible:ring-emerald-500"
                    placeholder="1"
                    value={formData.ordersPerCustomer || ''} 
                    onChange={e => handleChange('ordersPerCustomer', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="Avg CAC" info="Total Sales & Marketing cost spent per new customer acquired." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 font-mono text-xs font-bold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-xs font-semibold bg-white/90 border-emerald-200 focus-visible:ring-emerald-500"
                    placeholder="e.g. 1000"
                    value={formData.cac || ''} 
                    onChange={e => handleChange('cac', Number(e.target.value))}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Founder Stake: Electric Violet/Indigo Hero Trophy Box */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white border-2 border-indigo-400/80 shadow-md p-5 space-y-3 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

            <div className="flex items-center gap-2.5 relative z-10">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">Founder Stake</h3>
            </div>

            <div className="flex items-baseline justify-between relative z-10">
              <div className="text-3xl font-black text-white tracking-tight drop-shadow-xs">
                {results.founderEq.toFixed(1)}%
              </div>
              <div className="text-xs font-bold text-indigo-200 font-mono">
                100 - {Math.round(100 - results.founderEq)} = {Math.round(results.founderEq)}%
              </div>
            </div>

            {/* Glowing progress slider track */}
            <div className="relative w-full h-3 bg-black/20 rounded-full overflow-hidden border border-white/20">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, results.founderEq))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Column 3: Strategic Fundraising Inputs (lg:col-span-5) - Amber/Gold Capital Treasury */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 border-2 border-amber-200/90 border-r-4 border-r-amber-500 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Strategic Fundraising Inputs</h3>
          </div>

          <fieldset disabled={readOnly} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelWithInfo label="Investment Amount" info="The total capital being raised in this round." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 font-mono text-xs font-bold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
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
                    className="pr-7 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="e.g. 10"
                    value={formData.equityOffered || ''} 
                    onChange={e => handleChange('equityOffered', Number(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 font-bold text-xs">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelWithInfo label="Explicit Post-Money (Optional)" info="Manual override for Post-Money valuation." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 font-mono text-xs font-bold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-xs font-semibold bg-amber-50/70 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="Leave blank..."
                    value={formData.overridePostMoney !== null && formData.overridePostMoney !== undefined ? formData.overridePostMoney : ''} 
                    onChange={e => handleChange('overridePostMoney', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="Monthly Revenue" info="Current Monthly Recurring Revenue (MRR)." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 font-mono text-xs font-bold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="e.g. 50000"
                    value={formData.mRevenue || ''} 
                    onChange={e => handleChange('mRevenue', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <LabelWithInfo label="Monthly Burn" info="Net monthly operational cash outflow." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 font-mono text-xs font-bold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="e.g. 30000"
                    value={formData.burnRate || ''} 
                    onChange={e => handleChange('burnRate', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="Cash in Bank" info="Total current liquid bank reserves." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 font-mono text-xs font-bold">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="e.g. 500000"
                    value={formData.cashBank || ''} 
                    onChange={e => handleChange('cashBank', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <LabelWithInfo label="ESOP Pool %" info="Stock option pool reserved for team hires." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pr-6 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="10"
                    value={formData.esopPool || ''} 
                    onChange={e => handleChange('esopPool', Number(e.target.value))}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-700 font-bold text-xs">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelWithInfo label="Advisor Equity %" info="Equity pool allocated to board advisors." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pr-6 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="e.g. 2"
                    value={formData.advisorEquity || ''} 
                    onChange={e => handleChange('advisorEquity', Number(e.target.value))}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-700 font-bold text-xs">%</span>
                </div>
              </div>

              <div>
                <LabelWithInfo label="Co-Founder Equity %" info="Equity held collectively by other co-founders." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pr-6 h-9 text-xs font-semibold bg-white/90 border-amber-200 focus-visible:ring-amber-500"
                    placeholder="e.g. 8"
                    value={formData.coFounderEq || ''} 
                    onChange={e => handleChange('coFounderEq', Number(e.target.value))}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-700 font-bold text-xs">%</span>
                </div>
              </div>
            </div>
          </fieldset>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: Key Metrics & Implied Valuation (2 Curated Cards)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Key Metrics: Rounded Card with Multi-Tone Inner Badges */}
        <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-pink-50/30 border-2 border-slate-200/90 p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Key Metrics</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Runway */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-100/70 via-rose-50 to-white border-2 border-rose-200/90 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800/80 block truncate">
                  Runway
                </span>
                <span className="text-base font-black text-slate-900 block truncate">
                  {results.runway === 999 ? '∞' : `${Math.round(results.runway)} mo`}
                </span>
                <span className="text-[9px] font-semibold text-rose-700/70 block truncate">
                  Bank ÷ Burn
                </span>
              </div>
            </div>

            {/* ARR */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-100/70 via-emerald-50 to-white border-2 border-emerald-200/90 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 block truncate">
                  ARR
                </span>
                <span className="text-base font-black text-slate-900 block truncate">
                  {fmtINR(results.arr)}
                </span>
                <span className="text-[9px] font-semibold text-emerald-700/70 block truncate">
                  MRR × 12
                </span>
              </div>
            </div>

            {/* Burn Rate */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-100/70 via-purple-50 to-white border-2 border-purple-200/90 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800/80 block truncate">
                  Burn Rate
                </span>
                <span className="text-base font-black text-slate-900 block truncate">
                  {fmtINR(formData.burnRate)}
                </span>
                <span className="text-[9px] font-semibold text-purple-700/70 block truncate">
                  Monthly Cash Outflow
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Implied Valuation: Sapphire/Blue Deck with Elevated Post-Money */}
        <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border-2 border-slate-200/90 p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Implied Valuation</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Pre-Money */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-100/70 via-sky-50 to-white border-2 border-sky-200/90 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800/80 block truncate">
                  Pre-Money
                </span>
                <span className="text-base font-black text-slate-900 block truncate">
                  {fmtINR(results.preMoney)}
                </span>
                <span className="text-[9px] font-semibold text-sky-700/70 block truncate">
                  Post - Inv
                </span>
              </div>
            </div>

            {/* Post-Money - Highlighted with Primary Accent */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-100 via-indigo-50 to-white border-2 border-indigo-400 text-indigo-950 flex items-center gap-3 shadow-xs ring-2 ring-indigo-200/60">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block truncate">
                  Post-Money
                </span>
                <span className="text-base font-black text-indigo-900 block truncate">
                  {fmtINR(results.postMoney)}
                </span>
                <span className="text-[9px] font-semibold text-indigo-600 block truncate">
                  Inv ÷ Eq%
                </span>
              </div>
            </div>

            {/* Revenue Multiple */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-white border-2 border-slate-300/90 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block truncate">
                  Rev Mult ({industryData?.multiple || 3}x)
                </span>
                <span className="text-base font-black text-slate-900 block truncate">
                  {fmtINR(revValuation)}
                </span>
                <span className="text-[9px] font-semibold text-slate-500 block truncate">
                  {industryData?.label || 'Market'} avg
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 3: Unit Economics & Valuation Breakdown Donut (2 Columns)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Unit Economics - Blue-Bordered Dashboard Card (lg:col-span-8) */}
        <div className="lg:col-span-8 rounded-3xl bg-gradient-to-br from-blue-50/40 via-white to-slate-50 border-2 border-blue-200/90 border-l-6 border-l-blue-600 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Unit Economics</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* LTV */}
              <div className="p-3 rounded-2xl border-2 border-blue-200/80 bg-white/95 flex items-start gap-2.5 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">LTV</span>
                  <span className="text-sm font-black text-slate-900 block truncate">{fmtINR(results.ltv)}</span>
                  <span className="text-[9px] text-slate-400 font-medium block truncate">Profit/Ord × Orders</span>
                </div>
              </div>

              {/* LTV / CAC */}
              <div className="p-3 rounded-2xl border-2 border-emerald-200/80 bg-white/95 flex items-start gap-2.5 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">LTV / CAC Ratio</span>
                  <span className={`text-sm font-black block truncate ${results.ltvCac >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {fmtMult(results.ltvCac)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium block truncate">LTV ÷ CAC</span>
                </div>
              </div>

              {/* Net Profit / Customer */}
              <div className="p-3 rounded-2xl border-2 border-purple-200/80 bg-white/95 flex items-start gap-2.5 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">Net Profit / Cust</span>
                  <span className="text-sm font-black text-slate-900 block truncate">{fmtINR(results.profitPerCustomer)}</span>
                  <span className="text-[9px] text-slate-400 font-medium block truncate">LTV - CAC</span>
                </div>
              </div>

              {/* Break-even CAC */}
              <div className="p-3 rounded-2xl border-2 border-amber-200/80 bg-white/95 flex items-start gap-2.5 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">Break-even CAC</span>
                  <span className="text-sm font-black text-slate-900 block truncate">{fmtINR(results.breakEvenCac)}</span>
                  <span className="text-[9px] text-slate-400 font-medium block truncate">Based on LTV</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Banner */}
          <div className={`p-3 rounded-2xl border-2 text-xs font-medium flex items-center gap-2.5 shadow-2xs ${
            results.ltvCac >= 3 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            {results.ltvCac >= 3 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unit economics are healthy. You earn {fmtMult(results.ltvCac)} on acquisition with ₹{fmtINR(results.profitPerCustomer)} net profit per customer.</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Efficiency is below 3x. You are only earning {fmtMult(results.ltvCac)} back for every rupee spent on acquisition. Reduce CAC or increase retention.</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Valuation Breakdown Donut - Midnight Navy Nebula Theme (lg:col-span-4) */}
        <div className="lg:col-span-4 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border-2 border-indigo-900/80 p-5 shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-white tracking-tight">Valuation Breakdown</h3>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1 relative z-10">
            {/* SVG Donut Chart with glowing slices */}
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1e293b" strokeWidth="16" />
                
                {/* Dynamic SVG donut slices */}
                {(() => {
                  const circumference = 2 * Math.PI * 38; // ~238.76
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
                        r="38"
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="16"
                        strokeDasharray={dashArray}
                        strokeDashoffset={offset}
                        className="transition-all duration-500"
                      />
                    );
                  });
                })()}
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-black text-white leading-none">
                  {Math.round(results.founderEq)}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  Founder
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 flex-1 min-w-0 text-xs font-semibold">
              {donutData.map((slice, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="text-slate-300 truncate">{slice.label}</span>
                  </div>
                  <span className="text-white font-bold shrink-0">{slice.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 4: Funding Scenario, Exit Value Simulator, & Strategic Advisor
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Funding Scenario Bar Chart: Soft Lavender Deck (lg:col-span-4) */}
        <div className="lg:col-span-4 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 border-2 border-indigo-200/90 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Funding Scenario</h3>
            </div>

            {/* Pre / Post Money Toggle */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsScenarioPreMoney(true)}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${isScenarioPreMoney ? 'bg-white shadow-xs text-indigo-700 font-extrabold' : 'text-slate-600'}`}
              >
                Pre
              </button>
              <button
                type="button"
                onClick={() => setIsScenarioPreMoney(false)}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${!isScenarioPreMoney ? 'bg-indigo-600 shadow-xs text-white font-extrabold' : 'text-slate-600'}`}
              >
                Post
              </button>
            </div>
          </div>

          {/* Bar Chart Columns */}
          <div className="h-32 flex items-end justify-between gap-2 pt-4 px-1">
            {scenarioRounds.map((r, i) => {
              const heightPct = Math.max(12, Math.min(100, Math.round((r.val / maxScenarioVal) * 100)));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[9px] font-bold text-indigo-900 truncate max-w-full">
                    {fmtINR(r.val)}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-xl h-full flex items-end overflow-hidden">
                    <div 
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        i === 0 ? 'bg-indigo-400' : i === 1 ? 'bg-indigo-500' : i === 2 ? 'bg-indigo-600' : 'bg-purple-600'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-extrabold text-slate-600 uppercase tracking-tighter truncate max-w-full">
                    {r.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exit Value Simulator: Cyber Teal / Emerald Simulator (lg:col-span-5) */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 border-2 border-teal-200/90 border-t-4 border-t-teal-600 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Exit Value Simulator</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-teal-800 font-bold uppercase block leading-none">Exit Target</span>
                <span className="text-xs font-black text-teal-700 font-mono">{fmtINR(exitValue)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              See potential returns for different exit outcomes.
            </p>

            {/* Slider */}
            <div className="pt-3 pb-1">
              <input
                type="range"
                min={5000000}
                max={500000000}
                step={5000000}
                value={exitValue}
                onChange={e => setExitValue(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>
          </div>

          {/* Return Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 bg-indigo-50/90 rounded-2xl border-2 border-indigo-200/90 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 block truncate">
                Founder Return
              </span>
              <span className="text-xs sm:text-sm font-black text-indigo-950 block truncate">
                {fmtINR(simResults.founderReturn)}
              </span>
            </div>

            <div className="p-3 bg-rose-50/90 rounded-2xl border-2 border-rose-200/90 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 block truncate">
                Investor Return
              </span>
              <span className="text-xs sm:text-sm font-black text-rose-950 block truncate">
                {fmtINR(simResults.investorReturn)}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/90 rounded-2xl border-2 border-emerald-200/90 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 block truncate">
                Total Return
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-950 block truncate">
                {fmtINR(exitValue)}
              </span>
            </div>
          </div>
        </div>

        {/* FounderOS Strategic Advisor: Holographic Purple Gradient Card (lg:col-span-3) */}
        <div className="lg:col-span-3 rounded-3xl bg-gradient-to-br from-purple-800 via-indigo-800 to-slate-900 text-white border-2 border-purple-400/60 shadow-xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-purple-400/20 blur-xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">FounderOS Strategic Advisor</h3>
            </div>
            <p className="text-xs text-purple-200 font-medium leading-relaxed">
              Get AI-powered valuation insights, fundraising strategy, and actionable next steps.
            </p>
          </div>

          <div className="space-y-2 relative z-10">
            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={aiLoading || readOnly}
              className="w-full bg-white text-indigo-950 hover:bg-indigo-50 font-black text-xs h-10 gap-1.5 shadow-md"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-900" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  Generate Strategic Analysis <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-purple-200 hover:text-white transition-colors py-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              View Saved Reports ({savedReports?.length || 0})
            </button>
          </div>
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
