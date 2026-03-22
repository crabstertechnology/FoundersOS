'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDUSTRIES, STAGES } from '@/lib/constants';
import { fmtINR, fmtPct, fmtMult } from '@/lib/utils/formatters';
import { TrendingUp, Zap, Loader2, Coins, Scale, Info, ShieldAlert, CheckCircle2, Target, HeartPulse, Sparkles, ChevronDown } from 'lucide-react';
import { AIStrategicAdvisor } from '@/components/ai-advisor/AIStrategicAdvisor';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

interface ValuationCalculatorProps {
  userId: string;
  companyProfileId: string;
}

const DEFAULT_FORM_DATA = {
  overridePostMoney: null as number | null,
  companyName: '',
  stage: 'idea',
  industry: 'saas',
  mRevenue: 0,
  growthRate: 0,
  burnRate: 0,
  cashBank: 0,
  customers: 0,
  profitPerOrder: 0,
  ordersPerCustomer: 1,
  cac: 0,
  investment: 0,
  equityOffered: 0,
  esopPool: 10,
  advisorEquity: 0,
  coFounderEq: 0,
  prefMultiple: '1',
  prefType: 'nonparticipating'
};

function LabelWithInfo({ label, info, required }: { label: string; info: string; required?: boolean }) {
  return (
    <div className="space-y-1 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="mb-0 font-bold">{label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-primary cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs font-medium">
              {info}
            </TooltipContent>
          </Tooltip>
        </div>
        {required && (
          <Badge variant="outline" className="text-[8px] h-4 uppercase font-black tracking-tighter border-primary/20 bg-primary/5 text-primary">
            Required for Valuation
          </Badge>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight italic">{info}</p>
    </div>
  );
}

export function ValuationCalculator({ userId, companyProfileId }: ValuationCalculatorProps) {
  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profileDoc, isLoading: isDocLoading } = useDoc(profileRef);
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (profileDoc) {
      setFormData(prev => ({
        ...prev,
        ...profileDoc,
      }));
    }
  }, [profileDoc]);

  const handleChange = (field: string, val: any) => {
    const newData = { ...formData, [field]: val };
    setFormData(newData);

    const investment = newData.investment || 0;
    const equityOffered = newData.equityOffered || 0;
    // Prefer explicit override, otherwise calculate it
    const calculatedPostMoney = equityOffered > 0 ? (investment / (equityOffered / 100)) : 0;
    const finalPostMoney = newData.overridePostMoney !== null && newData.overridePostMoney !== undefined
      ? newData.overridePostMoney 
      : calculatedPostMoney;

    if (profileRef) {
      setDocumentNonBlocking(profileRef, {
        ...newData,
        latestValuation: finalPostMoney,
        postMoneyValuation: finalPostMoney, // Ensure saved under exact parameter
        id: companyProfileId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  };

  const results = useMemo(() => {
    const { 
      investment, equityOffered, mRevenue, burnRate, cashBank, cac, 
      profitPerOrder, ordersPerCustomer, esopPool, advisorEquity, coFounderEq, overridePostMoney 
    } = formData;
    
    const calculatedPostMoney = equityOffered > 0 ? (investment / (equityOffered / 100)) : 0;
    const postMoney = overridePostMoney !== null && overridePostMoney !== undefined ? overridePostMoney : calculatedPostMoney;
    const preMoney = Math.max(0, postMoney - investment);
    const arr = mRevenue * 12;
    const runway = burnRate > 0 ? cashBank / burnRate : (cashBank > 0 ? 999 : 0);
    
    const ltv = (profitPerOrder || 0) * (ordersPerCustomer || 1);
    const ltvCac = cac > 0 ? ltv / cac : 0;
    const profitPerCustomer = ltv - cac;
    const breakEvenCac = ltv;
    
    // Internal calculation (Independent of Cap Table collection)
    const founderEq = Math.max(0, 100 - (equityOffered + esopPool + advisorEquity + coFounderEq));

    return { 
      preMoney, postMoney, arr, runway, ltvCac, founderEq, 
      ltv, profitPerCustomer, breakEvenCac 
    };
  }, [formData]);

  const industryData = INDUSTRIES.find(i => i.value === formData.industry);
  const revValuation = results.arr * (industryData?.multiple || 0);

  if (isDocLoading && !profileDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-code text-xs">Connecting to FounderOS Database...</p>
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
              Startup Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <LabelWithInfo label="Company Name" info="The official registered name of your company." />
              <Input 
                placeholder="Enter startup name..."
                value={formData.companyName} 
                onChange={e => handleChange('companyName', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <LabelWithInfo label="Stage" info="Idea (Pre-revenue), MVP (Early traction), or Seed." />
                <Select value={formData.stage} onValueChange={v => handleChange('stage', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <LabelWithInfo label="Industry" info="SaaS usually gets higher multiples than E-commerce." />
                <Select value={formData.industry} onValueChange={v => handleChange('industry', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Coins className="w-3.5 h-3.5" />
              Unit Econ Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <LabelWithInfo label="Profit per Order" info="Gross Profit per transaction (Revenue - COGS)." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.profitPerOrder || ''} 
                    onChange={e => handleChange('profitPerOrder', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <LabelWithInfo label="Orders per Customer" info="Avg frequency over customer lifetime." />
                <Input 
                  type="number" 
                  value={formData.ordersPerCustomer || ''} 
                  onChange={e => handleChange('ordersPerCustomer', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <LabelWithInfo label="Avg CAC" info="Total S&M spend per new user acquired." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.cac || ''} 
                    onChange={e => handleChange('cac', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Scale className="w-3.5 h-3.5" />
              Deal Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <LabelWithInfo label="Pref Multiple" info="1x is standard. 2x is aggressive." />
              <Select value={formData.prefMultiple} onValueChange={v => handleChange('prefMultiple', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <LabelWithInfo label="Type" info="Non-participating is founder-friendly." />
              <Select value={formData.prefType} onValueChange={v => handleChange('prefType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nonparticipating">Non-Participating</SelectItem>
                  <SelectItem value="participating">Participating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border shadow-sm bg-white">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Founder Stake</div>
            <div className={`text-xl font-code font-bold ${results.founderEq < 25 ? 'text-destructive' : 'text-primary'}`}>
              {fmtPct(results.founderEq)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Simulated Stake</div>
          </Card>
          <Card className="p-4 border shadow-sm bg-white">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Runway</div>
            <div className={`text-xl font-code font-bold ${results.runway > 0 && results.runway < 6 ? 'text-destructive' : 'text-primary'}`}>
              {results.runway === 999 ? '∞' : Math.round(results.runway)} mo
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Until cash zero</div>
          </Card>
          <Card className="p-4 border shadow-sm bg-white">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">ARR</div>
            <div className="text-xl font-code font-bold text-primary">
              {fmtINR(results.arr)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Annual Run Rate</div>
          </Card>
          <Card className="p-4 border shadow-sm bg-white">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Burn Rate</div>
            <div className="text-xl font-code font-bold text-destructive">
              {fmtINR(formData.burnRate)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Net Monthly spend</div>
          </Card>
        </div>

        <Card className="border-2 border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground py-4">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <HeartPulse className="w-4 h-4" />
              Survival Dashboard: Unit Economics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-white rounded-xl border shadow-sm space-y-1">
                <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  LTV <Info className="w-3 h-3 opacity-50" />
                </div>
                <div className="text-xl font-code font-bold text-primary">{fmtINR(results.ltv)}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">Lifetime Value</div>
              </div>
              
              <div className="p-4 bg-white rounded-xl border shadow-sm space-y-1">
                <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  CAC <Info className="w-3 h-3 opacity-50" />
                </div>
                <div className="text-xl font-code font-bold text-primary">{fmtINR(formData.cac)}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">Acquisition Cost</div>
              </div>

              <div className={`p-4 rounded-xl border shadow-sm space-y-1 ${results.ltvCac >= 3 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  LTV / CAC <Target className="w-3 h-3 opacity-50" />
                </div>
                <div className={`text-xl font-code font-bold ${results.ltvCac >= 3 ? 'text-green-700' : 'text-amber-700'}`}>{fmtMult(results.ltvCac)}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">Efficiency (Target {'>'}3x)</div>
              </div>

              <div className={`p-4 rounded-xl border shadow-sm space-y-1 ${results.profitPerCustomer > 0 ? 'bg-white' : 'bg-red-50 border-red-200'}`}>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Profit / Customer</div>
                <div className={`text-xl font-code font-bold ${results.profitPerCustomer > 0 ? 'text-primary' : 'text-destructive'}`}>{fmtINR(results.profitPerCustomer)}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">LTV - CAC</div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-xl border shadow-sm space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Break-even CAC</div>
                <div className="text-xl font-code font-bold text-accent">{fmtINR(results.breakEvenCac)}</div>
                <div className="text-[9px] text-slate-400 leading-tight">Max spend allowed</div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-dashed">
              {results.ltvCac >= 3 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-xs font-medium text-green-800">Your unit economics are healthy. You are making Rs. {fmtINR(results.profitPerCustomer)} net profit for every customer acquired.</p>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-xs font-medium text-amber-800 leading-relaxed">Warning: Efficiency is below 3x. You are only earning {fmtMult(results.ltvCac)} back for every rupee spent on acquisition. Reduce CAC or increase retention.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

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
                Formula: Post-Money - Investment
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

        <Card className="shadow-sm border-2 border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Strategic Fundraising Inputs
            </CardTitle>
            <p className="text-xs text-muted-foreground">Fill these to calculate your Startup Valuation and Cap Table dilution.</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <LabelWithInfo required label="Investment Amount" info="The total capital being raised in this round." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-12 text-lg font-bold border-primary/20 focus-visible:ring-primary"
                    placeholder="e.g. 5000000"
                    value={formData.investment || ''} 
                    onChange={e => handleChange('investment', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <LabelWithInfo required label="Equity Offered %" info="Percentage of the company given to investors." />
                <div className="relative">
                  <Input 
                    type="number" 
                    className="h-12 text-lg font-bold border-primary/20 focus-visible:ring-primary pr-8"
                    placeholder="e.g. 10"
                    value={formData.equityOffered || ''} 
                    onChange={e => handleChange('equityOffered', Number(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <LabelWithInfo label="Explicit Post-Money Valuation (Optional)" info="Overrides Implied Math. Forces this specific exit value directly into the Exit Simulator." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7 h-12 text-lg font-bold border-primary/20 bg-primary/5 focus-visible:ring-primary"
                    placeholder="Leave blank to use math above..."
                    value={formData.overridePostMoney !== null && formData.overridePostMoney !== undefined ? formData.overridePostMoney : ''} 
                    onChange={e => handleChange('overridePostMoney', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <LabelWithInfo label="Monthly Revenue" info="Total income this month. Used for ARR." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.mRevenue || ''} 
                    onChange={e => handleChange('mRevenue', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <LabelWithInfo label="Monthly Burn" info="Net monthly cash out (Burn)." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.burnRate || ''} 
                    onChange={e => handleChange('burnRate', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <LabelWithInfo label="Cash in Bank" info="Current liquid reserves." />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code text-xs">₹</span>
                  <Input 
                    type="number" 
                    className="pl-7"
                    value={formData.cashBank || ''} 
                    onChange={e => handleChange('cashBank', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <LabelWithInfo label="ESOP Pool %" info="Shares reserved for future hires. Usually 10%." />
                <Input 
                  type="number" 
                  value={formData.esopPool || ''} 
                  onChange={e => handleChange('esopPool', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <LabelWithInfo label="Advisor Equity %" info="Mentors stake." />
                <Input 
                  type="number" 
                  value={formData.advisorEquity || ''} 
                  onChange={e => handleChange('advisorEquity', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <LabelWithInfo label="Co-Founder Equity %" info="Equity held by other co-founders." />
                <Input 
                  type="number" 
                  value={formData.coFounderEq || ''} 
                  onChange={e => handleChange('coFounderEq', Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <AIStrategicAdvisor 
          userId={userId}
          companyProfileId={companyProfileId}
          data={formData} 
          results={results} 
          industryData={industryData} 
        />
      </div>
    </div>
  );
}

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
