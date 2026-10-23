'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { productAdvisorAssistant } from '@/ai/flows/product-advisor-flow';
import ReactMarkdown from 'react-markdown';
import { 
  Box, Sparkles, Loader2, Code, TrendingUp, DollarSign, ListTodo, AlertTriangle, 
  HelpCircle, ChevronRight, FileText, CheckCircle2, Mic, Presentation,
  History, Clock, Trash2, RotateCcw, Save, Check, Plus, Edit3, Compass,
  Layers, ChevronDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrackedProduct, ProductSuiteRecommendationData, ProductStatus } from './types';
import { ProductModal } from './ProductModal';
import { ProductPortfolioTracker } from './ProductPortfolioTracker';
import { ProductSuiteRecommendations } from './ProductSuiteRecommendations';

interface ProductDashboardProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
}

export function ProductDashboard({ userId, companyProfileId, readOnly }: ProductDashboardProps) {
  // Main Suite Navigation Tab: 'portfolio' | 'blueprint' | 'recommendations'
  const [mainTab, setMainTab] = useState<'portfolio' | 'blueprint' | 'recommendations'>('portfolio');

  // Selected Product State for Deep-Dive Blueprint
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Blueprint Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'review' | 'gtm' | 'dev' | 'finance' | 'steps' | 'pitch'>('review');
  const [activePitchType, setActivePitchType] = useState<'elevator' | 'normal' | 'layperson' | 'deck' | 'objections'>('elevator');
  
  // History viewer dialog state
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [historyActiveTab, setHistoryActiveTab] = useState<'review' | 'gtm' | 'dev' | 'finance' | 'steps' | 'pitch'>('review');
  const [historyActivePitchType, setHistoryActivePitchType] = useState<'elevator' | 'normal' | 'layperson' | 'deck' | 'objections'>('elevator');
  const [isHistoryListModalOpen, setIsHistoryListModalOpen] = useState(false);

  // Add / Edit Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<TrackedProduct | null>(null);

  // Loading state for single product generation
  const [loading, setLoading] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  const firestore = useFirestore();
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef);

  // Derive products list with backwards compatibility
  const products: TrackedProduct[] = useMemo(() => {
    if (profile?.products && Array.isArray(profile.products) && profile.products.length > 0) {
      return profile.products;
    }
    // Backward compatibility: If no products array exists, but old single-product fields exist
    if (profile?.prodName || profile?.prodDesc) {
      return [{
        id: 'prod_default',
        name: profile.prodName || 'Core Product',
        description: profile.prodDesc || '',
        targetAudience: profile.prodTarget || '',
        pricingModel: profile.prodPricing || 'saas_subscription',
        stage: 'mvp',
        status: 'on_track',
        priority: 'high',
        mrr: Number(profile.mRevenue) || 0,
        usersCount: 0,
        techStack: '',
        launchDate: '',
        customQuestion: profile.prodQuestion || '',
        aiPlan: profile.prodAIPlan || null,
        aiPlanHistory: profile.prodAIPlanHistory || [],
        createdAt: new Date().toISOString()
      }];
    }
    return [];
  }, [profile]);

  // Set default selected product once loaded
  useEffect(() => {
    if (products.length > 0) {
      if (!selectedProductId || !products.find(p => p.id === selectedProductId)) {
        setSelectedProductId(products[0].id);
      }
    } else {
      setSelectedProductId('');
    }
  }, [products, selectedProductId]);

  // Currently selected product
  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Loading animation messages
  const loadingMessages = [
    "Analyzing your product specifications and competitive value-prop...",
    "Assessing market placement, positioning vectors, and GTM routes...",
    "Reviewing tech stack scalability, architecture patterns, and MVP scoping...",
    "Evaluating cash balances, operational burn rate, and financial runway bounds...",
    "Formulating action targets, engineering priorities, and client validation experiments...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIdx(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Helper to persist updated products list to Firestore and keep profile in sync
  const saveProductsList = async (updatedProducts: TrackedProduct[], activeProd?: TrackedProduct) => {
    if (!profileRef || readOnly) return;

    const primary = activeProd || updatedProducts.find(p => p.id === selectedProductId) || updatedProducts[0];

    const updatePayload: any = {
      products: updatedProducts,
    };

    // Keep top-level legacy fields in sync for other components (Sales, Digital Marketing, CentralDashboard)
    if (primary) {
      updatePayload.prodName = primary.name;
      updatePayload.prodDesc = primary.description;
      updatePayload.prodTarget = primary.targetAudience;
      updatePayload.prodPricing = primary.pricingModel;
      updatePayload.prodQuestion = primary.customQuestion || '';
      if (primary.aiPlan) {
        updatePayload.prodAIPlan = primary.aiPlan;
      }
      if (primary.aiPlanHistory) {
        updatePayload.prodAIPlanHistory = primary.aiPlanHistory;
      }
    }

    await setDocumentNonBlocking(profileRef, updatePayload, { merge: true });
  };

  // Save new or edited product
  const handleSaveProductModal = async (productData: Partial<TrackedProduct>) => {
    if (readOnly) return;

    let updatedProducts: TrackedProduct[];

    if (productData.id) {
      // Editing existing
      updatedProducts = products.map(p => {
        if (p.id === productData.id) {
          return {
            ...p,
            ...productData,
            updatedAt: new Date().toISOString()
          } as TrackedProduct;
        }
        return p;
      });
    } else {
      // Creating new product
      const newId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newProduct: TrackedProduct = {
        id: newId,
        name: productData.name || 'Untitled Product',
        description: productData.description || '',
        targetAudience: productData.targetAudience || '',
        pricingModel: productData.pricingModel || 'saas_subscription',
        stage: productData.stage || 'mvp',
        status: productData.status || 'on_track',
        priority: productData.priority || 'medium',
        mrr: productData.mrr || 0,
        usersCount: productData.usersCount || 0,
        techStack: productData.techStack || '',
        launchDate: productData.launchDate || '',
        customQuestion: productData.customQuestion || '',
        createdAt: new Date().toISOString()
      };
      updatedProducts = [...products, newProduct];
      setSelectedProductId(newId);
    }

    await saveProductsList(updatedProducts);
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (readOnly || products.length <= 1) return;
    const confirmDelete = window.confirm("Are you sure you want to remove this product from your tracked suite?");
    if (!confirmDelete) return;

    const updated = products.filter(p => p.id !== productId);
    if (selectedProductId === productId && updated.length > 0) {
      setSelectedProductId(updated[0].id);
    }
    await saveProductsList(updated);
  };

  // Quick status update from card
  const handleUpdateProductStatus = async (productId: string, newStatus: ProductStatus) => {
    if (readOnly) return;
    const updated = products.map(p => {
      if (p.id === productId) {
        return { ...p, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    await saveProductsList(updated);
  };

  // Generate Strategic Blueprint for the active product
  const handleGenerateBlueprint = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profileRef || !activeProduct || loading || readOnly) return;

    setLoading(true);

    try {
      // Calculate financial context from company profile data
      const mrr = profile?.mRevenue || activeProduct.mrr || 0;
      const cash = profile?.cashBank || 0;
      
      // Calculate burn rate
      let monthlySaaS = 0;
      (profile?.saasSubscriptions || []).forEach((sub: any) => {
        const cost = Number(sub.cost) || 0;
        monthlySaaS += sub.billing === 'yearly' ? cost / 12 : cost;
      });
      let monthlySalaries = 0;
      (profile?.teamMembers || []).forEach((m: any) => {
        monthlySalaries += Number(m.salary) || 0;
      });
      const burnRate = profile?.burnRate || (monthlySaaS + monthlySalaries + (profile?.otherBurn || 0));
      const runway = burnRate > 0 ? cash / burnRate : 99;
      const teamSize = (profile?.teamMembers || []).filter((m: any) => m.status === 'active').length || 1;

      const input = {
        productName: activeProduct.name,
        productDescription: activeProduct.description,
        targetAudience: activeProduct.targetAudience || 'Target customers',
        pricingModel: activeProduct.pricingModel || 'saas_subscription',
        customQuestion: activeProduct.customQuestion || undefined,
        companyContext: {
          companyName: profile?.companyName || 'Your Startup',
          stage: profile?.companyStage || activeProduct.stage || 'mvp',
          yearlyGoal: profile?.yearlyGoal || 'Scale operations and increase revenue.',
          mrr,
          runway: runway === 999 ? 99 : Math.round(runway),
          cash,
          burnRate,
          teamSize,
        }
      };

      const result = await productAdvisorAssistant(input);

      // Save plan to this product and archive previous version to history
      const historyEntry = activeProduct.aiPlan ? {
        timestamp: new Date().toISOString(),
        prodName: activeProduct.name,
        prodDesc: activeProduct.description,
        prodTarget: activeProduct.targetAudience,
        prodPricing: activeProduct.pricingModel,
        prodQuestion: activeProduct.customQuestion || '',
        prodAIPlan: activeProduct.aiPlan
      } : null;

      const updatedHistory = historyEntry 
        ? [historyEntry, ...(activeProduct.aiPlanHistory || [])]
        : (activeProduct.aiPlanHistory || []);

      const updatedActiveProd: TrackedProduct = {
        ...activeProduct,
        aiPlan: result,
        aiPlanHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      };

      const updatedProducts = products.map(p => 
        p.id === activeProduct.id ? updatedActiveProd : p
      );

      await saveProductsList(updatedProducts, updatedActiveProd);

    } catch (err) {
      console.error('Error generating product plan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Restore history item for the active product
  const handleRestoreHistoryItem = async (item: any) => {
    if (!profileRef || !activeProduct || readOnly) return;
    
    const currentPlan = activeProduct.aiPlan;
    let updatedHistory = [...(activeProduct.aiPlanHistory || [])];
    
    const restoredIndex = updatedHistory.findIndex((h: any) => h.timestamp === item.timestamp);
    if (restoredIndex > -1) {
      updatedHistory.splice(restoredIndex, 1);
    }
    
    if (currentPlan) {
      updatedHistory = [{
        timestamp: new Date().toISOString(),
        prodName: activeProduct.name,
        prodDesc: activeProduct.description,
        prodTarget: activeProduct.targetAudience,
        prodPricing: activeProduct.pricingModel,
        prodQuestion: activeProduct.customQuestion || '',
        prodAIPlan: currentPlan
      }, ...updatedHistory];
    }

    const updatedActiveProd: TrackedProduct = {
      ...activeProduct,
      name: item.prodName || activeProduct.name,
      description: item.prodDesc || activeProduct.description,
      targetAudience: item.prodTarget || activeProduct.targetAudience,
      pricingModel: item.prodPricing || activeProduct.pricingModel,
      customQuestion: item.prodQuestion || activeProduct.customQuestion,
      aiPlan: item.prodAIPlan,
      aiPlanHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    const updatedProducts = products.map(p => 
      p.id === activeProduct.id ? updatedActiveProd : p
    );

    await saveProductsList(updatedProducts, updatedActiveProd);
  };

  // Delete history item
  const handleDeleteHistoryItem = async (indexToDelete: number) => {
    if (!profileRef || !activeProduct || readOnly) return;
    
    const currentHistory = activeProduct.aiPlanHistory || [];
    const updatedHistory = currentHistory.filter((_, idx) => idx !== indexToDelete);
    
    const updatedActiveProd: TrackedProduct = {
      ...activeProduct,
      aiPlanHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    const updatedProducts = products.map(p => 
      p.id === activeProduct.id ? updatedActiveProd : p
    );

    await saveProductsList(updatedProducts, updatedActiveProd);
  };

  // Save suite recommendations
  const handleSaveRecommendations = async (recData: ProductSuiteRecommendationData) => {
    if (!profileRef || readOnly) return;
    await setDocumentNonBlocking(profileRef, {
      productSuiteRecommendations: recData
    }, { merge: true });
  };

  const aiPlan = activeProduct?.aiPlan;
  const hasPlan = aiPlan && !loading;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-2 mt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Product Suite & Portfolio Studio
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] flex items-center gap-3">
            <Box className="w-10 h-10 text-indigo-600" />
            Product Suite
          </h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base mt-1">
            Track multiple products in your portfolio, formulate execution blueprints, and receive AI-driven portfolio recommendations tied to your cash runway.
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2 gap-2">
        <button
          type="button"
          onClick={() => setMainTab('portfolio')}
          className={`py-3 px-4 text-xs font-black tracking-wide transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            mainTab === 'portfolio'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Product Portfolio & Tracker
          <span className="bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 text-[10px] font-black">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('blueprint')}
          className={`py-3 px-4 text-xs font-black tracking-wide transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            mainTab === 'blueprint'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Product Deep-Dive & Blueprint
          {activeProduct && (
            <span className="bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5 text-[10px] font-bold max-w-[120px] truncate">
              {activeProduct.name}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab('recommendations')}
          className={`py-3 px-4 text-xs font-black tracking-wide transition-all border-b-2 flex items-center gap-2 shrink-0 ${
            mainTab === 'recommendations'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Compass className="w-4 h-4 text-indigo-600" />
          Suite Recommendations
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-2 py-0.5 text-[10px] font-black uppercase">
            AI Advisor
          </span>
        </button>
      </div>

      {/* TAB 1: PRODUCT PORTFOLIO & TRACKER */}
      {mainTab === 'portfolio' && (
        <ProductPortfolioTracker
          products={products}
          selectedProductId={selectedProductId}
          onSelectProduct={setSelectedProductId}
          onOpenAddModal={() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }}
          onEditProduct={(p) => {
            setEditingProduct(p);
            setIsProductModalOpen(true);
          }}
          onDeleteProduct={handleDeleteProduct}
          onUpdateProductStatus={handleUpdateProductStatus}
          onGoToBlueprint={(pId) => {
            setSelectedProductId(pId);
            setMainTab('blueprint');
          }}
          onGoToRecommendations={() => setMainTab('recommendations')}
          readOnly={readOnly}
        />
      )}

      {/* TAB 2: PRODUCT DEEP-DIVE & AI BLUEPRINT */}
      {mainTab === 'blueprint' && (
        <div className="space-y-6">
          {/* Product Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs font-black uppercase text-slate-400 shrink-0">Active Product:</span>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-full sm:w-[260px] h-9 bg-slate-50 border-slate-200 font-bold text-xs text-slate-800">
                  <SelectValue placeholder="Choose product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.mrr ? `(₹${p.mrr.toLocaleString('en-IN')}/mo)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeProduct && (
                <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
                  <span className="truncate max-w-sm">{activeProduct.description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeProduct?.aiPlanHistory && activeProduct.aiPlanHistory.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHistoryListModalOpen(true)}
                  className="border-slate-200 hover:bg-indigo-50 font-bold h-9 px-3 gap-1.5 text-slate-700 text-xs shadow-sm"
                  title="Saved Strategy History"
                >
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>History</span>
                  <span className="bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.2 text-[10px] font-black">
                    {activeProduct.aiPlanHistory.length}
                  </span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingProduct(activeProduct);
                  setIsProductModalOpen(true);
                }}
                disabled={readOnly || !activeProduct}
                className="border-slate-200 font-bold h-9 px-3 gap-1.5 text-slate-700 text-xs shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                Edit Specs
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleGenerateBlueprint()}
                disabled={readOnly || !activeProduct || loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-3.5 gap-1.5 text-xs shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                {hasPlan ? 'Re-generate Blueprint' : 'Generate Blueprint'}
              </Button>
            </div>
          </div>

          {/* Loading Animation */}
          {loading && (
            <Card className="border-2 border-indigo-100 bg-indigo-50/5 shadow-md py-16 text-center animate-pulse">
              <CardContent className="flex flex-col items-center justify-center space-y-5">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-800">FounderOS Product AI is Processing</h3>
                  <p className="text-sm text-indigo-700 font-semibold max-w-md transition-all duration-300">
                    {loadingMessages[loadingMessageIdx]}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blueprint Card */}
          {!loading && (
            <div className="w-full space-y-6">
              {hasPlan ? (
                <Card className="border border-slate-200 shadow-md flex flex-col min-h-[600px] bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="border-b bg-slate-50/50 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        AI Strategic Blueprint for <span className="text-indigo-700 font-extrabold">{activeProduct?.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs font-medium">
                        Synchronized recommendations mapping features to runway constraints.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                        Pricing: <strong className="text-slate-800 capitalize">{activeProduct?.pricingModel}</strong>
                      </span>
                      {activeProduct?.targetAudience && (
                        <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                          ICP: <strong className="text-slate-800">{activeProduct.targetAudience}</strong>
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  {/* Sub Tab selection */}
                  <div className="flex border-b divide-x overflow-x-auto bg-slate-50/40">
                    <button
                      onClick={() => setActiveSubTab('review')}
                      className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                        activeSubTab === 'review' 
                          ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      Evaluation
                    </button>
                    <button
                      onClick={() => setActiveSubTab('gtm')}
                      className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                        activeSubTab === 'gtm' 
                          ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      How to Sell
                    </button>
                    <button
                      onClick={() => setActiveSubTab('dev')}
                      className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                        activeSubTab === 'dev' 
                          ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Code className="w-4 h-4" />
                      What to Develop
                    </button>
                    <button
                      onClick={() => setActiveSubTab('finance')}
                      className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                        activeSubTab === 'finance' 
                          ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      Runway Impact
                    </button>
                    <button
                      onClick={() => setActiveSubTab('steps')}
                      className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                        activeSubTab === 'steps' 
                          ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <ListTodo className="w-4 h-4" />
                      Action Items
                    </button>
                    <button
                      onClick={() => setActiveSubTab('pitch')}
                      className={`flex-1 py-3 px-4 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                        activeSubTab === 'pitch' 
                          ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      Pitching Scripts
                    </button>
                  </div>

                  <CardContent className="p-6 flex-1 max-h-[650px] overflow-y-auto">
                    {activeSubTab === 'review' && (
                      <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                        <ReactMarkdown>{aiPlan.review}</ReactMarkdown>
                      </div>
                    )}

                    {activeSubTab === 'gtm' && (
                      <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                        <ReactMarkdown>{aiPlan.howToSell}</ReactMarkdown>
                      </div>
                    )}

                    {activeSubTab === 'dev' && (
                      <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                        <ReactMarkdown>{aiPlan.whatToDevelop}</ReactMarkdown>
                      </div>
                    )}

                    {activeSubTab === 'finance' && (
                      <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                        <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          Runway Cross-Check: {profile?.cashBank ? `₹${(profile.cashBank).toLocaleString('en-IN')}` : '₹0'} cash left.
                        </div>
                        <ReactMarkdown>{aiPlan.financialImpact}</ReactMarkdown>
                      </div>
                    )}

                    {activeSubTab === 'steps' && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Immediate Roadmap Actions</h4>
                        <div className="space-y-3">
                          {aiPlan.immediateSteps?.map((step: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50">
                              <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <span className="text-xs font-semibold text-slate-700 leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSubTab === 'pitch' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        {aiPlan?.pitchGuidance ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b pb-4">
                              {[
                                { id: 'elevator', label: 'Elevator (30s)', icon: Mic },
                                { id: 'normal', label: 'Standard (2m)', icon: FileText },
                                { id: 'layperson', label: 'Layperson (ELI5)', icon: HelpCircle },
                                { id: 'deck', label: 'Pitch Deck', icon: Presentation },
                                { id: 'objections', label: 'Objections', icon: AlertTriangle }
                              ].map((t) => {
                                const Icon = t.icon;
                                const active = activePitchType === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setActivePitchType(t.id as any)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                      active
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                        : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    <Icon className="w-5 h-5 mb-1.5 text-indigo-500" />
                                    <span className="text-[11px] font-bold">{t.label}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <Card className="border border-slate-200 bg-slate-50/30">
                              <CardContent className="pt-6">
                                {activePitchType === 'elevator' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-3 mb-2">
                                      <h4 className="text-sm font-black text-slate-800">30-Second Elevator Pitch Script</h4>
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">For Quick Intro</span>
                                    </div>
                                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                      <ReactMarkdown>{aiPlan.pitchGuidance.elevatorPitch || 'No elevator pitch generated yet.'}</ReactMarkdown>
                                    </div>
                                  </div>
                                )}

                                {activePitchType === 'normal' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-3 mb-2">
                                      <h4 className="text-sm font-black text-slate-800">Standard 2-Minute Pitch Script</h4>
                                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">For Meetings/Demo Days</span>
                                    </div>
                                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                      <ReactMarkdown>{aiPlan.pitchGuidance.normalPitch || 'No standard pitch generated yet.'}</ReactMarkdown>
                                    </div>
                                  </div>
                                )}

                                {activePitchType === 'layperson' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-3 mb-2">
                                      <h4 className="text-sm font-black text-slate-800">Layperson / ELI5 (Explain Like I'm 5) Script</h4>
                                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase">For Non-Domain Audience</span>
                                    </div>
                                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                      <ReactMarkdown>{aiPlan.pitchGuidance.laypersonPitch || 'No layperson pitch generated yet.'}</ReactMarkdown>
                                    </div>
                                  </div>
                                )}

                                {activePitchType === 'deck' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-3 mb-2">
                                      <h4 className="text-sm font-black text-slate-800">Recommended 10-Slide Pitch Deck Structure</h4>
                                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full uppercase">Investor Outline</span>
                                    </div>
                                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                      <ReactMarkdown>{aiPlan.pitchGuidance.pitchDeckStructure || 'No deck structure generated yet.'}</ReactMarkdown>
                                    </div>
                                  </div>
                                )}

                                {activePitchType === 'objections' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-3 mb-2">
                                      <h4 className="text-sm font-black text-slate-800">Investor & Customer Objection Handling</h4>
                                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">Q&A Preparation</span>
                                    </div>
                                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                      <ReactMarkdown>{aiPlan.pitchGuidance.objectionHandling || 'No objection handling generated yet.'}</ReactMarkdown>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </>
                        ) : (
                          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                            <h4 className="text-sm font-black text-slate-800 mb-1">Pitch Scripts Not Available</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              Please click <strong>Re-generate Blueprint</strong> above to formulate fresh pitching scripts and investor decks.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center shadow-sm rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                    <div className="p-4 bg-indigo-50 rounded-full border border-indigo-100">
                      <Sparkles className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900">
                        No Strategic Blueprint Generated for {activeProduct?.name || 'this product'}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Generate an AI-powered strategic roadmap detailing MVP scoping, how to acquire the first 100 users, runway impact, and full pitching scripts.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleGenerateBlueprint()}
                      disabled={readOnly || !activeProduct}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 gap-2 mt-2 shadow-sm text-xs"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      Generate Strategic Blueprint
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCT SUITE RECOMMENDATIONS */}
      {mainTab === 'recommendations' && (
        <ProductSuiteRecommendations
          products={products}
          companyProfile={profile}
          recommendations={profile?.productSuiteRecommendations || null}
          onSaveRecommendations={handleSaveRecommendations}
          onGoToProduct={(productId) => {
            setSelectedProductId(productId);
            setMainTab('blueprint');
          }}
          readOnly={readOnly}
        />
      )}

      {/* Add / Edit Product Modal */}
      <ProductModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        product={editingProduct}
        onSave={handleSaveProductModal}
        readOnly={readOnly}
      />

      {/* History Details Dialog for Active Product */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => { if (!open) setSelectedHistoryItem(null); }}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 border border-slate-200 shadow-2xl rounded-xl">
          <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50 flex flex-row items-center justify-between pr-12">
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Archived Strategy Blueprint
              </DialogTitle>
              <DialogDescription className="text-xs mt-1 font-semibold text-slate-500">
                Generated for <span className="text-indigo-700 font-bold">{selectedHistoryItem?.prodName}</span> on {selectedHistoryItem && new Date(selectedHistoryItem.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Dialog Body - scrollable with sub tabs */}
          {selectedHistoryItem && (
            <>
              {/* Mini spec review section */}
              <div className="bg-slate-50/50 p-4 border-b grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-black">Audience</span>
                  <span className="text-slate-800 line-clamp-1">{selectedHistoryItem.prodTarget || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-black">Pricing Model</span>
                  <span className="text-slate-800 capitalize">{selectedHistoryItem.prodPricing || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] uppercase text-slate-400 font-black">Description</span>
                  <span className="text-slate-800 line-clamp-1">{selectedHistoryItem.prodDesc || 'N/A'}</span>
                </div>
              </div>

              {/* Sub Tabs */}
              <div className="flex border-b divide-x overflow-x-auto bg-slate-50/30">
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('review')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'review' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  Evaluation
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('gtm')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'gtm' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  How to Sell
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('dev')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'dev' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  What to Develop
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('finance')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'finance' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Runway Impact
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('steps')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'steps' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  Action Items
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('pitch')}
                  className={`flex-1 py-3 px-3 text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shrink-0 ${
                    historyActiveTab === 'pitch' 
                      ? 'bg-white text-indigo-700 border-b-2 border-b-indigo-700' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Pitching
                </button>
              </div>

              {/* Tab Content Area */}
              <div className="p-6 flex-1 overflow-y-auto max-h-[50vh]">
                {historyActiveTab === 'review' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.review}</ReactMarkdown>
                  </div>
                )}
                {historyActiveTab === 'gtm' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.howToSell}</ReactMarkdown>
                  </div>
                )}
                {historyActiveTab === 'dev' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.whatToDevelop}</ReactMarkdown>
                  </div>
                )}
                {historyActiveTab === 'finance' && (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{selectedHistoryItem.prodAIPlan.financialImpact}</ReactMarkdown>
                  </div>
                )}
                {historyActiveTab === 'steps' && (
                  <div className="space-y-3">
                    {selectedHistoryItem.prodAIPlan.immediateSteps?.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                )}
                {historyActiveTab === 'pitch' && (
                  <div className="space-y-4">
                    {selectedHistoryItem.prodAIPlan.pitchGuidance ? (
                      <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                        <ReactMarkdown>
                          {selectedHistoryItem.prodAIPlan.pitchGuidance.elevatorPitch || 'No script available.'}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">This archived version did not have pitch scripts.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedHistoryItem(null)}
                  className="font-bold text-xs"
                >
                  Close
                </Button>
                {!readOnly && (
                  <Button
                    type="button"
                    onClick={() => {
                      handleRestoreHistoryItem(selectedHistoryItem);
                      setSelectedHistoryItem(null);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore This Version
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Saved Strategy History List Popup Modal */}
      <Dialog open={isHistoryListModalOpen} onOpenChange={setIsHistoryListModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto p-6 border border-slate-200 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-600" />
              Saved Strategy Versions for {activeProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              Browse and restore previously generated AI strategy blueprints for this product.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4">
            {activeProduct?.aiPlanHistory && activeProduct.aiPlanHistory.length > 0 ? (
              <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                {activeProduct.aiPlanHistory.map((item: any, idx: number) => {
                  const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  });
                  return (
                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">{formattedDate}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {item.prodName || activeProduct?.name}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {item.prodPricing ? `Pricing: ${item.prodPricing}` : ''}
                          {item.prodTarget ? ` • Audience: ${item.prodTarget}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedHistoryItem(item);
                            setHistoryActiveTab('review');
                            setHistoryActivePitchType('elevator');
                            setIsHistoryListModalOpen(false);
                          }}
                          className="h-8 font-bold text-xs border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                        >
                          View Version
                        </Button>
                        {!readOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHistoryItem(idx)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No strategy history saved for this product yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
