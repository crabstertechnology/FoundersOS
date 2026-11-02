'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fmtINR } from '@/lib/utils/formatters';

export interface AreaDataPoint {
  period: string;
  primaryVal: number;
  secondaryVal?: number;
  targetVal?: number;
  [key: string]: string | number | undefined;
}

interface AreaGrowthChartProps {
  title?: string;
  subtitle?: string;
  data: AreaDataPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryKey?: string;
  secondaryKey?: string;
  isCurrency?: boolean;
  unit?: string;
  height?: number;
  className?: string;
  gradientColorPrimary?: string;
  gradientColorSecondary?: string;
}

export function AreaGrowthChart({
  title,
  subtitle,
  data,
  primaryLabel = 'Actual',
  secondaryLabel = 'Target / Baseline',
  primaryKey = 'primaryVal',
  secondaryKey,
  isCurrency = true,
  unit = '',
  height = 280,
  className = '',
  gradientColorPrimary = '#4f46e5', // Indigo
  gradientColorSecondary = '#059669', // Emerald
}: AreaGrowthChartProps) {
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
            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: gradientColorPrimary }} /> {primaryLabel}
              </span>
              {secondaryKey && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: gradientColorSecondary }} /> {secondaryLabel}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-4 pb-2 px-2 sm:px-4">
        <div style={{ height: `${height}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientColorPrimary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={gradientColorPrimary} stopOpacity={0.0} />
                </linearGradient>
                {secondaryKey && (
                  <linearGradient id="areaGradSecondary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gradientColorSecondary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={gradientColorSecondary} stopOpacity={0.0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="period"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  if (isCurrency) {
                    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                    return `₹${v}`;
                  }
                  return String(v);
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                        <div className="font-bold text-slate-200">{label}</div>
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center justify-between gap-3 font-mono text-[11px]">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-bold text-white">{formatVal(Number(entry.value))}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {secondaryKey && (
                <Area
                  type="monotone"
                  dataKey={secondaryKey}
                  name={secondaryLabel}
                  stroke={gradientColorSecondary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaGradSecondary)"
                />
              )}
              <Area
                type="monotone"
                dataKey={primaryKey}
                name={primaryLabel}
                stroke={gradientColorPrimary}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#areaGradPrimary)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
