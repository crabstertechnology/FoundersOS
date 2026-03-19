'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtINR, fmtPct } from '@/lib/utils/formatters';
import { 
  Trash2, UserPlus, ShieldCheck, AlertCircle, Loader2, 
  User, TrendingUp, History, Sparkles, Coins, PieChart as PieIcon,
  ShieldAlert, ArrowRightLeft, Target
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { 
  useFirestore, useCollection, useDoc, useMemoFirebase, 
  addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CapTableTrackerProps {
  userId: string;
  companyProfileId: string;
}

const COLORS = ['#1f4fad', '#0fe4e8', '#16a34a', '#d946ef', '#f59e0b', '#ef4444'];

export function CapTableTracker({ userId, companyProfileId }: CapTableTrackerProps) {
  const [activeView, setActiveView] = useState('registry');
  const firestore = useFirestore();

  // Refs
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  const roundsRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return query(collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'fundingRounds'), orderBy('date', 'desc'));
  }, [firestore, userId, companyProfileId]);

  // Data
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);
  const { data: stakeholders, isLoading: isStakeholdersLoading } = useCollection(shareholdersRef);
  const { data: rounds, isLoading: isRoundsLoading } = useCollection(roundsRef);

  // Stats & Calculations
  const stats = useMemo(() => {
    const totalShares = (stakeholders || []).reduce((acc, s) => acc + (s.sharesOwned || 0), 0);
    const founderShares = (stakeholders || []).filter(s => s.role === 'Founder').reduce((acc, s) => acc + (s.sharesOwned || 0), 0);
    const investorShares = (stakeholders || []).filter(s => s.role === 'Investor').reduce((acc, s) => acc + (s.sharesOwned || 0), 0);
    const esopShares = (stakeholders || []).filter(s => s.role === 'ESOP').reduce((acc, s) => acc + (s.sharesOwned || 0), 0);

    return {
      totalShares,
      founderPct: totalShares > 0 ? (founderShares / totalShares) * 100 : 0,
      investorPct: totalShares > 0 ? (investorShares / totalShares) * 100 : 0,
      esopPct: totalShares > 0 ? (esopShares / totalShares) * 100 : 0,
      latestVal: profile?.latestValuation || 0,
    };
  }, [stakeholders, profile]);

  const chartData = useMemo(() => {
    return (stakeholders || [])
      .filter(s => (s.sharesOwned || 0) > 0)
      .map((s, i) => ({
        name: s.name || 'Unnamed',
        value: s.sharesOwned || 0,
        pct: stats.totalShares > 0 ? (s.sharesOwned / stats.totalShares) * 100 : 0,
        color: COLORS[i % COLORS.length]
      }));
  }, [stakeholders, stats.totalShares]);

  // Actions
  const addStakeholder = () => {
    if (!shareholdersRef) return;
    addDocumentNonBlocking(shareholdersRef, {
      name: 'New Stakeholder',
      role: 'Investor',
      shareClass: 'Preferred',
      sharesOwned: 0,
      companyId: companyProfileId,
    });
  };

  const updateStakeholder = (id: string, field: string, value: any) => {
    if (!shareholdersRef) return;
    const stakeholderDoc = doc(shareholdersRef, id);
    updateDocumentNonBlocking(stakeholderDoc, { [field]: value });
  };

  if (isProfileLoading || isStakeholdersLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-code text-xs">Loading Cap Table Infrastructure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Snapshot Layer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">Founder Stake</div>
              <ShieldCheck className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-3xl font-black">{fmtPct(stats.founderPct)}</div>
            <p className="text-[10px] mt-2 opacity-80">Primary control balance</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/10 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Current Valuation</div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtINR(stats.latestVal)}</div>
            <p className="text-[10px] mt-2 text-muted-foreground">Post-money (Last Round)</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/10 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">ESOP Pool</div>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtPct(stats.esopPct)}</div>
            <p className="text-[10px] mt-2 text-muted-foreground">Allocated & Reserved</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/10 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Shares Issued</div>
              <Coins className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-primary">{(stats.totalShares || 0).toLocaleString()}</div>
            <p className="text-[10px] mt-2 text-muted-foreground">Total Shares Outstanding</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
              <TabsTrigger value="registry" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="w-4 h-4" /> Registry
              </TabsTrigger>
              <TabsTrigger value="rounds" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <History className="w-4 h-4" /> History
              </TabsTrigger>
              <TabsTrigger value="simulator" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-primary font-bold">
                <ArrowRightLeft className="w-4 h-4" /> Dilution Engine
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registry">
              <Card className="shadow-md border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-6">
                  <div>
                    <CardTitle className="text-xl font-bold">Shareholder Registry</CardTitle>
                    <CardDescription>Manage your cap table by share count and class.</CardDescription>
                  </div>
                  <Button onClick={addStakeholder} variant="outline" className="gap-2 font-bold rounded-full">
                    <UserPlus className="w-4 h-4" /> Add Stakeholder
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="uppercase text-[10px] font-bold tracking-widest">
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Ownership %</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stakeholders || []).map((s) => (
                        <TableRow key={s.id} className="group hover:bg-muted/20">
                          <TableCell>
                            <Input 
                              value={s.name || ''} 
                              className="h-8 border-none bg-transparent font-medium focus-visible:ring-1" 
                              onChange={e => updateStakeholder(s.id, 'name', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select value={s.role} onValueChange={v => updateStakeholder(s.id, 'role', v)}>
                              <SelectTrigger className="h-8 w-24 border-none bg-muted/50 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Founder">Founder</SelectItem>
                                <SelectItem value="Investor">Investor</SelectItem>
                                <SelectItem value="ESOP">ESOP</SelectItem>
                                <SelectItem value="Advisor">Advisor</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                             <Select value={s.shareClass} onValueChange={v => updateStakeholder(s.id, 'shareClass', v)}>
                              <SelectTrigger className="h-8 w-24 border-none bg-muted/50 text-[10px] font-bold uppercase">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Common">Common</SelectItem>
                                <SelectItem value="Preferred">Preferred</SelectItem>
                                <SelectItem value="SAFE">SAFE</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={s.sharesOwned || ''} 
                              className="h-8 border-none bg-transparent text-right font-code font-bold" 
                              onChange={e => updateStakeholder(s.id, 'sharesOwned', Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell className="text-right font-code text-xs font-bold text-primary">
                            {fmtPct(stats.totalShares > 0 ? (s.sharesOwned / stats.totalShares) * 100 : 0)}
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(shareholdersRef, s.id))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rounds">
              <Card className="shadow-md border-none">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Funding Rounds</CardTitle>
                  <CardDescription>Track the historical milestones of your capital raising.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!rounds || rounds.length === 0) ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/5">
                      <History className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground text-sm">No funding rounds recorded yet.</p>
                      <Button variant="outline" className="mt-4 rounded-full" onClick={() => addDocumentNonBlocking(roundsRef, { roundName: 'Seed', amountRaised: 0, preMoneyValuation: 0, companyId: companyProfileId, date: new Date().toISOString() })}>Log First Round</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rounds.map((r) => (
                        <div key={r.id} className="p-4 border rounded-xl bg-white flex items-center justify-between hover:border-primary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Target className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-lg">{r.roundName}</div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{new Date(r.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="text-right grid grid-cols-2 gap-x-8">
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Raised</div>
                              <div className="font-bold">{fmtINR(r.amountRaised)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Post-Money</div>
                              <div className="font-bold">{fmtINR(r.postMoneyValuation || (r.amountRaised + r.preMoneyValuation))}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="simulator">
              <DilutionSimulator stats={stats} stakeholders={stakeholders} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-lg border-none overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-primary" /> Ownership Mix
              </CardTitle>
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
                    <RechartsTooltip formatter={(val: number) => [val.toLocaleString() + ' Shares', 'Ownership']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-muted/20 border-none">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                <ShieldAlert className="w-5 h-5" /> Authority Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AuthorityCheck 
                label="Founder Control" 
                pass={stats.founderPct > 50} 
                val={fmtPct(stats.founderPct)}
                warning="Founders risk losing board majority if stake drops below 50%."
              />
              <AuthorityCheck 
                label="ESOP Health" 
                pass={stats.esopPct >= 5 && stats.esopPct <= 15} 
                val={fmtPct(stats.esopPct)}
                warning="Target 10% ESOP pool to attract top-tier talent for the next round."
              />
              <AuthorityCheck 
                label="Investor Dominance" 
                pass={stats.investorPct < 30} 
                val={fmtPct(stats.investorPct)}
                warning="High early-stage investor concentration can block future 'Super Majority' decisions."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AuthorityCheck({ label, pass, val, warning }: { label: string; pass: boolean; val: string; warning: string }) {
  return (
    <div className={`p-4 rounded-xl border-l-4 transition-all ${pass ? 'bg-green-50/50 border-green-500' : 'bg-red-50/50 border-red-500'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] uppercase font-black ${pass ? 'text-green-800' : 'text-red-800'}`}>{label}</span>
        <span className="font-code text-[10px] font-bold bg-white px-2 py-0.5 rounded border">{val}</span>
      </div>
      {!pass && <p className="text-[10px] text-muted-foreground leading-tight italic">{warning}</p>}
    </div>
  );
}

function DilutionSimulator({ stats, stakeholders }: { stats: any; stakeholders: any[] | null }) {
  const [newCapital, setNewCapital] = useState(0);
  const [preMoney, setPreMoney] = useState(0);

  const simulation = useMemo(() => {
    if (newCapital <= 0 || preMoney <= 0 || stats.totalShares <= 0) return null;

    const postMoney = preMoney + newCapital;
    const dilutionPct = (newCapital / postMoney) * 100;
    const newSharesToIssue = (dilutionPct / (100 - dilutionPct)) * stats.totalShares;
    const totalNewShares = stats.totalShares + newSharesToIssue;
    const newPricePerShare = preMoney / stats.totalShares;

    return {
      postMoney,
      dilutionPct,
      newSharesToIssue,
      totalNewShares,
      newPricePerShare,
      newStakeholders: (stakeholders || []).map(s => ({
        name: s.name,
        currentPct: (s.sharesOwned / stats.totalShares) * 100,
        newPct: (s.sharesOwned / totalNewShares) * 100
      }))
    };
  }, [newCapital, preMoney, stats, stakeholders]);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary">New Investment (INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-code text-xs text-muted-foreground">₹</span>
              <Input type="number" className="pl-7 bg-white" placeholder="e.g. 10,000,000" onChange={e => setNewCapital(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary">Proposed Pre-Money (INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-code text-xs text-muted-foreground">₹</span>
              <Input type="number" className="pl-7 bg-white" placeholder="e.g. 50,000,000" onChange={e => setPreMoney(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {simulation ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
          <Card className="bg-white border-none shadow-md">
            <CardContent className="pt-6 text-center">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Impact Dilution</div>
              <div className="text-2xl font-black text-red-600">-{fmtPct(simulation.dilutionPct)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-md">
            <CardContent className="pt-6 text-center">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">New Price / Share</div>
              <div className="text-2xl font-black text-primary">{fmtINR(simulation.newPricePerShare)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-md">
            <CardContent className="pt-6 text-center">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Post-Money Valuation</div>
              <div className="text-2xl font-black text-green-600">{fmtINR(simulation.postMoney)}</div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 shadow-md border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-bold uppercase">Simulation Impact Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="uppercase text-[9px] font-bold">
                    <TableHead>Stakeholder</TableHead>
                    <TableHead className="text-right">Current %</TableHead>
                    <TableHead className="text-center w-12"></TableHead>
                    <TableHead className="text-right">Post-Round %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulation.newStakeholders.map((s, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell className="font-medium text-xs">{s.name}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{fmtPct(s.currentPct)}</TableCell>
                      <TableCell className="text-center text-muted-foreground"><ArrowRightLeft className="w-3 h-3 mx-auto" /></TableCell>
                      <TableCell className="text-right text-xs font-bold text-primary">{fmtPct(s.newPct)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold text-xs text-green-600 italic">Incoming Investors</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">0.0%</TableCell>
                    <TableCell className="text-center text-muted-foreground"><ArrowRightLeft className="w-3 h-3 mx-auto" /></TableCell>
                    <TableCell className="text-right text-xs font-bold text-green-600">{fmtPct(simulation.dilutionPct)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
          <p className="text-muted-foreground text-sm font-medium italic">Enter investment amount and pre-money valuation to see the dilution impact.</p>
        </div>
      )}
    </div>
  );
}
