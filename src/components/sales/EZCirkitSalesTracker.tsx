'use client';

import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, BookOpen, Package, Activity, LayoutDashboard } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { EZCirkitLeadTracker } from './EZCirkitLeadTracker';
import { EZCirkitProductSales } from './EZCirkitProductSales';
import { EZCirkitDailyActivity } from './EZCirkitDailyActivity';
import { EZCirkitWeeklyDashboard, DEFAULT_TARGETS } from './EZCirkitWeeklyDashboard';
import type { EZLead } from './EZCirkitLeadTracker';
import type { ProductSale } from './EZCirkitProductSales';
import type { DailyActivity } from './EZCirkitDailyActivity';

// Re-use the WorkshopTracker that already exists
import { WorkshopTracker } from './WorkshopTracker';

interface EZCirkitSalesTrackerProps {
  userId: string;
  companyProfileId: string;
}

export function EZCirkitSalesTracker({ userId, companyProfileId }: EZCirkitSalesTrackerProps) {
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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight mb-1">
          EZCirkit <span className="text-indigo-600">Sales Tracker</span>
        </h2>
        <p className="text-muted-foreground font-medium">
          Full-funnel tracking: Lead → Meeting → Proposal → Workshop / Kit Sale → Revenue
        </p>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <div className="flex justify-start border-b pb-3 mb-6">
          <TabsList className="bg-slate-100/80 p-1 rounded-full gap-0.5 border-none h-10">
            <TabsTrigger value="weekly" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> Weekly Dashboard
            </TabsTrigger>
            <TabsTrigger value="leads" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Lead Tracker
            </TabsTrigger>
            <TabsTrigger value="workshops" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Workshop Tracker
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
              <Package className="w-3.5 h-3.5" /> Product Sales
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 transition-all gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Daily Activity
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="weekly" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitWeeklyDashboard
            profileRef={profileRef}
            leads={leads}
            productSales={productSales}
            activities={activities}
            targets={targets}
          />
        </TabsContent>

        <TabsContent value="leads" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitLeadTracker profileRef={profileRef} leads={leads} />
        </TabsContent>

        <TabsContent value="workshops" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <WorkshopTracker profileRef={profileRef} workshops={workshops} />
        </TabsContent>

        <TabsContent value="products" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitProductSales profileRef={profileRef} productSales={productSales} />
        </TabsContent>

        <TabsContent value="activity" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
          <EZCirkitDailyActivity profileRef={profileRef} activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
