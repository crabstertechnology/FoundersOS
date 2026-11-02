'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtINR } from '@/lib/utils/formatters';

export interface TreemapNode {
  name: string;
  value: number;
  category?: string;
  color?: string;
  children?: TreemapNode[];
  description?: string;
}

interface TreemapChartProps {
  title?: string;
  subtitle?: string;
  data: TreemapNode[];
  isCurrency?: boolean;
  unit?: string;
  height?: number;
  className?: string;
}

const DEFAULT_PALETTE = [
  '#4f46e5', '#0284c7', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#0891b2', '#16a34a', '#ea580c'
];

export function TreemapChart({
  title,
  subtitle,
  data,
  isCurrency = true,
  unit = '',
  height = 320,
  className = '',
}: TreemapChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Flatten nodes if they have children, or use top level
  const flatNodes = data.flatMap((node, pIdx) => {
    if (node.children && node.children.length > 0) {
      return node.children.map((child) => ({
        ...child,
        category: node.name,
        color: child.color || node.color || DEFAULT_PALETTE[pIdx % DEFAULT_PALETTE.length],
      }));
    }
    return [{
      ...node,
      color: node.color || DEFAULT_PALETTE[pIdx % DEFAULT_PALETTE.length],
    }];
  });

  const totalValue = flatNodes.reduce((sum, n) => sum + n.value, 0) || 1;
  const sorted = [...flatNodes].sort((a, b) => b.value - a.value);

  const formatVal = (val: number) => {
    if (isCurrency) return fmtINR(val);
    return `${val.toLocaleString()}${unit ? ' ' + unit : ''}`;
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
            <div className="text-xs font-semibold text-muted-foreground font-mono">
              Total: {formatVal(totalValue)}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-4 pb-4">
        {/* CSS Flex/Grid Treemap layout approximation with weighted sizing */}
        <div style={{ height: `${height}px` }} className="w-full grid grid-cols-12 gap-1.5 p-1 bg-slate-100/60 rounded-xl border border-border/60">
          {sorted.map((node, i) => {
            const pct = (node.value / totalValue) * 100;
            const isHovered = hoveredIdx === i;

            // Determine colSpan and rowSpan based on weight
            let colSpan = 'col-span-3';
            let rowSpan = 'row-span-1';

            if (pct >= 40) {
              colSpan = 'col-span-7 sm:col-span-6';
              rowSpan = 'row-span-2';
            } else if (pct >= 25) {
              colSpan = 'col-span-5 sm:col-span-4';
              rowSpan = 'row-span-2';
            } else if (pct >= 15) {
              colSpan = 'col-span-4 sm:col-span-3';
              rowSpan = 'row-span-1';
            } else if (pct >= 8) {
              colSpan = 'col-span-3 sm:col-span-2';
              rowSpan = 'row-span-1';
            } else {
              colSpan = 'col-span-2 sm:col-span-2';
              rowSpan = 'row-span-1';
            }

            return (
              <div
                key={i}
                style={{ backgroundColor: node.color }}
                className={`${colSpan} ${rowSpan} rounded-lg p-2.5 flex flex-col justify-between text-white relative transition-all duration-200 cursor-pointer overflow-hidden shadow-xs ${
                  isHovered ? 'scale-[1.02] z-20 ring-2 ring-white ring-offset-2 shadow-lg brightness-110' : 'hover:brightness-105'
                }`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Background accent overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 pointer-events-none" />

                <div className="relative z-10">
                  {node.category && (
                    <div className="text-[9px] uppercase tracking-wider font-bold opacity-80 truncate">
                      {node.category}
                    </div>
                  )}
                  <div className="font-bold text-xs sm:text-sm tracking-tight truncate">
                    {node.name}
                  </div>
                </div>

                <div className="relative z-10 mt-2">
                  <div className="font-mono font-extrabold text-xs sm:text-sm">
                    {formatVal(node.value)}
                  </div>
                  <div className="text-[10px] font-semibold opacity-90">
                    {pct.toFixed(1)}% of total
                  </div>
                </div>

                {/* Detailed Hover Flyout */}
                {isHovered && node.description && (
                  <div className="absolute inset-0 bg-slate-950/90 text-white p-2.5 rounded-lg flex flex-col justify-center text-[10px] z-30 animate-in fade-in">
                    <span className="font-bold text-xs mb-1">{node.name}</span>
                    <span className="opacity-80">{node.description}</span>
                    <span className="font-mono mt-1 font-bold text-indigo-300">
                      {formatVal(node.value)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
