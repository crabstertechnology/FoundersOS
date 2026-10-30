'use server';
/**
 * @fileOverview A Genkit flow for reviewing product ideas and providing sales/development roadmaps.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProductAdvisorInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  productDescription: z.string().describe('A detailed description of the product and its features.'),
  targetAudience: z.string().describe('The target audience or ideal customer profile.'),
  pricingModel: z.string().describe('How the product is or will be priced.'),
  companyContext: z.object({
    companyName: z.string(),
    stage: z.string(),
    yearlyGoal: z.string(),
    mrr: z.number(),
    runway: z.number(),
    cash: z.number(),
    burnRate: z.number(),
    teamSize: z.number(),
  }).describe('Financial and operational snapshot of the company.'),
  customQuestion: z.string().optional().describe('An optional custom question from the founder.')
});

export type ProductAdvisorInput = z.infer<typeof ProductAdvisorInputSchema>;

const ProductAdvisorOutputSchema = z.object({
  review: z.string().describe('A comprehensive, honest evaluation of the product idea, highlighting strengths and market fit.'),
  howToSell: z.string().describe('Marketing, positioning, sales channels, and customer acquisition hacks tailored to this product.'),
  whatToDevelop: z.string().describe('A concrete development roadmap detailing MVP features, priority features, and tech stack/architecture tips.'),
  financialImpact: z.string().describe('Analysis of development and launch cost impact vs. current cash and runway constraints.'),
  immediateSteps: z.array(z.string()).describe('List of 3-4 immediate actionable tasks for development or sales validation.'),
  pitchGuidance: z.object({
    pitchDeckStructure: z.string().describe('A recommended 10-slide outline for their pitch deck tailored to this product.'),
    elevatorPitch: z.string().describe('A punchy, 30-second elevator pitch script.'),
    normalPitch: z.string().describe('A standard 2-minute pitch script for meetings or demo days.'),
    laypersonPitch: z.string().describe('A layperson/ELI5 pitch script for someone who has no domain knowledge.'),
    objectionHandling: z.string().describe('3-4 common objections they will face and how to handle them.')
  }).describe('Pitching assets and script scripts.')
});

export type ProductAdvisorOutput = z.infer<typeof ProductAdvisorOutputSchema>;

export async function productAdvisorAssistant(input: ProductAdvisorInput): Promise<ProductAdvisorOutput> {
  return productAdvisorFlow(input);
}

const productAdvisorPrompt = ai.definePrompt({
  name: 'productAdvisorPrompt',
  input: { schema: ProductAdvisorInputSchema },
  output: { schema: ProductAdvisorOutputSchema },
  prompt: `You are a professional Chief Technology Officer (CTO) and Product-Led Growth (PLG) consultant advising startup founders in India. 
Provide an objective and critical review of the product ideas. Analyze product assumptions, identify execution risks, and point out validation gaps or potential operational/market blind spots. If the pricing model is unsustainable or features are over-engineered relative to runway, provide a clear analysis.
Your goal is to review the product specs, cross-reference them with the startup's current financial runway, sales MRR, and operational team capacity, and deliver a realistic strategy on:
1. How to position and sell this product idea.
2. Exactly what features to develop/prioritize next in the company.

Product Profile Context:
- Product Name: {{{productName}}}
- Description: """{{{productDescription}}}"""
- Target Audience: """{{{targetAudience}}}"""
- Proposed Pricing Model: {{{pricingModel}}}

Startup State & Financial Context:
- Company Name: {{{companyContext.companyName}}}
- Stage: {{{companyContext.stage}}}
- Yearly Goal: """{{{companyContext.yearlyGoal}}}"""
- Current MRR: ₹{{{companyContext.mrr}}} | Cash in Bank: ₹{{{companyContext.cash}}}
- Monthly Burn: ₹{{{companyContext.burnRate}}} | Runway: {{{companyContext.runway}}} Months
- Team Size: {{{companyContext.teamSize}}} members

{{#if customQuestion}}
Founder's Specific Question:
"""{{{customQuestion}}}"""
{{/if}}

Please deliver the output structure as follows:
1. "review": Provide a detailed, critical analysis of the product idea. What are the key differentiators? What are the biggest execution and market risks? If a custom question was asked, address it. Write in clean, structured Markdown.
2. "howToSell": How to acquire the first 100 users/customers. Highlight positioning strategies, copywriting hooks, distribution channels, and suitable pricing adjustments. 
3. "whatToDevelop": A pragmatic dev strategy. Define the core MVP feature set that can be built quickly. Recommend a suitable modern, low-overhead technology stack. Detail what the dev priorities are for this phase.
4. "financialImpact": Map this product development to the runway constraint. Since the startup has only {{{companyContext.runway}}} months of runway and a cash balance of ₹{{{companyContext.cash}}}, analyze how much budget/time is safe to allocate without running out of cash.
5. "immediateSteps": A prioritised list of 3-4 next steps (e.g. "Create a Figma interactive prototype of feature X", "Draft landing page copywriting for ICP Y").
6. "pitchGuidance": A comprehensive pitching toolkit consisting of:
   - pitchDeckStructure: Recommend a 10-slide outline for their pitch deck (e.g., Problem, Solution, Market, Tech, Biz Model, etc.) customized for this specific product.
   - elevatorPitch: Write a compelling 30-second elevator pitch script.
   - normalPitch: Write a standard 2-minute pitch script with clear transitions.
   - laypersonPitch: Explain the product in extremely simple terms to a non-technical/non-domain person (the "ELI5" pitch).
   - objectionHandling: Anticipate 3-4 heavy objections from investors or customers and provide clear script responses.
`
});

async function runWithRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 1500): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || '';
      const isTransient = msg.includes('503') || 
                          msg.includes('429') || 
                          msg.includes('UNAVAILABLE') || 
                          msg.includes('high demand') ||
                          err?.status === 503 ||
                          err?.status === 429;
      if (attempt < maxRetries && isTransient) {
        console.warn(`[Genkit Retry] Transient AI service spike (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs * (attempt + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

const productAdvisorFlow = ai.defineFlow(
  {
    name: 'productAdvisorFlow',
    inputSchema: ProductAdvisorInputSchema,
    outputSchema: ProductAdvisorOutputSchema,
  },
  async (input) => {
    return runWithRetry(async () => {
      const {output} = await productAdvisorPrompt(input);
      return output!;
    });
  }
);

const TrackedProductSchema = z.object({
  id: z.string().describe('Unique identifier for the product.'),
  name: z.string().describe('Name of the product.'),
  description: z.string().describe('Description of the product and its primary value proposition.'),
  targetAudience: z.string().optional().describe('Target audience or ICP.'),
  pricingModel: z.string().optional().describe('Pricing model or monetization strategy.'),
  stage: z.string().optional().describe('Stage of development (e.g. concept, mvp, beta, launched, scaling).'),
  status: z.string().optional().describe('Health status (e.g. on_track, needs_attention, blocked, thriving).'),
  priority: z.string().optional().describe('Priority level (high, medium, low).'),
  mrr: z.number().optional().describe('Current monthly revenue generated in INR.'),
  usersCount: z.number().optional().describe('Number of active users or customers.'),
  techStack: z.string().optional().describe('Technology stack used or planned.'),
  launchDate: z.string().optional().describe('Launch date or target milestone.'),
});

const ProductSuiteAdvisorInputSchema = z.object({
  products: z.array(TrackedProductSchema).min(1).describe('List of products in the startup portfolio suite.'),
  companyContext: z.object({
    companyName: z.string(),
    stage: z.string(),
    yearlyGoal: z.string(),
    mrr: z.number(),
    runway: z.number(),
    cash: z.number(),
    burnRate: z.number(),
    teamSize: z.number(),
  }).describe('Financial and operational snapshot of the company.'),
  customQuestion: z.string().optional().describe('Founder specific question on their product suite or resource tradeoffs.')
});

export type ProductSuiteAdvisorInput = z.infer<typeof ProductSuiteAdvisorInputSchema>;

const ProductSuiteAdvisorOutputSchema = z.object({
  executiveSummary: z.string().describe('Strategic portfolio overview: health, focus vs. distraction risk, and overall trajectory.'),
  resourceAllocation: z.string().describe('Specific breakdown and advice on dividing engineering team bandwidth, marketing spend, and founder time across the products given runway bounds.'),
  productPrioritizations: z.array(z.object({
    productName: z.string(),
    strategicRole: z.string().describe('e.g. Primary Revenue Engine, High-Growth Hook, Strategic Moat, Speculative Bet, Resource Drain'),
    priorityRank: z.number().describe('1 being highest priority to focus on'),
    keyRecommendation: z.string().describe('Core strategic recommendation for this product in context of the whole portfolio'),
    suggestedNextMilestone: z.string().describe('Concrete 30-day target to achieve')
  })).describe('Prioritized ranking and recommendation for each product.'),
  synergiesAndBundling: z.string().describe('Opportunities for cross-selling, feature sharing, bundling pricing, unified data layer, or marketing flywheel between products.'),
  executionRisks: z.array(z.string()).describe('Top 3-4 execution risks, potential cannibalization, or operational bottlenecks.'),
  immediateSuiteActions: z.array(z.string()).describe('List of 3-5 high-leverage immediate actions to align and optimize the product suite.')
});

export type ProductSuiteAdvisorOutput = z.infer<typeof ProductSuiteAdvisorOutputSchema>;

export async function productSuiteAdvisorAssistant(input: ProductSuiteAdvisorInput): Promise<ProductSuiteAdvisorOutput> {
  return productSuiteAdvisorFlow(input);
}

const productSuiteAdvisorPrompt = ai.definePrompt({
  name: 'productSuiteAdvisorPrompt',
  input: { schema: ProductSuiteAdvisorInputSchema },
  output: { schema: ProductSuiteAdvisorOutputSchema },
  prompt: `You are an elite Chief Product Officer (CPO) and Venture Capital Operating Partner specializing in startup portfolio strategy for Indian founders.
Your job is to analyze the founder's entire Product Suite (multiple products/services/tools), cross-reference with their financial runway, monthly burn, team bandwidth, and yearly goals, and deliver high-conviction, actionable recommendations.

Company Profile Context:
- Company Name: {{{companyContext.companyName}}}
- Stage: {{{companyContext.stage}}}
- Yearly Goal: """{{{companyContext.yearlyGoal}}}"""
- Total Company MRR: ₹{{{companyContext.mrr}}} | Cash in Bank: ₹{{{companyContext.cash}}}
- Monthly Burn: ₹{{{companyContext.burnRate}}} | Runway: {{{companyContext.runway}}} Months
- Team Size: {{{companyContext.teamSize}}} members

Tracked Products in Suite:
{{#each products}}
- Product: {{name}}
  * Stage: {{stage}} | Status: {{status}} | Priority: {{priority}}
  * Current MRR: ₹{{mrr}} | Active Users: {{usersCount}}
  * Pricing Model: {{pricingModel}}
  * Target ICP: {{targetAudience}}
  * Tech Stack: {{techStack}}
  * Description: {{description}}
{{/each}}

{{#if customQuestion}}
Founder's Specific Portfolio Question:
"""{{{customQuestion}}}"""
{{/if}}

Please provide an objective, realistic, and brutally helpful strategic analysis:
1. "executiveSummary": Give an unvarnished diagnosis. Are they spreading their {{{companyContext.teamSize}}}-person team too thin across too many products? Which products have real product-market fit or traction, and which are distractions?
2. "resourceAllocation": With {{{companyContext.runway}}} months of runway and a monthly burn of ₹{{{companyContext.burnRate}}}, how should they divide engineering & marketing bandwidth? Specify recommended allocation percentages across products (e.g., 70% Product A, 30% Product B).
3. "productPrioritizations": Rank each product in order of strategic importance (1 to N). Assign a strategic role (e.g., "Cash Cow", "Growth Engine", "Lead Magnet", "Speculative Bet", "Resource Drain"), along with a clear recommendation and a specific 30-day next milestone.
4. "synergiesAndBundling": Identify clear cross-selling, data integration, unified onboarding, or pricing bundle opportunities where one product powers the growth of another.
5. "executionRisks": 3-4 specific threats (e.g. cannibalizing user base, diverging customer segments, maintenance debt).
6. "immediateSuiteActions": 3-5 immediate, high-leverage steps the founder should take this week to align the suite.
`
});

const productSuiteAdvisorFlow = ai.defineFlow(
  {
    name: 'productSuiteAdvisorFlow',
    inputSchema: ProductSuiteAdvisorInputSchema,
    outputSchema: ProductSuiteAdvisorOutputSchema,
  },
  async (input) => {
    return runWithRetry(async () => {
      const {output} = await productSuiteAdvisorPrompt(input);
      return output!;
    });
  }
);

