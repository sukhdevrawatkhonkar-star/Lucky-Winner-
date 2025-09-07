import { defineFlow } from '@genkit-ai/flow';
import { googleAI } from '@genkit-ai/googleai';

// Example Lucky Number Generator Flow
export const luckyNumberFlow = defineFlow(
  {
    name: 'luckyNumberFlow',
    inputSchema: {
      userId: 'string',
    },
    outputSchema: {
      luckyNumber: 'number',
    },
  },
  async (input) => {
    // Just returning a random number for now
    const luckyNumber = Math.floor(Math.random() * 100) + 1;
    return { luckyNumber };
  }
);
