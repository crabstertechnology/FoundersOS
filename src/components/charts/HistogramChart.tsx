'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface HistogramBin {
  rangeLabel: string;
  count: number;
  min: number;
  max: number;
  description?: string;
}

interface HistogramChartProps {
  title?: string;
  subtitle?: string;
  bins: HistogramBin[];
  currentVal?: number;
  currentValLabel?: string;
  medianVal?: number;
  height?: number;
  unit?: string;
  className?: string;
}

export function HistogramChart({
  title,
  subtitle,
  bins,
  currentVal,
  currentValLabel = 'Your Startup',
  medianVal,
  height = 280,
  unit = 'x',
  className = '',
}: HistogramChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const totalCount = bins.reduce((sum, b) => sum + b.count, 0) || 1;

  // Identify which bin contains currentVal
  const currentBinIdx = currentVal !== undefined
    ? bins.findIndex((b) => currentVal >= b.min && currentVal <= b.max)
    : -1;

  return (
    <Card className={`border border-border/80 shadow-sm bg-card overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {title && <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">{title}</CardTitle>}
              {subtitle && <CardDescription className="text-xs text-muted-foreground mt-0.5">{subtitle}</CardDescription>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {currentVal !== undefined && (
                <Badge className="bg-indigo-600 text-white font-mono text-[10px]">
                  {currentValLabel}: {currentVal.toFixed(1)}{unit}
                </Badge>
              )}
              {medianVal !== undefined && (
                <Badge variant="outline" className="text-slate-600 border-slate-300 font-mono text-[10px]">
                  Median: {medianVal.toFixed(1)}{unit}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-6 pb-4">
        <div style={{ height: `${height}px` }} className="w-full relative select-none flex items-end gap-1.5 pb-6 pt-4">
          {bins.map((bin, i) => {
            const heightPct = Math.max(4, (bin.count / maxCount) * 100);
            const isHovered = hoveredIdx === i;
            const isCurrentBin = currentBinIdx === i;
            const pctOfCohort = ((bin.count / totalCount) * 100).toFixed(1);

            return (
              <div
                key={i}
                className="flex-1 h-full flex flex-col justify-end items-center relative group"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-14 z-30 bg-slate-900 text-white text-[11px] rounded-md shadow-xl px-2.5 py-1.5 whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                    <div className="font-bold">{bin.rangeLabel}</div>
                    <div className="font-mono text-[10px] text-slate-300">
                      {bin.count} deals ({pctOfCohort}% of cohort)
                    </div>
                    {isCurrentBin && (
                      <div className="text-[9.5px] text-emerald-400 font-semibold mt-0.5">
                        ★ {currentValLabel} is here ({currentVal}{unit})
                      </div>
                    )}
                  </div>
                )}

                {/* Star Marker for Current Value */}
                {isCurrentBin && (
                  <div className="absolute -top-6 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded shadow-xs whitespace-nowrap">
                    You
                  </div>
                )}

                {/* Count badge */}
                <div className={`text-[10px] font-bold font-mono transition-transform duration-200 mb-1 ${isHovered ? '-translate-y-1 text-foreground' : 'text-muted-foreground'}`}>
                  {bin.count}
                </div>

                {/* Histogram Bar Pillar */}
                <div
                  style={{ height: `${heightPct * 0.85}%` }}
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isCurrentBin
                      ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-1'
                      : isHovered
                      ? 'bg-slate-700'
                      : 'bg-slate-300'
                  }`}
                />

                {/* X-axis Range Label */}
                <div className="absolute -bottom-5 inset-x-0 text-center">
                  <span className="text-[9.5px] font-medium text-foreground/75 truncate block px-0.5">
                    {bin.rangeLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
