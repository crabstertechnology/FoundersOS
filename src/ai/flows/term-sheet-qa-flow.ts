'use server';
/**
 * @fileOverview A Genkit flow for answering general questions about term sheets
 *               and negotiation strategies to provide truthful and expert advice.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TermSheetQAInputSchema = z.object({
  question: z.string().describe('The question asked by the founder regarding term sheets or negotiations.'),
  companyName: z.string().describe('The name of the company.'),
  stage: z.string().describe('The current funding stage of the company (e.g., "Idea / Pre-Revenue", "MVP / Early Traction", "Seed Stage", "Series A").'),
  industry: z.string().describe('The industry the company operates in (e.g., "IoT / Hardware", "SaaS / Software", "AI / ML").'),
  monthlyRevenue: z.number().min(0).describe('Current monthly revenue in INR.'),
});

export type TermSheetQAInput = z.infer<typeof TermSheetQAInputSchema>;

const TermSheetQAOutputSchema = z.object({
  answer: z.string().describe('A truthful, founder-friendly, and educational answer to the user\'s question in Markdown format.'),
  suggestedFollowUpQuestions: z.array(z.string()).describe('List of 2-3 logical follow-up questions the founder might ask.'),
  riskLevel: z.enum(['Low', 'Medium', 'High']).describe('The risk level of the term or clause being discussed, from the founder\'s perspective. "Low" means standard and founder-friendly; "Medium" means needs careful review; "High" means a significant red flag or predatory clause.'),
  riskRationale: z.string().describe('A single concise sentence (max 15 words) explaining the reason for the risk level assigned.'),
});

export type TermSheetQAOutput = z.infer<typeof TermSheetQAOutputSchema>;

export async function termSheetQAAssistant(input: TermSheetQAInput): Promise<TermSheetQAOutput> {
  return termSheetQAAssistantFlow(input);
}

const termSheetQAPrompt = ai.definePrompt({
  name: 'termSheetQAPrompt',
  input: { schema: TermSheetQAInputSchema },
  output: { schema: TermSheetQAOutputSchema },
  prompt: `You are an expert startup advisor specializing in term sheet negotiations and venture capital for Indian founders.
Your goal is to answer questions truthfully, clearly, and helpfully. Explain complex concepts in plain English, highlighting any potential red flags founders should watch for.

Company Profile Context:
- Name: {{{companyName}}}
- Stage: {{{stage}}}
- Industry: {{{industry}}}
- Monthly Revenue: INR {{{monthlyRevenue}}}

User Question: """{{{question}}}"""

Provide:
1. "answer": A detailed, truthful, and educational explanation answering the founder's question. Frame advice in an empowering, founder-friendly way. If discussing numerical examples, use INR. Use short paragraphs, bold text for key terms, and bullet points for readability. DO NOT start your answer with "Yes", just go straight into the explanation.
2. "suggestedFollowUpQuestions": Provide 2-3 smart follow-up questions the founder should consider asking next to deepen their understanding of this topic.
3. "riskLevel": Based on the topic in the question, assign a risk level from the FOUNDER'S perspective: "Low" (standard, founder-friendly term), "Medium" (clause needing careful review or negotiation), or "High" (predatory, aggressive, or a major red flag clause).
4. "riskRationale": A single, concise sentence (max 15 words) explaining WHY you assigned this risk level.
`
});

const termSheetQAAssistantFlow = ai.defineFlow(
  {
    name: 'termSheetQAAssistantFlow',
    inputSchema: TermSheetQAInputSchema,
    outputSchema: TermSheetQAOutputSchema,
  },
  async (input) => {
    const {output} = await termSheetQAPrompt(input);
    return output!;
  }
);
