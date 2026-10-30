'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles, Loader2, Compass, Layers, AlertTriangle, CheckCircle2,
  TrendingUp, Code, DollarSign, ListTodo, ShieldAlert, Zap, ArrowRight,
  Clock, RefreshCw
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
      // Calculate financial context from company profile data
      const mrr = companyProfile?.mRevenue || products.reduce((acc, p) => acc + (Number(p.mrr) || 0), 0);
      const cash = companyProfile?.cashBank || 0;
      
      // Calculate burn rate
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

  const getRoleBadge = (role: string) => {
    const lower = role.toLowerCase();
    if (lower.includes('cash cow') || lower.includes('primary revenue') || lower.includes('core')) {
      return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">💰 {role}</span>;
    }
    if (lower.includes('growth') || lower.includes('hook') || lower.includes('magnet')) {
      return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">🚀 {role}</span>;
    }
    if (lower.includes('drain') || lower.includes('sunset') || lower.includes('distraction')) {
      return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">⚠️ {role}</span>;
    }
    return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">⭐ {role}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white shadow-xl rounded-2xl overflow-hidden relative">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-bold border border-indigo-400/30">
              <Compass className="w-3.5 h-3.5 text-indigo-300" />
              Chief Product Officer & Portfolio Strategist
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Product Suite Intelligence & Recommendations
            </h2>
            <p className="text-sm text-indigo-100/80 leading-relaxed font-normal">
              Get an objective, CPO-level strategic audit across all {products.length} tracked products. Identifies high-conviction growth engines, shared technical leverage, resource cannibalization traps, and optimal bandwidth allocation tied to your cash runway.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={() => handleRunSuiteAnalysis()}
              disabled={loading || readOnly || products.length === 0}
              className="bg-white hover:bg-slate-100 text-indigo-900 font-extrabold h-11 px-6 gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Analyzing Suite...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  {recommendations ? 'Re-run Suite Analysis' : 'Analyze Product Suite'}
                </>
              )}
            </Button>
            {recommendations && (
              <p className="text-[11px] text-indigo-200/70 font-medium flex items-center gap-1 justify-center sm:justify-end">
                <Clock className="w-3 h-3" />
                Updated {new Date(recommendations.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading animation card */}
      {loading && (
        <Card className="border-2 border-indigo-100 bg-indigo-50/10 shadow-md py-16 text-center animate-pulse">
          <CardContent className="flex flex-col items-center justify-center space-y-5">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">FounderOS Product Suite AI is Evaluating Portfolio</h3>
              <p className="text-sm text-indigo-700 font-semibold max-w-lg transition-all duration-300">
                {loadingMessages[loadingMessageIdx]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Recommendations Content */}
      {!loading && recommendations && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Executive Summary */}
          <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                Executive Portfolio Diagnosis
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-slate-500">
                High-level strategic diagnosis of focus, portfolio coherence, and team distraction risks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                <ReactMarkdown>{recommendations.executiveSummary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Product Prioritization Matrix */}
          <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Product Prioritization & Strategic Role Matrix
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-slate-500">
                Ranked order of attention and specific next milestone for each product in your suite.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.productPrioritizations?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                            #{item.priorityRank || idx + 1}
                          </span>
                          <h4 className="text-sm font-black text-slate-900">
                            {item.productName}
                          </h4>
                        </div>
                        {getRoleBadge(item.strategicRole)}
                      </div>

                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {item.keyRecommendation}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 bg-white/70 p-3 rounded-lg flex items-start gap-2">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                          Next 30-Day Milestone
                        </span>
                        <span className="text-xs font-bold text-slate-800 leading-snug">
                          {item.suggestedNextMilestone}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2-Column: Resource Allocation & Synergies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resource Allocation */}
            <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Engineering & Bandwidth Allocation
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500">
                  Optimal allocation of developer hours and budget bound by cash runway.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  <ReactMarkdown>{recommendations.resourceAllocation}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Synergies & Bundling */}
            <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Cross-Selling & Bundling Flywheels
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500">
                  Shared technical leverage, bundling pricing, and referral loops.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  <ReactMarkdown>{recommendations.synergiesAndBundling}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2-Column: Risks and Immediate Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Execution Risks */}
            <Card className="border border-rose-200/80 shadow-sm bg-rose-50/15 overflow-hidden">
              <CardHeader className="bg-rose-50/40 border-b border-rose-100 py-4">
                <CardTitle className="text-sm font-black text-rose-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Critical Execution & Cannibalization Risks
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-rose-700/80">
                  Traps to avoid when developing and marketing multiple products concurrently.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {recommendations.executionRisks?.map((risk, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-rose-100 shadow-sm">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-slate-800 leading-relaxed">{risk}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Immediate Actions */}
            <Card className="border border-indigo-200/80 shadow-sm bg-indigo-50/15 overflow-hidden">
              <CardHeader className="bg-indigo-50/40 border-b border-indigo-100 py-4">
                <CardTitle className="text-sm font-black text-indigo-900 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-indigo-600" />
                  Immediate High-Leverage Actions
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-indigo-700/80">
                  Key moves for founder & core team to execute this week.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {recommendations.immediateSuiteActions?.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 leading-relaxed">{action}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State before any analysis has been run */}
      {!loading && !recommendations && (
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center shadow-sm">
          <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
            <div className="p-4 bg-indigo-50 rounded-full border border-indigo-100">
              <Compass className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">No Product Suite Recommendations Generated Yet</h3>
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
                className="bg-white border-slate-200 text-xs font-medium"
              />
            </div>

            <Button
              type="button"
              onClick={() => handleRunSuiteAnalysis()}
              disabled={readOnly || products.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 gap-2 mt-2 shadow-sm text-xs"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              Analyze Product Suite & Recommend Strategy
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
