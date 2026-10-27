import {createHandler} from './handler.mjs';
const tokenHash = '44afdff31da70b4d4d4e69af87a0472427b39212dbae478accbd13f661f3975b'; // SHA-256 verifier only; the raw gateway token is a Sites runtime secret.
const secrets = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
Deno.serve(createHandler({url:Deno.env.get('SUPABASE_URL') || '',key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || secrets.default || '',tokenHash}));
