'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  PhoneCall, GraduationCap, Target, AlertCircle, Sparkles, Plus, Trash2, 
  CheckCircle2, XCircle, Info, Copy, Check, BookOpen, BarChart3, HelpCircle, 
  User, MessageSquareCode, Award, ShieldAlert, ArrowRight, TrendingUp,
  Loader2, Send, RefreshCw, History, Maximize2
} from 'lucide-react';
import { useDoc } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';
import { 
  generateColdCallTemplate, 
  generateCoachingScenario, 
  simulateProspectResponse,
  explainMethodologyStep,
  type ColdCallGeneratorOutput,
  type CoachingScenarioOutput,
  type ProspectChatOutput,
  type MethodologyExplainerOutput
} from '@/ai/flows/sales-script-flows';

interface SalesStrategyProps {
  profileRef: DocumentReference | null;
  readOnly?: boolean;
}

export interface MapMyProductHistoryItem {
  id: string;
  stepNumber: number;
  stepTitle: string;
  explanation: string;
  concreteExample: string;
  actionableTasks: string[];
  timestamp: string;
}

export interface ColdCallScriptHistoryItem {
  id: string;
  productName: string;
  targetAudience: string;
  problemSolved: string;
  buyerType: 'price' | 'quality' | 'urgent' | 'curious';
  script: ColdCallGeneratorOutput;
  timestamp: string;
}

export interface PerformanceLog {
  id: string;
  date: string;
  leadsContacted: number;
  conversationsDone: number;
  painPointsIdentified: number;
  pitchesDelivered: number;
  objectionsHandled: number;
  salesClosed: number;
  notes?: string;
}

