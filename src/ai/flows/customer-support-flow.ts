import { defineFlow } from '@genkit-ai/flow';
import { ai } from '../genkit';

export const customerSupportFlow = defineFlow(
  {
    name: 'customerSupportFlow',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
      },
      required: ['question'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
      },
    },
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `Customer asked: ${input.question}\nProvide a helpful answer.`,
    });

    return { answer: response.outputText };
  }
);
