'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { fmtPct } from '@/lib/utils/formatters';
import { Trash2, UserPlus, ShieldCheck, AlertCircle, Loader2, Info, Scale, User } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CapTableTrackerProps {
  userId: string;
  companyProfileId: string;
}

interface Shareholder {
  id: string;
  name: string;
  type: 'common' | 'preference' | 'esop' | 'dvr';
  ownershipPercentage: number;
  companyId: string;
}

const COLORS = ['#0fe4e8', '#16a34a', '#d946ef', '#f59e0b', '#ef4444', '#1f4fad'];
const FOUNDER_COLOR = '#1f4fad'; // Deep Primary Blue

function HeaderWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-primary cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[150px] text-[10px] font-medium">
            {info}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-[8px] normal-case font-normal text-muted-foreground italic leading-none">{info}</p>
    </div>
  );
}

export function CapTableTracker({ userId, companyProfileId }: CapTableTrackerProps) {
  const firestore = useFirestore();
  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  const { data: stakeholders, isLoading } = useCollection<Shareholder>(shareholdersRef);

  // Calculate total given to others
  const totalPartnerEquity = useMemo(() => (stakeholders || []).reduce((acc, s) => acc + (s.ownershipPercentage || 0), 0), [stakeholders]);
  
  // Sasitharan's share is the remainder of 100%
  const founderShare = useMemo(() => Math.max(0, 100 - totalPartnerEquity), [totalPartnerEquity]);

  const updateStakeholder = (id: string, field: string, value: any) => {
    if (!shareholdersRef) return;
    const stakeholderDoc = doc(shareholdersRef, id);
    updateDocumentNonBlocking(stakeholderDoc, { [field]: value });
  };

  const addStakeholder = () => {
    if (!shareholdersRef) return;
    addDocumentNonBlocking(shareholdersRef, {
      name: '',
      type: 'common',
      ownershipPercentage: 0,
      companyId: companyProfileId,
    });
  };

  const removeStakeholder = (id: string) => {
    if (!shareholdersRef) return;
    const stakeholderDoc = doc(shareholdersRef, id);
    deleteDocumentNonBlocking(stakeholderDoc);
  };

  const chartData = useMemo(() => {
    const data = [];
    
    // Always include Sasitharan
    data.push({
      name: 'Sasitharan (Founder)',
      value: founderShare,
      color: FOUNDER_COLOR
    });

    // Add other stakeholders
    if (stakeholders) {
      stakeholders.forEach((s, i) => {
        if ((s.ownershipPercentage || 0) > 0) {
          data.push({
            name: s.name || 'Unnamed Partner',
            value: s.ownershipPercentage || 0,
            color: COLORS[i % COLORS.length]
          });
        }
      });
    }

    return data;
  }, [stakeholders, founderShare]);

  const authorityChecks = useMemo(() => {
    return [
      { 
        label: 'Founder Majority (>50%)', 
        pass: founderShare > 50, 
        val: fmtPct(founderShare), 
        tip: 'Critical for maintaining absolute control over your proprietorship.' 
      },
      { 
        label: 'Total Distribution (100%)', 
        pass: Math.abs((founderShare + totalPartnerEquity) - 100) < 0.01, 
        val: fmtPct(founderShare + totalPartnerEquity), 
        tip: 'Proprietorship equity must sum to exactly 100%.' 
      },
      { 
        label: 'Partner Allocation (<40%)', 
        pass: totalPartnerEquity < 40, 
        val: fmtPct(totalPartnerEquity), 
        tip: 'High dilution at early stages can impact future fundraising leverage.' 
      },
    ];
  }, [founderShare, totalPartnerEquity]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-code text-xs">Loading Cap Table Registry...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] opacity-70 flex items-center gap-2">
                <User className="w-3 h-3" />
                Sasitharan (Founder Share)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline">{fmtPct(founderShare)}</div>
              <p className="text-[10px] mt-2 opacity-80 font-medium">Primary ownership after partner deduction</p>
              <Progress value={founderShare} className="h-1.5 mt-4 bg-white/20" />
            </CardContent>
          </Card>
          <Card className={`border-none shadow-lg overflow-hidden ${totalPartnerEquity > 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] opacity-70">Allocated to Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline">{fmtPct(totalPartnerEquity)}</div>
              <p className="text-[10px] mt-2 opacity-80 font-medium italic">
                {totalPartnerEquity > 0 ? 'Equity shared with stakeholders' : 'No partners added yet'}
              </p>
              <Progress value={totalPartnerEquity} className="h-1.5 mt-4 bg-black/10" />
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Partner & Stakeholder Registry
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium">Distribute equity from the Founder's 100% stake.</p>
            </div>
            <Button onClick={addStakeholder} variant="outline" className="gap-2 font-body font-bold" suppressHydrationWarning>
              <UserPlus className="w-4 h-4" />
              Add Partner
            </Button>
          </CardHeader>
          <CardContent>
            {(!stakeholders || stakeholders.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted bg-muted/5">
                <p className="text-muted-foreground italic mb-4">Your company is currently 100% owned by Sasitharan.</p>
                <Button onClick={addStakeholder} variant="outline" size="sm" className="gap-2" suppressHydrationWarning>
                  <UserPlus className="w-3 h-3" />
                  Add First Partner
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-widest text-muted-foreground">
                    <TableHead>Partner/Entity Name</TableHead>
                    <TableHead>
                      <HeaderWithInfo label="Interest Type" info="Common, Preference, ESOP, or DVR (Super-voting)." />
                    </TableHead>
                    <TableHead>Ownership %</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stakeholders.map((s) => {
                    return (
                      <TableRow key={s.id} className="group">
                        <TableCell>
                          <Input 
                            value={s.name || ''} 
                            placeholder="Full name or entity..."
                            className="h-9 border-none bg-transparent focus-visible:ring-1 font-medium" 
                            onChange={e => updateStakeholder(s.id, 'name', e.target.value)}
                            suppressHydrationWarning
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={s.type} onValueChange={v => updateStakeholder(s.id, 'type', v)}>
                            <SelectTrigger className="h-9 w-36 font-code text-xs bg-muted/30" suppressHydrationWarning><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="common">Common Equity</SelectItem>
                              <SelectItem value="preference">Preference Stakes</SelectItem>
                              <SelectItem value="esop">ESOP Reserved</SelectItem>
                              <SelectItem value="dvr">DVR (Super Voting)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative w-32">
                              <Input 
                                type="number" 
                                value={s.ownershipPercentage || ''} 
                                className="h-9 font-code pr-8 text-right font-bold" 
                                onChange={e => updateStakeholder(s.id, 'ownershipPercentage', Number(e.target.value))}
                                suppressHydrationWarning
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">%</span>
                            </div>
                            <div className="flex-1 min-w-[60px]">
                              <Progress value={s.ownershipPercentage} className="h-1.5" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeStakeholder(s.id)} suppressHydrationWarning>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {totalPartnerEquity > 100 && (
              <Alert variant="destructive" className="mt-6 border-destructive/50 bg-destructive/5 animate-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Over-allocation Alert</AlertTitle>
                <AlertDescription className="text-xs">
                  Partner equity exceeds 100% ({totalPartnerEquity.toFixed(2)}%). Sasitharan's share is currently 0%. Please adjust partner percentages.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Ownership Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(val: number) => [`${val.toFixed(1)}%`, 'Ownership']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className={`font-medium truncate max-w-[120px] ${d.name.includes('Sasitharan') ? 'font-bold text-primary' : ''}`}>
                      {d.name}
                    </span>
                  </div>
                  <span className="font-code font-bold">{d.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Authority Health Checks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {authorityChecks.map((check, idx) => (
              <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${check.pass ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                {check.pass ? <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-bold ${check.pass ? 'text-green-800' : 'text-red-800'}`}>{check.label}</div>
                    <div className="font-code text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border">{check.val}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{check.tip}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
