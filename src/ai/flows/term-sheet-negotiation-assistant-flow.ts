'use server';
/**
 * @fileOverview A Genkit flow for providing strategic advice and warnings
 *               to founders negotiating term sheets.
 *
 * - termSheetNegotiationAssistant - A function that analyzes company data and
 *                                   proposed term sheet clauses to offer
 *                                   founder-friendly recommendations,
 *                                   negotiation talking points, and red flags.
 * - TermSheetNegotiationAssistantInput - The input type for the assistant.
 * - TermSheetNegotiationAssistantOutput - The return type for the assistant.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TermSheetNegotiationAssistantInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  stage: z.string().describe('The current funding stage of the company (e.g., "Idea / Pre-Revenue", "MVP / Early Traction", "Seed Stage", "Series A").'),
  industry: z.string().describe('The industry the company operates in (e.g., "IoT / Hardware", "SaaS / Software", "AI / ML").'),
  monthlyRevenue: z.number().min(0).describe('Current monthly revenue in INR.'),
  monthlyGrowthRate: z.number().min(0).describe('Monthly growth rate in percentage (e.g., 15 for 15%).'),
  monthlyBurnRate: z.number().min(0).describe('Current monthly burn rate in INR.'),
  cashInBank: z.number().min(0).describe('Current cash in bank in INR.'),
  totalCustomers: z.number().min(0).describe('Total number of paying customers.'),
  avgCustomerLTV: z.number().min(0).describe('Average Customer Lifetime Value in INR.'),
  customerAcquisitionCost: z.number().min(0).describe('Customer Acquisition Cost in INR.'),
  investmentAmount: z.number().min(0).describe('The investment amount being sought for this round in INR.'),
  equityOfferedToInvestorPercentage: z.number().min(0).max(100).describe('The percentage of equity the founder is considering offering to the investor for this round.'),
  currentFounderEquityPercentage: z.number().min(0).max(100).describe('The founder\'s current equity percentage BEFORE this funding round.'),
  esopPoolPercentage: z.number().min(0).max(50).describe('The proposed ESOP pool percentage.'),
  advisorEquityPercentage: z.number().min(0).max(20).describe('The proposed advisor equity percentage.'),
  coFounderEquityPercentage: z.number().min(0).max(80).describe('The co-founder equity percentage, if applicable (0 if solo founder).'),
  existingTermSheetClauses: z.string().optional().describe('Optional: A summary of specific clauses or terms already proposed by an investor in a term sheet (e.g., "Investor proposes 2x participating liquidation preference, full ratchet anti-dilution, 2 of 3 board seats, and 60 days exclusivity.").')
});

export type TermSheetNegotiationAssistantInput = z.infer<typeof TermSheetNegotiationAssistantInputSchema>;

const NegotiationPointSchema = z.object({
  clause: z.string().describe('The name of the term sheet clause (e.g., "Liquidation Preference", "Anti-Dilution", "Board Composition", "Exclusivity").'),
  founderFriendlyRecommendation: z.string().describe('The ideal founder-friendly structure for this clause.'),
  negotiationStrategy: z.string().describe('Key talking points and arguments the founder can use during negotiation.'),
  redFlagsToWatchOutFor: z.string().describe('Specific investor terms or behaviors that indicate a red flag for this clause.'),
  feedbackOnCurrentProposedTerms: z.string().optional().describe('Feedback and advice specifically addressing the user\'s existing proposed terms for this clause, if provided in the input.'),
});

const TermSheetNegotiationAssistantOutputSchema = z.object({
  overallAssessment: z.string().describe('An overall assessment of the company\'s negotiating position based on the provided metrics and stage.'),
  keyNegotiationPoints: z.array(NegotiationPointSchema).describe('Detailed advice for key term sheet clauses.'),
  generalWarnings: z.string().describe('Any other general advice or warnings relevant to term sheet negotiation.'),
});

export type TermSheetNegotiationAssistantOutput = z.infer<typeof TermSheetNegotiationAssistantOutputSchema>;

export async function termSheetNegotiationAssistant(input: TermSheetNegotiationAssistantInput): Promise<TermSheetNegotiationAssistantOutput> {
  return termSheetNegotiationAssistantFlow(input);
}

const termSheetNegotiationAssistantPrompt = ai.definePrompt({
  name: 'termSheetNegotiationAssistantPrompt',
  input: { schema: TermSheetNegotiationAssistantInputSchema },
  output: { schema: TermSheetNegotiationAssistantOutputSchema },
  prompt: `You are an expert startup advisor specializing in term sheet negotiations for Indian founders. Your goal is to help founders protect their equity and control.
You will analyze the provided company data and investment scenario. Then, you will propose specific founder-friendly clauses, suggest negotiation talking points, and highlight red flags for key term sheet elements.

Company Name: {{{companyName}}}
Stage: {{{stage}}}
Industry: {{{industry}}}
Monthly Revenue (INR): {{{monthlyRevenue}}}
Monthly Growth Rate (%): {{{monthlyGrowthRate}}}
Monthly Burn Rate (INR): {{{monthlyBurnRate}}}
Cash in Bank (INR): {{{cashInBank}}}
Total Customers: {{{totalCustomers}}}
Average Customer LTV (INR): {{{avgCustomerLTV}}}
Customer Acquisition Cost (INR): {{{customerAcquisitionCost}}}
Investment Amount Sought (INR): {{{investmentAmount}}}
Equity Founder is Considering Offering to Investor (%): {{{equityOfferedToInvestorPercentage}}}
Founder's Current Equity Percentage (Before this round): {{{currentFounderEquityPercentage}}}
Proposed ESOP Pool Percentage: {{{esopPoolPercentage}}}
Proposed Advisor Equity Percentage: {{{advisorEquityPercentage}}}
Co-Founder Equity Percentage: {{{coFounderEquityPercentage}}}

{{#if existingTermSheetClauses}}
Existing Proposed Term Sheet Clauses: {{{existingTermSheetClauses}}}
{{/if}}

Based on this information, provide:
1.  An "overallAssessment" of the founder's negotiating position.
2.  "keyNegotiationPoints" for the following clauses, including founder-friendly recommendations, negotiation strategies, and red flags. If existing proposed terms are provided, give specific "feedbackOnCurrentProposedTerms":
    -   Liquidation Preference
    -   Anti-Dilution
    -   Board Composition
    -   Exclusivity/No-Shop Clause
    -   Founder Vesting (if not explicitly mentioned, assume standard 4-year/1-year cliff)
    -   ESOP Pool Creation
3.  "generalWarnings" for term sheet negotiations.

Focus on practical, actionable advice relevant to the Indian startup ecosystem. Ensure all numerical examples in your response use INR. When calculating ratios like LTV:CAC, use the provided LTV and CAC. When discussing founder equity, consider the `currentFounderEquityPercentage` and the `equityOfferedToInvestorPercentage` to project dilution.

Example LTV:CAC Calculation: Average Customer LTV ({{{avgCustomerLTV}}}) / Customer Acquisition Cost ({{{customerAcquisitionCost}}})
Example Runway Calculation: Cash in Bank ({{{cashInBank}}}) / Monthly Burn Rate ({{{monthlyBurnRate}}})

Be concise but comprehensive in your advice for each point.
`
});

const termSheetNegotiationAssistantFlow = ai.defineFlow(
  {
    name: 'termSheetNegotiationAssistantFlow',
    inputSchema: TermSheetNegotiationAssistantInputSchema,
    outputSchema: TermSheetNegotiationAssistantOutputSchema,
  },
  async (input) => {
    const {output} = await termSheetNegotiationAssistantPrompt(input);
    return output!;
  }
);
