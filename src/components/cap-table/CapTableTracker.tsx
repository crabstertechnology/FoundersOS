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
  CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { TreemapChart, SunburstChart, TreeDiagram, WaterfallChart } from '@/components/charts';
import { 
  useFirestore, useCollection, useDoc, useMemoFirebase, 
  addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';

interface CapTableTrackerProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
}

const COLORS = ['#1f4fad', '#0fe4e8', '#16a34a', '#d946ef', '#f59e0b', '#ef4444'];

export function CapTableTracker({ userId, companyProfileId, readOnly }: CapTableTrackerProps) {
  const [activeView, setActiveView] = useState('registry');
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

  const chartData = useMemo(() => {
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

  // Visual Equity Maps Computations
  const treemapData = useMemo(() => {
    return [
      {
        name: 'Founders',
        value: Math.max(1, stats.founderPct),
        color: '#4f46e5',
        children: [
          { name: 'Sasitharan (Founder)', value: stats.founderPct, color: '#4f46e5', description: 'Common stock founder control stake' },
        ],
      },
      {
        name: 'Strategic Investors',
        value: Math.max(1, stats.investorPct || 15),
        color: '#0284c7',
        children: (stakeholders || []).filter(s => s.role === 'Investor').length > 0
          ? (stakeholders || [])
              .filter(s => s.role === 'Investor' && (s.ownershipPercentage || 0) > 0)
              .map((s, idx) => ({
                name: s.name,
                value: s.ownershipPercentage || 0,
                color: ['#0284c7', '#0369a1', '#075985'][idx % 3],
                description: 'Preferred Series & Angel investment shares'
              }))
          : [
              { name: 'Lead Seed Investor', value: 10, color: '#0284c7', description: 'Early institutional seed stake' },
              { name: 'Angel Syndicate', value: 5, color: '#0369a1', description: 'Syndicate operator capital' },
            ],
      },
      {
        name: 'ESOP Pool',
        value: Math.max(1, stats.esopPct || 10),
        color: '#10b981',
        children: [
          { name: 'Core Team Pool', value: stats.esopPct || 10, color: '#059669', description: 'Unallocated Option pool reserved for future hires' },
        ],
      },
      {
        name: 'Advisors & Partners',
        value: Math.max(0, 100 - (stats.founderPct + (stats.investorPct || 15) + (stats.esopPct || 10))),
        color: '#f59e0b',
        children: (stakeholders || []).filter(s => !['Investor', 'ESOP'].includes(s.role) && s.name.toLowerCase() !== 'sasitharan').length > 0
          ? (stakeholders || [])
              .filter(s => !['Investor', 'ESOP'].includes(s.role) && s.name.toLowerCase() !== 'sasitharan')
              .map(s => ({
                name: s.name,
                value: s.ownershipPercentage || 0,
                color: '#d97706',
                description: s.role || 'Advisory partner'
              }))
          : [
              { name: 'Technical Advisor', value: 2, color: '#d97706', description: 'Advisory share grant' },
            ],
      }
    ].filter(cat => cat.value > 0);
  }, [stats, stakeholders]);

  const sunburstData = useMemo(() => {
    return [
      {
        name: 'Founders',
        color: '#4f46e5',
        children: [
          { name: 'Sasitharan', value: stats.founderPct, color: '#6366f1' },
        ],
      },
      {
        name: 'Investors',
        color: '#0284c7',
        children: (stakeholders || []).filter(s => s.role === 'Investor' && (s.ownershipPercentage || 0) > 0).length > 0
          ? (stakeholders || []).filter(s => s.role === 'Investor').map(s => ({ name: s.name, value: s.ownershipPercentage || 0 }))
          : [
              { name: 'Seed Capital', value: 12 },
              { name: 'Angels', value: 6 },
            ],
      },
      {
        name: 'Option Pool',
        color: '#059669',
        children: [
          { name: 'ESOP Reserve', value: stats.esopPct || 10, color: '#10b981' },
        ],
      },
      {
        name: 'Advisors',
        color: '#d97706',
        children: [
          { name: 'Strategic Advisors', value: Math.max(2, stats.totalAllocatedToOthers > 0 ? 3 : 2), color: '#f59e0b' },
        ],
      },
    ];
  }, [stats, stakeholders]);

  const dilutionWaterfallData = useMemo(() => {
    const esopDeduction = stats.esopPct || 10;
    const seedDeduction = stats.investorPct || 15;
    const currentFounder = stats.founderPct;

    return [
      { name: 'Day 0 Founding', value: 100, isTotal: true, category: 'base' as const, description: '100% initial common founder equity' },
      { name: 'ESOP Pool Creation', value: -esopDeduction, category: 'negative' as const, description: 'Option pool carved out from founder stake' },
      { name: 'Seed Round Dilution', value: -seedDeduction, category: 'negative' as const, description: 'Dilution to strategic seed investors' },
      { name: 'Current Founder Stake', value: currentFounder, isTotal: true, category: 'total' as const, description: 'Net retained equity after rounds' },
    ];
  }, [stats]);

  const treeHierarchyData = useMemo(() => {
    return {
      id: 'root',
      label: 'FounderOS Enterprise',
      detail: 'Cap Table Governance',
      tag: '100% Equity',
      tagColor: 'bg-indigo-500 text-white',
      children: [
        {
          id: 'common',
          label: 'Class A Common',
          detail: `${stats.founderPct.toFixed(1)}% Voting Control`,
          tag: 'Founders',
          tagColor: 'bg-emerald-600 text-white',
          children: [
            { id: 'f1', label: 'Sasitharan', detail: `${stats.founderPct.toFixed(1)}% Stake` },
          ],
        },
        {
          id: 'pref',
          label: 'Series Seed Preferred',
          detail: `${(stats.investorPct || 15)}% Non-Participating`,
          tag: '1x Liquidation',
          tagColor: 'bg-blue-600 text-white',
          children: [
            { id: 'inv1', label: 'Institutional Seed Lead', detail: 'Preferred Stock' },
            { id: 'inv2', label: 'Angel Syndicate', detail: 'SAFE Note Convertible' },
          ],
        },
        {
          id: 'esop',
          label: 'ESOP Option Trust',
          detail: `${(stats.esopPct || 10)}% Unallocated Pool`,
          tag: 'Incentive',
          tagColor: 'bg-amber-600 text-white',
          children: [
            { id: 'team', label: 'Core Engineering & Sales', detail: '4-Yr Vesting / 1-Yr Cliff' },
          ],
        },
      ],
    };
  }, [stats]);

  // Actions
  const addStakeholder = () => {
    if (readOnly || !shareholdersRef) return;
    addDocumentNonBlocking(shareholdersRef, {
      name: 'New Partner',
      role: 'Partner',
      ownershipPercentage: 0,
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
    <div className="space-y-8">
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
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Market Valuation</div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtINR(stats.latestVal)}</div>
            <div className="mt-4 text-[9px] font-code text-muted-foreground bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col gap-1.5 mt-auto">
              <span className="font-bold uppercase tracking-widest text-[8px] text-slate-400">Post-Money Anchor</span>
              <span className="flex justify-center items-center text-[10px] font-black text-primary">
                Determines Equity Prices
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
              <Target className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-3xl font-black text-primary">{fmtPct(stats.investorPct)}</div>
            <div className="mt-4 text-[9px] font-code text-muted-foreground bg-red-50 p-2.5 rounded-lg border border-red-100 flex flex-col gap-1.5 mt-auto text-red-800">
              <span className="font-bold uppercase tracking-widest text-[8px]">External Capital Stake</span>
              <span className="flex justify-between items-center text-[10px] font-black">
                <span>Total External</span><span className="opacity-50">=</span><span>{fmtPct(stats.investorPct)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4-Column Grid: Registry (2 cols, up to Market Valuation) | Mix (1 col) | Decision Logic (1 col) ── */}
      <div className={`grid grid-cols-1 ${activeView === 'visual' ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-4 items-start`}>

        {/* ── LEFT: Ownership Registry / Visual Suite ── */}
        <div className={activeView === 'visual' ? 'lg:col-span-1 w-full' : 'lg:col-span-2'}>
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="registry" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <User className="w-3.5 h-3.5" /> Ownership Registry
                </TabsTrigger>
                <TabsTrigger value="rounds" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <History className="w-3.5 h-3.5" /> History
                </TabsTrigger>
                <TabsTrigger value="simulator" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm text-primary font-bold">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Dilution Engine
                </TabsTrigger>
                <TabsTrigger value="visual" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm text-indigo-700 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Visual Equity Maps
                </TabsTrigger>
              </TabsList>
              {!readOnly && activeView === 'registry' && (
                <Button onClick={addStakeholder} variant="outline" size="sm" className="gap-2 font-bold rounded-full text-xs">
                  <UserPlus className="w-3.5 h-3.5" /> Add Partner
                </Button>
              )}
              {!readOnly && activeView === 'rounds' && (
                <Dialog open={isAddingRound} onOpenChange={setIsAddingRound}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 font-bold rounded-full text-xs">
                      <Plus className="w-3.5 h-3.5" /> Record Round
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
                      <Button onClick={handleRecordRound} className="bg-primary text-white font-bold rounded-full px-6">Save Round</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <TabsContent value="registry">
              <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-xs">
                <CardContent className="pt-4 p-4">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="uppercase text-[10px] font-bold tracking-widest">
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Ownership %</TableHead>
                        {!readOnly && <TableHead className="w-10"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-primary/5 font-bold">
                        <TableCell>Sasitharan (Founder)</TableCell>
                        <TableCell><Badge className="bg-primary text-white text-[9px] uppercase">Primary Owner</Badge></TableCell>
                        <TableCell className="text-right font-mono text-primary">{fmtPct(stats.founderPct)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {(stakeholders || []).filter(s => s.name.toLowerCase() !== 'sasitharan').map((s) => (
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
                            <div className="flex items-center justify-end gap-2">
                              <Input type="number" value={s.ownershipPercentage || ''} className="h-8 w-20 border-none bg-muted/30 text-right font-mono font-bold text-primary" onChange={e => updateStakeholder(s.id, 'ownershipPercentage', Number(e.target.value))} disabled={readOnly} />
                              <span className="text-xs font-bold">%</span>
                            </div>
                          </TableCell>
                          {!readOnly && (
                            <TableCell>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDocumentNonBlocking(doc(shareholdersRef!, s.id))}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {stats.totalAllocatedToOthers > 100 && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Over-allocation Alert</AlertTitle>
                      <AlertDescription>You have allocated {fmtPct(stats.totalAllocatedToOthers)} to others. This exceeds Sasitharan's 100% capacity.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rounds">
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

            <TabsContent value="simulator">
              <DilutionSimulator stats={stats} stakeholders={stakeholders} />
            </TabsContent>

            <TabsContent value="visual" className="mt-0 focus-visible:outline-none space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Treemap: Ownership Share Density */}
                <div className="lg:col-span-7">
                  <TreemapChart
                    title="Cap Table Share Density (Treemap Model)"
                    subtitle="Weighted surface area breakdown of company ownership by class and shareholder"
                    data={treemapData}
                    isCurrency={false}
                    unit="%"
                    height={320}
                  />
                </div>

                {/* Sunburst: Radial Equity Class Hierarchy */}
                <div className="lg:col-span-5">
                  <SunburstChart
                    title="Radial Shareholder Breakdown (Sunburst)"
                    subtitle="Inner ring: Equity class | Outer ring: Specific stakeholder stake"
                    data={sunburstData}
                    isCurrency={false}
                    unit="%"
                    height={320}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Waterfall: Dilution Bridge */}
                <div className="lg:col-span-6">
                  <WaterfallChart
                    title="Founder Dilution Walk (Day 0 to Present)"
                    subtitle="Tracking equity step-downs from founding 100% through ESOP and investment rounds"
                    data={dilutionWaterfallData}
                    isCurrency={false}
                    unit="%"
                    height={300}
                  />
                </div>

                {/* Tree Diagram: Governance & Stock Architecture */}
                <div className="lg:col-span-6">
                  <TreeDiagram
                    title="Corporate Governance & Stock Hierarchy (Tree Diagram)"
                    subtitle="Interactive tree model of share classes, voting control, and vesting pools"
                    data={treeHierarchyData}
                    height={300}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {activeView !== 'visual' && (
          <>
            {/* ── CENTER: Ownership Mix (1 column) ── */}
            <Card className="lg:col-span-1 border border-slate-200/80 bg-white rounded-2xl shadow-xs overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <PieIcon className="w-4 h-4 text-indigo-600" /> Ownership Mix
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">Equity distribution</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
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

            {/* ── RIGHT: Decision Logic & Governance (1 column) ── */}
            <Card className="lg:col-span-1 border border-slate-200/80 bg-white rounded-2xl shadow-xs">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" /> Decision Logic
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">Governance authority checks</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
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
          </>
        )}

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
