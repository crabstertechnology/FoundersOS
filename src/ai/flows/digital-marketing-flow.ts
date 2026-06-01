'use server';
/**
 * @fileOverview Digital Marketing AI flows — kept intentionally small to stay within token limits.
 * Flow 1: generateDMScripts  — one platform's script at a time
 * Flow 2: generateDMCalendar — 7-day calendar + pillars + KPIs
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ─── Shared context passed to both flows ─────────────────────────────────────

const DMContextSchema = z.object({
  productName: z.string(),
  productDescription: z.string(),
  targetAudience: z.string(),
  companyName: z.string(),
  platform: z.enum(['instagram', 'youtube', 'linkedin']),
  contentGoal: z.enum(['awareness', 'leads', 'sales', 'community']),
  brandTone: z.enum(['professional', 'casual', 'educational', 'inspirational', 'bold']),
  customFocus: z.string().optional(),
});
type DMContext = z.infer<typeof DMContextSchema>;

// ─── Flow 1: Single-platform script ──────────────────────────────────────────

const DMScriptOutputSchema = z.object({
  hook: z.string().describe('One punchy opening line.'),
  script: z.string().describe('Script body — max 150 words.'),
  hashtags: z.array(z.string()).describe('Exactly 10 hashtags.'),
  callToAction: z.string(),
  contentIdeas: z.array(z.string()).describe('Exactly 4 ideas, one sentence each.'),
  postingSchedule: z.string().describe('e.g. "3x/week — Tue, Thu, Sat at 7 PM IST"'),
});
export type DMScriptOutput = z.infer<typeof DMScriptOutputSchema>;

const dmScriptPrompt = ai.definePrompt({
  name: 'dmScriptPrompt',
  input: { schema: DMContextSchema },
  output: { schema: DMScriptOutputSchema },
  prompt: `You are a digital marketing expert for Indian startups. Write a {{{platform}}} script for this product.

Product: {{{productName}}}
What it does: {{{productDescription}}}
Audience: {{{targetAudience}}}
Goal: {{{contentGoal}}} | Tone: {{{brandTone}}}
{{#if customFocus}}Focus on: {{{customFocus}}}{{/if}}

Return:
- hook: one sentence, grabs attention in 3 seconds
- script: complete {{{platform}}} script, under 150 words (use [scene:] for reels/shorts)
- hashtags: exactly 10 relevant hashtags (no # prefix needed)
- callToAction: one clear CTA line
- contentIdeas: exactly 4 content ideas (one sentence each)
- postingSchedule: best days/times for Indian audience on {{{platform}}}`,
});

const dmScriptFlow = ai.defineFlow(
  { name: 'dmScriptFlow', inputSchema: DMContextSchema, outputSchema: DMScriptOutputSchema },
  async (input) => {
    const { output } = await dmScriptPrompt(input);
    return output!;
  }
);

export async function generateDMScript(input: DMContext): Promise<DMScriptOutput> {
  return dmScriptFlow(input);
}

// ─── Flow 2: Calendar + Pillars + KPIs ───────────────────────────────────────

const DMCalendarInputSchema = z.object({
  productName: z.string(),
  companyName: z.string(),
  targetAudience: z.string(),
  contentGoal: z.enum(['awareness', 'leads', 'sales', 'community']),
  platforms: z.array(z.enum(['instagram', 'youtube', 'linkedin'])),
});
export type DMCalendarInput = z.infer<typeof DMCalendarInputSchema>;

const DMCalendarOutputSchema = z.object({
  contentPillars: z.array(z.string()).describe('Exactly 4 content pillar titles.'),
  weeklyCalendar: z.array(z.object({
    day: z.string(),
    platform: z.string(),
    contentType: z.string(),
    topic: z.string(),
  })).describe('Exactly 7 rows, Mon–Sun.'),
  kpiTargets: z.record(z.string()).describe('Object with platform keys and 90-day KPI strings.'),
  reachTips: z.array(z.string()).describe('Exactly 3 organic reach tips.'),
});
export type DMCalendarOutput = z.infer<typeof DMCalendarOutputSchema>;

const dmCalendarPrompt = ai.definePrompt({
  name: 'dmCalendarPrompt',
  input: { schema: DMCalendarInputSchema },
  output: { schema: DMCalendarOutputSchema },
  prompt: `You are a social media strategist. Create a compact content plan.

Product: {{{productName}}} | Company: {{{companyName}}}
Audience: {{{targetAudience}}} | Goal: {{{contentGoal}}}
Platforms: {{#each platforms}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Return ONLY:
1. contentPillars: exactly 4 short theme titles
2. weeklyCalendar: exactly 7 rows (Mon–Sun). Each: day, platform, contentType, topic (≤8 words)
3. kpiTargets: for each platform, one short 90-day KPI sentence
4. reachTips: exactly 3 tips (one sentence each)`,
});

const dmCalendarFlow = ai.defineFlow(
  { name: 'dmCalendarFlow', inputSchema: DMCalendarInputSchema, outputSchema: DMCalendarOutputSchema },
  async (input) => {
    const { output } = await dmCalendarPrompt(input);
    return output!;
  }
);

export async function generateDMCalendar(input: DMCalendarInput): Promise<DMCalendarOutput> {
  return dmCalendarFlow(input);
}
