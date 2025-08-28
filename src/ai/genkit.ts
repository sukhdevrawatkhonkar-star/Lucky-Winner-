import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),
  ],
  logLevel: "debug",
  enableTracingAndMetrics: false,
});
