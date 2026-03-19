'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { fmtPct } from '@/lib/utils/formatters';
import { Trash2, Plus, UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface Shareholder {
  id: string;
  name: string;
  type: 'common' | 'preference' | 'esop' | 'dvr';
  shares: number;
}

const COLORS = ['#1f4fad', '#0fe4e8', '#16a34a', '#d946ef', '#f59e0b', '#ef4444'];

export function CapTableTracker() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([
    { id: '1', name: 'Founding Team', type: 'common', shares: 5000000 },
    { id: '2', name: 'Angel Investor A', type: 'preference', shares: 1000000 },
    { id: '3', name: 'ESOP Pool', type: 'esop', shares: 800000 },
    { id: '4', name: 'Antony Dinu (Advisor)', type: 'common', shares: 200000 },
  ]);

  const totalShares = useMemo(() => shareholders.reduce((acc, s) => acc + s.shares, 0), [shareholders]);

  const updateShareholder = (id: string, field: keyof Shareholder, value: any) => {
    setShareholders(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addShareholder = () => {
    setShareholders(prev => [...prev, { id: Date.now().toString(), name: 'New Entity', type: 'common', shares: 0 }]);
  };

  const removeShareholder = (id: string) => {
    setShareholders(prev => prev.filter(s => s.id !== id));
  };

  const chartData = useMemo(() => shareholders.map((s, i) => ({
    name: s.name,
    value: s.shares,
    color: COLORS[i % COLORS.length]
  })), [shareholders]);

  const authorityChecks = useMemo(() => {
    const founderShares = shareholders.filter(s => s.type === 'common').reduce((a, b) => a + b.shares, 0);
    const founderPct = totalShares > 0 ? (founderShares / totalShares) * 100 : 0;
    const prefShares = shareholders.filter(s => s.type === 'preference').reduce((a, b) => a + b.shares, 0);
    const prefPct = totalShares > 0 ? (prefShares / totalShares) * 100 : 0;
    const esopShares = shareholders.filter(s => s.type === 'esop').reduce((a, b) => a + b.shares, 0);
    const esopPct = totalShares > 0 ? (esopShares / totalShares) * 100 : 0;

    return [
      { label: 'Founders hold majority (>50%)', pass: founderPct > 50, val: fmtPct(founderPct), tip: 'Essential for operational control.' },
      { label: 'Preference shares below 40%', pass: prefPct < 40, val: fmtPct(prefPct), tip: 'Protects from excessive investor leverage.' },
      { label: 'ESOP pool healthy (5-15%)', pass: esopPct >= 5 && esopPct <= 15, val: fmtPct(esopPct), tip: 'Critical for future hiring rounds.' },
    ];
  }, [shareholders, totalShares]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Shareholders</CardTitle>
              <p className="text-sm text-muted-foreground font-code">Total Pool: {totalShares.toLocaleString()} shares</p>
            </div>
            <Button onClick={addShareholder} variant="outline" className="gap-2 font-body font-bold">
              <UserPlus className="w-4 h-4" />
              Add Shareholder
            </Button>
          </CardHeader>
          <CardContent>
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
                {shareholders.map((s, idx) => {
                  const pct = totalShares > 0 ? (s.shares / totalShares) * 100 : 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Input 
                          value={s.name} 
                          className="h-8 border-none bg-transparent focus-visible:ring-1" 
                          onChange={e => updateShareholder(s.id, 'name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={s.type} onValueChange={v => updateShareholder(s.id, 'type', v)}>
                          <SelectTrigger className="h-8 w-32 font-code text-xs"><SelectValue /></SelectTrigger>
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
                          value={s.shares} 
                          className="h-8 font-code w-32" 
                          onChange={e => updateShareholder(s.id, 'shares', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-code font-bold text-xs">{fmtPct(pct)}</div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeShareholder(s.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Ownership Distribution</CardTitle>
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
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {chartData.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground truncate w-24">{entry.name}</span>
                  </div>
                  <span className="font-code font-bold">{fmtPct(totalShares > 0 ? (entry.value / totalShares) * 100 : 0)}</span>
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