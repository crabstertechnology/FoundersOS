'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { fmtINR } from '@/lib/utils/formatters';
import { Target, TrendingUp, Users, IndianRupee, BookOpen, Package } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DocumentReference } from 'firebase/firestore';
import type { EZLead } from './EZCirkitLeadTracker';
import type { ProductSale } from './EZCirkitProductSales';
import type { DailyActivity } from './EZCirkitDailyActivity';

interface WeeklyTargets {
  schoolsTarget: number;
  collegesTarget: number;
  workshopsProposedTarget: number;
  workshopsConfirmedTarget: number;
  studentLeadsTarget: number;
  kitsSoldTarget: number;
  revenueTarget: number;
}

interface WeeklyDashboardProps {
  profileRef: DocumentReference | null;
  leads: EZLead[];
  productSales: ProductSale[];
  activities: DailyActivity[];
  targets: WeeklyTargets;
  readOnly?: boolean;
}

const DEFAULT_TARGETS: WeeklyTargets = {
  schoolsTarget: 20,
  collegesTarget: 10,
  workshopsProposedTarget: 5,
  workshopsConfirmedTarget: 2,
  studentLeadsTarget: 50,
  kitsSoldTarget: 20,
  revenueTarget: 50000,
};

function ProgressRow({ label, actual, target, color }: { label: string; actual: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const isMonetary = label.toLowerCase().includes('revenue');
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <div className="flex items-center gap-3">
          <span className="font-code font-black text-slate-900">{isMonetary ? fmtINR(actual) : actual}</span>
          <span className="text-muted-foreground text-xs">/ {isMonetary ? fmtINR(target) : target}</span>
          <span className={`text-xs font-black min-w-[40px] text-right ${pct >= 100 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-500'}`}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-400'} ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EZCirkitWeeklyDashboard({ profileRef, leads, productSales, activities, targets, readOnly }: WeeklyDashboardProps) {
  const [editingTargets, setEditingTargets] = useState(false);
  const [draft, setDraft] = useState<WeeklyTargets>(targets);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const actuals = useMemo(() => {
    const weekLeads = leads.filter(l => l.date >= weekAgo);
    const weekSales = productSales.filter(s => s.date >= weekAgo);
    const weekActivities = activities.filter(a => a.date >= weekAgo);
    const schoolsContacted = weekActivities.reduce((s, a) => s + (Number(a.schoolsContacted) || 0), 0);
    const collegesContacted = weekActivities.reduce((s, a) => s + (Number(a.collegesContacted) || 0), 0);
    const workshopsProposed = weekLeads.filter(l => l.status === 'proposal-sent' && (l.leadType === 'school' || l.leadType === 'college')).length;
    const workshopsConfirmed = weekLeads.filter(l => l.status === 'won' && (l.leadType === 'school' || l.leadType === 'college')).length;
    const studentLeads = weekLeads.filter(l => l.leadType === 'student').length;
    const kitsSold = weekSales.reduce((s, p) => s + (Number(p.qty) || 0), 0);
    const revenueAchieved = weekLeads.filter(l => l.status === 'won').reduce((s, l) => s + (Number(l.actualRevenue) || 0), 0)
      + weekSales.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + (Number(p.total) || 0), 0);
    return { schoolsContacted, collegesContacted, workshopsProposed, workshopsConfirmed, studentLeads, kitsSold, revenueAchieved };
  }, [leads, productSales, activities, weekAgo]);

  const handleSaveTargets = () => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, { ezWeeklyTargets: draft }, { merge: true });
    setEditingTargets(false);
  };

  const metrics = [
    { label: 'Schools Contacted', actual: actuals.schoolsContacted, target: targets.schoolsTarget, color: 'bg-blue-500' },
    { label: 'Colleges Contacted', actual: actuals.collegesContacted, target: targets.collegesTarget, color: 'bg-purple-500' },
    { label: 'Workshops Proposed', actual: actuals.workshopsProposed, target: targets.workshopsProposedTarget, color: 'bg-indigo-500' },
    { label: 'Workshops Confirmed', actual: actuals.workshopsConfirmed, target: targets.workshopsConfirmedTarget, color: 'bg-violet-500' },
    { label: 'Student Leads', actual: actuals.studentLeads, target: targets.studentLeadsTarget, color: 'bg-emerald-500' },
    { label: 'Kits Sold', actual: actuals.kitsSold, target: targets.kitsSoldTarget, color: 'bg-amber-500' },
    { label: 'Revenue Achieved', actual: actuals.revenueAchieved, target: targets.revenueTarget, color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Schools (This Week)', value: actuals.schoolsContacted, sub: `Target: ${targets.schoolsTarget}`, icon: Target, color: 'text-blue-600' },
          { label: 'Colleges (This Week)', value: actuals.collegesContacted, sub: `Target: ${targets.collegesTarget}`, icon: Users, color: 'text-purple-600' },
          { label: 'Student Leads', value: actuals.studentLeads, sub: `Target: ${targets.studentLeadsTarget}`, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Revenue (This Week)', value: fmtINR(actuals.revenueAchieved), sub: `Target: ${fmtINR(targets.revenueTarget)}`, icon: IndianRupee, color: 'text-amber-600' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="border-2 shadow-sm">
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</CardTitle>
              <Icon className={`w-4 h-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-code font-black ${color}`}>{value}</div>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 border-b flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-black text-slate-900">Weekly Progress Dashboard</CardTitle>
              <CardDescription>Last 7 days actuals vs your weekly targets.</CardDescription>
            </div>
            {!readOnly && (
              <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => { setDraft(targets); setEditingTargets(!editingTargets); }}>
                <Target className="w-3.5 h-3.5 mr-1.5" /> Edit Targets
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {metrics.map(m => (
              <ProgressRow key={m.label} {...m} />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {editingTargets && (
            <Card className="border-2 border-indigo-100 bg-indigo-50/10 shadow-sm animate-in slide-in-from-top-4 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-900">Set Weekly Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Schools / Week', key: 'schoolsTarget' as keyof WeeklyTargets },
                  { label: 'Colleges / Week', key: 'collegesTarget' as keyof WeeklyTargets },
                  { label: 'Workshops Proposed', key: 'workshopsProposedTarget' as keyof WeeklyTargets },
                  { label: 'Workshops Confirmed', key: 'workshopsConfirmedTarget' as keyof WeeklyTargets },
                  { label: 'Student Leads', key: 'studentLeadsTarget' as keyof WeeklyTargets },
                  { label: 'Kits Sold', key: 'kitsSoldTarget' as keyof WeeklyTargets },
                  { label: 'Revenue Target (₹)', key: 'revenueTarget' as keyof WeeklyTargets },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1">
                    <Label className="font-bold text-xs">{label}</Label>
                    <Input
                      type="number"
                      value={draft[key]}
                      onChange={e => setDraft(prev => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleSaveTargets}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTargets(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-2 border-slate-100 bg-slate-50/30 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                EZCirkit Monthly Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { icon: Target, label: '20 Schools / week', color: 'text-blue-600' },
                { icon: Users, label: '10 Colleges / week', color: 'text-purple-600' },
                { icon: TrendingUp, label: '50 Student leads / week', color: 'text-emerald-600' },
                { icon: BookOpen, label: '5 Workshop proposals / week', color: 'text-indigo-600' },
                { icon: BookOpen, label: '2 Paid workshops / month', color: 'text-violet-600' },
                { icon: Package, label: '20 Kit sales / month', color: 'text-amber-600' },
                { icon: IndianRupee, label: '₹50,000 – ₹1,00,000 / month', color: 'text-rose-600' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className={`flex items-center gap-2 text-xs font-semibold ${color}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_TARGETS };
export type { WeeklyTargets };
