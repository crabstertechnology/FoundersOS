'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, TrendingUp } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useDoc } from '@/firebase';
import type { DocumentReference } from 'firebase/firestore';

export interface OpsTargets {
  teamSizeTarget: number;
  saasBudget: number;
  taskCompletionTarget: number;
}

export const DEFAULT_OPS_TARGETS: OpsTargets = {
  teamSizeTarget: 10,
  saasBudget: 50000,
  taskCompletionTarget: 80,
};

interface OperationsWeeklyDashboardProps {
  profileRef: DocumentReference | null;
  readOnly?: boolean;
  teamSize?: number;
  saasCost?: number;
  targets?: any;
}

export function OperationsWeeklyDashboard({ profileRef, readOnly }: OperationsWeeklyDashboardProps) {
  // Load company profile for strategic plan
  const { data: profile } = useDoc(profileRef);

  const weeklyPlans = profile?.strategicPlan?.weeklyPlans || [];
  const completedWeeklyActions = profile?.completedWeeklyActions || [];

  // Filter actions based on Operations keywords
  const filteredWeeklyActions = useMemo(() => {
    const actions: Array<{ week: string; theme: string; action: string }> = [];
    const opsKeywords = ['ops', 'operations', 'hiring', 'team', 'member', 'headcount', 'saas', 'subscriptions', 'process', 'tool', 'documentation', 'administrative', 'it', 'security'];

    weeklyPlans.forEach((plan: any) => {
      const weekName = plan.week || '';
      const theme = plan.theme || '';
      (plan.actions || []).forEach((act: string) => {
        const text = act.toLowerCase();
        const isMatch = opsKeywords.some(kw => text.includes(kw));
        if (isMatch) {
          actions.push({ week: weekName, theme, action: act });
        }
      });
    });

    // Fallback: if no actions matched but there are weekly plans, just show all of them
    if (actions.length === 0 && weeklyPlans.length > 0) {
      weeklyPlans.forEach((plan: any) => {
        (plan.actions || []).forEach((act: string) => {
          actions.push({ week: plan.week || '', theme: plan.theme || '', action: act });
        });
      });
    }

    return actions;
  }, [weeklyPlans]);

  const handleToggleWeeklyAction = async (actionText: string) => {
    if (!profileRef) return;
    let updated: string[];
    if (completedWeeklyActions.includes(actionText)) {
      updated = completedWeeklyActions.filter((a: string) => a !== actionText);
    } else {
      updated = [...completedWeeklyActions, actionText];
    }
    await setDocumentNonBlocking(profileRef, { completedWeeklyActions: updated }, { merge: true });
  };

  const weeklyStats = useMemo(() => {
    const total = filteredWeeklyActions.length;
    const completed = filteredWeeklyActions.filter(a => completedWeeklyActions.includes(a.action)).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [filteredWeeklyActions, completedWeeklyActions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* AI Strategic Weekly Actions Checklist */}
      <Card className="border-2 border-indigo-100 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b bg-indigo-50/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Strategic Operations Weekly Actions ({weeklyStats.completed} / {weeklyStats.total})
            </CardTitle>
            <CardDescription className="text-xs">
              Weekly objectives aligned with your 12-month goal. Track and complete tasks to drive strategic goals.
            </CardDescription>
          </div>
          {weeklyStats.total > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black text-slate-700">{weeklyStats.pct}% Done</span>
              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border">
                <div className="h-full bg-indigo-700 transition-all duration-500" style={{ width: `${weeklyStats.pct}%` }} />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {filteredWeeklyActions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-medium">
              No weekly roadmap execution actions generated yet. Set your startup goal in the Central Console.
            </div>
          ) : (
            filteredWeeklyActions.map((item, index) => {
              const isDone = completedWeeklyActions.includes(item.action);
              return (
                <div key={index} className="p-4 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                  <button
                    disabled={readOnly}
                    onClick={() => handleToggleWeeklyAction(item.action)}
                    className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                  >
                    {isDone ? (
                      <CheckSquare className="w-4.5 h-4.5 text-indigo-600" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[8px] uppercase font-bold">
                        {item.week}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-semibold">Focus: {item.theme}</span>
                    </div>
                    <p className={`text-xs text-slate-700 font-medium leading-relaxed ${isDone ? 'line-through text-slate-400 font-normal' : ''}`}>
                      {item.action}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

    </div>
  );
}
