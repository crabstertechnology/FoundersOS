'use client';

import React, { useState } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { GliderNav } from '@/components/ui/tabs';
import { 
  CalendarDays, Clock, TrendingUp, Calculator, Activity, 
  Target, ShieldCheck
} from 'lucide-react';
import { EZCirkitWeeklyDashboard } from '@/components/sales/EZCirkitWeeklyDashboard';
import { EZCirkitDailyActivity } from '@/components/sales/EZCirkitDailyActivity';
import { FinanceWeeklyDashboard, DEFAULT_FINANCE_TARGETS } from '@/components/finance/FinanceWeeklyDashboard';
import { FinanceDailyActivity } from '@/components/finance/FinanceDailyActivity';
import { OperationsWeeklyDashboard, DEFAULT_OPS_TARGETS } from '@/components/operations/OperationsWeeklyDashboard';
import { OperationsDailyActivity } from '@/components/operations/OperationsDailyActivity';

export type SectorType = 'sales' | 'finance' | 'operations';
export type CadenceType = 'weekly' | 'daily';

interface WeeklyDailyHubProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
  initialSector?: SectorType;
  initialCadence?: CadenceType;
  onNavigateHome?: () => void;
}

export function WeeklyDailyHub({
  userId,
  companyProfileId,
  readOnly = false,
  initialSector = 'sales',
  initialCadence = 'weekly',
  onNavigateHome,
}: WeeklyDailyHubProps) {
  const [sector, setSector] = useState<SectorType>(initialSector);
  const [cadence, setCadence] = useState<CadenceType>(initialCadence);

  const firestore = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* Switcher Navigation Bar (Clean Unified) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Sector Switcher (Sales, Finance, Operations) */}
        <div className="overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <GliderNav
            value={sector}
            onChange={(val) => setSector(val as SectorType)}
            options={[
              { id: 'sales', label: 'Sales Sector', icon: TrendingUp },
              { id: 'finance', label: 'Finance Sector', icon: Calculator },
              { id: 'operations', label: 'Operations Sector', icon: Activity },
            ]}
          />
        </div>

        {/* Cadence Switcher (Weekly vs Daily) */}
        <div className="overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0 flex items-center justify-end">
          <GliderNav
            value={cadence}
            onChange={(val) => setCadence(val as CadenceType)}
            options={[
              { id: 'weekly', label: 'Weekly Dashboard', icon: CalendarDays },
              { id: 'daily', label: 'Daily Activity', icon: Clock },
            ]}
          />
        </div>
      </div>

      {/* Content Rendering by Sector & Cadence */}
      <div className="mt-4">
        {/* Sales Sector */}
        {sector === 'sales' && cadence === 'weekly' && (
          <div className="animate-in fade-in duration-200">
            <EZCirkitWeeklyDashboard
              profileRef={profileRef}
              readOnly={readOnly}
            />
          </div>
        )}

        {sector === 'sales' && cadence === 'daily' && (
          <div className="animate-in fade-in duration-200">
            <EZCirkitDailyActivity
              profileRef={profileRef}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* Finance Sector */}
        {sector === 'finance' && cadence === 'weekly' && (
          <div className="animate-in fade-in duration-200">
            <FinanceWeeklyDashboard
              profileRef={profileRef}
              cashBank={profile?.cashBank || 0}
              burnRate={profile?.burnRate || 0}
              runway={profile?.runway || 0}
              valuation={profile?.valuation || 0}
              capitalRaised={profile?.capitalRaised || 0}
              targets={profile?.financeWeeklyTargets || DEFAULT_FINANCE_TARGETS}
              readOnly={readOnly}
            />
          </div>
        )}

        {sector === 'finance' && cadence === 'daily' && (
          <div className="animate-in fade-in duration-200">
            <FinanceDailyActivity
              profileRef={profileRef}
              activities={profile?.financeDailyActivities || []}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* Operations Sector */}
        {sector === 'operations' && cadence === 'weekly' && (
          <div className="animate-in fade-in duration-200">
            <OperationsWeeklyDashboard
              profileRef={profileRef}
              teamSize={profile?.teamMembers?.length || 0}
              saasCost={
                (profile?.saasSubscriptions || []).reduce(
                  (sum: number, s: any) => sum + (Number(s.cost) || 0),
                  0
                )
              }
              targets={profile?.opsWeeklyTargets || DEFAULT_OPS_TARGETS}
              readOnly={readOnly}
            />
          </div>
        )}

        {sector === 'operations' && cadence === 'daily' && (
          <div className="animate-in fade-in duration-200">
            <OperationsDailyActivity
              profileRef={profileRef}
              activities={profile?.opsDailyActivities || []}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
}

