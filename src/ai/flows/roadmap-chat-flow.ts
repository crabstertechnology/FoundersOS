'use server';
/**
 * @fileOverview A Genkit flow for interactive roadmap discussion and suggestions for plan modifications.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RoadmapChatInputSchema = z.object({
  message: z.string().describe('The user\'s message or request about their roadmap.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).describe('Previous conversation messages.'),
  activePlan: z.string().describe('The current stringified active strategic plan/roadmap.'),
  yearlyGoal: z.string().describe('The startup\'s yearly goal.'),
  companyName: z.string().describe('The name of the company.'),
});

export type RoadmapChatInput = z.infer<typeof RoadmapChatInputSchema>;

const RoadmapChatOutputSchema = z.object({
  response: z.string().describe('A helpful, collaborative response addressing the founder\'s query about their plan in Markdown.'),
  planModificationSuggestion: z.string().describe('A bulleted summary of modifications the AI recommends making to the plan, based on this conversation. Should be clear and concise (1-2 sentences or bullet points).'),
  suggestedFollowUps: z.array(z.string()).describe('List of 2-3 logical next questions the founder might ask.')
});

export type RoadmapChatOutput = z.infer<typeof RoadmapChatOutputSchema>;

export async function roadmapChatAssistant(input: RoadmapChatInput): Promise<RoadmapChatOutput> {
  return roadmapChatFlow(input);
}

const roadmapChatPrompt = ai.definePrompt({
  name: 'roadmapChatPrompt',
  input: { schema: RoadmapChatInputSchema },
  output: { schema: RoadmapChatOutputSchema },
  prompt: `You are a professional startup chief-of-staff and product advisor. The founder wants to discuss, adjust, and optimize their 12-month strategic plan and roadmap.
Provide an objective, critical, and constructive discussion of the founder's statements. Analyze their assumptions, identify potential operational or financial constraints, and highlight risks regarding market fit. Write in a clear, direct, and professional manner.

Active Yearly Goal:
"""{{{yearlyGoal}}}"""

Current Active Strategic Plan:
"""{{{activePlan}}}"""

Chat History:
{{#each chatHistory}}
* {{role}}: {{content}}
{{/each}}

Founder's Message/Request:
"""{{{message}}}"""

Provide:
1. "response": Write a consultative, constructive, and strategic response in Markdown. Give concrete reasoning. Suggest how to solve or adjust their plan based on their concern (e.g., if they are short on cash, tell them how to shift targets; if they want to build faster, recommend MVP priorities).
2. "planModificationSuggestion": Based on the user's message and this chat, summarize the EXACT change we should write into their adapted plan (e.g. "Postpone target MRR validation to Q3; add custom integration features scope in Q2; redirect ops focus to contract developers"). This summary will be used to regenerate/modify the active roadmap when the user clicks "Modify Plan".
3. "suggestedFollowUps": 2-3 logical next questions or suggestions the founder might want to ask.
`
});

const roadmapChatFlow = ai.defineFlow(
  {
    name: 'roadmapChatFlow',
    inputSchema: RoadmapChatInputSchema,
    outputSchema: RoadmapChatOutputSchema,
  },
  async (input) => {
    const {output} = await roadmapChatPrompt(input);
    return output!;
  }
);
