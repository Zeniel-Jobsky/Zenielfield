// 운영 화면 확인: work/accounts.local.csv(git 제외)의 시험 계정으로 로컬 서버에 로그인해 대시보드 AI 브리핑을 확인한다.
// 사용: node scripts/live-check.mjs <스크린샷 폴더> manager,partlead,lead,director  (비밀번호는 출력하지 않는다)
import {chromium} from 'playwright';import fs from 'node:fs';
const rows=fs.readFileSync('work/accounts.local.csv','utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(l=>l.match(/("([^"]*)"|[^,]*)(,|$)/g).map(x=>x.replace(/,$/,'').replace(/^"|"$/g,'')));
const pick=r=>rows.find(x=>x[0]===r);const out=process.argv[2];const b=await chromium.launch();
for(const role of (process.argv[3]||'partlead').split(',')){const [,name,,,email,pw]=pick(role);const p=await b.newPage({ignoreHTTPSErrors:true,viewport:{width:1280,height:1600}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const t0=Date.now();await p.goto('https://100.88.188.86:5173/',{waitUntil:'networkidle'});await p.fill('input[type=email]',email);await p.fill('input[type=password]',pw);await p.locator('button[type=submit]').first().click();
 await p.locator('.ai-brief').first().waitFor({timeout:60000});const tLogin=((Date.now()-t0)/1000).toFixed(1);
 const busy=await p.locator('.ai-brief-progress').count();const t1=Date.now();await p.locator('.ai-brief-out').first().waitFor({timeout:40000}).catch(()=>{});
 const tBrief=((Date.now()-t1)/1000).toFixed(1);const txt=(await p.locator('.ai-brief').first().innerText()).replace(/\n+/g,' / ');
 console.log(`== ${role} ${name} | 로그인→화면 ${tLogin}s | 작성중 표시 ${busy?'있음':'없음(저장본)'} | 브리핑 ${tBrief}s`);console.log(txt.slice(0,700));
 await p.locator('.ai-brief').first().screenshot({path:`${out}/live-${role}.png`});console.log('errs',errs.slice(0,3));await p.close()}
await b.close();
