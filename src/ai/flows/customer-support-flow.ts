import { defineFlow } from '@genkit-ai/flow';
import { googleAI } from '@genkit-ai/googleai';

// Example Customer Support Flow
export const customerSupportFlow = defineFlow(
  {
    name: 'customerSupport',
    inputSchema: {
      query: 'string',
    },
    outputSchema: {
      response: 'string',
    },
  },
  async (input) => {
    // Here you can call googleAI or any other LLM to generate response
    const response = `Support team will get back to you regarding: ${input.query}`;
    return { response };
  }
);
