export type ProductStage = 'concept' | 'mvp' | 'beta' | 'launched' | 'scaling' | 'sunset';
export type ProductStatus = 'on_track' | 'needs_attention' | 'blocked' | 'thriving';
export type ProductPriority = 'high' | 'medium' | 'low';
export type PricingModel = 'freemium' | 'saas_subscription' | 'one_time' | 'usage_based' | 'enterprise';

export interface TrackedProduct {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  pricingModel: string;
  stage: ProductStage;
  status: ProductStatus;
  priority: ProductPriority;
  mrr: number; // Monthly recurring revenue in INR
  usersCount: number;
  techStack?: string;
  launchDate?: string;
  customQuestion?: string;
  aiPlan?: any;
  aiPlanHistory?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSuiteRecommendationData {
  timestamp: string;
  executiveSummary: string;
  resourceAllocation: string;
  productPrioritizations: Array<{
    productName: string;
    strategicRole: string;
    priorityRank: number;
    keyRecommendation: string;
    suggestedNextMilestone: string;
  }>;
  synergiesAndBundling: string;
  executionRisks: string[];
  immediateSuiteActions: string[];
}
