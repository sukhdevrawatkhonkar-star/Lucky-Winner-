import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebasePlugin} from '@genkit-ai/firebase';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebasePlugin(),
  ],
  logLevel: "debug",
  enableTracingAndMetrics: false,
});
