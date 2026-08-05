import { genkit } from 'genkit';
import openAI, { gpt4oMini } from 'genkitx-openai';

export const ai = genkit({
  plugins: [openAI()],
  model: gpt4oMini,
});
