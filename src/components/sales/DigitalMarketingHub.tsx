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
  Zap
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
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] mb-2 flex items-center gap-3">
            <Megaphone className="w-10 h-10 text-indigo-600" />
            Digital Marketing Hub
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Track organic platform reach, schedule content, and launch platform-native AI script assets.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
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

      {!loading && activeTab === 'ai-planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form settings column */}
          <div className={`space-y-6 ${localActivePlan ? 'lg:col-span-5' : 'lg:col-span-8 lg:col-start-2'}`}>
            <Card className="border-2 border-slate-200">
              <CardHeader className="bg-slate-50/60 border-b">
                <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Campaign Parameters
                </CardTitle>
                <CardDescription>
                  Configure details to build platform-native short-form video hooks, scripts, and posting calendars.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleGenerateCampaign} className="space-y-5">
                  
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase text-slate-500">Product Title</Label>
                    <Input
                      placeholder="e.g. EZCirkit STEM Kit"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      required
                      className="font-semibold h-10 border-slate-200"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase text-slate-500">Product Description & Specs</Label>
                    <textarea
                      rows={4}
                      placeholder="e.g. Solderless circuit board kit for students, interactive coding guide, drag-and-drop IDE interface..."
                      value={productDescription}
                      onChange={e => setProductDescription(e.target.value)}
                      required
                      className="w-full text-sm font-medium p-3 rounded-lg border border-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Audience */}
                  <div className="space-y-1.5">
                    <Label className="font-black text-xs uppercase text-slate-500">Target ICP / User Persona</Label>
                    <Input
                      placeholder="e.g. High school tech mentors, teachers, makers"
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      required
                      className="font-semibold h-10 border-slate-200"
                    />
                  </div>

                  {/* Config Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-black text-xs uppercase text-slate-500">Brand Voice/Tone</Label>
                      <Select value={brandTone} onValueChange={(val: any) => setBrandTone(val)}>
                        <SelectTrigger className="font-semibold border-slate-200">
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
                      <Label className="font-black text-xs uppercase text-slate-500">Campaign Goal</Label>
                      <Select value={contentGoal} onValueChange={(val: any) => setContentGoal(val)}>
                        <SelectTrigger className="font-semibold border-slate-200">
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

                  {/* Platforms selection checkboxes */}
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase text-slate-500">Select Channels</Label>
                    <div className="flex flex-wrap gap-3">
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
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg font-bold text-xs capitalize transition-all ${
                              isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-extrabold shadow-sm' : 'bg-white hover:bg-slate-55 border-slate-200 text-slate-600'
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
                      className="font-semibold h-10 border-slate-200"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={selectedPlatforms.length === 0 || !productName || !productDescription}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Campaign Strategy & Scripts
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Campaign details column */}
          {localActivePlan && (
            <div className="lg:col-span-7 space-y-6">
              
              {/* Campaign Plan Calendar & Info */}
              <Card className="border-2 border-indigo-100 shadow-sm">
                <CardHeader className="bg-indigo-50/15 border-b py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-black text-slate-900">
                        7-Day Campaign Calendar
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Platform distribution for: <span className="font-bold text-indigo-700">{localActivePlan.productName}</span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-code font-bold uppercase tracking-wider text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50/50">
                      Goal: {localActivePlan.contentGoal}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  
                  {/* Pillars */}
                  <div className="p-4 border-b bg-slate-50/50">
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-black mb-2">Organic Content Pillars</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {localActivePlan.calendar?.contentPillars?.map((pillar: string, idx: number) => (
                        <div key={idx} className="p-2 border rounded-lg bg-white shadow-2xs text-center">
                           <span className="text-[11px] font-bold text-slate-700">{pillar}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calendar Row list */}
                  <div className="divide-y max-h-[300px] overflow-y-auto">
                    {localActivePlan.calendar?.weeklyCalendar?.map((dayPlan: any, idx: number) => (
                      <div key={idx} className="p-3.5 hover:bg-slate-50/40 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 text-center text-xs font-black uppercase text-indigo-600 bg-indigo-50 py-1 rounded">
                            {dayPlan.day.slice(0, 3)}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-800 line-clamp-1">{dayPlan.topic}</span>
                            <span className="text-[10px] font-semibold text-slate-500 capitalize flex items-center gap-1.5 mt-0.5">
                              {renderPlatformIcon(dayPlan.platform, "w-3 h-3")}
                              {dayPlan.platform} â€¢ {dayPlan.contentType}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Organic reach tips */}
                  {localActivePlan.calendar?.reachTips && (
                    <div className="p-4 bg-slate-50/40 border-t space-y-2">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-black">AI DM Distribution Playbook</span>
                      <ul className="space-y-1.5">
                        {localActivePlan.calendar.reachTips.map((tip: string, idx: number) => (
                          <li key={idx} className="text-xs font-semibold text-slate-650 flex items-start gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Script assets tabs card */}
              <Card className="border-2 border-indigo-100 shadow-sm">
                <CardHeader className="border-b py-3 flex flex-col sm:flex-row sm:items-center justify-between px-6 gap-3">
                  <span className="text-sm font-black text-slate-800">Generated AI Marketing Scripts</span>
                  
                  {/* Internal tabs select */}
                  <div className="flex border rounded-lg overflow-hidden bg-slate-50">
                    {localActivePlan.platforms.map((plat: string) => (
                      <button
                        key={plat}
                        onClick={() => setActiveScriptTab(plat as any)}
                        className={`px-3 py-1.5 text-xs font-bold capitalize flex items-center gap-1 ${
                          activeScriptTab === plat ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {(() => {
                    const scriptObj = localActivePlan.scripts?.[activeScriptTab];
                    if (!scriptObj) {
                      return (
                        <div className="text-center py-8 text-slate-400 font-semibold text-sm">
                          No script generated for {activeScriptTab}. Please select it in parameters and regenerate.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-6">
                        
                        {/* Script block details */}
                        <div className="bg-slate-100/70 p-4 border rounded-xl space-y-4">
                          
                          <div className="flex justify-between items-center border-b pb-2.5">
                            <div>
                              <span className="text-xs font-black text-slate-800">Organic Caption & Script Copy</span>
                              <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                                Optimal Posting frequency: {scriptObj.postingSchedule || 'Not specified'}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-slate-200 text-slate-650 hover:text-indigo-600 hover:bg-indigo-50"
                              onClick={() => handleCopy(`${scriptObj.hook}\n\n${scriptObj.script}\n\n#${scriptObj.hashtags.join(' #')}`, `script-${activeScriptTab}`)}
                            >
                              {copiedId === `script-${activeScriptTab}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 mr-1" />
                                  Copy Script
                                </>
                              )}
                            </Button>
                          </div>

                          <div className="space-y-3 font-semibold text-xs leading-relaxed text-slate-700">
                            <div>
                              <span className="block font-black text-[10px] uppercase text-indigo-700 tracking-wider mb-1">Hook Opening line</span>
                              <p className="bg-indigo-50/50 p-2 border border-indigo-100 rounded-lg text-indigo-950 font-black italic">
                                "{scriptObj.hook}"
                              </p>
                            </div>
                            
                            <div>
                              <span className="block font-black text-[10px] uppercase text-slate-400 tracking-wider mb-1">Script / Caption Body</span>
                              <p className="bg-white p-3 border rounded-lg whitespace-pre-wrap font-mono">
                                {scriptObj.script}
                              </p>
                            </div>

                            <div>
                              <span className="block font-black text-[10px] uppercase text-slate-400 tracking-wider mb-1">Suggested CTA</span>
                              <p className="bg-white p-2 border rounded-lg">
                                {scriptObj.callToAction}
                              </p>
                            </div>

                            <div>
                              <span className="block font-black text-[10px] uppercase text-slate-400 tracking-wider mb-1">Hashtags</span>
                              <p className="bg-white p-2 border rounded-lg text-indigo-600 font-mono text-[11px] leading-normal">
                                #{scriptObj.hashtags?.join(' #')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Secondary Content ideas */}
                        <div className="space-y-3">
                          <span className="block text-xs font-black text-slate-800 uppercase tracking-widest">
                            Alternative {activeScriptTab} Content Ideas
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {scriptObj.contentIdeas?.map((idea: string, i: number) => (
                              <div key={i} className="p-3 border rounded-lg bg-slate-50/30 flex gap-2 items-start">
                                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-650 font-bold shrink-0 mt-0.5">
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

    </div>
  );
}
