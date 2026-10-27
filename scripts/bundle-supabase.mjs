import esbuild from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
await esbuild.build({entryPoints:['app/platform/mutations.ts'],bundle:true,platform:'neutral',format:'esm',target:'es2022',outfile:'supabase/functions/zenifield-gateway/logic.js'});
