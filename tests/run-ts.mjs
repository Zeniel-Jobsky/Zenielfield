import esbuild from 'esbuild';
// Bundles a TypeScript test with esbuild and runs it in this process.
export async function runTs(entry){
 const output=await esbuild.build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm'});
 await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));
}
