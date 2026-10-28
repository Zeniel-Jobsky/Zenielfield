import esbuild from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
const output=await esbuild.build({entryPoints:['tests/seed.test.ts'],bundle:true,write:false,platform:'node',format:'esm'});
await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));
