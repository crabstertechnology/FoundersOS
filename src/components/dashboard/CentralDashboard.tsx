'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { fmtINR, fmtMult, fmtPct } from '@/lib/utils/formatters';
import { 
  LineChart, Wallet, Rocket, PieChart, Activity, TrendingUp, AlertTriangle, ArrowUpRight
} from 'lucide-react';

interface CentralDashboardProps {
  userId: string;
  companyProfileId: string;
  onNavigate: (tab: string) => void;
}

export function CentralDashboard({ userId, companyProfileId, onNavigate }: CentralDashboardProps) {
  const firestore = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef) || {};
  const { data: shareholders } = useCollection(shareholdersRef) || {};

  const founderOwnership = useMemo(() => {
    if (!shareholders) return 100; // Default if no setup
    const founders = shareholders.filter(sh => sh.role?.toLowerCase() === 'founder');
    if (founders.length === 0) return 0;
    return founders.reduce((sum, sh) => sum + (Number(sh.ownershipPercentage) || 0), 0);
  }, [shareholders]);

  // Fallbacks for empty states
  const companyName = profile?.companyName || 'Your Startup';
  const postMoney = profile?.postMoneyValuation !== undefined && profile?.postMoneyValuation !== null 
    ? profile.postMoneyValuation 
    : (profile?.latestValuation || 0);

  const paperNetWorth = postMoney > 0 ? (postMoney * founderOwnership) / 100 : 0;
  const investment = profile?.investment || 0;
  const preMoney = Math.max(0, postMoney - investment);
  const arr = (profile?.mRevenue || 0) * 12;
  const runway = (profile?.burnRate || 0) > 0 ? (profile?.cashBank || 0) / profile!.burnRate : 999;
  const isDangerRunway = runway < 6 && runway > 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4 mt-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] mb-3">
            Welcome back.
          </h1>
          <p className="text-muted-foreground font-medium text-xl">
            Here's the live snapshot of <span className="font-bold text-primary opacity-90">{companyName}</span>'s health.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Metric 1: Cash & Runway */}
        <Card className={`border-2 shadow-sm flex flex-col ${isDangerRunway ? 'border-red-200 bg-red-50/30' : ''}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
            <CardTitle className="text-xs uppercase font-black tracking-widest">
              Survival (Runway)
            </CardTitle>
            {isDangerRunway ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Wallet className="w-5 h-5 opacity-50" />}
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex items-end gap-2">
              <div className={`text-4xl font-code font-black tracking-tight leading-none ${isDangerRunway ? 'text-red-700' : 'text-slate-900'}`}>
                {runway === 999 ? '∞' : `${Math.round(runway)}`}
              </div>
              <span className={`text-[10px] mb-1 font-black uppercase tracking-widest ${isDangerRunway ? 'text-red-700/70' : 'text-muted-foreground'}`}>
                Months
              </span>
            </div>
            
            <div className={`mt-5 pt-4 border-t space-y-2.5 mt-auto ${isDangerRunway ? 'border-red-200/50' : 'border-slate-100'}`}>
              <div className="flex justify-between items-center text-sm font-code">
                <span className={`font-bold text-xs uppercase tracking-widest ${isDangerRunway ? 'text-red-900/60' : 'text-muted-foreground'}`}>Bank</span>
                <span className={`font-black ${isDangerRunway ? 'text-red-800' : 'text-slate-800'}`}>{fmtINR(profile?.cashBank || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-code">
                <span className={`font-bold text-xs uppercase tracking-widest ${isDangerRunway ? 'text-red-900/60' : 'text-muted-foreground'}`}>Burn</span>
                <span className={`font-black ${isDangerRunway ? 'text-red-800' : 'text-slate-800'}`}>-{fmtINR(profile?.burnRate || 0)}/mo</span>
              </div>
              
              <div className={`p-2.5 rounded-lg mt-3 ${isDangerRunway ? 'bg-red-900/10' : 'bg-slate-100'}`}>
                <p className={`text-[9px] uppercase tracking-widest font-black mb-1.5 flex justify-between opacity-80 ${isDangerRunway ? 'text-red-900' : 'text-slate-500'}`}>
                  <span>Math Formula</span>
                  <span>Bank ÷ Burn = Mo</span>
                </p>
                <div className={`text-xs font-code font-black flex justify-between items-center ${isDangerRunway ? 'text-red-700' : 'text-slate-700'}`}>
                  <span>{fmtINR(profile?.cashBank || 0)}</span>
                  <span className="text-[10px] opacity-50">÷</span>
                  <span>{fmtINR(profile?.burnRate || 0)}</span>
                  <span className="text-[10px] opacity-50">=</span>
                  <span className="text-sm">{runway === 999 ? '∞' : Math.round(runway)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Current Valuation */}
        <Card className="border-2 shadow-sm border-primary/10 bg-primary/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase font-black text-primary tracking-widest">
              Valuation Economics
            </CardTitle>
            <Rocket className="w-5 h-5 text-primary opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-code font-black tracking-tight text-primary leading-none">
                {fmtINR(postMoney)}
              </div>
              <span className="text-[10px] text-primary/70 mb-1 font-black uppercase tracking-widest">
                Post-Money
              </span>
            </div>
            
            <div className="mt-5 pt-4 border-t border-primary/10 space-y-2.5">
              <div className="flex justify-between items-center text-sm font-code">
                <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Pre-Money</span>
                <span className="font-black text-slate-800">{fmtINR(preMoney)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-code">
                <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Investment</span>
                <span className="font-black text-slate-800">+{fmtINR(investment)}</span>
              </div>
              
              <div className="bg-primary/15 p-2.5 rounded-lg mt-3">
                <p className="text-[9px] text-primary/80 uppercase tracking-widest font-black mb-1.5 flex justify-between">
                  <span>Math Formula</span>
                  <span>Pre + Inv = Post</span>
                </p>
                <div className="text-xs font-code font-black text-primary flex justify-between items-center">
                  <span>{fmtINR(preMoney)}</span>
                  <span className="text-[10px] opacity-50">+</span>
                  <span>{fmtINR(investment)}</span>
                  <span className="text-[10px] opacity-50">=</span>
                  <span className="text-sm">{fmtINR(postMoney)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Founder Paper Net Worth */}
        <Card className="border-2 shadow-sm border-blue-200/50 bg-blue-50/30 flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase font-black text-blue-700 tracking-widest">
              Paper Net Worth
            </CardTitle>
            <LineChart className="w-5 h-5 text-blue-500 opacity-80" />
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex items-end gap-2">
              <div className="text-4xl font-code font-black tracking-tight text-blue-700 leading-none">
                {fmtINR(paperNetWorth)}
              </div>
              <span className="text-[10px] text-blue-700/70 mb-1 font-black uppercase tracking-widest">
                Equity Val
              </span>
            </div>
            
            <div className="mt-5 pt-4 border-t border-blue-200/50 space-y-2.5 mt-auto">
              <div className="flex justify-between items-center text-sm font-code">
                <span className="text-blue-900/60 font-bold text-xs uppercase tracking-widest">Post-Money</span>
                <span className="font-black text-blue-900">{fmtINR(postMoney)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-code">
                <span className="text-blue-900/60 font-bold text-xs uppercase tracking-widest">Founder Stake</span>
                <span className="font-black text-blue-900">{fmtPct(founderOwnership)}</span>
              </div>
              
              <div className="bg-blue-900/10 p-2.5 rounded-lg mt-3">
                <p className="text-[9px] text-blue-900/80 uppercase tracking-widest font-black mb-1.5 flex justify-between">
                  <span>Math Formula</span>
                  <span>Post × Eq% = Val</span>
                </p>
                <div className="text-xs font-code font-black text-blue-700 flex justify-between items-center">
                  <span>{fmtINR(postMoney)}</span>
                  <span className="text-[10px] opacity-50">×</span>
                  <span>{fmtPct(founderOwnership)}</span>
                  <span className="text-[10px] opacity-50">=</span>
                  <span className="text-sm">{fmtINR(paperNetWorth)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Revenue & Growth */}
        <Card className="border-2 shadow-sm flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase font-black text-muted-foreground tracking-widest">
              Annual Recurring
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex items-end gap-2">
              <div className="text-4xl font-code font-black tracking-tight text-slate-900 leading-none">
                {fmtINR(arr)}
              </div>
              <span className="text-[10px] text-muted-foreground mb-1 font-black uppercase tracking-widest">
                ARR
              </span>
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 mt-auto">
              <div className="flex justify-between items-center text-sm font-code">
                <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Monthly Rev</span>
                <span className="font-black text-slate-800">{fmtINR(profile?.mRevenue || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-code">
                <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Growth Rate</span>
                <span className={`font-black ${profile?.growthRate > 0 ? 'text-green-600' : 'text-slate-800'}`}>+{profile?.growthRate || 0}% MoM</span>
              </div>
              
              <div className="bg-slate-100 p-2.5 rounded-lg mt-3">
                <p className="text-[9px] text-slate-500 opacity-80 uppercase tracking-widest font-black mb-1.5 flex justify-between">
                  <span>Math Formula</span>
                  <span>MRR × 12 = ARR</span>
                </p>
                <div className="text-xs font-code font-black text-slate-700 flex justify-between items-center">
                  <span>{fmtINR(profile?.mRevenue || 0)}</span>
                  <span className="text-[10px] opacity-50">×</span>
                  <span>12</span>
                  <span className="text-[10px] opacity-50">=</span>
                  <span className="text-sm">{fmtINR(arr)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS OVERVIEW */}
      <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-3 mt-16 mb-8 flex items-center gap-3">
        Master Control
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Card className="hover:shadow-xl transition-all group overflow-hidden border-2 cursor-pointer bg-white" onClick={() => onNavigate('tracker')}>
          <CardContent className="p-0">
            <div className="bg-slate-50 border-b p-8 flex justify-between items-start transition-colors group-hover:bg-slate-100">
              <PieChart className="w-10 h-10 text-slate-400 group-hover:text-primary transition-colors" />
              <ArrowUpRight className="w-6 h-6 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="p-8">
              <h3 className="font-black text-xl mb-2 tracking-tight">Cap Table Tracker</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">Update your shareholders, issue new equity, and track exact capital dilution across your funding history.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all group overflow-hidden border-2 cursor-pointer bg-white" onClick={() => onNavigate('calc')}>
          <CardContent className="p-0">
            <div className="bg-primary/5 border-b border-primary/10 p-8 flex justify-between items-start transition-colors group-hover:bg-primary/10">
              <Activity className="w-10 h-10 text-primary/50 group-hover:text-primary transition-colors" />
              <ArrowUpRight className="w-6 h-6 text-primary/30 group-hover:text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="p-8">
              <h3 className="font-black text-xl mb-2 tracking-tight">Valuation Engine</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">Update your unit economics (CAC/LTV) and test standardized mathematical funding round models.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all group overflow-hidden border-2 cursor-pointer bg-white" onClick={() => onNavigate('exit')}>
          <CardContent className="p-0">
            <div className="bg-amber-50 border-b border-amber-100 p-8 flex justify-between items-start transition-colors group-hover:bg-amber-100">
              <Rocket className="w-10 h-10 text-amber-500/60 group-hover:text-amber-600 transition-colors" />
              <ArrowUpRight className="w-6 h-6 text-amber-300 group-hover:text-amber-500 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="p-8">
              <h3 className="font-black text-xl mb-2 tracking-tight">Exit Simulator</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">Model an acquisition or IPO. Forensically verify exactly who gets what after liquidation preferences.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
