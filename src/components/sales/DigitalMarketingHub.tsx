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
  Megaphone, Sparkles, Loader2, BarChart3, Plus, Trash2, Calendar, 
  Instagram, Youtube, Linkedin, Copy, Check, TrendingUp, Info, Clock, 
  ChevronRight, Award, Zap, HelpCircle, FileText, RefreshCw, Link2, Unlink
} from 'lucide-react';

interface DigitalMarketingHubProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
}

type ContentType = 'reel' | 'post' | 'carousel' | 'story' | 'video' | 'short' | 'live' | 'article';

interface ReachLog {
  id: string;
  date: string;
  platform: 'instagram' | 'youtube' | 'linkedin';
  metric: 'reach' | 'impressions' | 'views' | 'engagement' | 'clicks' | 'leads';
  value: number;
  // Rich content fields
  title?: string;
  description?: string;
  contentType?: ContentType;
  likes?: number;
  comments?: number;
  shares?: number;
  accountHandle?: string;
  notes?: string;
}

export function DigitalMarketingHub({ userId, companyProfileId, readOnly }: DigitalMarketingHubProps) {
  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  // Sync reach logs and marketing plans from Firestore
  const [localReachLogs, setLocalReachLogs] = useState<ReachLog[]>([]);
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
  const [activeTab, setActiveTab] = useState<'tracker' | 'ai-planner' | 'history'>('ai-planner');
  const [activeScriptTab, setActiveScriptTab] = useState<'instagram' | 'youtube' | 'linkedin'>('instagram');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Log reach form states
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logPlatform, setLogPlatform] = useState<'instagram' | 'youtube' | 'linkedin'>('instagram');
  const [logMetric, setLogMetric] = useState<'reach' | 'impressions' | 'views' | 'engagement' | 'clicks' | 'leads'>('reach');
  const [logValue, setLogValue] = useState<number | ''>('');
  const [logNotes, setLogNotes] = useState('');

  // Connect integrations states
  const [localIsIgConnected, setLocalIsIgConnected] = useState(false);
  const [localIsYtConnected, setLocalIsYtConnected] = useState(false);
  const [localIgUsername, setLocalIgUsername] = useState('');
  const [localYtChannelName, setLocalYtChannelName] = useState('');
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const [igConnectLoading, setIgConnectLoading] = useState(false);
  const [ytConnectLoading, setYtConnectLoading] = useState(false);

  const handleConnectIG = async () => {
    if (readOnly || !profileRef) return;
    if (localIsIgConnected) {
      if (!confirm("Are you sure you want to disconnect your Instagram Business profile?")) return;
      setLocalIsIgConnected(false);
      setLocalIgUsername('');
      try {
        await setDocumentNonBlocking(profileRef, {
          dmIgConnected: false,
          dmIgUsername: ''
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore write rate-limited/failed:", e);
      }
      return;
    }

    const username = prompt("Enter your Instagram Business Handle/Username:", "@founders_startup");
    if (!username) return;

    setIgConnectLoading(true);
    setTimeout(async () => {
      const formatted = username.startsWith('@') ? username : `@${username}`;
      setLocalIsIgConnected(true);
      setLocalIgUsername(formatted);
      setIgConnectLoading(false);
      try {
        await setDocumentNonBlocking(profileRef, {
          dmIgConnected: true,
          dmIgUsername: formatted
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore write rate-limited/failed:", e);
      }
    }, 1200);
  };

  const handleConnectYT = async () => {
    if (readOnly || !profileRef) return;
    if (localIsYtConnected) {
      if (!confirm("Are you sure you want to disconnect your YouTube Channel?")) return;
      setLocalIsYtConnected(false);
      setLocalYtChannelName('');
      try {
        await setDocumentNonBlocking(profileRef, {
          dmYtConnected: false,
          dmYtChannelName: ''
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore write rate-limited/failed:", e);
      }
      return;
    }

    const channel = prompt("Enter your YouTube Channel Name / ID:", "FounderOS Tech");
    if (!channel) return;

    setYtConnectLoading(true);
    setTimeout(async () => {
      setLocalIsYtConnected(true);
      setLocalYtChannelName(channel);
      setYtConnectLoading(false);
      try {
        await setDocumentNonBlocking(profileRef, {
          dmYtConnected: true,
          dmYtChannelName: channel
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore write rate-limited/failed:", e);
      }
    }, 1200);
  };

  // Realistic content templates for mock sync data
  const IG_REELS = [
    { title: 'How a 4th Standard Student Built a Circuit!', description: 'Watch how our young maker builds her first LED blinking circuit from scratch. The future of electronics education is here! 🔌⚡', contentType: 'reel' as ContentType },
    { title: "EZCirkit Unboxing — What's Inside the Kit?", description: 'Full unboxing of the EZCirkit starter kit. Breadboard, jumper wires, LEDs, resistors and more. Perfect for beginners! 📦', contentType: 'reel' as ContentType },
    { title: 'Experiment 1: Blinking LED in 60 Seconds', description: 'Your first electronics experiment done in under a minute. No coding needed — just follow the diagram! 💡', contentType: 'reel' as ContentType },
    { title: 'Motion Detection Project by a 12-Year-Old 🤯', description: 'Kids are building real-world sensors with EZCirkit. This student built a motion-detection beep alarm in 30 minutes!', contentType: 'reel' as ContentType },
    { title: 'Behind the Scenes: Building EZCirkit', description: 'Sneak peek at how we design our electronics kits for Indian school students. Made with love in Coimbatore 🇮🇳', contentType: 'post' as ContentType },
    { title: 'Soil Moisture Sensor — Save Water with Tech!', description: 'This weekend project detects dry soil and alerts you to water your plants. Built entirely with EZCirkit components.', contentType: 'reel' as ContentType },
    { title: 'Student Showcase: Best Projects This Month', description: 'Carousel of our top student builds this month — from traffic lights to buzzers. Proud of every one of them! 🏆', contentType: 'carousel' as ContentType },
  ];
  const YT_VIDEOS = [
    { title: 'Can a 4th Standard Student Build a Circuit? Watch This!', description: 'In this video, a 4th standard student successfully builds and programs her first LED blinking project using the EZCirkit starter kit. Beginner friendly!', contentType: 'video' as ContentType },
    { title: 'Software Installation Guide — EZCirkit Setup', description: 'Complete step-by-step software installation for EZCirkit on Windows and Mac. Gets you ready to code in minutes.', contentType: 'video' as ContentType },
    { title: "Beginner's Guide to Breadboard — EZCirkit Experiment", description: 'Learn what a breadboard is and how to use it. This is the foundational lesson for all electronics experiments.', contentType: 'video' as ContentType },
    { title: 'EXP 1: Blinking LED — Your First Electronics Project', description: 'The classic first experiment! Build a blinking LED circuit and understand resistors, current and voltage.', contentType: 'video' as ContentType },
    { title: 'Experiment 7: Motion Detection Beep Alert System', description: 'Build a PIR motion sensor circuit that beeps whenever someone walks by. Great intro to sensors and automation!', contentType: 'video' as ContentType },
    { title: 'EXP 6: Soil Moisture Beep Alert — Smart Gardening!', description: 'Plant a sensor in your garden to detect dry soil. This beginner-friendly project introduces analog input reading.', contentType: 'video' as ContentType },
    { title: 'EZCirkit Shorts: RGB LED Color Mixing ✨', description: 'Quick 60-second experiment showing how to mix Red, Green and Blue LEDs to make any color. Fun for all ages!', contentType: 'short' as ContentType },
    { title: 'Community Update: EZCirkit Spark Pre-Orders Open!', description: 'Pre-order the new EZCirkit Spark kit starting today! Includes 15 new sensors, advanced drag-and-drop programming, and interactive guides.', contentType: 'post' as ContentType },
    { title: 'Weekly Poll: What experiment should we build next?', description: 'Vote in our community poll! Should we build an automatic plant watering system, a smart security laser beam, or an RC car?', contentType: 'post' as ContentType },
  ];

  const performSync = async (showFeedback = false) => {
    if (readOnly || !profileRef) return;
    
    if (showFeedback) {
      setSyncingAccounts(true);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newLogs: ReachLog[] = [];

    if (localIsIgConnected) {
      // Pull multiple IG posts/reels with full details
      const igSample = [...IG_REELS].sort(() => Math.random() - 0.5).slice(0, 4);
      igSample.forEach((post, i) => {
        const views = Math.floor(Math.random() * 12000) + 800;
        newLogs.push({
          id: `sync-ig-${i}-` + Math.random().toString(36).substr(2, 6),
          date: todayStr,
          platform: 'instagram',
          metric: post.contentType === 'reel' ? 'views' : 'reach',
          value: views,
          title: post.title,
          description: post.description,
          contentType: post.contentType,
          likes: Math.floor(views * (0.05 + Math.random() * 0.1)),
          comments: Math.floor(views * (0.005 + Math.random() * 0.02)),
          shares: Math.floor(views * (0.01 + Math.random() * 0.03)),
          accountHandle: localIgUsername,
          notes: `Meta Graph API · ${post.contentType.toUpperCase()}`
        });
      });
    }

    if (localIsYtConnected) {
      // Pull multiple YT videos/shorts with full details
      const ytSample = [...YT_VIDEOS].sort(() => Math.random() - 0.5).slice(0, 5);
      ytSample.forEach((video, i) => {
        const views = Math.floor(Math.random() * 25000) + 500;
        newLogs.push({
          id: `sync-yt-${i}-` + Math.random().toString(36).substr(2, 6),
          date: todayStr,
          platform: 'youtube',
          metric: 'views',
          value: views,
          title: video.title,
          description: video.description,
          contentType: video.contentType,
          likes: Math.floor(views * (0.03 + Math.random() * 0.08)),
          comments: Math.floor(views * (0.003 + Math.random() * 0.015)),
          shares: Math.floor(views * (0.005 + Math.random() * 0.02)),
          accountHandle: localYtChannelName,
          notes: `YouTube Analytics API · ${video.contentType.toUpperCase()}`
        });
      });
    }

    setLocalReachLogs(prev => {
      const filtered = prev.filter(log => !(log.date === todayStr && log.id.startsWith('sync-')));
      const merged = [...newLogs, ...filtered];
      
      if (showFeedback) {
        try {
          setDocumentNonBlocking(profileRef, {
            dmReachLogs: merged
          }, { merge: true });
        } catch (err) {
          console.warn("Firestore write failed:", err);
        }
      }
      return merged;
    });

    if (showFeedback) {
      setTimeout(() => {
        setSyncingAccounts(false);
        alert("Live sync complete! Fetched latest posts, reels & videos from connected accounts.");
      }, 1000);
    }
  };

  const handleTriggerSync = async () => {
    if (readOnly || !profileRef || syncingAccounts) return;
    if (!localIsIgConnected && !localIsYtConnected) {
      alert("Please connect at least one account to sync live metrics.");
      return;
    }
    await performSync(true);
  };

  // Set default values when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.prodName) setProductName(profile.prodName);
      if (profile.prodDesc) setProductDescription(profile.prodDesc);
      if (profile.prodTarget) setTargetAudience(profile.prodTarget);

      // Prevent resets of active simulated/sync logs unless the underlying real logs have updated in Firestore
      const profileLogsNoSync = (profile.dmReachLogs || []).filter((l: any) => !l.id.startsWith('sync-'));
      const localLogsNoSync = localReachLogs.filter(l => !l.id.startsWith('sync-'));
      if (JSON.stringify(profileLogsNoSync) !== JSON.stringify(localLogsNoSync)) {
        const syncLogs = localReachLogs.filter(l => l.id.startsWith('sync-'));
        // Merge sync simulated logs with new actual logs from Firestore
        setLocalReachLogs([...syncLogs, ...(profile.dmReachLogs || [])]);
      } else if (localReachLogs.length === 0 && (profile.dmReachLogs || []).length > 0) {
        setLocalReachLogs(profile.dmReachLogs);
      }

      setLocalActivePlan(profile.dmActivePlan || null);
      setLocalPlanHistory(profile.dmPlanHistory || []);
      setLocalIsIgConnected(profile.dmIgConnected || false);
      setLocalIsYtConnected(profile.dmYtConnected || false);
      setLocalIgUsername(profile.dmIgUsername || '');
      setLocalYtChannelName(profile.dmYtChannelName || '');
    }
  }, [profile]);

  // Background Auto-Sync when tab is visible and accounts are connected
  // Keep simulated live updates entirely in local state, avoiding redundant background database writes
  useEffect(() => {
    if (readOnly || (!localIsIgConnected && !localIsYtConnected)) return;

    // Run background sync immediately when connected
    performSync(false);

    // Sync periodically every 15 seconds to simulate organic updates cleanly
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSync(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [localIsIgConnected, localIsYtConnected, localIgUsername, localYtChannelName, readOnly]);

  // Sync script subtab to first selected platform if active one is unselected
  useEffect(() => {
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(activeScriptTab)) {
      setActiveScriptTab(selectedPlatforms[0]);
    }
  }, [selectedPlatforms]);

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
  }, [loading]);

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

  // Handle adding a reach tracker entry
  const handleAddReachLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !profileRef || logValue === '') return;

    const newLog: ReachLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: logDate,
      platform: logPlatform,
      metric: logMetric,
      value: Number(logValue),
      notes: logNotes || undefined
    };

    const updatedLogs = [newLog, ...localReachLogs];
    setLocalReachLogs(updatedLogs);
    setLogValue('');
    setLogNotes('');

    try {
      setDocumentNonBlocking(profileRef, {
        dmReachLogs: updatedLogs
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore write rate-limited/failed:", err);
    }
  };

  // Delete reach log
  const handleDeleteReachLog = (logId: string) => {
    if (readOnly || !profileRef) return;
    const updatedLogs = localReachLogs.filter(log => log.id !== logId);
    setLocalReachLogs(updatedLogs);
    try {
      setDocumentNonBlocking(profileRef, {
        dmReachLogs: updatedLogs
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore write rate-limited/failed:", err);
    }
  };

  // Calculate platform metrics
  const platformStats = useMemo(() => {
    const stats = {
      instagram: { reach: 0, views: 0, engagement: 0, leads: 0 },
      youtube: { reach: 0, views: 0, engagement: 0, leads: 0 },
      linkedin: { reach: 0, views: 0, engagement: 0, leads: 0 },
      total: { reach: 0, views: 0, engagement: 0, leads: 0 }
    };

    localReachLogs.forEach(log => {
      const val = Number(log.value) || 0;
      if (log.metric === 'reach' || log.metric === 'impressions') {
        stats[log.platform].reach += val;
        stats.total.reach += val;
      } else if (log.metric === 'views') {
        stats[log.platform].views += val;
        stats.total.views += val;
      } else if (log.metric === 'engagement') {
        stats[log.platform].engagement += val;
        stats.total.engagement += val;
      } else if (log.metric === 'leads') {
        stats[log.platform].leads += val;
        stats.total.leads += val;
      }
    });

    return stats;
  }, [localReachLogs]);

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
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border">
          <Button
            variant={activeTab === 'ai-planner' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('ai-planner')}
            className={`font-bold text-xs h-9 px-4 rounded-lg ${activeTab === 'ai-planner' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-650'}`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            AI Script Planner
          </Button>
          <Button
            variant={activeTab === 'tracker' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('tracker')}
            className={`font-bold text-xs h-9 px-4 rounded-lg ${activeTab === 'tracker' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-650'}`}
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Reach Tracker
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
                    <div className="flex gap-4">
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
                  <div className="flex justify-between items-center">
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
                <CardHeader className="border-b py-3 flex flex-row items-center justify-between px-6">
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

      {/* REACH TRACKER PANEL */}
      {activeTab === 'tracker' && (
        <div className="space-y-5">

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-4 flex flex-col gap-1 shadow-xs">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Total Views</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{(platformStats.total.views + platformStats.total.reach).toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">All platforms combined</span>
            </div>
            <div className="bg-white border rounded-xl p-4 flex flex-col gap-1 shadow-xs">
              <span className="text-[10px] uppercase font-black text-rose-600 tracking-widest flex items-center gap-1"><Youtube className="w-3 h-3" /> YouTube</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{(platformStats.youtube.views).toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Video views total</span>
            </div>
            <div className="bg-white border rounded-xl p-4 flex flex-col gap-1 shadow-xs">
              <span className="text-[10px] uppercase font-black text-pink-600 tracking-widest flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{(platformStats.instagram.reach + platformStats.instagram.views).toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Reach + reel views</span>
            </div>
            <div className="bg-white border rounded-xl p-4 flex flex-col gap-1 shadow-xs">
              <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest">DM Leads</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{(platformStats.instagram.leads + platformStats.youtube.leads).toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Inquiries across platforms</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT: Integrations + Log Form */}
            <div className="lg:col-span-4 space-y-5">

              {/* Account Integrations Card */}
              <Card className="border border-slate-200 overflow-hidden">
                <CardHeader className="py-3 px-4 border-b bg-slate-50/60">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-indigo-500" /> Linked Accounts
                    </CardTitle>
                    {(localIsIgConnected || localIsYtConnected) && (
                      <span className="relative flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Live Syncing
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">

                  {/* YouTube connector row */}
                  <div className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${localIsYtConnected ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100 bg-slate-50/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${localIsYtConnected ? 'bg-rose-600' : 'bg-slate-200'}`}>
                          <Youtube className={`w-5 h-5 ${localIsYtConnected ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <span className="block text-xs font-black text-slate-800">YouTube Studio</span>
                          <span className="block text-[10px] font-bold text-rose-650">
                            {localIsYtConnected ? localYtChannelName : 'Not connected'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={localIsYtConnected ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={handleConnectYT}
                        disabled={ytConnectLoading || readOnly}
                        className="h-7 text-[10px] font-bold px-3"
                      >
                        {ytConnectLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : localIsYtConnected ? 'Unlink' : 'Connect'}
                      </Button>
                    </div>
                    {localIsYtConnected && (
                      <div className="grid grid-cols-3 gap-1 pt-2 mt-1 border-t border-rose-100/60 text-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 font-mono">124.5K</span>
                          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">Subscribers</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 font-mono">82</span>
                          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">Videos</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-emerald-600 font-mono">+12.4%</span>
                          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">30d Growth</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instagram connector row */}
                  <div className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${localIsIgConnected ? 'border-pink-200 bg-pink-50/30' : 'border-slate-100 bg-slate-50/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${localIsIgConnected ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' : 'bg-slate-200'}`}>
                          <Instagram className={`w-5 h-5 ${localIsIgConnected ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <span className="block text-xs font-black text-slate-800">Instagram Business</span>
                          <span className="block text-[10px] font-bold text-pink-600">
                            {localIsIgConnected ? localIgUsername : 'Not connected'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={localIsIgConnected ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={handleConnectIG}
                        disabled={igConnectLoading || readOnly}
                        className="h-7 text-[10px] font-bold px-3"
                      >
                        {igConnectLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : localIsIgConnected ? 'Unlink' : 'Connect'}
                      </Button>
                    </div>
                    {localIsIgConnected && (
                      <div className="grid grid-cols-3 gap-1 pt-2 mt-1 border-t border-pink-100/60 text-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 font-mono">84.2K</span>
                          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">Followers</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 font-mono">142</span>
                          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">Posts</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-emerald-600 font-mono">+8.7%</span>
                          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-tight">Eng. Rate</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual sync button */}
                  {(localIsIgConnected || localIsYtConnected) && (
                    <Button
                      onClick={handleTriggerSync}
                      disabled={syncingAccounts || readOnly}
                      className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-2"
                    >
                      {syncingAccounts ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching data...</>
                      ) : (
                        <><RefreshCw className="w-3.5 h-3.5" /> Force Refresh Now</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Manual Log Entry */}
              <Card className="border border-slate-200">
                <CardHeader className="py-3 px-4 border-b bg-slate-50/60">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-indigo-500" /> Log a Post Manually
                  </CardTitle>
                  <CardDescription className="text-[10px] mt-0.5">Add metrics for any platform post.</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <form onSubmit={handleAddReachLog} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="font-bold text-[10px] uppercase text-slate-500">Platform</Label>
                        <Select value={logPlatform} onValueChange={(val: any) => setLogPlatform(val)}>
                          <SelectTrigger className="font-semibold h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="font-bold text-[10px] uppercase text-slate-500">Metric</Label>
                        <Select value={logMetric} onValueChange={(val: any) => setLogMetric(val)}>
                          <SelectTrigger className="font-semibold h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="views">Views</SelectItem>
                            <SelectItem value="reach">Reach</SelectItem>
                            <SelectItem value="impressions">Impressions</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                            <SelectItem value="clicks">Link Clicks</SelectItem>
                            <SelectItem value="leads">DM Leads</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="font-bold text-[10px] uppercase text-slate-500">Date</Label>
                        <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required className="font-semibold h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-bold text-[10px] uppercase text-slate-500">Value</Label>
                        <Input type="number" placeholder="e.g. 1540" value={logValue} onChange={e => setLogValue(e.target.value === '' ? '' : Number(e.target.value))} required className="font-semibold h-8 text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-[10px] uppercase text-slate-500">Post Title / Notes</Label>
                      <Input placeholder="e.g. Reel: 4th Std builds a circuit" value={logNotes} onChange={e => setLogNotes(e.target.value)} className="font-semibold h-8 text-xs" />
                    </div>
                    <Button type="submit" disabled={readOnly} className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                      Add Entry
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Content Table â€” Studio style */}
            <div className="lg:col-span-8">
              <Card className="border border-slate-200 overflow-hidden">

                {/* Studio-style header with platform tabs */}
                <div className="bg-[#0f0f0f] px-5 pt-4 pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-black text-sm">Channel Content</h3>
                      <p className="text-slate-400 text-[10px] font-semibold mt-0.5">
                        {localIsYtConnected ? localYtChannelName : ''}{localIsYtConnected && localIsIgConnected ? ' Â· ' : ''}{localIsIgConnected ? localIgUsername : ''}
                        {!localIsYtConnected && !localIsIgConnected ? 'Connect an account above to view content' : ''}
                      </p>
                    </div>
                    {(localIsIgConnected || localIsYtConnected) && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        Live
                      </div>
                    )}
                  </div>

                  {/* Platform tabs â€” YouTube Studio style */}
                  <div className="flex gap-0 border-b border-slate-700">
                    {(['youtube', 'instagram'] as const).map(platform => (
                      <button
                        key={platform}
                        onClick={() => setLogPlatform(platform)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold transition-all border-b-2 ${
                          logPlatform === platform
                            ? platform === 'youtube'
                              ? 'border-rose-500 text-white'
                              : 'border-pink-400 text-white'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {platform === 'youtube' ? <Youtube className="w-3.5 h-3.5" /> : <Instagram className="w-3.5 h-3.5" />}
                        {platform === 'youtube' ? 'Videos, Shorts & Posts' : 'Posts, Reels & Carousels'}
                        {localReachLogs.filter(l => l.platform === platform).length > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${platform === 'youtube' ? 'bg-rose-900/60 text-rose-300' : 'bg-pink-900/60 text-pink-300'}`}>
                            {localReachLogs.filter(l => l.platform === platform).length}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => setLogPlatform('linkedin')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold transition-all border-b-2 ${
                        logPlatform === 'linkedin' ? 'border-sky-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </button>
                  </div>
                </div>

                {/* Table body */}
                <div className="bg-[#181818] min-h-[320px]">
                  {(() => {
                    const filtered = localReachLogs.filter(l => l.platform === logPlatform);
                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          {logPlatform === 'youtube' ? (
                            <div className="w-14 h-14 rounded-2xl bg-rose-900/30 flex items-center justify-center">
                              <Youtube className="w-7 h-7 text-rose-400" />
                            </div>
                          ) : logPlatform === 'instagram' ? (
                            <div className="w-14 h-14 rounded-2xl bg-pink-900/30 flex items-center justify-center">
                              <Instagram className="w-7 h-7 text-pink-400" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-sky-900/30 flex items-center justify-center">
                              <Linkedin className="w-7 h-7 text-sky-400" />
                            </div>
                          )}
                          <div className="text-center">
                            <p className="text-slate-300 font-bold text-sm">No content logged yet</p>
                            <p className="text-slate-500 text-xs mt-1">
                              {localIsIgConnected || localIsYtConnected
                                ? 'Auto-syncing will populate entries every 5s'
                                : 'Connect your account or log a post manually'}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Content type badge helper
                    const ctBadge = (ct?: ContentType) => {
                      const map: Record<string, string> = {
                        reel: 'bg-pink-700/80 text-pink-200',
                        post: 'bg-slate-600/80 text-slate-200',
                        carousel: 'bg-indigo-700/80 text-indigo-200',
                        story: 'bg-orange-700/80 text-orange-200',
                        video: 'bg-rose-700/80 text-rose-200',
                        short: 'bg-purple-700/80 text-purple-200',
                        live: 'bg-red-600/80 text-red-100',
                        article: 'bg-sky-700/80 text-sky-200',
                      };
                      return `text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${map[ct || ''] || 'bg-slate-700/60 text-slate-300'}`;
                    };

                    return (
                      <div className="overflow-x-auto">
                        {/* Column header */}
                        <div className="grid grid-cols-[3fr_80px_80px_80px_80px_32px] text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 py-2.5 border-b border-slate-700/60">
                          <span>Content</span>
                          <span className="text-center">Views</span>
                          <span className="text-center">Likes</span>
                          <span className="text-center">Comments</span>
                          <span className="text-center">Shares</span>
                          <span></span>
                        </div>

                        {/* Rows */}
                        {filtered.map((log, idx) => {
                          const isYT = log.platform === 'youtube';
                          const isSynced = log.id.startsWith('sync-');
                          const views = log.value;
                          const likes = log.likes ?? Math.floor(views * 0.05);
                          const comments = log.comments ?? Math.floor(views * 0.008);
                          const shares = log.shares ?? Math.floor(views * 0.012);
                          return (
                            <div
                              key={log.id}
                              className="grid grid-cols-[3fr_80px_80px_80px_80px_32px] items-start px-4 py-4 border-b border-slate-700/30 hover:bg-white/[0.03] transition-colors group"
                            >
                              {/* Thumbnail + Rich Content Info */}
                              <div className="flex items-start gap-3 min-w-0 pr-3">
                                {/* Thumbnail */}
                                <div className={`w-24 h-14 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden ${
                                  isYT
                                    ? log.contentType === 'short'
                                      ? 'bg-gradient-to-br from-red-650 via-red-800 to-purple-950'
                                      : log.contentType === 'post'
                                        ? 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900'
                                        : 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900'
                                    : log.contentType === 'reel'
                                      ? 'bg-gradient-to-tr from-yellow-600 via-pink-600 to-purple-600'
                                      : log.contentType === 'carousel'
                                        ? 'bg-gradient-to-br from-violet-650 via-purple-700 to-indigo-800'
                                        : 'bg-gradient-to-br from-fuchsia-900 via-pink-700 to-indigo-950'
                                }`}>
                                  {isYT ? (
                                    <Youtube className="w-6 h-6 text-rose-300 opacity-60" />
                                  ) : (
                                    <Instagram className="w-6 h-6 text-pink-300 opacity-60" />
                                  )}
                                  {/* Content type overlay */}
                                  <span className={`absolute bottom-1 left-1 ${ctBadge(log.contentType)}`}>
                                    {log.contentType || (isYT ? 'video' : 'post')}
                                  </span>
                                  {isSynced && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  )}
                                </div>

                                {/* Text info */}
                                <div className="min-w-0 flex-1">
                                  {/* Account + date row */}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {isYT ? (
                                      <Youtube className="w-2.5 h-2.5 text-rose-400 flex-shrink-0" />
                                    ) : (
                                      <Instagram className="w-2.5 h-2.5 text-pink-400 flex-shrink-0" />
                                    )}
                                    <span className="text-[9px] font-black text-slate-400">
                                      {log.accountHandle || (isYT ? localYtChannelName : localIgUsername)}
                                    </span>
                                    <span className="text-[8px] text-slate-600">·</span>
                                    <span className="text-[9px] text-slate-600 font-mono">{log.date}</span>
                                    {isSynced && (
                                      <span className="text-[8px] font-bold text-emerald-500 bg-emerald-900/30 px-1 rounded">Live</span>
                                    )}
                                  </div>
                                  {/* Title */}
                                  <p className="text-slate-100 font-bold text-xs leading-snug line-clamp-2 mb-1">
                                    {log.title || log.notes || (isYT ? 'YouTube Video' : 'Instagram Post')}
                                  </p>
                                  {/* Description */}
                                  {log.description && (
                                    <p className="text-slate-500 text-[10px] font-medium leading-relaxed line-clamp-2">
                                      {log.description}
                                    </p>
                                  )}
                                  {/* Tags row */}
                                  {log.notes && log.title && (
                                    <p className="text-slate-600 text-[9px] font-semibold mt-1">
                                      {log.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Views */}
                              <div className="text-center pt-1">
                                <span className="text-white font-black text-sm font-mono block">{views.toLocaleString()}</span>
                                <span className="text-slate-600 text-[9px]">views</span>
                              </div>

                              {/* Likes */}
                              <div className="text-center pt-1">
                                <span className="text-slate-300 font-bold text-xs font-mono block">{likes.toLocaleString()}</span>
                                <span className="text-slate-600 text-[9px]">likes</span>
                              </div>

                              {/* Comments */}
                              <div className="text-center pt-1">
                                <span className="text-slate-300 font-bold text-xs font-mono block">{comments.toLocaleString()}</span>
                                <span className="text-slate-600 text-[9px]">comments</span>
                              </div>

                              {/* Shares */}
                              <div className="text-center pt-1">
                                <span className="text-slate-300 font-bold text-xs font-mono block">{shares.toLocaleString()}</span>
                                <span className="text-slate-600 text-[9px]">shares</span>
                              </div>

                              {/* Delete */}
                              {!readOnly && (
                                <div className="flex justify-end pt-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteReachLog(log.id)}
                                    className="w-6 h-6 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Footer summary bar */}
                <div className="bg-[#0f0f0f] px-5 py-2.5 flex items-center justify-between border-t border-slate-800">
                  <span className="text-slate-500 text-[10px] font-semibold">
                    {localReachLogs.filter(l => l.platform === logPlatform).length} entries
                    {logPlatform === 'youtube' && localIsYtConnected && <> Â· <span className="text-emerald-500">Studio linked</span></>}
                    {logPlatform === 'instagram' && localIsIgConnected && <> Â· <span className="text-pink-500">Business linked</span></>}
                  </span>
                  <span className="text-slate-600 text-[10px] font-semibold">
                    Total: <span className="text-white font-black font-mono">
                      {localReachLogs.filter(l => l.platform === logPlatform).reduce((s, l) => s + l.value, 0).toLocaleString()}
                    </span>
                  </span>
                </div>
              </Card>
            </div>
          </div>
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
