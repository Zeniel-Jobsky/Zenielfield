import {createCloudflareHandler} from './handler.mjs';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
Deno.serve(createCloudflareHandler({
 url:Deno.env.get('SUPABASE_URL')||'',
 key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keys.default||'',
 // Sites server token hash (same verifier as zenifield-gateway) lets the Sites/local server use this login path too.
 tokenHash:[Deno.env.get('ZENIFIELD_CLOUDFLARE_TOKEN_HASH')||'','44afdff31da70b4d4d4e69af87a0472427b39212dbae478accbd13f661f3975b'],
}));
