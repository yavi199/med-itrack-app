/**
 * This file is the entry point for Firebase Functions.
 * It is currently empty as all backend logic is handled by Genkit flows
 * within the Next.js application server.
 *
 * For more details on Firebase Functions, see:
 * https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";

// Set global options for Firebase Functions.
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance.
setGlobalOptions({maxInstances: 10});
