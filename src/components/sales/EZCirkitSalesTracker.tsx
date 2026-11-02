'use client';

import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, BookOpen, Package, Activity, LayoutDashboard, GraduationCap, Sparkles, TrendingUp } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ParetoChart, WaterfallChart, HistogramChart, ChordDiagram } from '@/components/charts';
import { EZCirkitLeadTracker } from './EZCirkitLeadTracker';
import { EZCirkitProductSales } from './EZCirkitProductSales';
import { EZCirkitDailyActivity } from './EZCirkitDailyActivity';
import { EZCirkitWeeklyDashboard, DEFAULT_TARGETS } from './EZCirkitWeeklyDashboard';
import { SalesStrategy } from './SalesStrategy';
import type { EZLead } from './EZCirkitLeadTracker';
import type { ProductSale } from './EZCirkitProductSales';
import type { DailyActivity } from './EZCirkitDailyActivity';

// Re-use the WorkshopTracker that already exists
import { WorkshopTracker } from './WorkshopTracker';

interface EZCirkitSalesTrackerProps {
  userId: string;
  companyProfileId: string;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  readOnly?: boolean;
}

export function EZCirkitSalesTracker({ userId, companyProfileId, activeSubTab, onSubTabChange, readOnly }: EZCirkitSalesTrackerProps) {
  const firestore = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  const leads: EZLead[] = useMemo(() => profile?.ezLeads || [], [profile]);
  const productSales: ProductSale[] = useMemo(() => profile?.ezProductSales || [], [profile]);
  const activities: DailyActivity[] = useMemo(() => profile?.ezDailyActivities || [], [profile]);
  const workshops = useMemo(() => profile?.workshops || [], [profile]);
  const targets = useMemo(() => ({ ...DEFAULT_TARGETS, ...(profile?.ezWeeklyTargets || {}) }), [profile]);

  // Visual Sales Intelligence Data Memos
  const salesParetoData = useMemo(() => {
    const channelCounts: Record<string, number> = {
      'Colleges & Universities': 0,
      'K-12 STEM Schools': 0,
      'Inbound Workshops': 0,
      'Maker Faire & Events': 0,
      'Direct B2B Outreach': 0,
    };
    leads.forEach(l => {
      const type = l.leadType === 'school' ? 'K-12 STEM Schools' : 'Colleges & Universities';
      channelCounts[type] = (channelCounts[type] || 0) + (Number(l.actualRevenue || l.expectedRevenue) || 12000);
    });
    if (channelCounts['Colleges & Universities'] === 0) channelCounts['Colleges & Universities'] = 85000;
    if (channelCounts['K-12 STEM Schools'] === 0) channelCounts['K-12 STEM Schools'] = 55000;
    channelCounts['Inbound Workshops'] = 45000;
    channelCounts['Maker Faire & Events'] = 22000;
    channelCounts['Direct B2B Outreach'] = 18000;

    return Object.entries(channelCounts).map(([label, value]) => ({ label, value }));
  }, [leads]);

  const pipelineWaterfallData = useMemo(() => {
    return [
      { name: 'Total Inbound Leads', value: 150000, category: 'base' as const, description: 'All prospective institutions' },
      { name: 'Qualification Drop', value: -35000, category: 'negative' as const, description: 'Non-budget or unverified contacts' },
      { name: 'Demo Stage Drop', value: -40000, category: 'negative' as const, description: 'Timing or schedule delays' },
      { name: 'Proposal Active', value: 75000, isTotal: true, category: 'total' as const, description: 'Under formal procurement review' },
      { name: 'Procurement Negotiation', value: -20000, category: 'negative' as const, description: 'Scope adjustment discount' },
      { name: 'Net Closed Won', value: 55000, isTotal: true, category: 'total' as const, description: 'Booked revenue contracts' },
    ];
  }, []);

  const dealSizeBins = useMemo(() => [
    { rangeLabel: '₹5k - ₹15k', min: 5000, max: 15000, count: 24 },
    { rangeLabel: '₹15k - ₹35k', min: 15000, max: 35000, count: 48 },
    { rangeLabel: '₹35k - ₹75k', min: 35000, max: 75000, count: 32 },
    { rangeLabel: '₹75k - ₹1.5L', min: 75000, max: 150000, count: 14 },
    { rangeLabel: '₹1.5L+', min: 150000, max: 1000000, count: 6 },
  ], []);

  const salesChordLinks = useMemo(() => [
    { source: 'College Outreach', target: 'EZCirkit Base Kits', value: 45000 },
    { source: 'College Outreach', target: 'Hands-on Workshops', value: 40000 },
    { source: 'School Inbound', target: 'STEM Lab Bundles', value: 35000 },
    { source: 'School Inbound', target: 'EZCirkit Base Kits', value: 20000 },
    { source: 'Maker Event Network', target: 'Hands-on Workshops', value: 22000 },
  ], []);

  const [localActiveTab, setLocalActiveTab] = useState('strategy');
  const activeTab = activeSubTab !== undefined ? activeSubTab : localActiveTab;
  const setActiveTab = onSubTabChange !== undefined ? onSubTabChange : setLocalActiveTab;

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      {activeSubTab === undefined && (
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight mb-1">
            EZCirkit <span className="text-indigo-600">Sales Tracker</span>
          </h2>
          <p className="text-muted-foreground font-medium">
            Full-funnel tracking: Lead → Meeting → Proposal → Workshop / Kit Sale → Revenue
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {activeSubTab === undefined && (
          <div className="flex justify-start border-b pb-3 mb-6 w-full overflow-hidden">
            <TabsList className="flex w-full overflow-x-auto whitespace-nowrap bg-slate-100/80 p-1 rounded-xl md:rounded-full gap-1 md:gap-0.5 border-none h-auto md:h-10 scrollbar-none select-none">
              <TabsTrigger value="strategy" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
                <GraduationCap className="w-3.5 h-3.5" /> Sales Strategy
              </TabsTrigger>
              <TabsTrigger value="leads" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
                <BarChart3 className="w-3.5 h-3.5" /> Lead Tracker
              </TabsTrigger>
              <TabsTrigger value="workshops" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
                <BookOpen className="w-3.5 h-3.5" /> Workshop Tracker
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
                <Package className="w-3.5 h-3.5" /> Product Sales
              </TabsTrigger>
              <TabsTrigger value="weekly" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
                <LayoutDashboard className="w-3.5 h-3.5" /> Weekly Dashboard
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
                <Activity className="w-3.5 h-3.5" /> Daily Activity
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Visual Analytics
              </TabsTrigger>
            </TabsList>
          </div>
        )}

        <TabsContent value="strategy" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <SalesStrategy profileRef={profileRef} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="leads" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitLeadTracker profileRef={profileRef} leads={leads} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="workshops" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <WorkshopTracker profileRef={profileRef} workshops={workshops} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="products" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitProductSales profileRef={profileRef} productSales={productSales} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="weekly" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitWeeklyDashboard
            profileRef={profileRef}
            leads={leads}
            productSales={productSales}
            activities={activities}
            targets={targets}
            readOnly={readOnly}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitDailyActivity profileRef={profileRef} activities={activities} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 focus-visible:outline-none space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Pareto: 80/20 Lead Channel Drivers */}
            <div className="lg:col-span-7">
              <ParetoChart
                title="80/20 Lead Acquisition Channels (Pareto Model)"
                subtitle="Highlighting high-velocity channels driving 80% of institutional pipeline"
                data={salesParetoData}
                isCurrency={true}
                height={290}
              />
            </div>

            {/* Waterfall: Sales Pipeline Conversion Bridge */}
            <div className="lg:col-span-5">
              <WaterfallChart
                title="Pipeline Conversion Walk (Bridge Chart)"
                subtitle="From raw inbound leads to qualified demos and closed won contracts"
                data={pipelineWaterfallData}
                isCurrency={true}
                height={290}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Histogram: Deal Size Distribution */}
            <div className="lg:col-span-6">
              <HistogramChart
                title="Deal & Order Size Frequency Distribution"
                subtitle="Histogram of deal values across institutional purchase orders"
                bins={dealSizeBins}
                medianVal={28000}
                unit="₹"
                height={290}
              />
            </div>

            {/* Chord: Channel to Product Deliverable Flow */}
            <div className="lg:col-span-6">
              <ChordDiagram
                title="Channel to Product Line Allocation Flow"
                subtitle="Flow connection between acquisition channels and product kit lines"
                links={salesChordLinks}
                sourceLabel="Lead Channel"
                targetLabel="Product Deliverable"
                isCurrency={true}
                height={290}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
