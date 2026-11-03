'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { fmtINR, fmtPct } from '@/lib/utils/formatters';
import { 
  Trash2, UserPlus, ShieldCheck, AlertCircle, Loader2, 
  User, TrendingUp, History, PieChart as PieIcon,
  ShieldAlert, ArrowRightLeft, Target, Percent, Plus,
  CheckCircle2, AlertTriangle, Coins, Sparkles, DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { 
  useFirestore, useCollection, useDoc, useMemoFirebase, 
  addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';

interface CapTableTrackerProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
  defaultView?: 'registry' | 'rounds' | 'simulator' | 'exit';
}

const COLORS = ['#1f4fad', '#0fe4e8', '#16a34a', '#d946ef', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const EXIT_PRESETS = [
  { label: '₹1 Cr', value: 10000000 },
  { label: '₹5 Cr', value: 50000000 },
  { label: '₹10 Cr', value: 100000000 },
  { label: '₹25 Cr', value: 250000000 },
  { label: '₹50 Cr', value: 500000000 },
  { label: '₹100 Cr', value: 1000000000 },
];

export function CapTableTracker({ userId, companyProfileId, readOnly, defaultView = 'registry' }: CapTableTrackerProps) {
  const [activeView, setActiveView] = useState(defaultView);
  const [chartMode, setChartMode] = useState<'equity' | 'cash'>('equity');
  const [isAddingRound, setIsAddingRound] = useState(false);
  const [newRoundData, setNewRoundData] = useState({
    roundName: '',
    date: new Date().toISOString().split('T')[0],
    amountRaised: 0,
    equityOffered: 0
  });

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

  const roundsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'fundingRounds');
  }, [firestore, userId, companyProfileId]);

  const roundsQueryRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return query(collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'fundingRounds'), orderBy('date', 'desc'));
  }, [firestore, userId, companyProfileId]);

  // Data
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);
  const { data: stakeholders, isLoading: isStakeholdersLoading } = useCollection(shareholdersRef);
  const { data: rounds, isLoading: isRoundsLoading } = useCollection(roundsQueryRef);

  // Exit Valuation State (defaults to 50 Cr or company profile valuation)
  const [exitValuation, setExitValuation] = useState<number>(500000000);

  React.useEffect(() => {
    if (profile?.postMoneyValuation) {
      setExitValuation(profile.postMoneyValuation);
    } else if (profile?.latestValuation) {
      setExitValuation(profile.latestValuation);
    }
  }, [profile?.postMoneyValuation, profile?.latestValuation]);

  // Sync chart mode with active view
  React.useEffect(() => {
    if (activeView === 'exit') {
      setChartMode('cash');
    }
  }, [activeView]);

  // Logic: Sasitharan (Founder) starts with 100%. Everyone else is deducted from him.
  const stats = useMemo(() => {
    const others = (stakeholders || []).filter(s => s.name.toLowerCase() !== 'sasitharan');
    const totalAllocatedToOthers = others.reduce((acc, s) => acc + (s.ownershipPercentage || 0), 0);
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

  // --- WATERFALL CALCULATION LOGIC ---
  const waterfallResults = useMemo(() => {
    const list = [
      {
        id: 'sasitharan-founder',
        name: 'Sasitharan (Founder)',
        role: 'Founder',
        ownership: stats.founderPct,
        invested: 0,
        preferenceType: 'common' as const
      },
      ...(stakeholders || []).filter(s => s.name.toLowerCase() !== 'sasitharan').map(s => ({
        id: s.id,
        name: s.name || 'Unnamed',
        role: s.role || 'Partner',
        ownership: Number(s.ownershipPercentage) || 0,
        invested: Number(s.investmentAmount) || 0,
        preferenceType: (s.preferenceType || (s.role === 'Investor' ? '1x_non_part' : 'common')) as string
      }))
    ];

    let remainingPool = exitValuation;

    // Step 1: Calculate preferences
    const preferences = list.map(sh => {
      let prefAmount = 0;
      if (sh.preferenceType === '1x_non_part' || sh.preferenceType === '1x_part') {
        prefAmount = sh.invested;
      } else if (sh.preferenceType === '2x_part') {
        prefAmount = sh.invested * 2;
      }
      return { ...sh, prefAmount };
    });

    const totalPreferenceDemand = preferences.reduce((sum, sh) => sum + sh.prefAmount, 0);

    // If pool <= preferences, preferences are capped pro-rata
    if (remainingPool <= totalPreferenceDemand && totalPreferenceDemand > 0) {
      return preferences.map(sh => {
        const payout = (sh.prefAmount / totalPreferenceDemand) * remainingPool;
        return {
          ...sh,
          payout,
          payoutType: 'Preference Capped',
          effectiveOwnership: exitValuation > 0 ? (payout / exitValuation) * 100 : 0
        };
      });
    }

    remainingPool -= totalPreferenceDemand;

    // Step 2: Determine conversions for non-participating preferred
    let commonOwnershipBase = 0;
    const intermediate = preferences.map(sh => {
      const proRataGross = (sh.ownership / 100) * exitValuation;
      let convertsToCommon = false;
      if (sh.preferenceType === '1x_non_part') {
        if (proRataGross > sh.prefAmount) {
          convertsToCommon = true;
          remainingPool += sh.prefAmount; // Put preference back into pool
          sh.prefAmount = 0;
        }
      }

      if (sh.preferenceType === 'common' || sh.preferenceType === '1x_part' || sh.preferenceType === '2x_part' || convertsToCommon) {
        commonOwnershipBase += sh.ownership;
      }

      return { ...sh, convertsToCommon, proRataGross };
    });

    // Step 3: Distribute remaining common pool
    return intermediate.map(sh => {
      let commonShare = 0;
      if (sh.preferenceType === 'common' || sh.preferenceType === '1x_part' || sh.preferenceType === '2x_part' || sh.convertsToCommon) {
        const adjustedOwnership = commonOwnershipBase > 0 ? (sh.ownership / commonOwnershipBase) : 0;
        commonShare = remainingPool * adjustedOwnership;
      }

      const totalPayout = sh.prefAmount + commonShare;
      const effectiveOwnership = exitValuation > 0 ? (totalPayout / exitValuation) * 100 : 0;
      let payoutType = 'Common Pro-Rata';
      if (sh.convertsToCommon) payoutType = 'Converted to Common';
      else if (sh.preferenceType.includes('part') && commonShare > 0) payoutType = 'Preference + Participating';
      else if (sh.prefAmount > 0 && commonShare === 0) payoutType = 'Preference Capped';

      return {
        ...sh,
        payout: totalPayout,
        effectiveOwnership,
        payoutType
      };
    });
  }, [exitValuation, stats.founderPct, stakeholders]);

  const founderResult = useMemo(() => {
    return waterfallResults.find(r => r.role === 'Founder') || { payout: exitValuation, effectiveOwnership: 100, ownership: 100 };
  }, [waterfallResults, exitValuation]);

  const totalPreferencePaid = useMemo(() => {
    return waterfallResults
      .filter(r => r.role === 'Investor')
      .reduce((sum, r) => sum + (r.preferenceType !== 'common' ? (r.prefAmount || 0) : 0), 0);
  }, [waterfallResults]);

  const esopResult = useMemo(() => {
    return waterfallResults
      .filter(r => r.role === 'ESOP')
      .reduce((sum, r) => sum + r.payout, 0);
  }, [waterfallResults]);

  // Equity Chart Data
  const equityChartData = useMemo(() => {
    const data = (stakeholders || [])
      .filter(s => s.name.toLowerCase() !== 'sasitharan' && (s.ownershipPercentage || 0) > 0)
      .map((s, i) => ({
        name: s.name || 'Unnamed',
        value: s.ownershipPercentage || 0,
        color: COLORS[(i + 1) % COLORS.length]
      }));

    // Add Founder stake
    data.unshift({
      name: 'Sasitharan (Founder)',
      value: stats.founderPct,
      color: COLORS[0]
    });

    return data;
  }, [stakeholders, stats.founderPct]);

  // Exit Cash Chart Data
  const cashChartData = useMemo(() => {
    return waterfallResults
      .filter(r => r.payout > 0)
      .map((res, i) => ({
        name: res.name,
        value: Math.max(0, Math.round(res.payout)),
        color: COLORS[i % COLORS.length]
      }));
  }, [waterfallResults]);

  // Actions
  const addStakeholder = () => {
    if (readOnly || !shareholdersRef) return;
    addDocumentNonBlocking(shareholdersRef, {
      name: 'New Partner',
      role: 'Partner',
      ownershipPercentage: 0,
      investmentAmount: 0,
      preferenceType: 'common',
      companyId: companyProfileId,
    });
  };

  const updateStakeholder = (id: string, field: string, value: any) => {
    if (readOnly || !shareholdersRef) return;
    const stakeholderDoc = doc(shareholdersRef, id);
    updateDocumentNonBlocking(stakeholderDoc, { [field]: value });
  };

  const handleRecordRound = () => {
    if (readOnly || !roundsCollectionRef || !newRoundData.roundName) return;
    
    addDocumentNonBlocking(roundsCollectionRef, {
      ...newRoundData,
      companyId: companyProfileId,
      createdAt: new Date().toISOString()
    });

    setIsAddingRound(false);
    setNewRoundData({
      roundName: '',
      date: new Date().toISOString().split('T')[0],
      amountRaised: 0,
      equityOffered: 0
    });
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Snapshot Layer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl flex flex-col justify-between">
          <CardContent className="pt-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">Founder Stake (Sasitharan)</div>
              <ShieldCheck className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-3xl font-black">{fmtPct(stats.founderPct)}</div>
            <div className="mt-4 text-[10px] font-code bg-black/10 p-2.5 rounded-lg flex flex-col gap-1.5 mt-auto">
              <span className="font-bold uppercase tracking-widest text-[8px] opacity-70">100% - Total Dilution = Retained</span>
              <span className="flex justify-between items-center text-[10px] font-black">
                <span>100</span><span className="opacity-50">-</span><span>{fmtPct(stats.totalAllocatedToOthers)}</span><span className="opacity-50">=</span><span>{fmtPct(stats.founderPct)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-2 border-primary/10 shadow-lg flex flex-col justify-between">
          <CardContent className="pt-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Founder Exit Value</div>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-600">{fmtINR(founderResult.payout)}</div>
            <div className="mt-4 text-[9px] font-code text-muted-foreground bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 flex flex-col gap-1 mt-auto">
              <span className="font-bold uppercase tracking-widest text-[8px] text-emerald-700">Cash at ₹{fmtINR(exitValuation)} Exit</span>
              <span className="text-[10px] font-black text-emerald-800">
                {founderResult.effectiveOwnership.toFixed(1)}% Realized Take-Home
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-2 border-primary/10 shadow-lg flex flex-col justify-between">
          <CardContent className="pt-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Dilution Pool</div>
              <Percent className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtPct(stats.totalAllocatedToOthers)}</div>
            <div className="mt-4 text-[9px] font-code text-muted-foreground bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col gap-1.5 mt-auto">
              <span className="font-bold uppercase tracking-widest text-[8px] text-slate-400">Sum(Investors, ESOP, Advice)</span>
              <span className="flex justify-between items-center text-[10px] font-black text-primary">
                <span>Total Diluted</span><span className="opacity-50">=</span><span>{fmtPct(stats.totalAllocatedToOthers)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-2 border-primary/10 shadow-lg flex flex-col justify-between">
          <CardContent className="pt-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Investor Share</div>
              <Target className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtPct(stats.investorPct)}</div>
            <div className="mt-4 text-[9px] font-code text-muted-foreground bg-rose-50 p-2.5 rounded-lg border border-rose-100 flex flex-col gap-1.5 mt-auto text-rose-800">
              <span className="font-bold uppercase tracking-widest text-[8px]">External Capital Stake</span>
              <span className="flex justify-between items-center text-[10px] font-black">
                <span>Total External</span><span className="opacity-50">=</span><span>{fmtPct(stats.investorPct)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4-Column Grid: Left (2 cols for Tabs) | Mix Chart (1 col) | Decision Logic (1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">

        {/* ── LEFT: Unified Tabs (spans 2 columns) ── */}
        <div className="lg:col-span-2">
          <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)} className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <TabsList className="bg-slate-100/90 p-1 rounded-xl">
                <TabsTrigger value="registry" className="gap-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <User className="w-3.5 h-3.5" /> Ownership Registry
                </TabsTrigger>
                <TabsTrigger value="rounds" className="gap-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <History className="w-3.5 h-3.5" /> History
                </TabsTrigger>
                <TabsTrigger value="simulator" className="gap-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Dilution Engine
                </TabsTrigger>
                <TabsTrigger value="exit" className="gap-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Exit Simulator
                </TabsTrigger>
              </TabsList>

              {/* Action Buttons */}
              {!readOnly && activeView === 'registry' && (
                <Button onClick={addStakeholder} variant="outline" size="sm" className="gap-1.5 font-bold rounded-xl text-xs h-8 border-slate-200">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> Add Partner
                </Button>
              )}

              {!readOnly && activeView === 'rounds' && (
                <Dialog open={isAddingRound} onOpenChange={setIsAddingRound}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 font-bold rounded-xl text-xs h-8 border-slate-200">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" /> Record Round
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record New Funding Round</DialogTitle>
                      <DialogDescription>Document a milestone where you raised capital in exchange for equity.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name2" className="text-right">Round Name</Label>
                        <Input id="name2" placeholder="Seed, Series A..." className="col-span-3" value={newRoundData.roundName} onChange={e => setNewRoundData({...newRoundData, roundName: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date2" className="text-right">Date</Label>
                        <Input id="date2" type="date" className="col-span-3" value={newRoundData.date} onChange={e => setNewRoundData({...newRoundData, date: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount2" className="text-right">Amount (₹)</Label>
                        <Input id="amount2" type="number" className="col-span-3" value={newRoundData.amountRaised || ''} onChange={e => setNewRoundData({...newRoundData, amountRaised: Number(e.target.value)})} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="equity2" className="text-right">Equity %</Label>
                        <Input id="equity2" type="number" className="col-span-3" value={newRoundData.equityOffered || ''} onChange={e => setNewRoundData({...newRoundData, equityOffered: Number(e.target.value)})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleRecordRound} className="bg-primary text-white font-bold rounded-xl px-6">Save Round</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {activeView === 'exit' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gross Exit: {fmtINR(exitValuation)}</span>
                </div>
              )}
            </div>

            {/* TAB 1: OWNERSHIP REGISTRY */}
            <TabsContent value="registry" className="mt-0">
              <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-xs">
                <CardContent className="pt-4 p-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/70">
                        <TableRow className="uppercase text-[10px] font-bold tracking-widest">
                          <TableHead className="min-w-[140px]">Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Ownership %</TableHead>
                          <TableHead className="text-right min-w-[120px]">Est. Exit Payout</TableHead>
                          {!readOnly && <TableHead className="w-10"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="bg-primary/5 font-bold">
                          <TableCell className="font-black text-slate-900">Sasitharan (Founder)</TableCell>
                          <TableCell><Badge className="bg-primary text-white text-[9px] uppercase font-bold">Primary Owner</Badge></TableCell>
                          <TableCell className="text-right font-mono text-primary font-black">{fmtPct(stats.founderPct)}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600 font-black text-xs">
                            {fmtINR(founderResult.payout)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        {(stakeholders || []).filter(s => s.name.toLowerCase() !== 'sasitharan').map((s) => {
                          const exitRes = waterfallResults.find(r => r.id === s.id);
                          return (
                            <TableRow key={s.id} className="group hover:bg-muted/20">
                              <TableCell>
                                <Input value={s.name || ''} className="h-8 border-none bg-transparent font-medium focus-visible:ring-1" onChange={e => updateStakeholder(s.id, 'name', e.target.value)} disabled={readOnly} />
                              </TableCell>
                              <TableCell>
                                <Select value={s.role} onValueChange={v => updateStakeholder(s.id, 'role', v)} disabled={readOnly}>
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
                                <div className="flex items-center justify-end gap-1.5">
                                  <Input type="number" value={s.ownershipPercentage || ''} className="h-8 w-20 border-none bg-muted/30 text-right font-mono font-bold text-primary" onChange={e => updateStakeholder(s.id, 'ownershipPercentage', Number(e.target.value))} disabled={readOnly} />
                                  <span className="text-xs font-bold">%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-700 font-bold text-xs">
                                {exitRes ? fmtINR(exitRes.payout) : '₹0'}
                              </TableCell>
                              {!readOnly && (
                                <TableCell>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(shareholdersRef!, s.id))}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Over-allocation Alert */}
                  {stats.totalAllocatedToOthers > 100 && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Over-allocation Alert</AlertTitle>
                      <AlertDescription>You have allocated {fmtPct(stats.totalAllocatedToOthers)} to others. This exceeds Sasitharan's 100% capacity.</AlertDescription>
                    </Alert>
                  )}

                  {/* Quick Exit Modeling Banner */}
                  <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Payouts modeled at <strong>{fmtINR(exitValuation)}</strong> exit valuation.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('exit')}
                      className="text-xs font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      Configure Exit Waterfall <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: FUNDING ROUNDS HISTORY */}
            <TabsContent value="rounds" className="mt-0">
              <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-xs">
                <CardContent className="pt-4 p-4">
                  {(!rounds || rounds.length === 0) ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/5">
                      <History className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                      <p className="text-muted-foreground text-sm">No recorded rounds. Use "Record Round" to start your history.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rounds.map((r) => (
                        <div key={r.id} className="p-3 border rounded-xl bg-white flex items-center justify-between hover:border-primary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Target className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold">{r.roundName}</div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{new Date(r.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Capital</div>
                              <div className="font-bold text-sm">{fmtINR(r.amountRaised)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Equity</div>
                              <div className="font-bold text-sm text-primary">{fmtPct(r.equityOffered)}</div>
                            </div>
                            {!readOnly && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(roundsCollectionRef!, r.id))}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: DILUTION SIMULATOR */}
            <TabsContent value="simulator" className="mt-0">
              <DilutionSimulator stats={stats} stakeholders={stakeholders} />
            </TabsContent>

            {/* TAB 4: MERGED EXIT SIMULATOR */}
            <TabsContent value="exit" className="mt-0 space-y-4">
              {/* Exit Valuation Input & Presets */}
              <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-xs p-4">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-600" /> Gross Exit Valuation (₹)
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium">Model acquisition or IPO cash liquidation.</p>
                    </div>
                    <div className="relative max-w-xs w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                      <Input
                        type="number"
                        value={exitValuation}
                        onChange={(e) => setExitValuation(Math.max(0, Number(e.target.value)))}
                        className="pl-8 font-mono font-bold text-base border-emerald-200 focus-visible:ring-emerald-500 h-9"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Presets:</span>
                    {EXIT_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setExitValuation(p.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          exitValuation === p.value
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Waterfall Summary Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Founder Net Cash</div>
                  <div className="text-lg font-black text-emerald-950 mt-0.5">{fmtINR(founderResult.payout)}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{founderResult.effectiveOwnership.toFixed(1)}% of total exit</div>
                </div>

                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Investor Preferences</div>
                  <div className="text-lg font-black text-indigo-950 mt-0.5">{fmtINR(totalPreferencePaid)}</div>
                  <div className="text-[10px] text-indigo-700 font-semibold">Priority liquidation stack</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Common Realized</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {fmtINR(Math.max(0, exitValuation - totalPreferencePaid))}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">Pro-rata distributed</div>
                </div>
              </div>

              {/* Waterfall Payout Table */}
              <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Shareholder Payout Breakdown
                    </CardTitle>
                    <span className="text-[11px] font-bold text-slate-500">
                      Total Exit: {fmtINR(exitValuation)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/70">
                        <TableRow className="uppercase text-[10px] font-bold tracking-widest">
                          <TableHead>Stakeholder</TableHead>
                          <TableHead>Paper %</TableHead>
                          <TableHead className="min-w-[130px]">Preference</TableHead>
                          <TableHead className="min-w-[110px]">Invested (₹)</TableHead>
                          <TableHead className="text-right">Cash Payout</TableHead>
                          <TableHead className="text-right">Realized %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waterfallResults.map((res) => {
                          const isFounder = res.role === 'Founder';
                          return (
                            <TableRow key={res.id} className={isFounder ? 'bg-primary/5 font-bold' : 'hover:bg-slate-50/60'}>
                              <TableCell className="font-bold text-slate-900">
                                <div>{res.name}</div>
                                <div className="text-[9px] uppercase font-bold text-slate-400">{res.payoutType}</div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{fmtPct(res.ownership)}</TableCell>
                              <TableCell>
                                {isFounder ? (
                                  <span className="text-[10px] font-bold text-slate-500">Common Stock</span>
                                ) : (
                                  <Select
                                    value={res.preferenceType}
                                    onValueChange={(val) => updateStakeholder(res.id, 'preferenceType', val)}
                                    disabled={readOnly}
                                  >
                                    <SelectTrigger className="h-7 text-[10px] font-bold bg-white border-slate-200 w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="common">Common</SelectItem>
                                      <SelectItem value="1x_non_part">1x Non-Part.</SelectItem>
                                      <SelectItem value="1x_part">1x Part.</SelectItem>
                                      <SelectItem value="2x_part">2x Part.</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell>
                                {isFounder ? (
                                  <span className="text-[10px] font-mono text-slate-400">Sweat Equity</span>
                                ) : (
                                  <Input
                                    type="number"
                                    value={res.invested || ''}
                                    placeholder="0"
                                    disabled={readOnly}
                                    onChange={(e) => updateStakeholder(res.id, 'investmentAmount', Number(e.target.value))}
                                    className="h-7 text-xs font-mono w-[100px]"
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-black text-emerald-700 text-xs">
                                {fmtINR(res.payout)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-slate-900">
                                {res.effectiveOwnership.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── CENTER: Ownership / Cash Mix (1 column) ── */}
        <Card className="lg:col-span-1 border border-slate-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                {chartMode === 'cash' ? 'Exit Cash Mix' : 'Ownership Mix'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {chartMode === 'cash' ? 'Cash distribution at exit' : 'Equity distribution'}
              </CardDescription>
            </div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setChartMode('equity')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  chartMode === 'equity' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-500'
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setChartMode('cash')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  chartMode === 'cash' ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-500'
                }`}
              >
                ₹
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartMode === 'cash' ? cashChartData : equityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(chartMode === 'cash' ? cashChartData : equityChartData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number) => [
                      chartMode === 'cash' ? fmtINR(val) : fmtPct(val),
                      chartMode === 'cash' ? 'Payout' : 'Ownership'
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── RIGHT: Decision Logic & Governance (1 column) ── */}
        <Card className="lg:col-span-1 border border-slate-200/80 bg-white rounded-2xl shadow-xs">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              {activeView === 'exit' ? 'Exit Waterfall Logic' : 'Decision Logic'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {activeView === 'exit' ? 'Liquidation checks' : 'Governance authority checks'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {activeView === 'exit' ? (
              <>
                <AuthorityCheck
                  label="Founder Cash Yield"
                  pass={founderResult.effectiveOwnership >= stats.founderPct - 2}
                  val={`${founderResult.effectiveOwnership.toFixed(1)}%`}
                  warning="Liquidation preferences are reducing your cash yield below paper ownership."
                />
                <AuthorityCheck
                  label="Preference Hurdle"
                  pass={exitValuation > totalPreferencePaid}
                  val={fmtINR(totalPreferencePaid)}
                  warning="Exit does not cover investor preferences. Common stock compromised."
                />
                <AuthorityCheck
                  label="ESOP Realization"
                  pass={esopResult > 0 || stats.esopPct === 0}
                  val={fmtINR(esopResult)}
                  warning="Employee option pool receives ₹0 at this exit valuation."
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function AuthorityCheck({ label, pass, val, warning }: { label: string; pass: boolean; val: string; warning: string }) {
  return (
    <div className={`p-3.5 rounded-xl border transition-all ${pass ? 'bg-emerald-50/60 border-emerald-200/80' : 'bg-rose-50/60 border-rose-200/80'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {pass ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span className={`text-xs uppercase font-bold tracking-wider ${pass ? 'text-emerald-900' : 'text-rose-900'}`}>{label}</span>
        </div>
        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border shadow-2xs ${pass ? 'bg-white text-emerald-700 border-emerald-200' : 'bg-white text-rose-700 border-rose-200'}`}>
          {val}
        </span>
      </div>
      <p className={`text-xs leading-relaxed mt-1 ${pass ? 'text-emerald-700/90' : 'text-rose-700'}`}>
        {pass ? 'Threshold satisfied according to cap table covenants.' : warning}
      </p>
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
