import {runTs} from './run-ts.mjs';
await runTs('tests/supabase-server.test.ts');
await import('./supabase-edge.test.mjs');
