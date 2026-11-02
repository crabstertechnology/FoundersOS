'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtINR } from '@/lib/utils/formatters';

export interface FlowLink {
  source: string;
  target: string;
  value: number;
  color?: string;
  description?: string;
}

interface ChordDiagramProps {
  title?: string;
  subtitle?: string;
  links: FlowLink[];
  sourceLabel?: string;
  targetLabel?: string;
  isCurrency?: boolean;
  unit?: string;
  height?: number;
  className?: string;
}

export function ChordDiagram({
  title,
  subtitle,
  links,
  sourceLabel = 'Capital Inflow',
  targetLabel = 'Allocation & Burn',
  isCurrency = true,
  unit = '',
  height = 340,
  className = '',
}: ChordDiagramProps) {
  const [hoveredLink, setHoveredLink] = useState<FlowLink | null>(null);

  // Group unique sources and targets
  const sources = Array.from(new Set(links.map((l) => l.source)));
  const targets = Array.from(new Set(links.map((l) => l.target)));

  // Calculate total values
  const totalValue = links.reduce((sum, l) => sum + l.value, 0) || 1;

  const sourceTotals = sources.map((s) => ({
    name: s,
    value: links.filter((l) => l.source === s).reduce((sum, l) => sum + l.value, 0),
  }));

  const targetTotals = targets.map((t) => ({
    name: t,
    value: links.filter((l) => l.target === t).reduce((sum, l) => sum + l.value, 0),
  }));

  const formatVal = (val: number) => {
    if (isCurrency) return fmtINR(val);
    return `${val.toLocaleString()}${unit ? ' ' + unit : ''}`;
  };

  const SOURCE_COLORS = ['#4f46e5', '#0284c7', '#7c3aed', '#059669', '#d97706'];
  const TARGET_COLORS = ['#ea580c', '#e11d48', '#2563eb', '#16a34a', '#8b5cf6', '#0891b2'];

  return (
    <Card className={`border border-border/80 shadow-sm bg-card overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {title && <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">{title}</CardTitle>}
              {subtitle && <CardDescription className="text-xs text-muted-foreground mt-0.5">{subtitle}</CardDescription>}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              Total Flow: {formatVal(totalValue)}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-6 pb-6">
        <div style={{ minHeight: `${height}px` }} className="w-full flex items-stretch justify-between gap-4 relative select-none">
          {/* Left Column: Sources */}
          <div className="w-1/3 flex flex-col justify-around gap-2 z-10">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" /> {sourceLabel}
            </div>
            {sourceTotals.map((src, idx) => {
              const pct = (src.value / totalValue) * 100;
              const color = SOURCE_COLORS[idx % SOURCE_COLORS.length];
              return (
                <div
                  key={idx}
                  style={{ borderLeftColor: color }}
                  className="p-2.5 rounded-lg border-l-4 bg-slate-50 border border-border/60 hover:bg-slate-100 transition-colors shadow-xs"
                >
                  <div className="font-bold text-xs truncate">{src.name}</div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground mt-1">
                    <span className="font-semibold text-foreground">{formatVal(src.value)}</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Middle: Flow Curves (SVG Canvas) */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <svg className="w-full h-full absolute inset-0 pointer-events-none">
              <defs>
                {links.map((link, idx) => {
                  const sIdx = sources.indexOf(link.source);
                  const tIdx = targets.indexOf(link.target);
                  const sColor = SOURCE_COLORS[sIdx % SOURCE_COLORS.length];
                  const tColor = TARGET_COLORS[tIdx % TARGET_COLORS.length];
                  return (
                    <linearGradient key={idx} id={`flowGrad-${idx}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={sColor} stopOpacity={hoveredLink === link ? 0.9 : 0.4} />
                      <stop offset="100%" stopColor={tColor} stopOpacity={hoveredLink === link ? 0.9 : 0.4} />
                    </linearGradient>
                  );
                })}
              </defs>

              {links.map((link, idx) => {
                const sIdx = sources.indexOf(link.source);
                const tIdx = targets.indexOf(link.target);
                const sTotalCount = sources.length;
                const tTotalCount = targets.length;

                // Relative Y coordinates based on index distribution
                const y1 = ((sIdx + 0.5) / sTotalCount) * 100;
                const y2 = ((tIdx + 0.5) / tTotalCount) * 100;

                const strokeWidth = Math.max(3, (link.value / totalValue) * 36);
                const isHovered = hoveredLink === link;

                return (
                  <path
                    key={idx}
                    d={`M 0,${y1}% C 50,${y1}% 50,${y2}% 100,${y2}%`}
                    fill="none"
                    stroke={`url(#flowGrad-${idx})`}
                    strokeWidth={strokeWidth}
                    className={`transition-all duration-300 pointer-events-auto cursor-pointer ${
                      isHovered ? 'stroke-opacity-100' : 'hover:stroke-opacity-80'
                    }`}
                    onMouseEnter={() => setHoveredLink(link)}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                );
              })}
            </svg>

            {hoveredLink && (
              <div className="absolute z-30 bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 pointer-events-none animate-in fade-in zoom-in-95 max-w-[200px] text-center">
                <div className="font-bold text-slate-200">
                  {hoveredLink.source} → {hoveredLink.target}
                </div>
                <div className="font-mono text-emerald-400 font-extrabold text-sm">
                  {formatVal(hoveredLink.value)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {((hoveredLink.value / totalValue) * 100).toFixed(1)}% of total flow
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Targets */}
          <div className="w-1/3 flex flex-col justify-around gap-2 z-10">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center justify-end gap-1.5">
              {targetLabel} <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            </div>
            {targetTotals.map((tgt, idx) => {
              const pct = (tgt.value / totalValue) * 100;
              const color = TARGET_COLORS[idx % TARGET_COLORS.length];
              return (
                <div
                  key={idx}
                  style={{ borderRightColor: color }}
                  className="p-2.5 rounded-lg border-r-4 bg-slate-50 border border-border/60 hover:bg-slate-100 transition-colors shadow-xs text-right"
                >
                  <div className="font-bold text-xs truncate">{tgt.name}</div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground mt-1">
                    <span>{pct.toFixed(1)}%</span>
                    <span className="font-semibold text-foreground">{formatVal(tgt.value)}</span>
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
