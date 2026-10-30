import {createCloudflareHandler} from './handler.mjs';
const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const url = Deno.env.get('SUPABASE_URL') || '';
const isDemo = url.includes('nhywssfwtnonytbkufyy.supabase.co');
// The live project must use an independent, explicitly configured server secret.
// An unset live hash yields 401 for every request; demo tokens never unlock live.
const tokenHash = isDemo
  ? [Deno.env.get('ZENIFIELD_CLOUDFLARE_TOKEN_HASH') || '', '44afdff31da70b4d4d4e69af87a0472427b39212dbae478accbd13f661f3975b']
  : [Deno.env.get('ZENIFIELD_LIVE_CLOUDFLARE_TOKEN_HASH') || ''];
Deno.serve(createCloudflareHandler({url,key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || keys.default || '',tokenHash}));
