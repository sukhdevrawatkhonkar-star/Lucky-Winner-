import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({ aihub: true })
  ],
  logLevel: "debug",
  enableTracingAndMetrics: true,
});
