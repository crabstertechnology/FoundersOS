'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { fmtINR, fmtMult, fmtPct } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Wallet, Rocket, PieChart, Activity, TrendingUp, 
  AlertTriangle, ArrowUpRight, Shield, BarChart3, Users, Server, DollarSign, Calendar
} from 'lucide-react';

interface CentralDashboardProps {
  userId: string;
  companyProfileId: string;
  onNavigate: (tab: string) => void;
}

export function CentralDashboard({ userId, companyProfileId, onNavigate }: CentralDashboardProps) {
  const firestore = useFirestore();

  // Firestore References
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  // Subscriptions
  const { data: profile } = useDoc(profileRef) || {};
  const { data: shareholders } = useCollection(shareholdersRef) || {};

  // 1. Finance Pillar Metrics
  const founderOwnership = useMemo(() => {
    if (!shareholders) return 100; // Default if no setup
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

  const isDangerRunway = opsKPIs.runway < 6 && opsKPIs.runway > 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4 mt-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-3">
            Welcome back.
          </h1>
          <p className="text-muted-foreground font-medium text-xl">
            Live overview of <span className="font-bold text-indigo-600 opacity-90">{companyName}</span> across the 3 pillars.
          </p>
        </div>
      </div>

      {/* THREE PILLAR SECTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* PILLAR 1: SALES ANALYTICS */}
        <Card className="border-2 border-indigo-100 hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden shadow-sm bg-indigo-50/5">
          <div>
            <CardHeader className="pb-4 bg-indigo-50/30 border-b border-indigo-100/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-950">
                  Pillar 1: Sales Analytics
                </CardTitle>
                <CardDescription className="text-xs mt-1 font-semibold text-indigo-700/80">CRM conversion & revenue pipeline</CardDescription>
              </div>
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Core KPI */}
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Monthly Recurring Revenue (MRR)</span>
                <div className="text-3xl font-code font-black text-indigo-950 mt-0.5">
                  {fmtINR(salesKPIs.mrr)}
                </div>
              </div>

              {/* Sub metrics */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Annualized ARR</span>
                  <span className="text-sm font-code font-bold text-slate-800">{fmtINR(salesKPIs.arr)}</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Pipeline Value</span>
                  <span className="text-sm font-code font-bold text-slate-800">{fmtINR(salesKPIs.activePipelineValue)}</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Win Conversion</span>
                  <span className="text-sm font-bold text-emerald-600">{salesKPIs.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Deals Won</span>
                  <span className="text-sm font-bold text-indigo-600">{salesKPIs.wonCount} deals</span>
                </div>
              </div>

              {/* Mini formula */}
              <div className="bg-indigo-50/20 border border-indigo-100/50 p-3 rounded-lg text-xs">
                <div className="flex justify-between font-mono text-[10px] text-indigo-900 font-bold mb-1">
                  <span>SaaS Multiplication</span>
                  <span>MRR × 12 = ARR</span>
                </div>
                <div className="font-code font-black text-indigo-950 flex justify-between">
                  <span>{fmtINR(salesKPIs.mrr)}</span>
                  <span>×</span>
                  <span>12</span>
                  <span>=</span>
                  <span>{fmtINR(salesKPIs.arr)}</span>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-6 pt-0">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
              onClick={() => onNavigate('sales')}
            >
              Open Sales Pipeline
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* PILLAR 2: FINANCE SUITE */}
        <Card className="border-2 border-primary/10 hover:border-primary/30 transition-all flex flex-col justify-between overflow-hidden shadow-sm bg-primary/5">
          <div>
            <CardHeader className="pb-4 bg-primary/10 border-b border-primary/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">
                  Pillar 2: Finance & Equity
                </CardTitle>
                <CardDescription className="text-xs mt-1 font-semibold text-primary/80">Valuation modeling & exit simulation</CardDescription>
              </div>
              <Rocket className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Core KPI */}
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Startup Valuation (Post-money)</span>
                <div className="text-3xl font-code font-black text-primary mt-0.5">
                  {fmtINR(postMoney)}
                </div>
              </div>

              {/* Sub metrics */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Pre-Money</span>
                  <span className="text-sm font-code font-bold text-slate-800">{fmtINR(preMoney)}</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Investment Sought</span>
                  <span className="text-sm font-code font-bold text-slate-800">+{fmtINR(investment)}</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Founder Net Worth</span>
                  <span className="text-sm font-code font-bold text-blue-700">{fmtINR(paperNetWorth)}</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Founder Ownership</span>
                  <span className="text-sm font-bold text-slate-800">{fmtPct(founderOwnership)}</span>
                </div>
              </div>

              {/* Mini formula */}
              <div className="bg-primary/10 p-3 rounded-lg text-xs">
                <div className="flex justify-between font-mono text-[10px] text-primary font-bold mb-1">
                  <span>Founder Paper Share</span>
                  <span>Post × Share% = Equity Val</span>
                </div>
                <div className="font-code font-black text-primary flex justify-between">
                  <span>{fmtINR(postMoney)}</span>
                  <span>×</span>
                  <span>{fmtPct(founderOwnership)}</span>
                  <span>=</span>
                  <span>{fmtINR(paperNetWorth)}</span>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-6 pt-0">
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs gap-1.5"
              onClick={() => onNavigate('finance')}
            >
              Open Finance Suite
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* PILLAR 3: OPERATIONS & RUNWAY */}
        <Card className={`border-2 transition-all flex flex-col justify-between overflow-hidden shadow-sm ${isDangerRunway ? 'border-red-200 hover:border-red-300 bg-red-50/5' : 'border-teal-155 border-teal-100 hover:border-teal-300 bg-teal-50/5'}`}>
          <div>
            <CardHeader className={`pb-4 border-b flex flex-row items-center justify-between ${isDangerRunway ? 'bg-red-50/30 border-red-200/50' : 'bg-teal-50/30 border-teal-100/50'}`}>
              <div>
                <CardTitle className={`text-sm font-black uppercase tracking-widest ${isDangerRunway ? 'text-red-950' : 'text-teal-950'}`}>
                  Pillar 3: Operations & Runway
                </CardTitle>
                <CardDescription className={`text-xs mt-1 font-semibold ${isDangerRunway ? 'text-red-800' : 'text-teal-800'}`}>SaaS costs, Salaries & Runway Survival</CardDescription>
              </div>
              <Activity className={`w-5 h-5 ${isDangerRunway ? 'text-red-500' : 'text-teal-600'}`} />
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Core KPI */}
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Survival Timeline (Runway)</span>
                <div className={`text-3xl font-code font-black mt-0.5 ${isDangerRunway ? 'text-red-700' : 'text-teal-950'}`}>
                  {opsKPIs.runway === 999 ? '∞' : `${Math.round(opsKPIs.runway)} Months`}
                </div>
              </div>

              {/* Sub metrics */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Liquid Cash</span>
                  <span className="text-sm font-code font-bold text-slate-800">{fmtINR(opsKPIs.cashBank)}</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Total Burn Rate</span>
                  <span className="text-sm font-code font-bold text-rose-600">{fmtINR(opsKPIs.totalBurn)}/mo</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Active Headcount</span>
                  <span className="text-sm font-bold text-slate-800">{opsKPIs.teamSize} members</span>
                </div>
                <div className="p-3 bg-white border rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Monthly SaaS Spend</span>
                  <span className="text-sm font-code font-bold text-slate-800">{fmtINR(opsKPIs.monthlySaaS)}</span>
                </div>
              </div>

              {/* Mini formula */}
              <div className={`p-3 rounded-lg text-xs ${isDangerRunway ? 'bg-red-900/10' : 'bg-teal-50/20 border border-teal-100/50'}`}>
                <div className={`flex justify-between font-mono text-[10px] font-bold mb-1 ${isDangerRunway ? 'text-red-900' : 'text-teal-900'}`}>
                  <span>Runway Formula</span>
                  <span>Cash ÷ Burn = Months</span>
                </div>
                <div className={`font-code font-black flex justify-between ${isDangerRunway ? 'text-red-900' : 'text-teal-950'}`}>
                  <span>{fmtINR(opsKPIs.cashBank)}</span>
                  <span>÷</span>
                  <span>{fmtINR(opsKPIs.totalBurn)}</span>
                  <span>=</span>
                  <span>{opsKPIs.runway === 999 ? '∞' : Math.round(opsKPIs.runway)}</span>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-6 pt-0">
            <Button 
              className={`w-full text-white font-bold text-xs gap-1.5 ${isDangerRunway ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-650 bg-teal-600 hover:bg-teal-700'}`}
              onClick={() => onNavigate('operations')}
            >
              Open Operations Center
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

      </div>

      {/* QUICK ACTIONS SECTION (BOTTOM) */}
      <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-3 mt-16 mb-8 flex items-center gap-3">
        Quick Actions & Tools
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Action 1: Cap Table */}
        <Card 
          className="hover:shadow-xl transition-all group overflow-hidden border-2 cursor-pointer bg-white" 
          onClick={() => {
            onNavigate('finance');
            // We'll instruct page.tsx to select the subtab as well
          }}
        >
          <CardContent className="p-0">
            <div className="bg-slate-50 border-b p-8 flex justify-between items-start transition-colors group-hover:bg-slate-100">
              <PieChart className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <ArrowUpRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="p-8">
              <h3 className="font-black text-xl mb-2 tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">Cap Table Tracker</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">Update your shareholders, issue new equity, and track exact capital dilution across your funding history.</p>
            </div>
          </CardContent>
        </Card>

        {/* Action 2: Valuation Calculator */}
        <Card 
          className="hover:shadow-xl transition-all group overflow-hidden border-2 cursor-pointer bg-white" 
          onClick={() => onNavigate('finance')}
        >
          <CardContent className="p-0">
            <div className="bg-primary/5 border-b border-primary/10 p-8 flex justify-between items-start transition-colors group-hover:bg-primary/10">
              <Activity className="w-10 h-10 text-primary/55 group-hover:text-primary transition-colors" />
              <ArrowUpRight className="w-6 h-6 text-primary/30 group-hover:text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="p-8">
              <h3 className="font-black text-xl mb-2 tracking-tight text-slate-900 group-hover:text-primary transition-colors">Valuation Engine</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">Update your unit economics (CAC/LTV) and test standardized mathematical funding round models.</p>
            </div>
          </CardContent>
        </Card>

        {/* Action 3: Exit Simulator */}
        <Card 
          className="hover:shadow-xl transition-all group overflow-hidden border-2 cursor-pointer bg-white" 
          onClick={() => onNavigate('finance')}
        >
          <CardContent className="p-0">
            <div className="bg-amber-50/60 border-b border-amber-100 p-8 flex justify-between items-start transition-colors group-hover:bg-amber-100/60">
              <Rocket className="w-10 h-10 text-amber-550 text-amber-500/70 group-hover:text-amber-600 transition-colors" />
              <ArrowUpRight className="w-6 h-6 text-amber-300 group-hover:text-amber-550 group-hover:text-amber-600 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="p-8">
              <h3 className="font-black text-xl mb-2 tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors">Exit Simulator</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">Model an acquisition or IPO. Forensically verify exactly who gets what after liquidation preferences.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
