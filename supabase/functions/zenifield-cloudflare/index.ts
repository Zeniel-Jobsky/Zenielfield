import {createCloudflareHandler} from './handler.mjs';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
Deno.serve(createCloudflareHandler({
 url:Deno.env.get('SUPABASE_URL')||'',
 key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keys.default||'',
 tokenHash:Deno.env.get('ZENIFIELD_CLOUDFLARE_TOKEN_HASH')||'',
}));
