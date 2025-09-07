import { defineFlow } from '@genkit-ai/flow';
import { ai } from '../genkit';

export const historicalResultAnalysis = defineFlow(
  {
    name: 'historicalResultAnalysis',
    inputSchema: {
      type: 'object',
      properties: {
        history: { type: 'string' },
      },
      required: ['history'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        analysis: { type: 'string' },
      },
    },
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `Analyze this lottery result history: ${input.history}`,
    });

    return { analysis: response.outputText };
  }
);
