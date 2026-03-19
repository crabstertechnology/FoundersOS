'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, Zap, TrendingUp, Users, ShieldCheck, PieChart, Briefcase, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function BusinessModelGuide() {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 border-primary/10 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              The FounderOS Value Prop
            </CardTitle>
            <CardDescription>Why this product exists and how it scales.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">The Problem</h4>
              <p className="text-sm leading-relaxed">
                Most Indian founders are technical or sales-driven but lack the "CFO lens." They lose control in early rounds because of <strong>equity ignorance</strong> or <strong>bad unit economics</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm uppercase tracking-wider text-primary">The Solution</h4>
              <p className="text-sm leading-relaxed">
                FounderOS is the "Analytical Sidekick." It provides VC-grade tools for valuation, cap table monitoring, and unit economics tracking, specifically localized for the Indian market (₹, Cr/L formatting, TN regulations).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-accent/10 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-accent/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-foreground" />
              Revenue Engine
            </CardTitle>
            <CardDescription>How the product generates sustainable cash flow.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                <Badge variant="outline" className="font-bold">Pro</Badge>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Subscription (SaaS)</div>
                <div className="text-xs text-muted-foreground">₹2,499/mo for Dilution Simulator & AI Advisor.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">Expert Marketplace</div>
                <div className="text-xs text-muted-foreground">Lead-gen fees for connecting with CAs & Lawyers.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-black text-center">Your Business Model Lab</h3>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Use the frameworks below to map out your startup's core strategy. A product is just code; a business is a repeatable engine.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border rounded-2xl space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-lg">Customer Segments</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Who are you solving for? Don't say "everyone." Define your ICP (Ideal Customer Profile) by stage, geography, and pain point.
            </p>
          </div>
          <div className="p-6 bg-white border rounded-2xl space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent-foreground">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-lg">Value Prop</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Why would they pay? Are you a vitamin (nice to have) or a painkiller (must have)? FounderOS is a painkiller for legal/equity risk.
            </p>
          </div>
          <div className="p-6 bg-white border rounded-2xl space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <PieChart className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-lg">Unit Economics</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Does the math work? Can you acquire a customer for less than the profit they generate in their lifetime? (Target 3:1).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-10 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-3xl font-black">Strategic Reality Check</h3>
            <p className="text-slate-400 font-medium">If your business doesn't help a customer save time, make money, or avoid risk, it's a hobby.</p>
          </div>
          <Badge className="bg-accent text-accent-foreground text-sm py-2 px-4 rounded-full font-bold">TN Startup Hub Edition</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="text-xs uppercase font-bold tracking-widest text-slate-500">Immediate Next Steps</div>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">1</span>
                Validate your LTV:CAC using the Valuation Calculator.
              </li>
              <li className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">2</span>
                Check your founder control in the Cap Table Tracker.
              </li>
              <li className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">3</span>
                Study the "Dark Patterns" in the Glossary before your next call.
              </li>
            </ul>
          </div>
          <div className="flex items-center justify-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
            <div className="text-center space-y-4">
              <Briefcase className="w-12 h-12 mx-auto text-primary opacity-50" />
              <div className="text-sm font-medium italic text-slate-400">"Build things that people actually want to use to make money."</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
