'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateDMScript, generateDMCalendar, DMScriptOutput, DMCalendarOutput } from '@/ai/flows/digital-marketing-flow';
import ReactMarkdown from 'react-markdown';
import { 
  Megaphone, Sparkles, Loader2, 
  Instagram, Youtube, Linkedin, Copy, Check, Clock, 
  Zap, Calendar, CheckCircle2, Circle, ChevronDown, ChevronRight, Target, Award, Flame, Lightbulb, Sliders,
  ChevronUp, Video, ArrowUpRight, X
} from 'lucide-react';

interface DigitalMarketingHubProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
}

export function DigitalMarketingHub({ userId, companyProfileId, readOnly }: DigitalMarketingHubProps) {
  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  const [localActivePlan, setLocalActivePlan] = useState<any>(null);
  const [localPlanHistory, setLocalPlanHistory] = useState<any[]>([]);

  // Form states for product details (collected from profile, but overridable)
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  
  // Script config states
  const [brandTone, setBrandTone] = useState<'professional' | 'casual' | 'educational' | 'inspirational' | 'bold'>('casual');
  const [contentGoal, setContentGoal] = useState<'awareness' | 'leads' | 'sales' | 'community'>('awareness');
  const [customFocus, setCustomFocus] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<('instagram' | 'youtube' | 'linkedin')[]>(['instagram', 'linkedin']);

  // Loading and active tabs
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai-planner' | 'history'>('ai-planner');
  const [activeScriptTab, setActiveScriptTab] = useState<'instagram' | 'youtube' | 'linkedin'>('instagram');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [showParams, setShowParams] = useState(false);
  const [selectedScriptDayIdx, setSelectedScriptDayIdx] = useState<number>(0);

  // Set default values when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.prodName) setProductName(profile.prodName);
      if (profile.prodDesc) setProductDescription(profile.prodDesc);
      if (profile.prodTarget) setTargetAudience(profile.prodTarget);

      setLocalActivePlan(profile.dmActivePlan || null);
      setLocalPlanHistory(profile.dmPlanHistory || []);
    }
  }, [profile]);

  // Sync script subtab to first selected platform if active one is unselected
  useEffect(() => {
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(activeScriptTab)) {
      setActiveScriptTab(selectedPlatforms[0]);
    }
  }, [selectedPlatforms, activeScriptTab]);

  // Loading messages sequence
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const loadingMessages = [
    "Drafting attention-grabbing 3-second hooks...",
    "Injecting brand-aligned tones and copywriting templates...",
    "Formulating optimal posting schedules for Indian tech audiences...",
    "Structuring platform-native calls-to-action...",
    "Building a 7-day multi-channel digital distribution calendar...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIdx(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading, loadingMessages.length]);

  // Copy helper
  const handleCopy = (text: string, elementId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(elementId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateDayStatus = async (dayIndex: number, newStatus: string) => {
    if (!localActivePlan || !profileRef) return;

    const updatedWeeklyCalendar = [...(localActivePlan.calendar?.weeklyCalendar || [])];
    updatedWeeklyCalendar[dayIndex] = {
      ...updatedWeeklyCalendar[dayIndex],
      status: newStatus
    };

    const updatedActivePlan = {
      ...localActivePlan,
      calendar: {
        ...localActivePlan.calendar,
        weeklyCalendar: updatedWeeklyCalendar
      }
    };

    setLocalActivePlan(updatedActivePlan);

    const updatedHistory = localPlanHistory.map(plan => 
      plan.id === localActivePlan.id ? updatedActivePlan : plan
    );
    setLocalPlanHistory(updatedHistory);

    try {
      await setDocumentNonBlocking(profileRef, {
        dmActivePlan: updatedActivePlan,
        dmPlanHistory: updatedHistory
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore status write failed:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status || 'Not Started';
    switch (s) {
      case 'Draft':
        return <Badge variant="outline" className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 font-bold text-[10px] px-2 py-0.5 rounded-full">📝 Draft</Badge>;
      case 'Filming':
        return <Badge variant="outline" className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 font-bold text-[10px] px-2 py-0.5 rounded-full">🎥 Filming</Badge>;
      case 'Editing':
        return <Badge variant="outline" className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px] px-2 py-0.5 rounded-full">🎬 Editing</Badge>;
      case 'Scheduled':
        return <Badge variant="outline" className="bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 font-bold text-[10px] px-2 py-0.5 rounded-full">📅 Scheduled</Badge>;
      case 'Published':
        return <Badge variant="outline" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-250 font-bold text-[10px] px-2 py-0.5 rounded-full">✅ Published</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-100/60 hover:bg-slate-200/50 text-slate-500 border-slate-200 font-bold text-[10px] px-2 py-0.5 rounded-full">Not Started</Badge>;
    }
  };

  // Generate marketing campaign
  const handleGenerateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !productName || !productDescription || loading || selectedPlatforms.length === 0) return;

    setLoading(true);
    try {
      // 1. Generate calendar
      const calendarInput = {
        productName,
        companyName: profile?.companyName || 'Our Startup',
        targetAudience,
        contentGoal,
        platforms: selectedPlatforms,
      };
      
      const calendarRes = await generateDMCalendar(calendarInput);

      // 2. Generate scripts for selected platforms in parallel
      const scriptsRes: Record<string, DMScriptOutput> = {};
      await Promise.all(
        selectedPlatforms.map(async (platform) => {
          const scriptInput = {
            productName,
            productDescription,
            targetAudience,
            companyName: profile?.companyName || 'Our Startup',
            platform,
            contentGoal,
            brandTone,
            customFocus: customFocus || undefined,
          };
          const script = await generateDMScript(scriptInput);
          scriptsRes[platform] = script;
        })
      );

      // Assemble full plan
      const newPlan = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        productName,
        productDescription,
        targetAudience,
        brandTone,
        contentGoal,
        customFocus,
        platforms: selectedPlatforms,
        calendar: calendarRes,
        scripts: scriptsRes,
      };

      setLocalActivePlan(newPlan);
      setLocalPlanHistory(prev => [newPlan, ...prev]);

      // Save to Firebase
      try {
        const updateData: any = {
          dmActivePlan: newPlan
        };
        updateData.dmPlanHistory = [newPlan, ...localPlanHistory];
        await setDocumentNonBlocking(profileRef, updateData, { merge: true });
      } catch (err) {
        console.warn("Firestore write rate-limited/failed:", err);
      }
    } catch (err) {
      console.error("Error generating DM Plan:", err);
    } finally {
      setLoading(false);
    }
  };

  // Platform icon helper
  const renderPlatformIcon = (platform: string, sizeClass = "w-4 h-4") => {
    switch (platform) {
      case 'instagram': return <Instagram className={`${sizeClass} text-pink-600`} />;
      case 'youtube': return <Youtube className={`${sizeClass} text-rose-600`} />;
      case 'linkedin': return <Linkedin className={`${sizeClass} text-sky-700`} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* Top Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2 mt-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2 flex items-center gap-2 sm:gap-3">
            <Megaphone className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 shrink-0" />
            Digital Marketing Hub
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base md:text-lg">
            Track organic platform reach, schedule content, and launch platform-native AI script assets.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Toggle Parameters Button in Header */}
          {activeTab === 'ai-planner' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowParams(!showParams)}
              className={`font-bold text-xs h-9 px-4 rounded-xl transition-all shadow-2xs ${
                showParams 
                  ? 'bg-indigo-55 border-indigo-250 text-indigo-755 hover:bg-indigo-100/70' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span>Parameters</span>
            </Button>
          )}

          {/* Tab switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border overflow-x-auto whitespace-nowrap scrollbar-none">
            <Button
              variant={activeTab === 'ai-planner' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('ai-planner')}
              className={`font-bold text-xs h-9 px-4 rounded-lg ${activeTab === 'ai-planner' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-650'}`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Script Planner
            </Button>
            {localPlanHistory.length > 0 && (
              <Button
                variant={activeTab === 'history' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('history')}
                className={`font-bold text-xs h-9 px-4 rounded-lg ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-650'}`}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                History
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* AI Processing Screen */}
      {loading && (
        <Card className="border-2 border-indigo-100 bg-indigo-50/5 shadow-md py-16 text-center animate-pulse">
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">Generating Platform Scripts & Campaign Strategy</h3>
              <p className="text-sm text-indigo-700 font-semibold max-w-md transition-all duration-300">
                {loadingMessages[loadingMessageIdx]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && activeTab === 'ai-planner' && !localActivePlan && (
        <div className="text-center py-24 bg-gradient-to-br from-indigo-50/20 via-purple-50/10 to-white rounded-3xl border border-dashed border-indigo-100 max-w-2xl mx-auto shadow-3xs p-8 mt-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-650 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 mx-auto mb-6">
            <Megaphone className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            Launch Your AI Campaign
          </h2>
          <p className="text-slate-500 font-semibold text-sm max-w-md mx-auto mb-8 leading-relaxed">
            Generate platform-native short-form video hooks, scripts, CTAs, and a structured 7-day posting calendar tailored specifically to your target ICP.
          </p>
          <Button
            onClick={() => setShowParams(true)}
            className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2.5 mx-auto transition-all transform hover:scale-[1.02]"
          >
            <Sparkles className="w-4.5 h-4.5" />
            Configure Campaign Parameters
          </Button>
        </div>
      )}

      {!loading && activeTab === 'ai-planner' && localActivePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Campaign details column */}
          {localActivePlan && (
            <div className="space-y-6 lg:col-span-12">
                {/* 90-Day Channel Targets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {localActivePlan.platforms.map((plat: string) => {
                  let metricName = "Estimated Reach";
                  let targetVal = "25.5K";
                  let gradient = "from-rose-500/10 via-pink-500/5 to-transparent border-rose-100 text-rose-700";
                  if (plat === 'youtube') {
                    metricName = "Target Views";
                    targetVal = "15K";
                    gradient = "from-red-500/10 via-amber-500/5 to-transparent border-red-100 text-red-700";
                  } else if (plat === 'linkedin') {
                    metricName = "Impressions Target";
                    targetVal = "50K";
                    gradient = "from-blue-500/10 via-indigo-500/5 to-transparent border-blue-100 text-blue-700";
                  }
                  return (
                    <div key={plat} className={`p-4 rounded-2xl border bg-gradient-to-br ${gradient} flex items-center justify-between shadow-2xs`}>
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{plat} Target</span>
                        <span className="text-xl font-black text-slate-800 tracking-tight mt-1 block">{targetVal}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{metricName}</span>
                      </div>
                      <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-2xs">
                        {renderPlatformIcon(plat, "w-6 h-6")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Campaign Plan Calendar & Info */}
              <Card className="border border-indigo-100 shadow-lg shadow-indigo-100/5 rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-indigo-50/70 to-purple-50/50 border-b py-5 px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/25 shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-black text-slate-900 tracking-tight">
                          7-Day Campaign Calendar
                        </CardTitle>
                        <CardDescription className="text-xs text-indigo-700/80 font-semibold mt-0.5">
                          Strategy Calendar for: <span className="font-extrabold text-indigo-900">{localActivePlan.productName}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="font-black uppercase tracking-wider text-[10px] px-3 py-1 bg-indigo-100 text-indigo-755 border border-indigo-200 shadow-2xs">
                      Goal: {localActivePlan.contentGoal}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  
                  {/* Pillars */}
                  <div className="p-5 border-b bg-slate-50/30">
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-black mb-3">Organic Content Pillars</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {localActivePlan.calendar?.contentPillars?.map((pillar: string, idx: number) => (
                        <div key={idx} className="p-2.5 border border-slate-100 rounded-xl bg-white shadow-3xs text-center flex items-center justify-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="text-xs font-extrabold text-slate-700">{pillar}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calendar Accordion List */}
                  <div className="divide-y border-b">
                    {localActivePlan.calendar?.weeklyCalendar?.map((dayPlan: any, idx: number) => {
                      const isExpanded = expandedDay === idx;
                      const status = dayPlan.status || 'Not Started';
                      
                      return (
                        <div key={idx} className={`transition-all ${isExpanded ? 'bg-indigo-50/15' : 'hover:bg-slate-50/30'}`}>
                          {/* Accordion Header */}
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => {
                            setExpandedDay(isExpanded ? null : idx);
                            if (!isExpanded) {
                              setSelectedScriptDayIdx(idx);
                            }
                          }}>
                            <div className="flex items-center gap-3.5">
                              <div className="w-14 text-center text-[11px] font-black uppercase text-indigo-700 bg-indigo-50 py-1.5 px-2.5 rounded-xl border border-indigo-100 shrink-0">
                                {dayPlan.day.slice(0, 3)}
                              </div>
                              <div>
                                <span className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                                  {dayPlan.topic}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 capitalize flex items-center gap-1.5 mt-1">
                                  {renderPlatformIcon(dayPlan.platform, "w-3.5 h-3.5")}
                                  {dayPlan.platform} • {dayPlan.contentType}
                                </span>
                              </div>
                            </div>

                            {/* Dropdown status & chevron */}
                            <div className="flex items-center gap-3 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
                              <div className="relative">
                                <select 
                                  value={status}
                                  onChange={(e) => handleUpdateDayStatus(idx, e.target.value)}
                                  className={`appearance-none font-bold text-[10px] px-3.5 py-1.5 pr-8 border rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer shadow-3xs ${
                                    status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    status === 'Scheduled' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    status === 'Editing' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    status === 'Filming' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  <option value="Not Started">⚪ Not Started</option>
                                  <option value="Draft">📝 Draft Plan</option>
                                  <option value="Filming">🎥 In Filming</option>
                                  <option value="Editing">🎬 Editing Cut</option>
                                  <option value="Scheduled">📅 Scheduled</option>
                                  <option value="Published">✅ Published</option>
                                </select>
                                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>

                              <button 
                                onClick={() => {
                                  setExpandedDay(isExpanded ? null : idx);
                                  if (!isExpanded) {
                                    setSelectedScriptDayIdx(idx);
                                  }
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Accordion Body */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-1.5 border-t border-indigo-50/50 bg-indigo-50/5 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
                              <div className="space-y-3">
                                <div>
                                  <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1">Detailed Hook Angle</span>
                                  <p className="text-xs font-semibold text-indigo-755 bg-indigo-50/25 p-3 border border-indigo-100/50 rounded-xl leading-relaxed italic">
                                    "{dayPlan.hook || dayPlan.topicFocus || "Configure a high-impact opening that addresses direct visitor pain points or answers key ICP concerns immediately."}"
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-black">Content Creation Checklist</span>
                                  <div className="space-y-1.5">
                                    {[
                                      "Draft/Refine final copywriting hook",
                                      "Record visual overlay or talk-head footage",
                                      "Verify platform aspect ratios (9:16 / 1:1)",
                                      "Insert relevant custom hashtags & CTAs"
                                    ].map((checkItem, checkIdx) => (
                                      <div key={checkIdx} className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white/50 px-2.5 py-1.5 border border-slate-100/50 rounded-lg">
                                        <input type="checkbox" id={`chk-${idx}-${checkIdx}`} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer" />
                                        <label htmlFor={`chk-${idx}-${checkIdx}`} className="cursor-pointer select-none">{checkItem}</label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col justify-between space-y-4">
                                <div className="space-y-2.5">
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-black">Platform Target Format</span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-755 mt-1">
                                      <Video className="w-4 h-4 text-indigo-550" />
                                      {dayPlan.platform === 'youtube' ? 'YouTube Shorts (Vertical Video)' :
                                       dayPlan.platform === 'instagram' ? 'Instagram Reel / Story' :
                                       'LinkedIn Carousel & Narrative'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-black">Call to Action Objective</span>
                                    <span className="text-xs font-bold text-slate-600 mt-1 block">
                                      Redirect users to your CRM lead captures or FoundersOS profile links.
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedScriptDayIdx(idx);
                                    const element = document.getElementById("marketing-scripts-card");
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="w-full h-10 border-indigo-100 hover:border-indigo-300 text-indigo-650 hover:text-indigo-700 bg-white shadow-3xs rounded-xl flex items-center justify-center gap-2 mt-2 font-bold text-xs"
                                >
                                  View Script Assets
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Organic reach tips */}
                  {localActivePlan.calendar?.reachTips && (
                    <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/10 border-t space-y-3">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-black flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                        AI DM Distribution Playbook
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {localActivePlan.calendar.reachTips.map((tip: string, idx: number) => (
                          <div key={idx} className="p-3 border border-slate-100 bg-white rounded-xl shadow-3xs flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span className="text-xs font-semibold text-slate-650 leading-relaxed">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Script assets tabs card */}
              <Card id="marketing-scripts-card" className="border border-indigo-100 shadow-lg shadow-indigo-100/5 rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-indigo-50/70 to-purple-50/50 border-b py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/25 shrink-0">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">Generated AI Marketing Scripts</span>
                  </div>
                  
                  {/* Internal tabs select - Days of the Week */}
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white p-1 gap-1 shadow-3xs overflow-x-auto whitespace-nowrap scrollbar-none max-w-full">
                    {localActivePlan.calendar?.weeklyCalendar?.map((dayPlan: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedScriptDayIdx(idx)}
                        className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                          selectedScriptDayIdx === idx 
                            ? 'bg-indigo-600 text-white shadow-sm font-black' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="uppercase">{dayPlan.day.slice(0, 3)}</span>
                        {renderPlatformIcon(dayPlan.platform, "w-3 h-3")}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {(() => {
                    const dayPlan = localActivePlan.calendar?.weeklyCalendar?.[selectedScriptDayIdx];
                    if (!dayPlan) {
                      return (
                        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <Sliders className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                          <div className="text-slate-450 font-bold text-sm">
                            No content strategy active for this day.
                          </div>
                        </div>
                      );
                    }

                    // Fallback to platform-wide script if day-specific script does not exist (for backwards compatibility)
                    const fallbackObj = localActivePlan.scripts?.[dayPlan.platform] || {};
                    const hook = dayPlan.hook || fallbackObj.hook || "";
                    const script = dayPlan.script || fallbackObj.script || "";
                    const callToAction = dayPlan.callToAction || fallbackObj.callToAction || "";
                    const hashtags = dayPlan.hashtags || fallbackObj.hashtags || [];
                    const postingSchedule = fallbackObj.postingSchedule || "Daily";
                    const contentIdeas = fallbackObj.contentIdeas || [];

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* High Fidelity Mockup/Viewer Frame (Left Side) */}
                        <div className="lg:col-span-6 space-y-4">
                          <div className="bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
                            {/* Camera notch mockup */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-black rounded-full z-10 opacity-70" />
                            
                            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 mt-2">
                              <div>
                                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                  {renderPlatformIcon(dayPlan.platform, "w-3.5 h-3.5 text-white")}
                                  {dayPlan.day} • {dayPlan.platform}
                                </span>
                                <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                                  Topic: {dayPlan.topic} | Format: {dayPlan.contentType}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-slate-800 bg-slate-800 hover:bg-slate-700 text-white hover:text-white rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all"
                                onClick={() => handleCopy(`${hook}\n\n${script}\n\n#${hashtags.join(' #')}`, `script-day-${selectedScriptDayIdx}`)}
                              >
                                {copiedId === `script-day-${selectedScriptDayIdx}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Text
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="space-y-4 font-semibold text-xs leading-relaxed text-slate-300">
                              <div>
                                <span className="block font-black text-[9px] uppercase text-indigo-400 tracking-wider mb-1">Hook Opening (First 3s)</span>
                                <p className="bg-indigo-950/80 p-3.5 border border-indigo-800/60 rounded-xl text-indigo-200 font-black italic shadow-inner">
                                  "{hook}"
                                </p>
                              </div>
                              
                              <div>
                                <span className="block font-black text-[9px] uppercase text-slate-550 tracking-wider mb-1">Body Strategy Copy</span>
                                <p className="bg-slate-950/80 p-4 border border-slate-850 rounded-xl whitespace-pre-wrap font-mono text-slate-200 shadow-inner max-h-[200px] overflow-y-auto leading-relaxed">
                                  {script}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <span className="block font-black text-[9px] uppercase text-slate-550 tracking-wider mb-1">Call to Action</span>
                                  <p className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-lg text-[11px] font-bold text-slate-350">
                                    {callToAction}
                                  </p>
                                </div>
                                <div>
                                  <span className="block font-black text-[9px] uppercase text-slate-550 tracking-wider mb-1">Optimal Hashtags</span>
                                  <p className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-lg text-indigo-400 font-mono text-[10px] truncate">
                                    #{hashtags?.join(' #')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Alternative Content ideas & Angles (Right Side) */}
                        <div className="lg:col-span-6 space-y-4">
                          <span className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-indigo-500" />
                            Alternative {dayPlan.platform} Ideas
                          </span>
                          <div className="grid grid-cols-1 gap-2.5">
                            {contentIdeas?.map((idea: string, i: number) => (
                              <div key={i} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/20 hover:bg-slate-50/50 transition-colors flex gap-3 items-start shadow-3xs">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs text-indigo-650 font-bold shrink-0 mt-0.5">
                                  {i + 1}
                                </div>
                                <span className="text-xs font-semibold text-slate-650 leading-relaxed">{idea}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* PLAN HISTORY PANEL */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card className="border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800">
                Archived AI Campaign Strategies
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {localPlanHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                  No archived campaign strategies yet. Generate your first AI plan above!
                </div>
              ) : (
                localPlanHistory.map((item: any, idx: number) => {
                  const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  });
                  return (
                    <div key={item.id || idx} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-650">{formattedDate}</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {item.productName || 'Unnamed Product Campaign'}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          Goal: {item.contentGoal} • Tone: {item.brandTone} • Channels: {item.platforms?.join(', ')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (profileRef) {
                            const updatedHistory = localPlanHistory.filter((_: any, i: number) => i !== idx);
                            const currentActive = localActivePlan;
                            const newHistory = currentActive ? [currentActive, ...updatedHistory] : updatedHistory;
                            setLocalActivePlan(item);
                            setLocalPlanHistory(newHistory);
                            setActiveTab('ai-planner');
                            try {
                              setDocumentNonBlocking(profileRef, {
                                dmActivePlan: item,
                                dmPlanHistory: newHistory
                              }, { merge: true });
                            } catch (err) {
                              console.warn("Restore plan failed:", err);
                            }
                          }
                        }}
                        className="font-bold text-xs border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Restore &amp; View
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {/* AI Campaign Parameters Modal Popup */}
      {showParams && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowParams(false)} 
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-indigo-100 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowParams(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-450 hover:text-slate-600 transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 px-4 sm:px-6 py-5 sm:py-6 text-white border-b border-indigo-900/40 relative">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white shadow-lg shadow-indigo-500/35 shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    AI Campaign Parameters
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-indigo-200/80 font-semibold mt-1">
                    Configure details to build video hooks, scripts, and posting calendars.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Form Content */}
            <div className="p-4 sm:p-6">
              <form 
                onSubmit={async (e) => {
                  await handleGenerateCampaign(e);
                  setShowParams(false);
                }} 
                className="space-y-5"
              >
                
                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="font-black text-xs uppercase text-slate-500 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-500" />
                    Product Title
                  </Label>
                  <Input
                    placeholder="e.g. EZCirkit STEM Kit"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    required
                    className="font-semibold h-11 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="font-black text-xs uppercase text-slate-500 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                    Product Description &amp; Specs
                  </Label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Solderless circuit board kit for students, interactive coding guide, drag-and-drop IDE interface..."
                    value={productDescription}
                    onChange={e => setProductDescription(e.target.value)}
                    required
                    className="w-full text-sm font-semibold p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all resize-none shadow-2xs"
                  />
                </div>

                {/* Audience */}
                <div className="space-y-1.5">
                  <Label className="font-black text-xs uppercase text-slate-500 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    Target ICP / User Persona
                  </Label>
                  <Input
                    placeholder="e.g. High school tech mentors, teachers, makers"
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    required
                    className="font-semibold h-11 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl transition-all"
                  />
                </div>

                {/* Config Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase text-slate-500">Brand Voice/Tone</Label>
                    <Select value={brandTone} onValueChange={(val: any) => setBrandTone(val)}>
                      <SelectTrigger className="font-semibold h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 rounded-xl transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional / Tech</SelectItem>
                        <SelectItem value="casual">Casual / Conversational</SelectItem>
                        <SelectItem value="educational">Informative / Academic</SelectItem>
                        <SelectItem value="inspirational">Motivational / Growth</SelectItem>
                        <SelectItem value="bold">Punchy / Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase text-slate-550">Campaign Goal</Label>
                    <Select value={contentGoal} onValueChange={(val: any) => setContentGoal(val)}>
                      <SelectTrigger className="font-semibold h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 rounded-xl transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">Brand Reach / Awareness</SelectItem>
                        <SelectItem value="leads">Lead Gen (Book Demos)</SelectItem>
                        <SelectItem value="sales">Product Conversions</SelectItem>
                        <SelectItem value="community">Foster STEM Community</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Channels selection checkboxes */}
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase text-slate-500">Select Channels</Label>
                  <div className="flex flex-wrap gap-2.5">
                    {['instagram', 'youtube', 'linkedin'].map((plat: any) => {
                      const isChecked = selectedPlatforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== plat));
                            } else {
                              setSelectedPlatforms([...selectedPlatforms, plat]);
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-extrabold text-xs capitalize transition-all ${
                            isChecked 
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-755 shadow-sm' 
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {renderPlatformIcon(plat, "w-4 h-4")}
                          {plat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Angle Focus */}
                <div className="space-y-1.5">
                  <Label className="font-black text-xs uppercase text-slate-500 flex items-center gap-1">
                    Custom Script Theme Focus
                    <span className="text-[10px] text-slate-400 lowercase font-normal">(optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. Focus on low cost, or showcase the drag-and-drop IDE ease"
                    value={customFocus}
                    onChange={e => setCustomFocus(e.target.value)}
                    className="font-semibold h-11 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowParams(false)}
                    className="flex-1 font-bold h-12 rounded-xl border-slate-200 text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={selectedPlatforms.length === 0 || !productName || !productDescription || loading}
                    className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold h-12 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Flame className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
                    Generate Campaign Strategy
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
