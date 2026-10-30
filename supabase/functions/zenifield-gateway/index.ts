import {createHandler} from './handler.mjs';
// Legacy token is accepted ONLY for the existing demo project. Other DBs fail closed
// until their own dedicated hash is configured as a Supabase Edge Function secret.
const url = Deno.env.get('SUPABASE_URL') || '';
const isDemo = url.includes('nhywssfwtnonytbkufyy.supabase.co');
const tokenHash = isDemo
  ? '44afdff31da70b4d4d4e69af87a0472427b39212dbae478accbd13f661f3975b'
  : (Deno.env.get('ZENIFIELD_LIVE_GATEWAY_TOKEN_HASH') || '');
const secrets = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
Deno.serve(createHandler({url, key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || secrets.default || '',tokenHash}));
