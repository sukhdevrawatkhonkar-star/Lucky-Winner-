import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { configureGenkit } from '@genkit-ai/core';

// This file is used for central Genkit configuration, especially for deployment.
// Individual flows can also configure Genkit, which is fine for development.

configureGenkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_API_KEY }),
    // The firebase() plugin helps in deploying flows to Firebase Cloud Functions.
    // Run `genkit deploy` to start the deployment process.
    firebase(),
  ],
  // Log level can be 'debug', 'info', 'warn', or 'error'.
  logLevel: 'info',
  // Enable trace collection and metrics for monitoring your flows in the Google Cloud console.
  enableTracingAndMetrics: true,
});

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  enableTracingAndMetrics: true,
});
