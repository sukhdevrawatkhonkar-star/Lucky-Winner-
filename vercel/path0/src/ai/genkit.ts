
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {enableFirebaseTelemetry} from '@genkit-ai/firebase';

enableFirebaseTelemetry();

export const ai = genkit({
  plugins: [
    googleAI(),
    // The firebase plugin is initialized with enableFirebaseTelemetry()
  ],
  enableTracingAndMetrics: true,
});
