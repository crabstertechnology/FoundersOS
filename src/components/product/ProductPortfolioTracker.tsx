'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Box, Sparkles, Plus, Search, Filter, Layers, DollarSign, Users,
  Calendar, Code, Edit3, Trash2, ArrowUpRight, CheckCircle2,
  AlertTriangle, ShieldAlert, Zap, Compass, Check
} from 'lucide-react';
import { TrackedProduct, ProductStage, ProductStatus, ProductPriority } from './types';
import { DetachProductShowcase } from './DetachProductShowcase';

interface ProductPortfolioTrackerProps {
  products: TrackedProduct[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  onOpenAddModal: () => void;
  onEditProduct: (product: TrackedProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateProductStatus: (productId: string, newStatus: ProductStatus) => void;
  onGoToBlueprint: (productId: string) => void;
  onGoToRecommendations: () => void;
  readOnly?: boolean;
}

export function ProductPortfolioTracker({
  products,
  selectedProductId,
  onSelectProduct,
  onOpenAddModal,
  onEditProduct,
  onDeleteProduct,
  onUpdateProductStatus,
  onGoToBlueprint,
  onGoToRecommendations,
  readOnly
}: ProductPortfolioTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Compute portfolio KPIs
  const totalProducts = products.length;
  const totalSuiteMrr = products.reduce((acc, p) => acc + (Number(p.mrr) || 0), 0);
  const totalUsers = products.reduce((acc, p) => acc + (Number(p.usersCount) || 0), 0);
  
  const stageCounts = useMemo(() => {
    const counts = { launched: 0, scaling: 0, beta: 0, mvp: 0, concept: 0, sunset: 0 };
    products.forEach(p => {
      const s = p.stage || 'mvp';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.targetAudience && p.targetAudience.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStage = stageFilter === 'all' || p.stage === stageFilter;
      const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchesSearch && matchesStage && matchesPriority && matchesStatus;
    });
  }, [products, searchTerm, stageFilter, priorityFilter, statusFilter]);

  const getStageBadge = (stage: ProductStage) => {
    switch (stage) {
      case 'scaling':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Scaling</span>;
      case 'launched':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Live</span>;
      case 'beta':
        return <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Beta</span>;
      case 'mvp':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">MVP</span>;
      case 'concept':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Concept</span>;
      case 'sunset':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Sunset</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Unknown</span>;
    }
  };

  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'thriving':
        return <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">🚀 Thriving</span>;
      case 'on_track':
        return <span className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">🟢 On Track</span>;
      case 'needs_attention':
        return <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">⚠️ Needs Attention</span>;
      case 'blocked':
        return <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">🔴 Blocked</span>;
      default:
        return null;
    }
  };

  const getPriorityPill = (priority: ProductPriority) => {
    switch (priority) {
      case 'high':
        return <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase">High Priority</span>;
      case 'medium':
        return <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase">Med Priority</span>;
      case 'low':
        return <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase">Low Priority</span>;
      default:
        return null;
    }
  };

