'use client';

import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, BookOpen, Package, GraduationCap } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { EZCirkitLeadTracker } from './EZCirkitLeadTracker';
import { EZCirkitProductSales } from './EZCirkitProductSales';
import { SalesStrategy } from './SalesStrategy';
import { WorkshopTracker } from './WorkshopTracker';
import type { EZLead } from './EZCirkitLeadTracker';
import type { ProductSale } from './EZCirkitProductSales';
import type { DailyActivity } from './EZCirkitDailyActivity';
import { DEFAULT_TARGETS } from './EZCirkitWeeklyDashboard';

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
          <div className="flex justify-start mb-6 overflow-x-auto pb-1 scrollbar-none">
            <TabsList className="shrink-0">
              <TabsTrigger value="strategy">
                <GraduationCap className="w-3.5 h-3.5" /> Sales Strategy
              </TabsTrigger>
              <TabsTrigger value="leads">
                <BarChart3 className="w-3.5 h-3.5" /> Lead Tracker
              </TabsTrigger>
              <TabsTrigger value="workshops">
                <BookOpen className="w-3.5 h-3.5" /> Workshop Tracker
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="w-3.5 h-3.5" /> Product Sales
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
      </Tabs>
    </div>
  );
}
