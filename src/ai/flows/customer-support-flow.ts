
'use server';

/**
 * @fileOverview A customer support AI agent for the Lucky Winner app.
 *
 * - getSupportResponse - A function that generates a support response.
 * - CustomerSupportInput - The input type for the function.
 * - CustomerSupportOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomerSupportInputSchema = z.object({
  query: z.string().describe("The user's question or problem."),
  screenshotDataUri: z.string().optional().describe(
    "An optional screenshot of the user's issue, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
  ),
});
export type CustomerSupportInput = z.infer<typeof CustomerSupportInputSchema>;

const CustomerSupportOutputSchema = z.object({
  response: z.string().describe("The AI's helpful response to the user's query."),
});
export type CustomerSupportOutput = z.infer<typeof CustomerSupportOutputSchema>;

export async function getSupportResponse(input: CustomerSupportInput): Promise<CustomerSupportOutput> {
  return customerSupportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerSupportPrompt',
  input: {schema: CustomerSupportInputSchema},
  output: {schema: CustomerSupportOutputSchema},
  prompt: `You are a friendly and helpful customer support agent for an online matka gaming app called "Lucky Winner".
Your goal is to assist users with their questions about the app in a polite and clear manner.
Respond in the same language as the user's query. If the user is speaking in a mix of Hindi and English (Hinglish), you should also respond in Hinglish.

If the user provides a screenshot, analyze it carefully to understand their problem. The screenshot is the most important piece of context.

The app has the following games: Kalyan, Kalyan Night, Milan Day, Milan Night, Rajdhani Day, Rajdhani Night, Time Bazar, Main Bazar, Sridevi, Sridevi Night, Madhur Day, Madhur Night, Supreme Day, Supreme Night. Each game has its own open and close times for betting.

Common user questions you should be able to answer:
- Game timings (e.g., "Kalyan ka time kya hai?")
- How to play different bet types (single, jodi, panna).
- Wallet-related questions (how to add funds, check balance - note: tell them to contact their agent for adding funds).
- Result timings.
- How to check their bet history or profile.

Always be helpful and guide the user on how to use the app. Do not provide any information that is not related to the "Lucky Winner" app. Do not give out winning numbers or predictions.

Here is the user's latest question:
User: {{{query}}}
{{#if screenshotDataUri}}
User's Screenshot:
{{media url=screenshotDataUri}}
{{/if}}

Your task is to provide a helpful response.
`,
});

const customerSupportFlow = ai.defineFlow(
  {
    name: 'customerSupportFlow',
    inputSchema: CustomerSupportInputSchema,
    outputSchema: CustomerSupportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


    