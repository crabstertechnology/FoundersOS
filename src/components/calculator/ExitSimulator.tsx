'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fmtINR } from '@/lib/utils/formatters';
import { 
  ArrowRight, ShieldCheck, Target, TrendingUp, AlertTriangle, Info, Plus, Trash2, PieChart, InfoIcon, Database, Beaker, Save, Loader2
} from 'lucide-react';

import { useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

interface Shareholder {
  id: string;
  name: string;
  role: 'Founder' | 'Investor' | 'ESOP' | string;
  ownership: number; // percentage
  invested: number; // in INR
  preferenceType: 'common' | '1x_non_part' | '1x_part' | '2x_part' | string;
}

interface ExitSimulatorProps {
  userId?: string;
  companyProfileId?: string;
}

export function ExitSimulator({ userId, companyProfileId }: ExitSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'sandbox'>('live');
  const firestore = useFirestore();

  // --- LIVE DATA FETCHING ---
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  const { data: companyDoc } = useDoc(profileRef) || {};
  const { data: shareholdersCollection } = useCollection(shareholdersRef) || {};

  const liveShareholders = useMemo<Shareholder[]>(() => {
    if (!shareholdersCollection) return [];
    return shareholdersCollection.map(sh => ({
      id: sh.id,
      name: sh.name || 'Unknown',
      role: sh.role || 'Investor',
      ownership: Number(sh.ownershipPercentage) || 0,
      invested: Number(sh.investmentAmount) || 0,
      preferenceType: sh.preferenceType || (sh.role === 'Founder' ? 'common' : '1x_non_part')
    }));
  }, [shareholdersCollection]);

  // Use Post-Money valuation as a default exit baseline, fallback to 50Cr if nothing is set
  const liveExitValue = (companyDoc?.postMoneyValuation) || 500000000;

  // --- STATE MANAGEMENT ---
  // Sandbox mode starts exactly at zero
  const [sandboxExitValue, setSandboxExitValue] = useState<number>(0);
  const [sandboxShareholders, setSandboxShareholders] = useState<Shareholder[]>([]);

  // Overrides for Live mode (allows them to mock things without saving to Firebase)
  const [overrideExitValue, setOverrideExitValue] = useState<number | null>(null);
  const [overrideShareholders, setOverrideShareholders] = useState<Shareholder[] | null>(null);

  const [isSavingExit, setIsSavingExit] = useState(false);

  const handleSaveExitValue = async () => {
    if (overrideExitValue === null || !profileRef) return;
    setIsSavingExit(true);
    try {
      await updateDocumentNonBlocking(profileRef, {
        postMoneyValuation: overrideExitValue
      });
      setOverrideExitValue(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingExit(false);
    }
  };

  const [isSavingShareholders, setIsSavingShareholders] = useState(false);

  const handleSaveShareholders = async () => {
    if (!overrideShareholders || !firestore || !userId || !companyProfileId) return;
    setIsSavingShareholders(true);
    try {
      const liveIds = new Set(liveShareholders.map(s => s.id));
      const overrideIds = new Set(overrideShareholders.map(s => s.id));
      
      const deletions = liveShareholders.filter(s => !overrideIds.has(s.id));
      for (const del of deletions) {
        const dRef = doc(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders', del.id);
        await deleteDoc(dRef);
      }

      for (const sh of overrideShareholders) {
        const dataPayload = {
          name: sh.name,
          role: sh.role,
          ownershipPercentage: sh.ownership,
          investmentAmount: sh.invested,
          preferenceType: sh.preferenceType
        };

        if (liveIds.has(sh.id)) {
          const dRef = doc(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders', sh.id);
          await updateDoc(dRef, dataPayload);
        } else {
          const cRef = collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
          await addDoc(cRef, dataPayload);
        }
      }
      
      setOverrideShareholders(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingShareholders(false);
    }
  };

  // Clear overrides when toggling tabs so live data feels completely fresh
  useEffect(() => {
    if (activeTab === 'live') {
      setOverrideExitValue(null);
      setOverrideShareholders(null);
    }
  }, [activeTab, liveShareholders, liveExitValue]);

  // Determine which data to actually calculate and render
  const currentExitValue = activeTab === 'sandbox' 
    ? sandboxExitValue 
    : (overrideExitValue !== null ? overrideExitValue : liveExitValue);

  const currentShareholders = activeTab === 'sandbox'
    ? sandboxShareholders
    : (overrideShareholders !== null ? overrideShareholders : liveShareholders);

  // Setters
  const setExitValue = (v: number) => {
    if (activeTab === 'sandbox') setSandboxExitValue(v);
    else setOverrideExitValue(v);
  };

  const setShareholders = (shs: Shareholder[]) => {
    if (activeTab === 'sandbox') setSandboxShareholders(shs);
    else setOverrideShareholders(shs);
  };

  const addShareholder = () => {
    setShareholders([
      ...currentShareholders, 
      { id: Date.now().toString(), name: 'New Investor', role: 'Investor', ownership: 0, invested: 0, preferenceType: '1x_non_part' }
    ]);
  };

  const removeShareholder = (id: string) => {
    setShareholders(currentShareholders.filter(s => s.id !== id));
  };

  // --- CALCULATION LOGIC ---
  const waterfallResults = useMemo(() => {
    let remainingPool = currentExitValue;
    
    // Step 1: Calculate preferences
    const preferences = currentShareholders.map(sh => {
      let prefAmount = 0;
      if (sh.preferenceType === '1x_non_part' || sh.preferenceType === '1x_part') {
        prefAmount = sh.invested;
      } else if (sh.preferenceType === '2x_part') {
        prefAmount = sh.invested * 2;
      }
      return { ...sh, prefAmount };
    });

    const totalPreferenceDemand = preferences.reduce((sum, sh) => sum + sh.prefAmount, 0);
    
    // Early exit: Pool doesn't even cover preferences
    if (remainingPool <= totalPreferenceDemand && totalPreferenceDemand > 0) {
      return preferences.map(sh => {
        const payout = (sh.prefAmount / totalPreferenceDemand) * remainingPool;
        return {
          ...sh,
          payout,
          payoutType: 'Preference Capped (Liquidation)',
          effectiveOwnership: currentExitValue > 0 ? (payout / currentExitValue) * 100 : 0
        };
      });
    }

    remainingPool -= totalPreferenceDemand;

    // Step 2: Determine Conversions
    let commonOwnershipBase = 0;
    const intermediate = preferences.map(sh => {
      const proRataGross = (sh.ownership / 100) * currentExitValue;
      
      let convertsToCommon = false;
      if (sh.preferenceType === '1x_non_part') {
        if (proRataGross > sh.prefAmount) {
          convertsToCommon = true;
          remainingPool += sh.prefAmount; // Put preference back into pool
          sh.prefAmount = 0; // Forfeited preference
        }
      }

      if (sh.preferenceType === 'common' || sh.preferenceType === '1x_part' || sh.preferenceType === '2x_part' || convertsToCommon) {
        commonOwnershipBase += sh.ownership;
      }

      return { ...sh, convertsToCommon, proRataGross };
    });

    // Step 3: Distribute remaining pool to common and participating
    return intermediate.map(sh => {
      let commonShare = 0;
      if (sh.preferenceType === 'common' || sh.preferenceType === '1x_part' || sh.preferenceType === '2x_part' || sh.convertsToCommon) {
        // Adjust ownership relative to the participating pool (normalized)
        const adjustedOwnership = commonOwnershipBase > 0 ? (sh.ownership / commonOwnershipBase) : 0;
        commonShare = remainingPool * adjustedOwnership;
      }

      const totalPayout = sh.prefAmount + commonShare;
      const effectiveOwnership = currentExitValue > 0 ? (totalPayout / currentExitValue) * 100 : 0;
      
      let payoutType = 'Common Pro-Rata';
      if (sh.convertsToCommon) payoutType = 'Converted to Common (Better Return)';
      else if (sh.preferenceType.includes('part') && commonShare > 0) payoutType = 'Preference + Participating Pro-Rata';
      else if (sh.prefAmount > 0 && commonShare === 0) payoutType = 'Preference Capped';

      return {
        ...sh,
        payout: totalPayout,
        effectiveOwnership,
        payoutType
      };
    });
  }, [currentExitValue, currentShareholders]);

  const totalOwnership = currentShareholders.reduce((sum, sh) => sum + sh.ownership, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-center mb-8">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="live" className="gap-2">
              <Database className="w-4 h-4" /> Live Sync
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-2">
              <Beaker className="w-4 h-4" /> Sandbox mode
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Inputs */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Exit Scenario
              </CardTitle>
              <CardDescription>
                {activeTab === 'live' 
                  ? 'Your current post-money valuation is set as the baseline exit.' 
                  : 'Simulate an acquisition or IPO from scratch.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2 relative">
                <label className="inline-flex text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 group cursor-help relative z-30">
                  Gross Exit Value (₹)
                  <InfoIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  
                  {/* Educational Tooltip */}
                  <div className="absolute left-0 top-6 w-[250px] md:w-[320px] p-4 bg-muted/95 backdrop-blur-md border border-primary/20 shadow-2xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none text-xs leading-relaxed font-medium normal-case tracking-normal">
                    <p className="font-bold text-sm mb-2 text-foreground">How to estimate an exit?</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li><strong className="text-primary tracking-tight block text-xs">SaaS / Tech / AI:</strong> ARR × Revenue Multiple (e.g., 5x - 10x)</li>
                      <li><strong className="text-primary tracking-tight block text-xs">Profitable Business:</strong> EBITDA × Industry Multiple (e.g., 10x - 15x)</li>
                      <li><strong className="text-primary tracking-tight block text-xs">Recently Raised Capital:</strong> Your latest agreed Post-Money Valuation</li>
                    </ul>
                  </div>
                </label>
                <div className="relative z-20">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-code">₹</span>
                  <Input 
                    type="number" 
                    value={currentExitValue} 
                    onChange={(e) => setExitValue(Number(e.target.value))}
                    className="pl-8 font-code font-bold text-lg border-primary/20 focus-visible:ring-primary"
                  />
                </div>
                {activeTab === 'live' && overrideExitValue !== null && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[10px] text-amber-600 flex items-center gap-1 font-bold">
                      <InfoIcon className="w-3 h-3" /> Custom override active
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleSaveExitValue} 
                      disabled={isSavingExit}
                      className="h-6 text-[10px] px-2"
                    >
                      {isSavingExit ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save to Profile
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-shadow-sm flex flex-col h-auto max-h-[800px]">
            <CardHeader className="pb-4 shrink-0 border-b">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-md font-bold">Cap Table Rules</CardTitle>
                  {activeTab === 'live' && overrideShareholders !== null && (
                    <Button 
                      size="sm" 
                      onClick={handleSaveShareholders} 
                      disabled={isSavingShareholders}
                      className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700 font-bold"
                    >
                      {isSavingShareholders ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Sync Changes
                    </Button>
                  )}
                </div>
                <Badge variant={Math.round(totalOwnership) === 100 ? "default" : "destructive"}>{Math.round(totalOwnership)}% Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto p-4 flex-1">
              {currentShareholders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                  No shareholders found.<br/> Add one to start building the waterfall.
                </div>
              ) : (
                currentShareholders.map((sh, idx) => (
                  <div key={sh.id} className="p-3 bg-muted/20 border rounded-xl space-y-3 relative group">
                    <div className="flex justify-between items-center pr-6">
                      <Input 
                        value={sh.name}
                        onChange={(e) => {
                          const newSh = [...currentShareholders];
                          newSh[idx].name = e.target.value;
                          setShareholders(newSh);
                        }}
                        className="h-7 text-sm font-bold bg-transparent border-none px-0 focus-visible:ring-0 shadow-none w-[140px]"
                      />
                      <Badge variant="outline" className="text-[10px] uppercase">{sh.role}</Badge>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-1 right-1 h-6 w-6 opacity-50 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                      onClick={() => removeShareholder(sh.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Ownership %</label>
                        <Input 
                          type="number" 
                          value={sh.ownership} 
                          onChange={(e) => {
                            const newSh = [...currentShareholders];
                            newSh[idx].ownership = Number(e.target.value);
                            setShareholders(newSh);
                          }}
                          className="h-8 text-xs font-code"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Invested (₹)</label>
                        <Input 
                          type="number" 
                          value={sh.invested}
                          disabled={sh.preferenceType === 'common'}
                          onChange={(e) => {
                            const newSh = [...currentShareholders];
                            newSh[idx].invested = Number(e.target.value);
                            setShareholders(newSh);
                          }}
                          className="h-8 text-xs font-code"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-muted-foreground mb-1 block">Liquidation Preference</label>
                      <select 
                        className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                        value={sh.preferenceType}
                        onChange={(e) => {
                          const newSh = [...currentShareholders];
                          newSh[idx].preferenceType = e.target.value as any;
                          setShareholders(newSh);
                        }}
                      >
                        <option value="common">Common (No Preference)</option>
                        <option value="1x_non_part">1x Non-Participating</option>
                        <option value="1x_part">1x Participating</option>
                        <option value="2x_part">2x Participating (Toxic)</option>
                      </select>
                    </div>
                  </div>
                ))
              )}

              <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addShareholder}>
                <Plus className="w-4 h-4" /> Add Shareholder
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Results */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" /> Payout Distribution
              </CardTitle>
              <CardDescription>How the {fmtINR(currentExitValue)} exit is physically distributed in cash.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {waterfallResults.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground font-medium">
                  Add shareholders to see the payout distribution!
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {waterfallResults.map((res) => (
                      <div key={res.id} className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-lg">{res.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold">{res.payoutType}</div>
                          </div>
                          <Badge className={res.role === 'Founder' ? 'bg-primary' : (res.role === 'ESOP' ? 'bg-amber-500' : 'bg-muted-foreground')}>
                            {res.role}
                          </Badge>
                        </div>
                        
                        <div className="mt-4 flex justify-between items-end">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Cash Payout</div>
                            <div className="text-2xl font-black font-code text-foreground">
                              {fmtINR(res.payout)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Effective Yield</div>
                            <div className={`text-lg font-bold font-code ${res.effectiveOwnership < res.ownership ? 'text-red-500' : 'text-green-600'}`}>
                              {res.effectiveOwnership.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border rounded-xl bg-white overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="uppercase text-[10px] font-bold tracking-widest border-b">
                          <TableHead>Shareholder</TableHead>
                          <TableHead>Paper %</TableHead>
                          <TableHead className="hidden md:table-cell">Pref. Rights</TableHead>
                          <TableHead className="text-right">Actual Payout</TableHead>
                          <TableHead className="text-right">Realized %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waterfallResults.map(res => (
                          <TableRow key={res.id} className="border-b">
                            <TableCell className="font-bold py-3">{res.name}</TableCell>
                            <TableCell className="font-code text-muted-foreground py-3">{res.ownership}%</TableCell>
                            <TableCell className="hidden md:table-cell py-3">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-transparent truncate max-w-[120px]">
                                {res.preferenceType.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-code font-bold text-foreground py-3">{fmtINR(res.payout)}</TableCell>
                            <TableCell className={`text-right font-code font-bold py-3 ${res.effectiveOwnership < res.ownership - 0.1 ? 'text-red-500' : (res.effectiveOwnership > res.ownership + 0.1 ? 'text-green-600' : 'text-foreground')}`}>
                              {res.effectiveOwnership.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {waterfallResults.find(r => r.role === 'Founder' && r.effectiveOwnership < r.ownership - 5) && (
                    <div className="mt-6 flex flex-start gap-3 p-4 bg-red-50/50 text-red-900 border border-red-200 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm mb-1 text-red-700">Founder Dilution Alert</h4>
                        <p className="text-xs leading-relaxed font-medium">Because of investor liquidation preferences, the founder is taking home a significantly smaller percentage of the exit than their "Paper %" suggests. At lower exit values, preference stacks wipe out common stock (founders & employees).</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
