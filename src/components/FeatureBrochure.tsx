import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calculator, PieChart as PieIcon, BrainCircuit, BookA, 
  CheckCircle2, HeartPulse, ShieldAlert, Target, Info,
  TrendingUp, ShieldCheck, Percent, Gavel, Sparkles, 
  MessageSquare, AlertTriangle, Lightbulb, Zap, Globe, Search
} from 'lucide-react';

export function FeatureBrochure() {
  return (
    <div className="space-y-40 py-24 w-full">
      {/* 1. Valuation Calculator */}
      <section id="valuation" className="scroll-mt-32 flex flex-col xl:flex-row items-center gap-12 lg:gap-20">
        <div className="flex-1 space-y-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-tight">
            <Calculator className="w-4 h-4" /> Valuation Engine
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">Know your true worth before the pitch.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium">
            Stop guessing your valuation. Input your revenue, growth rate, and multiples to instantly see your implied pre-money valuation. Get a clear view of your unit economics (CAC, LTV) to prove your business model works.
          </p>
          <ul className="space-y-4 pt-2">
            {[
              'VC-Method Modeling for Pre & Post Money', 
              'Revenue Multiples Comparison by Industry', 
              'Automated survival diagnostics (LTV:CAC)'
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-4 text-base font-bold text-foreground/80">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 w-full max-w-3xl transform hover:scale-[1.02] transition-transform duration-500 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-border relative group perspective-1000">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          
          {/* Replica of ValuationCalculator UI */}
          <div className="bg-slate-50/50 p-6 space-y-6 pointer-events-none select-none">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-3 border shadow-sm bg-white">
                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1 line-clamp-1">Founder Stake</div>
                <div className="text-lg font-code font-bold text-primary">
                  65.0%
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-1">Simulated Stake</div>
              </Card>
              <Card className="p-3 border shadow-sm bg-white">
                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1 line-clamp-1">Runway</div>
                <div className="text-lg font-code font-bold text-primary">
                  18 mo
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-1">Until cash zero</div>
              </Card>
              <Card className="p-3 border shadow-sm bg-white">
                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1 line-clamp-1">ARR</div>
                <div className="text-lg font-code font-bold text-primary">
                  ₹2.4Cr
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-1">Annual Run Rate</div>
              </Card>
              <Card className="p-3 border shadow-sm bg-white">
                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1 line-clamp-1">Burn Rate</div>
                <div className="text-lg font-code font-bold text-destructive">
                  ₹5.5L
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 line-clamp-1">Monthly spend</div>
              </Card>
            </div>

            <Card className="border-2 border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground py-3 px-4">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <HeartPulse className="w-3 h-3" />
                  Survival Dashboard: Unit Economics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="p-2.5 bg-white rounded-lg border shadow-sm space-y-1">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 line-clamp-1">
                      LTV <Info className="w-2.5 h-2.5 opacity-50 shrink-0" />
                    </div>
                    <div className="text-base font-code font-bold text-primary">₹15k</div>
                    <div className="text-[8px] text-muted-foreground leading-tight line-clamp-1">Lifetime Val</div>
                  </div>
                  
                  <div className="p-2.5 bg-white rounded-lg border shadow-sm space-y-1">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 line-clamp-1">
                      CAC <Info className="w-2.5 h-2.5 opacity-50 shrink-0" />
                    </div>
                    <div className="text-base font-code font-bold text-primary">₹3.5k</div>
                    <div className="text-[8px] text-muted-foreground leading-tight line-clamp-1">Acquisition</div>
                  </div>

                  <div className="p-2.5 rounded-lg border shadow-sm space-y-1 bg-green-50 border-green-200">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 line-clamp-1">
                      LTV/CAC <Target className="w-2.5 h-2.5 opacity-50 shrink-0" />
                    </div>
                    <div className="text-base font-code font-bold text-green-700">4.3x</div>
                    <div className="text-[8px] text-muted-foreground leading-tight line-clamp-1">Eff ({'>'}3x)</div>
                  </div>

                  <div className="p-2.5 rounded-lg border shadow-sm space-y-1 bg-white">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground line-clamp-1">Profit/Cust</div>
                    <div className="text-base font-code font-bold text-primary">₹11.5k</div>
                    <div className="text-[8px] text-muted-foreground leading-tight line-clamp-1">LTV - CAC</div>
                  </div>

                  <div className="p-2.5 bg-slate-900 text-white rounded-lg border shadow-sm space-y-1">
                    <div className="text-[9px] uppercase font-bold text-slate-400 line-clamp-1">Break-Even</div>
                    <div className="text-base font-code font-bold text-accent">₹15k</div>
                    <div className="text-[8px] text-slate-400 leading-tight line-clamp-1">Max spend</div>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-start gap-2 p-2.5 bg-white/50 rounded-md border border-dashed">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-green-800 leading-snug">Your unit economics are healthy. You are making Rs. 11,500 net profit for every customer acquired.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 2. Cap Table */}
      <section id="equity" className="scroll-mt-32 flex flex-col xl:flex-row-reverse items-center gap-12 lg:gap-20">
        <div className="flex-1 space-y-8 w-full flex flex-col items-start xl:items-end xl:text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-sm font-bold tracking-tight">
            <PieIcon className="w-4 h-4" /> Equity Tracker
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">Protect your founder stake.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl">
            Don't get diluted out of your own company. Track every share implicitly, view changes round-by-round, and run "What-If" scenarios before agreeing to a new investment or creating a new ESOP pool.
          </p>
          <ul className="space-y-4 pt-2 w-full max-w-xl">
            {[
              'Proprietor-Centric Dilution Model', 
              'Partner & Investor Automatic Deductions', 
              'Future Funding Simulator'
            ].map((f, i) => (
              <li key={i} className="flex items-center xl:flex-row-reverse gap-4 text-base font-bold text-foreground/80">
                <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 w-full max-w-3xl transform hover:-translate-y-2 transition-transform duration-500 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-border relative pointer-events-none select-none">
          <div className="bg-slate-50/50 p-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-primary text-primary-foreground border-none shadow-xl p-3">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="text-[9px] uppercase font-bold tracking-widest opacity-80">Founder Stake</div>
                  <ShieldCheck className="w-3.5 h-3.5 opacity-80 shrink-0" />
                </div>
                <div className="text-2xl font-black">65.0%</div>
                <p className="text-[9px] mt-1.5 opacity-80 line-clamp-1">Remaining from 100%</p>
              </Card>
              <Card className="bg-white border-2 border-primary/10 shadow-lg p-3">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Company Val</div>
                  <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
                </div>
                <div className="text-2xl font-black text-primary">₹25.0Cr</div>
                <p className="text-[9px] mt-1.5 text-muted-foreground line-clamp-1">Market Estimate</p>
              </Card>
              <Card className="bg-white border-2 border-primary/10 shadow-lg p-3">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Allocated</div>
                  <Percent className="w-3.5 h-3.5 text-primary shrink-0" />
                </div>
                <div className="text-2xl font-black text-primary">35.0%</div>
                <p className="text-[9px] mt-1.5 text-muted-foreground line-clamp-1">To Others</p>
              </Card>
              <Card className="bg-white border-2 border-primary/10 shadow-lg p-3">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Investor Share</div>
                  <Target className="w-3.5 h-3.5 text-red-500 shrink-0" />
                </div>
                <div className="text-2xl font-black text-primary">20.0%</div>
                <p className="text-[9px] mt-1.5 text-muted-foreground line-clamp-1">Capital Infusion Weight</p>
              </Card>
            </div>

            <Card className="shadow-md border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-4 px-5">
                <div>
                  <CardTitle className="text-lg font-bold">Ownership Registry</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="border rounded-xl bg-white overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="uppercase text-[9px] font-bold tracking-widest border-b">
                        <TableHead className="py-2 h-auto">Partner</TableHead>
                        <TableHead className="py-2 h-auto">Role</TableHead>
                        <TableHead className="text-right py-2 h-auto">Owner %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-primary/5 font-bold border-b">
                        <TableCell className="py-2.5 text-xs text-nowrap">Founder</TableCell>
                        <TableCell className="py-2.5">
                          <Badge className="bg-primary text-white text-[8px] uppercase hover:bg-primary font-bold px-1.5 py-0 whitespace-nowrap">Primary Owner</Badge>
                        </TableCell>
                        <TableCell className="text-right font-code text-primary py-2.5 text-sm">65.0%</TableCell>
                      </TableRow>
                      <TableRow className="border-b">
                        <TableCell className="font-medium py-2.5 text-xs text-nowrap">Seed Fund</TableCell>
                        <TableCell className="py-2.5"><Badge variant="secondary" className="text-[8px] uppercase font-bold px-1.5 py-0">Investor</Badge></TableCell>
                        <TableCell className="text-right font-code text-primary font-bold py-2.5 text-sm">20.0%</TableCell>
                      </TableRow>
                      <TableRow className="border-b">
                        <TableCell className="font-medium py-2.5 text-xs text-nowrap">Employee Pool</TableCell>
                        <TableCell className="py-2.5"><Badge variant="secondary" className="text-[8px] uppercase font-bold px-1.5 py-0">ESOP</Badge></TableCell>
                        <TableCell className="text-right font-code text-primary font-bold py-2.5 text-sm">15.0%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 2.5. Exit Simulator */}
      <section id="exit-sim" className="scroll-mt-32 flex flex-col xl:flex-row items-center gap-12 lg:gap-20">
        <div className="flex-1 space-y-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-bold tracking-tight">
            <PieIcon className="w-4 h-4" /> Exit Waterfall
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">See exactly who gets what.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl">
            Simulate an acquisition or IPO event in real-time. Simply type in a gross exit value and see exactly how cash is distributed across your cap table, factoring in every complex liquidation preference.
          </p>
          <ul className="space-y-4 pt-2">
            {[
              '1x and 2x Participating Preferences', 
              'Visual Cash Payout Distributions', 
              'Founder Dilution Warnings at low exits'
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-4 text-base font-bold text-foreground/80">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex-1 w-full max-w-3xl relative pointer-events-none select-none hover:scale-[1.02] transition-transform duration-500">
          <Card className="border-2 shadow-xl overflow-hidden border-emerald-500/10 bg-white">
            <CardHeader className="bg-emerald-500/5 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-emerald-600" /> Payout Distribution (₹50 Cr Exit)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-base">Founders</div>
                      <div className="text-[9px] text-muted-foreground uppercase font-bold text-nowrap">Converted to Common</div>
                    </div>
                    <Badge className="bg-primary">Founder</Badge>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black font-code text-foreground">₹20.4Cr</div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">40.8% Realized</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-white shadow-sm">
                   <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-base">Series A VC</div>
                      <div className="text-[9px] text-muted-foreground uppercase font-bold text-nowrap">Pref + Participating</div>
                    </div>
                    <Badge className="bg-muted-foreground text-white">Investor</Badge>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black font-code text-foreground">₹22.5Cr</div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 text-green-600">45.0% Realized</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex flex-start gap-3 p-3 bg-red-50/50 text-red-900 border border-red-200 rounded-xl flex-col sm:flex-row">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-1 text-red-700">Founder Dilution Alert</h4>
                  <p className="text-[11px] leading-relaxed font-medium">Because of investor liquidation preferences, the founder is taking home a significantly smaller percentage of the exit than their "Paper %" suggests.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. Term Sheet Assistant */}
      <section id="term-sheet" className="scroll-mt-32 flex flex-col xl:flex-row items-center gap-12 lg:gap-20">
        <div className="flex-1 space-y-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 text-sm font-bold tracking-tight">
            <BrainCircuit className="w-4 h-4" /> Term Sheet AI
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">Never sign a bad deal.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl">
            Our AI acts as your virtual legal co-founder. Paste your clauses, and it will highlight predatory liquidation preferences, excessive anti-dilution, and give you exact counter-arguments to use with investors to protect your business.
          </p>
          <ul className="space-y-4 pt-2">
            {[
              'Identifies 2x Participating trap clauses', 
              'Red flag highlighting on Full-Ratchet Anti-dilution', 
              'Generates Founder-Friendly negotiation counters'
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-4 text-base font-bold text-foreground/80">
                <CheckCircle2 className="w-6 h-6 text-purple-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 w-full max-w-3xl relative pointer-events-none select-none hover:scale-[1.02] transition-transform duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="space-y-5">
              <Card className="border-2 border-primary/10 shadow-lg">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-primary" /> Analyze Deal Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <Textarea 
                    value="Investor shall receive a 2x Participating Liquidation Preference in the event of any sale or liquidation."
                    readOnly
                    className="min-h-[140px] resize-none border-primary/20 bg-muted/20 font-medium text-xs leading-relaxed"
                  />
                  <Button className="w-full h-10 rounded-full font-bold text-xs gap-2 focus:outline-none ring-0 pointer-events-none">
                    <Sparkles className="w-3.5 h-3.5" /> Analyzed Successfully
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="border-2 border-primary/20 bg-primary/5 overflow-hidden shadow-xl">
                <CardHeader className="bg-primary text-primary-foreground py-2.5 px-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Strategic Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 px-4 pb-4">
                  <p className="text-xs font-medium italic leading-relaxed text-foreground opacity-90">
                    "Highly aggressive liquidation terms detected. This structure ensures investors get double their money back before you see a single rupee."
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md overflow-hidden bg-white">
                <CardHeader className="bg-muted/30 pb-3 py-3 px-4">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] uppercase font-black tracking-widest whitespace-nowrap">
                      Liquidation Pref
                    </Badge>
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground opacity-50 shrink-0 ml-2" />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[8px] uppercase font-bold text-red-600 tracking-widest">
                        <ShieldAlert className="w-3 h-3 shrink-0" /> Red Flags
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed bg-red-50/50 p-2.5 rounded-lg border border-red-100">
                        2x Participating means "double dipping". They get 2x their investment returned first, THEN they take their pro-rata.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[8px] uppercase font-bold text-green-600 tracking-widest">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Founder Friendly
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed bg-green-50/50 p-2.5 rounded-lg border border-green-100">
                        "Suggest a 1x Non-Participating preference. Market standard in India."
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Term Sheet Q&A Analyser */}
      <section id="qa-analyser" className="scroll-mt-32 flex flex-col xl:flex-row-reverse items-center gap-12 lg:gap-20">
        <div className="flex-1 space-y-8 w-full flex flex-col items-start xl:items-end xl:text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-600 text-sm font-bold tracking-tight">
            <Search className="w-4 h-4" /> Term Sheet Q&A Analyser
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">Demystify any startup clause.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl">
            Ask our AI anything about liquidation preferences, dilution, or board control. Get completely truthful, founder-friendly advice with tailored counter-arguments for your next negotiation.
          </p>
          <ul className="space-y-4 pt-2 w-full max-w-xl">
            {[
              'Context-aware answers based on your startup profile', 
              'Identifies standard vs. non-standard Indian VC terms', 
              'Smart follow-up questions to deepen your knowledge'
            ].map((f, i) => (
              <li key={i} className="flex items-center xl:flex-row-reverse gap-4 text-base font-bold text-foreground/80">
                <CheckCircle2 className="w-6 h-6 text-pink-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 w-full max-w-3xl relative pointer-events-none select-none hover:scale-[1.02] transition-transform duration-500">
          <Card className="border-2 border-primary/10 shadow-lg min-h-[400px] flex flex-col bg-white">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Term Sheet Q&A Analyser
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-6">
              <div className="flex gap-4 justify-end">
                <div className="flex flex-col gap-2 items-end">
                  <div className="p-4 rounded-2xl text-sm leading-relaxed bg-primary text-primary-foreground rounded-tr-none shadow-md">
                    What happens if I accept a 2x participating preference?
                  </div>
                </div>
              </div>
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col gap-2 items-start max-w-[85%]">
                  <div className="p-4 rounded-2xl text-sm leading-relaxed bg-muted/50 border shadow-sm rounded-tl-none">
                    <p className="font-medium text-foreground">With a <strong>2x participating preference</strong>, the investor "double dips".</p>
                    <p className="mt-2 text-muted-foreground">First, they get double their investment back unconditionally. Then, they take their pro-rata share of whatever cash is left over. This heavily dilutes founder returns in modest exits.</p>
                  </div>
                  <div className="flex flex-col gap-2 mt-2 w-full">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Suggested Follow-ups</span>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-full border-primary/20 bg-background pointer-events-none">
                        How do I counter this?
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-full border-primary/20 bg-background pointer-events-none">
                        What is a 1x non-participating?
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. Glossary */}
      <section id="glossary" className="scroll-mt-32 flex flex-col xl:flex-row items-center gap-12 lg:gap-20">
        <div className="flex-1 space-y-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-sm font-bold tracking-tight">
            <BookA className="w-4 h-4" /> Founder's Glossary
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">Master the VC language.</h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl">
            Stop pretending to understand what "Full Ratchet" means in meetings. Our comprehensive glossary breaks down complex VC legal jargon into plain English with practical Indian founder examples. Ask the AI to contextualize any concept.
          </p>
          <ul className="space-y-4 pt-2 w-full max-w-xl">
            {[
              'Direct Indian Market Context & INR Examples', 
              'Pre-loaded dark pattern warnings', 
              'AI Explainer answers specific edge cases'
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-4 text-base font-bold text-foreground/80">
                <CheckCircle2 className="w-6 h-6 text-amber-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 w-full max-w-3xl relative pointer-events-none select-none hover:scale-[1.02] transition-transform duration-500">
          <div className="p-6 bg-slate-50/50 rounded-3xl ring-1 ring-border shadow-2xl space-y-5">
            <div className="grid grid-cols-4 gap-2.5">
              <Card className="bg-primary/5 border-primary/10 shadow-none p-3 flex flex-col items-center justify-center text-center gap-0.5">
                <span className="text-xl font-black text-primary">45+</span>
                <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest leading-tight">Terms</span>
              </Card>
              <Card className="bg-primary/5 border-primary/10 shadow-none p-3 flex flex-col items-center justify-center text-center gap-1">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest leading-tight">₹ Ex's</span>
              </Card>
              <Card className="bg-primary/5 border-primary/10 shadow-none p-3 flex flex-col items-center justify-center text-center gap-1">
                <Globe className="w-5 h-5 text-green-600" />
                <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest leading-tight">India</span>
              </Card>
              <Card className="bg-primary/5 border-primary/10 shadow-none p-3 flex flex-col items-center justify-center text-center gap-1">
                <Search className="w-5 h-5 text-primary" />
                <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest leading-tight">Search</span>
              </Card>
            </div>

            <Card className="flex flex-col h-full bg-white border-primary/5 shadow-md rounded-2xl overflow-hidden group">
              <CardHeader className="pb-3 pt-5 px-5 space-y-3 flex flex-col">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="font-code uppercase text-[8px] tracking-widest px-2.5 py-0.5 rounded-md border-amber-500/30 text-amber-700 bg-amber-500/5">
                    Funding
                  </Badge>
                  <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                    <Info className="w-3 h-3" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Pro-Rata Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5 flex flex-col">
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  The right, but not the obligation, of an investor to maintain their initial percentage of ownership during subsequent rounds.
                </p>
                
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-primary/5 border-l-2 border-primary rounded-r-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[8px] uppercase tracking-widest text-primary">
                      <Zap className="w-3 h-3 shrink-0" /> Example
                    </div>
                    <p className="text-xs font-medium leading-relaxed italic text-foreground opacity-80">
                      "An angel owning 5% exercises it to buy 5% of shares in your Series A."
                    </p>
                  </div>

                  <div className="p-2.5 bg-green-50 border border-green-200/50 rounded-xl flex gap-2.5">
                    <div className="shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-black text-[8px] uppercase tracking-widest text-green-800">Strategic Tip</div>
                      <p className="text-[11px] font-medium leading-snug text-green-900">
                        Standard practice, but ban 'Super Pro-Rata'.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
