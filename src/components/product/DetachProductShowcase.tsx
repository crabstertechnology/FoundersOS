'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Wifi, Battery, Shield, Zap, Smartphone, Package,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const HARDWARE_PILLARS = [
  {
    icon: Zap,
    title: 'Latency',
    val: '< 50ms',
    tag: 'Instant trigger',
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Battery,
    title: 'Battery',
    val: '36 hrs',
    tag: 'Standby life',
    color: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Shield,
    title: 'Crypto',
    val: 'AES-256',
    tag: 'Hardware pairing',
    color: 'text-indigo-400',
    border: 'border-indigo-500/20',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: Wifi,
    title: 'Wireless',
    val: 'BT 5.3',
    tag: 'NFC tap sync',
    color: 'text-sky-400',
    border: 'border-sky-500/20',
    bg: 'bg-sky-500/10',
  },
  {
    icon: Package,
    title: 'Weight',
    val: '42 g',
    tag: 'Pocket palm-fit',
    color: 'text-rose-400',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/10',
  },
];

const DETACH_FEATURES = [
  {
    icon: Wifi,
    title: 'Instant Wireless Detach',
    description: 'One-tap wireless disconnection from any paired device. No cables, no friction — seamless separation.',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  {
    icon: Battery,
    title: 'All-Day Battery Life',
    description: 'Up to 36 hours of standby power in an ultra-compact form factor. Charge once, run all day.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Shield,
    title: 'Secure Encrypted Pairing',
    description: 'Military-grade AES-256 encryption ensures only authorised devices can pair and detach.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: Zap,
    title: 'Sub-50ms Response',
    description: 'Ultra-low latency detach signal — faster than a human blink. Built for real-time mission-critical use.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Smartphone,
    title: 'Cross-Platform App',
    description: 'Companion iOS & Android app for device management, detach history logs, and remote triggers.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Package,
    title: 'Pocket-Sized Hardware',
    description: 'Weighs just 42 g. Fits in your palm, attaches magnetically, and carries anywhere with the wrist strap.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
];

const FULL_SPECS = [
  { label: 'Weight', value: '42 g' },
  { label: 'Battery Standby', value: '36 hours (USB-C Fast Charge)' },
  { label: 'Connectivity', value: 'Bluetooth 5.3 Low Energy + NFC' },
  { label: 'Cryptographic Core', value: 'AES-256 Hardware Encrypted' },
  { label: 'Response Latency', value: '< 50 ms' },
  { label: 'Ingress Protection', value: 'IP54 Certified' },
  { label: 'Enclosure Material', value: 'Matte Polycarbonate with Anodized Trim' },
  { label: 'Companion Apps', value: 'iOS 16+ & Android 12+' },
];

export function DetachProductShowcase() {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      {/* ── Fixed Compact Horizontal Visualized Overview Bar ── */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 text-white shadow-xs p-3.5 sm:p-4 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 left-1/3 w-40 h-40 rounded-full bg-sky-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-4">
          
          {/* Left: Device Thumbnail + Identity + Pitch */}
          <div className="flex items-center gap-3.5 sm:gap-4 shrink-0 w-full xl:w-auto">
            {/* Device Image Thumbnail */}
            <div className="relative w-14 h-16 sm:w-16 sm:h-20 shrink-0 drop-shadow-lg">
              <Image
                src="/detach-device.png"
                alt="Detach Device"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                  Detach
                </h3>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Flagship
                </span>
                <span className="hidden sm:inline-block text-[10px] text-indigo-300/80 font-bold tracking-tight">
                  by EZCirkit
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium line-clamp-1 mt-1 max-w-sm sm:max-w-md">
                One-tap wireless hardware companion to physically disconnect for deep focus.
              </p>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold">
                  IP54 · Matte Finish · iOS & Android
                </span>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="text-[10px] font-extrabold text-indigo-300 hover:text-white underline underline-offset-2 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  View Full Specs &amp; Features <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Visualized Horizontal Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full xl:w-auto xl:flex-1 max-w-3xl">
            {HARDWARE_PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`p-2 sm:p-2.5 rounded-xl border ${item.border} ${item.bg} backdrop-blur-xs flex flex-col justify-between transition-all hover:bg-white/5`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {item.title}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-white tracking-tight block">
                      {item.val}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium block truncate">
                      {item.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Dialog for Full Technical Specs & Architecture (Zero clutter on main page) ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto p-0 border border-slate-200 shadow-2xl">
          <DialogHeader className="p-5 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-14 shrink-0 drop-shadow-sm">
                <Image
                  src="/detach-device.png"
                  alt="Detach Device"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  Detach Technical Architecture &amp; Specs
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                    Flagship
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                  Physical disconnect hardware companion engineered for instant focus and digital boundary control.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-6">
            {/* Features Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Core Hardware Architecture
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DETACH_FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.title}
                      className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-start gap-3"
                    >
                      <div className={`p-2 rounded-lg ${feat.bg} shrink-0`}>
                        <Icon className={`w-4 h-4 ${feat.color}`} />
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-black text-slate-900">{feat.title}</h5>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{feat.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Technical Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FULL_SPECS.map((spec) => (
                  <div
                    key={spec.label}
                    className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-0.5"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                      {spec.label}
                    </span>
                    <span className="text-xs font-black text-slate-800 block truncate">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
