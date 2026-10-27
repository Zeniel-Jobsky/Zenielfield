import {createHandler} from './handler.mjs';
const tokenHash = '2c608173d6f316e8c75407b231dd38a73e841077207b2b2568b628ce14a1bedd'; // SHA-256 verifier only; the raw gateway token is a Sites runtime secret.
const secrets = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
Deno.serve(createHandler({url:Deno.env.get('SUPABASE_URL') || '',key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || secrets.default || '',tokenHash}));
