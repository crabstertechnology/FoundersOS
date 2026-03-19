'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { contextualStrategicAdvisor, ContextualStrategicAdvisorOutput } from '@/ai/flows/contextual-strategic-advisor';

interface AdvisorProps {
  data: any;
  results: any;
  industryData: any;
}

export function AIStrategicAdvisor({ data, results, industryData }: AdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<ContextualStrategicAdvisorOutput | null>(null);

  const getAIAdvice = async () => {
    setLoading(true);
    try {
      // Map local data to flow input schema
      const result = await contextualStrategicAdvisor({
        companyName: data.companyName,
        stage: data.stage as any,
        industry: data.industry as any,
        monthlyRevenue: data.mRevenue,
        monthlyGrowthRate: data.growthRate,
        monthlyBurnRate: data.burnRate,
        cashInBank: data.cashBank,
        totalCustomers: data.customers,
        avgCustomerLTV: data.ltv,
        customerAcquisitionCost: data.cac,
        investmentAmount: data.investment,
        equityOfferedToInvestor: data.equityOffered,
        esopPoolPercentage: data.esopPool,
        advisorEquityPercentage: data.advisorEquity,
        coFounderEquityPercentage: data.coFounderEq,
        preMoneyValuation: results.preMoney,
        postMoneyValuation: results.postMoney,
        revenueMultipleBasedValuation: results.arr * (industryData?.multiple || 0),
        berkusScoreValuation: 0,
        impliedRevenueMultiple: results.arr > 0 ? results.preMoney / results.arr : 0,
        currentFounderEquityPercentage: results.founderEq,
        runwayMonths: results.runway,
        ltvToCacRatio: results.ltvCac,
        cacPaybackMonths: data.mRevenue / Math.max(1, data.customers) > 0 ? data.cac / (data.mRevenue / Math.max(1, data.customers)) : 0,
        projectedAnnualRevenue12Months: results.arr * Math.pow(1 + data.growthRate / 100, 12),
        dilutionRounds: [],
        founderEquityAfterAllDilution: results.founderEq,
        exitPrice: 0,
        totalInvestorCapitalInvested: data.investment,
        liquidationPreferenceMultiple: 1,
        liquidationPreferenceType: 'nonparticipating',
        investorReceivesAtExit: 0,
        founderReceivesAtExit: 0,
        totalCapTablePercentage: 100,
        capTableAlerts: [],
        founderVotingMajorityCheck: results.founderEq > 50,
        investorPreferenceSharesHealth: 'healthy',
        singleInvestorDominanceHealth: 'healthy',
        esopPoolHealth: data.esopPool >= 5 && data.esopPool <= 15 ? 'healthy' : 'too_low',
        founderEquityHealthStatus: results.founderEq >= 40 ? 'healthy' : 'low',
      });
      setAdvice(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
            Get personalized, AI-driven strategic insights based on your current numbers and cap table health.
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={getAIAdvice} 
          disabled={loading}
          className="rounded-full px-8 font-bold gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analyzing Startup Data...' : 'Generate Strategic Advice'}
        </Button>
      </div>

      {advice && (
        <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5" />
              Strategic Advice Report
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <div className="prose prose-sm max-w-none">
              <p className="text-base font-body italic leading-relaxed text-muted-foreground">"{advice.summary}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold tracking-widest text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Key Strengths
                </div>
                <div className="space-y-2">
                  {advice.strengths.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
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
                  {advice.warnings.map((w, i) => (
                    <div key={i} className="flex gap-2 text-sm">
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
                {advice.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm font-bold">
                    <span className="bg-accent text-accent-foreground w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0">{i+1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}