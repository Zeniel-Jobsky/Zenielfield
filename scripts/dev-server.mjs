// 로컬 개발 서버 관리: npm start / npm stop / npm restart / npm run status. Windows·macOS·Linux 공통.
// start: 같은 포트를 쓰는 기존 프로세스를 끝내고 `npm run dev`를 백그라운드로 띄운 뒤 응답할 때까지 기다린다.
// 포트는 DEV_PORT 환경 변수 또는 vite.config.local.mjs 의 server.port, 없으면 5173. 로그는 .dev-server.log, PID는 .dev-server.pid (git 제외).
import {spawn,execSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,rmSync,openSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),win=process.platform==='win32',pidFile=resolve(root,'.dev-server.pid'),logFile=resolve(root,'.dev-server.log');
const local=existsSync(resolve(root,'vite.config.local.mjs'))?((await import(pathToFileURL(resolve(root,'vite.config.local.mjs')).href)).default??{}):{};
const port=Number(process.env.DEV_PORT||local.server?.port||5173),host=process.env.DEV_HOST||(typeof local.server?.host==='string'?local.server.host:'localhost'),https=!!local.server?.https;
const url=`${https?'https':'http'}://${host}:${port}/`;
const sh=(cmd)=>{try{return execSync(cmd,{stdio:['ignore','pipe','ignore']}).toString()}catch{return ''}};
// 포트를 듣고 있는 프로세스 PID 목록
function pidsOnPort(){
 if(win)return [...new Set(sh('netstat -ano -p tcp').split(/\r?\n/).filter(l=>/LISTENING/i.test(l)&&new RegExp(`:${port}\\s`).test(l)).map(l=>l.trim().split(/\s+/).at(-1)).filter(p=>p&&p!=='0'))];
 return [...new Set(sh(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`).split(/\s+/).filter(Boolean))];
}
function kill(pid){if(win)sh(`taskkill /PID ${pid} /T /F`);else{try{process.kill(-Number(pid),'SIGTERM')}catch{}try{process.kill(Number(pid),'SIGTERM')}catch{}}}
async function waitFree(ms=8000){const end=Date.now()+ms;while(Date.now()<end){if(!pidsOnPort().length)return true;await new Promise(r=>setTimeout(r,300))}return !pidsOnPort().length}
async function stop(quiet=false){
 const pids=new Set(pidsOnPort());if(existsSync(pidFile))pids.add(readFileSync(pidFile,'utf8').trim());
 for(const p of pids)if(p)kill(p);
 const free=await waitFree();rmSync(pidFile,{force:true});
 if(!quiet)console.log(pids.size?(free?`중지했습니다 (포트 ${port}).`:`포트 ${port}를 아직 쓰는 프로세스가 있습니다: ${pidsOnPort().join(', ')}`):`실행 중인 서버가 없습니다 (포트 ${port}).`);
 return free;
}
async function alive(){try{process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';const r=await fetch(url,{signal:AbortSignal.timeout(3000)});return r.status<500}catch{return false}}
async function start(){
 if(pidsOnPort().length){console.log(`포트 ${port}의 기존 프로세스를 종료합니다…`);if(!await stop(true)){console.error(`포트 ${port}를 비우지 못했습니다. 직접 종료해 주세요.`);process.exitCode=1;return}}
 const out=openSync(logFile,'w'),npm=win?'npm.cmd':'npm';
 const child=spawn(npm,['run','dev'],{cwd:root,detached:true,stdio:['ignore',out,out],shell:win,windowsHide:true});
 child.unref();writeFileSync(pidFile,String(child.pid));
 process.stdout.write(`시작 중 (PID ${child.pid}, 로그 .dev-server.log)`);
 const end=Date.now()+120000;while(Date.now()<end){if(await alive()){console.log(`\n준비됨: ${url}`);return}process.stdout.write('.');await new Promise(r=>setTimeout(r,1500))}
 console.error(`\n2분 안에 응답이 없습니다. .dev-server.log 를 확인하세요.`);process.exitCode=1;
}
async function status(){const p=pidsOnPort();console.log(p.length?`실행 중: ${url} (PID ${p.join(', ')})${await alive()?'':' · 응답 없음'}`:`중지됨 (포트 ${port})`)}
const cmd=process.argv[2]||'start';
if(cmd==='start')await start();else if(cmd==='stop')await stop();else if(cmd==='restart'){await stop(true);await start()}else if(cmd==='status')await status();
else{console.error('사용: node scripts/dev-server.mjs start|stop|restart|status');process.exitCode=1}
