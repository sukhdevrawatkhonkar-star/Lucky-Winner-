
'use server';

/**
 * @fileOverview Provides lucky number suggestions based on user input.
 *
 * - getLuckyNumbers - A function that generates lucky numbers and advice.
 * - LuckyNumberInput - The input type for the function.
 * - LuckyNumberOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LuckyNumberInputSchema = z.object({
  lotteryName: z.string().describe('The name of the lottery the user is playing.'),
  favoriteNumber: z.number().optional().describe('The user\'s favorite number.'),
  birthDate: z.string().optional().describe('The user\'s birth date (e.g., YYYY-MM-DD) for astrological context.'),
});
export type LuckyNumberInput = z.infer<typeof LuckyNumberInputSchema>;

const LuckyNumberOutputSchema = z.object({
  suggestedNumbers: z.array(z.number()).describe('A set of 5 suggested lucky numbers for the lottery.'),
  analysis: z.string().describe('A short, fun, and encouraging analysis explaining why these numbers might be lucky. It MUST include a disclaimer that this is for entertainment purposes only and is not financial advice.'),
});
export type LuckyNumberOutput = z.infer<typeof LuckyNumberOutputSchema>;

export async function getLuckyNumbers(input: LuckyNumberInput): Promise<LuckyNumberOutput> {
  return luckyNumberFlow(input);
}

const prompt = ai.definePrompt({
  name: 'luckyNumberPrompt',
  input: {schema: LuckyNumberInputSchema},
  output: {schema: LuckyNumberOutputSchema},
  prompt: `You are a fun and mystical lottery assistant for the "Lucky Winner" app.
Your goal is to generate a set of 5 lucky numbers and provide a playful analysis based on the user's input for the {{{lotteryName}}} lottery.

Use the provided information to create a fun narrative.
{{#if favoriteNumber}}
The user's favorite number is {{{favoriteNumber}}}. Try to incorporate it or numbers related to it.
{{/if}}
{{#if birthDate}}
The user's birth date is {{{birthDate}}}. Use this for some light-hearted astrological or numerological reasoning.
{{/if}}

Generate 5 distinct numbers between 1 and 70.

Your analysis should be encouraging and entertaining.

**Crucially, you MUST end your analysis with the following disclaimer:** "Please remember, this is just for fun and entertainment purposes and is not financial advice. Play responsibly."

Generate the numbers and the analysis.
`,
});

const luckyNumberFlow = ai.defineFlow(
  {
    name: 'luckyNumberFlow',
    inputSchema: LuckyNumberInputSchema,
    outputSchema: LuckyNumberOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
