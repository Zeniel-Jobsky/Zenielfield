'use client';
import {BrandIdentity} from '../brand';
import {useEffect,useState} from 'react';
import {RefreshCw,ArrowRight,ShieldCheck} from 'lucide-react';
import PlatformApp from './app';
import LegacyFieldApp from '../field-app';
import type {User} from '../lib/model';
import type {PlatformData} from './model';
import EmailLogin from './email-login';
import {DevLogin} from './dev-login';
export type OperatingData=PlatformData&{me:User};
export default function PlatformEntry(){
 const [emailAuth,setEmailAuth]=useState(false);
 useEffect(()=>{fetch('/api/auth/config').then(async r=>r.ok?await r.json() as {provider?:string}:null).then(d=>setEmailAuth(d?.provider==='supabase-email')).catch(()=>{});},[]);
 const [mode,setMode]=useState<'demo'|'supabase'|'legacy'>('supabase'),[loggedIn,setLoggedIn]=useState(false),[data,setData]=useState<OperatingData|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(0);
 async function refresh(){setLoading(true);setError('');try{const r=await fetch('/api/platform',{cache:'no-store'}),d=await r.json() as OperatingData&{error?:string};if(!r.ok){setStatus(r.status);throw Error(d.error||'불러오지 못했습니다.')}setData(d);setStatus(200);setLoggedIn(true)}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 function select(next:'demo'|'supabase'|'legacy'){setMode(next);setData(null);window.history.replaceState(null,'',next==='demo'?'?mode=demo':window.location.pathname);if(next==='supabase')refresh()}
 useEffect(()=>{const q=new URLSearchParams(window.location.search);if(q.get('mode')==='demo'){setMode('demo');return}refresh().then(()=>{if(q.has('auth_error'))setError('로그인 링크가 만료되었거나 요청한 브라우저와 다릅니다. 이 브라우저에서 새 링크를 요청해 주세요.');})},[]);
 async function save(entity:string,values:unknown,record?:{id:string;version:number}){const r=await fetch('/api/platform',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity,values,id:record?.id,version:record?.version})});const d=await r.json() as {data:OperatingData;item:any;error?:string};if(!r.ok)throw Error(d.error||'저장하지 못했습니다.');setData(d.data);return d}
 async function logout(){try{await fetch('/api/auth/logout',{method:'POST'})}finally{setData(null);setStatus(401);setError('로그아웃했습니다.')}}
 if(mode==='legacy')return <LegacyFieldApp startLive onPlatformDemo={()=>select('demo')}/>;
 if(mode==='demo')return <PlatformApp key="demo" onConnect={()=>select('supabase')}/>;
 if(loading&&!data&&!error)return <main className="supabase-entry"><div className="loading-state" role="status">불러오는 중입니다.</div></main>;
 if(data)return <PlatformApp key="supabase" initialData={data} liveMode onSaveLive={save} onDemo={()=>select('demo')} onLegacy={emailAuth?undefined:()=>select('legacy')} onLogout={emailAuth?logout:undefined} onRefresh={refresh} connectionError={error} connectionStatus={status} refreshing={loading}/>;
 return <main className="supabase-entry login-screen"><span className="brand"><BrandIdentity/></span><section className="panel"><h1>ZeniField 로그인</h1><p>현장·매장 방문과 후속 조치를 기록하는 운영 앱입니다.</p>{loading?<div className="loading-state" role="status">확인 중입니다.</div>:<>{error&&status!==401&&<div className="notice" role="alert">{error}</div>}{status===401&&error&&error!=='이메일 인증으로 로그인해 주세요.'&&<div className="notice" role="alert">{error}</div>}{emailAuth?(status===403?<button className="btn" onClick={logout}>다른 계정으로 로그인</button>:<EmailLogin/>):<>{status===401&&<a className="btn primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">ChatGPT로 로그인<ArrowRight size={16}/></a>}<DevLogin/></>}{status!==401&&status!==403&&<button className="btn" onClick={refresh}><RefreshCw size={15}/>다시 시도</button>}</>}<div className="entry-security"><ShieldCheck size={15}/>관리자가 등록한 계정만 로그인할 수 있습니다. 계정·비밀번호는 시스템 관리자에게 요청하세요.</div></section></main>;
}
