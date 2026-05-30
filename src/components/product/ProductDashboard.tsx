'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { productAdvisorAssistant } from '@/ai/flows/product-advisor-flow';
import ReactMarkdown from 'react-markdown';
import { 
  Box, Sparkles, Loader2, Code, TrendingUp, DollarSign, ListTodo, AlertTriangle, 
  HelpCircle, ChevronRight, FileText, CheckCircle2 
} from 'lucide-react';

interface ProductDashboardProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
}

export function ProductDashboard({ userId, companyProfileId, readOnly }: ProductDashboardProps) {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [pricingModel, setPricingModel] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'review' | 'gtm' | 'dev' | 'finance' | 'steps'>('review');

  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  // Sync from firestore profile once loaded
  useEffect(() => {
    if (profile) {
      if (profile.prodName) setProductName(profile.prodName);
      if (profile.prodDesc) setProductDescription(profile.prodDesc);
      if (profile.prodTarget) setTargetAudience(profile.prodTarget);
      if (profile.prodPricing) setPricingModel(profile.prodPricing);
      if (profile.prodQuestion) setCustomQuestion(profile.prodQuestion);
    }
  }, [profile]);

  // Loading message animation loop
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const loadingMessages = [
    "Analyzing your product specifications and competitive value-prop...",
    "Assessing market placement, positioning vectors, and GTM routes...",
    "Reviewing tech stack scalability, architecture patterns, and MVP scoping...",
    "Evaluating cash balances, operational burn rate, and financial runway bounds...",
    "Formulating action targets, engineering priorities, and client validation experiments...",
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !productName || !productDescription || loading) return;

    setLoading(true);

    try {
      // Calculate financial context from company profile data
      const mrr = profile?.mRevenue || 0;
      const cash = profile?.cashBank || 0;
      
      // Calculate burn rate
      let monthlySaaS = 0;
      (profile?.saasSubscriptions || []).forEach((sub: any) => {
        const cost = Number(sub.cost) || 0;
        monthlySaaS += sub.billing === 'yearly' ? cost / 12 : cost;
      });
      let monthlySalaries = 0;
      (profile?.teamMembers || []).forEach((m: any) => {
        monthlySalaries += Number(m.salary) || 0;
      });
      const burnRate = profile?.burnRate || (monthlySaaS + monthlySalaries + (profile?.otherBurn || 0));
      const runway = burnRate > 0 ? cash / burnRate : 99;
      const teamSize = (profile?.teamMembers || []).filter((m: any) => m.status === 'active').length;

      const input = {
        productName,
        productDescription,
        targetAudience,
        pricingModel,
        customQuestion: customQuestion || undefined,
        companyContext: {
          companyName: profile?.companyName || 'Your Startup',
          stage: profile?.companyStage || 'mvp',
          yearlyGoal: profile?.yearlyGoal || 'Scale operations and increase revenue.',
          mrr,
          runway: runway === 999 ? 99 : Math.round(runway),
          cash,
          burnRate,
          teamSize,
        }
      };

      const result = await productAdvisorAssistant(input);

      // Save fields and AI output in companyProfile
      await setDocumentNonBlocking(profileRef, {
        prodName: productName,
        prodDesc: productDescription,
        prodTarget: targetAudience,
        prodPricing: pricingModel,
        prodQuestion: customQuestion,
        prodAIPlan: result
      }, { merge: true });

    } catch (err) {
      console.error('Error generating product plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const aiPlan = profile?.prodAIPlan;
  const hasPlan = aiPlan && !loading;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-2 mt-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2 flex items-center gap-3">
            <Box className="w-10 h-10 text-indigo-600" />
            AI Product Suite
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Review your product specs, plan developer scopes, and model go-to-market strategies aligned with your runway.
          </p>
        </div>
      </div>

      {/* Loading overlay/animation */}
      {loading && (
        <Card className="border-2 border-indigo-100 bg-indigo-50/5 shadow-md py-16 text-center animate-pulse">
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">FounderOS Product AI is Processing</h3>
              <p className="text-sm text-indigo-700 font-semibold max-w-md transition-all duration-300">
                {loadingMessages[loadingMessageIdx]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main layout: split column when plan is available */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Inputs Section (always visible or collapses, here we show left side/top side) */}
          <div className={`${hasPlan ? 'lg:col-span-5' : 'lg:col-span-8 lg:col-start-2'} space-y-6`}>
            <Card className="border-2 border-slate-200 hover:border-indigo-200 transition-all shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Product Specifications
                </CardTitle>
                <CardDescription>
                  Enter your product details to receive a strategic sales and engineering validation blueprint.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleGenerate} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Product Name</Label>
                    <Input
                      placeholder="e.g. EZCirkit Block IDE"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      required
                      disabled={readOnly}
                      className="border-slate-200 font-semibold h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Product Description</Label>
                    <textarea
                      rows={5}
                      placeholder="Describe the product, its key features, value proposition, and how it solves user problems..."
                      value={productDescription}
                      onChange={e => setProductDescription(e.target.value)}
                      required
                      disabled={readOnly}
                      className="w-full text-sm font-medium p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Target Audience / ICP</Label>
                    <Input
                      placeholder="e.g. Hardware engineering students, STEM schools, makers"
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      required
                      disabled={readOnly}
                      className="border-slate-200 font-semibold h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase tracking-wider text-slate-500">Pricing Model</Label>
                    <Select value={pricingModel} onValueChange={setPricingModel} disabled={readOnly}>
                      <SelectTrigger className="w-full h-10 border-slate-200 font-semibold">
                        <SelectValue placeholder="Select pricing strategy..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freemium">Freemium (Free Basic tier, paid upgrades)</SelectItem>
                        <SelectItem value="saas_subscription">SaaS Subscription (Monthly / Yearly plan)</SelectItem>
                        <SelectItem value="one_time">One-time Purchase (LTD / perpetual license)</SelectItem>
                        <SelectItem value="usage_based">Usage-based / Pay-as-you-go</SelectItem>
                        <SelectItem value="enterprise">Enterprise Custom Pricing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      Founder's Custom Focus Inquiry
                      <span className="text-[10px] text-slate-400 lowercase font-normal">(optional)</span>
                    </Label>
                    <textarea
                      rows={2}
                      placeholder="Ask anything specific (e.g. 'Is pricing too high for Indian engineering students?', 'Should I build web IDE or desktop IDE?')..."
                      value={customQuestion}
                      onChange={e => setCustomQuestion(e.target.value)}
                      disabled={readOnly}
                      className="w-full text-sm font-medium p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {profile?.attachedDocName && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="text-[11px] font-semibold text-slate-600 truncate">
                        Cross-referencing Attached Strategy: <span className="text-slate-800 font-bold">{profile.attachedDocName}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={readOnly || !productName || !productDescription}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Analyze Specs & Generate Strategy
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* AI Outputs Section */}
          <div className={`${hasPlan ? 'lg:col-span-7' : 'hidden'} space-y-6`}>
            {hasPlan && (
              <Card className="border-2 border-indigo-100 shadow-md flex flex-col min-h-[600px]">
                <CardHeader className="border-b bg-indigo-50/10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      AI Strategic Product Blueprint
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Synchronized recommendations mapping features to runway.
                    </CardDescription>
                  </div>
                </CardHeader>

                {/* Sub Tab selection */}
                <div className="flex border-b divide-x overflow-x-auto bg-slate-50/50">
                  <button
                    onClick={() => setActiveSubTab('review')}
                    className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      activeSubTab === 'review' 
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Box className="w-4 h-4" />
                    Evaluation
                  </button>
                  <button
                    onClick={() => setActiveSubTab('gtm')}
                    className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      activeSubTab === 'gtm' 
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    How to Sell
                  </button>
                  <button
                    onClick={() => setActiveSubTab('dev')}
                    className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      activeSubTab === 'dev' 
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                    What to Develop
                  </button>
                  <button
                    onClick={() => setActiveSubTab('finance')}
                    className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      activeSubTab === 'finance' 
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Runway Impact
                  </button>
                  <button
                    onClick={() => setActiveSubTab('steps')}
                    className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      activeSubTab === 'steps' 
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    Action Items
                  </button>
                </div>

                <CardContent className="p-6 flex-1 max-h-[600px] overflow-y-auto">
                  {activeSubTab === 'review' && (
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown>{aiPlan.review}</ReactMarkdown>
                    </div>
                  )}

                  {activeSubTab === 'gtm' && (
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown>{aiPlan.howToSell}</ReactMarkdown>
                    </div>
                  )}

                  {activeSubTab === 'dev' && (
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown>{aiPlan.whatToDevelop}</ReactMarkdown>
                    </div>
                  )}

                  {activeSubTab === 'finance' && (
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                      <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Runway Cross-Check: {profile?.cashBank ? `₹${(profile.cashBank).toLocaleString('en-IN')}` : '₹0'} cash left.
                      </div>
                      <ReactMarkdown>{aiPlan.financialImpact}</ReactMarkdown>
                    </div>
                  )}

                  {activeSubTab === 'steps' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Immediate Roadmap Actions</h4>
                      <div className="space-y-3">
                        {aiPlan.immediateSteps?.map((step: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50">
                            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
