'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtINR } from '@/lib/utils/formatters';

export interface SunburstChild {
  name: string;
  value: number;
  color?: string;
  description?: string;
}

export interface SunburstCategory {
  name: string;
  color: string;
  children: SunburstChild[];
}

interface SunburstChartProps {
  title?: string;
  subtitle?: string;
  data: SunburstCategory[];
  isCurrency?: boolean;
  unit?: string;
  height?: number;
  className?: string;
}

export function SunburstChart({
  title,
  subtitle,
  data,
  isCurrency = false,
  unit = '%',
  height = 340,
  className = '',
}: SunburstChartProps) {
  const [hoveredItem, setHoveredItem] = useState<{ name: string; value: number; parent?: string } | null>(null);

  // Calculate totals
  const totalValue = data.reduce(
    (sum, cat) => sum + cat.children.reduce((cSum, ch) => cSum + ch.value, 0),
    0
  ) || 1;

  const formatVal = (val: number) => {
    if (isCurrency) return fmtINR(val);
    return `${val.toLocaleString()}${unit}`;
  };

  // Helper to calculate SVG arc path
  const describeArc = (
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };

    // Prevent full 360 loop overlap bug
    const safeEndAngle = endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;

    const startOuter = polarToCartesian(x, y, outerRadius, safeEndAngle);
    const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
    const startInner = polarToCartesian(x, y, innerRadius, safeEndAngle);
    const endInner = polarToCartesian(x, y, innerRadius, startAngle);

    const arcSweep = safeEndAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', startOuter.x, startOuter.y,
      'A', outerRadius, outerRadius, 0, arcSweep, 0, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', innerRadius, innerRadius, 0, arcSweep, 1, startInner.x, startInner.y,
      'Z',
    ].join(' ');
  };

  // Geometry
  const cx = 170;
  const cy = 170;
  const innerRingInner = 45;
  const innerRingOuter = 95;
  const outerRingInner = 102;
  const outerRingOuter = 155;

  let currentAngle = 0;

  return (
    <Card className={`border border-border/80 shadow-sm bg-card overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {title && <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">{title}</CardTitle>}
              {subtitle && <CardDescription className="text-xs text-muted-foreground mt-0.5">{subtitle}</CardDescription>}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-muted-foreground">Radial Hierarchy: Inner = Class, Outer = Shareholder</span>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-4 pb-4 flex flex-col md:flex-row items-center justify-center gap-6">
        {/* SVG Sunburst Ring */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: 340, height: 340 }}>
          <svg width={340} height={340} viewBox="0 0 340 340" className="overflow-visible select-none">
            {data.map((cat, catIdx) => {
              const catTotal = cat.children.reduce((sum, ch) => sum + ch.value, 0);
              const catSweep = (catTotal / totalValue) * 360;
              const catStartAngle = currentAngle;
              const catEndAngle = currentAngle + catSweep;

              let childStartAngle = catStartAngle;

              const innerArc = describeArc(cx, cy, innerRingInner, innerRingOuter, catStartAngle, catEndAngle);

              const elements = (
                <g key={catIdx}>
                  {/* Inner Arc (Category) */}
                  <path
                    d={innerArc}
                    fill={cat.color}
                    className="transition-all duration-200 cursor-pointer opacity-90 hover:opacity-100 hover:brightness-110"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    onMouseEnter={() => setHoveredItem({ name: cat.name, value: catTotal })}
                    onMouseLeave={() => setHoveredItem(null)}
                  />

                  {/* Outer Arcs (Children) */}
                  {cat.children.map((child, chIdx) => {
                    const chSweep = (child.value / totalValue) * 360;
                    const chStart = childStartAngle;
                    const chEnd = childStartAngle + chSweep;
                    childStartAngle = chEnd;

                    const outerArc = describeArc(cx, cy, outerRingInner, outerRingOuter, chStart, chEnd);

                    return (
                      <path
                        key={chIdx}
                        d={outerArc}
                        fill={child.color || cat.color}
                        className="transition-all duration-200 cursor-pointer opacity-80 hover:opacity-100 hover:brightness-115"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        onMouseEnter={() => setHoveredItem({ name: child.name, value: child.value, parent: cat.name })}
                        onMouseLeave={() => setHoveredItem(null)}
                      />
                    );
                  })}
                </g>
              );

              currentAngle = catEndAngle;
              return elements;
            })}

            {/* Center Circle */}
            <circle cx={cx} cy={cy} r={innerRingInner - 5} fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {hoveredItem ? (
              <div className="animate-in fade-in zoom-in-95">
                <div className="text-[10px] uppercase font-bold text-muted-foreground truncate max-w-[80px]">
                  {hoveredItem.parent || 'Category'}
                </div>
                <div className="text-xs font-bold text-foreground truncate max-w-[85px]">
                  {hoveredItem.name}
                </div>
                <div className="text-xs font-extrabold font-mono text-primary mt-0.5">
                  {formatVal(hoveredItem.value)}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Total</div>
                <div className="text-xs font-extrabold text-foreground font-mono">{formatVal(totalValue)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Legend / Breakdown List */}
        <div className="w-full md:flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {data.map((cat, cI) => (
            <div key={cI} className="p-2.5 rounded-lg border border-border/70 bg-slate-50/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatVal(cat.children.reduce((s, c) => s + c.value, 0))}
                </span>
              </div>
              <div className="pl-4 space-y-1">
                {cat.children.map((child, chI) => (
                  <div key={chI} className="flex items-center justify-between text-[11px] text-foreground/80 hover:text-foreground">
                    <span className="truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {child.name}
                    </span>
                    <span className="font-mono font-semibold ml-2">{formatVal(child.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
