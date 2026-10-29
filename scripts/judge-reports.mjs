// 방문 보고 종합 판정 백필: 대상(현장·매장)마다 시간순 보고 + 연결 조치(내용·기한·상태)를 LLM에 보내 보고마다 종합 판정을 받는다.
// 한 대상의 타임라인은 한 번에 보내므로 앞선 보고의 흐름(지속·악화·해결)을 보고 판단한다. 판정은 판정 파일(방문 ID → judgment)에 쌓는다.
// 사용: node --env-file=.env scripts/judge-reports.mjs [입력 JSON=data/hrbiz-demo.json] [판정 파일=data/hrbiz-judgments.json] [--redo] [--targets N] [--ids 파일]
// 보내는 것: 목적·결과 칸·상세·특이사항·조치 내용과 날짜·상태만(사람 이름·담당자 ID 미전송, 전화·메일 가림). 판정은 by='ai', 사람 확정 전(confirmedBy=null).
import fs from 'node:fs';
import {judgePrompt,judgeSchema,cleanJudgment,buildJudgeInput,isCurrentJudgment} from '../app/platform/judgment.ts';
const args=process.argv.slice(2),flag=n=>{const i=args.indexOf(n);return i<0?null:args.splice(i,2)[1]};
const maxTargets=Number(flag('--targets')||0),idsFile=flag('--ids'),redo=args.includes('--redo');const pos=args.filter(a=>!a.startsWith('--'));
const input=pos[0]||'data/hrbiz-demo.json',out=pos[1]||'data/hrbiz-judgments.json';
const key=process.env.OPENAI_API_KEY||'',model=process.env.OPENAI_MODEL||'gpt-6-luna';if(!key.startsWith('sk-')){console.error('OPENAI_API_KEY가 필요합니다.');process.exit(1)}
const REPORTS_PER_CALL=30,PARALLEL=4;
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const actionsOf=new Map();for(const a of data.actions||[])if(a.visitId){const v=data.visits.find(x=>x.id===a.visitId);if(v){const t=v.storeId||v.siteId;actionsOf.set(t,[...(actionsOf.get(t)||[]),a])}}
// 현재 형식 판정만 이어받는다. 옛 형식(has/items)은 버리고, --redo면 전부 새로 판정한다.
const prev=fs.existsSync(out)&&!redo?JSON.parse(fs.readFileSync(out,'utf8')).judgments||{}:{};
const saved={model:'',judgments:Object.fromEntries(Object.entries(prev).filter(([,j])=>isCurrentJudgment(j)).map(([id,j])=>[id,cleanJudgment(j)]))};
const only=idsFile?new Set(fs.readFileSync(idsFile,'utf8').split(/\s+/).filter(Boolean)):null;
// 대상별 타임라인. 판정이 하나라도 빠진 대상은 타임라인 전체를 다시 보낸다(맥락 유지).
const byTarget=new Map();for(const v of data.visits.filter(v=>v.status==='completed'&&v.actualDate)){const t=v.storeId||v.siteId;byTarget.set(t,[...(byTarget.get(t)||[]),v])}
let targets=[...byTarget].map(([t,vs])=>[t,vs.sort((a,b)=>a.actualDate.localeCompare(b.actualDate))]).filter(([,vs])=>(!only||vs.some(v=>only.has(v.id)))&&(redo||vs.some(v=>!saved.judgments[v.id])));
if(maxTargets)targets=targets.slice(0,maxTargets);
const total=targets.reduce((n,[,vs])=>n+vs.length,0);
console.log(`판정 대상 ${targets.length}곳 · 보고 ${total}건 (기존 판정 ${Object.keys(saved.judgments).length}건) · 모델 ${model}`);
const save=()=>{saved.model=model;fs.writeFileSync(out,JSON.stringify(saved))};
const calls=[];let cur=[],n=0;for(const t of targets){if(n+t[1].length>REPORTS_PER_CALL&&cur.length){calls.push(cur);cur=[];n=0}cur.push(t);n+=t[1].length}if(cur.length)calls.push(cur);
async function judge(group){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
 const {payload,refs:refIds}=buildJudgeInput(group.map(([t,vs])=>({visits:vs,actions:actionsOf.get(t)||[]})),today);const byId=new Map(group.flatMap(([,vs])=>vs).map(v=>[v.id,v]));const refs=new Map([...refIds].map(([r,id])=>[r,byId.get(id)]));
 for(let attempt=1;;attempt++){
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:AbortSignal.timeout(180000),
   body:JSON.stringify({model,messages:[{role:'system',content:judgePrompt()},{role:'user',content:JSON.stringify(payload)}],response_format:{type:'json_schema',json_schema:{name:'visit_judgment',strict:true,schema:judgeSchema}}})});
  const j=await r.json();
  if(r.ok){const at=new Date().toISOString();let got=0;
   for(const x of JSON.parse(j.choices[0].message.content).results){const v=refs.get(x.ref);const c=v&&cleanJudgment({...x,by:'ai',model,at});if(c){saved.judgments[v.id]=c;got++}}
   if(got<refs.size)console.warn(`\n  응답 누락 ${refs.size-got}건(다음 실행에서 다시 판정)`);return refs.size}
  const code=j.error?.code||j.error?.type||'';
  if(r.status===401||code==='insufficient_quota'||code==='credit_balance_exhausted'){console.error('AI 사용 불가:',r.status,code);save();process.exit(1)}
  if(attempt>=4){console.error('\n실패, 건너뜀:',r.status,code);return refs.size}
  await new Promise(x=>setTimeout(x,2000*attempt));
 }
}
let done=0;const worker=async()=>{while(calls.length){done+=await judge(calls.shift());save();process.stdout.write(`\r  ${done}/${total}`)}};
await Promise.all(Array.from({length:PARALLEL},worker));
save();const all=Object.values(saved.judgments),lv={};for(const j of all)lv[j.level]=(lv[j.level]||0)+1;
console.log(`\n판정 ${all.length}건 · 수준 ${JSON.stringify(lv)} → ${out}`);
