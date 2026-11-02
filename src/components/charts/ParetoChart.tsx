'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtINR } from '@/lib/utils/formatters';

export interface ParetoItem {
  label: string;
  value: number;
  category?: string;
  description?: string;
}

interface ParetoChartProps {
  title?: string;
  subtitle?: string;
  data: ParetoItem[];
  isCurrency?: boolean;
  valueUnit?: string;
  height?: number;
  className?: string;
}

export function ParetoChart({
  title,
  subtitle,
  data,
  isCurrency = true,
  valueUnit = '',
  height = 320,
  className = '',
}: ParetoChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Sort descending
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, item) => sum + item.value, 0) || 1;
  const maxVal = sorted[0]?.value || 1;

  // Compute cumulative percentages
  let accum = 0;
  const processed = sorted.map((item) => {
    accum += item.value;
    const cumPct = (accum / total) * 100;
    const itemPct = (item.value / total) * 100;
    return {
      ...item,
      cumPct,
      itemPct,
    };
  });

  const formatVal = (num: number) => {
    if (isCurrency) return fmtINR(num);
    return `${num.toLocaleString()}${valueUnit ? ' ' + valueUnit : ''}`;
  };

  // Find 80% threshold cut-off item count
  const vitalItemsCount = processed.findIndex((p) => p.cumPct >= 80) + 1 || processed.length;

  return (
    <Card className={`border border-border/80 shadow-sm bg-card overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {title && <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">{title}</CardTitle>}
              {subtitle && <CardDescription className="text-xs text-muted-foreground mt-0.5">{subtitle}</CardDescription>}
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                Top {vitalItemsCount} drivers = ~80% impact
              </Badge>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" /> Value
                <span className="w-2.5 h-0.5 bg-amber-500 inline-block ml-2" /> Cum %
              </div>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-6 pb-4">
        <div style={{ height: `${height}px` }} className="w-full relative select-none">
          {/* 80% line */}
          <div
            style={{ bottom: '80%' }}
            className="absolute inset-x-0 border-b border-dashed border-amber-500 z-10 pointer-events-none flex justify-end pr-2"
          >
            <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded -translate-y-3">
              80% Pareto Cutoff
            </span>
          </div>

          {/* SVG line for cumulative percentage */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              points={processed
                .map((d, i) => {
                  const xPct = ((i + 0.5) / processed.length) * 100;
                  const yPct = 100 - d.cumPct;
                  return `${xPct}%,${yPct}%`;
                })
                .join(' ')}
            />
            {processed.map((d, i) => {
              const xPct = ((i + 0.5) / processed.length) * 100;
              const yPct = 100 - d.cumPct;
              const isHovered = hoveredIdx === i;
              return (
                <circle
                  key={i}
                  cx={`${xPct}%`}
                  cy={`${yPct}%`}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#ffffff"
                  stroke="#d97706"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>

          {/* Bars */}
          <div className="w-full h-full flex items-end gap-2 pb-6 pt-2">
            {processed.map((d, i) => {
              const heightPct = Math.max(3, (d.value / maxVal) * 100);
              const isHovered = hoveredIdx === i;
              const isVital = i < vitalItemsCount;

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
                      <div className="font-bold">{d.label}</div>
                      <div className="font-mono text-[10px] text-slate-300">
                        {formatVal(d.value)} ({d.itemPct.toFixed(1)}% of total)
                      </div>
                      <div className="text-[9.5px] text-amber-300 font-semibold mt-0.5">
                        Cumulative: {d.cumPct.toFixed(1)}%
                      </div>
                    </div>
                  )}

                  {/* Bar Value */}
                  <div className={`text-[10px] font-bold font-mono transition-transform duration-200 mb-1 ${isHovered ? '-translate-y-1 text-indigo-700' : 'text-muted-foreground'}`}>
                    {formatVal(d.value)}
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct * 0.85}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isVital
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-slate-300 hover:bg-slate-400'
                    } ${isHovered ? 'ring-2 ring-indigo-400 scale-[1.02]' : ''}`}
                  />

                  {/* Label */}
                  <div className="absolute -bottom-5 inset-x-0 text-center">
                    <span className="text-[10px] font-semibold text-foreground/80 truncate block px-0.5" title={d.label}>
                      {d.label}
                    </span>
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
