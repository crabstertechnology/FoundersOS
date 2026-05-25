
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Loader2, ShieldAlert, CheckCircle2, ChevronRight, 
  History, Calendar, Trash2, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { contextualStrategicAdvisor, ContextualStrategicAdvisorOutput } from '@/ai/flows/contextual-strategic-advisor';
import { 
  useFirestore, useCollection, useMemoFirebase, 
  addDocumentNonBlocking, deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { fmtINR } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdvisorProps {
  userId: string;
  companyProfileId: string;
  data: any;
  results: any;
  industryData: any;
  readOnly?: boolean;
}

export function AIStrategicAdvisor({ userId, companyProfileId, data, results, industryData, readOnly }: AdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const firestore = useFirestore();
  
  const reportsRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'strategicReports');
  }, [firestore, userId, companyProfileId]);

  const reportsQuery = useMemoFirebase(() => {
    if (!reportsRef) return null;
    return query(reportsRef, orderBy('createdAt', 'desc'));
  }, [reportsRef]);

  const { data: reports, isLoading: isReportsLoading } = useCollection(reportsQuery);

  const getAIAdvice = async () => {
    if (readOnly) return;
    setLoading(true);
    try {
      const input = {
        companyName: data.companyName || 'Unnamed Startup',
        stage: data.stage as any,
        industry: data.industry as any,
        monthlyRevenue: data.mRevenue || 0,
        monthlyGrowthRate: data.growthRate || 0,
        monthlyBurnRate: data.burnRate || 0,
        cashInBank: data.cashBank || 0,
        totalCustomers: data.customers || 0,
        avgCustomerLTV: results.ltv || 0,
        customerAcquisitionCost: data.cac || 0,
        investmentAmount: data.investment || 0,
        equityOfferedToInvestor: data.equityOffered || 0,
        esopPoolPercentage: data.esopPool || 0,
        advisorEquityPercentage: data.advisorEquity || 0,
        coFounderEquityPercentage: data.coFounderEq || 0,
        preMoneyValuation: results.preMoney || 0,
        postMoneyValuation: results.postMoney || 0,
        revenueMultipleBasedValuation: results.arr * (industryData?.multiple || 0),
        berkusScoreValuation: 0,
        impliedRevenueMultiple: results.arr > 0 ? results.preMoney / results.arr : 0,
        currentFounderEquityPercentage: results.founderEq || 0,
        runwayMonths: results.runway || 0,
        ltvToCacRatio: results.ltvCac || 0,
        cacPaybackMonths: data.mRevenue / Math.max(1, data.customers) > 0 ? data.cac / (data.mRevenue / Math.max(1, data.customers)) : 0,
        projectedAnnualRevenue12Months: results.arr * Math.pow(1 + data.growthRate / 100, 12),
        dilutionRounds: [],
        founderEquityAfterAllDilution: results.founderEq || 0,
        exitPrice: 0,
        totalInvestorCapitalInvested: data.investment || 0,
        liquidationPreferenceMultiple: 1,
        liquidationPreferenceType: 'nonparticipating' as const,
        investorReceivesAtExit: 0,
        founderReceivesAtExit: 0,
        totalCapTablePercentage: 100,
        capTableAlerts: [],
        founderVotingMajorityCheck: (results.founderEq || 0) > 50,
        investorPreferenceSharesHealth: 'healthy' as const,
        singleInvestorDominanceHealth: 'healthy' as const,
        esopPoolHealth: (data.esopPool >= 5 && data.esopPool <= 15) ? 'healthy' as const : 'too_low' as const,
        founderEquityHealthStatus: (results.founderEq >= 40) ? 'healthy' as const : 'low' as const,
      };

      const result = await contextualStrategicAdvisor(input);
      
      if (reportsRef) {
        addDocumentNonBlocking(reportsRef, {
          companyId: companyProfileId,
          createdAt: serverTimestamp(),
          inputSnapshot: input,
          advice: result
        });
      }
      
      setActiveReport({ advice: result, createdAt: { seconds: Date.now() / 1000 } });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    if (!reportsRef) return;
    deleteDocumentNonBlocking(doc(reportsRef, reportId));
    if (activeReport?.id === reportId) setActiveReport(null);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 mt-12">
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-primary/30 rounded-2xl bg-primary/5 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            FounderOS Strategic Advisor
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Generate persistent, AI-driven reports. Every analysis is saved to your startup's permanent history.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button 
            size="lg" 
            onClick={getAIAdvice} 
            disabled={loading || readOnly}
            className="rounded-full px-8 font-bold gap-2 shadow-lg hover:scale-105 transition-transform"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Analyzing Startup Data...' : 'Generate New Report'}
          </Button>

          {reports && reports.length > 0 && (
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-full gap-2 border-primary/20"
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Hide History' : `History (${reports.length})`}
            </Button>
          )}
        </div>
      </div>

      {showHistory && reports && reports.length > 0 && (
        <Card className="border-none shadow-md bg-muted/10 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Report History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px]">
              <div className="divide-y">
                {reports.map((report) => (
                  <div 
                    key={report.id}
                    onClick={() => setActiveReport(report)}
                    className={`p-4 flex items-center justify-between cursor-pointer hover:bg-white transition-colors group ${activeReport?.id === report.id ? 'bg-white border-l-4 border-primary' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Strategic Analysis</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                          {formatDate(report.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[9px] uppercase font-bold bg-white">
                        {report.inputSnapshot?.stage}
                      </Badge>
                      {!readOnly && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteReport(report.id, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeReport && (
        <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5" />
                Strategic Advice Report
              </CardTitle>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                Generated {formatDate(activeReport.createdAt)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <div className="prose prose-sm max-w-none">
              <p className="text-base font-body italic leading-relaxed text-muted-foreground">"{activeReport.advice.summary}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold tracking-widest text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Key Strengths
                </div>
                <div className="space-y-2">
                  {activeReport.advice.strengths.map((s: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm leading-relaxed">
                      <ChevronRight className="w-3 h-3 mt-1 text-green-500 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold tracking-widest text-red-600 flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3" />
                  Critical Warnings
                </div>
                <div className="space-y-2">
                  {activeReport.advice.warnings.map((w: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm leading-relaxed">
                      <ChevronRight className="w-3 h-3 mt-1 text-red-500 shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-6 rounded-xl border-t-4 border-accent">
              <div className="text-[10px] uppercase font-bold tracking-widest text-accent-foreground mb-4">Recommended Next Steps</div>
              <ul className="space-y-3">
                {activeReport.advice.recommendations.map((r: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm font-bold">
                    <span className="bg-accent text-accent-foreground w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-black">{i+1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {activeReport.inputSnapshot && (
              <div className="pt-4 border-t border-dashed">
                <Accordion type="single" collapsible>
                  <AccordionItem value="snapshot" className="border-none">
                    <AccordionTrigger className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:no-underline py-0">
                      View Data Snapshot for this Report
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-white rounded-lg border text-center">
                          <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Valuation</div>
                          <div className="text-xs font-bold">{fmtINR(activeReport.inputSnapshot.preMoneyValuation)}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border text-center">
                          <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Burn</div>
                          <div className="text-xs font-bold">{fmtINR(activeReport.inputSnapshot.monthlyBurnRate)}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border text-center">
                          <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1">LTV/CAC</div>
                          <div className="text-xs font-bold">{(activeReport.inputSnapshot.ltvToCacRatio || 0).toFixed(1)}x</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border text-center">
                          <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Stake</div>
                          <div className="text-xs font-bold">{(activeReport.inputSnapshot.currentFounderEquityPercentage || 0).toFixed(1)}%</div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Minimal Accordion pieces for the Snapshot
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;
const AccordionItem = AccordionPrimitive.Item;
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
