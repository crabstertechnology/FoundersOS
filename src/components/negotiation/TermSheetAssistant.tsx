'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Gavel, Sparkles, Loader2, ShieldAlert, CheckCircle2, 
  MessageSquare, ChevronRight, Info, AlertTriangle, Lightbulb 
} from 'lucide-react';
import { termSheetNegotiationAssistant, TermSheetNegotiationAssistantOutput } from '@/ai/flows/term-sheet-negotiation-assistant-flow';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermSheetAssistantProps {
  userId: string;
  companyProfileId: string;
}

export function TermSheetAssistant({ userId, companyProfileId }: TermSheetAssistantProps) {
  const [inputClauses, setInputClauses] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TermSheetNegotiationAssistantOutput | null>(null);

  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  const handleAnalyze = async () => {
    if (!inputClauses.trim()) return;
    setLoading(true);
    try {
      const input = {
        companyName: profile?.companyName || 'My Startup',
        stage: profile?.stage || 'Seed Stage',
        industry: profile?.industry || 'SaaS',
        monthlyRevenue: profile?.mRevenue || 0,
        monthlyGrowthRate: profile?.growthRate || 0,
        monthlyBurnRate: profile?.burnRate || 0,
        cashInBank: profile?.cashBank || 0,
        totalCustomers: profile?.customers || 0,
        avgCustomerLTV: (profile?.profitPerOrder || 0) * (profile?.ordersPerCustomer || 1),
        customerAcquisitionCost: profile?.cac || 0,
        investmentAmount: profile?.investment || 0,
        equityOfferedToInvestorPercentage: profile?.equityOffered || 0,
        currentFounderEquityPercentage: 100 - (profile?.equityOffered || 0) - (profile?.esopPool || 0),
        esopPoolPercentage: profile?.esopPool || 10,
        advisorEquityPercentage: profile?.advisorEquity || 0,
        coFounderEquityPercentage: profile?.coFounderEq || 0,
        existingTermSheetClauses: inputClauses
      };

      const result = await termSheetNegotiationAssistant(input);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-2 border-primary/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              Analyze Deal Terms
            </CardTitle>
            <CardDescription>
              Paste specific clauses from your term sheet (e.g., Liquidation, Anti-dilution, Board seats).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Example: Investor proposes 2x participating liquidation preference and full-ratchet anti-dilution..."
              className="min-h-[250px] resize-none border-primary/20 focus-visible:ring-primary font-medium text-sm leading-relaxed"
              value={inputClauses}
              onChange={(e) => setInputClauses(e.target.value)}
            />
            <Button 
              className="w-full h-12 rounded-full font-bold text-base gap-2 shadow-lg hover:scale-[1.02] transition-transform"
              disabled={loading || !inputClauses.trim()}
              onClick={handleAnalyze}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? 'Analyzing Deal Strategy...' : 'Analyze Negotiation Strategy'}
            </Button>
            
            <div className="p-4 bg-muted/50 rounded-xl border border-dashed text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-primary mb-1 uppercase tracking-widest text-[9px]">
                <Info className="w-3 h-3" />
                Pro Tip
              </div>
              The AI uses your current Cap Table and Unit Economics to determine if the proposed terms are fair for your specific situation.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-8">
        {analysis ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <Card className="border-2 border-primary/20 bg-primary/5 overflow-hidden shadow-xl">
              <CardHeader className="bg-primary text-primary-foreground py-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Strategic Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-lg font-medium italic leading-relaxed text-foreground opacity-90">
                  "{analysis.overallAssessment}"
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6">
              {analysis.keyNegotiationPoints.map((point, idx) => (
                <Card key={idx} className="border-none shadow-md overflow-hidden bg-white group hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest px-3">
                        {point.clause}
                      </Badge>
                      <MessageSquare className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-green-600 tracking-widest">
                          <CheckCircle2 className="w-3 h-3" />
                          Founder Friendly Structure
                        </div>
                        <p className="text-sm font-medium leading-relaxed bg-green-50/50 p-3 rounded-lg border border-green-100 italic">
                          "{point.founderFriendlyRecommendation}"
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-red-600 tracking-widest">
                          <ShieldAlert className="w-3 h-3" />
                          Red Flags
                        </div>
                        <p className="text-sm font-medium leading-relaxed bg-red-50/50 p-3 rounded-lg border border-red-100">
                          {point.redFlagsToWatchOutFor}
                        </p>
                      </div>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-primary tracking-widest mb-3">
                        <Lightbulb className="w-3 h-3" />
                        Negotiation Strategy & Talking Points
                      </div>
                      <p className="text-sm leading-relaxed font-medium">
                        {point.negotiationStrategy}
                      </p>
                    </div>

                    {point.feedbackOnCurrentProposedTerms && (
                      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-700 tracking-widest mb-2">
                          <AlertTriangle className="w-3 h-3" />
                          Feedback on your specific terms
                        </div>
                        <p className="text-sm leading-relaxed italic opacity-80">
                          {point.feedbackOnCurrentProposedTerms}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-slate-900 text-white border-none shadow-2xl">
              <CardContent className="pt-8 space-y-4">
                <div className="flex items-center gap-2 text-accent font-black uppercase tracking-[0.2em] text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  General Negotiation Warnings
                </div>
                <p className="text-slate-300 leading-relaxed text-sm italic">
                  {analysis.generalWarnings}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 bg-muted/20 rounded-3xl border-2 border-dashed">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Gavel className="w-10 h-10 text-muted-foreground opacity-20" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-muted-foreground">No Analysis Yet</h3>
              <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
                Paste your term sheet clauses in the sidebar to get a strategic breakdown.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
