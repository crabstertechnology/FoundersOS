'use server';
/**
 * @fileOverview A Genkit flow for analyzing operational efficiency, team expenses, subscriptions, and runway extension.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OperationsAdvisorInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  stage: z.string().describe('The current funding stage of the company.'),
  industry: z.string().describe('The industry the company operates in.'),
  cashInBank: z.number().min(0).describe('Current cash in bank in INR.'),
  monthlyBurnRate: z.number().min(0).describe('Current total monthly burn rate in INR.'),
  runwayMonths: z.number().min(0).describe('Current runway in months.'),
  saasSubscriptions: z.array(z.object({
    name: z.string(),
    cost: z.number(),
    billing: z.string(),
    category: z.string()
  })).describe('Active software and SaaS subscriptions.'),
  teamMembers: z.array(z.object({
    name: z.string(),
    role: z.string(),
    salary: z.number(),
    status: z.string()
  })).describe('Team members and salary details.'),
  otherBurn: z.number().min(0).describe('Other overhead expenses (rent, marketing, etc.) in INR.'),
  question: z.string().optional().describe('An optional custom question from the founder.')
});

export type OperationsAdvisorInput = z.infer<typeof OperationsAdvisorInputSchema>;

const OperationsAdvisorOutputSchema = z.object({
  summary: z.string().describe('An overall assessment of startup operations and spend profile.'),
  runwayAnalysis: z.string().describe('A detailed analysis of the startup\'s survival timeline and burn categories.'),
  costOptimizationOpportunities: z.array(z.string()).describe('Specific spots where SaaS, hosting, or other overhead costs can be reduced.'),
  teamPlanningRecommendations: z.array(z.string()).describe('Strategic advice on headcount planning, role prioritization, and compensation structures.'),
  runwayExtensionTactics: z.array(z.string()).describe('Practical ways to defer payments, renegotiate contracts, or boost operational efficiency.'),
  suggestedActions: z.array(z.string()).describe('List of 3-4 immediate operational actions.')
});

export type OperationsAdvisorOutput = z.infer<typeof OperationsAdvisorOutputSchema>;

export async function operationsAdvisorAssistant(input: OperationsAdvisorInput): Promise<OperationsAdvisorOutput> {
  return operationsAdvisorFlow(input);
}

const operationsAdvisorPrompt = ai.definePrompt({
  name: 'operationsAdvisorPrompt',
  input: { schema: OperationsAdvisorInputSchema },
  output: { schema: OperationsAdvisorOutputSchema },
  prompt: `You are an expert startup Chief Operating Officer (COO) and finance partner advising Indian founders. Your goal is to analyze the company's operational profile (headcount costs, SaaS spend, other overheads, bank balance, and runway) and recommend optimizations to improve operational efficiency and maximize runway.

Company Profile Context:
- Name: {{{companyName}}}
- Stage: {{{stage}}}
- Industry: {{{industry}}}

Financial Snapshot:
- Cash in Bank: ₹{{{cashInBank}}}
- Total Monthly Burn Rate: ₹{{{monthlyBurnRate}}}
- Survival Runway: {{{runwayMonths}}} months
- Other Monthly Burn: ₹{{{otherBurn}}}

SaaS & Infrastructure Subscriptions:
{{#each saasSubscriptions}}
- {{this.name}} ({{this.category}}): ₹{{this.cost}}/mo (Billing: {{this.billing}})
{{/each}}

Team Headcount & Salaries:
{{#each teamMembers}}
- {{this.name}} - {{this.role}} (Status: {{this.status}}): ₹{{this.salary}}/mo
{{/each}}

{{#if question}}
Founder's Custom Inquiry:
"""{{{question}}}"""
{{/if}}

Provide:
1. "summary": A professional COO assessment of the startup's burn profile (SaaS vs. Headcount vs. Other). Address the custom question if provided. Keep it in clean Markdown.
2. "runwayAnalysis": A breakdown of the runway, classifying the risk level (e.g. Red if <6 months, Amber if 6-12 months, Green if >12 months) and detailing the burn rate composition.
3. "costOptimizationOpportunities": Concrete ideas to trim hosting (AWS/GCP), SaaS tools, or office space expenses based on standard startup benchmarks.
4. "teamPlanningRecommendations": Headcount and hiring suggestions. Highlight if there is low efficiency, dominant salary spends, or premature hiring plans in their listed pipeline.
5. "runwayExtensionTactics": Actionable advice to conserve cash, optimize working capital, or request cloud credits.
6. "suggestedActions": A checklist of 3-4 priority actions the founder should take this week to optimize operations.
`
});

const operationsAdvisorFlow = ai.defineFlow(
  {
    name: 'operationsAdvisorFlow',
    inputSchema: OperationsAdvisorInputSchema,
    outputSchema: OperationsAdvisorOutputSchema,
  },
  async (input) => {
    const {output} = await operationsAdvisorPrompt(input);
    return output!;
  }
);
