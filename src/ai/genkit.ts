import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  // If no API key is in environment, set apiKey: false to prevent fatal crash during module evaluation
  plugins: [googleAI(apiKey ? { apiKey } : { apiKey: false })],
  model: 'googleai/gemini-2.5-flash',
});
