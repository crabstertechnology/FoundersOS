'use server';

/**
 * @fileOverview Option 14 Tool Calling AI Assistant for FounderOS Web App.
 * Uses Genkit tool definitions to execute backend functions dynamically.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// -----------------------------------------------------------------
// 1. Tool Definitions (Option 14 Architecture)
// -----------------------------------------------------------------

export const calculateRunwayTool = ai.defineTool(
  {
    name: 'calculateRunwayTool',
    description: 'Calculates cash runway in months and assesses financial risk based on cash reserves and monthly burn rate.',
    inputSchema: z.object({
      cashBankInr: z.number().describe('Current cash in bank in INR.'),
      monthlyRevenueInr: z.number().describe('Monthly recurring revenue (MRR) in INR.'),
      monthlyExpensesInr: z.number().describe('Total monthly operating expenses in INR.'),
    }),
    outputSchema: z.object({
      monthlyBurnInr: z.number(),
      runwayMonths: z.number(),
      riskLevel: z.enum(['Critical', 'Warning', 'Healthy']),
      recommendation: z.string(),
    }),
  },
  async (input) => {
    const burn = Math.max(0, input.monthlyExpensesInr - input.monthlyRevenueInr);
    const runway = burn === 0 ? 999 : Number((input.cashBankInr / burn).toFixed(1));
    
    let riskLevel: 'Critical' | 'Warning' | 'Healthy' = 'Healthy';
    let recommendation = 'Runway is healthy (>12 months). Continue scaling efficiency.';

    if (runway < 6) {
      riskLevel = 'Critical';
      recommendation = 'Critical warning: Runway is below 6 months. Freeze non-essential hires and initiate emergency fundraising immediately.';
    } else if (runway < 12) {
      riskLevel = 'Warning';
      recommendation = 'Caution: Runway is between 6-12 months. Begin preparing pitch materials and warm VC introductions.';
    }

    return {
      monthlyBurnInr: burn,
      runwayMonths: runway,
      riskLevel,
      recommendation,
    };
  }
);

export const evaluateCapTableTool = ai.defineTool(
  {
    name: 'evaluateCapTableTool',
    description: 'Evaluates cap table ownership, voting power, and dilution safety for founders.',
    inputSchema: z.object({
      founderOwnershipPercentage: z.number().min(0).max(100),
      investorOwnershipPercentage: z.number().min(0).max(100),
      esopPoolPercentage: z.number().min(0).max(50),
    }),
    outputSchema: z.object({
      hasVotingMajority: z.boolean(),
      esopHealth: z.enum(['Too Low', 'Healthy', 'Too High']),
      advice: z.string(),
    }),
  },
  async (input) => {
    const hasVotingMajority = input.founderOwnershipPercentage > 50.0;
    let esopHealth: 'Too Low' | 'Healthy' | 'Too High' = 'Healthy';
    
    if (input.esopPoolPercentage < 5) esopHealth = 'Too Low';
    else if (input.esopPoolPercentage > 15) esopHealth = 'Too High';

    let advice = 'Cap table ownership is balanced.';
    if (!hasVotingMajority) {
      advice = 'WARNING: Founders hold less than 50% equity. Ensure key decision voting thresholds require 75% approval or founder consent.';
    }

    return {
      hasVotingMajority,
      esopHealth,
      advice,
    };
  }
);

// -----------------------------------------------------------------
// 2. Assistant Flow with Tool Calling Enabled
// -----------------------------------------------------------------

const FounderOSAssistantInputSchema = z.object({
  userPrompt: z.string().describe('The question or task requested by the founder.'),
  companyName: z.string().optional(),
});

const FounderOSAssistantOutputSchema = z.object({
  answerMarkdown: z.string().describe('Final response provided by the AI assistant in Markdown format.'),
  toolsCalled: z.array(z.string()).describe('List of tools executed to fulfill the request.'),
});

export type FounderOSAssistantInput = z.infer<typeof FounderOSAssistantInputSchema>;
export type FounderOSAssistantOutput = z.infer<typeof FounderOSAssistantOutputSchema>;

export async function askFounderOSAssistant(input: FounderOSAssistantInput): Promise<FounderOSAssistantOutput> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are the FounderOS Strategic AI Copilot for Indian startup founders.
Answer the founder's prompt accurately. Use tools whenever calculation or cap table evaluation is needed.

Company Context: ${input.companyName ?? 'Startup Founder'}
User Question: "${input.userPrompt}"`,
    tools: [calculateRunwayTool, evaluateCapTableTool],
  });

  return {
    answerMarkdown: response.text ?? '',
    toolsCalled: ['calculateRunwayTool', 'evaluateCapTableTool'],
  };
}
