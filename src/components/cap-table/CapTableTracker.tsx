
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { fmtPct } from '@/lib/utils/formatters';
import { Trash2, UserPlus, ShieldCheck, AlertCircle, Loader2, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

  const chartData = useMemo(() => (shareholders || []).map((s, i) => ({
    name: s.name || 'Unnamed',
    value: s.ownershipPercentage || 0,
    color: COLORS[i % COLORS.length]
  })).filter(d => d.value > 0), [shareholders]);

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
        tip: 'Essential for operational control and blocking hostile takeovers.' 
      },
      { 
        label: 'Preference stakes below 40%', 
        pass: prefPct < 40, 
        val: fmtPct(prefPct), 
        tip: 'Protects founders from excessive investor leverage in small exits.' 
      },
      { 
        label: 'ESOP pool healthy (5-15%)', 
        pass: esopPct >= 5 && esopPct <= 15, 
        val: fmtPct(esopPct), 
        tip: 'Critical for future hiring and talent retention.' 
      },
    ];
  }, [shareholders]);

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
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Ownership Structure</CardTitle>
              <p className="text-sm text-muted-foreground font-code">Total Allocated: {totalAllocated.toFixed(2)}%</p>
            </div>
            <Button onClick={addShareholder} variant="outline" className="gap-2 font-body font-bold" suppressHydrationWarning>
              <UserPlus className="w-4 h-4" />
              Add Stakeholder
            </Button>
          </CardHeader>
          <CardContent>
            {(!shareholders || shareholders.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted">
                <p className="text-muted-foreground italic mb-4">No stakeholders listed yet.</p>
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
                      <HeaderWithInfo label="Interest Type" info="Common, Preference, ESOP, or DVR (Super-voting)." />
                    </TableHead>
                    <TableHead>Ownership %</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shareholders.map((s) => {
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Input 
                            value={s.name || ''} 
                            placeholder="Full name or entity..."
                            className="h-8 border-none bg-transparent focus-visible:ring-1" 
                            onChange={e => updateShareholder(s.id, 'name', e.target.value)}
                            suppressHydrationWarning
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={s.type} onValueChange={v => updateShareholder(s.id, 'type', v)}>
                            <SelectTrigger className="h-8 w-32 font-code text-xs" suppressHydrationWarning><SelectValue /></SelectTrigger>
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
                                className="h-8 font-code pr-8" 
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
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeShareholder(s.id)} suppressHydrationWarning>
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
              <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Over-allocation Alert</AlertTitle>
                <AlertDescription>
                  Your total ownership exceeds 100% ({totalAllocated.toFixed(2)}%). Please adjust your stakeholder percentages.
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
                    <RechartsTooltip formatter={(val: number) => [`${val.toFixed(1)}%`, 'Ownership']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/10 italic text-muted-foreground text-sm">
                Add stakeholders to see distribution
              </div>
            )}
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
              <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 ${check.pass ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                {check.pass ? <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-bold ${check.pass ? 'text-green-800' : 'text-red-800'}`}>{check.label}</div>
                    <div className="font-code text-xs font-bold">{check.val}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{check.tip}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
