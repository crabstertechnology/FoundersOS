'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import {
  Wifi, Battery, Shield, Zap, Smartphone, Package,
  ArrowUpRight, CheckCircle2, Star, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';

const DETACH_FEATURES = [
  {
    icon: Wifi,
    title: 'Instant Wireless Detach',
    description: 'One-tap wireless disconnection from any paired device. No cables, no friction — just seamless separation.',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  {
    icon: Battery,
    title: 'All-Day Battery Life',
    description: 'Up to 36 hours of standby power in an ultra-compact form factor. Charge once, run all day.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    icon: Shield,
    title: 'Secure Encrypted Pairing',
    description: 'Military-grade AES-256 encryption ensures only authorised devices can pair and detach.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  {
    icon: Zap,
    title: 'Sub-50ms Response',
    description: 'Ultra-low latency detach signal — faster than a human blink. Built for real-time, mission-critical use.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    icon: Smartphone,
    title: 'Cross-Platform App',
    description: 'Companion iOS & Android app for device management, detach history logs, and remote trigger.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  {
    icon: Package,
    title: 'Pocket-Sized Hardware',
    description: 'Weighs just 42 g. Fits in your palm, attaches magnetically, carries anywhere with the premium wrist strap.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
];

const SPECS = [
  { label: 'Weight', value: '42 g' },
  { label: 'Battery', value: '36 hr standby' },
  { label: 'Connectivity', value: 'Bluetooth 5.3 + NFC' },
  { label: 'Encryption', value: 'AES-256' },
  { label: 'Response Time', value: '< 50 ms' },
  { label: 'Water Resistance', value: 'IP54 rated' },
  { label: 'Strap', value: 'Premium nylon wrist-loop' },
  { label: 'App', value: 'iOS 16+ / Android 12+' },
];

export function DetachProductShowcase() {
  const [specsExpanded, setSpecsExpanded] = useState(false);

  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      {/* ── Hero band (Medium Sized) ── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-sky-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-4">
          {/* Left – copy */}
          <div className="flex-1 p-5 md:p-6 space-y-3">
            {/* badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                <Star className="w-3 h-3 fill-indigo-300 text-indigo-300" />
                Flagship Hardware
              </span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Active Device
              </span>
            </div>

            {/* heading */}
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                Detach
              </h2>
              <p className="text-indigo-200/70 text-xs font-semibold mt-0.5 uppercase tracking-wider">
                by EZCirkit · Physical Disconnect Companion
              </p>
            </div>

            <p className="text-slate-300/90 text-xs md:text-sm leading-relaxed max-w-lg">
              <strong className="text-white">Detach</strong> is a pocket-sized wireless hardware companion that lets you
              physically disconnect — from your phone, your desk, your digital world — with a single tap.
              Built for founders, remote workers, and high-performers who need hard boundaries between deep-work
              and downtime.
            </p>

            {/* quick specs strip */}
            <div className="flex flex-wrap gap-2 pt-1">
              {['42 g', 'BT 5.3', '36 hr battery', 'IP54', 'AES-256'].map((s) => (
                <span
                  key={s}
                  className="bg-white/10 border border-white/10 text-white/80 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Right – product image (Medium Size) */}
          <div className="md:w-56 lg:w-64 flex items-center justify-center p-4 md:p-6 shrink-0">
            <div className="relative w-36 h-48 md:w-44 md:h-56 drop-shadow-xl">
              <Image
                src="/detach-device.png"
                alt="Detach device – matte black wireless physical disconnect hardware"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature grid (Medium/Compact) ── */}
      <div className="p-4 md:p-5 bg-slate-50/50 border-t border-slate-200/60">
        <div className="mb-3">
          <h3 className="text-sm font-black text-slate-900">What Makes Detach Different</h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Hardware-grade freedom for the always-on generation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DETACH_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`flex items-start gap-3 p-3 rounded-lg border bg-white ${feat.border} hover:shadow-sm transition-shadow`}
              >
                <div className={`p-2 rounded-md ${feat.bg} shrink-0`}>
                  <Icon className={`w-4 h-4 ${feat.color}`} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-black text-slate-900 leading-tight">{feat.title}</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Specs accordion ── */}
      <div className="border-t border-slate-200/60">
        <button
          type="button"
          onClick={() => setSpecsExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            Technical Specifications
          </span>
          {specsExpanded
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {specsExpanded && (
          <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-in fade-in duration-200">
            {SPECS.map((spec) => (
              <div key={spec.label} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{spec.label}</p>
                <p className="text-xs font-bold text-slate-900">{spec.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

