'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ================= FLOW 1: COLD CALL SCRIPT GENERATOR =================

const ColdCallGeneratorInputSchema = z.object({
  productName: z.string().describe('Name of the startup product or service.'),
  targetAudience: z.string().describe('Who is the target customer persona.'),
  problemSolved: z.string().describe('What major pain point does it solve.'),
  buyerType: z.enum(['price', 'quality', 'urgent', 'curious']).describe('The buyer type archetype.')
});

const ColdCallGeneratorOutputSchema = z.object({
  hook: z.string().describe('Opening hook connecting to customer pain.'),
  problem: z.string().describe('Problem statement detailing real cost of pain.'),
  solution: z.string().describe('Solution introduction (product/service benefits).'),
  outcome: z.string().describe('Future state outcome painting goals.'),
  fullDraftScript: z.string().describe('A cohesive 30-second cold call script integrating the 4 parts.'),
  objectionHandlingStrategy: z.string().describe('Expected objection and the exact reframe script to resolve it.')
});

export type ColdCallGeneratorOutput = z.infer<typeof ColdCallGeneratorOutputSchema>;

const coldCallGeneratorPrompt = ai.definePrompt({
  name: 'coldCallGeneratorPrompt',
  input: { schema: ColdCallGeneratorInputSchema },
  output: { schema: ColdCallGeneratorOutputSchema },
  prompt: `You are an expert sales script coach specializing in the Value-Driven Sales System (Know Customer -> Discover Pain -> Address Pain -> Handle Objection -> Close).
Generate a customized cold call script template based on the following:

- Product Name: {{{productName}}}
- Target Audience: {{{targetAudience}}}
- Core Problem Solved: {{{problemSolved}}}
- Buyer Archetype: {{{buyerType}}} (price-focused, quality-focused, urgent, or curious)

Make sure:
1. The hook, problem, solution, and outcome map to the Value-Driven pitch formula.
2. The script sounds natural, conversational, and avoids spammy corporate speak.
3. The style matches the buyer's archetype (e.g., price-focused needs ROI/savings emphasis; urgent needs speed/delivery emphasis).
4. Provide a customized objection handling script for the most likely barrier they will raise.
`
});

export async function generateColdCallTemplate(
  input: z.infer<typeof ColdCallGeneratorInputSchema>
): Promise<ColdCallGeneratorOutput> {
  const { output } = await coldCallGeneratorPrompt(input);
  return JSON.parse(JSON.stringify(output!));
}

// ================= FLOW 2: COACHING SCENARIO GENERATOR =================

const CoachingScenarioInputSchema = z.object({
  areaToCoach: z.enum([
    'Customer Understanding',
    'Pain Discovery',
    'Value Pitch',
    'Objection Handling',
    'Closing',
    'Follow-Up'
  ]).describe('The skill area from the coaching syllabus.'),
  difficulty: z.enum(['beginner', 'advanced']).describe('The difficulty level of the simulation.'),
  productName: z.string().describe('The product being sold by the sales rep.'),
  targetAudience: z.string().describe('Target audience for the product.'),
  problemSolved: z.string().describe('Problem solved by the product.')
});

const CoachingScenarioOutputSchema = z.object({
  scenarioName: z.string().describe('Catchy name for this sales scenario.'),
  prospectName: z.string().describe('Name and role of the prospect.'),
  companyContext: z.string().describe('Details about the prospect\'s company and setup.'),
  triggerEvent: z.string().describe('What event caused them to pick up the phone or take a call.'),
  scenarioRules: z.array(z.string()).describe('Strict rules/guidelines the sales team must follow during practice.'),
  objectionsToRaise: z.array(z.string()).describe('Specific objections the prospect will raise during roleplay.'),
  openingLine: z.string().describe('The first sentence the prospect says to start the call.')
});

export type CoachingScenarioOutput = z.infer<typeof CoachingScenarioOutputSchema>;

const coachingScenarioPrompt = ai.definePrompt({
  name: 'coachingScenarioPrompt',
  input: { schema: CoachingScenarioInputSchema },
  output: { schema: CoachingScenarioOutputSchema },
  prompt: `You are an elite sales training director designing an interactive roleplay simulator for startup founders.
Design a highly realistic roleplay scenario tailored to coach this specific sales area:

- Area to Coach: {{{areaToCoach}}}
- Difficulty: {{{difficulty}}}

The sales representative is pitching their startup's product:
- Product Name: {{{productName}}}
- Target Audience: {{{targetAudience}}}
- Core Problem Solved: {{{problemSolved}}}

Create a prospect persona that represents typical target buyers for this specific product (e.g., if target is academic lab deans, make the prospect a dean; if high school principals, make them a principal, etc.).
Establish 3-4 "Scenario Rules" that the sales rep must follow during practice (e.g., "Do not mention pricing for the first 3 turns", "You must ask at least 2 open-ended discovery questions first").
Include the prospect's starting opening line.
`
});

