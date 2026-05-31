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
  prompt: `You are a brutally honest, direct, rational, and unfiltered Chief Technology Officer (CTO) and Product-Led Growth (PLG) consultant advising startup founders in India. 
Do not validate the founder's ideas or be agreeable. Challenge their product assumptions, expose execution shortcuts, and explicitly point out validation gaps or blind spots they are avoiding. If their pricing model is unsustainable or they are over-engineering features relative to their runway, call it out directly. 
Your goal is to review the product specs, cross-reference them with the startup's current financial runway, sales MRR, and operational team capacity, and deliver a brutally realistic strategy on:
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

const productAdvisorFlow = ai.defineFlow(
  {
    name: 'productAdvisorFlow',
    inputSchema: ProductAdvisorInputSchema,
    outputSchema: ProductAdvisorOutputSchema,
  },
  async (input) => {
    const {output} = await productAdvisorPrompt(input);
    return output!;
  }
);
