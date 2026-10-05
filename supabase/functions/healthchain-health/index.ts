import process from 'node:process';
import { Buffer } from 'node:buffer';
import gemini from '../../../api/gemini.js';
import deleteAccount from '../../../api/delete-account.js';
import trials from '../../../api/trials.js';
import { createHealthEdgeHandler } from '../../../server/health-edge-adapter.js';

globalThis.Buffer = Buffer;
globalThis.process = process;

// JWT verification is performed by the existing handlers using getUser().
// The existing bounded guest AI flow remains; account erasure requires a user.
Deno.serve(
  createHealthEdgeHandler(
    {
      '/api/gemini': gemini,
      '/api/delete-account': deleteAccount,
      '/api/trials': trials,
    },
    process.env.AI_REGION_SIGNING_KEY
  )
);
