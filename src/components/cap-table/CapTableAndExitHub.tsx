'use client';

import React, { useEffect } from 'react';
import { CapTableTracker } from './CapTableTracker';
import { ExitSimulator } from '@/components/calculator/ExitSimulator';
import { PieChart, TrendingUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CapTableAndExitHubProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
  defaultSection?: 'cap-table' | 'exit';
}

export function CapTableAndExitHub({
  userId,
  companyProfileId,
  readOnly,
  defaultSection = 'cap-table'
}: CapTableAndExitHubProps) {
  useEffect(() => {
    if (defaultSection === 'exit') {
      const timer = setTimeout(() => {
        document.getElementById('exit-simulator-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [defaultSection]);

  const scrollToExit = () => {
    document.getElementById('exit-simulator-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCapTable = () => {
    document.getElementById('cap-table-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 w-full">
      {/* Quick Navigation Anchor Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={scrollToCapTable}
            className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-colors"
          >
            <PieChart className="w-3.5 h-3.5 text-indigo-600" />
            Cap Table Registry & Equity
          </Button>

          <span className="text-slate-300 font-bold">•</span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={scrollToExit}
            className="text-xs font-bold text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Waterfall Exit Simulator
          </Button>
        </div>

        <button
          type="button"
          onClick={scrollToExit}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 px-3 py-1 rounded-full transition-all cursor-pointer"
        >
          <span>Model Exit Scenarios</span>
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>

      {/* SECTION 1: CAP TABLE TRACKER */}
      <section id="cap-table-section" className="space-y-6 scroll-mt-24">
        <CapTableTracker
          userId={userId}
          companyProfileId={companyProfileId}
          readOnly={readOnly}
        />
      </section>

      {/* SECTION 2: WATERFALL EXIT SIMULATOR */}
      <section id="exit-simulator-section" className="pt-8 border-t-2 border-slate-200/80 space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/70 p-4 rounded-2xl border border-emerald-100/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs shadow-emerald-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">Waterfall Exit Simulator</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Real-Time Liquidation
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Simulate acquisitions and IPOs. Automatically computes liquidation preference stacks and founder cash take-home based on your live cap table above.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={scrollToCapTable}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 border-slate-200 self-start sm:self-auto rounded-xl"
          >
            Back to Cap Table ↑
          </Button>
        </div>

        <ExitSimulator
          userId={userId}
          companyProfileId={companyProfileId}
          readOnly={readOnly}
        />
      </section>
    </div>
  );
}

