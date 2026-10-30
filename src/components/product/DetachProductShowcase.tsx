'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import {
  Wifi, Battery, Shield, Zap, Smartphone, Package,
  ArrowUpRight, CheckCircle2, Star, ChevronDown, ChevronUp
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
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* ── Hero band ── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-0">
          {/* Left – copy */}
          <div className="flex-1 p-8 md:p-12 space-y-5">
            {/* badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                <Star className="w-3 h-3 fill-indigo-300 text-indigo-300" />
                Flagship Hardware
              </span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Now Available
              </span>
            </div>

            {/* heading */}
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
                Detach
              </h2>
              <p className="text-indigo-200/70 text-sm font-semibold mt-1 uppercase tracking-widest">
                by EZCirkit · Physical Disconnect Device
              </p>
            </div>

            <p className="text-slate-300/90 text-sm md:text-base leading-relaxed max-w-lg">
              <strong className="text-white">Detach</strong> is a pocket-sized wireless hardware device that lets you
              physically disconnect — from your phone, your desk, your digital world — with a single tap.
              Built for founders, remote workers, and high-performers who need hard boundaries between deep-work
              and downtime. Premium matte-black finish with a gold-clasp wrist strap.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button className="inline-flex items-center gap-2 bg-white text-slate-900 font-extrabold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg shadow-black/20">
                Learn More
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button className="inline-flex items-center gap-2 border border-white/20 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors">
                Pre-order Now
              </button>
            </div>

            {/* quick specs strip */}
            <div className="flex flex-wrap gap-3 pt-2">
              {['42 g', 'BT 5.3', '36 hr battery', 'IP54', 'AES-256'].map((s) => (
                <span
                  key={s}
                  className="bg-white/10 border border-white/10 text-white/80 text-[11px] font-bold px-2.5 py-1 rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Right – product image */}
          <div className="lg:w-80 xl:w-96 flex items-end justify-center p-8 lg:p-12 shrink-0">
            <div className="relative w-56 h-72 lg:w-64 lg:h-80 drop-shadow-2xl">
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

      {/* ── Feature grid ── */}
      <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-200/60">
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-900">What Makes Detach Different</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Hardware-grade freedom for the always-on generation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DETACH_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`flex items-start gap-4 p-4 rounded-xl border bg-white ${feat.border} hover:shadow-sm transition-shadow`}
              >
                <div className={`p-2.5 rounded-lg ${feat.bg} shrink-0`}>
                  <Icon className={`w-5 h-5 ${feat.color}`} />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-black text-slate-900 leading-tight">{feat.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{feat.description}</p>
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
          className="w-full flex items-center justify-between px-6 md:px-8 py-4 text-sm font-black text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            Technical Specifications
          </span>
          {specsExpanded
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {specsExpanded && (
          <div className="px-6 md:px-8 pb-6 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-200">
            {SPECS.map((spec) => (
              <div key={spec.label} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{spec.label}</p>
                <p className="text-sm font-bold text-slate-900">{spec.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

