
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(), // Correctly call the firebase function
  ],
  logLevel: "debug",
  enableTracingAndMetrics: true,
});