export function SalesStrategy({ profileRef, readOnly }: SalesStrategyProps) {
  const { data: profile } = useDoc(profileRef);

  // Map My Product generated history
  const history: MapMyProductHistoryItem[] = useMemo(() => profile?.ezMapMyProductHistory || [], [profile]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Cold Call Script generated history
  const scriptHistory: ColdCallScriptHistoryItem[] = useMemo(() => profile?.ezColdCallScriptHistory || [], [profile]);
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);
  const [selectedHistoryScript, setSelectedHistoryScript] = useState<ColdCallScriptHistoryItem | null>(null);

  const [isCustomerTypesOpen, setIsCustomerTypesOpen] = useState(false);
  const [isObjectionSolverOpen, setIsObjectionSolverOpen] = useState(false);
  const [isScriptHistoryOpen, setIsScriptHistoryOpen] = useState(false);
  const [isBlueprintHistoryOpen, setIsBlueprintHistoryOpen] = useState(false);

  // Custom Pitch Formula state
  const savedPitch = useMemo(() => profile?.ezCustomPitchFormula || {
    hook: '',
    problem: '',
    solution: '',
    outcome: ''
  }, [profile]);

  const [pitchInput, setPitchInput] = useState(savedPitch);
  const [isSavingPitch, setIsSavingPitch] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync pitch input with DB when loaded
  useEffect(() => {
    if (profile?.ezCustomPitchFormula) {
      setPitchInput(profile.ezCustomPitchFormula);
    }
  }, [profile?.ezCustomPitchFormula]);

  // ================= AI Cold Call Generator States =================
  const [aiProductName, setAiProductName] = useState('Crabster Technology');
  const [aiTargetAudience, setAiTargetAudience] = useState('Academic lab mentors');
  const [aiProblemSolved, setAiProblemSolved] = useState('Review your product specs, plan developer scopes, and model go-to-market strategies aligned with your runway. use this detail for sales straegy');
  const [aiBuyerType, setAiBuyerType] = useState<'price' | 'quality' | 'urgent' | 'curious'>('price');
  const [aiGeneratedScript, setAiGeneratedScript] = useState<ColdCallGeneratorOutput | null>(null);
  const [aiScriptLoading, setAiScriptLoading] = useState(false);

  const [hasInitializedFromProfile, setHasInitializedFromProfile] = useState(false);

  // Sync details dynamically from the Product Suite database if available
  useEffect(() => {
    if (profile && !hasInitializedFromProfile) {
      if (profile.prodName) {
        setAiProductName(profile.prodName);
      } else if (profile.companyName) {
        setAiProductName(profile.companyName);
      }
      if (profile.prodTarget) {
        setAiTargetAudience(profile.prodTarget);
      }
      if (profile.prodDesc) {
        setAiProblemSolved(profile.prodDesc);
      }
      setHasInitializedFromProfile(true);
    }
  }, [profile, hasInitializedFromProfile]);

  // ================= AI Roleplay Simulator States =================
  const [aiAreaToCoach, setAiAreaToCoach] = useState<
    'Customer Understanding' | 'Pain Discovery' | 'Value Pitch' | 'Objection Handling' | 'Closing' | 'Follow-Up'
  >('Customer Understanding');
  const [aiDifficulty, setAiDifficulty] = useState<'beginner' | 'advanced'>('beginner');
  const [aiScenario, setAiScenario] = useState<CoachingScenarioOutput | null>(null);
  const [aiScenarioLoading, setAiScenarioLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);
  const [userChatMessage, setUserChatMessage] = useState('');
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [prospectEnded, setProspectEnded] = useState(false);
  const [coachFeedbackHint, setCoachFeedbackHint] = useState('');

  // ================= AI Handlers =================
  const handleGenerateColdCall = async () => {
    if (aiScriptLoading) return;
    setAiScriptLoading(true);
    try {
      const result = await generateColdCallTemplate({
        productName: aiProductName || 'Our Product',
        targetAudience: aiTargetAudience || 'Target Customer',
        problemSolved: aiProblemSolved || 'Operational friction',
        buyerType: aiBuyerType
      });
      setAiGeneratedScript(result);

      // Save to Firebase history
      if (profileRef && !readOnly) {
        const now = new Date();
        const formattedDateTime = now.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) + ' at ' + now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        });

        const newItem: ColdCallScriptHistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          productName: aiProductName || 'Our Product',
          targetAudience: aiTargetAudience || 'Target Customer',
          problemSolved: aiProblemSolved || 'Operational friction',
          buyerType: aiBuyerType,
          script: result,
          timestamp: formattedDateTime
        };

        const currentHistory = profile?.ezColdCallScriptHistory || [];
        const updatedHistory = [newItem, ...currentHistory];

        await setDocumentNonBlocking(profileRef, {
          ezColdCallScriptHistory: updatedHistory
        }, { merge: true });
      }
    } catch (err) {
      console.error('Error generating cold call script:', err);
    } finally {
      setAiScriptLoading(false);
    }
  };

  const handleLoadScriptFromHistory = (item: ColdCallScriptHistoryItem) => {
    setAiProductName(item.productName);
    setAiTargetAudience(item.targetAudience);
    setAiProblemSolved(item.problemSolved);
    setAiBuyerType(item.buyerType);
    setAiGeneratedScript(item.script);
  };

  const handleDeleteScriptItem = async (itemId: string) => {
    if (!profileRef || readOnly) return;
    if (!confirm('Are you sure you want to delete this cold call script from history?')) return;
    try {
      const currentHistory = profile?.ezColdCallScriptHistory || [];
      const updatedHistory = currentHistory.filter((item: ColdCallScriptHistoryItem) => item.id !== itemId);
      await setDocumentNonBlocking(profileRef, {
        ezColdCallScriptHistory: updatedHistory
      }, { merge: true });
      
      // If the currently displayed generated script is the one deleted, clear it
      if (aiGeneratedScript && aiGeneratedScript.fullDraftScript === scriptHistory.find(h => h.id === itemId)?.script.fullDraftScript) {
        setAiGeneratedScript(null);
      }
    } catch (err) {
      console.error('Error deleting cold call script history item:', err);
    }
  };

  const handleApplyAIScript = async () => {
    if (!aiGeneratedScript) return;
    const newPitch = {
      hook: aiGeneratedScript.hook,
      problem: aiGeneratedScript.problem,
      solution: aiGeneratedScript.solution,
      outcome: aiGeneratedScript.outcome
    };
    setPitchInput(newPitch);
    if (profileRef && !readOnly) {
      await setDocumentNonBlocking(profileRef, {
        ezCustomPitchFormula: newPitch
      }, { merge: true });
    }
  };

  const handleInitializeRoleplay = async (
    overrideArea?: 'Customer Understanding' | 'Pain Discovery' | 'Value Pitch' | 'Objection Handling' | 'Closing' | 'Follow-Up'
  ) => {
    if (aiScenarioLoading) return;
    setAiScenarioLoading(true);
    setProspectEnded(false);
    setCoachFeedbackHint('');
    setChatMessages([]);
    
    const area = overrideArea || aiAreaToCoach;
    if (overrideArea) {
      setAiAreaToCoach(overrideArea);
    }

    try {
      const prodName = aiProductName || profile?.companyName || 'Our Product';
      const targetAud = aiTargetAudience || 'B2B Customers';
      const probSolv = aiProblemSolved || 'Operational inefficiencies';

      const scenario = await generateCoachingScenario({
        areaToCoach: area,
        difficulty: aiDifficulty,
        productName: prodName,
        targetAudience: targetAud,
        problemSolved: probSolv
      });
      setAiScenario(scenario);
      setChatMessages([
        { role: 'model', text: scenario.openingLine }
      ]);
      
      // Scroll to simulator container
      setTimeout(() => {
        const simulatorEl = document.getElementById('ai-simulator-top');
        if (simulatorEl) {
          simulatorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      console.error('Error initializing AI roleplay:', err);
    } finally {
      setAiScenarioLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userChatMessage.trim() || chatHistoryLoading || !aiScenario || prospectEnded) return;
    
    const userMsg = userChatMessage.trim();
    setUserChatMessage('');
    
    const updatedHistory = [...chatMessages, { role: 'user' as const, text: userMsg }];
    setChatMessages(updatedHistory);
    setChatHistoryLoading(true);
    
    try {
      const response = await simulateProspectResponse({
        scenarioName: aiScenario.scenarioName,
        prospectName: aiScenario.prospectName,
        companyContext: aiScenario.companyContext,
        triggerEvent: aiScenario.triggerEvent,
        scenarioRules: aiScenario.scenarioRules,
        objectionsToRaise: aiScenario.objectionsToRaise,
        chatHistory: updatedHistory,
        userMessage: userMsg
      });
      
      setChatMessages(prev => [...prev, { role: 'model' as const, text: response.reply }]);
      setProspectEnded(response.ended);
      setCoachFeedbackHint(response.coachFeedbackHint);
    } catch (err) {
      console.error('Error in AI prospect response:', err);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Save custom pitch
  const handleSavePitch = async () => {
    if (!profileRef || readOnly) return;
    setIsSavingPitch(true);
    try {
      await setDocumentNonBlocking(profileRef, {
        ezCustomPitchFormula: pitchInput
      }, { merge: true });
    } catch (err) {
      console.error('Error saving custom pitch formula:', err);
    } finally {
      setIsSavingPitch(false);
    }
  };

  // Selected script templates for customer types
  const [selectedCustType, setSelectedCustType] = useState('price');
  const [selectedObjection, setSelectedObjection] = useState('expensive');

  const customerTypes = {
    price: {
      title: 'Price-Focused Buyer',
      signal: 'Asks about cost first, pushes for discounts, compares prices.',
      approach: 'Show ROI and value over price. Compare cost of NOT solving the problem.',
      script: '"Compared to the time you lose right now, this pays for itself in Week 1. If you don\'t fix this friction, you\'ll lose [X amount] over the next month in wasted developer hours."',
      dos: ['Quantify the cost of inaction', 'Pivot to ROI and efficiency gains'],
      donts: ['Immediately offer discounts', 'Focus on specifications and details']
    },
    quality: {
      title: 'Quality-Focused Buyer',
      signal: 'Asks about specifications, compliance, reliability, and certifications.',
      approach: 'Lead with proof, performance data, and clear differentiation from cheap alternatives.',
      script: '"This is rated for industrial-grade specifications and is currently used by top companies in your space. We have testing data proving a 99.8% uptime rate under load."',
      dos: ['Provide datasheets and case studies', 'Focus on reliability and long-term durability'],
      donts: ['Focus purely on pricing details', 'Make unbacked claims']
    },
    urgent: {
      title: 'Urgent Buyer',
      signal: 'Has a tight deadline, sounds frustrated or stressed, wants immediate delivery.',
      approach: 'Move fast, simplify options. Don\'t over-explain — close efficiently and handle logistics.',
      script: '"I understand your timeline is tight. I can guarantee delivery to your lab by Friday morning. Let\'s lock in the configuration right now so it ships today."',
      dos: ['Offer instant shipping or fast-track support', 'Keep explanations brief and action-oriented'],
      donts: ['Drag out the conversation with long demos', 'Over-complicate pricing structures']
    },
    curious: {
      title: 'Curious Learner',
      signal: 'Asks lots of questions, is researching for a future project, no immediate urgency.',
      approach: 'Educate genuinely. Build trust first without pushing for the sale. They\'ll return when ready.',
      script: '"Let me show you exactly how this works and share our troubleshooting checklist. There\'s absolutely no pressure to decide today — I just want to make sure you have the right info."',
      dos: ['Share useful tips, resources, or advice', 'Maintain a friendly, consultive tone'],
      donts: ['Force a closing question too early', 'Get impatient with their research process']
    }
  };

  const objections = {
    expensive: {
      title: '"Too Expensive"',
      root: 'Price sensitivity or unclear ROI.',
      strategy: 'Compare cost vs. current time/effort wasted.',
      script: '"I understand it feels like a lot. Let me ask: how much time is your team currently spending each week troubleshooting these component delays? When you calculate those developer hours, this actually pays for itself within the first 10 days."'
    },
    timing: {
      title: '"Not Needed Now"',
      root: 'No urgency; benefit is unclear.',
      strategy: 'Create urgency by revealing the compounding cost of delay.',
      script: '"Of course. What happens to your project build and launch timeline if this delay isn\'t resolved in the next 30 days? Will that delay your customer launch?"'
    },
    checking: {
      title: '"Just Checking"',
      root: 'Comparison shopping or undecided.',
      strategy: 'Understand what they are comparing; highlight your unique gap filler.',
      script: '"Got it. What are you comparing us with? What matters most to you for this project — is it the components availability, reliability, or speed?"'
    },
    competitor: {
      title: '"Already Have a Solution"',
      root: 'Happy with competitor or workaround.',
      strategy: 'Find gaps in what they currently use without trash-talking.',
      script: '"That\'s great — having a system in place is key. Let me ask, what does your current solution not do well, or where does it slow you down when you\'re scaling?"'
    },
    think: {
      title: '"Let Me Think About It"',
      root: 'Hidden objection; need more info or lost confidence.',
      strategy: 'Uncover the real blocker directly and transparently.',
      script: '"Of course — it\'s an important decision. To make sure I\'ve done my job, what specifically is the main thing you want to think over? Is it the pricing, the specs, or does it feel like it might not fit your current setup?"'
    }
  };

  const compiledCustomPitch = useMemo(() => {
    const hook = pitchInput.hook || '[Hook: Connect to customer pain]';
    const problem = pitchInput.problem || '[Problem: Name pain clearly]';
    const solution = pitchInput.solution || '[Solution: Introduce product]';
    const outcome = pitchInput.outcome || '[Outcome: Paint future state]';
    return `${hook} ${problem} ${solution} ${outcome}`;
  }, [pitchInput]);

  // ================= AI Step Explainer States & Handlers =================
  const [stepExplanations, setStepExplanations] = useState<Record<number, MethodologyExplainerOutput>>({});
  const [stepExplaining, setStepExplaining] = useState<Record<number, boolean>>({});

  const handleExplainStep = async (stepNum: number, stepTitle: string) => {
    if (stepExplaining[stepNum]) return;
    setStepExplaining(prev => ({ ...prev, [stepNum]: true }));
    try {
      const prodName = aiProductName || profile?.companyName || 'Our Product';
      const targetAud = aiTargetAudience || 'B2B Customers';
      const probSolv = aiProblemSolved || 'Review your product specs, plan developer scopes, and model go-to-market strategies aligned with your runway. use this detail for sales straegy';

      const result = await explainMethodologyStep({
        stepNumber: stepNum,
        stepTitle,
        productName: prodName,
        targetAudience: targetAud,
        problemSolved: probSolv
      });
      setStepExplanations(prev => ({ ...prev, [stepNum]: result }));

      // Automatically add to history in Firebase
      if (profileRef && !readOnly) {
        const now = new Date();
        const formattedDateTime = now.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) + ' at ' + now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        });

        const newItem: MapMyProductHistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          stepNumber: stepNum,
          stepTitle,
          explanation: result.explanation,
          concreteExample: result.concreteExample,
          actionableTasks: result.actionableTasks,
          timestamp: formattedDateTime
        };

        const currentHistory = profile?.ezMapMyProductHistory || [];
        const updatedHistory = [newItem, ...currentHistory];

        await setDocumentNonBlocking(profileRef, {
          ezMapMyProductHistory: updatedHistory
        }, { merge: true });
      }
    } catch (err) {
      console.error(`Error explaining step ${stepNum}:`, err);
    } finally {
      setStepExplaining(prev => ({ ...prev, [stepNum]: false }));
    }
  };

  const handleDeleteHistoryItem = async (itemId: string) => {
    if (!profileRef || readOnly) return;
    if (!confirm('Are you sure you want to delete this generated blueprint?')) return;
    try {
      const currentHistory = profile?.ezMapMyProductHistory || [];
      const updatedHistory = currentHistory.filter((item: MapMyProductHistoryItem) => item.id !== itemId);
      await setDocumentNonBlocking(profileRef, {
        ezMapMyProductHistory: updatedHistory
      }, { merge: true });
    } catch (err) {
      console.error('Error deleting map my product history item:', err);
    }
  };

  const renderAIStepSection = (
    stepNum: number,
    stepTitle: string,
    area: 'Customer Understanding' | 'Pain Discovery' | 'Value Pitch' | 'Objection Handling' | 'Closing' | 'Follow-Up'
  ) => {
    const isExplaining = stepExplaining[stepNum];
    const explanation = stepExplanations[stepNum];

    return (
      <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span className="text-[10.5px] font-black uppercase tracking-wide">AI Co-Pilot for Step {stepNum}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => handleExplainStep(stepNum, stepTitle)}
              disabled={isExplaining}
              className="h-7 text-[10px] font-extrabold gap-1 border-indigo-200 hover:bg-indigo-50/50"
            >
              {isExplaining ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BookOpen className="w-3 h-3 text-indigo-600" />
                  Map My Product
                </>
              )}
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => handleInitializeRoleplay(area)}
              className="h-7 text-[10px] font-extrabold gap-1 rounded-md px-3 border-none hover:opacity-90 transition-all shadow-sm shrink-0"
              style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white/80 animate-bounce" />
              Practice with AI Coach
            </Button>
          </div>
        </div>

        {/* Display Explanation Output */}
        {explanation && (
          <div className="bg-gradient-to-r from-indigo-50/30 to-slate-50/30 border border-indigo-100 rounded-xl p-4 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex justify-between items-center border-b border-indigo-100 pb-1.5">
              <span className="text-[10px] uppercase font-black text-indigo-900">Custom B2B Application Blueprint:</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStepExplanations(prev => {
                  const updated = { ...prev };
                  delete updated[stepNum];
                  return updated;
                })}
                className="h-5 text-[8.5px] font-bold text-slate-400 hover:text-slate-650"
              >
                Dismiss
              </Button>
            </div>
            
            <div className="text-[11px] leading-relaxed text-slate-700 space-y-2 whitespace-pre-line font-medium">
              {explanation.explanation}
            </div>

            <div className="bg-white border border-indigo-100/60 rounded-lg p-3 space-y-1">
              <span className="text-[9px] uppercase font-black text-indigo-805 block">Product Context Dialogue Example:</span>
              <p className="text-[11px] leading-relaxed text-slate-850 italic font-semibold whitespace-pre-line font-mono">
                {explanation.concreteExample}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-black text-slate-500 block">Startup Action Checklist:</span>
              <div className="space-y-1 flex flex-col">
                {explanation.actionableTasks.map((task, idx) => (
                  <label key={idx} className="flex items-start gap-2 text-[10.5px] font-semibold text-slate-750 cursor-pointer select-none">
                    <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3" />
                    <span>{task}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 rounded-2xl border border-indigo-500/20 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
              Sales Syllabus
            </Badge>
            <span className="text-xs text-indigo-300 font-semibold">Value-Driven Sales System</span>
          </div>
          <h3 className="text-2xl font-black tracking-tight">VALUE-DRIVEN SALES STRATEGY</h3>
          <p className="text-xs text-slate-350 max-w-2xl font-medium">
            Learn the system: Know the Customer → Discover Pain → Address Pain → Handle Objections → Close.
            Use this interactive guide to train, build pitch scripts, and track team conversion performance.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            size="icon"
            onClick={() => setIsCustomerTypesOpen(true)}
            title="Customer Types"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all duration-200 shadow-sm shrink-0 flex items-center justify-center"
          >
            <User className="w-5 h-5 text-indigo-300" />
          </Button>

          <Button
            size="icon"
            onClick={() => setIsObjectionSolverOpen(true)}
            title="Objection Solver"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all duration-200 shadow-sm shrink-0 flex items-center justify-center"
          >
            <ShieldAlert className="w-5 h-5 text-amber-300" />
          </Button>

          <Button
            size="icon"
            onClick={() => setIsScriptHistoryOpen(true)}
            title="Script History"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all duration-200 shadow-sm shrink-0 flex items-center justify-center relative"
          >
            <History className="w-5 h-5 text-emerald-300" />
            {scriptHistory.length > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[8px] h-4 w-4 flex items-center justify-center p-0 rounded-full border-none">
                {scriptHistory.length}
              </Badge>
            )}
          </Button>

          <Button
            size="icon"
            onClick={() => setIsBlueprintHistoryOpen(true)}
            title="Blueprint History"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all duration-200 shadow-sm shrink-0 flex items-center justify-center relative"
          >
            <BookOpen className="w-5 h-5 text-sky-300" />
            {history.length > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-sky-500 hover:bg-sky-600 text-white font-black text-[8px] h-4 w-4 flex items-center justify-center p-0 rounded-full border-none">
                {history.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="syllabus" className="w-full">
        <div className="border-b pb-3 mb-6 w-full overflow-hidden">
          <TabsList className="flex w-full overflow-x-auto whitespace-nowrap bg-slate-100/80 p-1 rounded-xl md:rounded-full gap-1 md:gap-0.5 border-none h-auto md:h-10 scrollbar-none select-none">
            <TabsTrigger value="syllabus" className="rounded-full px-5 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
              <GraduationCap className="w-3.5 h-3.5" /> Complete Teaching Syllabus
            </TabsTrigger>
            <TabsTrigger value="scripts" className="rounded-full px-5 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
              <PhoneCall className="w-3.5 h-3.5" /> Cold Call & Pitch Templates
            </TabsTrigger>
            <TabsTrigger value="mentor" className="rounded-full px-5 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
              <Award className="w-3.5 h-3.5" /> Mentor Coaching Guide
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ================= TAB 1: SYLLABUS ================= */}
        <TabsContent value="syllabus" className="focus-visible:outline-none animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Core Syllabus Content */}
            <div className="lg:col-span-2 space-y-6">

              {/* B2B Product Configuration for Sales AI */}
              <Card className="border-2 border-indigo-100 bg-indigo-50/5 shadow-sm overflow-hidden">
                <CardHeader className="py-2.5 px-4 border-b bg-indigo-50/15 flex flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <CardTitle className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" />
                      Product Profile for Sales AI Co-Pilot
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Configures details used by the AI Script Generator and AI Roleplay Simulator.
                    </CardDescription>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase tracking-wide border-none px-2 py-0.5">
                    Active Profile
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-900 uppercase">Product Name</label>
                    <Input
                      value={aiProductName}
                      onChange={(e: any) => setAiProductName(e.target.value)}
                      placeholder="e.g. EZCirkit STEM Training Kit"
                      className="text-xs font-semibold h-8 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-900 uppercase">Target Client Segment</label>
                    <Input
                      value={aiTargetAudience}
                      onChange={(e: any) => setAiTargetAudience(e.target.value)}
                      placeholder="e.g. Academic lab mentors"
                      className="text-xs font-semibold h-8 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-900 uppercase">Main Customer Frustration</label>
                    <Input
                      value={aiProblemSolved}
                      onChange={(e: any) => setAiProblemSolved(e.target.value)}
                      placeholder="e.g. Component shipping delays"
                      className="text-xs font-semibold h-8 bg-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Active AI Roleplay Simulator Panel */}
              {aiScenario && (
                <Card id="ai-simulator-top" className="border-2 border-emerald-500 shadow-md overflow-hidden bg-white animate-in slide-in-from-top-3 duration-300">
                  <CardHeader className="bg-slate-900 text-white p-4 border-b border-slate-800">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase border-none px-2 py-0.5">
                            Live Roleplay Session: {aiDifficulty}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-bold">Focus: {aiAreaToCoach}</span>
                        </div>
                        <h4 className="text-base font-black text-white">{aiScenario.scenarioName}</h4>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAiScenario(null)}
                        className="h-7 text-[10px] font-bold text-slate-450 hover:text-white border border-slate-800 hover:bg-slate-800"
                      >
                        Exit Roleplay
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs border-t border-slate-800 pt-3 text-slate-300 mt-2 font-medium">
                      <div>
                        <strong className="text-white block font-black uppercase text-[9px] tracking-wide mb-0.5">Prospect Client:</strong>
                        {aiScenario.prospectName}
                      </div>
                      <div>
                        <strong className="text-white block font-black uppercase text-[9px] tracking-wide mb-0.5">Company Context:</strong>
                        {aiScenario.companyContext}
                      </div>
                      <div className="md:col-span-2">
                        <strong className="text-white block font-black uppercase text-[9px] tracking-wide mb-0.5">Call Trigger Event:</strong>
                        {aiScenario.triggerEvent}
                      </div>
                      <div className="md:col-span-2 bg-indigo-950 border border-indigo-500/20 rounded-xl p-3 text-indigo-200 mt-1">
                        <strong className="text-white block font-black uppercase text-[9px] tracking-wide mb-1">Active Scenario Rules & Obstacles:</strong>
                        <ul className="list-disc list-inside space-y-0.5 font-semibold text-[10px]">
                          {aiScenario.scenarioRules.map((rule, idx) => (
                            <li key={idx}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Chat Logging */}
                  <div className="flex flex-col h-[340px] bg-slate-50 overflow-hidden">
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-indigo-650 text-white self-end rounded-tr-none'
                              : 'bg-white text-slate-800 border border-slate-200 self-start rounded-tl-none'
                          }`}
                        >
                          <div className="text-[9px] font-black uppercase mb-0.5 tracking-wider opacity-60">
                            {msg.role === 'user' ? 'You (Sales Rep)' : aiScenario.prospectName}
                          </div>
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                      ))}
                      {chatHistoryLoading && (
                        <div className="bg-white text-slate-800 border border-slate-200 self-start rounded-2xl rounded-tl-none px-3 py-2 text-xs font-semibold shadow-sm flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-650" />
                          <span>Prospect is talking...</span>
                        </div>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChatMessage(e);
                      }}
                      className="border-t bg-white p-3 flex gap-2"
                    >
                      <Input
                        value={userChatMessage}
                        onChange={(e: any) => setUserChatMessage(e.target.value)}
                        disabled={chatHistoryLoading || prospectEnded}
                        placeholder={
                          prospectEnded 
                            ? "Outcome reached. Click Exit above to end practice." 
                            : "Type your pitch or question to the prospect..."
                        }
                        className="text-xs font-semibold h-9 rounded-lg"
                      />
                      <Button
                        type="submit"
                        disabled={chatHistoryLoading || prospectEnded || !userChatMessage.trim()}
                        className="bg-indigo-600 hover:bg-indigo-750 text-white px-4 h-9 rounded-lg shrink-0 border-none"
                      >
                        <Send className="w-3.5 h-3.5 text-white" />
                      </Button>
                    </form>
                  </div>

                  {coachFeedbackHint && (
                    <div className="bg-amber-50 border-t border-amber-250 p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wide">
                        <Award className="w-4 h-4 text-amber-700 animate-bounce" />
                        AI Coach Reframe Advice:
                      </div>
                      <p className="text-xs font-bold text-slate-700 italic leading-relaxed">
                        "{coachFeedbackHint}"
                      </p>
                    </div>
                  )}
                </Card>
              )}
              <Card className="border-2 border-indigo-50 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b bg-indigo-50/10 pb-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <BookOpen className="w-5 h-5" />
                    <CardTitle className="text-base font-black text-slate-800">Value-Driven Sales Methodology</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    "Sales is not luck. It is a repeatable system. Learn it. Follow it. Win with it."
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Accordion type="single" defaultValue="framework" collapsible className="w-full space-y-3">
                    
                    <AccordionItem value="framework" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        01. The Core Framework — How It All Connects
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-3 leading-relaxed">
                        <p className="font-medium text-slate-700">
                          Every sale follows the same journey: Know the Customer → Discover Pain Points → Address Pain with Value → Handle Objections → Close.
                          Skip any step and the sale breaks down. This is not a script — it is a thinking system.
                        </p>
                        
                        {/* Visual Flow diagram */}
                        <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto gap-2 text-center pt-2 scrollbar-none pb-1">
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-col justify-between shrink-0 w-28 sm:w-auto">
                            <span className="text-[10px] font-black text-indigo-800 uppercase block mb-1">Step 1</span>
                            <span className="text-[11px] font-bold text-slate-700">Know Customer</span>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-col justify-between shrink-0 w-28 sm:w-auto">
                            <span className="text-[10px] font-black text-indigo-800 uppercase block mb-1">Step 2</span>
                            <span className="text-[11px] font-bold text-slate-700">Discover Pain</span>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-col justify-between shrink-0 w-28 sm:w-auto">
                            <span className="text-[10px] font-black text-indigo-800 uppercase block mb-1">Step 3a</span>
                            <span className="text-[11px] font-bold text-slate-700">Address Pain</span>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-col justify-between shrink-0 w-28 sm:w-auto">
                            <span className="text-[10px] font-black text-indigo-800 uppercase block mb-1">Step 3b</span>
                            <span className="text-[11px] font-bold text-slate-700">Give Value</span>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-col justify-between shrink-0 w-28 sm:w-auto">
                            <span className="text-[10px] font-black text-indigo-800 uppercase block mb-1">Step 4</span>
                            <span className="text-[11px] font-bold text-slate-700">Handle Obj & Close</span>
                          </div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg p-2.5 mt-2 text-center">
                          Result: Customer buys because they feel understood and helped — not sold to.
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(1, "The Core Framework — How It All Connects", "Customer Understanding")}
                      </AccordionContent>
                    </AccordionItem>
 
                    <AccordionItem value="rules" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        02. The 6 Golden Rules of Value-Driven Selling
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { num: '01', title: 'Sell Outcome, Not Product', desc: 'Customers buy speed, reliability, and confidence — not components. Link what you sell to what they gain.' },
                            { num: '02', title: 'No = Objection, Not Rejection', desc: '"No" means they don\'t yet see value, or you asked too early. Listen, reframe, re-present. Never walk away.' },
                            { num: '03', title: 'Ask Before You Answer', desc: 'Every pitch made before understanding the customer is a guess. Ask first, pitch second. Always.' },
                            { num: '04', title: 'Give Value First', desc: 'Educate, advise, or help them avoid a mistake before asking for anything. Trust earns the sale.' },
                            { num: '05', title: 'If You Don\'t Ask, You Don\'t Close', desc: 'Many sales die because no one asked for the order. Ask clearly, confidently, and without apology.' },
                            { num: '06', title: 'Talk Less. Listen More.', desc: 'The customer should speak at least 60% of the time. Your job is to understand, not to perform.' },
                          ].map((rule, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border rounded-lg flex items-start gap-2.5">
                              <span className="text-xs font-black text-indigo-650 bg-indigo-50 border border-indigo-150 rounded px-1.5 py-0.5">{rule.num}</span>
                              <div className="space-y-0.5">
                                <h5 className="text-[11px] font-extrabold text-slate-800 leading-snug">{rule.title}</h5>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{rule.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(2, "The 6 Golden Rules of Value-Driven Selling", "Customer Understanding")}
                      </AccordionContent>
                    </AccordionItem>
 
                    <AccordionItem value="know" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        03. Step 1 — Know the Customer
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-4">
                        <div className="space-y-2">
                           <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">What You Need to Find Out First:</h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-medium">
                            <li className="bg-slate-55 border rounded p-2.5">
                              <strong className="text-slate-900 block mb-0.5">Why do they need it?</strong>
                              Not features — outcomes. E.g., 'Finish PCB by Friday' rather than 'Need a resistor'.
                            </li>
                            <li className="bg-slate-55 border rounded p-2.5">
                              <strong className="text-slate-900 block mb-0.5">What are they working on?</strong>
                              Their current project/challenge reveals context and urgency immediately.
                            </li>
                            <li className="bg-slate-55 border rounded p-2.5">
                              <strong className="text-slate-900 block mb-0.5">What are they using now?</strong>
                              Current solution or competitor reveals gaps you can fill and what they value.
                            </li>
                            <li className="bg-slate-55 border rounded p-2.5">
                              <strong className="text-slate-900 block mb-0.5">What is slowing them down?</strong>
                              Friction in current process. Their slowdown is your sales opportunity.
                            </li>
                          </ul>
                        </div>
 
                        {/* Customer Type Quick Nav */}
                        <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-xl p-3 space-y-2">
                          <h4 className="font-extrabold text-indigo-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            The 4 Customer Types & Selling Approaches:
                          </h4>
                          <p className="text-[11px]">
                            Identify: Price-Focused, Quality-Focused, Urgent Buyer, Curious Learner.
                            Use the <strong className="text-indigo-900">Cold Call & Pitch Templates</strong> tab to select types and view script templates instantly.
                          </p>
                        </div>
 
                        {/* Dos & Donts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-3">
                            <h5 className="font-extrabold text-emerald-800 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> DO THIS
                            </h5>
                            <ul className="space-y-1.5 text-[11px] font-semibold text-slate-700 list-disc list-inside">
                              <li>Identify customer type in first 2 minutes</li>
                              <li>Ask open questions: 'What are you working on?'</li>
                              <li>Let them talk — learn more when they speak</li>
                              <li>Confirm: 'So the main issue is X?'</li>
                            </ul>
                          </div>
                          <div className="bg-rose-50/40 border border-rose-100 rounded-lg p-3">
                            <h5 className="font-extrabold text-rose-800 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-2">
                              <XCircle className="w-4 h-4 text-rose-600" /> NEVER DO THIS
                            </h5>
                            <ul className="space-y-1.5 text-[11px] font-semibold text-slate-700 list-disc list-inside">
                              <li>Launch into pitch before knowing buyer context</li>
                              <li>Ask closed yes/no questions that shut down chat</li>
                              <li>Fill every silence with more product specs</li>
                              <li>Assume you know the problem without confirming</li>
                            </ul>
                          </div>
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(3, "Step 1 — Know the Customer", "Customer Understanding")}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="discover" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        04. Step 2 — Discover the Pain Point
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-4">
                        <p className="font-semibold text-slate-750">
                          Pain points are gold. Every purchase decision is driven by either moving toward a gain or away from a pain.
                          Find the pain, name it clearly, and show them you understand it better than they do.
                        </p>

                        <div className="border border-slate-100 rounded-lg overflow-x-auto scrollbar-none">
                          <Table className="text-[11px] min-w-[600px]">
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="font-bold py-2">Question to Ask</TableHead>
                                <TableHead className="font-bold py-2">Why You Ask It</TableHead>
                                <TableHead className="font-bold py-2">How to Follow Up</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="font-medium text-slate-700">
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">"What are you currently working on?"</TableCell>
                                <TableCell className="py-2">Opens conversation naturally; shows interest, not aggression.</TableCell>
                                <TableCell className="py-2 text-slate-500 font-semibold">"Tell me more about that — how far along are you?"</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">"What problem are you facing?"</TableCell>
                                <TableCell className="py-2">Invites them to articulate pain (most haven't done it clearly).</TableCell>
                                <TableCell className="py-2 text-slate-500 font-semibold">"When did this start becoming an issue for you?"</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">"What are you using right now?"</TableCell>
                                <TableCell className="py-2">Reveals current solution and its operational gaps.</TableCell>
                                <TableCell className="py-2 text-slate-500 font-semibold">"What does that not do well for you?"</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">"What's difficult in that?"</TableCell>
                                <TableCell className="py-2">Digs past surface answers into real root frustration.</TableCell>
                                <TableCell className="py-2 text-slate-500 font-semibold">"How much time or money does that cost you?"</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-[11px] text-indigo-900 uppercase">
                            <Info className="w-4 h-4 text-indigo-650" /> Reframing the Pain
                          </div>
                          <p className="text-[11px] font-medium leading-relaxed">
                            Once you understand their pain, reflect it back at a deeper level. Don't just repeat what they said — show them the true scale of the problem.
                          </p>
                          <div className="bg-white border rounded p-2.5 mt-2 flex flex-col gap-1">
                            <div className="text-[10px] font-bold text-rose-600"><span className="uppercase text-[9px] px-1 border border-rose-250 bg-rose-50 rounded mr-1">Customer Says</span> "I can't find the right component."</div>
                            <div className="text-[10px] font-bold text-emerald-700"><span className="uppercase text-[9px] px-1 border border-emerald-250 bg-emerald-50 rounded mr-1">You Reframe</span> "So the real issue isn't the component itself — it's the time delay and uncertainty that's slowing down your entire project?"</div>
                          </div>
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(4, "Step 2 — Discover the Pain Point", "Pain Discovery")}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="address" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        05. Step 3 — Address the Pain with Value
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-4">
                        <p className="font-semibold text-slate-750">
                          Never list features. Never dump information. Connect every single thing you say directly to the pain they just described.
                          Your pitch should feel like a solution to their specific problem — not a product presentation.
                        </p>

                        <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-xl p-3 space-y-2">
                          <h5 className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wider">The Pitch Formula Elements:</h5>
                          <ul className="space-y-2 text-[11px]">
                            <li><strong className="text-indigo-805">1. Connect:</strong> Reference exactly what they told you (e.g. <em>"Since you mentioned component delays are slowing you down..."</em>)</li>
                            <li><strong className="text-indigo-805">2. Problem:</strong> Name their pain clearly (e.g. <em>"...the real cost isn't the part itself — it's the delay in your build timeline."</em>)</li>
                            <li><strong className="text-indigo-805">3. Solution:</strong> Introduce your product as the direct answer (e.g. <em>"EZCirkit gives you everything in one place, delivered fast."</em>)</li>
                            <li><strong className="text-indigo-805">4. Outcome:</strong> Paint the future state they want (e.g. <em>"You finish your project on time, with no last-minute panic."</em>)</li>
                          </ul>
                          <p className="text-[10px] text-slate-500 font-semibold pt-1">
                            💡 You can customize and save your team's pitch template inside the <strong className="text-indigo-900">Cold Call & Pitch Templates</strong> tab.
                          </p>
                        </div>

                        <div className="border border-slate-100 rounded-lg overflow-x-auto scrollbar-none">
                          <Table className="text-[11px] min-w-[650px]">
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="font-bold py-2 w-12">Stage</TableHead>
                                <TableHead className="font-bold py-2">Goal</TableHead>
                                <TableHead className="font-bold py-2">What to Say</TableHead>
                                <TableHead className="font-bold py-2 text-rose-700">Warning Sign</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="font-medium text-slate-700">
                              <TableRow>
                                <TableCell className="font-bold py-2">1. Opening</TableCell>
                                <TableCell className="py-2">Build comfort, not urgency</TableCell>
                                <TableCell className="py-2 text-indigo-705">"Hi, what are you working on right now?"</TableCell>
                                <TableCell className="py-2 text-rose-600 font-semibold">Jumping straight into product features</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2">2. Understand</TableCell>
                                <TableCell className="py-2">Learn their world, identify gaps</TableCell>
                                <TableCell className="py-2">Ask open discovery questions. Take notes.</TableCell>
                                <TableCell className="py-2 text-rose-600 font-semibold">Talking more than listening (pitching too early)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2">3. Reframe</TableCell>
                                <TableCell className="py-2">Deepen awareness of the pain</TableCell>
                                <TableCell className="py-2 text-indigo-705">"So the real issue is not X — it's actually Y?"</TableCell>
                                <TableCell className="py-2 text-rose-600 font-semibold">Skipping straight to solution without agreement</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2">4. Value</TableCell>
                                <TableCell className="py-2">Connect solution to pain points</TableCell>
                                <TableCell className="py-2">"Since you're facing [pain], this helps you by [value]."</TableCell>
                                <TableCell className="py-2 text-rose-600 font-semibold">Feature-dumping instead of pain connecting</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2">5. Close</TableCell>
                                <TableCell className="py-2">Ask clearly for next steps</TableCell>
                                <TableCell className="py-2 text-indigo-705">"Does this solve what you're facing? Shall we proceed?"</TableCell>
                                <TableCell className="py-2 text-rose-600 font-semibold">Hoping they'll close themselves without being asked</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(5, "Step 3 — Address the Pain with Value", "Value Pitch")}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="yesno" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        06. Step 4a — What Happens on Yes or No
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-emerald-50/40 border border-emerald-150 rounded-xl p-3.5 space-y-2">
                            <h5 className="font-black text-emerald-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> THEY SAY YES — What to Do
                            </h5>
                            <p className="font-semibold text-slate-700">
                              Close immediately. Do not keep talking. Many salespeople talk themselves out of a closed deal by over-explaining after they already agreed.
                            </p>
                            <ul className="space-y-1 text-[10px] text-slate-550 list-decimal list-inside font-bold">
                              <li>Confirm the decision clearly</li>
                              <li>Move to logistics / next steps immediately</li>
                              <li>Stop selling. They already bought.</li>
                            </ul>
                            <div className="bg-white border border-emerald-100 rounded p-2 text-[10px] font-bold text-emerald-800 mt-2">
                              Script: "Great! Let's get this sorted for you right now."
                            </div>
                          </div>

                          <div className="bg-rose-50/30 border border-rose-150 rounded-xl p-3.5 space-y-2">
                            <h5 className="font-black text-rose-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                              <ShieldAlert className="w-4 h-4 text-rose-600" /> THEY SAY NO — What to Do
                            </h5>
                            <p className="font-semibold text-slate-700">
                              Do not stop. Ask what the reason is. "No" from a customer is not rejection — it is information. Find out which type of No it is:
                            </p>
                            <ul className="space-y-1 text-[10px] text-slate-550 list-disc list-inside font-bold">
                              <li>"Is it the price?" → ROI conversation</li>
                              <li>"Is it the timing?" → Urgency conversation</li>
                              <li>"Is it the fit?" → Understanding conversation</li>
                            </ul>
                            <div className="bg-white border border-rose-100 rounded p-2 text-[10px] font-bold text-rose-800 mt-2">
                              Script: "I appreciate that — can I ask what's the main reason?"
                            </div>
                          </div>
                        </div>

                        <div className="bg-indigo-50/35 border border-indigo-100 rounded-lg p-3">
                          <p className="font-semibold text-indigo-950 text-[11px]">
                            💡 Strategic Leverage:
                          </p>
                          <ul className="mt-1.5 space-y-1 text-[10px] text-indigo-900 font-medium">
                            <li>• <strong>If YES:</strong> Start onboarding or scheduling immediately to capture positive energy.</li>
                            <li>• <strong>If NO:</strong> Share a free tip, guide, or resource to build value without pressure. They will remember you when ready.</li>
                          </ul>
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(6, "Step 4a — What Happens on Yes or No", "Closing")}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="objections" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        07. Step 4b — Objection Handling System
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-4">
                        <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3.5 space-y-1">
                          <strong className="text-amber-900 text-[11px] uppercase tracking-wider block">🔑 KEY INSIGHT:</strong>
                          <p className="font-semibold text-amber-800">
                            Never accept rejection at face value. "No" is an objection that requires understanding and reframing.
                            Keep value over objection, always. A customer who feels genuinely helped will buy — or return later.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">The 4-Step Objection Process:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                              { step: '1. Listen Fully', desc: 'Let them finish completely. Do not interrupt. Nod and process.', no: 'Jumping in with counter-arguments' },
                              { step: '2. Identify Root', desc: 'Ask: "Is it price, timing, or fit?" Uncover the real blocker.', no: 'Answering only surface objections' },
                              { step: '3. Reframe', desc: 'Change how they see the problem. Show a new helpful angle.', no: 'Arguing or defending points' },
                              { step: '4. Re-present', desc: 'Return to their pain and reconnect the solution with new clarity.', no: 'Giving up or discounting price' }
                            ].map((o, idx) => (
                              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[11px] font-black text-indigo-700 block mb-1">{o.step}</span>
                                  <p className="text-[10px] text-slate-605 font-medium leading-normal">{o.desc}</p>
                                </div>
                                <div className="text-[8.5px] text-rose-600 font-semibold border-t border-slate-200/60 pt-1.5 mt-1.5">
                                  Don't: {o.no}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <p className="text-[10.5px] font-semibold text-slate-500 mt-2">
                          💡 Quick access to exact objection handling scripts is available in the <strong className="text-indigo-900">Cold Call & Pitch Templates</strong> tab.
                        </p>

                        {/* AI Step Helper */}
                        {renderAIStepSection(7, "Step 4b — Objection Handling System", "Objection Handling")}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="closing" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        08. Closing Strategies — How to Ask for the Sale
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-3">
                        <p className="font-semibold text-slate-700">
                          Many sales die because no one asked for the order. Ask clearly, confidently, and without apology. Select the close type that fits the situation:
                        </p>

                        <div className="border border-slate-100 rounded-lg overflow-x-auto scrollbar-none">
                          <Table className="text-[11px] min-w-[600px]">
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="font-bold py-2">Close Type</TableHead>
                                <TableHead className="font-bold py-2">When to Use It</TableHead>
                                <TableHead className="font-bold py-2">Exact Script to Use</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="font-medium text-slate-700">
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Soft Close</TableCell>
                                <TableCell className="py-2">Customer is engaged but hasn't committed</TableCell>
                                <TableCell className="py-2 font-bold text-slate-805">"Does this solve what you were dealing with? Would you like to try this?"</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Direct Close</TableCell>
                                <TableCell className="py-2">Customer has shown clear interest & agreement</TableCell>
                                <TableCell className="py-2 font-bold text-slate-805">"Let's get this sorted. Shall we proceed?"</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Urgency Close</TableCell>
                                <TableCell className="py-2">There is a real deadline, price rise, or limited availability</TableCell>
                                <TableCell className="py-2 font-bold text-slate-805">"We have limited stock right now — want me to reserve this for you?"</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Summary Close</TableCell>
                                <TableCell className="py-2">Customer seems uncertain — recap value points</TableCell>
                                <TableCell className="py-2 font-bold text-slate-805">"So to recap: you get X, Y, Z — solving exactly what you described. Ready to go?"</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Next Step Close</TableCell>
                                <TableCell className="py-2">For longer deals — keep them moving forward</TableCell>
                                <TableCell className="py-2 font-bold text-slate-805">"The next step is simple — let me send you a quote and we go from there."</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(8, "Closing Strategies — How to Ask for the Sale", "Closing")}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="followup" className="border border-slate-100 rounded-xl px-4 py-1 hover:bg-slate-50/50 transition-all">
                      <AccordionTrigger className="text-sm font-black text-slate-850 hover:no-underline">
                        09. Follow-Up System — Day 1 to Day 5
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 text-xs text-slate-600 space-y-3">
                        <p className="font-semibold text-slate-700">
                          Follow up systematically without looking desperate. Offer value at each touchpoint.
                        </p>
                        
                        <div className="border border-slate-100 rounded-lg overflow-x-auto scrollbar-none">
                          <Table className="text-[11px] min-w-[600px]">
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="font-bold py-2 w-16">Timing</TableHead>
                                <TableHead className="font-bold py-2 w-24">Touchpoint</TableHead>
                                <TableHead className="font-bold py-2">Purpose</TableHead>
                                <TableHead className="font-bold py-2">Example Message Track</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="font-medium text-slate-700">
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Day 1</TableCell>
                                <TableCell className="py-2">First Contact</TableCell>
                                <TableCell className="py-2">Open conversation, understand their need</TableCell>
                                <TableCell className="py-2 text-slate-600">"Hi, what are you currently working on?" (Interest check)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Day 2–3</TableCell>
                                <TableCell className="py-2">Reminder + Value</TableCell>
                                <TableCell className="py-2">Share something useful — tip, resource, insight</TableCell>
                                <TableCell className="py-2 text-slate-600">"Thought this might help you with [pain point they shared]..."</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-bold py-2 text-indigo-705">Day 5</TableCell>
                                <TableCell className="py-2">Decision Follow-Up</TableCell>
                                <TableCell className="py-2">Ask directly. Gentle urgency. Don't beg.</TableCell>
                                <TableCell className="py-2 text-slate-650 font-bold">"Wanted to check — does this solve what you were looking for?"</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        {/* AI Step Helper */}
                        {renderAIStepSection(9, "Follow-Up System — Day 1 to Day 5", "Follow-Up")}
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar: Core Principles & Reality Check */}
            <div className="space-y-6">
              
              {/* The 4 Core Principles Checklist */}
              <Card className="border-2 border-indigo-50 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b bg-indigo-50/5">
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-indigo-850 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-650" />
                    Syllabus Target Path
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs font-semibold text-slate-700">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                      <div>
                        <div className="font-bold text-slate-850">Know Customer</div>
                        <div className="text-[10px] text-slate-500 font-medium">Read context & buyer signal first.</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                      <div>
                        <div className="font-bold text-slate-850">Discover Pain</div>
                        <div className="text-[10px] text-slate-500 font-medium">Ask discovery questions to find root issues.</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                      <div>
                        <div className="font-bold text-slate-850">Address with Value</div>
                        <div className="text-[10px] text-slate-500 font-medium">Connect pitch outcome to customer pain.</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
                      <div>
                        <div className="font-bold text-slate-850">Resolve & Close</div>
                        <div className="text-[10px] text-slate-500 font-medium">Handle objections & ask for order clearly.</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reality Check Card */}
              <Card className="border-2 border-rose-100 bg-rose-50/10 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-rose-50/20">
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    THE FINAL REALITY CHECK
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs font-bold text-slate-705 leading-relaxed">
                  <div className="flex items-start gap-2 text-rose-700">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>If you talk more than your customer → You lose.</span>
                  </div>
                  <div className="flex items-start gap-2 text-rose-700">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>If you pitch without understanding → You lose.</span>
                  </div>
                  <div className="flex items-start gap-2 text-rose-700">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>If you avoid asking for the sale → You lose.</span>
                  </div>
                  <div className="flex items-start gap-2 text-rose-700">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>If you give up on the first No → You lose.</span>
                  </div>
                  <div className="text-[11px] text-slate-805 font-black border-t border-rose-100 pt-2 mt-3">
                    Sales is not luck. It is a repeatable system. Follow it.
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </TabsContent>

        <TabsContent value="scripts" className="focus-visible:outline-none animate-in fade-in duration-300">
          <div className="space-y-6 max-w-5xl mx-auto">

              {/* AI Value-Driven Script Generator */}
              <Card className="border-2 border-indigo-100 bg-indigo-50/10 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b bg-indigo-50/20 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-indigo-650">
                      <Sparkles className="w-5 h-5 animate-pulse text-indigo-600" />
                      <CardTitle className="text-base font-black text-slate-850">AI Value-Driven Script Generator</CardTitle>
                    </div>
                    <Badge className="bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 border-none">
                      Gemini 2.5 Flash
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Input your product details and target audience to instantly generate a custom Value-Driven cold calling script.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Product / Service Name</label>
                      <Input
                        value={aiProductName}
                        onChange={(e: any) => setAiProductName(e.target.value)}
                        placeholder="e.g. EZCirkit STEM Training Kit"
                        className="text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Target Audience</label>
                      <Input
                        value={aiTargetAudience}
                        onChange={(e: any) => setAiTargetAudience(e.target.value)}
                        placeholder="e.g. Academic lab mentors, high school principals"
                        className="text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Core Problem Solved</label>
                      <Input
                        value={aiProblemSolved}
                        onChange={(e: any) => setAiProblemSolved(e.target.value)}
                        placeholder="e.g. Components procurement delays and high shipping overheads"
                        className="text-xs font-semibold h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Buyer Archetype Focus</label>
                      <select
                        value={aiBuyerType}
                        onChange={(e: any) => setAiBuyerType(e.target.value as any)}
                        className="w-full text-xs font-semibold h-8 rounded-lg border border-slate-200 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="price">💰 Price-Focused (ROI, Cost Savings)</option>
                        <option value="quality">🏆 Quality-Focused (Specs, Performance)</option>
                        <option value="urgent">⚡ Urgent Buyer (Delivery Speed, Timelines)</option>
                        <option value="curious">🔍 Curious Learner (Education, Advisory)</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGenerateColdCall}
                    disabled={aiScriptLoading}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold h-9 text-xs rounded-lg shadow-sm border-none"
                  >
                    {aiScriptLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                        Generating Tailored Script...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 text-indigo-455" />
                        Generate B2B Cold Call Script
                      </>
                    )}
                  </Button>

                  {/* Generator Output Display */}
                  {aiGeneratedScript && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between items-center border-b pb-2">
                        <div className="text-[10px] uppercase font-black tracking-wider text-indigo-900">Generated Script Output:</div>
                        <Button
                          size="sm"
                          type="button"
                          onClick={handleApplyAIScript}
                          className="h-7 text-[10px] font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg px-3 border-none"
                        >
                          Use as Custom Pitch Formula
                        </Button>
                      </div>

                      {/* Display custom parts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-medium text-slate-700">
                        <div className="bg-white border rounded p-2.5 space-y-0.5">
                          <span className="text-[9px] uppercase font-black text-indigo-650">Part 1: Connect Hook</span>
                          <p>{aiGeneratedScript.hook}</p>
                        </div>
                        <div className="bg-white border rounded p-2.5 space-y-0.5">
                          <span className="text-[9px] uppercase font-black text-indigo-650">Part 2: Problem Definition</span>
                          <p>{aiGeneratedScript.problem}</p>
                        </div>
                        <div className="bg-white border rounded p-2.5 space-y-0.5">
                          <span className="text-[9px] uppercase font-black text-indigo-650">Part 3: Solution Value</span>
                          <p>{aiGeneratedScript.solution}</p>
                        </div>
                        <div className="bg-white border rounded p-2.5 space-y-0.5">
                          <span className="text-[9px] uppercase font-black text-indigo-650">Part 4: Desired Outcome</span>
                          <p>{aiGeneratedScript.outcome}</p>
                        </div>
                      </div>

                      {/* Complete Script Draft */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-black text-indigo-900">Draft Cold Call Flow:</span>
                          {copiedText === 'ai-draft' ? (
                            <Badge className="bg-emerald-500 text-white text-[9px] border-none py-0.5 px-2">Copied!</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(aiGeneratedScript.fullDraftScript, 'ai-draft')}
                              className="h-6 text-[9px] font-bold border border-indigo-200 bg-white"
                            >
                              <Copy className="w-3 h-3" /> Copy Full Script
                            </Button>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed italic bg-white p-3 border border-indigo-105 rounded-lg shadow-inner">
                          "{aiGeneratedScript.fullDraftScript}"
                        </p>
                      </div>

                      {/* Objection Strategy */}
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 space-y-1.5">
                        <span className="text-[10px] uppercase font-black text-rose-800 block">Objection Reframe Strategy:</span>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-line">
                          {aiGeneratedScript.objectionHandlingStrategy}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Pitch Formula Builder */}
              <Card className="border-2 border-indigo-50 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b bg-indigo-50/15 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-indigo-650">
                      <MessageSquareCode className="w-5 h-5" />
                      <CardTitle className="text-base font-black text-slate-850">Pitch Formula Builder</CardTitle>
                    </div>
                    {copiedText === 'pitch' ? (
                      <Badge className="bg-emerald-500 text-white border-none py-0.5 px-2">Copied!</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(compiledCustomPitch, 'pitch')}
                        className="h-7 text-[10px] font-bold gap-1 border"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Script
                      </Button>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Build your team's tailored pitch using the framework. Renders your live cold call script below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">1. Connect (Reference Pain Point)</label>
                      <Input
                        value={pitchInput.hook}
                        onChange={(e) => setPitchInput({ ...pitchInput, hook: e.target.value })}
                        placeholder='e.g., "Since you mentioned that component delays are slowing you down..."'
                        className="text-xs font-semibold h-9"
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">2. Problem (Name Pain & Real Cost)</label>
                      <Input
                        value={pitchInput.problem}
                        onChange={(e) => setPitchInput({ ...pitchInput, problem: e.target.value })}
                        placeholder='e.g., "...the real cost is the delay in your build timeline, not just the part cost."'
                        className="text-xs font-semibold h-9"
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">3. Solution (Direct Answer)</label>
                      <Input
                        value={pitchInput.solution}
                        onChange={(e) => setPitchInput({ ...pitchInput, solution: e.target.value })}
                        placeholder='e.g., "EZCirkit gives you everything in one place, guaranteed in stock and delivered fast."'
                        className="text-xs font-semibold h-9"
                        disabled={readOnly}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">4. Outcome (Paint Future Goal)</label>
                      <Input
                        value={pitchInput.outcome}
                        onChange={(e) => setPitchInput({ ...pitchInput, outcome: e.target.value })}
                        placeholder='e.g., "...so you finish your project on time, with zero last-minute panic."'
                        className="text-xs font-semibold h-9"
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  {/* Script Preview Box */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 mt-4">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Live Cold Call Script Preview:</div>
                    <p className="text-xs font-bold text-slate-805 leading-relaxed bg-white border border-slate-150 rounded-lg p-3 shadow-inner">
                      "{compiledCustomPitch}"
                    </p>
                  </div>

                  {!readOnly && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={handleSavePitch}
                        disabled={isSavingPitch}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs rounded-lg shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {isSavingPitch ? 'Saving...' : 'Save Pitch to Profile'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        {/* ================= TAB 4: MENTOR COACHING GUIDE ================= */}
        <TabsContent value="mentor" className="focus-visible:outline-none animate-in fade-in duration-300">
          <Card className="border-2 border-indigo-50 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b bg-indigo-50/10 pb-4">
              <div className="flex items-center gap-2 text-indigo-650">
                <Award className="w-5 h-5" />
                <CardTitle className="text-base font-black text-slate-800">Mentor Coaching Guide</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Mentor and coach your team effectively by identifying warning signs and asking structural questions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto border rounded-xl scrollbar-none">
                <Table className="text-xs font-medium text-slate-700 min-w-[600px]">
                  <TableHeader className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                    <TableRow>
                      <TableHead className="py-3 w-40">Area to Coach</TableHead>
                      <TableHead className="py-3">Signs Team Needs Help Here</TableHead>
                      <TableHead className="py-3">Coaching Question to Ask Your Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        area: 'Customer Understanding',
                        sign: 'Pitching before asking any questions. Rushing to list specifications.',
                        question: '"Before your next call, what do you know about this customer\'s project?"'
                      },
                      {
                        area: 'Pain Discovery',
                        sign: 'Shallow conversations. No clear operational frustration identified.',
                        question: '"What specifically did they say was frustrating them about their current process?"'
                      },
                      {
                        area: 'Value Pitch',
                        sign: 'Feature dumping. No connection to identified customer pain.',
                        question: '"How does what you just said help solve the specific problem they told you they had?"'
                      },
                      {
                        area: 'Objection Handling',
                        sign: 'Giving up on first No, or immediately discounting pricing.',
                        question: '"What type of No was it — price, timing, or fit? How did you find out?"'
                      },
                      {
                        area: 'Closing',
                        sign: 'Conversations that end without any clear decision or next step.',
                        question: '"Did you ask for the sale? What exactly did you say when you asked?"'
                      },
                      {
                        area: 'Follow-Up',
                        sign: 'No systematic follow-up process in place. Letting deals go cold.',
                        question: '"What did you send on Day 2 that added value for them? Did we build trust?"'
                      }
                    ].map((row, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold py-3 text-indigo-750">{row.area}</TableCell>
                        <TableCell className="py-3 text-rose-700 font-semibold">{row.sign}</TableCell>
                        <TableCell className="py-3 text-slate-800 font-bold bg-indigo-50/10 italic">
                          {row.question}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Full Screen Script Viewer Dialog */}
      <Dialog 
        open={!!selectedHistoryScript} 
        onOpenChange={(open) => !open && setSelectedHistoryScript(null)}
      >
        <DialogContent className="max-w-[95vw] w-full md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1200px] max-h-[90vh] overflow-y-auto p-0 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl scrollbar-none">
          {selectedHistoryScript && (
            <div className="flex flex-col">
              <DialogHeader className="p-6 border-b border-slate-850 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0 text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-indigo-900/60 text-indigo-300 border border-indigo-850/50 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      {selectedHistoryScript.buyerType}-focused Value Script
                    </Badge>
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      Generated on {selectedHistoryScript.timestamp}
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-black text-white tracking-tight pt-1">
                    {selectedHistoryScript.productName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
                    Target ICP: <span className="text-indigo-400 font-extrabold">{selectedHistoryScript.targetAudience}</span> &bull; Core Problem: <span className="text-slate-300 font-medium">{selectedHistoryScript.problemSolved}</span>
                  </DialogDescription>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center mr-8">
                  <Button
                    size="sm"
                    onClick={() => {
                      handleLoadScriptFromHistory(selectedHistoryScript);
                      setSelectedHistoryScript(null);
                    }}
                    className="h-9 px-4 text-xs font-black bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg border-none shadow-sm transition-all"
                  >
                    Load into Editor
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleCopy(selectedHistoryScript.script.fullDraftScript, `modal-copy-${selectedHistoryScript.id}`);
                    }}
                    className="h-9 px-4 text-xs font-black border-slate-700 bg-slate-850 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all"
                  >
                    {copiedText === `modal-copy-${selectedHistoryScript.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500 shrink-0" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        Copy Full Script
                      </>
                    )}
                  </Button>
                </div>
              </DialogHeader>

              {/* Workspace Content */}
              <div className="p-6 md:p-8 bg-slate-900">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Script Breakdown Blocks (col-span-7) */}
                  <div className="lg:col-span-7 space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800/80 pb-2">
                      Value Framework Breakdown
                    </h4>

                    {/* Hook Section */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-850 flex items-center justify-center text-[11px] font-black text-indigo-400 shrink-0">1</div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Step 1: The Hook (Attention)</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed pl-7">
                        {selectedHistoryScript.script.hook}
                      </p>
                    </div>

                    {/* Problem Section */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-950 border border-amber-850 flex items-center justify-center text-[11px] font-black text-amber-400 shrink-0">2</div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">Step 2: The Problem (Agitation)</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed pl-7">
                        {selectedHistoryScript.script.problem}
                      </p>
                    </div>

                    {/* Solution Section */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-850 flex items-center justify-center text-[11px] font-black text-emerald-400 shrink-0">3</div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Step 3: The Solution (Value)</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed pl-7">
                        {selectedHistoryScript.script.solution}
                      </p>
                    </div>

                    {/* Outcome Section */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-950 border border-blue-850 flex items-center justify-center text-[11px] font-black text-blue-400 shrink-0">4</div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">Step 4: The Outcome (Call to Action)</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed pl-7">
                        {selectedHistoryScript.script.outcome}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Full Draft Script & Objection Strategy (col-span-5) */}
                  <div className="lg:col-span-5 space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 mb-2 border-b border-slate-800/80 pb-2 flex items-center justify-between">
                        <span>Unified Delivery Script</span>
                        <Badge className="bg-slate-800 text-indigo-405 border border-slate-700 text-[9px] font-black uppercase px-2 py-0.5">30-Second Pitch</Badge>
                      </h4>
                      <div className="bg-gradient-to-br from-indigo-950/50 to-slate-950 border border-indigo-900/40 rounded-2xl p-5 shadow-inner">
                        <p className="text-sm md:text-base font-bold text-slate-100 leading-relaxed italic relative">
                          <span className="absolute -top-3 -left-2 text-4xl text-indigo-850 opacity-40 select-none">“</span>
                          {selectedHistoryScript.script.fullDraftScript}
                          <span className="absolute -bottom-6 -right-2 text-4xl text-indigo-850 opacity-40 select-none">”</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800/80 pb-2">
                        Tailored Objection Handling Strategy
                      </h4>
                      <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 border-b border-rose-900/30 pb-2">
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-[10px] uppercase font-black tracking-widest text-rose-450">Rebuttal Guide</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-300 leading-relaxed whitespace-pre-line">
                          {selectedHistoryScript.script.objectionHandlingStrategy}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Types Script Selector Dialog */}
      <Dialog open={isCustomerTypesOpen} onOpenChange={setIsCustomerTypesOpen}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white border rounded-2xl shadow-2xl scrollbar-none">
          <DialogHeader className="p-6 border-b bg-indigo-50/15 text-left">
            <DialogTitle className="text-base font-black text-slate-900">Customer Types Script Selector</DialogTitle>
            <DialogDescription className="text-xs">
              Select a buyer profile to view personalized signals, approaches, scripts, and rules.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            {/* Selector Tabs */}
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {[
                { id: 'price', label: '💰 Price-Focused' },
                { id: 'quality', label: '🏆 Quality-Focused' },
                { id: 'urgent', label: '⚡ Urgent Buyer' },
                { id: 'curious', label: '🔍 Curious Learner' }
              ].map(type => (
                <Button
                  key={type.id}
                  size="sm"
                  variant={selectedCustType === type.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCustType(type.id)}
                  className={`text-xs font-bold h-8 rounded-full ${
                    selectedCustType === type.id ? 'bg-indigo-600 hover:bg-indigo-750 text-white border-none' : ''
                  }`}
                >
                  {type.label}
                </Button>
              ))}
            </div>

            {/* Render active customer type info */}
            {(() => {
              const ct = customerTypes[selectedCustType as keyof typeof customerTypes];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-indigo-650">Signal / Buying Cue:</span>
                      <p className="text-xs font-semibold text-slate-700 bg-slate-50 border p-2.5 rounded-lg">{ct.signal}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-indigo-650">Strategic Approach:</span>
                      <p className="text-xs font-semibold text-slate-700 bg-slate-50 border p-2.5 rounded-lg">{ct.approach}</p>
                    </div>
                  </div>

                  {/* Copy Script Container */}
                  <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-black text-indigo-850">Exact Script to Use:</span>
                      {copiedText === `ct-${selectedCustType}` ? (
                        <Badge className="bg-emerald-500 text-white border-none py-0.5 px-2">Copied!</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(ct.script, `ct-${selectedCustType}`)}
                          className="h-6 text-[9px] font-bold border border-indigo-200/50 bg-white"
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 italic leading-relaxed">
                      {ct.script}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-emerald-50/20 border border-emerald-100 rounded-lg p-3">
                      <div className="text-[10px] font-black text-emerald-800 uppercase mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Do This
                      </div>
                      <ul className="space-y-1 text-slate-700 text-[10.5px] font-semibold list-disc list-inside">
                        {ct.dos.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div className="bg-rose-50/20 border border-rose-100 rounded-lg p-3">
                      <div className="text-[10px] font-black text-rose-800 uppercase mb-1.5 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" /> Never Do This
                      </div>
                      <ul className="space-y-1 text-slate-700 text-[10.5px] font-semibold list-disc list-inside">
                        {ct.donts.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Objection Handling Solver Dialog */}
      <Dialog open={isObjectionSolverOpen} onOpenChange={setIsObjectionSolverOpen}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white border rounded-2xl shadow-2xl scrollbar-none">
          <DialogHeader className="p-6 border-b bg-indigo-50/15 text-left">
            <div className="flex items-center gap-2 text-indigo-650">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              <DialogTitle className="text-base font-black text-slate-900">Objection Handling Solver</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Choose a typical customer objection to see the root cause, strategy, and reframe script instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Objection List (col-span-4) */}
              <div className="md:col-span-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                <span className="text-[10px] uppercase font-black text-slate-450 mb-1 hidden md:block">Select Objection:</span>
                {[
                  { id: 'expensive', label: '💸 "Too Expensive"' },
                  { id: 'timing', label: '⏳ "Not Needed Now"' },
                  { id: 'checking', label: '🔍 "Just Checking"' },
                  { id: 'competitor', label: '🤝 "Already Have a Solution"' },
                  { id: 'think', label: '🤔 "Let Me Think About It"' }
                ].map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObjection(obj.id)}
                    className={`text-left text-xs font-bold p-3 rounded-xl border transition-all shrink-0 whitespace-nowrap md:whitespace-normal ${
                      selectedObjection === obj.id 
                        ? 'bg-indigo-55 border-indigo-300 text-indigo-900 shadow-sm font-extrabold'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {obj.label}
                  </button>
                ))}
              </div>

              {/* Right Column: Objection Details Solver (col-span-8) */}
              <div className="md:col-span-8">
                {(() => {
                  const obj = objections[selectedObjection as keyof typeof objections];
                  return (
                    <div className="bg-slate-55 border border-slate-200/60 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
                      <h4 className="font-black text-xs text-indigo-950 uppercase border-b pb-2 flex items-center justify-between">
                        <span>{obj.title} solver</span>
                        <Badge className="bg-indigo-100 text-indigo-850 hover:bg-indigo-200 text-[8px] font-black uppercase">Objection</Badge>
                      </h4>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black text-slate-400">Root Cause:</span>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{obj.root}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black text-slate-400">Reframe Strategy:</span>
                        <p className="text-xs font-semibold text-slate-705 leading-relaxed">{obj.strategy}</p>
                      </div>

                      <div className="bg-white border rounded-xl p-4 space-y-3 mt-2 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] uppercase font-black text-indigo-800">Exact Script to Use:</span>
                          {copiedText === `obj-${selectedObjection}` ? (
                            <Badge className="bg-emerald-500 text-white border-none py-0.5 px-2">Copied!</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(obj.script, `obj-${selectedObjection}`)}
                              className="h-7 text-[9px] font-bold border bg-slate-50 hover:bg-slate-100"
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                            </Button>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-805 leading-relaxed italic">
                          {obj.script}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Script History Dialog */}
      <Dialog open={isScriptHistoryOpen} onOpenChange={setIsScriptHistoryOpen}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white border rounded-2xl shadow-2xl scrollbar-none">
          <DialogHeader className="p-6 border-b bg-indigo-50/15 flex flex-row items-center justify-between gap-3 text-left">
            <div>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-650" />
                Script History
              </DialogTitle>
              <DialogDescription className="text-xs">
                History of all generated Value-Driven cold calling scripts.
              </DialogDescription>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 text-[10px] font-black border-none px-2 py-0.5 rounded-full shrink-0">
              {scriptHistory.length} Saved
            </Badge>
          </DialogHeader>
          <div className="p-6">
            {scriptHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-10 h-10 text-indigo-200" />
                <div className="text-[11px] font-extrabold text-slate-500">No scripts generated yet</div>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-xs text-center">
                  Input details and click <strong className="text-indigo-600 font-black">"Generate"</strong> to create and auto-save a script!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
                {scriptHistory.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setSelectedHistoryScript(item);
                    }}
                    className="border rounded-xl transition-all duration-200 overflow-hidden bg-slate-50/40 hover:bg-slate-50 border-slate-200 group cursor-pointer"
                  >
                    <div className="p-3.5 flex items-start justify-between gap-2.5">
                      <div className="flex-1 text-left space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-indigo-100 text-indigo-805 text-[9px] font-black uppercase px-2 border-none h-4">
                            {item.buyerType}-focused
                          </Badge>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            {item.timestamp}
                          </span>
                        </div>
                        <h5 className="text-[11px] font-extrabold text-slate-850 leading-snug hover:text-indigo-650 transition-colors pt-0.5 flex items-center justify-between gap-2">
                          <span>{item.productName} for {item.targetAudience}</span>
                          <Maximize2 className="w-3.5 h-3.5 text-slate-450 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        </h5>
                      </div>
                      
                      <Button
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScriptItem(item.id);
                        }}
                        className="h-7 w-7 text-slate-405 hover:text-rose-600 hover:bg-rose-50 rounded-md shrink-0 border-none animate-in fade-in"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Blueprint History Dialog */}
      <Dialog open={isBlueprintHistoryOpen} onOpenChange={setIsBlueprintHistoryOpen}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white border rounded-2xl shadow-2xl scrollbar-none">
          <DialogHeader className="p-6 border-b bg-indigo-50/15 flex flex-row items-center justify-between gap-3 text-left">
            <div>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-650" />
                AI Blueprint History
              </DialogTitle>
              <DialogDescription className="text-xs">
                History of all your Map My Product blueprints.
              </DialogDescription>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 text-[10px] font-black border-none px-2 py-0.5 rounded-full shrink-0">
              {history.length} Saved
            </Badge>
          </DialogHeader>
          <div className="p-6">
            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-10 h-10 text-indigo-200" />
                <div className="text-[11px] font-extrabold text-slate-505">No blueprints saved yet</div>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-xs text-center">
                  Click <strong className="text-indigo-600 font-black">"Map My Product"</strong> inside the complete teaching syllabus steps to generate and auto-save a custom blueprint!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
                {history.map((item) => {
                  const isExpanded = expandedHistoryId === item.id;
                  return (
                    <div 
                      key={item.id} 
                      className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                        isExpanded 
                          ? 'bg-indigo-50/30 border-indigo-200 shadow-sm' 
                          : 'bg-slate-50/40 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Summary Header */}
                      <div className="p-3.5 flex items-start justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                          className="flex-1 text-left space-y-1"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-indigo-100 text-indigo-808 text-[9px] font-black uppercase px-2 border-none h-4">
                              Step {item.stepNumber}
                            </Badge>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">
                              {item.timestamp}
                            </span>
                          </div>
                          <h5 className="text-[11px] font-extrabold text-slate-850 leading-snug hover:text-indigo-605 transition-colors pt-0.5 flex items-center justify-between gap-2">
                            <span>{item.stepTitle.replace(/^\d+\.\s*/, '')}</span>
                            <Maximize2 className="w-3.5 h-3.5 text-slate-450 opacity-50 shrink-0" />
                          </h5>
                        </button>
                        
                        <Button
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistoryItem(item.id);
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md shrink-0 border-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Collapsible Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-indigo-100/60 pt-4 bg-white space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1 text-[11px] leading-relaxed text-slate-705 font-medium">
                            <span className="text-[9px] uppercase font-black text-indigo-905 block">B2B Strategy:</span>
                            <p className="whitespace-pre-line bg-slate-50/50 p-3 border rounded-xl">{item.explanation}</p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-black text-indigo-905 block">Context Dialogue Example:</span>
                            <p className="text-[11px] leading-relaxed text-slate-808 italic bg-amber-50/30 border border-amber-100/60 rounded-xl p-3 font-semibold font-mono">
                              "{item.concreteExample}"
                            </p>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-black text-slate-500 block">Action Checklist:</span>
                            <div className="space-y-1.5 flex flex-col">
                              {item.actionableTasks.map((task, idx) => (
                                <label key={idx} className="flex items-start gap-2 text-[10.5px] font-semibold text-slate-755 cursor-pointer select-none">
                                  <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3" />
                                  <span>{task}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
