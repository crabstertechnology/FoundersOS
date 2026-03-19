
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
  User, TrendingUp, History, Sparkles, PieChart as PieIcon,
  ShieldAlert, ArrowRightLeft, Target, Percent
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

  // Logic: Sasitharan (Founder) starts with 100%. Everyone else is deducted from him.
  const stats = useMemo(() => {
    const nonFounderStakeholders = (stakeholders || []).filter(s => s.name.toLowerCase() !== 'sasitharan');
    const totalAllocatedToOthers = nonFounderStakeholders.reduce((acc, s) => acc + (s.ownershipPercentage || 0), 0);
    const founderPct = Math.max(0, 100 - totalAllocatedToOthers);

    const investorPct = (stakeholders || []).filter(s => s.role === 'Investor').reduce((acc, s) => acc + (s.ownershipPercentage || 0), 0);
    const esopPct = (stakeholders || []).filter(s => s.role === 'ESOP').reduce((acc, s) => acc + (s.ownershipPercentage || 0), 0);

    return {
      founderPct,
      investorPct,
      esopPct,
      totalAllocatedToOthers,
      latestVal: profile?.latestValuation || 0,
    };
  }, [stakeholders, profile]);

  const chartData = useMemo(() => {
    const data = (stakeholders || [])
      .filter(s => (s.ownershipPercentage || 0) > 0)
      .map((s, i) => ({
        name: s.name || 'Unnamed',
        value: s.ownershipPercentage || 0,
        color: COLORS[i % COLORS.length]
      }));

    // If Sasitharan isn't in the list explicitly, we show the remaining founder stake
    const hasFounderInList = (stakeholders || []).some(s => s.name.toLowerCase() === 'sasitharan');
    if (!hasFounderInList && stats.founderPct > 0) {
      data.unshift({
        name: 'Sasitharan (Founder)',
        value: stats.founderPct,
        color: COLORS[0]
      });
    }

    return data;
  }, [stakeholders, stats.founderPct]);

  // Actions
  const addStakeholder = () => {
    if (!shareholdersRef) return;
    addDocumentNonBlocking(shareholdersRef, {
      name: 'New Partner',
      role: 'Partner',
      ownershipPercentage: 0,
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
        <p className="text-muted-foreground font-code text-xs">Loading Proprietorship Equity Map...</p>
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
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">Founder Stake (Sasitharan)</div>
              <ShieldCheck className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-3xl font-black">{fmtPct(stats.founderPct)}</div>
            <p className="text-[10px] mt-2 opacity-80">Remaining from 100%</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/10 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Company Valuation</div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtINR(stats.latestVal)}</div>
            <p className="text-[10px] mt-2 text-muted-foreground">Market Estimate</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/10 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Allocated to Others</div>
              <Percent className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtPct(stats.totalAllocatedToOthers)}</div>
            <p className="text-[10px] mt-2 text-muted-foreground">Deducted from Founder</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-primary/10 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Investor Share</div>
              <Target className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtPct(stats.investorPct)}</div>
            <p className="text-[10px] mt-2 text-muted-foreground">Capital Infusion Weight</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
              <TabsTrigger value="registry" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="w-4 h-4" /> Partner Registry
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
                    <CardTitle className="text-xl font-bold">Ownership Registry</CardTitle>
                    <CardDescription>Sasitharan starts at 100%. Adding partners reduces his stake.</CardDescription>
                  </div>
                  <Button onClick={addStakeholder} variant="outline" className="gap-2 font-bold rounded-full">
                    <UserPlus className="w-4 h-4" /> Add Partner
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="uppercase text-[10px] font-bold tracking-widest">
                        <TableHead className="w-[300px]">Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Ownership %</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Fixed Founder Row */}
                      <TableRow className="bg-primary/5 font-bold">
                        <TableCell>Sasitharan (Founder)</TableCell>
                        <TableCell>
                          <Badge className="bg-primary text-white text-[9px] uppercase">Primary Owner</Badge>
                        </TableCell>
                        <TableCell className="text-right font-code text-primary">
                          {fmtPct(stats.founderPct)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>

                      {(stakeholders || []).filter(s => s.name.toLowerCase() !== 'sasitharan').map((s) => (
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
                                <SelectItem value="Partner">Partner</SelectItem>
                                <SelectItem value="Investor">Investor</SelectItem>
                                <SelectItem value="ESOP">ESOP</SelectItem>
                                <SelectItem value="Advisor">Advisor</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Input 
                                type="number" 
                                value={s.ownershipPercentage || ''} 
                                className="h-8 w-20 border-none bg-muted/30 text-right font-code font-bold text-primary" 
                                onChange={e => updateStakeholder(s.id, 'ownershipPercentage', Number(e.target.value))}
                              />
                              <span className="text-xs font-bold">%</span>
                            </div>
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

                  {stats.totalAllocatedToOthers > 100 && (
                    <Alert variant="destructive" className="mt-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Over-allocation Alert</AlertTitle>
                      <AlertDescription>
                        You have allocated {fmtPct(stats.totalAllocatedToOthers)} to others. This exceeds Sasitharan's 100% capacity.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rounds">
              <Card className="shadow-md border-none">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Funding History</CardTitle>
                  <CardDescription>Track key milestones where equity was exchanged for capital.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!rounds || rounds.length === 0) ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/5">
                      <History className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground text-sm">No recorded rounds.</p>
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
                          <div className="text-right">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold">Equity Granted</div>
                            <div className="font-bold text-primary">{fmtPct(r.equityOffered)}</div>
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
                    <RechartsTooltip formatter={(val: number) => [fmtPct(val), 'Ownership']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md bg-muted/20 border-none">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                <ShieldAlert className="w-5 h-5" /> Decision Logic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AuthorityCheck 
                label="Founder Control" 
                pass={stats.founderPct > 50} 
                val={fmtPct(stats.founderPct)}
                warning="Proprietor control is at risk if stake drops below 50%."
              />
              <AuthorityCheck 
                label="ESOP Pool" 
                pass={stats.esopPct >= 5 && stats.esopPct <= 15} 
                val={fmtPct(stats.esopPct)}
                warning="A 10% pool is standard for hiring key partners later."
              />
              <AuthorityCheck 
                label="Over-Allocation" 
                pass={stats.totalAllocatedToOthers <= 100} 
                val={fmtPct(stats.totalAllocatedToOthers)}
                warning="You have allocated more than the total 100% available."
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
  const [newGrant, setNewGrant] = useState(0);

  const simulation = useMemo(() => {
    if (newGrant <= 0) return null;

    const remainingToFounder = Math.max(0, stats.founderPct - newGrant);
    
    return {
      newGrant,
      founderDilution: newGrant,
      remainingToFounder,
      impact: (stakeholders || []).map(s => {
        const isFounder = s.name.toLowerCase() === 'sasitharan';
        return {
          name: s.name,
          currentPct: isFounder ? stats.founderPct : s.ownershipPercentage,
          newPct: isFounder ? remainingToFounder : s.ownershipPercentage
        };
      })
    };
  }, [newGrant, stats, stakeholders]);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="space-y-2 max-w-sm mx-auto">
            <label className="text-xs font-bold uppercase tracking-widest text-primary text-center block">Equity to Grant (%)</label>
            <div className="relative">
              <Input type="number" className="bg-white text-center font-bold text-lg" placeholder="e.g. 10" onChange={e => setNewGrant(Number(e.target.value))} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 italic">Deducts directly from Sasitharan's 100% initial stake.</p>
          </div>
        </CardContent>
      </Card>

      {simulation ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border-none shadow-md">
              <CardContent className="pt-6 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">New Stake Given</div>
                <div className="text-2xl font-black text-primary">{fmtPct(simulation.newGrant)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-md">
              <CardContent className="pt-6 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Sasitharan's New Stake</div>
                <div className="text-2xl font-black text-green-600">{fmtPct(simulation.remainingToFounder)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md border-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-bold uppercase">Impact Map</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="uppercase text-[9px] font-bold">
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Current %</TableHead>
                    <TableHead className="text-center w-12"></TableHead>
                    <TableHead className="text-right">After Grant %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-primary/5 font-bold">
                    <TableCell>Sasitharan (Founder)</TableCell>
                    <TableCell className="text-right">{fmtPct(stats.founderPct)}</TableCell>
                    <TableCell className="text-center"><ArrowRightLeft className="w-3 h-3 mx-auto" /></TableCell>
                    <TableCell className="text-right text-green-600">{fmtPct(simulation.remainingToFounder)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50">
                    <TableCell className="font-bold text-green-700">Incoming Stakeholder</TableCell>
                    <TableCell className="text-right">0%</TableCell>
                    <TableCell className="text-center"><ArrowRightLeft className="w-3 h-3 mx-auto" /></TableCell>
                    <TableCell className="text-right text-green-700 font-black">{fmtPct(simulation.newGrant)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
          <p className="text-muted-foreground text-sm font-medium italic">Enter a percentage to see how much it reduces Sasitharan's stake.</p>
        </div>
      )}
    </div>
  );
}
