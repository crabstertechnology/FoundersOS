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
  HelpCircle, ChevronRight, FileText, CheckCircle2, Mic, Presentation,
  History, Clock, Trash2, RotateCcw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  const [activeSubTab, setActiveSubTab] = useState<'review' | 'gtm' | 'dev' | 'finance' | 'steps' | 'pitch'>('review');
  const [activePitchType, setActivePitchType] = useState<'elevator' | 'normal' | 'layperson' | 'deck' | 'objections'>('elevator');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [historyActiveTab, setHistoryActiveTab] = useState<'review' | 'gtm' | 'dev' | 'finance' | 'steps' | 'pitch'>('review');
  const [historyActivePitchType, setHistoryActivePitchType] = useState<'elevator' | 'normal' | 'layperson' | 'deck' | 'objections'>('elevator');

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

      // Save fields and AI output in companyProfile, saving previous version to history if it exists
      const updateData: any = {
        prodName: productName,
        prodDesc: productDescription,
        prodTarget: targetAudience,
        prodPricing: pricingModel,
        prodQuestion: customQuestion,
        prodAIPlan: result
      };

      if (profile?.prodAIPlan) {
        const historyEntry = {
          timestamp: new Date().toISOString(),
          prodName: profile?.prodName || productName,
          prodDesc: profile?.prodDesc || productDescription,
          prodTarget: profile?.prodTarget || targetAudience,
          prodPricing: profile?.prodPricing || pricingModel,
          prodQuestion: profile?.prodQuestion || '',
          prodAIPlan: profile.prodAIPlan
        };
        const currentHistory = profile?.prodAIPlanHistory || [];
        updateData.prodAIPlanHistory = [historyEntry, ...currentHistory];
      }

      await setDocumentNonBlocking(profileRef, updateData, { merge: true });

    } catch (err) {
      console.error('Error generating product plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (indexToDelete: number) => {
    if (!profileRef) return;
    
    const currentHistory = profile?.prodAIPlanHistory || [];
    const updatedHistory = currentHistory.filter((_: any, idx: number) => idx !== indexToDelete);
    
    await setDocumentNonBlocking(profileRef, {
      prodAIPlanHistory: updatedHistory
    }, { merge: true });
  };

  const handleRestoreHistoryItem = async (item: any) => {
    if (!profileRef) return;
    
    const currentPlan = profile?.prodAIPlan;
    let updatedHistory = [...(profile?.prodAIPlanHistory || [])];
    
    const restoredIndex = updatedHistory.findIndex((h: any) => h.timestamp === item.timestamp);
    if (restoredIndex > -1) {
      updatedHistory.splice(restoredIndex, 1);
    }
    
    if (currentPlan) {
      updatedHistory = [{
        timestamp: new Date().toISOString(),
        prodName: profile?.prodName || productName,
        prodDesc: profile?.prodDesc || productDescription,
        prodTarget: profile?.prodTarget || targetAudience,
        prodPricing: profile?.prodPricing || pricingModel,
        prodQuestion: profile?.prodQuestion || '',
        prodAIPlan: currentPlan
      }, ...updatedHistory];
    }
    
    await setDocumentNonBlocking(profileRef, {
      prodName: item.prodName || '',
      prodDesc: item.prodDesc || '',
      prodTarget: item.prodTarget || '',
      prodPricing: item.prodPricing || '',
      prodQuestion: item.prodQuestion || '',
      prodAIPlan: item.prodAIPlan,
      prodAIPlanHistory: updatedHistory
    }, { merge: true });
    
    setProductName(item.prodName || '');
    setProductDescription(item.prodDesc || '');
    setTargetAudience(item.prodTarget || '');
    setPricingModel(item.prodPricing || '');
    setCustomQuestion(item.prodQuestion || '');
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

            {/* Saved Strategy Versions */}
            {profile?.prodAIPlanHistory && profile.prodAIPlanHistory.length > 0 && (
              <Card className="border-2 border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                  <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Saved Strategy Versions ({profile.prodAIPlanHistory.length})
                  </CardTitle>
                  <CardDescription>
                    Access your previously generated AI strategies and product specifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                  {profile.prodAIPlanHistory.map((item: any, idx: number) => {
                    const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    });
                    return (
                      <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{formattedDate}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {item.prodName || 'Unnamed Product'}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {item.prodPricing ? `Pricing: ${item.prodPricing}` : ''}
                            {item.prodTarget ? ` • Audience: ${item.prodTarget}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHistoryItem(item);
                              setHistoryActiveTab('review');
                              setHistoryActivePitchType('elevator');
                            }}
                            className="h-8 font-semibold text-xs border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                          >
                            View
                          </Button>
                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteHistoryItem(idx)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
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
                  <button
                    onClick={() => setActiveSubTab('pitch')}
                    className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      activeSubTab === 'pitch' 
                        ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    Pitching Scripts
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

                  {activeSubTab === 'pitch' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {aiPlan?.pitchGuidance ? (
                        <>
                          {/* Sub-tabs for pitch types */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b pb-4">
                            {[
                              { id: 'elevator', label: 'Elevator (30s)', icon: Mic },
                              { id: 'normal', label: 'Standard (2m)', icon: FileText },
                              { id: 'layperson', label: 'Layperson (ELI5)', icon: HelpCircle },
                              { id: 'deck', label: 'Pitch Deck', icon: Presentation },
                              { id: 'objections', label: 'Objections', icon: AlertTriangle }
                            ].map((t) => {
                              const Icon = t.icon;
                              const active = activePitchType === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setActivePitchType(t.id as any)}
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                    active
                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                      : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  <Icon className="w-5 h-5 mb-1.5 text-indigo-500" />
                                  <span className="text-[11px] font-bold">{t.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Display Selected Pitch script */}
                          <Card className="border border-slate-200 bg-slate-50/30">
                            <CardContent className="pt-6">
                              {activePitchType === 'elevator' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b pb-3 mb-2">
                                    <h4 className="text-sm font-black text-slate-800">30-Second Elevator Pitch Script</h4>
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">For Quick Intro</span>
                                  </div>
                                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <ReactMarkdown>{aiPlan.pitchGuidance.elevatorPitch || 'No elevator pitch generated yet.'}</ReactMarkdown>
                                  </div>
                                </div>
                              )}

                              {activePitchType === 'normal' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b pb-3 mb-2">
                                    <h4 className="text-sm font-black text-slate-800">Standard 2-Minute Pitch Script</h4>
                                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">For Meetings/Demo Days</span>
                                  </div>
                                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <ReactMarkdown>{aiPlan.pitchGuidance.normalPitch || 'No standard pitch generated yet.'}</ReactMarkdown>
                                  </div>
                                </div>
                              )}

                              {activePitchType === 'layperson' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b pb-3 mb-2">
                                    <h4 className="text-sm font-black text-slate-800">Layperson / ELI5 (Explain Like I'm 5) Script</h4>
                                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase">For Non-Domain Audience</span>
                                  </div>
                                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <ReactMarkdown>{aiPlan.pitchGuidance.laypersonPitch || 'No layperson pitch generated yet.'}</ReactMarkdown>
                                  </div>
                                </div>
                              )}

                              {activePitchType === 'deck' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b pb-3 mb-2">
                                    <h4 className="text-sm font-black text-slate-800">Recommended 10-Slide Pitch Deck Structure</h4>
                                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full uppercase">Investor Outline</span>
                                  </div>
                                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <ReactMarkdown>{aiPlan.pitchGuidance.pitchDeckStructure || 'No deck structure generated yet.'}</ReactMarkdown>
                                  </div>
                                </div>
                              )}

                              {activePitchType === 'objections' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b pb-3 mb-2">
                                    <h4 className="text-sm font-black text-slate-800">Investor & Customer Objection Handling</h4>
                                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">Q&A Preparation</span>
                                  </div>
                                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <ReactMarkdown>{aiPlan.pitchGuidance.objectionHandling || 'No objection handling generated yet.'}</ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                          <h4 className="text-sm font-black text-slate-800 mb-1">Pitch Scripts Not Available</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Your current strategic blueprint was generated using an older version without pitching guidance. Please click the <strong>Analyze Specs & Generate Strategy</strong> button again to generate a new blueprint with pitching scripts.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* History Details Dialog */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => { if (!open) setSelectedHistoryItem(null); }}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 border border-slate-200 shadow-2xl rounded-xl">
          <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50 flex flex-row items-center justify-between pr-12">
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Archived Strategy Blueprint
              </DialogTitle>
              <DialogDescription className="text-xs mt-1 font-semibold text-slate-500">
                Generated for <span className="text-indigo-700 font-bold">{selectedHistoryItem?.prodName}</span> on {selectedHistoryItem && new Date(selectedHistoryItem.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Dialog Body - scrollable with sub tabs */}
          {selectedHistoryItem && (
            <>
              {/* Mini spec review section */}
              <div className="bg-slate-50/50 p-4 border-b grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-black">Audience</span>
                  <span className="text-slate-800 line-clamp-1">{selectedHistoryItem.prodTarget || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-black">Pricing Model</span>
                  <span className="text-slate-800 capitalize">{selectedHistoryItem.prodPricing || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] uppercase text-slate-400 font-black">Description</span>
                  <span className="text-slate-800 line-clamp-1">{selectedHistoryItem.prodDesc || 'N/A'}</span>
                </div>
              </div>

              {/* Sub Tabs */}
              <div className="flex border-b divide-x overflow-x-auto bg-slate-50/30">
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('review')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'review' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  Evaluation
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('gtm')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'gtm' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  How to Sell
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('dev')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'dev' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  What to Develop
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('finance')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'finance' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Runway Impact
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('steps')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'steps' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  Action Items
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('pitch')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'pitch' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Pitching
                </button>
              </div>

              {/* Tab Content Area */}
              <div className="p-6 flex-1 overflow-y-auto max-h-[50vh]">
                {historyActiveTab === 'review' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.review}</ReactMarkdown>
                  </div>
                )}

                {historyActiveTab === 'gtm' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.howToSell}</ReactMarkdown>
                  </div>
                )}

                {historyActiveTab === 'dev' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.whatToDevelop}</ReactMarkdown>
                  </div>
                )}

                {historyActiveTab === 'finance' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.financialImpact}</ReactMarkdown>
                  </div>
                )}

                {historyActiveTab === 'steps' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Archived Roadmap Actions</h4>
                    <div className="space-y-3">
                      {selectedHistoryItem.prodAIPlan.immediateSteps?.map((step: string, idx: number) => (
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

                {historyActiveTab === 'pitch' && (
                  <div className="space-y-6">
                    {selectedHistoryItem.prodAIPlan?.pitchGuidance ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b pb-4">
                          {[
                            { id: 'elevator', label: 'Elevator', icon: Mic },
                            { id: 'normal', label: 'Standard', icon: FileText },
                            { id: 'layperson', label: 'Layperson', icon: HelpCircle },
                            { id: 'deck', label: 'Deck Structure', icon: Presentation },
                            { id: 'objections', label: 'Objections', icon: AlertTriangle }
                          ].map((t) => {
                            const Icon = t.icon;
                            const active = historyActivePitchType === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setHistoryActivePitchType(t.id as any)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                                  active
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <Icon className="w-4 h-4 mb-1 text-indigo-500" />
                                <span className="text-[10px] font-bold">{t.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <Card className="border border-slate-200 bg-slate-50/30">
                          <CardContent className="pt-6">
                            {historyActivePitchType === 'elevator' && (
                              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <ReactMarkdown>{selectedHistoryItem.prodAIPlan.pitchGuidance.elevatorPitch || 'No elevator pitch.'}</ReactMarkdown>
                              </div>
                            )}
                            {historyActivePitchType === 'normal' && (
                              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <ReactMarkdown>{selectedHistoryItem.prodAIPlan.pitchGuidance.normalPitch || 'No standard pitch.'}</ReactMarkdown>
                              </div>
                            )}
                            {historyActivePitchType === 'layperson' && (
                              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <ReactMarkdown>{selectedHistoryItem.prodAIPlan.pitchGuidance.laypersonPitch || 'No layperson pitch.'}</ReactMarkdown>
                              </div>
                            )}
                            {historyActivePitchType === 'deck' && (
                              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <ReactMarkdown>{selectedHistoryItem.prodAIPlan.pitchGuidance.pitchDeckStructure || 'No deck structure.'}</ReactMarkdown>
                              </div>
                            )}
                            {historyActivePitchType === 'objections' && (
                              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <ReactMarkdown>{selectedHistoryItem.prodAIPlan.pitchGuidance.objectionHandling || 'No objection handling.'}</ReactMarkdown>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                        <h4 className="text-xs font-black text-slate-800 mb-1">Pitch Scripts Not Available</h4>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          This version was generated without pitch scripts.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dialog Footer with Action Buttons */}
              <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedHistoryItem(null)}
                  className="font-bold text-xs"
                >
                  Close
                </Button>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        handleRestoreHistoryItem(selectedHistoryItem);
                        setSelectedHistoryItem(null);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore This Version
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
