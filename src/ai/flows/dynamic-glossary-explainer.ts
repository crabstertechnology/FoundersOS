'use server';
/**
 * @fileOverview A Genkit flow for explaining complex startup terms or document clauses.
 *
 * - explainStartupTerm - A function that provides a simplified explanation, Indian context example, and practical implications for a given startup term or clause.
 * - ExplainStartupTermInput - The input type for the explainStartupTerm function.
 * - ExplainStartupTermOutput - The return type for the explainStartupTerm function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainStartupTermInputSchema = z.object({
  termOrClause: z
    .string()
    .describe('A complex startup term or document clause to be explained.')
});
export type ExplainStartupTermInput = z.infer<
  typeof ExplainStartupTermInputSchema
>;

const ExplainStartupTermOutputSchema = z.object({
  explanation: z
    .string()
    .describe('A simplified explanation of the term or clause.'),
  indianContextExample: z
    .string()
    .describe('A real-world example with Indian context and financial figures.'),
  practicalImplications: z
    .string()
    .describe('Practical implications for a founder\'s company and decision-making.')
});
export type ExplainStartupTermOutput = z.infer<
  typeof ExplainStartupTermOutputSchema
>;

export async function explainStartupTerm(
  input: ExplainStartupTermInput
): Promise<ExplainStartupTermOutput> {
  return dynamicGlossaryExplainerFlow(input);
}

const explainStartupTermPrompt = ai.definePrompt({
  name: 'explainStartupTermPrompt',
  input: {schema: ExplainStartupTermInputSchema},
  output: {schema: ExplainStartupTermOutputSchema},
  prompt: `You are an expert in startup finance, legal terms, and the Indian startup ecosystem.
Your task is to explain a given startup term or document clause in a simplified manner, provide a realistic example with Indian context (including INR figures where appropriate), and outline its practical implications for a founder's company and decision-making.

Be concise, clear, and focus on practical advice for a founder in India.

Term or Clause: "{{{termOrClause}}}"`
});

const dynamicGlossaryExplainerFlow = ai.defineFlow(
  {
    name: 'dynamicGlossaryExplainerFlow',
    inputSchema: ExplainStartupTermInputSchema,
    outputSchema: ExplainStartupTermOutputSchema
  },
  async input => {
    const {output} = await explainStartupTermPrompt(input);
    if (!output) {
      throw new Error('Failed to generate explanation for the startup term.');
    }
    return output;
  }
);
