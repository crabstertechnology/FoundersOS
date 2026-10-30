'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Box, Sparkles, Layers, DollarSign, Users, Calendar, Code, AlertCircle } from 'lucide-react';
import { TrackedProduct, ProductStage, ProductStatus, ProductPriority } from './types';

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: TrackedProduct | null;
  onSave: (productData: Partial<TrackedProduct>) => void;
  readOnly?: boolean;
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  onSave,
  readOnly
}: ProductModalProps) {
  const isEditing = !!product;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [pricingModel, setPricingModel] = useState('saas_subscription');
  const [stage, setStage] = useState<ProductStage>('mvp');
  const [status, setStatus] = useState<ProductStatus>('on_track');
  const [priority, setPriority] = useState<ProductPriority>('medium');
  const [mrr, setMrr] = useState<number>(0);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [techStack, setTechStack] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setTargetAudience(product.targetAudience || '');
      setPricingModel(product.pricingModel || 'saas_subscription');
      setStage(product.stage || 'mvp');
      setStatus(product.status || 'on_track');
      setPriority(product.priority || 'medium');
      setMrr(product.mrr || 0);
      setUsersCount(product.usersCount || 0);
      setTechStack(product.techStack || '');
      setLaunchDate(product.launchDate || '');
      setCustomQuestion(product.customQuestion || '');
    } else {
      setName('');
      setDescription('');
      setTargetAudience('');
      setPricingModel('saas_subscription');
      setStage('mvp');
      setStatus('on_track');
      setPriority('medium');
      setMrr(0);
      setUsersCount(0);
      setTechStack('');
      setLaunchDate('');
      setCustomQuestion('');
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || readOnly) return;

    onSave({
      id: product?.id,
      name: name.trim(),
      description: description.trim(),
      targetAudience: targetAudience.trim(),
      pricingModel,
      stage,
      status,
      priority,
      mrr: Number(mrr) || 0,
      usersCount: Number(usersCount) || 0,
      techStack: techStack.trim(),
      launchDate: launchDate.trim(),
      customQuestion: customQuestion.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto p-6 border border-slate-200 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-600" />
            {isEditing ? `Edit Tracked Product: ${product?.name}` : 'Add New Product to Suite'}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-slate-500">
            Define product specifications, monetization, stage, and operational metrics for strategic portfolio tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="font-black text-xs uppercase tracking-wider text-slate-500">
                Product / Tool Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. FounderOS Web App or AI Co-founder API"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={readOnly}
                className="border-slate-200 font-semibold h-10"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="font-black text-xs uppercase tracking-wider text-slate-500">
                Product Description & Value Proposition <span className="text-red-500">*</span>
              </Label>
              <textarea
                rows={4}
                placeholder="Describe what the product does, key problem it solves, core features, and how customers use it..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                disabled={readOnly}
                className="w-full text-sm font-medium p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-black text-xs uppercase tracking-wider text-slate-500">
                Target Audience / Ideal Customer Profile (ICP)
              </Label>
              <Input
                placeholder="e.g. Early-stage B2B founders, D2C brands, Tech leads"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                disabled={readOnly}
                className="border-slate-200 font-medium h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-black text-xs uppercase tracking-wider text-slate-500">
                Pricing Model
              </Label>
              <Select value={pricingModel} onValueChange={setPricingModel} disabled={readOnly}>
                <SelectTrigger className="w-full h-10 border-slate-200 font-medium">
                  <SelectValue placeholder="Select pricing strategy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saas_subscription">SaaS Subscription (Monthly / Annual)</SelectItem>
                  <SelectItem value="freemium">Freemium (Free tier + Paid Pro features)</SelectItem>
                  <SelectItem value="usage_based">Usage-based / Pay-as-you-go</SelectItem>
                  <SelectItem value="one_time">One-time / Perpetual License</SelectItem>
                  <SelectItem value="enterprise">Enterprise Custom Pricing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lifecycle & Health Tracking */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Lifecycle & Portfolio Tracking
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-[11px] text-slate-600">Product Stage</Label>
                <Select value={stage} onValueChange={(val: any) => setStage(val)} disabled={readOnly}>
                  <SelectTrigger className="w-full h-9 bg-white border-slate-200 font-medium text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">Concept / Discovery</SelectItem>
                    <SelectItem value="mvp">MVP in Development</SelectItem>
                    <SelectItem value="beta">Private / Public Beta</SelectItem>
                    <SelectItem value="launched">Live / Launched</SelectItem>
                    <SelectItem value="scaling">Growth / Scaling</SelectItem>
                    <SelectItem value="sunset">Sunset / Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-[11px] text-slate-600">Health Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)} disabled={readOnly}>
                  <SelectTrigger className="w-full h-9 bg-white border-slate-200 font-medium text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">🟢 On Track</SelectItem>
                    <SelectItem value="thriving">🚀 Thriving</SelectItem>
                    <SelectItem value="needs_attention">⚠️ Needs Attention</SelectItem>
                    <SelectItem value="blocked">🔴 Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-[11px] text-slate-600">Portfolio Priority</Label>
                <Select value={priority} onValueChange={(val: any) => setPriority(val)} disabled={readOnly}>
                  <SelectTrigger className="w-full h-9 bg-white border-slate-200 font-medium text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High Priority (Focus)</SelectItem>
                    <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                    <SelectItem value="low">⚪ Low Priority / Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-[11px] text-slate-600 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Monthly MRR (₹)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="0"
                  value={mrr || ''}
                  onChange={e => setMrr(Number(e.target.value) || 0)}
                  disabled={readOnly}
                  className="bg-white border-slate-200 h-9 font-semibold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-[11px] text-slate-600 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Active Users / Orgs
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={usersCount || ''}
                  onChange={e => setUsersCount(Number(e.target.value) || 0)}
                  disabled={readOnly}
                  className="bg-white border-slate-200 h-9 font-semibold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-[11px] text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Target Release / Date
                </Label>
                <Input
                  placeholder="e.g. Q4 2026 or Live"
                  value={launchDate}
                  onChange={e => setLaunchDate(e.target.value)}
                  disabled={readOnly}
                  className="bg-white border-slate-200 h-9 font-medium text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-[11px] text-slate-600 flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-slate-500" />
                  Tech Stack
                </Label>
                <Input
                  placeholder="e.g. Next.js, FastAPI, AI"
                  value={techStack}
                  onChange={e => setTechStack(e.target.value)}
                  disabled={readOnly}
                  className="bg-white border-slate-200 h-9 font-medium text-xs"
                />
              </div>
            </div>
          </div>

          {/* Custom Founder Inquiry */}
          <div className="space-y-1.5">
            <Label className="font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
              Founder Strategic Question / Focus
              <span className="text-[10px] text-slate-400 lowercase font-normal">(optional)</span>
            </Label>
            <textarea
              rows={2}
              placeholder="e.g. 'Should we charge a monthly fee or lifetime deal?', 'Does this dilute focus from our flagship product?'..."
              value={customQuestion}
              onChange={e => setCustomQuestion(e.target.value)}
              disabled={readOnly}
              className="w-full text-sm font-medium p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={readOnly || !name.trim() || !description.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 px-5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              {isEditing ? 'Save Product Updates' : 'Add to Product Suite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