export async function generateCoachingScenario(
  input: z.infer<typeof CoachingScenarioInputSchema>
): Promise<CoachingScenarioOutput> {
  const { output } = await coachingScenarioPrompt(input);
  return JSON.parse(JSON.stringify(output!));
}

// ================= FLOW 3: LIVE PROSPECT CHAT SIMULATOR =================

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string()
});

const ProspectChatInputSchema = z.object({
  scenarioName: z.string(),
  prospectName: z.string(),
  companyContext: z.string(),
  triggerEvent: z.string(),
  scenarioRules: z.array(z.string()),
  objectionsToRaise: z.array(z.string()),
  chatHistory: z.array(ChatMessageSchema),
  userMessage: z.string()
});

const ProspectChatOutputSchema = z.object({
  reply: z.string().describe('Prospect\'s in-character response to the sales rep.'),
  ended: z.boolean().describe('Whether the prospect has agreed to a meeting/sale (won) or hung up/rejected (lost).'),
  coachFeedbackHint: z.string().describe('A brief, private hint or coaching advice to help the rep adjust their strategy.')
});

export type ProspectChatOutput = z.infer<typeof ProspectChatOutputSchema>;

const prospectChatPrompt = ai.definePrompt({
  name: 'prospectChatPrompt',
  input: { schema: ProspectChatInputSchema },
  output: { schema: ProspectChatOutputSchema },
  prompt: `You are simulating a live B2B prospect in a sales roleplay call. 
Your details:
- Name/Role: {{{prospectName}}}
- Scenario: {{{scenarioName}}}
- Company Context: {{{companyContext}}}
- Trigger Event: {{{triggerEvent}}}
- Rules the User is trying to follow: {{{scenarioRules}}}
- Objections you will raise when appropriate: {{{objectionsToRaise}}}

Conversation History:
{{#each chatHistory}}
- {{this.role}}: {{{this.text}}}
{{/each}}

Rep's New Message:
"""{{{userMessage}}}"""

Guidelines for you as the Prospect:
1. Stay in character! If you are a busy manager, sound busy. If you are price-sensitive, bring up budget.
2. Do not make it easy. If the rep rushes to pitch before asking questions or understanding your pain, push back or say "Send me an email, I have to go."
3. If they ask open-ended discovery questions (e.g. "What are you working on right now?"), answer naturally but throw in clues about your operational frustrations.
4. If they follow the Value-Driven process (Discover Pain -> Reframe -> Value Pitch -> Address Objection -> Ask to close), reward them by agreeing to a demo or trial and setting "ended" to true.
5. Provide a short "coachFeedbackHint" giving professional, constructive feedback on what they did well or how they can improve on their next message.
`
});

export async function simulateProspectResponse(
  input: z.infer<typeof ProspectChatInputSchema>
): Promise<ProspectChatOutput> {
  const { output } = await prospectChatPrompt(input);
  return JSON.parse(JSON.stringify(output!));
}

// ================= FLOW 4: METHODOLOGY EXPLAINER FLOW =================

const MethodologyExplainerInputSchema = z.object({
  stepNumber: z.number().describe('The step number 1-9.'),
  stepTitle: z.string().describe('Title of the step.'),
  productName: z.string().describe('User\'s product name.'),
  targetAudience: z.string().describe('Target audience of the product.'),
  problemSolved: z.string().describe('Problem solved by the product.')
});

const MethodologyExplainerOutputSchema = z.object({
  explanation: z.string().describe('Clear markdown text showing how this step applies to the user\'s product.'),
  concreteExample: z.string().describe('A concrete dialogue/scenario example for their product.'),
  actionableTasks: z.array(z.string()).describe('2-3 specific implementation checklist tasks.')
});

export type MethodologyExplainerOutput = z.infer<typeof MethodologyExplainerOutputSchema>;

const methodologyExplainerPrompt = ai.definePrompt({
  name: 'methodologyExplainerPrompt',
  input: { schema: MethodologyExplainerInputSchema },
  output: { schema: MethodologyExplainerOutputSchema },
  prompt: `You are an expert sales incubator coach.
Provide a detailed explanation and concrete B2B execution plan for:
- Step/Methodology Number: {{{stepNumber}}}
- Step/Methodology Title: {{{stepTitle}}}

Applying it specifically to the user's product profile:
- Product Name: {{{productName}}}
- Target Audience: {{{targetAudience}}}
- Core Problem Solved: {{{problemSolved}}}

Make sure to provide:
1. **How to Implement**: Clear paragraphs detailing how the sales rep should apply this step specifically for {{{productName}}}.
2. **Concrete Dialogue/Example**: Give a B2B sales script snippet or conversation example featuring {{{targetAudience}}} and the value point.
3. **Actionable Tasks**: Provide 2-3 specific startup checklist tasks to build this step.
`
});

export async function explainMethodologyStep(
  input: z.infer<typeof MethodologyExplainerInputSchema>
): Promise<MethodologyExplainerOutput> {
  const { output } = await methodologyExplainerPrompt(input);
  return JSON.parse(JSON.stringify(output!));
}
