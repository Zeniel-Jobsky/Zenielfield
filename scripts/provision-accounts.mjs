// 권한별 시험 계정 발급: zeniel.co.kr 주소로 관리자·사업부장·팀장·파트장·잡매니저 계정을 등록하고 비밀번호를 정한다.
// 사용: node --env-file=.env scripts/provision-accounts.mjs [--admin jobsky@zeniel.co.kr] [--dry-run]
//  - 사용자 등록은 기존 관리자 이름으로 zf_write(감사 기록 남음), 비밀번호는 Edge operator-set-password 로 한다.
//  - 잡매니저는 가상 담당자(jm-001 등)의 이메일만 바꿔 배정된 현장·방문을 그대로 쓴다.
//  - 비밀번호는 무작위로 만들고 git 제외 파일 work/accounts.local.csv 에만 쓴다(화면·커밋에 남기지 않음). 다시 실행하면 비밀번호를 새로 만든다.
import {supabaseSql} from './lib/supabase-sql.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
const args=process.argv.slice(2),dry=args.includes('--dry-run'),ai=args.indexOf('--admin');
const adminEmail=(ai>=0?args[ai+1]:'')||'jobsky@zeniel.co.kr';
const project=process.env.SUPABASE_PROJECT_REF||'nhywssfwtnonytbkufyy',access=process.env.SUPABASE_ACCESS_TOKEN,url=process.env.ZENIFIELD_SUPABASE_URL,gate=process.env.ZENIFIELD_GATEWAY_TOKEN;
if(!access||!url||!gate){console.error('.env 에 SUPABASE_ACCESS_TOKEN, ZENIFIELD_SUPABASE_URL, ZENIFIELD_GATEWAY_TOKEN 이 필요합니다.');process.exit(1)}
const D='zeniel.co.kr';
// 권한별 계정 (팀·파트·도메인은 HR-biz 데모 조직과 같게)
const accounts=[
 {id:'zf-admin',email:`zf.admin@${D}`,name:'시험 관리자',role:'admin',team:'HR-biz 사업부',part:'운영지원',domains:[]},
 {id:'zf-director',email:`zf.director@${D}`,name:'시험 사업부장',role:'director',team:'HR-biz 사업부',part:'사업부',domains:[]},
 {id:'zf-lead-1',email:`zf.lead1@${D}`,name:'시험 팀장(인재1)',role:'lead',team:'인재사업1팀',part:'인재사업1팀-A파트',domains:['dom-hr']},
 {id:'zf-lead-2',email:`zf.lead2@${D}`,name:'시험 팀장(인재2)',role:'lead',team:'인재사업2팀',part:'인재사업2팀-A파트',domains:['dom-hr']},
 {id:'zf-lead-3',email:`zf.lead3@${D}`,name:'시험 팀장(SE)',role:'lead',team:'SE운영팀',part:'SE운영팀-A파트',domains:['dom-se']},
 {id:'zf-partlead-1',email:`zf.partlead1@${D}`,name:'시험 파트장(인재1-A)',role:'partlead',team:'인재사업1팀',part:'인재사업1팀-A파트',domains:['dom-hr']},
 {id:'zf-partlead-3',email:`zf.partlead3@${D}`,name:'시험 파트장(인재2-A)',role:'partlead',team:'인재사업2팀',part:'인재사업2팀-A파트',domains:['dom-hr']},
 {id:'zf-partlead-5',email:`zf.partlead5@${D}`,name:'시험 파트장(SE-A)',role:'partlead',team:'SE운영팀',part:'SE운영팀-A파트',domains:['dom-se']},
];
// 잡매니저: 기존 가상 담당자 이메일을 바꿔 배정을 이어받는다
const managers=[['jm-001@example.test',`zf.jm001@${D}`],['jm-018@example.test',`zf.jm018@${D}`],['jm-021@example.test',`zf.jm021@${D}`]];
const sqlq=supabaseSql({ref:project,token:access});
const lit=(s)=>"'"+String(s).replace(/'/g,"''")+"'";
const pw=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';let s='';for(let i=0;i<14;i++)s+=a[randomInt(a.length)];return s.slice(0,4)+'-'+s.slice(4,9)+'-'+s.slice(9)+randomInt(10)};
const [adm]=await sqlq(`select subject,email from public.zf_users where email=${lit(adminEmail)} and role='admin' and active=1`);
if(!adm?.subject){console.error(`관리자 ${adminEmail} 를 찾지 못했거나 한 번도 로그인하지 않았습니다(subject 없음). 그 계정으로 먼저 로그인하세요.`);process.exit(1)}
const write=async(item)=>{const [cur]=await sqlq(`select version from public.zf_users where id=${lit(item.id)}`);
 if(dry){console.log(`[dry-run] ${cur?'수정':'등록'} ${item.email} (${item.role})`);return}
 await sqlq(`select public.zf_write(${lit(adm.subject)},${lit(adm.email)},'user',${lit(JSON.stringify({...item,active:1}))}::jsonb,${cur?cur.version:'null'})`)};
const rows=[];
for(const a of accounts){await write(a);rows.push(a)}
for(const [from,to] of managers){const [u]=await sqlq(`select id,name,role,team,part,domains from public.zf_users where email in (${lit(from)},${lit(to)}) limit 1`);
 if(!u){console.warn(`건너뜀: ${from} 사용자가 운영 DB에 없습니다.`);continue}
 const item={id:u.id,email:to,name:u.name,role:u.role,team:u.team,part:u.part,domains:u.domains||[]};await write(item);rows.push(item)}
if(dry){console.log(`[dry-run] ${rows.length}개 계정, 비밀번호는 만들지 않음`);process.exit(0)}
const out=[];
for(const r of rows){const password=pw();const res=await fetch(url+'/functions/v1/zenifield-cloudflare',{method:'POST',headers:{'Content-Type':'application/json','x-zenifield-gateway':gate},body:JSON.stringify({operation:'operator-set-password',email:r.email,password})});const d=await res.json().catch(()=>({}));
 if(!res.ok){console.error(`${r.email}: 비밀번호 설정 실패 ${res.status} ${d.error||''}`);continue}
 out.push([r.role,r.name,r.team,r.part,r.email,password].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));console.log(`${r.email} (${r.role}) 준비됨`)}
mkdirSync('work',{recursive:true});writeFileSync('work/accounts.local.csv','﻿role,name,team,part,email,password\n'+out.join('\n')+'\n');
console.log(`\n${out.length}개 계정 완료. 비밀번호: work/accounts.local.csv (git 제외). 공유 후 각자 변경을 권장합니다.`);
