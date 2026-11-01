'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { fmtINR } from '@/lib/utils/formatters';
import { 
  Plus, Trash2, Edit2, Sparkles, Loader2, Wallet, Users, Layers, Cloud,
  Server, Laptop, Calendar, ChevronRight, Download, Clock, Flame, Coins, Send, Play, RefreshCw, Eye, Printer, Info,
  BarChart3, CreditCard, Calculator
} from 'lucide-react';

interface RunwayOperationsViewProps {
  profile: any;
  calculatedStats: any;
  subscriptions: any[];
  team: any[];
  otherBurn: number;
  cashBank: number;
  readOnly?: boolean;
  operationsReports: any[];
  activeReport: any;
  setActiveReport: (r: any) => void;
  aiLoading: boolean;
  triggerAIAnalysis: () => void;
  customQuestion: string;
  setCustomQuestion: (q: string) => void;
  handleSaveSaas: (e: React.FormEvent) => void;
  handleDeleteSaas: (id: string) => void;
  handleSaveMember: (e: React.FormEvent) => void;
  handleDeleteMember: (id: string) => void;
  handleUpdateCash: (v: number) => void;
  handleUpdateOverhead: (v: number) => void;
  handleExportPDF: () => void;
  handleDeleteReport: (id: string, e: React.MouseEvent) => void;
  saasName: string;
  setSaasName: (v: string) => void;
  saasCost: number | '';
  setSaasCost: (v: number | '') => void;
  saasBilling: 'monthly' | 'yearly';
  setSaasBilling: (v: 'monthly' | 'yearly') => void;
  saasCategory: string;
  setSaasCategory: (v: any) => void;
  editingSaasId: string | null;
  setEditingSaasId: (v: string | null) => void;
  memberName: string;
  setMemberName: (v: string) => void;
  memberRole: string;
  setMemberRole: (v: string) => void;
  memberSalary: number | '';
  setMemberSalary: (v: number | '') => void;
  memberStatus: 'active' | 'hiring';
  setMemberStatus: (v: 'active' | 'hiring') => void;
  editingMemberId: string | null;
  setEditingMemberId: (v: string | null) => void;
  cashBankInput: number | '';
  otherBurnInput: number | '';
  simRevenue: number;
  setSimRevenue: (v: number) => void;
  simSaaSPercent: number;
  setSimSaaSPercent: (v: number) => void;
  simSalariesDelta: number;
  setSimSalariesDelta: (v: number) => void;
  CATEGORIES: { value: string; label: string; color: string }[];
}

