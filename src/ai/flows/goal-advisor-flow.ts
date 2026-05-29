'use server';
/**
 * @fileOverview A Genkit flow for generating and adapting startup roadmaps based on yearly goals and business metrics.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GoalAdvisorInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  stage: z.string().describe('The current startup stage, e.g., Pre-revenue/MVP, Early Traction/Seed, Scaling/Growth.'),
  yearlyGoal: z.string().describe('The main yearly goal specified by the user.'),
  salesData: z.object({
    mrr: z.number().describe('Monthly Recurring Revenue (MRR) in INR.'),
    arr: z.number().describe('Annual Run Rate (ARR) in INR.'),
    pipelineValue: z.number().describe('Current sales pipeline value in INR.'),
    dealsCount: z.number().describe('Number of active deals.'),
  }),
  financeData: z.object({
    valuation: z.number().describe('Latest valuation in INR.'),
    investment: z.number().describe('Total investment sought or raised in INR.'),
    runway: z.number().describe('Runway in months.'),
    cash: z.number().describe('Liquid cash in bank in INR.'),
    burnRate: z.number().describe('Total monthly burn rate in INR.'),
  }),
  opsData: z.object({
    teamSize: z.number().describe('Active team members count.'),
    saasCost: z.number().describe('Monthly SaaS subscription cost in INR.'),
    salaries: z.number().describe('Monthly salaries expense in INR.'),
  }),
  missingInfo: z.string().optional().describe('Any extra context or missing information provided by the user.'),
  weeklyProgress: z.string().optional().describe('Weekly progress details provided by the user for adapting the plan.'),
  previousRoadmap: z.string().optional().describe('The previous generated roadmap and tasks object stringified, if adapting.'),
});

export type GoalAdvisorInput = z.infer<typeof GoalAdvisorInputSchema>;

const GoalAdvisorOutputSchema = z.object({
  analysis: z.string().describe('A professional strategic assessment of the startup state vs yearly goal, highlighting gaps and risks.'),
  missingInfoRequests: z.array(z.string()).describe('List of critical missing details or clarifying questions the user should answer to make the roadmap more precise.'),
  yearlyRoadmap: z.array(z.object({
    period: z.string().describe('e.g., Q1 (Months 1-3) or Q2 (Months 4-6)'),
    focus: z.string().describe('Main thematic focus for this quarter'),
    objectives: z.array(z.string()).describe('2-3 specific objectives for this period'),
  })).describe('A quarterly breakdown of the 12-month strategic roadmap.'),
  monthlyMilestones: z.array(z.object({
    month: z.string().describe('e.g., Month 1, Month 2, Month 3'),
    milestone: z.string().describe('Key target/milestone for this month'),
    keyMetrics: z.array(z.string()).describe('Metrics to track this month'),
  })).describe('Actionable monthly milestones for the next 3 months.'),
  weeklyPlans: z.array(z.object({
    week: z.string().describe('e.g., Week 1, Week 2, Week 3, Week 4'),
    theme: z.string().describe('Focus of the week'),
    actions: z.array(z.string()).describe('High impact actions for the week'),
  })).describe('Execution themes and priorities for the upcoming 4 weeks.'),
  dailyTasks: z.array(z.object({
    title: z.string().describe('Clear, action-oriented task title.'),
    description: z.string().describe('Brief description of what needs to be done and success criteria.'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    category: z.string().describe('The department/category (Sales, Finance, Operations, Product).'),
  })).describe('A set of daily actionable tasks that can be assigned directly to the team.'),
});

export type GoalAdvisorOutput = z.infer<typeof GoalAdvisorOutputSchema>;

export async function goalAdvisorAssistant(input: GoalAdvisorInput): Promise<GoalAdvisorOutput> {
  return goalAdvisorFlow(input);
}

const goalAdvisorPrompt = ai.definePrompt({
  name: 'goalAdvisorPrompt',
  input: { schema: GoalAdvisorInputSchema },
  output: { schema: GoalAdvisorOutputSchema },
  prompt: `You are an elite chief-of-staff and startup growth consultant advising founders in India.
Your mission is to understand a company's yearly goal, analyze its current condition based on Sales, Finance, and Operations metrics, call out missing info, and construct a highly cohesive execution architecture.

Company Context:
- Startup Name: {{{companyName}}}
- Stage: {{{stage}}}
- Yearly Goal: """{{{yearlyGoal}}}"""

Sales Metrics Snapshot:
- Current MRR: ₹{{{salesData.mrr}}} | ARR: ₹{{{salesData.arr}}}
- Sales Pipeline Value: ₹{{{salesData.pipelineValue}}} | Active Deals: {{{salesData.dealsCount}}}

Finance Metrics Snapshot:
- Post-money/Latest Valuation: ₹{{{financeData.valuation}}}
- Investment Sought/Raised: ₹{{{financeData.investment}}}
- Survival Runway: {{{financeData.runway}}} Months | Liquid Cash: ₹{{{financeData.cash}}}
- Total Burn Rate: ₹{{{financeData.burnRate}}}/mo

Operations Metrics Snapshot:
- Team Size: {{{opsData.teamSize}}} active members
- Monthly SaaS Spend: ₹{{{opsData.saasCost}}}
- Monthly Salaries: ₹{{{opsData.salaries}}}

Additional User Context / Missing Info Filled:
"""{{{missingInfo}}}"""

{{#if weeklyProgress}}
PROGRESS UPDATE (ADAPTATION MODE):
The user is updating their progress weekly. Adapt future plans dynamically based on what was achieved or missed:
"""{{{weeklyProgress}}}"""

Previous Plans Context:
{{{previousRoadmap}}}
{{/if}}

Please output:
1. "analysis": An expert strategic assessment of their stage vs. goal, pointing out runway risks, pipeline multipliers, or operations efficiency gaps. If this is an adaptation run (based on weeklyProgress), explicitly summarize what went well, how you adapted the remaining roadmap, and encourage the team.
2. "missingInfoRequests": If there are details you'd like to collect to improve the plan (e.g. customer acquisition channel, pricing models, average contract value, hiring plans), formulate 2-3 specific questions. If none, return an empty array.
3. "yearlyRoadmap": 4 quarterly blocks dividing the next 12 months to hit the goal.
4. "monthlyMilestones": Key targets for the next 3 months (Month 1, Month 2, Month 3).
5. "weeklyPlans": 4 weekly high-impact execution plans for the next 4 weeks.
6. "dailyTasks": A list of 4-6 immediate daily actionable tasks. Ensure they are concrete (e.g. "Draft SaaS cold email sequence", "Audit SaaS subscriptions above ₹5000/mo") and map directly to the categories (Sales, Finance, Operations, Product).
`
});

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    console.warn(`Genkit call failed with: ${err}. Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

const goalAdvisorFlow = ai.defineFlow(
  {
    name: 'goalAdvisorFlow',
    inputSchema: GoalAdvisorInputSchema,
    outputSchema: GoalAdvisorOutputSchema,
  },
  async (input) => {
    const response = await retryWithBackoff(async () => {
      return await goalAdvisorPrompt(input);
    });
    return response.output!;
  }
);
