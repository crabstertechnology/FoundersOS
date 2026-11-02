'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtINR } from '@/lib/utils/formatters';

export interface WaterfallStep {
  name: string;
  value: number; // positive or negative, or absolute if isTotal
  isTotal?: boolean;
  category?: 'base' | 'positive' | 'negative' | 'total';
  description?: string;
}

interface WaterfallChartProps {
  title?: string;
  subtitle?: string;
  data: WaterfallStep[];
  unit?: string;
  isCurrency?: boolean;
  height?: number;
  className?: string;
}

export function WaterfallChart({
  title,
  subtitle,
  data,
  unit = '',
  isCurrency = true,
  height = 320,
  className = '',
}: WaterfallChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Calculate cumulative heights and positions
  let runningTotal = 0;
  const processedData = data.map((step, idx) => {
    const isTotal = !!step.isTotal;
    const val = step.value;
    let start = 0;
    let end = 0;

    if (isTotal) {
      start = 0;
      end = val;
      runningTotal = val;
    } else {
      start = runningTotal;
      end = runningTotal + val;
      runningTotal = end;
    }

    const isPositive = val >= 0;
    const bottom = Math.min(start, end);
    const top = Math.max(start, end);
    const diff = Math.abs(val);

    return {
      ...step,
      start,
      end,
      bottom,
      top,
      diff,
      isPositive,
      finalRunning: runningTotal,
    };
  });

  // Calculate max scale
  const allValues = processedData.flatMap((d) => [d.bottom, d.top]);
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(...allValues, 1);
  const range = maxVal - minVal || 1;

  const formatVal = (num: number) => {
    if (isCurrency) return fmtINR(num);
    return `${num.toLocaleString()}${unit ? ' ' + unit : ''}`;
  };

  return (
    <Card className={`border border-border/80 shadow-sm bg-card overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {title && <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">{title}</CardTitle>}
              {subtitle && <CardDescription className="text-xs text-muted-foreground mt-0.5">{subtitle}</CardDescription>}
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> Increase</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Decrease</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" /> Total / Benchmark</span>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-4 pb-4">
        <div style={{ height: `${height}px` }} className="w-full relative flex items-end pt-8 pb-10 px-2 select-none">
          {/* Background grid lines */}
          <div className="absolute inset-x-2 inset-y-8 pointer-events-none flex flex-col justify-between opacity-15">
            <div className="border-b border-foreground w-full" />
            <div className="border-b border-dashed border-foreground w-full" />
            <div className="border-b border-dashed border-foreground w-full" />
            <div className="border-b border-foreground w-full" />
          </div>

          {/* Pillars */}
          <div className="w-full h-full flex items-end gap-2 relative z-10">
            {processedData.map((d, i) => {
              const heightPct = Math.max(2, (d.diff / range) * 100);
              const bottomPct = ((d.bottom - minVal) / range) * 100;
              const isHovered = hoveredIdx === i;

              let barColor = 'bg-indigo-600 border-indigo-700 text-white';
              if (!d.isTotal) {
                barColor = d.isPositive
                  ? 'bg-emerald-600 border-emerald-700 text-white'
                  : 'bg-rose-500 border-rose-600 text-white';
              }

              return (
                <div
                  key={i}
                  className="flex-1 h-full flex flex-col justify-end items-center relative group"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Floating tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-14 z-30 bg-slate-900 text-white text-[11px] rounded-md shadow-xl px-2.5 py-1.5 whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                      <div className="font-bold">{d.name}</div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300">
                        <span>{d.isTotal ? 'Cumulative Total:' : (d.isPositive ? '+ ' : '- ') + formatVal(d.diff)}</span>
                        <span>({formatVal(d.end)})</span>
                      </div>
                      {d.description && <div className="text-[9px] text-slate-400 mt-0.5">{d.description}</div>}
                    </div>
                  )}

                  {/* Value tag above bar */}
                  <div className={`text-[10px] font-bold font-mono transition-transform duration-200 mb-1 ${isHovered ? '-translate-y-1 font-extrabold text-foreground' : 'text-muted-foreground'}`}>
                    {d.isTotal ? formatVal(d.value) : (d.isPositive ? '+' : '-') + formatVal(d.diff)}
                  </div>

                  {/* Bar pillar container */}
                  <div className="w-full h-full relative flex items-end">
                    <div
                      style={{
                        height: `${heightPct}%`,
                        bottom: `${bottomPct}%`,
                      }}
                      className={`w-full rounded-md border shadow-sm transition-all duration-300 absolute ${barColor} ${isHovered ? 'ring-2 ring-primary ring-offset-1 scale-[1.03]' : ''}`}
                    />
                  </div>

                  {/* X-axis Label */}
                  <div className="absolute -bottom-8 inset-x-0 text-center">
                    <div className="text-[10.5px] font-semibold text-foreground/80 truncate px-0.5" title={d.name}>
                      {d.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
