'use client';

import React, { useState } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { GliderNav } from '@/components/ui/tabs';
import { 
  CalendarDays, Clock, TrendingUp, Calculator, Activity, 
  Home, ChevronRight, Layers, Target, ShieldCheck
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

  const sectorMeta = {
    sales: {
      name: 'Sales & Growth',
      description: 'Track outreach calls, school & college leads, workshops, kit sales, and weekly pipeline targets.',
      color: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    finance: {
      name: 'Finance & Capital',
      description: 'Monitor funding targets, cash in bank, burn rate limits, capital runway, and daily audit transactions.',
      color: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    operations: {
      name: 'Operations & Infra',
      description: 'Manage headcount targets, SaaS subscriptions burn, vendor audits, and team operational logs.',
      color: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  }[sector];

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Console</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-600 font-medium">Cadence Hub</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-indigo-600 font-bold flex items-center gap-1">
              {sectorMeta.name} ({cadence === 'weekly' ? 'Weekly' : 'Daily'})
            </span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-heading">
              Weekly &amp; Daily Hub
            </h1>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sectorMeta.badge}`}>
              {sectorMeta.name}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-2xl mt-1">
            {sectorMeta.description}
          </p>
        </div>

        {/* Cadence Switcher (Weekly vs Daily) */}
        <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
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

      {/* Sector Switcher Bar (Sales, Finance, Operations) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 px-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Sector:</span>
        </div>
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

