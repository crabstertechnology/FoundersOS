'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDUSTRIES, STAGES } from '@/lib/constants';
import { fmtINR, fmtPct, fmtMult } from '@/lib/utils/formatters';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { AIStrategicAdvisor } from '@/components/ai-advisor/AIStrategicAdvisor';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';

interface ValuationCalculatorProps {
  userId: string;
  companyProfileId: string;
}

const DEFAULT_FORM_DATA = {
  companyName: '',
  stage: 'idea',
  industry: 'saas',
  mRevenue: 0,
  growthRate: 0,
  burnRate: 0,
  cashBank: 0,
  customers: 0,
  ltv: 0,
  cac: 0,
  investment: 0,
  equityOffered: 0,
  esopPool: 10,
  advisorEquity: 0,
  coFounderEq: 0,
};

export function ValuationCalculator({ userId, companyProfileId }: ValuationCalculatorProps) {
  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profileDoc, isLoading: isDocLoading } = useDoc(profileRef);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  // Sync Firestore data to local state on initial load
  useEffect(() => {
    if (profileDoc) {
      setFormData({
        ...DEFAULT_FORM_DATA,
        ...profileDoc,
      });
    }
  }, [profileDoc]);

  const handleChange = (field: string, val: any) => {
    const newData = { ...formData, [field]: val };
    setFormData(newData);

    if (profileRef) {
      setDocumentNonBlocking(profileRef, {
        ...newData,
        id: companyProfileId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  };

  const results = useMemo(() => {
    const { investment, equityOffered, esopPool, advisorEquity, coFounderEq, mRevenue, burnRate, cashBank, cac, ltv } = formData;
    
    const preMoney = equityOffered > 0 ? (investment / (equityOffered / 100)) - investment : 0;
    const postMoney = preMoney + investment;
    const arr = mRevenue * 12;
    const runway = burnRate > 0 ? cashBank / burnRate : (cashBank > 0 ? 999 : 0);
    const ltvCac = cac > 0 ? ltv / cac : 0;
    
    const totalEquityTaken = equityOffered + esopPool + advisorEquity + coFounderEq;
    const founderEq = Math.max(0, 100 - totalEquityTaken);

    return { preMoney, postMoney, arr, runway, ltvCac, founderEq };
  }, [formData]);

  const industryData = INDUSTRIES.find(i => i.value === formData.industry);
  const revValuation = results.arr * (industryData?.multiple || 0);

  if (isDocLoading && !profileDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-code text-xs">Loading startup profile...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Core Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                placeholder="Enter startup name..."
                value={formData.companyName} 
                onChange={e => handleChange('companyName', e.target.value)} 
                suppressHydrationWarning
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={formData.stage} onValueChange={v => handleChange('stage', v)}>
                  <SelectTrigger suppressHydrationWarning><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={formData.industry} onValueChange={v => handleChange('industry', v)}>
                  <SelectTrigger suppressHydrationWarning><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Revenue</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.mRevenue || ''} 
                    onChange={e => handleChange('mRevenue', Number(e.target.value))} 
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Growth MoM (%)</Label>
                <Input 
                  type="number" 
                  value={formData.growthRate || ''} 
                  onChange={e => handleChange('growthRate', Number(e.target.value))} 
                  suppressHydrationWarning
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Burn</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.burnRate || ''} 
                    onChange={e => handleChange('burnRate', Number(e.target.value))} 
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cash in Bank</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.cashBank || ''} 
                    onChange={e => handleChange('cashBank', Number(e.target.value))} 
                    suppressHydrationWarning
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Investment Round
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount Seeking</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.investment || ''} 
                    onChange={e => handleChange('investment', Number(e.target.value))} 
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Equity Offered (%)</Label>
                <Input 
                  type="number" 
                  value={formData.equityOffered || ''} 
                  onChange={e => handleChange('equityOffered', Number(e.target.value))} 
                  suppressHydrationWarning
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-primary text-primary-foreground shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest opacity-80 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                Implied Pre-Money Valuation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-code font-bold">{fmtINR(results.preMoney)}</div>
              <p className="text-xs mt-2 opacity-80 font-mono">
                Formula: {fmtINR(formData.investment || 0)} ÷ {formData.equityOffered || 0}% - {fmtINR(formData.investment || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-accent text-accent-foreground shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest opacity-80 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Revenue Multiplier ({industryData?.multiple}x)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-code font-bold">{fmtINR(revValuation)}</div>
              <p className="text-xs mt-2 opacity-80 font-mono">
                Based on {industryData?.label} market average
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border shadow-sm">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Your Equity</div>
            <div className={`text-xl font-code font-bold ${results.founderEq < 25 ? 'text-destructive' : 'text-primary'}`}>
              {fmtPct(results.founderEq)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Primary Founder</div>
          </Card>
          <Card className="p-4 border shadow-sm">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Runway</div>
            <div className={`text-xl font-code font-bold ${results.runway > 0 && results.runway < 6 ? 'text-destructive' : 'text-primary'}`}>
              {results.runway === 999 ? '∞' : Math.round(results.runway)} mo
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Until cash zero</div>
          </Card>
          <Card className="p-4 border shadow-sm">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">LTV:CAC</div>
            <div className={`text-xl font-code font-bold ${results.ltvCac > 0 && results.ltvCac < 3 ? 'text-amber-600' : 'text-green-600'}`}>
              {fmtMult(results.ltvCac)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Target ≥ 3x</div>
          </Card>
          <Card className="p-4 border shadow-sm">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">ARR</div>
            <div className="text-xl font-code font-bold text-primary">
              {fmtINR(results.arr)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Annual Run Rate</div>
          </Card>
        </div>

        <div className="space-y-4">
          {results.runway > 0 && results.runway < 6 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Runway Alert</AlertTitle>
              <AlertDescription>
                You have less than 6 months of cash left. Start fundraising or cut burn immediately.
              </AlertDescription>
            </Alert>
          )}
          {formData.equityOffered > 25 && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>High Dilution Warning</AlertTitle>
              <AlertDescription>
                Giving away {formData.equityOffered}% in one round is high. Indian seed standards are typically 10-20%.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AIStrategicAdvisor data={formData} results={results} industryData={industryData} />
      </div>
    </div>
  );
}
