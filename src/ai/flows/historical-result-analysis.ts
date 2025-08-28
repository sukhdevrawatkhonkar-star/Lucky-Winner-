'use server';

/**
 * @fileOverview Generates a fun, engaging analysis of a lottery result.
 *
 * - getHistoricalAnalysis - A function that generates the analysis.
 * - HistoricalAnalysisInput - The input type for the function.
 * - HistoricalAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HistoricalAnalysisInputSchema = z.object({
  lotteryName: z.string().describe('The name of the lottery.'),
  winningNumbers: z.string().describe('The winning numbers that were drawn.'),
  historicalData: z.string().optional().describe('Optional historical data of recent winning numbers for context.'),
});
export type HistoricalAnalysisInput = z.infer<typeof HistoricalAnalysisInputSchema>;

const HistoricalAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A short, fun, and engaging analysis of the lottery result. Should be 1-2 sentences long. Use emojis.'),
});
export type HistoricalAnalysisOutput = z.infer<typeof HistoricalAnalysisOutputSchema>;

export async function getHistoricalAnalysis(input: HistoricalAnalysisInput): Promise<HistoricalAnalysisOutput> {
  return historicalAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'historicalAnalysisPrompt',
  input: {schema: HistoricalAnalysisInputSchema},
  output: {schema: HistoricalAnalysisOutputSchema},
  prompt: `You are a lottery result analyst who provides fun and engaging insights.
Based on the lottery name and the winning numbers, provide a short (1-2 sentences) and fun analysis. Use emojis to make it more engaging.

Lottery: {{{lotteryName}}}
Winning Numbers: {{{winningNumbers}}}
{{#if historicalData}}
Recent Past Numbers for context: {{{historicalData}}}
{{/if}}

Example Analysis: "The number 7 appears again!  LUCKY 7️⃣ is on a roll this week in the {{lotteryName}} draw! What a popular number! 🤩"
Another Example: "Wow! A high-value combination in {{lotteryName}} today with {{{winningNumbers}}}! Big wins on the cards! 💰✨"

Generate a new, unique analysis for the provided numbers.
`,
});

const historicalAnalysisFlow = ai.defineFlow(
  {
    name: 'historicalAnalysisFlow',
    inputSchema: HistoricalAnalysisInputSchema,
    outputSchema: HistoricalAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
