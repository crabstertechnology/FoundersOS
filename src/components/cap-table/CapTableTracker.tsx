'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { fmtPct } from '@/lib/utils/formatters';
import { Trash2, UserPlus, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

interface CapTableTrackerProps {
  userId: string;
  companyProfileId: string;
}

interface Shareholder {
  id: string;
  name: string;
  type: 'common' | 'preference' | 'esop' | 'dvr';
  shares: number;
  companyId: string;
}

const COLORS = ['#1f4fad', '#0fe4e8', '#16a34a', '#d946ef', '#f59e0b', '#ef4444'];

export function CapTableTracker({ userId, companyProfileId }: CapTableTrackerProps) {
  const firestore = useFirestore();
  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  const { data: shareholders, isLoading } = useCollection<Shareholder>(shareholdersRef);

  const totalShares = useMemo(() => (shareholders || []).reduce((acc, s) => acc + (s.shares || 0), 0), [shareholders]);

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
      shares: 0,
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
    value: s.shares || 0,
    color: COLORS[i % COLORS.length]
  })), [shareholders]);

  const authorityChecks = useMemo(() => {
    const list = shareholders || [];
    const founderShares = list.filter(s => s.type === 'common').reduce((a, b) => a + (b.shares || 0), 0);
    const founderPct = totalShares > 0 ? (founderShares / totalShares) * 100 : 0;
    const prefShares = list.filter(s => s.type === 'preference').reduce((a, b) => a + (b.shares || 0), 0);
    const prefPct = totalShares > 0 ? (prefShares / totalShares) * 100 : 0;
    const esopShares = list.filter(s => s.type === 'esop').reduce((a, b) => a + (b.shares || 0), 0);
    const esopPct = totalShares > 0 ? (esopShares / totalShares) * 100 : 0;

    return [
      { label: 'Founders hold majority (>50%)', pass: founderPct > 50, val: fmtPct(founderPct), tip: 'Essential for operational control.' },
      { label: 'Preference shares below 40%', pass: prefPct < 40, val: fmtPct(prefPct), tip: 'Protects from excessive investor leverage.' },
      { label: 'ESOP pool healthy (5-15%)', pass: esopPct >= 5 && esopPct <= 15, val: fmtPct(esopPct), tip: 'Critical for future hiring rounds.' },
    ];
  }, [shareholders, totalShares]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-code text-xs">Syncing Shareholders...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Cap Table</CardTitle>
              <p className="text-sm text-muted-foreground font-code">Total Issued: {totalShares.toLocaleString()} shares</p>
            </div>
            <Button onClick={addShareholder} variant="outline" className="gap-2 font-body font-bold" suppressHydrationWarning>
              <UserPlus className="w-4 h-4" />
              Add Shareholder
            </Button>
          </CardHeader>
          <CardContent>
            {(!shareholders || shareholders.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted">
                <p className="text-muted-foreground italic mb-4">Cap table is currently empty.</p>
                <Button onClick={addShareholder} variant="outline" size="sm" className="gap-2" suppressHydrationWarning>
                  <UserPlus className="w-3 h-3" />
                  Add First Shareholder
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent uppercase text-[10px] font-bold tracking-widest text-muted-foreground">
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Shares Held</TableHead>
                    <TableHead>% Ownership</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shareholders.map((s) => {
                    const pct = totalShares > 0 ? ((s.shares || 0) / totalShares) * 100 : 0;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Input 
                            value={s.name || ''} 
                            placeholder="Name..."
                            className="h-8 border-none bg-transparent focus-visible:ring-1" 
                            onChange={e => updateShareholder(s.id, 'name', e.target.value)}
                            suppressHydrationWarning
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={s.type} onValueChange={v => updateShareholder(s.id, 'type', v)}>
                            <SelectTrigger className="h-8 w-32 font-code text-xs" suppressHydrationWarning><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="common">Common</SelectItem>
                              <SelectItem value="preference">Preference</SelectItem>
                              <SelectItem value="esop">ESOP Pool</SelectItem>
                              <SelectItem value="dvr">DVR Shares</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={s.shares || ''} 
                            className="h-8 font-code w-32" 
                            onChange={e => updateShareholder(s.id, 'shares', Number(e.target.value))}
                            suppressHydrationWarning
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-code font-bold text-xs">{fmtPct(pct)}</div>
                            <Progress value={pct} className="h-1.5" />
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
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Ownership Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 && totalShares > 0 ? (
              <>
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
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/10 italic text-muted-foreground text-sm">
                Distribution data will appear here
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
