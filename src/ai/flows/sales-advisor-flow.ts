'use server';
/**
 * @fileOverview A Genkit flow for analyzing sales CRM pipelines and providing sales strategies.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalesAdvisorInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  stage: z.string().describe('The current funding stage of the company.'),
  industry: z.string().describe('The industry the company operates in.'),
  monthlyRevenue: z.number().min(0).describe('Current monthly recurring revenue (MRR) in INR.'),
  targetMRR: z.number().min(0).describe('Target MRR in INR.'),
  cac: z.number().min(0).describe('Customer Acquisition Cost (CAC) in INR.'),
  totalCustomers: z.number().min(0).describe('Total number of paying customers.'),
  deals: z.array(z.object({
    dealName: z.string(),
    company: z.string(),
    value: z.number(),
    stage: z.string(),
    probability: z.number(),
    closeDate: z.string()
  })).describe('Active deals in the CRM pipeline.'),
  question: z.string().optional().describe('An optional custom question from the founder.')
});

export type SalesAdvisorInput = z.infer<typeof SalesAdvisorInputSchema>;

const SalesAdvisorOutputSchema = z.object({
  summary: z.string().describe('An overall assessment of the sales pipeline and CRM health.'),
  funnelBottlenecks: z.array(z.string()).describe('Identified spots in the pipeline where deals are getting stuck or conversion is low.'),
  conversionRecommendations: z.array(z.string()).describe('Tactics to improve conversion rates at each pipeline stage.'),
  salesVelocityTips: z.array(z.string()).describe('Strategies to shorten the sales cycle and increase deal size (ACV).'),
  suggestedActions: z.array(z.string()).describe('List of 3-4 immediate next steps for the sales team.')
});

export type SalesAdvisorOutput = z.infer<typeof SalesAdvisorOutputSchema>;

export async function salesAdvisorAssistant(input: SalesAdvisorInput): Promise<SalesAdvisorOutput> {
  return salesAdvisorFlow(input);
}

const salesAdvisorPrompt = ai.definePrompt({
  name: 'salesAdvisorPrompt',
  input: { schema: SalesAdvisorInputSchema },
  output: { schema: SalesAdvisorOutputSchema },
  prompt: `You are an elite B2B and SaaS sales consultant advising startup founders in India. Your goal is to analyze the company's sales CRM pipeline and key sales metrics, identifying bottlenecks and proposing high-impact tactics to increase conversion and hit revenue targets.

Company Profile Context:
- Name: {{{companyName}}}
- Stage: {{{stage}}}
- Industry: {{{industry}}}

Sales Metrics Snapshot:
- Current MRR: ₹{{{monthlyRevenue}}}
- Target MRR: ₹{{{targetMRR}}}
- CAC: ₹{{{cac}}}
- Total Customers: {{{totalCustomers}}}

CRM Active Pipeline:
{{#each deals}}
- Deal: {{this.dealName}}, Company: {{this.company}}, Value: ₹{{this.value}}, Stage: {{this.stage}}, Probability: {{this.probability}}%, Close Date: {{this.closeDate}}
{{/each}}

{{#if question}}
Founder's Custom Inquiry:
"""{{{question}}}"""
{{/if}}

Provide:
1. "summary": A professional sales assessment highlighting pipeline status, health of the pipeline multiplier (total pipeline vs. target gap), and overall deal distribution. Address the custom question if provided. Keep it in clean Markdown.
2. "funnelBottlenecks": Identify specifically where deals might be stalling or where the conversion drops, referencing the stages of the deals.
3. "conversionRecommendations": Indian startup ecosystem tailored conversion hacks, such as running product-led demos, optimizing proposal templates, structuring pilots, or offering founder-led sales assistance.
4. "salesVelocityTips": Specific ideas to speed up deal closure (e.g., mutual action plans, urgency triggers, bundling) and increase average order value.
5. "suggestedActions": A checklist of 3-4 priority actions the founder should take this week.
`
});

const salesAdvisorFlow = ai.defineFlow(
  {
    name: 'salesAdvisorFlow',
    inputSchema: SalesAdvisorInputSchema,
    outputSchema: SalesAdvisorOutputSchema,
  },
  async (input) => {
    const {output} = await salesAdvisorPrompt(input);
    return output!;
  }
);
