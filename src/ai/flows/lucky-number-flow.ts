import { defineFlow } from '@genkit-ai/flow';
import { ai } from '../genkit';

export const luckyNumberFlow = defineFlow(
  {
    name: 'luckyNumberFlow',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        luckyNumber: { type: 'number' },
      },
    },
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `Based on the name "${input.name}", suggest a lucky number between 1 and 100.`,
    });

    // Try to extract number from response
    const match = response.outputText.match(/\d+/);
    const number = match ? parseInt(match[0], 10) : Math.floor(Math.random() * 100) + 1;

    return { luckyNumber: number };
  }
);
