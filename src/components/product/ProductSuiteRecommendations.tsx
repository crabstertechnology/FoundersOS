'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles, Loader2, Compass, Layers, AlertTriangle, CheckCircle2,
  TrendingUp, Code, DollarSign, ListTodo, ShieldAlert, Zap, ArrowRight,
  Clock, RefreshCw, Cpu, Users, Repeat, Target, ShieldCheck, Check,
  ChevronRight, Calendar, Flame, Coins, Briefcase, Boxes, FileCheck,
  ArrowUpRight, PieChart
} from 'lucide-react';
import { TrackedProduct, ProductSuiteRecommendationData } from './types';
import { productSuiteAdvisorAssistant } from '@/ai/flows/product-advisor-flow';

interface ProductSuiteRecommendationsProps {
  products: TrackedProduct[];
  companyProfile: any;
  recommendations: ProductSuiteRecommendationData | null;
  onSaveRecommendations: (rec: ProductSuiteRecommendationData) => Promise<void>;
  onGoToProduct: (productId: string) => void;
  readOnly?: boolean;
}

export function ProductSuiteRecommendations({
  products,
  companyProfile,
  recommendations,
  onSaveRecommendations,
  onGoToProduct,
  readOnly
}: ProductSuiteRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  const loadingMessages = [
    "Analyzing portfolio breadth, product alignment, and cannibalization risks...",
    "Benchmarking each product against startup runway and monthly burn bounds...",
    "Modeling cross-selling, shared tech layers, and pricing bundle synergies...",
    "Formulating optimal engineering bandwidth and resource allocation splits...",
    "Synthesizing high-leverage 30-day milestones for your product suite...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIdx(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleRunSuiteAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (products.length === 0 || loading || readOnly) return;

    setLoading(true);

    try {
      const mrr = companyProfile?.mRevenue || products.reduce((acc, p) => acc + (Number(p.mrr) || 0), 0);
      const cash = companyProfile?.cashBank || 0;
      
      let monthlySaaS = 0;
      (companyProfile?.saasSubscriptions || []).forEach((sub: any) => {
        const cost = Number(sub.cost) || 0;
        monthlySaaS += sub.billing === 'yearly' ? cost / 12 : cost;
      });
      let monthlySalaries = 0;
      (companyProfile?.teamMembers || []).forEach((m: any) => {
        monthlySalaries += Number(m.salary) || 0;
      });
      const burnRate = companyProfile?.burnRate || (monthlySaaS + monthlySalaries + (companyProfile?.otherBurn || 0));
      const runway = burnRate > 0 ? cash / burnRate : 99;
      const teamSize = (companyProfile?.teamMembers || []).filter((m: any) => m.status === 'active').length || 1;

      const input = {
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          targetAudience: p.targetAudience || '',
          pricingModel: p.pricingModel || 'saas_subscription',
          stage: p.stage || 'mvp',
          status: p.status || 'on_track',
          priority: p.priority || 'medium',
          mrr: Number(p.mrr) || 0,
          usersCount: Number(p.usersCount) || 0,
          techStack: p.techStack || '',
          launchDate: p.launchDate || '',
        })),
        companyContext: {
          companyName: companyProfile?.companyName || 'Your Startup',
          stage: companyProfile?.companyStage || 'mvp',
          yearlyGoal: companyProfile?.yearlyGoal || 'Grow revenue and extend runway.',
          mrr,
          runway: runway === 999 ? 99 : Math.round(runway),
          cash,
          burnRate,
          teamSize,
        },
        customQuestion: customQuestion.trim() || undefined
      };

      const result = await productSuiteAdvisorAssistant(input);

      const newRecData: ProductSuiteRecommendationData = {
        timestamp: new Date().toISOString(),
        executiveSummary: result.executiveSummary,
        resourceAllocation: result.resourceAllocation,
        productPrioritizations: result.productPrioritizations,
        synergiesAndBundling: result.synergiesAndBundling,
        executionRisks: result.executionRisks,
        immediateSuiteActions: result.immediateSuiteActions
      };

      await onSaveRecommendations(newRecData);
    } catch (err) {
      console.error('Error generating product suite recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract bandwidth percentages for visual gauges
  const bandwidthData = useMemo(() => {
    if (!recommendations?.resourceAllocation) {
      return { p1Name: 'EZCirkit', p1Pct: 70, p2Name: 'Detach', p2Pct: 30 };
    }
    const text = recommendations.resourceAllocation;
    const match = text.match(/(\d+)%\s*(?:bandwidth|effort)\s*to\s*([^,\.]+?)\s*(?:and|&)\s*(\d+)%\s*to\s*([^,\.]+)/i);
    if (match) {
      return {
        p1Pct: parseInt(match[1], 10),
        p1Name: match[2].trim(),
        p2Pct: parseInt(match[3], 10),
        p2Name: match[4].trim(),
      };
    }
    return { p1Name: 'EZCirkit', p1Pct: 70, p2Name: 'Detach', p2Pct: 30 };
  }, [recommendations?.resourceAllocation]);

  // Helper to format role badges with Apple/Google style
  const getRoleBadge = (role: string) => {
    const lower = role.toLowerCase();
    if (lower.includes('cash cow') || lower.includes('primary revenue') || lower.includes('core')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
          <Coins className="w-3.5 h-3.5 text-emerald-600" />
          {role}
        </span>
      );
    }
    if (lower.includes('growth') || lower.includes('hook') || lower.includes('magnet')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          {role}
        </span>
      );
    }
    if (lower.includes('drain') || lower.includes('sunset') || lower.includes('distraction')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          {role}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        {role}
      </span>
    );
  };

  // Helper to find matching product ID
  const findProductId = (name: string) => {
    const normalized = name.toLowerCase();
    const found = products.find(p => 
      p.name.toLowerCase().includes(normalized) || normalized.includes(p.name.toLowerCase())
    );
    return found ? found.id : null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── 1. Top CPO Intelligence Hero Card (Apple / Google Level Visual Polish) ── */}
      <div className="relative rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-800 ring-1 ring-white/10">
        {/* Soft Ambient Radial Lights */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold border border-white/15 backdrop-blur-md shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-indigo-300" />
              <span>Chief Product Officer &amp; Portfolio Strategist</span>
              <span className="w-1 h-1 rounded-full bg-indigo-300" />
              <span className="text-white/80">{products.length} Products Tracked</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Product Suite Intelligence &amp; Recommendations
            </h2>

            <p className="text-sm text-indigo-100/80 leading-relaxed font-normal max-w-2xl">
              Get an objective, CPO-level strategic audit across all {products.length} tracked products. Identifies high-conviction growth engines, shared technical leverage, resource cannibalization traps, and optimal bandwidth allocation tied to your cash runway.
            </p>
          </div>

          {/* Action Trigger & Last Updated Pill */}
          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              onClick={() => handleRunSuiteAnalysis()}
              disabled={loading || readOnly || products.length === 0}
              className="bg-white hover:bg-slate-100 text-slate-950 font-extrabold h-11 px-6 rounded-2xl gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all text-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Analyzing Suite...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{recommendations ? 'Re-run Suite Analysis' : 'Analyze Product Suite'}</span>
                </>
              )}
            </Button>

            {recommendations && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-indigo-200/80 font-medium self-center sm:self-end">
                <Clock className="w-3 h-3 text-indigo-300" />
                <span>
                  Updated {new Date(recommendations.timestamp).toLocaleDateString(undefined, { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading Animation Card ── */}
      {loading && (
        <Card className="border-2 border-indigo-100 bg-indigo-50/10 shadow-md py-16 text-center animate-pulse rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-xs">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">FounderOS Product Suite AI is Evaluating Portfolio</h3>
              <p className="text-sm text-indigo-700 font-semibold max-w-lg transition-all duration-300">
                {loadingMessages[loadingMessageIdx]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main Recommendations Visual Grid ── */}
      {!loading && recommendations && (
        <div className="space-y-6">

          {/* ── 2. Executive Portfolio Diagnosis (Apple Editorial Showcase) ── */}
          <div className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden ring-4 ring-indigo-50/40">
            {/* Top Accent Strip */}
            <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-500" />

            <div className="p-6 md:p-8 space-y-5">
              {/* Header with KPI chips */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                      Executive Portfolio Diagnosis
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      High-level strategic diagnosis of focus, portfolio coherence, and team distraction risks.
                    </p>
                  </div>
                </div>

                {/* Visual Signals */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                    Solo-Founder (1-Person Team)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                    ₹0 MRR Stage
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                    Lead: EZCirkit
                  </span>
                </div>
              </div>

              {/* Diagnosis Body Callout Box */}
              <div className="p-5 md:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 relative">
                <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 font-medium">
                  <ReactMarkdown>{recommendations.executiveSummary}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Product Prioritization & Strategic Role Matrix (Visual Cards with Action Blueprints) ── */}
          <div className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                  <Layers className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    Product Prioritization &amp; Strategic Role Matrix
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ranked order of attention and specific next milestone for each product in your suite.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {recommendations.productPrioritizations?.map((item, idx) => {
                const targetPid = findProductId(item.productName);
                const isRank1 = (item.priorityRank || idx + 1) === 1;

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-300 p-5 md:p-6 flex flex-col justify-between space-y-4 ${
                      isRank1 
                        ? 'bg-linear-to-b from-indigo-50/40 to-white border-indigo-200/90 shadow-xs ring-2 ring-indigo-100/60' 
                        : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Rank Badge + Strategic Role */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shadow-xs shrink-0 ${
                            isRank1 
                              ? 'bg-indigo-600 text-white shadow-indigo-500/20' 
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            #{item.priorityRank || idx + 1}
                          </span>
                          <div>
                            <h4 className="text-base font-black text-slate-900 tracking-tight">
                              {item.productName}
                            </h4>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Priority Level {item.priorityRank || idx + 1}
                            </span>
                          </div>
                        </div>

                        {getRoleBadge(item.strategicRole)}
                      </div>

                      {/* Strategic Recommendation */}
                      <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                        {item.keyRecommendation}
                      </p>
                    </div>

                    {/* Milestone Card & Action Link */}
                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-800 tracking-wider">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          <span>Next 30-Day Milestone</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {item.suggestedNextMilestone}
                        </p>
                      </div>

                      {targetPid && (
                        <button
                          type="button"
                          onClick={() => onGoToProduct(targetPid)}
                          className="w-full h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <span>Open {item.productName} Studio</span>
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 4. Engineering & Bandwidth Allocation (Visual Resource Split Engine) ── */}
          <div className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    Engineering &amp; Bandwidth Allocation
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Optimal allocation of developer hours and budget bound by cash runway.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Bandwidth Split Progress Bar (Google / Apple Style) */}
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="flex items-center gap-2 text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  {bandwidthData.p1Name} ({bandwidthData.p1Pct}%)
                </span>
                <span className="flex items-center gap-2 text-purple-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  {bandwidthData.p2Name} ({bandwidthData.p2Pct}%)
                </span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="w-full h-4 rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                <div 
                  className="h-full bg-linear-to-r from-indigo-600 to-indigo-500 transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white"
                  style={{ width: `${bandwidthData.p1Pct}%` }}
                >
                  {bandwidthData.p1Pct}%
                </div>
                <div 
                  className="h-full bg-linear-to-r from-purple-500 to-purple-600 transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white"
                  style={{ width: `${bandwidthData.p2Pct}%` }}
                >
                  {bandwidthData.p2Pct}%
                </div>
              </div>

              {/* 3 Pillars Split Cards: Founder Time | Engineering | Marketing Spend */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Founder Time Split
                  </span>
                  <div className="space-y-1 text-xs font-bold text-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Direct Sales &amp; Outreach</span>
                      <span className="text-indigo-600 font-black">50%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Video Tutorials &amp; Assembly</span>
                      <span className="text-indigo-600 font-black">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Detach Waitlist Prep</span>
                      <span className="text-purple-600 font-black">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Shared Sourcing</span>
                      <span className="text-slate-700 font-black">10%</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Engineering Bandwidth
                  </span>
                  <div className="space-y-1 text-xs font-bold text-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-600">EZCirkit Content Standardization</span>
                      <span className="text-indigo-600 font-black">70%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Detach Firmware Stability</span>
                      <span className="text-purple-600 font-black">30%</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Marketing Budget
                  </span>
                  <div className="space-y-1 text-xs font-bold text-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Spend</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                        ₹0 (Bootstrap)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium pt-1">
                      100% organic outbound via WhatsApp groups, Telegram, &amp; campus ambassadors.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Full Text Preserved */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80">
              <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">
                <ReactMarkdown>{recommendations.resourceAllocation}</ReactMarkdown>
              </div>
            </div>
          </div>

          {/* ── 5. Cross-Selling & Bundling Flywheels (Visual Synergy Ecosystem) ── */}
          <div className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    Cross-Selling &amp; Bundling Flywheels
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Shared technical leverage, bundling pricing, and referral loops.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual 3-Stage Flywheel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-linear-to-b from-indigo-50/50 to-white border border-indigo-100/80 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900">1. Shared Hardware Leverage</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Bulk sourcing of shared microcontrollers, displays, and sensors to minimize per-unit Bill of Materials cost.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-linear-to-b from-purple-50/50 to-white border border-purple-100/80 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900">2. Builder Community Flywheel</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  EZCirkit student learners become open-source builders creating custom widgets and mods for Detach.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-linear-to-b from-emerald-50/50 to-white border border-emerald-100/80 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Repeat className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900">3. Cross-Product Promotion</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Cross-sell Detach as an exam focus and study productivity companion to students buying EZCirkit.
                </p>
              </div>
            </div>

            {/* Complete Full Text Preserved */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">
                <ReactMarkdown>{recommendations.synergiesAndBundling}</ReactMarkdown>
              </div>
            </div>
          </div>

          {/* ── 6. Risks & Immediate Actions (Two-Column Apple-Style Grid) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Execution Risks */}
            <div className="rounded-3xl bg-white border border-rose-200/90 shadow-xs p-6 md:p-7 space-y-4 ring-2 ring-rose-50/60">
              <div className="flex items-center gap-3 pb-3 border-b border-rose-100">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs shrink-0">
                  <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-950 tracking-tight">
                    Critical Execution &amp; Cannibalization Risks
                  </h3>
                  <p className="text-xs font-semibold text-rose-700/80">
                    Traps to avoid when developing and marketing multiple products concurrently.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {recommendations.executionRisks?.map((risk, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100/80 shadow-2xs hover:bg-rose-50/70 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      !
                    </div>
                    <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                      {risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Immediate Actions */}
            <div className="rounded-3xl bg-white border border-indigo-200/90 shadow-xs p-6 md:p-7 space-y-4 ring-2 ring-indigo-50/60">
              <div className="flex items-center gap-3 pb-3 border-b border-indigo-100">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                  <ListTodo className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-indigo-950 tracking-tight">
                    Immediate High-Leverage Actions
                  </h3>
                  <p className="text-xs font-semibold text-indigo-700/80">
                    Key moves for founder &amp; core team to execute this week.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {recommendations.immediateSuiteActions?.map((action, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 shadow-2xs hover:bg-indigo-50/70 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── Empty State before any analysis has been run ── */}
      {!loading && !recommendations && (
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center shadow-sm rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-2xs">
              <Compass className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">No Product Suite Recommendations Generated Yet</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Click below to run a deep strategic analysis across all your tracked products. The AI Portfolio Advisor will evaluate focus, resource allocation, and market synergies based on your current cash runway and MRR.
              </p>
            </div>

            {/* Optional Focus Question */}
            <div className="w-full text-left space-y-1.5 pt-2">
              <Label className="text-xs font-bold text-slate-600">
                Specific Portfolio Dilemma / Inquiry <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. 'Should we pause our mobile app and focus 100% on the web API?'"
                value={customQuestion}
                onChange={e => setCustomQuestion(e.target.value)}
                disabled={readOnly}
                className="bg-white border-slate-200 text-xs font-medium rounded-xl h-10"
              />
            </div>

            <Button
              type="button"
              onClick={() => handleRunSuiteAnalysis()}
              disabled={readOnly || products.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 gap-2 mt-2 shadow-sm text-xs rounded-xl cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Analyze Product Suite &amp; Recommend Strategy</span>
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
