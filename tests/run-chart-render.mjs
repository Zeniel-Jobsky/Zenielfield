import esbuild from 'esbuild';
import {spawnSync} from 'node:child_process';
const result=await esbuild.build({entryPoints:['tests/status-chart-render.test.tsx'],bundle:true,write:false,platform:'node',format:'cjs'});
const run=spawnSync(process.execPath,['--input-type=commonjs'],{input:result.outputFiles[0].contents,stdio:['pipe','inherit','inherit']});
if(run.error)throw run.error;
if(run.status!==0)process.exit(run.status??1);
