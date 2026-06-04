'use server';
/**
 * @fileOverview A Genkit flow for generating a professional weekly founder progress report.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WeeklyProgressReportInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  currentDate: z.string().describe('The current date/time.'),
  activitiesSerialized: z.string().describe('Serialized JSON string containing all raw activities from the last 7 days.'),
});

export type WeeklyProgressReportInput = z.infer<typeof WeeklyProgressReportInputSchema>;

const WeeklyProgressReportOutputSchema = z.object({
  report: z.string().describe('The formatted weekly progress report in text format starting with Good evening Sir, and ending with Thank you Sir.'),
});

export type WeeklyProgressReportOutput = z.infer<typeof WeeklyProgressReportOutputSchema>;

export async function weeklyProgressReportAssistant(input: WeeklyProgressReportInput): Promise<WeeklyProgressReportOutput> {
  return weeklyProgressReportFlow(input);
}

const weeklyProgressReportPrompt = ai.definePrompt({
  name: 'weeklyProgressReportPrompt',
  input: { schema: WeeklyProgressReportInputSchema },
  output: { schema: WeeklyProgressReportOutputSchema },
  prompt: `You are an assistant generating a weekly startup progress report for the startup "{{{companyName}}}".
Analyze all activities, meetings, sales updates, product development work, marketing efforts, workshops, networking activities, challenges, and learnings recorded during the current week (up to 7 days before {{{currentDate}}}).

Create a professional update addressed to a mentor/investor.

Requirements:
1. Group activities into relevant categories ONLY:
   * Business Development
   * Product Development
   * Sales & Customer Outreach
   * Marketing & Content
   * Workshops & Training
   * Partnerships & Networking
   * Challenges & Learnings
   * Next Week's Focus

2. Convert raw activity logs into concise business updates.
3. Highlight outcomes, achievements, and insights rather than simply listing tasks.
4. If a category has no activities or updates, omit it entirely from the report.
5. Maintain a professional, executive, and optimistic tone.
6. Output in the following EXACT format (use actual bullet points •, do not use markdown bolding or markdown headings in the categories/content - output exact plain text formatting):

Good evening Sir,

This week’s progress (Date: {{{currentDate}}}):

[Category]
• Update 1
• Update 2

[Category]
• Update 1
• Update 2

Challenges & Learnings
• Learning 1
• Learning 2

Next Week's Focus
• Priority 1
• Priority 2

Thank you Sir.

Use clear business language suitable for mentors, investors, incubators, and advisors.
Focus on:
* Customer discovery
* Sales progress
* Partnerships
* Workshops
* Product development
* Marketing growth
* Revenue opportunities
* Key learnings

Do not merely list tasks completed. Explain why each activity matters and what was learned.

Here is the raw activity data from the last 7 days:
---
{{{activitiesSerialized}}}
---
`
});

const weeklyProgressReportFlow = ai.defineFlow(
  {
    name: 'weeklyProgressReportFlow',
    inputSchema: WeeklyProgressReportInputSchema,
    outputSchema: WeeklyProgressReportOutputSchema,
  },
  async (input) => {
    const {output} = await weeklyProgressReportPrompt(input);
    return output!;
  }
);