  const formatPricingName = (model?: string) => {
    switch (model) {
      case 'saas_subscription': return 'SaaS Subscription';
      case 'freemium': return 'Freemium';
      case 'usage_based': return 'Usage-based';
      case 'one_time': return 'One-time License';
      case 'enterprise': return 'Enterprise Custom';
      default: return model || 'Standard';
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracked Products</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalProducts}</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {stageCounts.launched + stageCounts.scaling} live • {stageCounts.mvp + stageCounts.beta} in dev
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Suite MRR</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                ₹{totalSuiteMrr.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Across all active offerings
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Combined Users / Orgs</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {totalUsers.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Active customer footprint
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 bg-gradient-to-br from-indigo-500/10 via-white to-purple-500/10 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">Portfolio Strategist</p>
              <h3 className="text-sm font-black text-slate-900 mt-1">Multi-Product Synergy</h3>
              <Button
                variant="link"
                size="sm"
                onClick={onGoToRecommendations}
                className="p-0 h-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-0.5"
              >
                View Recommendations <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Detach Featured Product Showcase ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Featured Product</span>
          <span className="h-px flex-1 bg-slate-200/80" />
          <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">
            Flagship Hardware
          </span>
        </div>
        <DetachProductShowcase />
      </div>

      {/* ── Tracked Products Section Header ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Your Tracked Products</span>
        <span className="h-px flex-1 bg-slate-200/80" />
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search products, ICP, features..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-white border-slate-200 text-xs font-medium"
            />
          </div>

          {/* Stage Filter */}
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[125px] h-9 bg-white border-slate-200 text-xs font-bold text-slate-700">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="concept">Concept</SelectItem>
              <SelectItem value="mvp">MVP</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="launched">Live</SelectItem>
              <SelectItem value="scaling">Scaling</SelectItem>
              <SelectItem value="sunset">Sunset</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[125px] h-9 bg-white border-slate-200 text-xs font-bold text-slate-700">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Health Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[135px] h-9 bg-white border-slate-200 text-xs font-bold text-slate-700">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="thriving">Thriving</SelectItem>
              <SelectItem value="needs_attention">Needs Attention</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={onOpenAddModal}
            disabled={readOnly}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => {
            const isSelected = p.id === selectedProductId;
            return (
              <Card
                key={p.id}
                onClick={() => onGoToBlueprint(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onGoToBlueprint(p.id);
                  }
                }}
                className={`group cursor-pointer flex flex-col border overflow-hidden rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 select-none text-left ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/15 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-slate-200/90 bg-white hover:border-indigo-400'
                }`}
              >
                {/* Luna Showcase / Product Visual Area */}
                <div className="relative w-full h-44 overflow-hidden bg-slate-900 border-b border-slate-100">
                  <Image
                    src={p.imageUrl || '/luna.png'}
                    alt={`${p.name} - Luna`}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/20 pointer-events-none" />

                  {/* Badges on top */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStageBadge(p.stage)}
                      {getPriorityPill(p.priority)}
                    </div>
                    <div>
                      {getStatusBadge(p.status)}
                    </div>
                  </div>

                  {/* Overlay prompt badge */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold pointer-events-none">
                    <span className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md px-2.5 py-0.5 rounded-full text-indigo-200 border border-white/15 shadow-sm">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Deep Dive Blueprint</span>
                    </span>
                    <span className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-white group-hover:bg-indigo-600 transition-colors shadow-sm">
                      <span>Open</span>
                      <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

                <CardHeader className="p-4 pb-2 space-y-1.5">
                  <h3 className="text-base font-black text-slate-900 tracking-tight truncate group-hover:text-indigo-600 transition-colors" title={p.name}>
                    {p.name}
                  </h3>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between space-y-4">
                  {/* Metadata Chips */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-slate-400 text-[11px]">MRR:</span>
                        <span className="font-bold text-slate-800">
                          {p.mrr ? `₹${p.mrr.toLocaleString('en-IN')}` : '₹0'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="text-slate-400 text-[11px]">Users:</span>
                        <span className="font-bold text-slate-800">
                          {p.usersCount ? p.usersCount.toLocaleString('en-IN') : '0'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5 text-[10px] font-semibold">
                        {formatPricingName(p.pricingModel)}
                      </span>
                      {p.targetAudience && (
                        <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5 text-[10px] font-semibold truncate max-w-[170px]" title={p.targetAudience}>
                          ICP: {p.targetAudience}
                        </span>
                      )}
                      {p.techStack && (
                        <span className="bg-indigo-50 text-indigo-700 rounded px-2 py-0.5 text-[10px] font-semibold truncate max-w-[150px]" title={p.techStack}>
                          {p.techStack}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Deep Dive Blueprint</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProduct(p);
                        }}
                        disabled={readOnly}
                        title="Edit Product Specs"
                        className="h-8 w-8 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>

                      {!readOnly && products.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProduct(p.id);
                          }}
                          title="Delete Product from Suite"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center shadow-sm">
          <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
            <div className="p-4 bg-indigo-50 rounded-full border border-indigo-100">
              <Box className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                {products.length === 0 ? 'No Products Added Yet' : 'No Products Match Your Filter'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                {products.length === 0
                  ? 'Start by adding your flagship product, tool, or service to track your multi-product suite and get AI recommendations.'
                  : 'Try clearing your search term or adjusting stage/priority filters to see other products.'}
              </p>
            </div>
            {products.length === 0 ? (
              <Button
                type="button"
                onClick={onOpenAddModal}
                disabled={readOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 gap-2 mt-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Your First Product
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStageFilter('all');
                  setPriorityFilter('all');
                  setStatusFilter('all');
                }}
                className="font-bold text-xs h-9 px-4"
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
