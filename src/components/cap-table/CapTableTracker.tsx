'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { fmtPct } from '@/lib/utils/formatters';
import { Trash2, UserPlus, ShieldCheck, AlertCircle, Loader2, Info, Scale } from 'lucide-react';
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

const COLORS = ['#1f4fad', '#0fe4e8', '#16a34a', '#d946ef', '#f59e0b', '#ef4444'];

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

  const { data: shareholders, isLoading } = useCollection<Shareholder>(shareholdersRef);

  const totalAllocated = useMemo(() => (shareholders || []).reduce((acc, s) => acc + (s.ownershipPercentage || 0), 0), [shareholders]);
  const unallocated = useMemo(() => Math.max(0, 100 - totalAllocated), [totalAllocated]);

  const updateShareholder = (id: string, field: string, value: any) => {
    if (!shareholdersRef) return;
    const shareholderDoc = doc(shareholdersRef, id);
    updateDocumentNonBlocking(shareholderDoc, { [field]: value });
  };

  const addShareholder = () => {
    if (!shareholdersRef) return;
    addDocumentNonBlocking(shareholdersRef, {
      name: '',
      type: 'common',
      ownershipPercentage: 0,
      companyId: companyProfileId,
    });
  };

  const removeShareholder = (id: string) => {
    if (!shareholdersRef) return;
    const shareholderDoc = doc(shareholdersRef, id);
    deleteDocumentNonBlocking(shareholderDoc);
  };

  const chartData = useMemo(() => {
    const allocated = (shareholders || []).map((s, i) => ({
      name: s.name || 'Unnamed',
      value: s.ownershipPercentage || 0,
      color: COLORS[i % COLORS.length]
    })).filter(d => d.value > 0);

    if (unallocated > 0) {
      allocated.push({
        name: 'Unallocated',
        value: unallocated,
        color: '#e2e8f0' // Slate-200
      });
    }

    return allocated;
  }, [shareholders, unallocated]);

  const authorityChecks = useMemo(() => {
    const list = shareholders || [];
    const founderPct = list.filter(s => s.type === 'common' || s.type === 'dvr').reduce((a, b) => a + (b.ownershipPercentage || 0), 0);
    const prefPct = list.filter(s => s.type === 'preference').reduce((a, b) => a + (b.ownershipPercentage || 0), 0);
    const esopPct = list.filter(s => s.type === 'esop').reduce((a, b) => a + (b.ownershipPercentage || 0), 0);

    return [
      { 
        label: 'Founders hold majority (>50%)', 
        pass: founderPct > 50, 
        val: fmtPct(founderPct), 
        tip: 'Essential for operational control in a proprietorship or partnership.' 
      },
      { 
        label: 'Balanced allocation (Total 100%)', 
        pass: Math.abs(totalAllocated - 100) < 0.01, 
        val: fmtPct(totalAllocated), 
        tip: 'Ownership must sum to exactly 100% for legal and tax clarity.' 
      },
      { 
        label: 'ESOP / Future Pool (5-15%)', 
        pass: esopPct >= 5 && esopPct <= 15, 
        val: fmtPct(esopPct), 
        tip: 'Reserving stake for future partners or key team members.' 
      },
    ];
  }, [shareholders, totalAllocated]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-code text-xs">Syncing Stakeholders...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] opacity-70">Total Allocated Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline">{fmtPct(totalAllocated)}</div>
              <Progress value={totalAllocated} className="h-1.5 mt-4 bg-white/20" />
            </CardContent>
          </Card>
          <Card className={`border-none shadow-lg overflow-hidden ${unallocated > 0 ? 'bg-accent text-accent-foreground' : 'bg-green-600 text-white'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] opacity-70">Remaining (Unallocated)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline">{fmtPct(unallocated)}</div>
              <p className="text-[10px] mt-4 opacity-80 font-medium italic">
                {unallocated > 0 ? 'Assign this to partners or ESOP' : 'Cap table fully balanced'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Ownership Registry
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium">Manage stakeholder percentages for your proprietorship.</p>
            </div>
            <Button onClick={addShareholder} variant="outline" className="gap-2 font-body font-bold" suppressHydrationWarning>
              <UserPlus className="w-4 h-4" />
              Add Stakeholder
            </Button>
          </CardHeader>
          <CardContent>
            {(!shareholders || shareholders.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted bg-muted/5">
                <p className="text-muted-foreground italic mb-4">No stakeholders listed yet. Your company is currently 100% unallocated.</p>
                <Button onClick={addShareholder} variant="outline" size="sm" className="gap-2" suppressHydrationWarning>
                  <UserPlus className="w-3 h-3" />
                  Add First Stakeholder
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-widest text-muted-foreground">
                    <TableHead>Entity/Partner Name</TableHead>
                    <TableHead>
                      <HeaderWithInfo label="Interest Type" info="Common (standard), Preference, ESOP, or DVR (Super-voting)." />
                    </TableHead>
                    <TableHead>Ownership %</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shareholders.map((s) => {
                    return (
                      <TableRow key={s.id} className="group">
                        <TableCell>
                          <Input 
                            value={s.name || ''} 
                            placeholder="Full name or entity..."
                            className="h-9 border-none bg-transparent focus-visible:ring-1 font-medium" 
                            onChange={e => updateShareholder(s.id, 'name', e.target.value)}
                            suppressHydrationWarning
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={s.type} onValueChange={v => updateShareholder(s.id, 'type', v)}>
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
                                onChange={e => updateShareholder(s.id, 'ownershipPercentage', Number(e.target.value))}
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
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeShareholder(s.id)} suppressHydrationWarning>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {totalAllocated > 100 && (
              <Alert variant="destructive" className="mt-6 border-destructive/50 bg-destructive/5 animate-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Over-allocation Alert</AlertTitle>
                <AlertDescription className="text-xs">
                  Your total ownership exceeds 100% ({totalAllocated.toFixed(2)}%). Proprietorship equity cannot exceed 100% of the company value. Please reduce individual percentages.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Ownership Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
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
            ) : (
              <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/10 italic text-muted-foreground text-sm">
                Add partners to see distribution
              </div>
            )}
            <div className="mt-4 space-y-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-medium truncate max-w-[120px]">{d.name}</span>
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