export function RunwayOperationsView({
  calculatedStats,
  subscriptions,
  team,
  otherBurn,
  cashBank,
  readOnly,
  operationsReports,
  activeReport,
  setActiveReport,
  aiLoading,
  triggerAIAnalysis,
  customQuestion,
  setCustomQuestion,
  handleSaveSaas,
  handleDeleteSaas,
  handleSaveMember,
  handleDeleteMember,
  handleUpdateCash,
  handleUpdateOverhead,
  handleExportPDF,
  handleDeleteReport,
  saasName,
  setSaasName,
  saasCost,
  setSaasCost,
  saasBilling,
  setSaasBilling,
  saasCategory,
  setSaasCategory,
  editingSaasId,
  setEditingSaasId,
  memberName,
  setMemberName,
  memberRole,
  setMemberRole,
  memberSalary,
  setMemberSalary,
  memberStatus,
  setMemberStatus,
  editingMemberId,
  setEditingMemberId,
  cashBankInput,
  otherBurnInput,
  simRevenue,
  setSimRevenue,
  simSaaSPercent,
  setSimSaaSPercent,
  simSalariesDelta,
  setSimSalariesDelta,
  CATEGORIES,
}: RunwayOperationsViewProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('This Month');
  const [isAddSaasOpen, setIsAddSaasOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditCashOpen, setIsEditCashOpen] = useState(false);
  const [isAuditHistoryOpen, setIsAuditHistoryOpen] = useState(false);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);

  // 6-Month Projection Area Chart
  const projectionData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const simSaaS = calculatedStats.totalSaasMonthly * (simSaaSPercent / 100);
    const simSalaries = calculatedStats.totalSalaries + simSalariesDelta;
    const simBurn = Math.max(0, simSaaS + simSalaries + otherBurn - simRevenue);
    const baseCash = cashBank > 0 ? cashBank : 1000000;

    return months.map((month, idx) => {
      const projected = Math.max(0, baseCash - (simBurn * idx * 0.45));
      return {
        month,
        cashBalance: projected,
        burn: simBurn > 0 ? simBurn : calculatedStats.totalBurn,
      };
    });
  }, [cashBank, calculatedStats.totalBurn, calculatedStats.totalSaasMonthly, calculatedStats.totalSalaries, simSaaSPercent, simSalariesDelta, otherBurn, simRevenue]);

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300">
      {/* Top Decorative Soft Wave / Gradient */}
      <div className="absolute -top-4 -right-4 -left-4 h-48 bg-gradient-to-r from-purple-100/50 via-indigo-50/40 to-violet-100/50 pointer-events-none -z-10 rounded-3xl blur-2xl" />

      {/* ── Header Area ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Runway Operations</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track burn, cash, expenses and simulate your runway with AI-powered insights.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Time Range Selector */}
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="h-9 px-3.5 rounded-full bg-white border-slate-200 shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-1.5">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="Last Month">Last Month</SelectItem>
              <SelectItem value="This Quarter">This Quarter</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
            </SelectContent>
          </Select>

          {/* History Icon Button */}
          <Button 
            onClick={() => setIsAuditHistoryOpen(true)}
            variant="outline" 
            size="icon" 
            className="h-9 w-9 rounded-full bg-white border-slate-200 shadow-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            title="Audit History"
          >
            <Clock className="w-4 h-4" />
          </Button>

          {/* Export Button */}
          <Button 
            onClick={handleExportPDF}
            variant="outline" 
            size="sm" 
            className="h-9 px-3.5 rounded-full bg-white border-slate-200 shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Row 1: 5 Top KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Survival Runway (Purple Gradient Card with 3D Calendar) */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[142px]">
          <div className="relative z-10">
            <div className="text-xs font-bold text-white/90">Survival Runway</div>
            <div className="text-4xl font-extrabold text-white mt-1.5 tracking-tight font-mono">
              {calculatedStats.runway === 999 ? '∞' : `${Math.round(calculatedStats.runway)}`}
              {calculatedStats.runway !== 999 && <span className="text-sm font-semibold ml-1 font-sans text-white/80">mo</span>}
            </div>
          </div>

          <div className="relative z-10 mt-3">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              <Flame className="w-3 h-3 text-amber-300" />
              <span>BURN: {fmtINR(calculatedStats.totalBurn)}/mo</span>
            </div>
          </div>

          {/* 3D Calendar SVG Graphic */}
          <div className="absolute -right-2 top-2 pointer-events-none opacity-90 drop-shadow-lg">
            <svg className="w-24 h-24 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="22" y="24" width="56" height="54" rx="14" fill="#EDE9FE" />
              <rect x="22" y="24" width="56" height="18" rx="10" fill="#C4B5FD" />
              <rect x="34" y="15" width="6" height="16" rx="3" fill="#8B5CF6" />
              <rect x="60" y="15" width="6" height="16" rx="3" fill="#8B5CF6" />
              <circle cx="50" cy="56" r="14" fill="#8B5CF6" />
              <path d="M44 56L48 60L56 52" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Liquid Bank Cash */}
        <div 
          onClick={() => setIsEditCashOpen(true)}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between min-h-[142px] hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-slate-300 group-hover:text-slate-500 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-2">Liquid Bank Cash</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              {fmtINR(cashBank)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-3">Adjusts runway calculation</div>
        </div>

        {/* KPI 3: Other Expenses */}
        <div 
          onClick={() => setIsEditCashOpen(true)}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between min-h-[142px] hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-slate-300 group-hover:text-slate-500 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-2">Other Expenses</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              {fmtINR(otherBurn)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-3">Rent, marketing, compliance</div>
        </div>

        {/* KPI 4: Headcount Costs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between min-h-[142px]">
          <div>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800 mt-2">Headcount Costs</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              {fmtINR(calculatedStats.totalSalaries)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-3">
            {calculatedStats.activeHeadcount} Active | {calculatedStats.openRoles} Planned
          </div>
        </div>

        {/* KPI 5: SaaS Costs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between min-h-[142px]">
          <div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800 mt-2">SaaS Costs</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              {fmtINR(calculatedStats.totalSaasMonthly)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-3">
            {subscriptions.length} Subscriptions
          </div>
        </div>

      </div>

      {/* ── Row 2: Burn Breakdown & SaaS Spending Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Monthly Burn Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900">Monthly Burn Breakdown</span>
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-50/80 text-indigo-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-100">
              <RefreshCw className="w-3 h-3 text-indigo-600" />
              <span>Synced to Valuations</span>
            </div>
          </div>

          <div className="py-4 flex flex-wrap items-center justify-between gap-2">
            {/* SaaS Block */}
            <div className="bg-purple-50/70 border border-purple-100/90 rounded-xl p-3 flex items-center gap-3 flex-1 min-w-[100px]">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">SaaS</div>
                <div className="text-sm font-black text-slate-900 font-mono">{fmtINR(calculatedStats.totalSaasMonthly)}</div>
              </div>
            </div>

            <span className="text-slate-400 font-bold text-base px-1">+</span>

            {/* Salaries Block */}
            <div className="bg-sky-50/70 border border-sky-100/90 rounded-xl p-3 flex items-center gap-3 flex-1 min-w-[100px]">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Salaries</div>
                <div className="text-sm font-black text-slate-900 font-mono">{fmtINR(calculatedStats.totalSalaries)}</div>
              </div>
            </div>

            <span className="text-slate-400 font-bold text-base px-1">+</span>

            {/* Other Block */}
            <div className="bg-amber-50/70 border border-amber-100/90 rounded-xl p-3 flex items-center gap-3 flex-1 min-w-[100px]">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Other</div>
                <div className="text-sm font-black text-slate-900 font-mono">{fmtINR(otherBurn)}</div>
              </div>
            </div>

            <span className="text-slate-400 font-bold text-base px-1">=</span>

            {/* Total Burn Block */}
            <div className="bg-white border-2 border-indigo-500/80 rounded-xl p-3 flex items-center gap-3 shadow-xs flex-1 min-w-[130px]">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-indigo-900 uppercase">Total Burn</div>
                <div className="text-sm font-black text-indigo-600 font-mono">{fmtINR(calculatedStats.totalBurn)}/mo</div>
              </div>
            </div>
          </div>
        </div>

        {/* SaaS Spending Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-sm text-slate-900">SaaS Spending Breakdown</span>
          </div>

          <div className="py-2 flex items-center justify-between gap-6">
            {/* Circular Monitor Ring */}
            <div className="relative w-28 h-28 shrink-0 flex flex-col items-center justify-center rounded-full bg-slate-50/80 border-4 border-slate-100 p-2 text-center">
              <Laptop className="w-5 h-5 text-slate-600 mb-0.5" />
              <span className="text-xs font-black text-slate-900 font-mono">{fmtINR(calculatedStats.totalSaasMonthly)}</span>
              <span className="text-[9px] text-slate-400 font-medium">monthly eq.</span>
            </div>

            {/* Right side breakdown or empty state */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {subscriptions.length === 0 ? (
                <>
                  <div className="w-7 h-7 text-indigo-400 mb-1">
                    <Sparkles className="w-5 h-5 mx-auto" />
                  </div>
                  <p className="text-xs font-medium text-slate-600 mb-2.5">No SaaS expenses tracked yet.</p>
                  <Button 
                    onClick={() => {
                      setEditingSaasId(null);
                      setSaasName('');
                      setSaasCost('');
                      setIsAddSaasOpen(true);
                    }}
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold text-xs gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subscription
                  </Button>
                </>
              ) : (
                <div className="w-full space-y-2">
                  {CATEGORIES.slice(0, 3).map(cat => {
                    const val = calculatedStats.categoryTotals[cat.value] || 0;
                    const pct = calculatedStats.totalSaasMonthly > 0 ? (val / calculatedStats.totalSaasMonthly) * 100 : 0;
                    return (
                      <div key={cat.value} className="text-left">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span>{cat.label}</span>
                          <span className="font-mono text-slate-800">{fmtINR(val)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <Button 
                    onClick={() => {
                      setEditingSaasId(null);
                      setSaasName('');
                      setSaasCost('');
                      setIsAddSaasOpen(true);
                    }}
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs font-bold text-indigo-600 hover:bg-indigo-50 p-0"
                  >
                    + Add Another
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 3: Runway & Cash Simulator + Cash & Runway Projection ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Simulator Controls & Tiles (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900">Runway & Cash Simulator</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Inputs (7 cols) */}
              <div className="md:col-span-7 space-y-3.5">
                
                {/* Input 1: Revenue */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-medium text-slate-700">Simulated Monthly Revenue (₹)</Label>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                    <Input 
                      type="number"
                      value={simRevenue}
                      onChange={e => setSimRevenue(Math.max(0, Number(e.target.value) || 0))}
                      className="pl-6 h-8 text-xs font-bold font-mono bg-slate-50/60 border-slate-200"
                    />
                  </div>
                </div>

                {/* Input 2: SaaS Efficiency / Cuts */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-medium text-slate-700">SaaS cost efficiency / cuts</Label>
                  <div className="w-48">
                    <Select 
                      value={String(100 - simSaaSPercent)} 
                      onValueChange={v => setSimSaaSPercent(100 - Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs font-medium bg-slate-50/60 border-slate-200">
                        <SelectValue placeholder="0% cut" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="0">0% cut ({fmtINR(calculatedStats.totalSaasMonthly)} remaining)</SelectItem>
                        <SelectItem value="10">10% cut ({fmtINR(calculatedStats.totalSaasMonthly * 0.9)} remaining)</SelectItem>
                        <SelectItem value="20">20% cut ({fmtINR(calculatedStats.totalSaasMonthly * 0.8)} remaining)</SelectItem>
                        <SelectItem value="30">30% cut ({fmtINR(calculatedStats.totalSaasMonthly * 0.7)} remaining)</SelectItem>
                        <SelectItem value="50">50% cut ({fmtINR(calculatedStats.totalSaasMonthly * 0.5)} remaining)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Input 3: Salaries Delta */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-medium text-slate-700 leading-tight">
                    Salaries change (hire or downscale) (₹/mo)
                  </Label>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                    <Input 
                      type="number"
                      value={simSalariesDelta}
                      onChange={e => setSimSalariesDelta(Number(e.target.value) || 0)}
                      placeholder="+0"
                      className="pl-6 h-8 text-xs font-bold font-mono bg-slate-50/60 border-slate-200"
                    />
                  </div>
                </div>

              </div>

              {/* Output Highlight Tiles (5 cols) */}
              <div className="md:col-span-5 flex flex-col justify-center gap-3">
                {(() => {
                  const simSaaS = calculatedStats.totalSaasMonthly * (simSaaSPercent / 100);
                  const simSalaries = calculatedStats.totalSalaries + simSalariesDelta;
                  const simBurn = simSaaS + simSalaries + otherBurn - simRevenue;
                  const simRunway = simBurn <= 0 ? 999 : cashBank / simBurn;

                  return (
                    <>
                      {/* Net Burn Tile */}
                      <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Simulated Net Burn</div>
                          <div className="text-base font-black text-emerald-600 font-mono">
                            {simBurn <= 0 ? 'Profitable (₹0)' : `${fmtINR(simBurn)}/mo`}
                          </div>
                        </div>
                      </div>

                      {/* Runway Tile */}
                      <div className="bg-purple-50/80 border border-purple-100 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Simulated Runway</div>
                          <div className="text-base font-black text-purple-700 font-mono">
                            {simRunway === 999 ? '∞ months' : `${simRunway.toFixed(1)} months`}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Side: Cash & Runway Projection (5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">Cash & Runway Projection</span>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>Cash Balance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rotate-45 bg-purple-400" />
                  <span>Burn (Monthly)</span>
                </div>
              </div>
            </div>

            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleGradientFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={{ stroke: '#f1f5f9' }} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => v === 0 ? '₹0' : v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}k`}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                  />
                  <RechartsTooltip 
                    formatter={(val: number) => [fmtINR(val), 'Amount']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cashBalance" 
                    name="Cash Balance" 
                    stroke="#8b5cf6" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#purpleGradientFill)" 
                    dot={{ r: 3.5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* ── Row 4: Bottom 3 Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Card 1: SaaS & Subscriptions (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Cloud className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900">SaaS & Subscriptions</span>
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-3">
                  {subscriptions.length === 0 ? 'No subscriptions tracked yet.' : `${subscriptions.length} active subscription(s)`}
                </p>
                <Button 
                  onClick={() => {
                    setEditingSaasId(null);
                    setSaasName('');
                    setSaasCost('');
                    setIsAddSaasOpen(true);
                  }}
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50 font-bold text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Software Cost
                </Button>
              </div>

              {/* Vector Monitor Graphic */}
              <svg className="w-20 h-20 text-purple-200 shrink-0" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="8" width="100" height="70" rx="8" fill="#EDE9FE" />
                <rect x="18" y="16" width="38" height="24" rx="4" fill="#C4B5FD" opacity="0.6" />
                <rect x="62" y="16" width="38" height="24" rx="4" fill="#C4B5FD" opacity="0.6" />
                <rect x="18" y="46" width="38" height="24" rx="4" fill="#C4B5FD" opacity="0.6" />
                <rect x="62" y="46" width="38" height="24" rx="4" fill="#C4B5FD" opacity="0.6" />
                <path d="M48 78L44 92H76L72 78" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="36" y="92" width="48" height="4" rx="2" fill="#A78BFA" />
              </svg>
            </div>
          </div>

          {subscriptions.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Total: {fmtINR(calculatedStats.totalSaasMonthly)}/mo</span>
              <button 
                onClick={() => setIsAddSaasOpen(true)}
                className="text-indigo-600 font-bold hover:underline"
              >
                Manage
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Headcount Planner (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900">Headcount Planner</span>
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-3">
                  {team.length === 0 ? 'No team members listed yet.' : `${team.length} member(s) tracked`}
                </p>
                <Button 
                  onClick={() => {
                    setEditingMemberId(null);
                    setMemberName('');
                    setMemberRole('');
                    setMemberSalary('');
                    setIsAddMemberOpen(true);
                  }}
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50 font-bold text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Role
                </Button>
              </div>

              {/* Vector Avatars Graphic */}
              <svg className="w-20 h-20 text-purple-200 shrink-0" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="36" r="14" fill="#DDD6FE" />
                <path d="M40 76C40 64.9543 48.9543 56 60 56C71.0457 56 80 64.9543 80 76V80H40V76Z" fill="#C4B5FD" />
                <circle cx="34" cy="42" r="11" fill="#EDE9FE" />
                <path d="M18 78C18 69.1634 25.1634 62 34 62C42.8366 62 50 69.1634 50 78V80H18V78Z" fill="#DDD6FE" />
                <circle cx="86" cy="42" r="11" fill="#EDE9FE" />
                <path d="M70 78C70 69.1634 77.1634 62 86 62C94.8366 62 102 69.1634 102 78V80H70V78Z" fill="#DDD6FE" />
              </svg>
            </div>
          </div>

          {team.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Total: {fmtINR(calculatedStats.totalSalaries)}/mo</span>
              <button 
                onClick={() => setIsAddMemberOpen(true)}
                className="text-indigo-600 font-bold hover:underline"
              >
                Manage
              </button>
            </div>
          )}
        </div>

        {/* Card 3: AI Operations Advisor (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-sm text-slate-900">AI Operations Advisor</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Evaluate burn efficiency and get AI recommendations to optimize software subscriptions, roles, and extend runway.
                </p>
                
                <div className="mt-3">
                  <Button 
                    onClick={triggerAIAnalysis}
                    disabled={aiLoading || readOnly}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold px-5 py-2 text-xs flex items-center gap-2 shadow-xs"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{aiLoading ? 'Auditing...' : 'Run Operations Audit'}</span>
                  </Button>
                </div>
              </div>

              {/* 3D AI Chip Illustration */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="20" y="20" width="60" height="60" rx="14" fill="url(#aiChipGradient)" />
                  <rect x="28" y="28" width="44" height="44" rx="8" fill="#7C3AED" />
                  <text x="50" y="56" fill="white" fontSize="18" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">AI</text>
                  <rect x="32" y="10" width="4" height="10" rx="2" fill="#A78BFA" />
                  <rect x="48" y="10" width="4" height="10" rx="2" fill="#A78BFA" />
                  <rect x="64" y="10" width="4" height="10" rx="2" fill="#A78BFA" />
                  <rect x="32" y="80" width="4" height="10" rx="2" fill="#A78BFA" />
                  <rect x="48" y="80" width="4" height="10" rx="2" fill="#A78BFA" />
                  <rect x="64" y="80" width="4" height="10" rx="2" fill="#A78BFA" />
                  <rect x="10" y="32" width="10" height="4" rx="2" fill="#A78BFA" />
                  <rect x="10" y="48" width="10" height="4" rx="2" fill="#A78BFA" />
                  <rect x="10" y="64" width="10" height="4" rx="2" fill="#A78BFA" />
                  <rect x="80" y="32" width="10" height="4" rx="2" fill="#A78BFA" />
                  <rect x="80" y="48" width="10" height="4" rx="2" fill="#A78BFA" />
                  <rect x="80" y="64" width="10" height="4" rx="2" fill="#A78BFA" />
                  <defs>
                    <linearGradient id="aiChipGradient" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A78BFA" />
                      <stop offset="1" stopColor="#6D28D9" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Custom Inquiry Input */}
            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-1.5">
                <span>Custom Inquiry (Optional)</span>
                <Info className="w-3 h-3 text-slate-400" />
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  triggerAIAnalysis();
                }}
                className="relative flex items-center"
              >
                <Input 
                  placeholder="e.g. We want to cut our SaaS spend by 20%. Where do you see direct pruning opportunities?"
                  value={customQuestion}
                  onChange={e => setCustomQuestion(e.target.value)}
                  disabled={readOnly || aiLoading}
                  className="pr-10 h-9 rounded-xl bg-slate-50/70 border-slate-200 text-xs text-slate-800 placeholder:text-slate-400"
                />
                <button 
                  type="submit"
                  disabled={readOnly || aiLoading}
                  className="absolute right-2.5 text-purple-600 hover:text-purple-800 p-1 rounded-md"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Status Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {activeReport ? 'Audit completed. Click to review.' : 'No Operations audit active. Select a historical audit or click "Run Operations Audit".'}
              </span>
            </div>
            {activeReport && (
              <button 
                onClick={() => setIsAuditReportOpen(true)}
                className="text-purple-600 font-bold hover:underline ml-2 shrink-0 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> View Report
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ── Dialog Modals ── */}

      {/* 1. Add / Edit Subscription Dialog */}
      <Dialog open={isAddSaasOpen} onOpenChange={setIsAddSaasOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-purple-600" />
              {editingSaasId ? 'Edit Subscription' : 'Add SaaS Subscription'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Track your recurring software, APIs, and cloud hosting spend.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { handleSaveSaas(e); setIsAddSaasOpen(false); }} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Software Name</Label>
              <Input 
                placeholder="e.g. AWS, GitHub, Cursor, ChatGPT"
                value={saasName}
                onChange={e => setSaasName(e.target.value)}
                required
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Cost (₹)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 5000"
                  value={saasCost}
                  onChange={e => setSaasCost(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Billing Cycle</Label>
                <Select value={saasBilling} onValueChange={(v: any) => setSaasBilling(v)}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Category</Label>
              <Select value={saasCategory} onValueChange={(v: any) => setSaasCategory(v)}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {subscriptions.length > 0 && (
              <div className="pt-2 border-t border-slate-100 max-h-36 overflow-y-auto space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">Current Subscriptions</div>
                {subscriptions.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600">{fmtINR(s.cost)}/{s.billing === 'yearly' ? 'yr' : 'mo'}</span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteSaas(s.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSaasOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold">
                {editingSaasId ? 'Update Subscription' : 'Save Subscription'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Add / Edit Team Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              {editingMemberId ? 'Edit Team Role' : 'Add Team Role'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Plan your payroll, active teammates, and future hires.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { handleSaveMember(e); setIsAddMemberOpen(false); }} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Name / Placeholder</Label>
              <Input 
                placeholder="e.g. Alex (or 'Senior Backend Dev')"
                value={memberName}
                onChange={e => setMemberName(e.target.value)}
                required
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Role / Title</Label>
              <Input 
                placeholder="e.g. Fullstack Engineer, Growth Lead"
                value={memberRole}
                onChange={e => setMemberRole(e.target.value)}
                required
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Monthly Salary (₹)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 80000"
                  value={memberSalary}
                  onChange={e => setMemberSalary(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <Select value={memberStatus} onValueChange={(v: any) => setMemberStatus(v)}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Employed)</SelectItem>
                    <SelectItem value="hiring">Planned (Hiring)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {team.length > 0 && (
              <div className="pt-2 border-t border-slate-100 max-h-36 overflow-y-auto space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">Current Team Members</div>
                {team.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                    <div>
                      <span className="font-semibold text-slate-800">{m.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({m.role})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600">{fmtINR(m.salary)}/mo</span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteMember(m.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddMemberOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold">
                {editingMemberId ? 'Update Role' : 'Save Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Edit Cash & Overhead Dialog */}
      <Dialog open={isEditCashOpen} onOpenChange={setIsEditCashOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Update Bank Cash & Expenses
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adjust your liquid bank balance and other general overheads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Liquid Bank Cash (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                <Input 
                  type="number"
                  value={cashBankInput}
                  onChange={e => handleUpdateCash(Number(e.target.value) || 0)}
                  className="pl-7 h-9 rounded-xl text-xs font-bold font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">Total liquid reserves currently available to fund operations.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Other Expenses (₹/mo)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                <Input 
                  type="number"
                  value={otherBurnInput}
                  onChange={e => handleUpdateOverhead(Number(e.target.value) || 0)}
                  className="pl-7 h-9 rounded-xl text-xs font-bold font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">Fixed overheads like office rent, compliance, legal, marketing.</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsEditCashOpen(false)} size="sm" className="bg-slate-900 text-white rounded-xl text-xs font-bold">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Audit History Dialog */}
      <Dialog open={isAuditHistoryOpen} onOpenChange={setIsAuditHistoryOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Operations Audit History
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Past AI runway analyses and optimization recommendations.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {operationsReports.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No historical operations audits found. Run an audit to start tracking history.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto space-y-1">
                {operationsReports.map(report => {
                  const date = report.createdAt ? new Date(report.createdAt.seconds * 1000) : new Date();
                  const label = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div 
                      key={report.id}
                      className="p-3 text-xs hover:bg-purple-50/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      onClick={() => {
                        setActiveReport(report);
                        setIsAuditHistoryOpen(false);
                        setIsAuditReportOpen(true);
                      }}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{label}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {report.advice?.summary || 'Operations analysis'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                          View
                        </Badge>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-slate-400 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(report.id, e);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Audit Report Output Dialog */}
      <Dialog open={isAuditReportOpen} onOpenChange={setIsAuditReportOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Operations Audit Report
              </DialogTitle>
              <Button 
                onClick={handleExportPDF}
                variant="outline" 
                size="sm" 
                className="h-7 text-xs font-semibold gap-1 rounded-lg"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" /> Export PDF
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Generated {activeReport?.createdAt ? new Date(activeReport.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
            </DialogDescription>
          </DialogHeader>

          {activeReport && (
            <div className="space-y-4 pt-2">
              {/* Summary */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-slate-700 leading-relaxed font-medium italic">
                "{activeReport.advice?.summary || 'No summary available.'}"
              </div>

              {/* Runway & Burn Composition */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Runway & Burn Composition</div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  {activeReport.advice?.runwayAnalysis || 'No runway analysis available.'}
                </div>
              </div>

              {/* Cost Optimization */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> SaaS Cost Savings
                </div>
                <ul className="space-y-1.5">
                  {(activeReport.advice?.costOptimizationOpportunities || []).map((item: string, i: number) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Headcount Recommendations */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 shrink-0" /> Headcount Recommendations
                </div>
                <ul className="space-y-1.5">
                  {(activeReport.advice?.teamPlanningRecommendations || []).map((item: string, i: number) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
