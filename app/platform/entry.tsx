'use client';
import {kstToday as kst,dayShift as shiftDay,monthRange as monthOf} from '../lib/date';
import {BrandIdentity} from '../brand';
import {useEffect,useRef,useState} from 'react';
import {RefreshCw,ArrowRight,ShieldCheck} from 'lucide-react';
import PlatformApp from './app';
import type {User} from '../lib/model';
import type {PlatformData} from './model';
import EmailLogin from './email-login';
import {DevLogin} from './dev-login';
import {clearBriefStore} from './ai-brief';
import {LoadingProgress,readJsonWithProgress,type LoadInfo} from './loading-progress';
export type OperatingData=PlatformData&{me:User};
// 조회 창: 선택 기간 + 추이용 앞 8주 + 다가올 일정 6주. 미완료 조치는 기간과 무관하게 서버가 포함한다.
export function windowFor(start:string,end:string,today=kst()){const from=shiftDay(start,-56),to=[end,shiftDay(today,42)].sort().at(-1)!;return {from,to}}
export default function PlatformEntry(){
 const rangeRef=useRef(windowFor(...monthOf(kst())));
 // 인증 방식(null = 아직 모름). 알기 전에는 로그인 폼·개발용 계정 목록을 그리지 않는다(이름이 잠깐 보이는 문제 방지).
 const [authKind,setAuthKind]=useState<'email'|'sites'|null>(null),emailAuth=authKind==='email';
 useEffect(()=>{fetch('/api/auth/config').then(async r=>r.ok?await r.json() as {provider?:string}:null).then(d=>setAuthKind(d?.provider==='supabase-email'?'email':'sites')).catch(()=>setAuthKind('sites'));},[]);
 const [mode,setMode]=useState<'demo'|'supabase'>('supabase'),[loggedIn,setLoggedIn]=useState(false),[data,setData]=useState<OperatingData|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(0),[load,setLoad]=useState<LoadInfo|null>(null),[booted,setBooted]=useState(false),bootAt=useRef(Date.now());
 async function refresh(range=rangeRef.current){rangeRef.current=range;setLoading(true);setError('');const first=!data,startedAt=Date.now();if(first)setLoad({phase:'auth',received:0,total:null,startedAt});
  try{const r=await fetch(`/api/platform?from=${range.from}&to=${range.to}`,{cache:'no-store'});if(first)setLoad({phase:'fetch',received:0,total:null,startedAt});
   const d=await readJsonWithProgress<OperatingData&{error?:string}>(r,(received,total)=>{if(first)setLoad({phase:'fetch',received,total,startedAt})});
   if(!r.ok){setStatus(r.status);throw Error(d.error||'불러오지 못했습니다.')}if(first){setLoad({phase:'render',received:0,total:null,startedAt});await new Promise(res=>setTimeout(res,30))}setData(d);setStatus(200);setLoggedIn(true)}
  catch(e){setError((e as Error).message)}finally{setLoading(false);setLoad(null);setBooted(true)}}
 function select(next:'demo'|'supabase'){setMode(next);setData(null);window.history.replaceState(null,'',next==='demo'?'?mode=demo':window.location.pathname);if(next==='supabase')refresh()}
 useEffect(()=>{const q=new URLSearchParams(window.location.search);if(q.get('mode')==='demo'){setMode('demo');return}refresh().then(()=>{if(q.has('auth_error'))setError('로그인 링크가 만료되었거나 요청한 브라우저와 다릅니다. 이 브라우저에서 새 링크를 요청해 주세요.');})},[]);
 async function save(entity:string,values:unknown,record?:{id:string;version:number}){const r=await fetch(`/api/platform?from=${rangeRef.current.from}&to=${rangeRef.current.to}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity,values,id:record?.id,version:record?.version})});const d=await r.json() as {data:OperatingData;item:any;error?:string};if(!r.ok)throw Error(d.error||'저장하지 못했습니다.');setData(d.data);return d}
 async function logout(){clearBriefStore();try{await fetch('/api/auth/logout',{method:'POST'})}finally{setData(null);setStatus(401);setError('로그아웃했습니다.')}}
 if(mode==='demo')return <PlatformApp key="demo" onConnect={()=>select('supabase')}/>;
 // 첫 확인(인증 방식 + 세션)이 끝나기 전에는 로딩 화면 하나만 보여 준다.
 if(mode==='supabase'&&!data&&(!booted||authKind===null||(loading&&!error)))return <LoadingProgress info={load||{phase:'auth',received:0,total:null,startedAt:bootAt.current}}/>;
 if(data)return <PlatformApp key="supabase" initialData={data} liveMode onSaveLive={save} onDemo={()=>select('demo')} onLogout={emailAuth?logout:undefined} onRefresh={()=>refresh()} onRange={(a:string,b:string)=>{const w=windowFor(a,b);if(w.from<rangeRef.current.from||w.to>rangeRef.current.to)refresh(w)}} connectionError={error} connectionStatus={status} refreshing={loading}/>;
 return <main className="supabase-entry login-screen"><span className="brand"><BrandIdentity/></span><section className="panel"><h1>ZeniField 로그인</h1><p>현장·매장 방문과 후속 조치를 기록하는 운영 앱입니다.</p>{loading?<div className="loading-state" role="status">확인 중입니다.</div>:<>{error&&status!==401&&<div className="notice" role="alert">{error}</div>}{status===401&&error&&error!=='이메일 인증으로 로그인해 주세요.'&&<div className="notice" role="alert">{error}</div>}{emailAuth?(status===403?<button className="btn" onClick={logout}>다른 계정으로 로그인</button>:<EmailLogin/>):<>{status===401&&<a className="btn primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">ChatGPT로 로그인<ArrowRight size={16}/></a>}<DevLogin/></>}{status!==401&&status!==403&&<button className="btn" onClick={()=>refresh()}><RefreshCw size={14}/>다시 시도</button>}</>}<button type="button" className="btn demo-entry" onClick={()=>select('demo')}>로그인 없이 체험하기 (데모)<ArrowRight size={14}/></button><p className="demo-note">데모는 가상 데이터로 화면과 흐름을 둘러보는 용도이며 저장 내용이 실제 DB에 남지 않습니다.</p><div className="entry-security"><ShieldCheck size={14}/>관리자가 등록한 계정만 로그인할 수 있습니다. 계정·비밀번호는 시스템 관리자에게 요청하세요.</div></section></main>;
}
